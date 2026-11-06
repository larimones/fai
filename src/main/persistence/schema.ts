import { z } from 'zod'
import type { FaiData, FaiDataV1, FaiDataV2, ScreenPoint } from '@domain/data/fai-data'
import type { VersionedDocument } from '@domain/data/migrations'
import { type Task, validateTitle } from '@domain/tasks/tasks'

/** First look at a stored file: only the version is checked, the rest waits for migration. */
export const documentEnvelopeSchema = z.looseObject({
  schemaVersion: z.number().int().positive(),
})

const screenPointSchema = z.strictObject({
  x: z.number().int(),
  y: z.number().int(),
}) satisfies z.ZodType<ScreenPoint>

const mascotSchema = z.strictObject({
  position: screenPointSchema.nullable(),
})

export const faiDataV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  mascot: mascotSchema,
}) satisfies z.ZodType<FaiDataV1>

/** An instant as the main process writes it: ISO 8601 in UTC (`Date#toISOString`). */
const instantSchema = z.iso.datetime()

/** Only what the domain could have created: a stored title already passed the title rule. */
const taskSchema = z.strictObject({
  id: z.uuid(),
  title: z.string().refine((title) => {
    const result = validateTitle(title)
    return result.ok && result.title === title
  }, 'Título fora da regra das tarefas.'),
  createdAt: instantSchema,
  completedAt: instantSchema.nullable(),
}) satisfies z.ZodType<Task>

export const faiDataV2Schema = z.strictObject({
  schemaVersion: z.literal(2),
  mascot: mascotSchema,
  tasks: z.array(taskSchema),
}) satisfies z.ZodType<FaiDataV2>

/** Validates a document after migration to `CURRENT_SCHEMA_VERSION`. */
export const faiDataSchema: z.ZodType<FaiData> = faiDataV2Schema

/**
 * Validates a stored document in the version it was written with, before migrating it
 * (ADR-0015): each migration step then starts from a known shape.
 */
export const sourceSchemas: Readonly<Record<number, z.ZodType<VersionedDocument>>> = {
  1: faiDataV1Schema,
  2: faiDataV2Schema,
}
