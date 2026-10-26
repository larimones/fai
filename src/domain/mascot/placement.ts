import type { ScreenPoint } from '../data/fai-data'
import { intersects, type Rectangle, type Size } from './geometry'

/** What placement needs to know about a monitor; built from Electron's `Display`. */
export interface DisplayArea {
  /** The part of the monitor not taken by the taskbar or docks. */
  readonly workArea: Rectangle
  readonly isPrimary: boolean
}

/** Gap between the mascot and the edges of the work area when it goes to the corner. */
export const SCREEN_MARGIN_PX = 16

/**
 * Keeps the saved position while any part of the mascot would be on a monitor;
 * otherwise (first run, or that monitor is gone) uses the primary monitor's
 * bottom-right corner (RF-07 CA2).
 */
export function resolveMascotPosition(
  saved: ScreenPoint | null,
  displays: readonly DisplayArea[],
  size: Size,
): ScreenPoint {
  if (
    saved !== null &&
    displays.some(({ workArea }) => intersects({ ...saved, ...size }, workArea))
  ) {
    return saved
  }
  const primary = displays.find((display) => display.isPrimary) ?? displays[0]
  if (primary === undefined) {
    return saved ?? { x: 0, y: 0 }
  }
  const { workArea } = primary
  return {
    x: workArea.x + workArea.width - size.width - SCREEN_MARGIN_PX,
    y: workArea.y + workArea.height - size.height - SCREEN_MARGIN_PX,
  }
}
