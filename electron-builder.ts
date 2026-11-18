import type { Configuration } from 'electron-builder'
import fuses from './tools/package/fuses.json'

/**
 * The Windows installer (ADR-0018). `npm run dist:win` builds it on Windows; `npm run pack:check`
 * builds the unpacked app on any machine and checks it.
 */
const config: Configuration = {
  // The same id the app passes to setAppUserModelId (ADR-0016): the Start menu shortcut carries
  // it, which is how Windows shows notifications under "Fai".
  appId: 'io.github.larimones.fai',
  productName: 'Fai',
  artifactName: 'Fai-Setup-${version}.${ext}',
  directories: { output: 'dist' },
  // Everything the app needs is bundled into out/ (no node_modules); only the runtime icons join.
  files: [
    'out/**/*',
    'resources/app-icon.png',
    'resources/tray-icon.png',
    'resources/tray-icon@2x.png',
  ],
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'resources/app-icon.png',
  },
  // Owner's choices: for the current user only, no admin, shortcuts, open when done, keep data.
  nsis: {
    oneClick: false,
    perMachine: false,
    allowElevation: false,
    allowToChangeInstallationDirectory: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Fai',
    runAfterFinish: true,
    deleteAppDataOnUninstall: false,
    installerLanguages: ['pt_BR'],
  },
  linux: { executableName: 'fai' },
  electronFuses: fuses,
}

export default config
