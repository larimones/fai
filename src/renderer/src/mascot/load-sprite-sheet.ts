import type { AnimationSet } from '@domain/mascot/animation'
import type { AlphaMask } from '@domain/mascot/hit-test'
import { toSpriteSheet } from '@domain/mascot/sprite-sheet'
import { spriteSheetMetadataSchema } from '@shared/sprite-sheet-schema'

export interface LoadedFrame {
  readonly image: CanvasImageSource
  /** Opacity of this frame, for the hit-test (RF-05). */
  readonly mask: AlphaMask
}

export interface LoadedSheet {
  readonly frames: readonly LoadedFrame[]
  readonly animations: AnimationSet
}

/**
 * Validates the metadata, decodes the sheet and cuts it into frames with their masks.
 * The image URL must be a data URL: reading pixels of an image loaded from file://
 * would taint the canvas (ADR-0013).
 */
export async function loadSpriteSheet(imageUrl: string, metadata: unknown): Promise<LoadedSheet> {
  const result = toSpriteSheet(spriteSheetMetadataSchema.parse(metadata))
  if (!result.ok) {
    throw new Error(result.error)
  }
  const image = new Image()
  image.src = imageUrl
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (context === null) {
    throw new Error('Canvas 2D indisponível.')
  }
  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  const frames = await Promise.all(
    result.sheet.frames.map(async ({ x, y, width, height }) => {
      const alpha = new Uint8ClampedArray(width * height)
      for (let row = 0; row < height; row += 1) {
        for (let column = 0; column < width; column += 1) {
          alpha[row * width + column] = pixels[((y + row) * canvas.width + x + column) * 4 + 3] ?? 0
        }
      }
      return {
        image: await createImageBitmap(image, x, y, width, height),
        mask: { width, height, alpha },
      }
    }),
  )
  return { frames, animations: result.sheet.animations }
}
