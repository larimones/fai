import { rename, rm, writeFile } from 'node:fs/promises'
import type { FaiData } from '@domain/data/fai-data'

/** The file operations the store needs; tests swap them to simulate Windows file locks. */
export interface DataStoreFs {
  writeFile(path: string, data: string, encoding: 'utf8'): Promise<void>
  rename(oldPath: string, newPath: string): Promise<void>
  rm(path: string, options: { force: true }): Promise<void>
}

export interface DataStoreOptions {
  readonly filePath: string
  /** Called when a write still fails after every retry. The previous file stays untouched. */
  readonly onError: (error: unknown) => void
  readonly fs?: DataStoreFs
  readonly debounceMs?: number
  readonly retryDelaysMs?: readonly number[]
  readonly sleep?: (ms: number) => Promise<void>
}

export interface DataStore {
  /** Schedules a write of `data`; saves in quick succession collapse into one write. */
  save(data: FaiData): void
  /** Writes anything still pending right away and resolves once every write has finished. */
  flush(): Promise<void>
}

const DEFAULT_DEBOUNCE_MS = 200
// Antivirus and indexers on Windows briefly lock freshly written files.
const DEFAULT_RETRY_DELAYS_MS = [50, 100, 200, 400]
const RETRYABLE_CODES = new Set(['EPERM', 'EBUSY', 'EACCES'])

const nodeFs: DataStoreFs = { writeFile, rename, rm }

function isRetryable(error: unknown): boolean {
  return error instanceof Error && 'code' in error && RETRYABLE_CODES.has(String(error.code))
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** JSON document store with atomic, serialized writes (ADR-0003, RNF-07 CA1). */
export function createDataStore(options: DataStoreOptions): DataStore {
  const {
    filePath,
    onError,
    fs = nodeFs,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
    sleep = delay,
  } = options
  const tempPath = `${filePath}.tmp`
  let pending: FaiData | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let queue: Promise<void> = Promise.resolve()

  async function withRetry(operation: () => Promise<void>): Promise<void> {
    for (const waitMs of retryDelaysMs) {
      try {
        await operation()
        return
      } catch (error) {
        if (!isRetryable(error)) {
          throw error
        }
        await sleep(waitMs)
      }
    }
    await operation()
  }

  async function write(data: FaiData): Promise<void> {
    try {
      await withRetry(() => fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8'))
      await withRetry(() => fs.rename(tempPath, filePath))
    } catch (error) {
      await fs.rm(tempPath, { force: true }).catch(() => undefined)
      onError(error)
    }
  }

  function enqueuePending(): void {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    if (pending === undefined) {
      return
    }
    const data = pending
    pending = undefined
    queue = queue.then(() => write(data))
  }

  return {
    save(data) {
      pending = data
      if (timer !== undefined) {
        clearTimeout(timer)
      }
      timer = setTimeout(enqueuePending, debounceMs)
    },
    flush() {
      enqueuePending()
      return queue
    },
  }
}
