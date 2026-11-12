import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import type { AnimationSet } from '@domain/mascot/animation'
import { FRAME_SIZE } from '@domain/mascot/dimensions'
import type { FaiApi, MascotReaction } from '@shared/ipc/api'
import type { LoadedSheet } from './mascot/load-sprite-sheet'
import { MascotApp } from './MascotApp'

// Shaped like fai-sheet.json: idle 0–7 (160 ms), react 8–10 (240 ms), dragged 11.
const animations: AnimationSet = {
  idle: {
    frames: [0, 1, 2, 3, 4, 5, 6, 7].map((index) => ({ index, durationMs: 160 })),
    loop: true,
  },
  react: { frames: [8, 9, 10].map((index) => ({ index, durationMs: 240 })), loop: false },
  dragged: { frames: [{ index: 11, durationMs: 1000 }], loop: true },
  celebrate: { frames: [9, 10].map((index) => ({ index, durationMs: 80 })), loop: false },
}
// Fully opaque frames: every point of the window is on the drawing.
const images = Array.from({ length: 12 }, () => new Image())
const sheet: LoadedSheet = {
  frames: images.map((image) => ({
    image,
    mask: {
      width: FRAME_SIZE.width,
      height: FRAME_SIZE.height,
      alpha: new Uint8ClampedArray(FRAME_SIZE.width * FRAME_SIZE.height).fill(255),
    },
  })),
  animations,
}

function installFakeApi(getInfo: FaiApi['app']['getInfo']) {
  const reactionListeners: ((reaction: MascotReaction) => void)[] = []
  const mascot = {
    setInteractive: vi.fn(),
    drag: vi.fn(),
    openMenu: vi.fn(),
    onReaction: vi.fn((listener: (reaction: MascotReaction) => void) => {
      reactionListeners.push(listener)
      return () => {
        reactionListeners.splice(reactionListeners.indexOf(listener), 1)
      }
    }),
  }
  vi.stubGlobal('fai', { app: { getInfo }, mascot } satisfies FaiApi)
  const react = (reaction: MascotReaction): void => {
    reactionListeners.forEach((listener) => {
      listener(reaction)
    })
  }
  return Object.assign(mascot, { react, listening: () => reactionListeners.length })
}

const appInfo = () =>
  Promise.resolve({
    ok: true as const,
    value: { name: 'Fai', version: '0.1.0', platform: 'linux' },
  })

describe('MascotApp (RF-04..06, RF-08, RF-09, RF-01 CA3)', () => {
  let setPointerCapture: Mock<(pointerId: number) => void>
  let drawImage: Mock<(image: CanvasImageSource, ...rest: number[]) => void>

  beforeEach(() => {
    vi.useFakeTimers()
    drawImage = vi.fn()
    const context = { drawImage, clearRect: vi.fn() } as unknown as CanvasRenderingContext2D
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
    setPointerCapture = vi.fn()
    HTMLCanvasElement.prototype.setPointerCapture = setPointerCapture
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  async function renderLoaded(load: () => Promise<LoadedSheet> = () => Promise.resolve(sheet)) {
    render(<MascotApp loadSheet={load} />)
    // Lets the sheet and the app info promises settle.
    await act(async () => {
      await Promise.resolve()
    })
  }

  const lastDrawn = (): number => images.indexOf(drawImage.mock.lastCall?.[0] as HTMLImageElement)

  async function advance(ms: number): Promise<void> {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  }

  it('names the mascot with the app info received through the bridge', async () => {
    installFakeApi(appInfo)
    await renderLoaded()

    expect(screen.getByRole('img', { name: 'Fai v0.1.0 · Linux' })).toBeInTheDocument()
  })

  it('keeps a plain name when the bridge fails', async () => {
    installFakeApi(() =>
      Promise.resolve({ ok: false, error: { code: 'INTERNAL', message: 'Algo deu errado.' } }),
    )
    await renderLoaded()

    expect(screen.getByRole('img', { name: 'Fai' })).toBeInTheDocument()
  })

  it('plays idle with the frame durations from the sheet (RF-08)', async () => {
    installFakeApi(appInfo)
    await renderLoaded()

    expect(lastDrawn()).toBe(0)
    await advance(159)
    expect(lastDrawn()).toBe(0)
    await advance(1)
    expect(lastDrawn()).toBe(1)
    await advance(7 * 160)
    expect(lastDrawn()).toBe(0)
  })

  it('reacts to a click and then goes back to idle (RF-09)', async () => {
    const mascot = installFakeApi(appInfo)
    await renderLoaded()
    const canvas = screen.getByRole('img')

    fireEvent.pointerDown(canvas, {
      clientX: 80,
      clientY: 80,
      screenX: 500,
      screenY: 300,
      button: 0,
      pointerId: 1,
    })
    fireEvent.pointerUp(canvas, { pointerId: 1 })

    expect(lastDrawn()).toBe(8)
    await advance(240)
    expect(lastDrawn()).toBe(9)
    await advance(2 * 240)
    expect(lastDrawn()).toBe(0)
    expect(mascot.drag.mock.calls).toEqual([['start'], ['end']])
    expect(setPointerCapture).toHaveBeenCalledWith(1)
  })

  it('shows it is being carried during a drag, then goes back to idle (RF-09)', async () => {
    installFakeApi(appInfo)
    await renderLoaded()
    const canvas = screen.getByRole('img')

    fireEvent.pointerDown(canvas, {
      clientX: 80,
      clientY: 80,
      screenX: 500,
      screenY: 300,
      button: 0,
      pointerId: 1,
    })
    fireEvent.pointerMove(canvas, {
      clientX: 80,
      clientY: 80,
      screenX: 510,
      screenY: 300,
      pointerId: 1,
    })
    expect(lastDrawn()).toBe(11)
    await advance(3000)
    expect(lastDrawn()).toBe(11)

    fireEvent.pointerUp(canvas, { pointerId: 1 })
    expect(lastDrawn()).toBe(0)
  })

  it('wires pointer moves to click-through', async () => {
    const mascot = installFakeApi(appInfo)
    await renderLoaded()

    fireEvent.pointerMove(screen.getByRole('img'), { clientX: 80, clientY: 80 })

    expect(mascot.setInteractive).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('does not start a drag with the right button', async () => {
    const mascot = installFakeApi(appInfo)
    await renderLoaded()

    fireEvent.pointerDown(screen.getByRole('img'), {
      clientX: 80,
      clientY: 80,
      button: 2,
      pointerId: 1,
    })

    expect(mascot.drag).not.toHaveBeenCalled()
  })

  it('sizes the canvas for the display scale so it stays sharp', async () => {
    vi.stubGlobal('devicePixelRatio', 1.5)
    installFakeApi(appInfo)
    await renderLoaded()
    const canvas = screen.getByRole<HTMLCanvasElement>('img')

    expect([canvas.width, canvas.height]).toEqual([282, 240])
  })

  it('pauses while hidden and starts idle over when shown again (RNF-08 CA2)', async () => {
    let hidden = false
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    installFakeApi(appInfo)
    await renderLoaded()
    await advance(3 * 160)
    expect(lastDrawn()).toBe(3)

    hidden = true
    fireEvent(document, new Event('visibilitychange'))
    const drawsWhileHidden = drawImage.mock.calls.length
    setTimeoutSpy.mockClear()
    await advance(5000)

    expect(drawImage.mock.calls.length).toBe(drawsWhileHidden)
    expect(setTimeoutSpy).not.toHaveBeenCalled()

    hidden = false
    fireEvent(document, new Event('visibilitychange'))
    expect(lastDrawn()).toBe(0)
    await advance(160)
    expect(lastDrawn()).toBe(1)
  })

  it('opens the menu on a right click over the drawing (RF-10 CA1)', async () => {
    const mascot = installFakeApi(appInfo)
    await renderLoaded()

    fireEvent.contextMenu(screen.getByRole('img'), { clientX: 80, clientY: 80 })

    expect(mascot.openMenu).toHaveBeenCalledOnce()
  })

  it('celebrates when the main process asks, then goes back to idle (RF-12 CA2)', async () => {
    const mascot = installFakeApi(appInfo)
    await renderLoaded()

    act(() => {
      mascot.react({ kind: 'celebrate' })
    })
    expect(lastDrawn()).toBe(9)
    await advance(80)
    expect(lastDrawn()).toBe(10)
    await advance(80)
    expect(lastDrawn()).toBe(0)
  })

  it('stops listening for reactions when it goes away', async () => {
    const mascot = installFakeApi(appInfo)
    const view = render(<MascotApp loadSheet={() => Promise.resolve(sheet)} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(mascot.listening()).toBe(1)

    view.unmount()

    expect(mascot.listening()).toBe(0)
  })

  it('shows nothing when the drawing cannot be loaded', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    installFakeApi(appInfo)
    await renderLoaded(() => Promise.reject(new Error('decode failed')))

    expect(error).toHaveBeenCalled()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
