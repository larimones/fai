import type { MenuItemConstructorOptions } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import { buildMascotMenu } from './mascot-menu'

describe('buildMascotMenu (RF-10 CA1)', () => {
  it('has only "Abrir painel", which opens the panel', () => {
    const openPanel = vi.fn()

    const menu = buildMascotMenu({ openPanel })

    expect(menu.map((item) => item.label)).toEqual(['Abrir painel'])
    ;(menu[0]?.click as (() => void) | undefined)?.()
    expect(openPanel).toHaveBeenCalledOnce()
  })

  it('is plain menu items, with no separators or roles', () => {
    const menu: MenuItemConstructorOptions[] = buildMascotMenu({ openPanel: vi.fn() })

    expect(menu.every((item) => item.type === undefined && item.role === undefined)).toBe(true)
  })
})
