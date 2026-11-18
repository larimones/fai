import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import type { SecretStorage } from '../os/desktop-integration'

export interface ApiKeyStoreOptions {
  /** `userData/fai-ai-key.bin`, apart from fai-data.json (ADR-0017). */
  readonly filePath: string
  readonly storage: SecretStorage
}

export interface ApiKeyStore {
  /** False when the key lasts only until the app closes (no real OS protection). */
  readonly persists: boolean
  /** Reads the saved key, once at startup. */
  load(): Promise<void>
  get(): string | null
  save(key: string): Promise<void>
  clear(): Promise<void>
}

/** Keeps the AI service key: encrypted on disk, or only in memory (RF-19 CA2). */
export function createApiKeyStore({ filePath, storage }: ApiKeyStoreOptions): ApiKeyStore {
  let key: string | null = null

  return {
    persists: storage.persists,

    async load() {
      if (!storage.persists) {
        return
      }
      let data: Buffer
      try {
        data = await readFile(filePath)
      } catch {
        return
      }
      try {
        key = storage.decrypt(data)
      } catch {
        // Never log the bytes: they are the key, encrypted.
        console.warn('Fai: a chave da IA guardada não pôde ser lida; ela será pedida de novo.')
        key = null
      }
    },

    get: () => key,

    async save(next) {
      if (storage.persists) {
        // Written beside the file and renamed over it, so a crash never leaves half a key.
        const temporary = `${filePath}.tmp`
        await writeFile(temporary, storage.encrypt(next), { mode: 0o600 })
        await rename(temporary, filePath)
      }
      key = next
    },

    async clear() {
      key = null
      await rm(filePath, { force: true })
    },
  }
}
