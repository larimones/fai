import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const RENDERER = resolve(import.meta.dirname, '..', '..', 'src', 'renderer')

describe('app pages (RNF-02, RNF-15 CA1, ADR-0017)', () => {
  it.each(['index.html', 'panel.html', 'chat.html'])(
    '%s gets the one CSP of the app and loads nothing remote',
    (page) => {
      const html = readFileSync(resolve(RENDERER, page), 'utf8')

      expect(html.match(/http-equiv="Content-Security-Policy"/g)).toHaveLength(1)
      expect(html).toContain('content="%FAI_CSP%"')
      expect(html).not.toMatch(/(https?:)?\/\/[a-z]/i)
      expect(html).toContain('<html lang="pt-BR">')
    },
  )
})
