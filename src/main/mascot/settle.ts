/**
 * Delays `run` until triggers stop for `delayMs`. Monitor changes arrive in bursts that pass
 * through intermediate layouts (seen on GNOME); acting on one of them misplaces the mascot.
 */
export function runWhenSettled(run: () => void, delayMs: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  return () => {
    clearTimeout(timer)
    timer = setTimeout(run, delayMs)
  }
}
