/** Any stored document: only its version is known before migrating. */
export interface VersionedDocument {
  readonly schemaVersion: number
}

/** Turns a document of version N into a new document of version N + 1, without mutating it. */
export type Migration = (document: VersionedDocument) => VersionedDocument

/** Migrations keyed by the version they start from. */
export type MigrationTable = Readonly<Partial<Record<number, Migration>>>

export type MigrationErrorCode =
  'INVALID_VERSION' | 'FUTURE_VERSION' | 'NO_MIGRATION_PATH' | 'BROKEN_MIGRATION'

export type MigrationResult =
  | { readonly ok: true; readonly document: VersionedDocument }
  | { readonly ok: false; readonly code: MigrationErrorCode; readonly version: number }

/**
 * Applies the steps `vN → vN+1` in order until `currentVersion` (RNF-07 CA3).
 * Failures come back as values so the caller can quarantine the file instead of crashing.
 */
export function migrateToCurrent(
  document: VersionedDocument,
  migrations: MigrationTable,
  currentVersion: number,
): MigrationResult {
  const { schemaVersion } = document
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
    return { ok: false, code: 'INVALID_VERSION', version: schemaVersion }
  }
  if (schemaVersion > currentVersion) {
    return { ok: false, code: 'FUTURE_VERSION', version: schemaVersion }
  }

  let migrated = document
  while (migrated.schemaVersion < currentVersion) {
    const from = migrated.schemaVersion
    const step = migrations[from]
    if (step === undefined) {
      return { ok: false, code: 'NO_MIGRATION_PATH', version: from }
    }
    migrated = step(migrated)
    if (migrated.schemaVersion !== from + 1) {
      return { ok: false, code: 'BROKEN_MIGRATION', version: from }
    }
  }
  return { ok: true, document: migrated }
}
