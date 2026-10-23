import { describe, expect, it, vi } from 'vitest'
import { createEmptyData } from '@domain/data/fai-data'
import type { LoadResult } from './data-store'
import {
  describeLoadProblem,
  flushBeforeQuit,
  needsInitialSave,
  type QuittableApp,
} from './startup'

const FILE = 'C:\\Users\\fai\\AppData\\Roaming\\Fai\\fai-data.json'
const QUARANTINED = 'C:\\Users\\fai\\AppData\\Roaming\\Fai\\fai-data.corrupt-20261022T194553Z.json'
const data = createEmptyData()

const results = {
  created: { status: 'created', data },
  loaded: { status: 'loaded', data },
  migrated: { status: 'migrated', data },
  quarantined: {
    status: 'quarantined',
    data,
    reason: 'INVALID_JSON',
    quarantinedPath: QUARANTINED,
  },
  unavailable: { status: 'unavailable', data, reason: 'UNREADABLE', error: new Error('EACCES') },
} satisfies Record<LoadResult['status'], LoadResult>

describe('needsInitialSave', () => {
  it('writes new, migrated and post-quarantine documents, never over an unavailable file', () => {
    expect(needsInitialSave(results.created)).toBe(true)
    expect(needsInitialSave(results.migrated)).toBe(true)
    expect(needsInitialSave(results.quarantined)).toBe(true)
    expect(needsInitialSave(results.loaded)).toBe(false)
    expect(needsInitialSave(results.unavailable)).toBe(false)
  })
})

describe('describeLoadProblem (RNF-07 CA2)', () => {
  it('stays quiet when the data was usable', () => {
    expect(describeLoadProblem(results.created, FILE)).toBeUndefined()
    expect(describeLoadProblem(results.loaded, FILE)).toBeUndefined()
    expect(describeLoadProblem(results.migrated, FILE)).toBeUndefined()
  })

  it('tells where the damaged file was kept', () => {
    const notice = describeLoadProblem(results.quarantined, FILE)

    expect(notice?.message).toBe('Não consegui ler os seus dados')
    expect(notice?.detail).toContain(QUARANTINED)
    expect(notice?.detail).toContain('INVALID_JSON')
  })

  it('explains that nothing will be saved when the file is unavailable', () => {
    const notice = describeLoadProblem(results.unavailable, FILE)

    expect(notice?.message).toBe('Não consegui abrir os seus dados')
    expect(notice?.detail).toContain('não vou salvar alterações')
    expect(notice?.detail).toContain(FILE)
  })
})

describe('flushBeforeQuit', () => {
  function fakeApp() {
    let listener: ((event: { preventDefault(): void }) => void) | undefined
    const app = {
      on: vi.fn((_event: 'before-quit', handler: typeof listener) => {
        listener = handler
      }),
      quit: vi.fn(),
    } satisfies QuittableApp
    const quitAttempt = () => {
      const event = { preventDefault: vi.fn() }
      listener?.(event)
      return event
    }
    return { app, quitAttempt }
  }

  it('delays quitting until pending writes finish, then quits once', async () => {
    let finishFlush: () => void = () => undefined
    const flush = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishFlush = resolve
        }),
    )
    const { app, quitAttempt } = fakeApp()
    flushBeforeQuit(app, { flush })

    expect(quitAttempt().preventDefault).toHaveBeenCalled()
    expect(quitAttempt().preventDefault).toHaveBeenCalled()
    expect(flush).toHaveBeenCalledOnce()
    expect(app.quit).not.toHaveBeenCalled()

    finishFlush()
    await vi.waitFor(() => {
      expect(app.quit).toHaveBeenCalledOnce()
    })
    expect(quitAttempt().preventDefault).not.toHaveBeenCalled()
  })

  it('still quits when flushing fails', async () => {
    const { app, quitAttempt } = fakeApp()
    flushBeforeQuit(app, { flush: () => Promise.reject(new Error('disk gone')) })

    quitAttempt()

    await vi.waitFor(() => {
      expect(app.quit).toHaveBeenCalledOnce()
    })
  })
})
