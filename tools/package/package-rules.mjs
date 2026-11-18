// What the packaged app must and must not contain (ADR-0018). Pure rules, used by
// check-package.mjs and by tests/build/package-rules.test.ts.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The fuses decided in ADR-0018, keyed as electron-builder's `electronFuses` names them. */
export const EXPECTED_FUSES = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fuses.json'), 'utf8'),
)

/** Files the app cannot run without. */
export const REQUIRED_FILES = [
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
]

/** Sources, tests, specs, source maps, secrets, art sources and node_modules never ship. */
const FORBIDDEN = [
  /\/node_modules\//,
  /^\/src\//,
  /^\/specs\//,
  /^\/tests\//,
  /\.test\.[cm]?[jt]sx?$/,
  /\.map$/,
  /(^|\/)\.env(\.|$)/,
  /-source\.[a-z0-9]+$/,
]

/** `runAsNode` → `RunAsNode`, the name Electron's fuse wire uses. */
export function fuseName(key) {
  return key.charAt(0).toUpperCase() + key.slice(1)
}

/** Problems with the fuses read from the executable, as `{ RunAsNode: false, … }`. */
export function checkFuses(actual) {
  return Object.entries(EXPECTED_FUSES).flatMap(([key, expected]) => {
    const name = fuseName(key)
    if (!(name in actual)) {
      return [`Fuse ${name} não foi encontrada no executável.`]
    }
    if (actual[name] !== expected) {
      return [
        `Fuse ${name} está ${actual[name] ? 'ligada' : 'desligada'}; deveria estar ${expected ? 'ligada' : 'desligada'}.`,
      ]
    }
    return []
  })
}

/** Problems with the files listed from app.asar (paths starting with / or \). */
export function checkFiles(listed) {
  const files = listed.map((file) => file.replaceAll('\\', '/'))
  const present = new Set(files)
  return [
    ...REQUIRED_FILES.filter((file) => !present.has(file)).map(
      (file) => `Falta no pacote: ${file}`,
    ),
    ...files
      .filter((file) => FORBIDDEN.some((pattern) => pattern.test(file)))
      .map((file) => `Não deveria estar no pacote: ${file}`),
  ]
}
