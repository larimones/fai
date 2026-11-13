/** Longest short text (task title, reminder text), in characters: code points, so an emoji counts as one. */
export const SHORT_TEXT_MAX_LENGTH = 200

export type ShortTextResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly reason: 'EMPTY' | 'TOO_LONG' }

/** The one rule for short texts typed in the panel (RF-11 CA1, RF-14 CA1): trimmed, 1 to 200 characters. */
export function validateShortText(raw: string): ShortTextResult {
  const text = raw.trim()
  if (text === '') {
    return { ok: false, reason: 'EMPTY' }
  }
  // Array.from splits by code point, so an emoji counts as one character.
  if (Array.from(text).length > SHORT_TEXT_MAX_LENGTH) {
    return { ok: false, reason: 'TOO_LONG' }
  }
  return { ok: true, text }
}
