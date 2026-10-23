import { mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyData, type FaiData } from '@domain/data/fai-data'
import { createDataStore, type DataStoreFs, type DataStoreOptions } from './data-store'

function dataAt(x: number): FaiData {
  return { schemaVersion: 1, mascot: { position: { x, y: 0 } } }
}

function fsError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`${code}: simulated`), { code })
}

describe('createDataStore — writing (RNF-07 CA1, RF-17 CA2)', () => {
  let dir: string
  let filePath: string
  let onError: ReturnType<typeof vi.fn<(error: unknown) => void>>
  let writes: string[]
  let realFs: DataStoreFs

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'fai-store-'))
    filePath = join(dir, 'fai-data.json')
    onError = vi.fn<(error: unknown) => void>()
    writes = []
    realFs = {
      readFile,
      writeFile: async (path, data, encoding) => {
        writes.push(data)
        await writeFile(path, data, encoding)
      },
      rename,
      rm,
    }
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  function store(overrides: Partial<DataStoreOptions> = {}) {
    return createDataStore({
      filePath,
      onError,
      fs: realFs,
      debounceMs: 10,
      retryDelaysMs: [1, 1, 1],
      ...overrides,
    })
  }

  async function readStored(): Promise<unknown> {
    return JSON.parse(await readFile(filePath, 'utf8'))
  }

  it('writes the document exactly and leaves no temporary file', async () => {
    const data = dataAt(-1280)
    const dataStore = store()

    dataStore.save(data)
    await dataStore.flush()

    expect(await readStored()).toEqual(data)
    expect(await readdir(dir)).toEqual(['fai-data.json'])
    expect(onError).not.toHaveBeenCalled()
  })

  it('collapses saves in quick succession into one write of the latest data', async () => {
    const dataStore = store({ debounceMs: 50 })

    dataStore.save(dataAt(1))
    dataStore.save(dataAt(2))
    dataStore.save(dataAt(3))
    await dataStore.flush()

    expect(writes).toHaveLength(1)
    expect(await readStored()).toEqual(dataAt(3))
  })

  it('writes on its own once the debounce delay passes', async () => {
    const dataStore = store()

    dataStore.save(dataAt(7))
    await vi.waitFor(async () => {
      expect(await readStored()).toEqual(dataAt(7))
    })
  })

  it('serializes writes so the last save always wins', async () => {
    let releaseFirst: () => void = () => undefined
    const firstWriteBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const slowFs: DataStoreFs = {
      ...realFs,
      writeFile: async (path, data, encoding) => {
        if (writes.length === 0) {
          writes.push(data)
          await firstWriteBlocked
          await writeFile(path, data, encoding)
          return
        }
        await realFs.writeFile(path, data, encoding)
      },
    }
    const dataStore = store({ fs: slowFs })

    dataStore.save(dataAt(1))
    const firstFlush = dataStore.flush()
    dataStore.save(dataAt(2))
    const secondFlush = dataStore.flush()
    releaseFirst()
    await Promise.all([firstFlush, secondFlush])

    expect(writes.map((data) => (JSON.parse(data) as FaiData).mascot.position?.x)).toEqual([1, 2])
    expect(await readStored()).toEqual(dataAt(2))
  })

  it('retries when Windows briefly locks the file (EBUSY/EPERM)', async () => {
    const failures = ['EBUSY', 'EPERM']
    const flakyFs: DataStoreFs = {
      ...realFs,
      rename: async (oldPath, newPath) => {
        const code = failures.shift()
        if (code !== undefined) {
          throw fsError(code)
        }
        await rename(oldPath, newPath)
      },
    }
    const sleep = vi.fn(() => Promise.resolve())
    const dataStore = store({ fs: flakyFs, sleep })

    dataStore.save(dataAt(5))
    await dataStore.flush()

    expect(await readStored()).toEqual(dataAt(5))
    expect(sleep).toHaveBeenCalledTimes(2)
    expect(onError).not.toHaveBeenCalled()
  })

  it('reports a persistent failure and keeps the previous file intact', async () => {
    const dataStore = store()
    dataStore.save(dataAt(1))
    await dataStore.flush()
    const lockedFs: DataStoreFs = {
      ...realFs,
      rename: () => Promise.reject(fsError('EBUSY')),
    }
    const lockedStore = store({ fs: lockedFs })

    lockedStore.save(dataAt(2))
    await lockedStore.flush()

    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ code: 'EBUSY' })
    expect(await readStored()).toEqual(dataAt(1))
    expect(await readdir(dir)).toEqual(['fai-data.json'])
  })

  it('does not retry errors that will not go away', async () => {
    const sleep = vi.fn(() => Promise.resolve())
    const dataStore = store({ filePath: join(dir, 'missing-dir', 'fai-data.json'), sleep })

    dataStore.save(createEmptyData())
    await dataStore.flush()

    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ code: 'ENOENT' })
    expect(sleep).not.toHaveBeenCalled()
  })

  it('keeps working after a failure', async () => {
    let failNext = true
    const onceFailingFs: DataStoreFs = {
      ...realFs,
      writeFile: async (path, data, encoding) => {
        if (failNext) {
          failNext = false
          throw fsError('ENOSPC')
        }
        await realFs.writeFile(path, data, encoding)
      },
    }
    const dataStore = store({ fs: onceFailingFs })

    dataStore.save(dataAt(1))
    await dataStore.flush()
    dataStore.save(dataAt(2))
    await dataStore.flush()

    expect(onError).toHaveBeenCalledOnce()
    expect(await readStored()).toEqual(dataAt(2))
  })

  it('flush with nothing pending resolves without writing', async () => {
    await store().flush()

    expect(writes).toEqual([])
    expect(await readdir(dir)).toEqual([])
  })
})
