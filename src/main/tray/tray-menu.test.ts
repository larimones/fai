import type { MenuItemConstructorOptions } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import { buildTrayMenu } from './tray-menu'

function clickItem(item: MenuItemConstructorOptions | undefined): void {
  const click = item?.click as (() => void) | undefined
  click?.()
}

describe('buildTrayMenu (RF-03)', () => {
  const actions = { toggleFai: vi.fn(), openPanel: vi.fn(), quit: vi.fn() }
  const menu = buildTrayMenu(actions)
  const items = menu.filter((item) => item.type !== 'separator')

  it('offers the three items in Brazilian Portuguese (RF-03 CA1)', () => {
    expect(items.map((item) => item.label)).toEqual(['Mostrar/ocultar Fai', 'Abrir painel', 'Sair'])
  })

  it('wires each item to its action', () => {
    clickItem(items[0])
    expect(actions.toggleFai).toHaveBeenCalledOnce()
    expect(actions.quit).not.toHaveBeenCalled()

    clickItem(items[1])
    expect(actions.openPanel).toHaveBeenCalledOnce()
    expect(actions.quit).not.toHaveBeenCalled()

    clickItem(items[2])
    expect(actions.quit).toHaveBeenCalledOnce()
  })
})
