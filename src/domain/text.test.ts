import { describe, expect, it } from 'vitest'
import { SHORT_TEXT_MAX_LENGTH, validateShortText } from './text'

describe('validateShortText (RF-11 CA1, RF-14 CA1)', () => {
  it('trims and accepts 1 to 200 characters', () => {
    expect(SHORT_TEXT_MAX_LENGTH).toBe(200)
    expect(validateShortText('  tomar água \n')).toEqual({ ok: true, text: 'tomar água' })
    expect(validateShortText('a'.repeat(200))).toMatchObject({ ok: true })
  })

  it('rejects empty or blank text', () => {
    expect(validateShortText(' \t ')).toEqual({ ok: false, reason: 'EMPTY' })
  })

  it('rejects more than 200 characters, counting an emoji as one', () => {
    expect(validateShortText('a'.repeat(201))).toEqual({ ok: false, reason: 'TOO_LONG' })
    expect(validateShortText('🧚'.repeat(200))).toMatchObject({ ok: true })
    expect(validateShortText('🧚'.repeat(201))).toEqual({ ok: false, reason: 'TOO_LONG' })
  })
})
