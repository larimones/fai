import type { AnimationSet } from '@domain/mascot/animation'
import type { Rectangle } from '@domain/mascot/geometry'
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
  const frames = await cutFrames(sheet.sheet.frames, decoded.masks, ({ x, y, width, height }) =>
    createImageBitmap(image, x, y, width, height),
  )
  return { frames, animations: sheet.sheet.animations }
}

/**
 * Cuts one image per distinct rectangle: several frames may point at the same drawing with other
 * durations (ADR-0013), and they share its image and mask instead of holding copies.
 */
export async function cutFrames(
  rectangles: readonly Rectangle[],
  masks: readonly AlphaMask[],
  cut: (rectangle: Rectangle) => Promise<CanvasImageSource>,
): Promise<LoadedFrame[]> {
  const byRectangle = new Map<string, Promise<LoadedFrame>>()
  return Promise.all(
    rectangles.map((rectangle, index) => {
      const key = `${String(rectangle.x)},${String(rectangle.y)},${String(rectangle.width)},${String(rectangle.height)}`
      let frame = byRectangle.get(key)
      if (frame === undefined) {
        const mask = masks[index] ?? {
          width: rectangle.width,
          height: rectangle.height,
          alpha: new Uint8ClampedArray(rectangle.width * rectangle.height),
        }
        frame = cut(rectangle).then((image) => ({ image, mask }))
        byRectangle.set(key, frame)
      }
      return frame
    }),
  )
}
