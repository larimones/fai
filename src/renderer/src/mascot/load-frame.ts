import type { AlphaMask } from '@domain/mascot/hit-test'

export interface LoadedFrame {
  readonly image: HTMLImageElement
  readonly mask: AlphaMask
}

/**
 * Decodes a frame and reads its opacity for the hit-test. The URL must be a data URL:
 * reading pixels of an image loaded from file:// would taint the canvas.
 */
export async function loadFrame(url: string): Promise<LoadedFrame> {
  const image = new Image()
  image.src = url
  await image.decode()
  const width = image.naturalWidth
  const height = image.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (context === null) {
    throw new Error('Canvas 2D indisponível.')
  }
  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, width, height).data
  const alpha = new Uint8ClampedArray(width * height)
  for (let index = 0; index < alpha.length; index += 1) {
    alpha[index] = pixels[index * 4 + 3] ?? 0
  }
  return { image, mask: { width, height, alpha } }
}
