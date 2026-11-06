import { describe, expect, it } from 'vitest'
import { createEmptyData } from '@domain/data/fai-data'
import { documentEnvelopeSchema, faiDataSchema, faiDataV1Schema } from './schema'

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

describe('faiDataV1Schema (RNF-07): validates a v1 file before migrating', () => {
  const v1 = { schemaVersion: 1, mascot: { position: null } }

  it('accepts the v1 document, with or without a mascot position', () => {
    expect(faiDataV1Schema.parse(v1)).toEqual(v1)
    const placed = { schemaVersion: 1, mascot: { position: { x: -1280, y: 600 } } }
    expect(faiDataV1Schema.parse(placed)).toEqual(placed)
  })

  it('rejects extra fields at any level, wrong types and other versions', () => {
    for (const document of [
      { ...v1, tasks: [] },
      { schemaVersion: 1, mascot: { position: null, scale: 3 } },
      { schemaVersion: 1, mascot: { position: { x: 1, y: 2, z: 3 } } },
      { mascot: { position: null } },
      { schemaVersion: 2, mascot: { position: null } },
      { schemaVersion: 1 },
      { schemaVersion: 1, mascot: {} },
      { schemaVersion: 1, mascot: { position: { x: '10', y: 20 } } },
      { schemaVersion: 1, mascot: { position: { x: 10.5, y: 20 } } },
    ]) {
      expect(faiDataV1Schema.safeParse(document).success).toBe(false)
    }
  })
})

describe('faiDataSchema (v2, ADR-0015)', () => {
  const task = {
    id: '6f1c2a4e-8b1d-4c3e-9f2a-1b2c3d4e5f60',
    title: 'Regar as plantas',
    createdAt: '2026-11-06T12:00:00.000Z',
    completedAt: null,
  }
  const withTask = (changes: Record<string, unknown>) => ({
    schemaVersion: 2,
    mascot: { position: null },
    tasks: [{ ...task, ...changes }],
  })

  it('accepts the empty document and documents with pending and completed tasks', () => {
    expect(faiDataSchema.parse(createEmptyData())).toEqual(createEmptyData())
    expect(faiDataSchema.parse(withTask({}))).toEqual(withTask({}))
    const done = withTask({ completedAt: '2026-11-06T13:30:00.000Z' })
    expect(faiDataSchema.parse(done)).toEqual(done)
  })

  it('rejects tasks the domain would never create', () => {
    for (const document of [
      withTask({ title: '' }),
      withTask({ title: '  com espaços  ' }),
      withTask({ title: 'a'.repeat(201) }),
      withTask({ id: 'not-a-uuid' }),
      withTask({ createdAt: '06/11/2026' }),
      withTask({ createdAt: '2026-11-06' }),
      withTask({ completedAt: 'ontem' }),
      withTask({ completedAt: undefined }),
      withTask({ priority: 'alta' }),
    ]) {
      expect(faiDataSchema.safeParse(document).success).toBe(false)
    }
  })

  it('rejects the v1 shape, a missing task list and extra fields', () => {
    for (const document of [
      { schemaVersion: 1, mascot: { position: null } },
      { schemaVersion: 2, mascot: { position: null } },
      { ...createEmptyData(), reminders: [] },
    ]) {
      expect(faiDataSchema.safeParse(document).success).toBe(false)
    }
  })
})
