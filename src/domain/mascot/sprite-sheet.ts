import type { AnimationName, AnimationSet, SpriteAnimation } from './animation'
import type { Rectangle } from './geometry'

/** The fields of Aseprite's "JSON (Array)" export the app uses, already validated (ADR-0013). */
export interface SheetMetadata {
  readonly frames: readonly {
    readonly frame: {
      readonly x: number
      readonly y: number
      readonly w: number
      readonly h: number
    }
    readonly duration: number
  }[]
  readonly meta: {
    readonly size: { readonly w: number; readonly h: number }
    readonly frameTags: readonly {
      readonly name: string
      readonly from: number
      readonly to: number
    }[]
  }
}

export interface SpriteSheet {
  /** Where each frame sits in the sheet image, in image pixels. */
  readonly frames: readonly Rectangle[]
  readonly animations: AnimationSet
}

export type SpriteSheetResult =
  | { readonly ok: true; readonly sheet: SpriteSheet }
  | { readonly ok: false; readonly error: string }

/** Whether each animation repeats is the app's choice, by name; the art only says which frames. */
const LOOPS: Readonly<Record<AnimationName, boolean>> = { idle: true, react: false, dragged: true }

export function toSpriteSheet(metadata: SheetMetadata): SpriteSheetResult {
  const { frames, meta } = metadata
  const outside = frames.findIndex(
    ({ frame }) => frame.x + frame.w > meta.size.w || frame.y + frame.h > meta.size.h,
  )
  if (outside !== -1) {
    return { ok: false, error: `Quadro ${String(outside)} fora da imagem.` }
  }
  const animations: Partial<Record<AnimationName, SpriteAnimation>> = {}
  for (const name of Object.keys(LOOPS) as AnimationName[]) {
    const tag = meta.frameTags.find((candidate) => candidate.name === name)
    if (tag === undefined) {
      return { ok: false, error: `Animação "${name}" ausente.` }
    }
    if (tag.from > tag.to || tag.to >= frames.length) {
      return { ok: false, error: `Animação "${name}" fora dos quadros.` }
    }
    animations[name] = {
      frames: frames
        .slice(tag.from, tag.to + 1)
        .map(({ duration }, offset) => ({ index: tag.from + offset, durationMs: duration })),
      loop: LOOPS[name],
    }
  }
  const { idle, react, dragged } = animations
  if (idle === undefined || react === undefined || dragged === undefined) {
    return { ok: false, error: 'Animações incompletas.' }
  }
  return {
    ok: true,
    sheet: {
      frames: frames.map(({ frame }) => ({
        x: frame.x,
        y: frame.y,
        width: frame.w,
        height: frame.h,
      })),
      animations: { idle, react, dragged },
    },
  }
}
