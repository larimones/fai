import { describe, expect, it } from 'vitest'
import {
  CURRENT_SCHEMA_VERSION,
  createEmptyData,
  FAI_DATA_MIGRATIONS,
  type FaiDataV1,
} from './fai-data'
import { migrateToCurrent, type MigrationTable, type VersionedDocument } from './migrations'

// Example table shaped like the real future ones: v2 adds tasks, v3 adds reminders.
const exampleMigrations: MigrationTable = {
  1: (document) => ({ ...document, schemaVersion: 2, tasks: [] }),
  2: (document) => ({ ...document, schemaVersion: 3, reminders: [] }),
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

describe('createEmptyData', () => {
  it('creates a current-version document without a mascot position', () => {
    const data: FaiDataV1 = createEmptyData()

    expect(data).toEqual({ schemaVersion: CURRENT_SCHEMA_VERSION, mascot: { position: null } })
  })

  it('returns a fresh object on every call', () => {
    expect(createEmptyData()).not.toBe(createEmptyData())
  })
})

describe('migrateToCurrent (RNF-07 CA3)', () => {
  it('keeps a current document as it is', () => {
    const document = createEmptyData()

    expect(migrateToCurrent(document, FAI_DATA_MIGRATIONS, CURRENT_SCHEMA_VERSION)).toEqual({
      ok: true,
      document,
    })
  })

  it('applies every step in order, without changing the input', () => {
    const v1 = deepFreeze({ schemaVersion: 1, mascot: { position: { x: 10, y: 20 } } })

    const result = migrateToCurrent(v1, exampleMigrations, 3)

    expect(result).toEqual({
      ok: true,
      document: {
        schemaVersion: 3,
        mascot: { position: { x: 10, y: 20 } },
        tasks: [],
        reminders: [],
      },
    })
    expect(v1).toEqual({ schemaVersion: 1, mascot: { position: { x: 10, y: 20 } } })
  })

  it('starts from the middle of the chain', () => {
    const v2: VersionedDocument = { schemaVersion: 2 }

    expect(migrateToCurrent(v2, exampleMigrations, 3)).toEqual({
      ok: true,
      document: { schemaVersion: 3, reminders: [] },
    })
  })

  it('rejects documents written by a newer app', () => {
    expect(migrateToCurrent({ schemaVersion: 4 }, exampleMigrations, 3)).toEqual({
      ok: false,
      code: 'FUTURE_VERSION',
      version: 4,
    })
  })

  it('rejects versions that are not positive integers', () => {
    for (const schemaVersion of [0, -1, 1.5, Number.NaN]) {
      expect(migrateToCurrent({ schemaVersion }, exampleMigrations, 3)).toMatchObject({
        ok: false,
        code: 'INVALID_VERSION',
      })
    }
  })

  it('reports a missing step', () => {
    const gap: MigrationTable = { 1: exampleMigrations[1] }

    expect(migrateToCurrent({ schemaVersion: 1 }, gap, 3)).toEqual({
      ok: false,
      code: 'NO_MIGRATION_PATH',
      version: 2,
    })
  })

  it('reports a step that does not advance exactly one version', () => {
    const skipping: MigrationTable = { 1: (document) => ({ ...document, schemaVersion: 3 }) }

    expect(migrateToCurrent({ schemaVersion: 1 }, skipping, 3)).toEqual({
      ok: false,
      code: 'BROKEN_MIGRATION',
      version: 1,
    })
  })
})
