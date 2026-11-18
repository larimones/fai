#!/usr/bin/env node
// Checks the unpacked app built by electron-builder (ADR-0018): the Electron Fuses read from the
// executable and the files inside app.asar.
//
// Usage (after `electron-builder --dir`, or simply `npm run pack:check`):
//   node tools/package/check-package.mjs
//
// Exit code: 0 when every package found is right, 1 otherwise or when none is found.

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { listPackage } from '@electron/asar'
import { FuseV1Options, getCurrentFuseWire } from '@electron/fuses'
import { checkFiles, checkFuses } from './package-rules.mjs'

const DIST = join(import.meta.dirname, '..', '..', 'dist')
const BUILDS = [
  { folder: 'win-unpacked', executable: 'Fai.exe' },
  { folder: 'linux-unpacked', executable: 'fai' },
]
// '1' (49) is enabled; '0' (48) disabled; 'r' removed.
const ENABLED = 49

const found = BUILDS.filter(({ folder, executable }) => existsSync(join(DIST, folder, executable)))
if (found.length === 0) {
  console.error(
    'Nenhum app montado em dist/. Rode "npm run pack:check" ou "electron-builder --dir".',
  )
  process.exit(1)
}

let problems = 0
for (const { folder, executable } of found) {
  const appDir = join(DIST, folder)
  const wire = await getCurrentFuseWire(join(appDir, executable))
  const fuses = Object.fromEntries(
    Object.entries(wire)
      .filter(([index]) => FuseV1Options[index] !== undefined)
      .map(([index, state]) => [FuseV1Options[index], state === ENABLED]),
  )
  const files = listPackage(join(appDir, 'resources', 'app.asar'), { isPack: false })
  const found = [...checkFuses(fuses), ...checkFiles(files)]
  console.log(`\n${folder}/${executable}: ${String(files.length)} arquivos no app.asar`)
  for (const [name, enabled] of Object.entries(fuses)) {
    console.log(`  ${name}: ${enabled ? 'ligada' : 'desligada'}`)
  }
  if (found.length === 0) {
    console.log('  OK: Fuses e conteúdo como o ADR-0018 decide.')
  }
  for (const problem of found) {
    console.error(`  PROBLEMA: ${problem}`)
  }
  problems += found.length
}
process.exit(problems === 0 ? 0 : 1)
