import { safeStorage } from 'electron'
import type { SecretStorage } from './desktop-integration'

/** Encrypts with the OS through Electron's safeStorage; each platform decides when it is safe. */
export function osEncryptedStorage(): SecretStorage {
  return {
    persists: true,
    encrypt: (text) => safeStorage.encryptString(text),
    decrypt: (data) => safeStorage.decryptString(data),
  }
}
