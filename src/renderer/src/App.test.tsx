import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FaiApi } from '@shared/ipc/api'
import { App } from './App'

function installFakeApi(getInfo: FaiApi['app']['getInfo']): void {
  vi.stubGlobal('fai', {
    app: { getInfo },
    mascot: { setInteractive: vi.fn(), drag: vi.fn() },
  } satisfies FaiApi)
}

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the app info received through the bridge', async () => {
    installFakeApi(() =>
      Promise.resolve({ ok: true, value: { name: 'Fai', version: '0.1.0', platform: 'linux' } }),
    )
    render(<App />)

    expect(screen.getByRole('heading', { name: /fai/i })).toBeInTheDocument()
    expect(await screen.findByText('Fai v0.1.0 · Linux')).toBeInTheDocument()
  })

  it('shows a gentle message when the bridge returns an error', async () => {
    installFakeApi(() =>
      Promise.resolve({ ok: false, error: { code: 'INTERNAL', message: 'Algo deu errado.' } }),
    )
    render(<App />)

    expect(await screen.findByText('Não consegui falar com a Fai agora.')).toBeInTheDocument()
  })

  it('shows a gentle message when the bridge call rejects', async () => {
    installFakeApi(() => Promise.reject(new Error('boom')))
    render(<App />)

    expect(await screen.findByText('Não consegui falar com a Fai agora.')).toBeInTheDocument()
  })
})
