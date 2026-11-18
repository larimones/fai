import type { ScreenPoint } from '../data/fai-data'
import type { Rectangle, Size } from '../mascot/geometry'

/** Space between Fai and the bubble; the tail is drawn inside the bubble window. */
export const BUBBLE_GAP_PX = 4

/** The tail stays this far from the bubble's corners, which are rounded. */
export const TAIL_MARGIN_PX = 24

export interface BubblePlacement extends ScreenPoint {
  /** Which way the tail points: towards Fai. */
  readonly tail: 'down' | 'left' | 'right'
  /** Where the tail sits along that edge, in pixels from the bubble's left (down) or top (sides). */
  readonly tailAt: number
}

/**
 * Where the chat bubble opens (CA1, ADR-0017): above Fai, centered on her; if it does not fit,
 * beside her, to the left first, like the panel. Always inside the work area; the tail follows Fai
 * when the bubble is pushed sideways. When the work area is smaller than the bubble, its top-left
 * corner wins.
 */
export function placeBubble(mascot: Rectangle, bubble: Size, workArea: Rectangle): BubblePlacement {
  const workRight = workArea.x + workArea.width
  const workBottom = workArea.y + workArea.height
  const centerX = mascot.x + mascot.width / 2
  const centerY = mascot.y + mascot.height / 2
  const above = mascot.y - BUBBLE_GAP_PX - bubble.height

  if (above >= workArea.y) {
    const x = Math.round(clamp(centerX - bubble.width / 2, workArea.x, workRight - bubble.width))
    return { x, y: above, tail: 'down', tailAt: tailPosition(centerX - x, bubble.width) }
  }

  const left = mascot.x - BUBBLE_GAP_PX - bubble.width
  const right = mascot.x + mascot.width + BUBBLE_GAP_PX
  const onLeft = left >= workArea.x || right + bubble.width > workRight
  const x = Math.round(clamp(onLeft ? left : right, workArea.x, workRight - bubble.width))
  const y = Math.round(clamp(centerY - bubble.height / 2, workArea.y, workBottom - bubble.height))
  return {
    x,
    y,
    tail: onLeft ? 'right' : 'left',
    tailAt: tailPosition(centerY - y, bubble.height),
  }
}

function tailPosition(offset: number, length: number): number {
  return Math.round(clamp(offset, TAIL_MARGIN_PX, length - TAIL_MARGIN_PX))
}

/** Like Math.min/max, but the lower bound wins when the range is empty. */
function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(value, high))
}
