import type { MenuItemConstructorOptions } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import { buildTrayMenu } from './tray-menu'

function clickItem(item: MenuItemConstructorOptions | undefined): void {
  const click = item?.click as (() => void) | undefined
  click?.()
}

describe('buildTrayMenu (RF-03, RF-18 CA1, RF-19 CA1)', () => {
  const actions = {
    toggleFai: vi.fn(),
    openPanel: vi.fn(),
    openChat: vi.fn(),
    changeKey: vi.fn(),
    clearKey: vi.fn(),
    quit: vi.fn(),
  }
  const menu = buildTrayMenu(actions)
  const items = menu.filter((item) => item.type !== 'separator')

  it('offers the items in Brazilian Portuguese (RF-03 CA1)', () => {
    expect(items.map((item) => item.label)).toEqual([
      'Mostrar/ocultar Fai',
      'Abrir painel',
      'Conversar',
      'Trocar chave da IA…',
      'Apagar chave da IA',
      'Sair',
    ])
  })

  it('wires each item to its own action', () => {
    const order = [
      actions.toggleFai,
      actions.openPanel,
      actions.openChat,
      actions.changeKey,
      actions.clearKey,
      actions.quit,
    ]
    items.forEach((item, index) => {
      clickItem(item)
      order.forEach((action, other) => {
        expect(action).toHaveBeenCalledTimes(other <= index ? 1 : 0)
      })
    })
  })
})
