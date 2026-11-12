import { useEffect, useRef, useState } from 'react'
import { currentFrame, handleAnimationEvent, startAnimation } from '@domain/mascot/animation'
import { FRAME_TO_WINDOW_SCALE, MASCOT_WINDOW_SIZE } from '@domain/mascot/dimensions'
import type { AlphaMask } from '@domain/mascot/hit-test'
import type { LoadedSheet } from './mascot/load-sprite-sheet'
import { createPointerController, type PointerController } from './mascot/pointer-controller'

interface MascotProps {
  readonly sheet: LoadedSheet
  readonly label: string
}

const EMPTY_MASK: AlphaMask = { width: 0, height: 0, alpha: [] }

/** Follows the display scale, so the canvas has one pixel per physical pixel (ADR-0011). */
function useDevicePixelRatio(): number {
  const [ratio, setRatio] = useState(() => window.devicePixelRatio)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }
    const query = window.matchMedia(`(resolution: ${String(ratio)}dppx)`)
    const update = (): void => {
      setRatio(window.devicePixelRatio)
    }
    query.addEventListener('change', update)
    return () => {
      query.removeEventListener('change', update)
    }
  }, [ratio])
  return ratio
}

export function Mascot({ sheet, label }: MascotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ratio = useDevicePixelRatio()
  // Created by the animation loop below; event handlers only read it.
  const pointerRef = useRef<PointerController | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    let animation = startAnimation(Date.now())
    let frameIndex = -1
    let timer: ReturnType<typeof setTimeout> | undefined

    // Draws only when the frame changes and sleeps until the next change: about 6 draws a
    // second in idle instead of 60 (RNF-08).
    const tick = (): void => {
      clearTimeout(timer)
      // Hidden from the tray: no drawing and nothing scheduled until it shows again (RNF-08 CA2).
      if (document.hidden) {
        return
      }
      const frame = currentFrame(animation, sheet.animations, Date.now())
      animation = frame.state
      if (frame.index !== frameIndex) {
        frameIndex = frame.index
        pointer.refresh()
      }
      const image = sheet.frames[frame.index]?.image
      if (canvas !== null && context !== undefined && context !== null && image !== undefined) {
        const { width, height } = canvas
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'
        context.clearRect(0, 0, width, height)
        context.drawImage(image, 0, 0, width, height)
      }
      if (frame.msUntilNext !== null) {
        timer = setTimeout(tick, frame.msUntilNext)
      }
    }

    const pointer = createPointerController({
      mascot: window.fai.mascot,
      getMask: () => sheet.frames[frameIndex]?.mask ?? EMPTY_MASK,
      scale: FRAME_TO_WINDOW_SCALE,
      scheduleFrame: (callback) => {
        requestAnimationFrame(callback)
      },
      onGesture: (gesture) => {
        animation = handleAnimationEvent(animation, gesture, Date.now())
        tick()
      },
    })
    const onVisibilityChange = (): void => {
      if (!document.hidden) {
        animation = startAnimation(Date.now())
      }
      tick()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    // A completed task makes Fai celebrate (RF-12 CA2).
    // `celebrate` is the only reaction so far.
    const stopReactions = window.fai.mascot.onReaction(() => {
      animation = handleAnimationEvent(animation, 'celebrate', Date.now())
      tick()
    })
    pointerRef.current = pointer
    tick()
    return () => {
      stopReactions()
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      pointerRef.current = null
    }
  }, [sheet, ratio])

  return (
    <canvas
      ref={canvasRef}
      className="mascot"
      width={Math.round(MASCOT_WINDOW_SIZE.width * ratio)}
      height={Math.round(MASCOT_WINDOW_SIZE.height * ratio)}
      role="img"
      aria-label={label}
      onPointerMove={(event) => {
        pointerRef.current?.move(
          { x: event.clientX, y: event.clientY },
          { x: event.screenX, y: event.screenY },
        )
      }}
      onPointerDown={(event) => {
        if (
          event.button === 0 &&
          pointerRef.current?.press(
            { x: event.clientX, y: event.clientY },
            { x: event.screenX, y: event.screenY },
          )
        ) {
          event.currentTarget.setPointerCapture(event.pointerId)
        }
      }}
      onPointerUp={() => {
        pointerRef.current?.release()
      }}
      onPointerCancel={() => {
        pointerRef.current?.release()
      }}
      onLostPointerCapture={() => {
        pointerRef.current?.release()
      }}
      onPointerLeave={() => {
        pointerRef.current?.leave()
      }}
      onContextMenu={(event) => {
        // No browser menu; Fai's own menu only opens over the drawing (on Linux the whole
        // window receives clicks).
        event.preventDefault()
        if (pointerRef.current?.wantsMenu({ x: event.clientX, y: event.clientY }) === true) {
          window.fai.mascot.openMenu()
        }
      }}
    />
  )
}
