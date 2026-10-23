import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join, parse } from 'node:path'
import type { z } from 'zod'
import {
  CURRENT_SCHEMA_VERSION,
  createEmptyData,
  FAI_DATA_MIGRATIONS,
  type FaiData,
} from '@domain/data/fai-data'
import {
  migrateToCurrent,
  type MigrationErrorCode,
  type MigrationTable,
} from '@domain/data/migrations'
import { documentEnvelopeSchema, faiDataSchema } from './schema'

/** The file operations the store needs; tests swap them to simulate Windows file locks. */
export interface DataStoreFs {
  readFile(path: string, encoding: 'utf8'): Promise<string>
  writeFile(path: string, data: string, encoding: 'utf8'): Promise<void>
  rename(oldPath: string, newPath: string): Promise<void>
  rm(path: string, options: { force: true }): Promise<void>
}

/** How stored documents are migrated and validated; tests swap it for a fake newer format. */
export interface DocumentFormat {
  readonly currentVersion: number
  readonly migrations: MigrationTable
  readonly schema: z.ZodType<FaiData>
}

export interface DataStoreOptions {
  readonly filePath: string
  /** Called when a write still fails after every retry. The previous file stays untouched. */
  readonly onError: (error: unknown) => void
  /** Clock for the quarantine file name. */
  readonly now?: () => Date
  readonly fs?: DataStoreFs
  readonly format?: DocumentFormat
  readonly debounceMs?: number
  readonly retryDelaysMs?: readonly number[]
  readonly sleep?: (ms: number) => Promise<void>
}

export type LoadFailure = 'UNREADABLE' | 'INVALID_JSON' | 'INVALID_DOCUMENT' | MigrationErrorCode

export type LoadResult =
  | { readonly status: 'created' | 'loaded' | 'migrated'; readonly data: FaiData }
  | {
      readonly status: 'quarantined'
      readonly data: FaiData
      readonly reason: LoadFailure
      /** Where the rejected file was moved, so the user can recover it. */
      readonly quarantinedPath: string
    }
  | {
      /** The file exists but could be neither read nor moved aside: saving is disabled to protect it. */
      readonly status: 'unavailable'
      readonly data: FaiData
      readonly reason: LoadFailure
      readonly error: unknown
    }

export interface DataStore {
  /** Reads the document, migrating it or quarantining it as needed. Never rejects (RNF-07 CA2). */
  load(): Promise<LoadResult>
  /** Schedules a write of `data`; saves in quick succession collapse into one write. */
  save(data: FaiData): void
  /** Writes anything still pending right away and resolves once every write has finished. */
  flush(): Promise<void>
}

const DEFAULT_DEBOUNCE_MS = 200
// Antivirus and indexers on Windows briefly lock freshly written files.
const DEFAULT_RETRY_DELAYS_MS = [50, 100, 200, 400]
const RETRYABLE_CODES = new Set(['EPERM', 'EBUSY', 'EACCES'])

const nodeFs: DataStoreFs = { readFile, writeFile, rename, rm }

const faiDataFormat: DocumentFormat = {
  currentVersion: CURRENT_SCHEMA_VERSION,
  migrations: FAI_DATA_MIGRATIONS,
  schema: faiDataSchema,
}

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && 'code' in error ? String(error.code) : undefined
}

function isRetryable(error: unknown): boolean {
  return RETRYABLE_CODES.has(errorCode(error) ?? '')
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** `2026-10-22T19:45:53.123Z` → `20261022T194553Z`: sortable and valid in Windows file names. */
export function quarantineTimestamp(date: Date): string {
  return date
    .toISOString()
    .replace(/\.\d+Z$/, 'Z')
    .replace(/[-:]/g, '')
}

type ParseOutcome =
  | { readonly ok: true; readonly data: FaiData; readonly migrated: boolean }
  | { readonly ok: false; readonly reason: LoadFailure }

function parseDocument(text: string, format: DocumentFormat): ParseOutcome {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'INVALID_JSON' }
  }
  const envelope = documentEnvelopeSchema.safeParse(json)
  if (!envelope.success) {
    return { ok: false, reason: 'INVALID_DOCUMENT' }
  }
  const migration = migrateToCurrent(envelope.data, format.migrations, format.currentVersion)
  if (!migration.ok) {
    return { ok: false, reason: migration.code }
  }
  const document = format.schema.safeParse(migration.document)
  if (!document.success) {
    return { ok: false, reason: 'INVALID_DOCUMENT' }
  }
  return {
    ok: true,
    data: document.data,
    migrated: envelope.data.schemaVersion !== format.currentVersion,
  }
}

/** JSON document store with atomic, serialized writes and safe loading (ADR-0003, RNF-07). */
export function createDataStore(options: DataStoreOptions): DataStore {
  const {
    filePath,
    onError,
    now = () => new Date(),
    fs = nodeFs,
    format = faiDataFormat,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
    sleep = delay,
  } = options
  const tempPath = `${filePath}.tmp`
  let pending: FaiData | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let queue: Promise<void> = Promise.resolve()
  let writable = true

  async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (const waitMs of retryDelaysMs) {
      try {
        return await operation()
      } catch (error) {
        if (!isRetryable(error)) {
          throw error
        }
        await sleep(waitMs)
      }
    }
    return operation()
  }

  async function quarantine(reason: LoadFailure): Promise<LoadResult> {
    const { dir, name } = parse(filePath)
    const quarantinedPath = join(dir, `${name}.corrupt-${quarantineTimestamp(now())}.json`)
    try {
      await withRetry(() => fs.rename(filePath, quarantinedPath))
      return { status: 'quarantined', data: createEmptyData(), reason, quarantinedPath }
    } catch (error) {
      writable = false
      return { status: 'unavailable', data: createEmptyData(), reason, error }
    }
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
    async load() {
      let text: string
      try {
        text = await withRetry(() => fs.readFile(filePath, 'utf8'))
      } catch (error) {
        if (errorCode(error) === 'ENOENT') {
          return { status: 'created', data: createEmptyData() }
        }
        return quarantine('UNREADABLE')
      }
      const outcome = parseDocument(text, format)
      if (!outcome.ok) {
        return quarantine(outcome.reason)
      }
      return { status: outcome.migrated ? 'migrated' : 'loaded', data: outcome.data }
    },
    save(data) {
      if (!writable) {
        return
      }
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
