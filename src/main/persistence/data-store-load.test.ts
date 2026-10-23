import { mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createEmptyData, type FaiData } from '@domain/data/fai-data'
import {
  createDataStore,
  quarantineTimestamp,
  type DataStoreFs,
  type DataStoreOptions,
  type DocumentFormat,
} from './data-store'
import { faiDataV1Schema } from './schema'

const NOW = new Date('2026-10-22T19:45:53.123Z')
const QUARANTINE_NAME = 'fai-data.corrupt-20261022T194553Z.json'

function fsError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`${code}: simulated`), { code })
}

// A fake next format whose v2 has the same shape as v1, enough to prove that migration runs.
const futureFormat: DocumentFormat = {
  currentVersion: 2,
  migrations: { 1: (document) => ({ ...document, schemaVersion: 2 }) },
  schema: faiDataV1Schema
    .extend({ schemaVersion: z.literal(2) })
    .transform((document) => ({ ...document, schemaVersion: 1 as const })),
}

describe('quarantineTimestamp', () => {
  it('is compact, sortable and has no characters Windows forbids in file names', () => {
    expect(quarantineTimestamp(NOW)).toBe('20261022T194553Z')
    expect(quarantineTimestamp(NOW)).not.toMatch(/[<>:"/\\|?*]/)
  })
})

describe('createDataStore — loading (RNF-07 CA2, CA3; RF-17 CA2)', () => {
  let dir: string
  let filePath: string
  let onError: ReturnType<typeof vi.fn<(error: unknown) => void>>
  const realFs: DataStoreFs = { readFile, writeFile, rename, rm }

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'fai-store-'))
    filePath = join(dir, 'fai-data.json')
    onError = vi.fn<(error: unknown) => void>()
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  function store(overrides: Partial<DataStoreOptions> = {}) {
    return createDataStore({
      filePath,
      onError,
      now: () => NOW,
      fs: realFs,
      debounceMs: 10,
      retryDelaysMs: [1, 1, 1],
      ...overrides,
    })
  }

  async function expectQuarantined(original: string, reason: string): Promise<void> {
    await writeFile(filePath, original, 'utf8')

    const result = await store().load()

    expect(result).toEqual({
      status: 'quarantined',
      data: createEmptyData(),
      reason,
      quarantinedPath: join(dir, QUARANTINE_NAME),
    })
    expect(await readdir(dir)).toEqual([QUARANTINE_NAME])
    expect(await readFile(join(dir, QUARANTINE_NAME), 'utf8')).toBe(original)
  }

  it('starts empty when there is no file yet', async () => {
    expect(await store().load()).toEqual({ status: 'created', data: createEmptyData() })
    expect(await readdir(dir)).toEqual([])
  })

  it('round-trips a saved document exactly', async () => {
    const data: FaiData = { schemaVersion: 1, mascot: { position: { x: -1280, y: 600 } } }
    const writer = store()
    writer.save(data)
    await writer.flush()

    expect(await store().load()).toEqual({ status: 'loaded', data })
  })

  it('migrates documents from an older version', async () => {
    await writeFile(filePath, JSON.stringify(createEmptyData()), 'utf8')

    const result = await store({ format: futureFormat }).load()

    expect(result).toEqual({ status: 'migrated', data: createEmptyData() })
  })

  it('quarantines a file that is not JSON', async () => {
    await expectQuarantined('{ "schemaVersion": 1, ', 'INVALID_JSON')
  })

  it('quarantines a file without a valid version', async () => {
    await expectQuarantined('{ "mascot": { "position": null } }', 'INVALID_DOCUMENT')
  })

  it('quarantines a document written by a newer app', async () => {
    await expectQuarantined('{ "schemaVersion": 99 }', 'FUTURE_VERSION')
  })

  it('quarantines a document that does not match its schema', async () => {
    await expectQuarantined(
      '{ "schemaVersion": 1, "mascot": { "position": "top-left" } }',
      'INVALID_DOCUMENT',
    )
  })

  it('quarantines a document with no migration path', async () => {
    const gapFormat: DocumentFormat = { ...futureFormat, migrations: {} }
    await writeFile(filePath, JSON.stringify(createEmptyData()), 'utf8')

    const result = await store({ format: gapFormat }).load()

    expect(result).toMatchObject({ status: 'quarantined', reason: 'NO_MIGRATION_PATH' })
  })

  it('quarantines a path that cannot be read as a file', async () => {
    await mkdir(filePath)

    const result = await store().load()

    expect(result).toMatchObject({ status: 'quarantined', reason: 'UNREADABLE' })
    expect(await readdir(dir)).toEqual([QUARANTINE_NAME])
  })

  it('retries reading while Windows briefly locks the file', async () => {
    await writeFile(filePath, JSON.stringify(createEmptyData()), 'utf8')
    let locked = true
    const flakyFs: DataStoreFs = {
      ...realFs,
      readFile: (path, encoding) => {
        if (locked) {
          locked = false
          return Promise.reject(fsError('EBUSY'))
        }
        return readFile(path, encoding)
      },
    }

    expect(await store({ fs: flakyFs }).load()).toEqual({
      status: 'loaded',
      data: createEmptyData(),
    })
  })

  it('protects a file it can neither read nor move aside', async () => {
    const original = '{ "schemaVersion": 1, "mascot": { "position": null } }'
    await writeFile(filePath, original, 'utf8')
    const lockedFs: DataStoreFs = {
      ...realFs,
      readFile: () => Promise.reject(fsError('EACCES')),
      // Only moving the file aside fails; a later save would succeed and overwrite it.
      rename: (oldPath, newPath) =>
        newPath.includes('.corrupt-')
          ? Promise.reject(fsError('EACCES'))
          : rename(oldPath, newPath),
    }
    const dataStore = store({ fs: lockedFs })

    const result = await dataStore.load()
    dataStore.save(createEmptyData())
    await dataStore.flush()

    expect(result).toMatchObject({ status: 'unavailable', reason: 'UNREADABLE' })
    expect(await readFile(filePath, 'utf8')).toBe(original)
    expect(await readdir(dir)).toEqual(['fai-data.json'])
  })
})
