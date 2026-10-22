import { describe, expect, it } from 'vitest'
import { describeAppInfo } from './app-info'

describe('describeAppInfo', () => {
  it('uses a friendly platform name', () => {
    expect(describeAppInfo({ name: 'Fai', version: '0.1.0', platform: 'win32' })).toBe(
      'Fai v0.1.0 · Windows',
    )
  })

  it('falls back to the raw platform id when it is unknown', () => {
    expect(describeAppInfo({ name: 'Fai', version: '0.1.0', platform: 'freebsd' })).toBe(
      'Fai v0.1.0 · freebsd',
    )
  })
})
