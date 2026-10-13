// Build for publishing as a claude.ai artifact: relative asset paths, separate output dir.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  // The artifact host rejects files containing U+FFFD; escape every non-ASCII character instead.
  esbuild: { charset: 'ascii' },
  build: { outDir: 'dist-artifact', emptyOutDir: true },
})
