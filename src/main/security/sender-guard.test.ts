import type { IpcMainInvokeEvent } from 'electron'
import { describe, expect, it } from 'vitest'
import { createAppUrlMatcher } from './app-url'
import { createSenderGuard } from './sender-guard'

const APP_URL = 'file:///opt/Fai/resources/app.asar/out/renderer/index.html'

function fakeEvent(options: {
  url: string
  isMainFrame?: boolean
  frameGone?: boolean
}): IpcMainInvokeEvent {
  const mainFrame = { url: options.url }
  const senderFrame =
    options.frameGone === true
      ? null
      : options.isMainFrame === false
        ? { url: options.url }
        : mainFrame
  return { sender: { mainFrame }, senderFrame } as unknown as IpcMainInvokeEvent
}

describe('createAppUrlMatcher', () => {
  it('accepts only the renderer file in production', () => {
    const isAppUrl = createAppUrlMatcher(APP_URL)

    expect(isAppUrl(APP_URL)).toBe(true)
    expect(isAppUrl(`${APP_URL}#/painel`)).toBe(true)
    expect(isAppUrl('file:///home/user/evil.html')).toBe(false)
    expect(isAppUrl('https://example.com')).toBe(false)
    expect(isAppUrl('not a url')).toBe(false)
  })

  it('accepts only the dev server origin in development', () => {
    const isAppUrl = createAppUrlMatcher('http://localhost:5173')

    expect(isAppUrl('http://localhost:5173/index.html')).toBe(true)
    expect(isAppUrl('http://localhost:5174/')).toBe(false)
    expect(isAppUrl('https://localhost:5173/')).toBe(false)
  })
})

describe('createSenderGuard (RNF-03 CA3)', () => {
  const guard = createSenderGuard(createAppUrlMatcher(APP_URL), () => true)

  it('trusts the main frame of a known window showing the app', () => {
    expect(guard(fakeEvent({ url: APP_URL }))).toBe(true)
  })

  it('rejects other origins, subframes and destroyed frames', () => {
    expect(guard(fakeEvent({ url: 'https://example.com' }))).toBe(false)
    expect(guard(fakeEvent({ url: APP_URL, isMainFrame: false }))).toBe(false)
    expect(guard(fakeEvent({ url: APP_URL, frameGone: true }))).toBe(false)
  })

  it('rejects senders that do not belong to a known window', () => {
    const strictGuard = createSenderGuard(createAppUrlMatcher(APP_URL), () => false)

    expect(strictGuard(fakeEvent({ url: APP_URL }))).toBe(false)
  })
})
