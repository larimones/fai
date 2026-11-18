import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const manifest = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '..', '..', 'package.json'), 'utf8'),
) as {
  version: string
  productName: string
  description: string
  dependencies?: Record<string, string>
  devDependencies: Record<string, string>
}

describe('package.json for the installer (ADR-0018)', () => {
  it('is version 1.0.0, named Fai, and describes the illustrated mascot', () => {
    expect(manifest.version).toBe('1.0.0')
    expect(manifest.productName).toBe('Fai')
    expect(manifest.description).not.toMatch(/pixel art/i)
    expect(manifest.description).toMatch(/ilustrada/)
  })

  it('has no runtime dependencies: everything is bundled into out/, so no node_modules ships', () => {
    expect(manifest.dependencies ?? {}).toEqual({})
    for (const bundled of ['@anthropic-ai/sdk', 'zod', 'react', 'react-dom']) {
      expect(manifest.devDependencies[bundled]).toBeDefined()
    }
  })
})
