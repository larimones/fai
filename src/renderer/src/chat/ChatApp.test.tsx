import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatApi, ChatOpened, ChatPlaced, ChatReplyError, IpcResult } from '@shared/ipc/api'
import { ChatApp } from './ChatApp'

const ok: IpcResult<null> = { ok: true, value: null }

/** A fake main process for the bubble: the test plays its events. */
function installFakeChat() {
  const opened = new Set<(opened: ChatOpened) => void>()
  const placed = new Set<(placed: ChatPlaced) => void>()
  const deltas = new Set<(text: string) => void>()
  const ends = new Set<() => void>()
  const errors = new Set<(failure: ChatReplyError) => void>()
  const subscribe =
    <T,>(set: Set<T>) =>
    (listener: T) => {
      set.add(listener)
      return () => {
        set.delete(listener)
      }
    }
  const api = {
    send: vi.fn<ChatApi['send']>(() => Promise.resolve(ok)),
    saveKey: vi.fn<ChatApi['saveKey']>(() => Promise.resolve(ok)),
    onOpened: subscribe(opened),
    onPlaced: subscribe(placed),
    onReplyDelta: subscribe(deltas),
    onReplyEnd: subscribe(ends),
    onReplyError: subscribe(errors),
  } satisfies ChatApi
  vi.stubGlobal('faiChat', api)
  const run = async (play: () => void) => {
    await act(async () => {
      play()
      await Promise.resolve()
    })
  }
  return {
    api,
    open: (event: Partial<ChatOpened> = {}) =>
      run(() => {
        opened.forEach((listener) => {
          listener({ mode: 'chat', hasKey: true, keyPersists: true, ...event })
        })
      }),
    place: (event: ChatPlaced) =>
      run(() => {
        placed.forEach((listener) => {
          listener(event)
        })
      }),
    delta: (text: string) =>
      run(() => {
        deltas.forEach((listener) => {
          listener(text)
        })
      }),
    end: () =>
      run(() => {
        ends.forEach((listener) => {
          listener()
        })
      }),
    fail: (failure: ChatReplyError) =>
      run(() => {
        errors.forEach((listener) => {
          listener(failure)
        })
      }),
    listening: () => opened.size + placed.size + deltas.size + ends.size + errors.size,
  }
}

const messageField = () => screen.getByRole('textbox', { name: 'Mensagem para a Fai' })
const conversation = () => screen.getByRole('list', { name: 'Conversa' })
const lines = () =>
  within(conversation())
    .queryAllByRole('listitem')
    .map((item) => item.textContent)

async function type(text: string) {
  fireEvent.change(messageField(), { target: { value: text } })
  await act(async () => {
    fireEvent.submit(messageField())
    await Promise.resolve()
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('chat bubble: the key (RF-19 CA1, CA7)', () => {
  it('asks for the key when it opens without one, with the field focused', async () => {
    const chat = installFakeChat()
    render(<ChatApp />)

    await chat.open({ mode: 'key', hasKey: false })

    const field = screen.getByLabelText('Chave do serviço de IA')
    expect(field).toHaveAttribute('type', 'password')
    expect(field).toHaveFocus()
    expect(screen.getByText(/console\.anthropic\.com/)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Mensagem para a Fai' })).not.toBeInTheDocument()
  })

  it('saves the key and then starts the conversation', async () => {
    const chat = installFakeChat()
    render(<ChatApp />)
    await chat.open({ mode: 'key', hasKey: false })

    fireEvent.change(screen.getByLabelText('Chave do serviço de IA'), {
      target: { value: '  sk-ant-nova  ' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Guardar chave' }))
      await Promise.resolve()
    })

    expect(chat.api.saveKey).toHaveBeenCalledExactlyOnceWith('sk-ant-nova')
    expect(messageField()).toHaveFocus()
  })

  it('shows why a key was not kept, and keeps what was pasted', async () => {
    const chat = installFakeChat()
    chat.api.saveKey.mockResolvedValueOnce({
      ok: false,
      error: { code: 'INVALID_KEY', message: 'Essa chave não funcionou.' },
    })
    render(<ChatApp />)
    await chat.open({ mode: 'key', hasKey: false })
    const field = screen.getByLabelText('Chave do serviço de IA')
    fireEvent.change(field, { target: { value: 'sk-errada' } })

    await act(async () => {
      fireEvent.submit(field)
      await Promise.resolve()
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Essa chave não funcionou.')
    expect(field).toHaveValue('sk-errada')
  })

  it('does not send an empty key', async () => {
    const chat = installFakeChat()
    render(<ChatApp />)
    await chat.open({ mode: 'key', hasKey: false })

    fireEvent.submit(screen.getByLabelText('Chave do serviço de IA'))

    expect(chat.api.saveKey).not.toHaveBeenCalled()
  })

  it('says when the key lasts only until Fai closes (Linux without a keyring)', async () => {
    const chat = installFakeChat()
    render(<ChatApp />)

    await chat.open({ mode: 'key', hasKey: false, keyPersists: false })

    expect(screen.getByText(/só até fechar a Fai/)).toBeInTheDocument()
  })
})

describe('chat bubble: the conversation (RF-18, CA2, CA3, CA5, CA6)', () => {
  it('opens on an empty conversation with the field focused', async () => {
    const chat = installFakeChat()
    render(<ChatApp />)

    await chat.open()

    expect(messageField()).toHaveFocus()
    expect(lines()).toEqual([])
  })

  it('sends with Enter, shows Fai thinking, then her reply as it arrives (CA2, CA3)', async () => {
    const chat = installFakeChat()
    render(<ChatApp />)
    await chat.open()

    await type('  oi, Fai  ')

    expect(chat.api.send).toHaveBeenCalledExactlyOnceWith('oi, Fai')
    expect(messageField()).toHaveValue('')
    expect(screen.getByText('Fai está pensando…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled()
    expect(messageField()).toBeDisabled()
    // Even if the form is submitted some other way, nothing goes out while Fai answers.
    fireEvent.change(messageField(), { target: { value: 'outra' } })
    fireEvent.submit(messageField())
    expect(chat.api.send).toHaveBeenCalledOnce()
    fireEvent.change(messageField(), { target: { value: '' } })

    await chat.delta('Oi! ')
    expect(screen.queryByText('Fai está pensando…')).not.toBeInTheDocument()
    await chat.delta('Que alegria ✨')
    expect(lines()).toEqual(['oi, Fai', 'Oi! Que alegria ✨'])

    await chat.end()
    expect(lines()).toEqual(['oi, Fai', 'Oi! Que alegria ✨'])
    expect(messageField()).not.toBeDisabled()
    expect(messageField()).toHaveFocus()
  })

  it('announces the reply politely to screen readers', async () => {
    const chat = installFakeChat()
    render(<ChatApp />)
    await chat.open()
    await type('oi')

    await chat.delta('Olá!')

    expect(screen.getByText('Olá!').closest('[aria-live="polite"]')).not.toBeNull()
  })

  it('does not send an empty or blank message (CA3)', async () => {
    const chat = installFakeChat()
    render(<ChatApp />)
    await chat.open()

    await type('   ')

    expect(chat.api.send).not.toHaveBeenCalled()
    expect(lines()).toEqual([])
  })

  it('on failure, shows the gentle message and gives the text back to send again (CA6)', async () => {
    const chat = installFakeChat()
    render(<ChatApp />)
    await chat.open()
    await type('tudo bem?')

    await chat.fail({ message: 'Sem conexão com as estrelas.', text: 'tudo bem?' })

    expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão com as estrelas.')
    expect(messageField()).toHaveValue('tudo bem?')
    expect(messageField()).not.toBeDisabled()
    expect(lines()).toEqual([])

    await type('tudo bem?')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a refusal from the main process, such as "still answering"', async () => {
    const chat = installFakeChat()
    chat.api.send.mockResolvedValueOnce({
      ok: false,
      error: { code: 'BUSY', message: 'Calma, ainda estou respondendo!' },
    })
    render(<ChatApp />)
    await chat.open()

    await type('oi')

    expect(screen.getByRole('alert')).toHaveTextContent('Calma, ainda estou respondendo!')
    expect(messageField()).toHaveValue('oi')
    expect(lines()).toEqual([])
  })

  it('after the 30th reply, tells Fai needs rest and stops sending', async () => {
    const chat = installFakeChat()
    render(<ChatApp />)
    await chat.open()
    await type('a trigésima')
    await chat.delta('Tchauzinho!')
    await chat.end()

    await chat.fail({ message: 'Preciso descansar as asinhas.', text: '' })

    expect(screen.getByRole('status')).toHaveTextContent('Preciso descansar as asinhas.')
    expect(lines()).toEqual(['a trigésima', 'Tchauzinho!'])
    expect(messageField()).toBeDisabled()
    fireEvent.change(messageField(), { target: { value: 'mais uma' } })
    fireEvent.submit(messageField())
    expect(chat.api.send).toHaveBeenCalledOnce()
  })

  it('starts empty again each time it opens (CA5)', async () => {
    const chat = installFakeChat()
    render(<ChatApp />)
    await chat.open()
    await type('oi')
    await chat.delta('Olá!')
    await chat.end()
    fireEvent.change(messageField(), { target: { value: 'meio escrito' } })

    await chat.open()

    expect(lines()).toEqual([])
    expect(messageField()).toHaveValue('')
  })

  it('points its tail where the main process says', async () => {
    const chat = installFakeChat()
    render(<ChatApp />)
    await chat.open()

    await chat.place({ tail: 'left', tailAt: 120 })

    const bubble = screen.getByRole('main')
    expect(bubble).toHaveClass('bubble--tail-left')
    expect(bubble.style.getPropertyValue('--tail-at')).toBe('120px')
  })

  it('names every control and stops listening when it goes away (RNF-10, CA11)', async () => {
    const chat = installFakeChat()
    const view = render(<ChatApp />)
    await chat.open()

    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAccessibleName()
    }
    expect(screen.getByRole('heading', { name: /Fai/ })).toBeInTheDocument()

    view.unmount()
    expect(chat.listening()).toBe(0)
  })
})
