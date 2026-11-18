import type { MenuItemConstructorOptions } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import { buildMascotMenu } from './mascot-menu'

describe('buildMascotMenu (RF-10 CA1, RF-18 CA1)', () => {
  it('has "Abrir painel" and "Conversar", each wired to its action', () => {
    const actions = { openPanel: vi.fn(), openChat: vi.fn() }

    const menu = buildMascotMenu(actions)

    expect(menu.map((item) => item.label)).toEqual(['Abrir painel', 'Conversar'])
    ;(menu[0]?.click as (() => void) | undefined)?.()
    expect(actions.openPanel).toHaveBeenCalledOnce()
    expect(actions.openChat).not.toHaveBeenCalled()
    ;(menu[1]?.click as (() => void) | undefined)?.()
    expect(actions.openChat).toHaveBeenCalledOnce()
  })

  it('is plain menu items, with no separators or roles', () => {
    const menu: MenuItemConstructorOptions[] = buildMascotMenu({
      openPanel: vi.fn(),
      openChat: vi.fn(),
    })

    expect(menu.every((item) => item.type === undefined && item.role === undefined)).toBe(true)
  })
})
