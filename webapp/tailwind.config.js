/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'ui-monospace', 'monospace'] },
      colors: {
        ink: { 950: '#0b0f17', 900: '#111827', 800: '#1a2233', 700: '#263146', 600: '#3b4760', 400: '#8b97ad', 200: '#d6dce8' },
        accent: { 500: '#22d3ee', 600: '#06b6d4', 400: '#67e8f9' },
      },
    },
  },
  plugins: [],
}
