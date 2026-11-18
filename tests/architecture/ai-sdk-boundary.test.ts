import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '..', '..')
const SRC_DIR = join(ROOT, 'src')

/** The only files that may import the AI service SDK (ADR-0017): the adapter and its test. */
const ALLOWED = new Set(['src/main/chat/claude-chat.ts', 'src/main/chat/claude-chat.test.ts'])

const IMPORT_PATTERN = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g
const SDK = /^@anthropic-ai\/sdk(\/|$)/

/** Whether `source` imports the AI service SDK, in any form. */
export function importsAiSdk(source: string): boolean {
  return [...source.matchAll(IMPORT_PATTERN)].some((match) => SDK.test(match[1] ?? ''))
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      return listSourceFiles(fullPath)
    }
    return /\.tsx?$/.test(entry.name) ? [fullPath] : []
  })
}

describe('AI service SDK boundary (RNF-15 CA1, ADR-0017)', () => {
  it('detects every way of importing the SDK', () => {
    expect(importsAiSdk("import Anthropic from '@anthropic-ai/sdk'")).toBe(true)
    expect(importsAiSdk("import type { MessageParam } from '@anthropic-ai/sdk/resources'")).toBe(
      true,
    )
    expect(importsAiSdk("const sdk = await import('@anthropic-ai/sdk')")).toBe(true)
    expect(importsAiSdk("const sdk = require('@anthropic-ai/sdk')")).toBe(true)
    expect(importsAiSdk("import { z } from 'zod'")).toBe(false)
    expect(importsAiSdk("import { thing } from '@anthropic-ai/sdkish'")).toBe(false)
  })

  it('is imported only by src/main/chat/claude-chat.ts', () => {
    const offenders = listSourceFiles(SRC_DIR)
      .map((file) => relative(ROOT, file).split(sep).join('/'))
      .filter((file) => !ALLOWED.has(file))
      .filter((file) => importsAiSdk(readFileSync(join(ROOT, file), 'utf8')))

    expect(offenders).toEqual([])
  })
})
