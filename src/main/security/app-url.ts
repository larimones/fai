/**
 * Builds a predicate that accepts only URLs of the app's own renderer pages (the mascot and the
 * panel, ADR-0014): the same files in production, the same origin as the Vite dev server in
 * development.
 */
export function createAppUrlMatcher(
  rendererEntryUrls: readonly string[],
): (candidate: string) => boolean {
  const entries = rendererEntryUrls.map((entry) => new URL(entry))
  return (candidate) => {
    let url: URL
    try {
      url = new URL(candidate)
    } catch {
      return false
    }
    return entries.some((entry) =>
      entry.protocol === 'file:'
        ? url.protocol === 'file:' && url.pathname === entry.pathname
        : url.origin === entry.origin,
    )
  }
}
