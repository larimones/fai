import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import config from '../../electron-builder'
import { APP_USER_MODEL_ID } from '../../src/main/os/windows'

vi.mock('electron', () => ({}))

const ROOT = resolve(import.meta.dirname, '..', '..')
const fuses = JSON.parse(
  readFileSync(resolve(ROOT, 'tools', 'package', 'fuses.json'), 'utf8'),
) as Record<string, boolean>
const scripts = (
  JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>
  }
).scripts

describe('installer configuration (RNF-13, ADR-0018)', () => {
  it('uses the app id Windows notifications are grouped under, and the name Fai (CA1)', () => {
    expect(config.appId).toBe(APP_USER_MODEL_ID)
    expect(config.productName).toBe('Fai')
    expect(config.artifactName).toBe('Fai-Setup-${version}.${ext}')
  })

  it('installs for the current user only, without admin rights or choosing a folder (CA2)', () => {
    expect(config.nsis).toMatchObject({
      oneClick: false,
      perMachine: false,
      allowElevation: false,
      allowToChangeInstallationDirectory: false,
    })
  })

  it('adds "Fai" shortcuts, opens Fai when done and keeps the data on uninstall (CA2, CA5)', () => {
    expect(config.nsis).toMatchObject({
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      shortcutName: 'Fai',
      runAfterFinish: true,
      deleteAppDataOnUninstall: false,
      installerLanguages: ['pt_BR'],
    })
  })

  it('builds a 64-bit NSIS installer with the golden star icon (CA3)', () => {
    expect(config.win).toMatchObject({
      target: [{ target: 'nsis', arch: ['x64'] }],
      icon: 'resources/app-icon.png',
    })
  })

  it('packs only the build output and the three icons, never sources or art sources (CA8)', () => {
    expect(config.files).toEqual([
      'out/**/*',
      'resources/app-icon.png',
      'resources/tray-icon.png',
      'resources/tray-icon@2x.png',
    ])
    expect(config.directories).toMatchObject({ output: 'dist' })
  })

  it('applies the fuses listed in tools/package/fuses.json, as ADR-0018 decides (CA7)', () => {
    expect(config.electronFuses).toEqual(fuses)
    expect(fuses).toEqual({
      runAsNode: false,
      enableCookieEncryption: true,
      enableNodeOptionsEnvironmentVariable: false,
      enableNodeCliInspectArguments: false,
      enableEmbeddedAsarIntegrityValidation: true,
      onlyLoadAppFromAsar: true,
      loadBrowserProcessSpecificV8Snapshot: false,
      // The pages load from file://; without it they do not load from app.asar (prototype).
      grantFileProtocolExtraPrivileges: true,
    })
  })

  it('builds the installer with one script that works in any shell (CA11)', () => {
    expect(scripts['dist:win']).toBe(
      'npm run build && electron-builder --win nsis --x64 --publish never',
    )
    for (const script of Object.values(scripts)) {
      expect(script).not.toMatch(/\b(rm -rf|export |set |cp |del |rmdir )/)
    }
  })
})
