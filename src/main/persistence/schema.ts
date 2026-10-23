import { z } from 'zod'
import type { FaiData, FaiDataV1, ScreenPoint } from '@domain/data/fai-data'

/** First look at a stored file: only the version is checked, the rest waits for migration. */
export const documentEnvelopeSchema = z.looseObject({
  schemaVersion: z.number().int().positive(),
})

const screenPointSchema = z.strictObject({
  x: z.number().int(),
  y: z.number().int(),
}) satisfies z.ZodType<ScreenPoint>

export const faiDataV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  mascot: z.strictObject({
    position: screenPointSchema.nullable(),
  }),
}) satisfies z.ZodType<FaiDataV1>

/** Validates a document after migration to `CURRENT_SCHEMA_VERSION`. */
export const faiDataSchema: z.ZodType<FaiData> = faiDataV1Schema
