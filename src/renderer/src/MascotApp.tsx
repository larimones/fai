import { useEffect, useState } from 'react'
import { describeAppInfo } from '@domain/app-info'
import { Mascot } from './Mascot'
import type { LoadedFrame } from './mascot/load-frame'

interface MascotAppProps {
  readonly loadFrame: () => Promise<LoadedFrame>
}

export function MascotApp({ loadFrame }: MascotAppProps) {
  const [frame, setFrame] = useState<LoadedFrame | null>(null)
  const [label, setLabel] = useState('Fai')

  useEffect(() => {
    let active = true
    loadFrame().then(
      (loaded) => {
        if (active) {
          setFrame(loaded)
        }
      },
      (error: unknown) => {
        console.error('Fai: não consegui carregar o desenho.', error)
      },
    )
    window.fai.app.getInfo().then(
      (result) => {
        if (active && result.ok) {
          setLabel(describeAppInfo(result.value))
        }
      },
      () => undefined,
    )
    return () => {
      active = false
    }
  }, [loadFrame])

  return frame === null ? null : <Mascot frame={frame} label={label} />
}
