import { useEffect, useMemo, useRef } from 'react'
import { FRAME_TO_WINDOW_SCALE, MASCOT_WINDOW_SIZE } from '@domain/mascot/dimensions'
import type { LoadedFrame } from './mascot/load-frame'
import { createPointerController } from './mascot/pointer-controller'

interface MascotProps {
  readonly frame: LoadedFrame
  readonly label: string
}

export function Mascot({ frame, label }: MascotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointer = useMemo(
    () =>
      createPointerController({
        mascot: window.fai.mascot,
        mask: frame.mask,
        scale: FRAME_TO_WINDOW_SCALE,
        scheduleFrame: (callback) => {
          requestAnimationFrame(callback)
        },
      }),
    [frame],
  )

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (context === undefined || context === null) {
      return
    }
    const { width, height } = MASCOT_WINDOW_SIZE
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.clearRect(0, 0, width, height)
    context.drawImage(frame.image, 0, 0, width, height)
  }, [frame])

  return (
    <canvas
      ref={canvasRef}
      className="mascot"
      width={MASCOT_WINDOW_SIZE.width}
      height={MASCOT_WINDOW_SIZE.height}
      role="img"
      aria-label={label}
      onPointerMove={(event) => {
        pointer.move({ x: event.clientX, y: event.clientY })
      }}
      onPointerDown={(event) => {
        if (event.button === 0 && pointer.press({ x: event.clientX, y: event.clientY })) {
          event.currentTarget.setPointerCapture(event.pointerId)
        }
      }}
      onPointerUp={() => {
        pointer.release()
      }}
      onPointerCancel={() => {
        pointer.release()
      }}
      onLostPointerCapture={() => {
        pointer.release()
      }}
      onPointerLeave={() => {
        pointer.leave()
      }}
    />
  )
}
