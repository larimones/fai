/**
 * Content Security Policy for every app window (ADR-0007).
 *
 * Windows load from file:// in production, where response headers do not exist,
 * so the policy is delivered through a <meta> tag filled in at build time.
 */
export const CSP_PLACEHOLDER = '%FAI_CSP%'

export const PRODUCTION_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

/**
 * Development only: React Refresh injects an inline preamble script, Vite injects
 * CSS as inline <style> tags and HMR talks over a local WebSocket.
 */
export const DEVELOPMENT_CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' ws://localhost:*",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')
