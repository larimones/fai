import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SecretStorage } from '../os/desktop-integration'
import { createApiKeyStore } from './api-key-store'

const KEY = 'sk-ant-api03-segredo-da-fai'

/** A reversible cipher, so the file never holds the key as typed. */
const encrypting: SecretStorage = {
  persists: true,
  encrypt: (text) => Buffer.from(`cifrado:${Buffer.from(text).toString('base64')}`, 'utf8'),
  decrypt: (data) => {
    const text = data.toString('utf8')
    if (!text.startsWith('cifrado:')) {
      throw new Error('não decifra')
    }
    return Buffer.from(text.slice('cifrado:'.length), 'base64').toString('utf8')
  },
}

let dir: string
let filePath: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'fai-key-'))
  filePath = join(dir, 'fai-ai-key.bin')
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('API key store (RF-19, ADR-0017)', () => {
  it('starts without a key when there is no file', async () => {
    const store = createApiKeyStore({ filePath, storage: encrypting })

    await store.load()

    expect(store.get()).toBeNull()
    expect(store.persists).toBe(true)
  })

  it('saves the key encrypted, never as typed, and reads it back after a restart', async () => {
    await createApiKeyStore({ filePath, storage: encrypting }).save(KEY)

    const bytes = await readFile(filePath)
    expect(bytes.toString('utf8')).not.toContain(KEY)
    expect(bytes.toString('latin1')).not.toContain(KEY)
    // Written atomically: no temporary file left behind.
    expect(await readdir(dir)).toEqual(['fai-ai-key.bin'])

    const restarted = createApiKeyStore({ filePath, storage: encrypting })
    await restarted.load()
    expect(restarted.get()).toBe(KEY)
  })

  it('keeps the new key right away', async () => {
    const store = createApiKeyStore({ filePath, storage: encrypting })

    await store.save(KEY)

    expect(store.get()).toBe(KEY)
  })

  it('clears the key and its file', async () => {
    const store = createApiKeyStore({ filePath, storage: encrypting })
    await store.save(KEY)

    await store.clear()

    expect(store.get()).toBeNull()
    expect(await readdir(dir)).toEqual([])
    await expect(store.clear()).resolves.toBeUndefined()
  })

  it('treats a file it cannot decrypt as no key, without failing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await writeFile(filePath, 'lixo')
    const store = createApiKeyStore({ filePath, storage: encrypting })

    await store.load()

    expect(store.get()).toBeNull()
    expect(warn).toHaveBeenCalledOnce()
    expect(String(warn.mock.calls[0])).not.toContain('lixo')
  })

  it('in memory only, keeps the key until the app closes and writes nothing', async () => {
    const store = createApiKeyStore({ filePath, storage: { persists: false } })

    await store.load()
    await store.save(KEY)

    expect(store.persists).toBe(false)
    expect(store.get()).toBe(KEY)
    expect(await readdir(dir)).toEqual([])
    const restarted = createApiKeyStore({ filePath, storage: { persists: false } })
    await restarted.load()
    expect(restarted.get()).toBeNull()
  })

  it('in memory only, still removes a file left by an earlier run when clearing', async () => {
    await createApiKeyStore({ filePath, storage: encrypting }).save(KEY)
    const store = createApiKeyStore({ filePath, storage: { persists: false } })

    await store.clear()

    expect(await readdir(dir)).toEqual([])
  })
})
