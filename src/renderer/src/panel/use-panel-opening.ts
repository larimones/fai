import { type RefObject, useEffect, useRef } from 'react'
import type { IpcResult, PanelTab } from '@shared/ipc/api'

/**
 * Runs `reset` each time the panel is opened, and focuses `field` when the panel opens on `tab`
 * (right away if the tab is showing, or as soon as it shows). Switching tabs by hand never moves
 * the focus, so the arrow keys keep working on the tab list.
 */
export function usePanelOpening(
  tab: PanelTab,
  active: boolean,
  field: RefObject<HTMLInputElement | null>,
  reset: () => void,
): void {
  // The tab showing when the panel first loads gets the focus, like on every opening.
  const focusRequested = useRef(active)
  const activeRef = useRef(active)
  const resetRef = useRef(reset)

  useEffect(() => {
    resetRef.current = reset
    activeRef.current = active
  })

  useEffect(() => {
    if (active && focusRequested.current) {
      focusRequested.current = false
      field.current?.focus()
    }
  }, [active, field])

  useEffect(
    () =>
      window.faiPanel.onOpened((opened) => {
        resetRef.current()
        const showingNow = opened === tab && activeRef.current
        focusRequested.current = opened === tab && !showingNow
        if (showingNow) {
          field.current?.focus()
        }
      }),
    [tab, field],
  )
}

/** Sends a change to the main process; on refusal shows its message. Then resyncs the list. */
export async function applyChange(
  change: Promise<IpcResult<unknown>>,
  showError: (message: string) => void,
  reload: () => Promise<void>,
): Promise<boolean> {
  const result = await change
  if (!result.ok) {
    showError(result.error.message)
  }
  await reload()
  return result.ok
}
