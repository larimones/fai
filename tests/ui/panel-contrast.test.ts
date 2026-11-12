import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Read from disk: inside the renderer test project CSS imports come back empty, and the
// renderer may not use node:fs.
const css = readFileSync(
  resolve(import.meta.dirname, '..', '..', 'src', 'renderer', 'src', 'panel', 'panel.css'),
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

/** Reads `--name: #rrggbb;` from the panel stylesheet, so a palette change re-runs this check. */
function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(css)
  if (match?.[1] === undefined) {
    throw new Error(`Cor --${name} não encontrada em panel.css`)
  }
  return match[1]
}

describe('panel colors (RNF-10 CA1, CA14)', () => {
  // Text pairs need 4.5:1; borders and the focus ring of controls need 3:1.
  const text: [string, string][] = [
    ['text', 'surface'],
    ['text', 'surface-end'],
    ['text', 'row'],
    ['text', 'ask'],
    ['title', 'surface'],
    ['title', 'surface-end'],
    ['muted', 'row'],
    ['muted', 'surface-end'],
    ['chip-text', 'chip'],
    ['on-accent', 'accent'],
    ['accent', 'row'],
    ['error', 'surface-end'],
  ]
  const nonText: [string, string][] = [
    ['field-border', 'row'],
    ['focus', 'surface-end'],
    ['focus', 'row'],
  ]

  it.each(text)('--%s on --%s reaches 4.5:1', (foreground, background) => {
    expect(contrast(token(foreground), token(background))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(nonText)('--%s on --%s reaches 3:1', (foreground, background) => {
    expect(contrast(token(foreground), token(background))).toBeGreaterThanOrEqual(3)
  })
})
