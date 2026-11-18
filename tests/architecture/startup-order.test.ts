import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const INDEX = resolve(import.meta.dirname, '..', '..', 'src', 'main', 'index.ts')

/**
 * The lines between creating the first window and registering the last IPC channel that wait for
 * something. A page starts calling its channels as soon as it loads, so any wait there leaves it
 * talking to channels that do not exist yet (found by /spec:verify 07).
 */
export function waitsBeforeChannels(source: string): string[] {
  const lines = source.split('\n')
  const firstWindow = lines.findIndex((line) => line.includes('createMascotWindow('))
  const lastChannel = lines.findLastIndex((line) => /\bregister\w+Handlers\(/.test(line))
  return lines
    .slice(firstWindow, lastChannel)
    .filter((line) => /\bawait\b/.test(line) && !/^\s{8,}/.test(line))
}

describe('startup order (RNF-03, ADR-0017)', () => {
  it('finds a wait between the windows and their channels', () => {
    const source = [
      '    const window = createMascotWindow(url, {})',
      '    await apiKeys.load()',
      '    registerChatHandlers(ipcMain, guard, chat)',
    ].join('\n')

    expect(waitsBeforeChannels(source)).toEqual(['    await apiKeys.load()'])
  })

  it('registers every channel before any page can call it', () => {
    const source = readFileSync(INDEX, 'utf8')

    expect(source).toContain('createMascotWindow(')
    expect(waitsBeforeChannels(source)).toEqual([])
  })
})
