import { useEffect, useState } from 'react'
import { describeAppInfo } from '@domain/app-info'
import { Mascot } from './Mascot'
import type { LoadedSheet } from './mascot/load-sprite-sheet'

interface MascotAppProps {
  readonly loadSheet: () => Promise<LoadedSheet>
}

export function MascotApp({ loadSheet }: MascotAppProps) {
  const [sheet, setSheet] = useState<LoadedSheet | null>(null)
  const [label, setLabel] = useState('Fai')

  useEffect(() => {
    let active = true
    loadSheet().then(
      (loaded) => {
        if (active) {
          setSheet(loaded)
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
  }, [loadSheet])

  return sheet === null ? null : <Mascot sheet={sheet} label={label} />
}
