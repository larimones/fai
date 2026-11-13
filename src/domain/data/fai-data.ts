import type { Reminder } from '../reminders/reminders'
import type { Task } from '../tasks/tasks'
import type { MigrationTable } from './migrations'

/** A point on the virtual desktop, in DIPs (Electron screen coordinates). */
export interface ScreenPoint {
  readonly x: number
  readonly y: number
}

/** Version 1 of `fai-data.json` (Stages 2 to 4): only the mascot position. */
export interface FaiDataV1 {
  readonly schemaVersion: 1
  readonly mascot: {
    /** Last mascot position; `null` until the mascot is first placed. */
    readonly position: ScreenPoint | null
  }
}

/** Version 2 (Stage 5, ADR-0015): adds the tasks, in the order they were created. */
export interface FaiDataV2 {
  readonly schemaVersion: 2
  readonly mascot: FaiDataV1['mascot']
  readonly tasks: readonly Task[]
}

/** Version 3 (Stage 6, ADR-0016): adds the reminders, in the order they were created. */
export interface FaiDataV3 {
  readonly schemaVersion: 3
  readonly mascot: FaiDataV1['mascot']
  readonly tasks: readonly Task[]
  readonly reminders: readonly Reminder[]
}

export type FaiData = FaiDataV3

export const CURRENT_SCHEMA_VERSION = 3

/** Steps that bring older documents up to `CURRENT_SCHEMA_VERSION`, keyed by the version they start from. */
export const FAI_DATA_MIGRATIONS: MigrationTable = {
  1: (document) => ({ ...document, schemaVersion: 2, tasks: [] }),
  2: (document) => ({ ...document, schemaVersion: 3, reminders: [] }),
}

export function createEmptyData(): FaiData {
  return { schemaVersion: 3, mascot: { position: null }, tasks: [], reminders: [] }
}
