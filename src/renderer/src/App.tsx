import { useEffect, useState } from 'react'
import { describeAppInfo } from '@domain/app-info'

type AppInfoState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly description: string }
  | { readonly status: 'error' }

export function App() {
  const [info, setInfo] = useState<AppInfoState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    window.fai.app.getInfo().then(
      (result) => {
        if (active) {
          setInfo(
            result.ok
              ? { status: 'ready', description: describeAppInfo(result.value) }
              : { status: 'error' },
          )
        }
      },
      () => {
        if (active) {
          setInfo({ status: 'error' })
        }
      },
    )
    return () => {
      active = false
    }
  }, [])

  return (
    <main className="app">
      <h1 className="app__title">
        Fai <span aria-hidden="true">✨</span>
      </h1>
      <p className="app__subtitle" role="status">
        {info.status === 'loading' && 'Despertando a Fai…'}
        {info.status === 'ready' && info.description}
        {info.status === 'error' && 'Não consegui falar com a Fai agora.'}
      </p>
    </main>
  )
}
