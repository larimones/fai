import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// A fixed time zone for the local-time rules (reminder quick times and labels, ADR-0016):
// UTC-3 without daylight saving. Test workers inherit it from this process.
process.env['TZ'] = 'America/Sao_Paulo'

export default defineConfig({
  resolve: {
    alias: {
      '@domain': resolve('src/domain'),
      '@shared': resolve('src/shared'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/{main,preload,shared,domain}/**/*.test.ts', 'tests/**/*.test.ts'],
        },
      },
      {
        extends: true,
        plugins: [react()],
        test: {
          name: 'renderer',
          environment: 'jsdom',
          include: ['src/renderer/**/*.test.{ts,tsx}'],
          setupFiles: ['src/renderer/test-setup.ts'],
        },
      },
    ],
  },
})
