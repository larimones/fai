import type { DataStore, LoadResult } from './data-store'

export interface DataNotice {
  readonly message: string
  readonly detail: string
}

/** The part of Electron's `app` needed to delay quitting; kept narrow so persistence stays Electron-free. */
export interface QuittableApp {
  on(event: 'before-quit', listener: (event: { preventDefault(): void }) => void): unknown
  quit(): void
}

/**
 * New, migrated and post-quarantine documents are written right away, so the file on disk matches
 * what the app uses. An unavailable file is never written over.
 */
export function needsInitialSave(result: LoadResult): boolean {
  return result.status !== 'loaded' && result.status !== 'unavailable'
}

/** Gentle warning for the user when the stored data could not be used (RNF-07 CA2). */
export function describeLoadProblem(result: LoadResult, filePath: string): DataNotice | undefined {
  switch (result.status) {
    case 'quarantined':
      return {
        message: 'Não consegui ler os seus dados',
        detail:
          'O arquivo de dados da Fai estava danificado, então comecei do zero. ' +
          `Guardei uma cópia do arquivo antigo em:\n${result.quarantinedPath}\n\n` +
          `Motivo técnico: ${result.reason}`,
      }
    case 'unavailable':
      return {
        message: 'Não consegui abrir os seus dados',
        detail:
          'O arquivo de dados da Fai existe, mas não pôde ser lido. Para não perder nada, ' +
          `não vou salvar alterações até a próxima vez que a Fai abrir.\n\nArquivo:\n${filePath}\n\n` +
          `Motivo técnico: ${result.reason}`,
      }
    default:
      return undefined
  }
}

/** Holds the app open until pending writes reach the disk, then quits for real. */
export function flushBeforeQuit(app: QuittableApp, store: Pick<DataStore, 'flush'>): void {
  let state: 'running' | 'flushing' | 'flushed' = 'running'
  app.on('before-quit', (event) => {
    if (state === 'flushed') {
      return
    }
    event.preventDefault()
    if (state === 'flushing') {
      return
    }
    state = 'flushing'
    // Write failures were already reported by the store; quitting must not depend on them.
    void store
      .flush()
      .catch(() => undefined)
      .then(() => {
        state = 'flushed'
        app.quit()
      })
  })
}
