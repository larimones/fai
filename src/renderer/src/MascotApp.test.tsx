import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { FRAME_SIZE_PX } from '@domain/mascot/dimensions'
import type { FaiApi } from '@shared/ipc/api'
import type { LoadedFrame } from './mascot/load-frame'
import { MascotApp } from './MascotApp'

// A fully opaque frame: every point of the window is on the drawing.
const frame: LoadedFrame = {
  image: new Image(),
  mask: {
    width: FRAME_SIZE_PX,
    height: FRAME_SIZE_PX,
    alpha: new Uint8ClampedArray(FRAME_SIZE_PX * FRAME_SIZE_PX).fill(255),
  },
}

function installFakeApi(getInfo: FaiApi['app']['getInfo']) {
  const mascot = { setInteractive: vi.fn(), drag: vi.fn() }
  vi.stubGlobal('fai', { app: { getInfo }, mascot } satisfies FaiApi)
  return mascot
}

const appInfo = () =>
  Promise.resolve({
    ok: true as const,
    value: { name: 'Fai', version: '0.1.0', platform: 'linux' },
  })

describe('MascotApp (RF-04..06, RF-01 CA3)', () => {
  let setPointerCapture: Mock<(pointerId: number) => void>

  beforeEach(() => {
    // jsdom has no canvas drawing; the hit-test reads the injected mask instead.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    setPointerCapture = vi.fn()
    HTMLCanvasElement.prototype.setPointerCapture = setPointerCapture
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('names the mascot with the app info received through the bridge', async () => {
    installFakeApi(appInfo)
    render(<MascotApp loadFrame={() => Promise.resolve(frame)} />)

    expect(await screen.findByRole('img', { name: 'Fai v0.1.0 · Linux' })).toBeInTheDocument()
  })

  it('keeps a plain name when the bridge fails', async () => {
    installFakeApi(() =>
      Promise.resolve({ ok: false, error: { code: 'INTERNAL', message: 'Algo deu errado.' } }),
    )
    render(<MascotApp loadFrame={() => Promise.resolve(frame)} />)

    expect(await screen.findByRole('img', { name: 'Fai' })).toBeInTheDocument()
  })

  it('wires pointer events to click-through and drag messages', async () => {
    const mascot = installFakeApi(appInfo)
    render(<MascotApp loadFrame={() => Promise.resolve(frame)} />)
    const canvas = await screen.findByRole('img')

    fireEvent.pointerMove(canvas, { clientX: 80, clientY: 80 })
    fireEvent.pointerDown(canvas, { clientX: 80, clientY: 80, button: 0, pointerId: 1 })
    fireEvent.pointerUp(canvas, { clientX: 80, clientY: 80, pointerId: 1 })

    expect(mascot.setInteractive).toHaveBeenCalledExactlyOnceWith(true)
    expect(setPointerCapture).toHaveBeenCalledWith(1)
    expect(mascot.drag.mock.calls).toEqual([['start'], ['end']])
  })

  it('does not start a drag with the right button', async () => {
    const mascot = installFakeApi(appInfo)
    render(<MascotApp loadFrame={() => Promise.resolve(frame)} />)
    const canvas = await screen.findByRole('img')

    fireEvent.pointerDown(canvas, { clientX: 80, clientY: 80, button: 2, pointerId: 1 })

    expect(mascot.drag).not.toHaveBeenCalled()
  })

  it('shows nothing when the drawing cannot be loaded', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    installFakeApi(appInfo)
    render(<MascotApp loadFrame={() => Promise.reject(new Error('decode failed'))} />)

    await vi.waitFor(() => {
      expect(error).toHaveBeenCalled()
    })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
