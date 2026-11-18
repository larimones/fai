import { safeStorage } from 'electron'
import type { SecretStorage } from './desktop-integration'

/**
 * Encrypts with the OS through Electron's safeStorage; each platform decides when it is safe.
 * Only the asynchronous API: on Linux (Electron 44), what `encryptString` writes cannot be read
 * by the next run, while `encryptStringAsync` round-trips across runs (prototype, 2026-11-18).
 */
export function osEncryptedStorage(): SecretStorage {
  return {
    persists: true,
    encrypt: (text) => safeStorage.encryptStringAsync(text),
    decrypt: async (data) => {
      const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(data)
      return { text: result, reEncrypt: shouldReEncrypt }
    },
  }
}
