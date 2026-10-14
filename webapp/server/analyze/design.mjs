// Design-system extraction: colors, typography, radii, shadows, breakpoints, CSS variables.

import { byteLength } from './util.mjs'

const HEX_RE = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi
const RGB_RE = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([0-9.]+)\s*)?\)/gi
const HSL_RE = /hsla?\(\s*([0-9.]+)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*(?:,\s*([0-9.]+)\s*)?\)/gi

function hex2(n) { return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0') }

export function normalizeHex(raw) {
  let h = raw.slice(1).toLowerCase()
  let alpha = null
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('')
  if (h.length === 8) { alpha = Math.round((parseInt(h.slice(6, 8), 16) / 255) * 100) / 100; h = h.slice(0, 6) }
  if (h.length !== 6) return null
  return { hex: `#${h}`, alpha }
}

export function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return `#${hex2(255 * f(0))}${hex2(255 * f(8))}${hex2(255 * f(4))}`
}

export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  const chan = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * chan((n >> 16) & 255) + 0.7152 * chan((n >> 8) & 255) + 0.0722 * chan(n & 255)
}

export function contrastRatio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100
}

function isGrey(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return Math.max(r, g, b) - Math.min(r, g, b) < 18
}

function roleFor(hex, alphas, asBackground, asText) {
  const lum = luminance(hex)
  const mostlyTransparent = alphas.length > 0 && alphas.every((a) => a < 0.35)
  if (mostlyTransparent) return 'overlay / border'
  if (asBackground > asText) return lum < 0.08 ? 'background (dark)' : lum > 0.8 ? 'background (light)' : lum < 0.3 ? 'surface (dark)' : 'accent / surface'
  if (asText > asBackground) return lum > 0.6 ? 'text (light)' : lum < 0.2 ? 'text (dark)' : 'text (accent)'
  return lum < 0.08 ? 'background (dark)' : lum > 0.85 ? 'text / background (light)' : 'accent'
}

/**
 * @param {string} css   concatenated <style> blocks + inline style attributes
 * @param {string} html  full document (for meta theme-color and SVG fills)
 */
export function extractColors(css, html) {
  const counts = new Map()
  const bump = (hex, alpha, context) => {
    if (!hex) return
    const key = hex
    const entry = counts.get(key) || { hex, count: 0, alphas: new Set(), asBackground: 0, asText: 0 }
    entry.count++
    entry.alphas.add(alpha === null || alpha === undefined ? 1 : alpha)
    if (/background|bg|fill|border|shadow|gradient/i.test(context)) entry.asBackground++
    if (/(^|[^-])color\s*:/i.test(context) && !/background-color/i.test(context)) entry.asText++
    counts.set(key, entry)
  }
  const declarations = css.split(/[;{}]/)
  for (const decl of declarations) {
    for (const m of decl.matchAll(HEX_RE)) { const n = normalizeHex(m[0]); if (n) bump(n.hex, n.alpha, decl) }
    for (const m of decl.matchAll(RGB_RE)) bump(`#${hex2(+m[1])}${hex2(+m[2])}${hex2(+m[3])}`, m[4] !== undefined ? +m[4] : null, decl)
    for (const m of decl.matchAll(HSL_RE)) bump(hslToHex(+m[1], +m[2], +m[3]), m[4] !== undefined ? +m[4] : null, decl)
  }
  const themeColor = /<meta[^>]+name="theme-color"[^>]+content="([^"]+)"/i.exec(html)?.[1] || null
  const palette = [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 40)
    .map((e) => ({
      hex: e.hex,
      count: e.count,
      asBackground: e.asBackground,
      asText: e.asText,
      alphas: [...e.alphas].sort(),
      role: roleFor(e.hex, [...e.alphas], e.asBackground, e.asText),
      luminance: Math.round(luminance(e.hex) * 1000) / 1000,
    }))
  // The page background is the most-used opaque colour in background declarations; the body
  // declaration (html/body { background }) wins when present. Theme-color is a fallback hint.
  const bodyBg = /(?:^|[\s,}])(?:html|body)[^{]*\{[^}]*background(?:-color)?\s*:\s*(#[0-9a-f]{3,8})/i.exec(css)
  const opaque = palette.filter((p) => !p.alphas.length || p.alphas.some((a) => a >= 0.9))
  const bgCandidate = (bodyBg && normalizeHex(bodyBg[1])?.hex) || (themeColor && normalizeHex(themeColor)?.hex) || opaque.filter((p) => p.asBackground > 0).sort((a, b) => b.asBackground - a.asBackground)[0]?.hex || null
  const background = bgCandidate ? (palette.find((p) => p.hex === bgCandidate) || { hex: bgCandidate, luminance: luminance(bgCandidate) }) : null
  const mode = background ? (background.luminance < 0.4 ? 'dark' : 'light') : 'unknown'
  const foreground = opaque.filter((p) => p.asText > 0 && (mode === 'dark' ? p.luminance > 0.6 : p.luminance < 0.3)).sort((a, b) => b.asText - a.asText)[0] || null
  const accent = opaque.filter((p) => p.luminance >= 0.08 && p.luminance <= 0.75 && p.hex !== background?.hex && p.hex !== foreground?.hex && !/^#(.)\1(.)\2(.)\3$/.test(p.hex) && !isGrey(p.hex)).sort((a, b) => b.count - a.count)[0] || null
  return {
    themeColor,
    palette,
    roles: {
      background: background?.hex || null,
      foreground: foreground?.hex || null,
      accent: accent?.hex || null,
      contrastBackgroundForeground: background && foreground ? contrastRatio(background.hex, foreground.hex) : null,
      contrastAccentOnBackground: background && accent ? contrastRatio(background.hex, accent.hex) : null,
    },
    mode,
  }
}

export function extractTypography(css, html) {
  const families = new Map()
  for (const m of css.matchAll(/font-family\s*:\s*([^;}"]+)/gi)) {
    const stack = m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
    if (!stack.length) continue
    const primary = stack[0]
    const e = families.get(primary) || { family: primary, count: 0, fallbacks: new Set() }
    e.count++
    stack.slice(1).forEach((f) => e.fallbacks.add(f))
    families.set(primary, e)
  }
  const fontFaces = []
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
    const block = m[1]
    fontFaces.push({
      family: /font-family\s*:\s*['"]?([^;'"]+)/i.exec(block)?.[1]?.trim() || null,
      weight: /font-weight\s*:\s*([^;]+)/i.exec(block)?.[1]?.trim() || null,
      style: /font-style\s*:\s*([^;]+)/i.exec(block)?.[1]?.trim() || null,
      src: /url\(['"]?([^'")]+)/i.exec(block)?.[1] || null,
      display: /font-display\s*:\s*([^;]+)/i.exec(block)?.[1]?.trim() || null,
    })
  }
  const googleFonts = []
  for (const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?([^"' >]+)/gi)) {
    const params = decodeURIComponent(m[1].replace(/&amp;/g, '&'))
    for (const fam of params.matchAll(/family=([^&:]+)(?::([^&]+))?/g)) {
      googleFonts.push({ family: fam[1].replace(/\+/g, ' '), axes: fam[2] || null })
    }
  }
  const sizes = new Map()
  for (const m of css.matchAll(/font-size\s*:\s*([0-9.]+)(px|rem|em)/gi)) {
    const px = m[2] === 'px' ? +m[1] : +m[1] * 16
    const key = Math.round(px)
    sizes.set(key, (sizes.get(key) || 0) + 1)
  }
  const weights = new Map()
  for (const m of css.matchAll(/font-weight\s*:\s*(\d{3}|bold|normal)/gi)) {
    const w = m[1] === 'bold' ? '700' : m[1] === 'normal' ? '400' : m[1]
    weights.set(w, (weights.get(w) || 0) + 1)
  }
  const lineHeights = new Map()
  for (const m of css.matchAll(/line-height\s*:\s*([0-9.]+(?:px|%|em|rem)?)/gi)) lineHeights.set(m[1], (lineHeights.get(m[1]) || 0) + 1)
  const letterSpacing = new Map()
  for (const m of css.matchAll(/letter-spacing\s*:\s*(-?[0-9.]+(?:px|em|rem))/gi)) letterSpacing.set(m[1], (letterSpacing.get(m[1]) || 0) + 1)
  return {
    families: [...families.values()].sort((a, b) => b.count - a.count).map((f) => ({ ...f, fallbacks: [...f.fallbacks] })),
    fontFaces,
    googleFonts,
    typeScalePx: [...sizes.entries()].sort((a, b) => a[0] - b[0]).map(([px, count]) => ({ px, count })),
    weights: [...weights.entries()].sort((a, b) => +a[0] - +b[0]).map(([weight, count]) => ({ weight, count })),
    lineHeights: [...lineHeights.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([value, count]) => ({ value, count })),
    letterSpacing: [...letterSpacing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([value, count]) => ({ value, count })),
  }
}

export function extractShapeTokens(css) {
  const tally = (re, transform = (x) => x) => {
    const map = new Map()
    for (const m of css.matchAll(re)) { const v = transform(m[1].trim()); map.set(v, (map.get(v) || 0) + 1) }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([value, count]) => ({ value, count }))
  }
  const variables = new Map()
  for (const m of css.matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;}]+)/g)) {
    if (!variables.has(m[1])) variables.set(m[1], m[2].trim().slice(0, 120))
  }
  const breakpoints = new Map()
  for (const m of css.matchAll(/@media[^{]*\((?:max|min)-width\s*:\s*([0-9.]+(?:px|em|rem))\)/gi)) breakpoints.set(m[1], (breakpoints.get(m[1]) || 0) + 1)
  const transitions = tally(/transition\s*:\s*([^;}]+)/gi, (v) => v.slice(0, 80))
  const easings = new Map()
  for (const m of css.matchAll(/(cubic-bezier\([^)]*\)|ease-in-out|ease-out|ease-in|linear|ease)\b/gi)) easings.set(m[1], (easings.get(m[1]) || 0) + 1)
  return {
    borderRadius: tally(/border-radius\s*:\s*([^;}]+)/gi),
    boxShadow: tally(/box-shadow\s*:\s*([^;}]+)/gi, (v) => v.slice(0, 120)),
    gradients: tally(/((?:linear|radial|conic)-gradient\([^;}]+\))/gi, (v) => v.slice(0, 160)),
    backdropFilter: tally(/backdrop-filter\s*:\s*([^;}]+)/gi),
    transitions,
    easings: [...easings.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count })),
    breakpoints: [...breakpoints.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([value, count]) => ({ value, count })),
    cssVariables: [...variables.entries()].slice(0, 80).map(([name, value]) => ({ name, value })),
    keyframes: [...css.matchAll(/@keyframes\s+([a-zA-Z0-9_-]+)/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i),
    usesPrefersReducedMotion: /prefers-reduced-motion/i.test(css),
    usesPrefersColorScheme: /prefers-color-scheme/i.test(css),
    usesContainerQueries: /@container/i.test(css),
    usesCustomProperties: variables.size > 0,
  }
}

export function analyzeDesign({ $, html }) {
  const styleBlocks = $('style').map((_, el) => $(el).html() || '').get()
  const inlineStyles = $('[style]').map((_, el) => `.inline{${$(el).attr('style')}}`).get()
  const css = [...styleBlocks, ...inlineStyles].join('\n')
  const external = $('link[rel~="stylesheet"]').map((_, el) => $(el).attr('href')).get().filter(Boolean)
  return {
    stylesheetBytesInline: byteLength(styleBlocks.join('\n')),
    inlineStyleAttributes: inlineStyles.length,
    externalStylesheets: external,
    colors: extractColors(css, html),
    typography: extractTypography(css, html),
    shape: extractShapeTokens(css),
  }
}
