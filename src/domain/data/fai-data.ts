import type { MigrationTable } from './migrations'

/** A point on the virtual desktop, in DIPs (Electron screen coordinates). */
export interface ScreenPoint {
  readonly x: number
  readonly y: number
}

/** Version 1 of `fai-data.json`. Tasks and reminders arrive through migrations (Stages 5 and 6). */
export interface FaiDataV1 {
  readonly schemaVersion: 1
  readonly mascot: {
    /** Last mascot position; `null` until the mascot window exists (Stage 3). */
    readonly position: ScreenPoint | null
  }
}

export type FaiData = FaiDataV1

export const CURRENT_SCHEMA_VERSION = 1

/** Steps that bring older documents up to `CURRENT_SCHEMA_VERSION`; none yet. */
export const FAI_DATA_MIGRATIONS: MigrationTable = {}

export function createEmptyData(): FaiData {
  return { schemaVersion: 1, mascot: { position: null } }
}
