import type { ScreenPoint } from '../data/fai-data'

/** Below this cursor travel a press is a click, not a drag (RF-06 CA2). */
export const DRAG_THRESHOLD_PX = 4

export interface DragState {
  readonly startCursor: ScreenPoint
  readonly startWindow: ScreenPoint
  /** Becomes true once the cursor travels the threshold, and stays true. */
  readonly moved: boolean
}

export interface DragStep {
  readonly state: DragState
  /** Where the window goes now, or `null` while the press is still a click. */
  readonly position: ScreenPoint | null
}

export function startDrag(cursor: ScreenPoint, windowPosition: ScreenPoint): DragState {
  return { startCursor: cursor, startWindow: windowPosition, moved: false }
}

/** Keeps the window at the same offset from the cursor as when the press began, so it never jumps. */
export function dragTo(state: DragState, cursor: ScreenPoint): DragStep {
  const dx = cursor.x - state.startCursor.x
  const dy = cursor.y - state.startCursor.y
  const moved = state.moved || Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX
  if (!moved) {
    return { state, position: null }
  }
  return {
    state: state.moved ? state : { ...state, moved: true },
    position: {
      x: Math.round(state.startWindow.x + dx),
      y: Math.round(state.startWindow.y + dy),
    },
  }
}

export function endDrag(state: DragState): 'click' | 'drag' {
  return state.moved ? 'drag' : 'click'
}
