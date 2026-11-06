import type { IpcMainInvokeEvent } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import { IpcChannels } from '@shared/ipc/channels'
import { invokeContract } from '@shared/ipc/schemas'
import { createInvokeHandler, IpcRuleError } from './invoke-handler'

const event = {} as IpcMainInvokeEvent
const definition = invokeContract[IpcChannels.appGetInfo]
const appInfo = { name: 'Fai', version: '0.1.0', platform: 'win32' }

describe('createInvokeHandler (RNF-03)', () => {
  it('returns the validated response for a trusted sender and valid payload', async () => {
    const handler = createInvokeHandler(
      definition,
      () => true,
      () => appInfo,
    )

    await expect(handler(event, undefined)).resolves.toEqual({ ok: true, value: appInfo })
  })

  it('rejects an untrusted sender without running the operation', async () => {
    const run = vi.fn(() => appInfo)
    const handler = createInvokeHandler(definition, () => false, run)

    await expect(handler(event, undefined)).resolves.toEqual({
      ok: false,
      error: { code: 'UNTRUSTED_SENDER', message: 'Remetente não autorizado.' },
    })
    expect(run).not.toHaveBeenCalled()
  })

  it('rejects an invalid payload without running the operation', async () => {
    const run = vi.fn(() => appInfo)
    const handler = createInvokeHandler(definition, () => true, run)

    await expect(handler(event, { path: '/etc/passwd' })).resolves.toEqual({
      ok: false,
      error: { code: 'INVALID_PAYLOAD', message: 'Dados inválidos.' },
    })
    expect(run).not.toHaveBeenCalled()
  })

  it('never leaks values that break the response contract', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const handler = createInvokeHandler(
      definition,
      () => true,
      () => ({ ...appInfo, secret: 'x' }),
    )

    await expect(handler(event, undefined)).resolves.toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'Algo deu errado.' },
    })
  })
})

describe('createInvokeHandler: rule errors (CA16)', () => {
  it('returns a rule error with its code and message, without a stack trace', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const handler = createInvokeHandler(
      definition,
      () => true,
      () => {
        throw new IpcRuleError('NOT_FOUND', 'Essa tarefa não existe mais.')
      },
    )

    await expect(handler(event, undefined)).resolves.toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Essa tarefa não existe mais.' },
    })
    expect(error).not.toHaveBeenCalled()
  })

  it('still hides unexpected errors as INTERNAL', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const handler = createInvokeHandler(
      definition,
      () => true,
      () => {
        throw new Error('disk on fire at /home/user/secret')
      },
    )

    await expect(handler(event, undefined)).resolves.toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'Algo deu errado.' },
    })
  })
})
