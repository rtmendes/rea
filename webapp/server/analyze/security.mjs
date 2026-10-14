// Security posture visible from a single response: headers, cookies, script hygiene.

const HEADER_CHECKS = [
  { header: 'strict-transport-security', label: 'HSTS', weight: 2, advice: 'Add Strict-Transport-Security with max-age ≥ 31536000.' },
  { header: 'content-security-policy', label: 'Content-Security-Policy', weight: 3, advice: 'Define a CSP; inline scripts will need nonces or hashes.' },
  { header: 'x-content-type-options', label: 'X-Content-Type-Options', weight: 1, advice: 'Set X-Content-Type-Options: nosniff.' },
  { header: 'x-frame-options', label: 'X-Frame-Options / frame-ancestors', weight: 1, advice: 'Set X-Frame-Options: DENY or CSP frame-ancestors.' },
  { header: 'referrer-policy', label: 'Referrer-Policy', weight: 1, advice: 'Set Referrer-Policy (strict-origin-when-cross-origin is a safe default).' },
  { header: 'permissions-policy', label: 'Permissions-Policy', weight: 1, advice: 'Set Permissions-Policy to disable unused browser features.' },
  { header: 'cross-origin-opener-policy', label: 'Cross-Origin-Opener-Policy', weight: 1, advice: 'Consider COOP: same-origin.' },
]

export function analyzeSecurity({ headers, finalUrl, scripts, network }) {
  const https = finalUrl.startsWith('https:')
  const checks = HEADER_CHECKS.map((c) => {
    let value = headers[c.header] || null
    if (!value && c.header === 'x-frame-options' && /frame-ancestors/i.test(headers['content-security-policy'] || '')) value = 'via CSP frame-ancestors'
    return { ...c, present: Boolean(value), value: value ? value.slice(0, 200) : null }
  })
  const cookies = (headers['set-cookie'] || '').split(/,(?=\s*[A-Za-z0-9_-]+=)/).filter(Boolean).map((raw) => {
    const [pair, ...attrs] = raw.split(';').map((s) => s.trim())
    const name = pair.split('=')[0]
    const flags = attrs.map((a) => a.toLowerCase())
    return {
      name,
      secure: flags.includes('secure'),
      httpOnly: flags.includes('httponly'),
      sameSite: (attrs.find((a) => /^samesite=/i.test(a)) || '').split('=')[1] || null,
      sessionHint: /PHPSESSID|JSESSIONID|ASP\.NET_SessionId|connect\.sid|_session|sessionid/i.test(name) ? 'server session cookie' : null,
    }
  })
  const maxScore = HEADER_CHECKS.reduce((a, c) => a + c.weight, 0) + 2
  let score = checks.reduce((a, c) => a + (c.present ? c.weight : 0), 0) + (https ? 2 : 0)
  const findings = []
  if (!https) findings.push({ severity: 'high', text: 'Final URL is not served over HTTPS.' })
  for (const c of checks) if (!c.present) findings.push({ severity: c.weight >= 2 ? 'medium' : 'low', text: `${c.label} header missing. ${c.advice}` })
  const thirdPartyNoSri = scripts.external.filter((s) => !s.firstParty && !s.integrity)
  if (thirdPartyNoSri.length) findings.push({ severity: 'medium', text: `${thirdPartyNoSri.length} third-party script(s) load without Subresource Integrity: ${thirdPartyNoSri.map((s) => s.host).join(', ')}.` })
  if (scripts.inline.length) findings.push({ severity: 'info', text: `${scripts.inline.length} inline script block(s); a strict CSP would need nonces/hashes.` })
  if (network.mixedContent.length) findings.push({ severity: 'high', text: `Mixed content from: ${network.mixedContent.join(', ')}.` })
  for (const c of cookies) {
    if (!c.secure || !c.httpOnly) findings.push({ severity: 'medium', text: `Cookie ${c.name} is missing ${[!c.secure && 'Secure', !c.httpOnly && 'HttpOnly'].filter(Boolean).join(' and ')}.` })
  }
  if (headers['server'] && /\d/.test(headers['server'])) findings.push({ severity: 'low', text: `Server header discloses a version: ${headers['server']}.` })
  if (headers['x-powered-by']) findings.push({ severity: 'low', text: `X-Powered-By discloses the stack: ${headers['x-powered-by']}.` })
  return {
    https,
    score: Math.round((score / maxScore) * 100),
    headerChecks: checks,
    cookies,
    cacheControl: headers['cache-control'] || null,
    server: headers['server'] || null,
    poweredBy: headers['x-powered-by'] || null,
    findings,
  }
}
