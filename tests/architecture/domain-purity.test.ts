import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const DOMAIN_DIR = resolve(import.meta.dirname, '..', '..', 'src', 'domain')

const FORBIDDEN_PACKAGES = [
  /^electron(\/|$)/,
  /^react(-dom)?(\/|$)/,
  /^zod(\/|$)/,
  /^node:/,
  /^@shared\//,
]
const NODE_BUILTINS = new Set([
  'fs',
  'path',
  'os',
  'child_process',
  'crypto',
  'net',
  'http',
  'https',
])
const IMPORT_PATTERN = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g

/** Returns the import specifiers in `source` that the domain layer is not allowed to use. */
export function findForbiddenImports(source: string, filePath: string): string[] {
  return [...source.matchAll(IMPORT_PATTERN)]
    .map((match) => match[1] ?? '')
    .filter((specifier) => {
      if (specifier.startsWith('.')) {
        const target = resolve(dirname(filePath), specifier)
        return relative(DOMAIN_DIR, target).startsWith('..')
      }
      return (
        NODE_BUILTINS.has(specifier) ||
        FORBIDDEN_PACKAGES.some((pattern) => pattern.test(specifier))
      )
    })
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      return listSourceFiles(fullPath)
    }
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [fullPath] : []
  })
}

describe('domain layer purity (RNF-06 CA4)', () => {
  it('detects forbidden imports', () => {
    const file = join(DOMAIN_DIR, 'example.ts')
    const source = [
      "import { app } from 'electron'",
      "import { readFile } from 'node:fs/promises'",
      "import path from 'path'",
      "import { z } from 'zod'",
      "import type { FaiApi } from '@shared/ipc/api'",
      "import { createMainWindow } from '../main/windows/main-window'",
      "export { thing } from './allowed'",
      "const lazy = import('react')",
    ].join('\n')
    expect(findForbiddenImports(source, file)).toEqual([
      'electron',
      'node:fs/promises',
      'path',
      'zod',
      '@shared/ipc/api',
      '../main/windows/main-window',
      'react',
    ])
  })

  it('has no forbidden imports in src/domain', () => {
    const files = listSourceFiles(DOMAIN_DIR)
    expect(files.length).toBeGreaterThan(0)
    const violations = files.flatMap((file) =>
      findForbiddenImports(readFileSync(file, 'utf8'), file).map(
        (specifier) => `${relative(DOMAIN_DIR, file)} → ${specifier}`,
      ),
    )
    expect(violations).toEqual([])
  })
})
