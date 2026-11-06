import type { AnimationSet } from '@domain/mascot/animation'
import { type AlphaMask, HIT_ALPHA_THRESHOLD } from '@domain/mascot/hit-test'
import { decodeSheetMasks } from '@domain/mascot/mask-runs'
import { toSpriteSheet } from '@domain/mascot/sprite-sheet'
import { spriteMasksSchema, spriteSheetMetadataSchema } from '@shared/sprite-sheet-schema'

export interface LoadedFrame {
  readonly image: CanvasImageSource
  /** Opacity of this frame, for the hit-test (RF-05). */
  readonly mask: AlphaMask
}

export interface LoadedSheet {
  readonly frames: readonly LoadedFrame[]
  readonly animations: AnimationSet
}

export interface SheetSources {
  readonly imageUrl: string
  readonly metadata: unknown
  readonly masks: unknown
}

/**
 * Validates the metadata and the click masks, decodes the sheet and cuts it into frames.
 * The masks come ready from the art script, so no pixel is read back from a canvas and the
 * sheet can be a regular file instead of a data URL in the bundle (ADR-0013).
 */
export async function loadSpriteSheet({
  imageUrl,
  metadata,
  masks,
}: SheetSources): Promise<LoadedSheet> {
  const sheet = toSpriteSheet(spriteSheetMetadataSchema.parse(metadata))
  if (!sheet.ok) {
    throw new Error(sheet.error)
  }
  const decoded = decodeSheetMasks(
    spriteMasksSchema.parse(masks),
    sheet.sheet.frames,
    HIT_ALPHA_THRESHOLD,
  )
  if (!decoded.ok) {
    throw new Error(decoded.error)
  }
  const image = new Image()
  image.src = imageUrl
  await image.decode()
  const frames = await Promise.all(
    sheet.sheet.frames.map(async ({ x, y, width, height }, index) => ({
      image: await createImageBitmap(image, x, y, width, height),
      mask: decoded.masks[index] ?? { width, height, alpha: new Uint8ClampedArray(width * height) },
    })),
  )
  return { frames, animations: sheet.sheet.animations }
}
