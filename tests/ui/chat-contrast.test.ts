import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Read from disk: inside the renderer test project CSS imports come back empty.
const css = readFileSync(
  resolve(import.meta.dirname, '..', '..', 'src', 'renderer', 'src', 'chat', 'chat.css'),
  'utf8',
)

/** WCAG 2 relative luminance of a #rrggbb color. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255)
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05)
}

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(css)
  if (match?.[1] === undefined) {
    throw new Error(`Cor --${name} não encontrada em chat.css`)
  }
  return match[1]
}

describe('chat bubble colors (RNF-10, CA11)', () => {
  // Text pairs need 4.5:1; borders, the focus ring and the scrollbar need 3:1.
  const text: [string, string][] = [
    ['text', 'surface'],
    ['text', 'surface-end'],
    ['text', 'fai'],
    ['user-text', 'user'],
    ['title', 'surface'],
    ['title', 'surface-end'],
    ['muted', 'surface-end'],
    ['muted', 'fai'],
    ['on-accent', 'accent'],
    ['error', 'surface-end'],
  ]
  const nonText: [string, string][] = [
    ['field-border', 'fai'],
    ['focus', 'surface-end'],
    ['focus', 'fai'],
    ['accent', 'surface-end'],
  ]

  it.each(text)('--%s on --%s reaches 4.5:1', (foreground, background) => {
    expect(contrast(token(foreground), token(background))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(nonText)('--%s on --%s reaches 3:1', (foreground, background) => {
    expect(contrast(token(foreground), token(background))).toBeGreaterThanOrEqual(3)
  })
})
