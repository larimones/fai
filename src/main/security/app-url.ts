/**
 * Builds a predicate that accepts only URLs of the app's own renderer:
 * the same file in production, the same origin as the Vite dev server in development.
 */
export function createAppUrlMatcher(rendererEntryUrl: string): (candidate: string) => boolean {
  const entry = new URL(rendererEntryUrl)
  return (candidate) => {
    let url: URL
    try {
      url = new URL(candidate)
    } catch {
      return false
    }
    if (entry.protocol === 'file:') {
      return url.protocol === 'file:' && url.pathname === entry.pathname
    }
    return url.origin === entry.origin
  }
}
