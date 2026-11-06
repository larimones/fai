import { mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyData, type FaiData } from '@domain/data/fai-data'
import {
  createDataStore,
  faiDataFormat,
  quarantineTimestamp,
  type DataStoreFs,
  type DataStoreOptions,
  type DocumentFormat,
} from './data-store'

const NOW = new Date('2026-10-22T19:45:53.123Z')
const QUARANTINE_NAME = 'fai-data.corrupt-20261022T194553Z.json'

function fsError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`${code}: simulated`), { code })
}

const V1_WITH_POSITION = { schemaVersion: 1, mascot: { position: { x: -800, y: 420 } } }
const TASK = {
  id: '6f1c2a4e-8b1d-4c3e-9f2a-1b2c3d4e5f60',
  title: 'Regar as plantas',
  createdAt: '2026-11-06T12:00:00.000Z',
  completedAt: null,
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

  it('round-trips a saved document with tasks exactly', async () => {
    const data: FaiData = {
      schemaVersion: 2,
      mascot: { position: { x: -1280, y: 600 } },
      tasks: [
        TASK,
        {
          ...TASK,
          id: '7a2d3b5f-9c2e-4d4f-8a3b-2c3d4e5f6a71',
          completedAt: '2026-11-06T13:00:00.000Z',
        },
      ],
    }
    const writer = store()
    writer.save(data)
    await writer.flush()

    expect(await store().load()).toEqual({ status: 'loaded', data })
  })

  it('migrates a v1 file to v2, keeping the mascot position (ADR-0015)', async () => {
    await writeFile(filePath, JSON.stringify(V1_WITH_POSITION), 'utf8')

    expect(await store().load()).toEqual({
      status: 'migrated',
      data: { schemaVersion: 2, mascot: { position: { x: -800, y: 420 } }, tasks: [] },
    })
  })

  it('checks a v1 file against the v1 schema before migrating it', async () => {
    // Migrating would overwrite this "tasks" with [], so only the v1 check can catch it.
    await expectQuarantined(
      JSON.stringify({ ...V1_WITH_POSITION, tasks: [{ title: 'lixo' }] }),
      'INVALID_DOCUMENT',
    )
  })

  it('quarantines a v2 file with a task the domain would never create', async () => {
    await expectQuarantined(
      JSON.stringify({ ...createEmptyData(), tasks: [{ ...TASK, title: '   ' }] }),
      'INVALID_DOCUMENT',
    )
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
    const gapFormat: DocumentFormat = { ...faiDataFormat, migrations: {} }
    await writeFile(filePath, JSON.stringify(V1_WITH_POSITION), 'utf8')

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
