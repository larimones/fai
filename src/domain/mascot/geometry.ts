import type { ScreenPoint } from '../data/fai-data'

export interface Size {
  readonly width: number
  readonly height: number
}

/** A rectangle on the virtual desktop, in DIPs, like Electron's `Rectangle`. */
export interface Rectangle extends ScreenPoint, Size {}

/** True when the two rectangles share some area; touching edges do not count. */
export function intersects(a: Rectangle, b: Rectangle): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}
