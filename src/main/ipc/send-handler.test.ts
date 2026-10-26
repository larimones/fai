import type { IpcMainEvent } from 'electron'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IpcChannels } from '@shared/ipc/channels'
import { sendContract } from '@shared/ipc/schemas'
import { createSendHandler } from './send-handler'

const event = {} as IpcMainEvent
const dragSchema = sendContract[IpcChannels.mascotDrag]

describe('createSendHandler (RNF-03)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('passes a valid message from a trusted sender to the listener', () => {
    const run = vi.fn()
    const handler = createSendHandler(dragSchema, () => true, run)

    handler(event, { phase: 'start' })

    expect(run).toHaveBeenCalledExactlyOnceWith({ phase: 'start' })
  })

  it('drops messages from untrusted senders without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const run = vi.fn()
    const handler = createSendHandler(dragSchema, () => false, run)

    expect(() => {
      handler(event, { phase: 'start' })
    }).not.toThrow()
    expect(run).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledOnce()
  })

  it('drops invalid messages without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const run = vi.fn()
    const handler = createSendHandler(dragSchema, () => true, run)

    expect(() => {
      handler(event, { phase: 'teleport' })
      handler(event, undefined)
    }).not.toThrow()
    expect(run).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('keeps a failing listener from crashing the main process', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const handler = createSendHandler(
      dragSchema,
      () => true,
      () => {
        throw new Error('boom')
      },
    )

    expect(() => {
      handler(event, { phase: 'end' })
    }).not.toThrow()
  })
})
