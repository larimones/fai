import { z } from 'zod'
import type { SheetMetadata } from '@domain/mascot/sprite-sheet'

const pixel = z.number().int().nonnegative()
const length = z.number().int().positive()

/**
 * Aseprite "JSON (Array)" metadata (ADR-0013). Only the fields the app uses are kept;
 * the many others Aseprite exports are dropped, not rejected.
 */
export const spriteSheetMetadataSchema = z.object({
  frames: z
    .array(
      z.object({
        frame: z.object({ x: pixel, y: pixel, w: length, h: length }),
        duration: length,
      }),
    )
    .min(1),
  meta: z.object({
    size: z.object({ w: length, h: length }),
    frameTags: z.array(z.object({ name: z.string(), from: pixel, to: pixel })),
  }),
}) satisfies z.ZodType<SheetMetadata>
