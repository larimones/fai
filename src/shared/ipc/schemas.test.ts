import { describe, expect, it } from 'vitest'
import { IpcChannels } from './channels'
import { sendContract } from './schemas'

describe('mascot message schemas (RNF-03)', () => {
  const setInteractive = sendContract[IpcChannels.mascotSetInteractive]
  const drag = sendContract[IpcChannels.mascotDrag]

  it('accepts the declared messages', () => {
    expect(setInteractive.safeParse({ interactive: true }).success).toBe(true)
    expect(setInteractive.safeParse({ interactive: false }).success).toBe(true)
    for (const phase of ['start', 'move', 'end']) {
      expect(drag.safeParse({ phase }).success).toBe(true)
    }
  })

  it('rejects extra fields, such as coordinates chosen by the renderer', () => {
    expect(setInteractive.safeParse({ interactive: true, x: 1 }).success).toBe(false)
    expect(drag.safeParse({ phase: 'move', screenX: 10, screenY: 20 }).success).toBe(false)
  })

  it('rejects wrong types, unknown phases and missing payloads', () => {
    expect(setInteractive.safeParse({ interactive: 'true' }).success).toBe(false)
    expect(setInteractive.safeParse(undefined).success).toBe(false)
    expect(drag.safeParse({ phase: 'teleport' }).success).toBe(false)
    expect(drag.safeParse({}).success).toBe(false)
    expect(drag.safeParse('start').success).toBe(false)
  })
})
