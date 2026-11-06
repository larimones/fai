import type { ScreenPoint } from '../data/fai-data'
import type { Rectangle, Size } from '../mascot/geometry'

/** Space between Fai and the panel. */
export const PANEL_GAP_PX = 8

/**
 * Where the task panel opens (CA3, ADR-0014): to the left of Fai (she lives in the right-hand
 * corner by default), else to her right; bottoms aligned; always inside the work area. When the
 * work area is smaller than the panel, its top-left corner wins.
 */
export function placePanel(mascot: Rectangle, panel: Size, workArea: Rectangle): ScreenPoint {
  const left = mascot.x - PANEL_GAP_PX - panel.width
  const right = mascot.x + mascot.width + PANEL_GAP_PX
  const workRight = workArea.x + workArea.width
  const x = left >= workArea.x ? left : right + panel.width <= workRight ? right : left
  const y = mascot.y + mascot.height - panel.height
  return {
    x: Math.round(clamp(x, workArea.x, workRight - panel.width)),
    y: Math.round(clamp(y, workArea.y, workArea.y + workArea.height - panel.height)),
  }
}

/** Like Math.min/max, but the lower bound wins when the range is empty. */
function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(value, high))
}
