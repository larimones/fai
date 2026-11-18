import { describe, expect, it } from 'vitest'
import {
  checkFiles,
  checkFuses,
  EXPECTED_FUSES,
  fuseName,
  REQUIRED_FILES,
} from '../../tools/package/package-rules.mjs'

const goodFiles = [
  '/package.json',
  ...REQUIRED_FILES,
  '/out/main/node-Ab12.js',
  '/out/renderer/assets/index-Cd34.js',
  '/out/renderer/assets/fai-sheet-Ef56.png',
]

const goodFuses = Object.fromEntries(
  Object.entries(EXPECTED_FUSES).map(([key, value]) => [fuseName(key), value]),
)

describe('package rules (RNF-13 CA2, CA7, CA8, ADR-0018)', () => {
  it('names each fuse of tools/package/fuses.json as Electron does', () => {
    expect(fuseName('runAsNode')).toBe('RunAsNode')
    expect(fuseName('grantFileProtocolExtraPrivileges')).toBe('GrantFileProtocolExtraPrivileges')
    expect(EXPECTED_FUSES).toMatchObject({ runAsNode: false, onlyLoadAppFromAsar: true })
  })

  it('accepts the fuses as decided, whatever the fuses it does not decide', () => {
    expect(checkFuses({ ...goodFuses, WasmTrapHandlers: true })).toEqual([])
  })

  it('reports a fuse in the wrong state or missing', () => {
    const withoutInspect = Object.fromEntries(
      Object.entries(goodFuses).filter(([name]) => name !== 'EnableNodeCliInspectArguments'),
    )

    expect(checkFuses({ ...goodFuses, RunAsNode: true })).toEqual([
      'Fuse RunAsNode está ligada; deveria estar desligada.',
    ])
    expect(checkFuses(withoutInspect)).toEqual([
      'Fuse EnableNodeCliInspectArguments não foi encontrada no executável.',
    ])
  })

  it('accepts a package with the app, the three pages, the three preloads and the icons', () => {
    expect(REQUIRED_FILES).toEqual(
      expect.arrayContaining([
        '/out/main/index.js',
        '/out/preload/mascot.js',
        '/out/preload/panel.js',
        '/out/preload/chat.js',
        '/out/renderer/index.html',
        '/out/renderer/panel.html',
        '/out/renderer/chat.html',
        '/resources/app-icon.png',
        '/resources/tray-icon.png',
        '/resources/tray-icon@2x.png',
      ]),
    )
    expect(checkFiles(goodFiles)).toEqual([])
  })

  it('accepts Windows separators in the listing', () => {
    expect(checkFiles(goodFiles.map((file) => file.replaceAll('/', '\\')))).toEqual([])
  })

  it('reports a missing file', () => {
    expect(checkFiles(goodFiles.filter((file) => file !== '/out/preload/chat.js'))).toEqual([
      'Falta no pacote: /out/preload/chat.js',
    ])
  })

  it.each([
    '/node_modules/zod/index.js',
    '/src/main/index.ts',
    '/specs/roadmap.md',
    '/tests/ui/chat-contrast.test.ts',
    '/out/main/index.test.js',
    '/out/main/index.js.map',
    '/.env',
    '/out/.env.local',
    '/resources/app-icon-source.png',
  ])('reports a file that must not ship: %s', (file) => {
    expect(checkFiles([...goodFiles, file])).toEqual([`Não deveria estar no pacote: ${file}`])
  })
})
