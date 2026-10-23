import { describe, expect, it } from 'vitest'
import { createEmptyData } from '@domain/data/fai-data'
import { documentEnvelopeSchema, faiDataSchema } from './schema'

describe('documentEnvelopeSchema', () => {
  it('reads the version and keeps the remaining fields for migration', () => {
    expect(documentEnvelopeSchema.parse({ schemaVersion: 2, tasks: [] })).toEqual({
      schemaVersion: 2,
      tasks: [],
    })
  })

  it('rejects documents without a positive integer version', () => {
    for (const document of [
      {},
      { schemaVersion: '1' },
      { schemaVersion: 0 },
      { schemaVersion: 1.5 },
      [],
      null,
      'fai',
    ]) {
      expect(documentEnvelopeSchema.safeParse(document).success).toBe(false)
    }
  })
})

describe('faiDataSchema (v1, RNF-07)', () => {
  it('accepts the empty document', () => {
    expect(faiDataSchema.parse(createEmptyData())).toEqual(createEmptyData())
  })

  it('accepts a saved mascot position', () => {
    const data = { schemaVersion: 1, mascot: { position: { x: -1280, y: 600 } } }

    expect(faiDataSchema.parse(data)).toEqual(data)
  })

  it('rejects extra fields at any level', () => {
    for (const document of [
      { ...createEmptyData(), tasks: [] },
      { schemaVersion: 1, mascot: { position: null, scale: 3 } },
      { schemaVersion: 1, mascot: { position: { x: 1, y: 2, z: 3 } } },
    ]) {
      expect(faiDataSchema.safeParse(document).success).toBe(false)
    }
  })

  it('rejects wrong types, missing fields and other versions', () => {
    for (const document of [
      { mascot: { position: null } },
      { schemaVersion: 2, mascot: { position: null } },
      { schemaVersion: 1 },
      { schemaVersion: 1, mascot: {} },
      { schemaVersion: 1, mascot: { position: { x: '10', y: 20 } } },
      { schemaVersion: 1, mascot: { position: { x: 10.5, y: 20 } } },
    ]) {
      expect(faiDataSchema.safeParse(document).success).toBe(false)
    }
  })
})
