import type { Session, WebContents } from 'electron'

/** Blocks navigation away from the app, new windows and <webview> (ADR-0007). */
export function hardenWebContents(contents: WebContents, isAppUrl: (url: string) => boolean): void {
  contents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) {
      event.preventDefault()
    }
  })
  contents.on('will-attach-webview', (event) => {
    event.preventDefault()
  })
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
}

/** Denies every permission request (camera, geolocation, notifications from the page…). */
export function hardenSession(session: Session): void {
  session.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false)
  })
  session.setPermissionCheckHandler(() => false)
}
