import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { CSP_PLACEHOLDER, DEVELOPMENT_CSP, PRODUCTION_CSP } from './src/main/security/csp'

const alias = {
  '@domain': resolve('src/domain'),
  '@shared': resolve('src/shared'),
}

/** Fills the CSP meta tag: strict policy in builds, minimal relaxation for the Vite dev server. */
function contentSecurityPolicy(): Plugin {
  let isDevServer = false
  return {
    name: 'fai:csp',
    configResolved(config) {
      isDevServer = config.command === 'serve'
    },
    transformIndexHtml(html) {
      return html.replace(CSP_PLACEHOLDER, isDevServer ? DEVELOPMENT_CSP : PRODUCTION_CSP)
    },
  }
}

export default defineConfig({
  main: {
    resolve: { alias },
  },
  preload: {
    resolve: { alias },
    build: {
      // Sandboxed preloads cannot require() node_modules, so dependencies (zod) are bundled.
      externalizeDeps: false,
      rolldownOptions: {
        input: { mascot: resolve('src/preload/mascot.ts') },
      },
    },
  },
  renderer: {
    resolve: { alias },
    plugins: [react(), contentSecurityPolicy()],
  },
})
