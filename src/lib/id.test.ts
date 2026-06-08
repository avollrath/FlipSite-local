import { afterEach, describe, expect, it, vi } from 'vitest'
import { createClientId } from '@/lib/id'

const originalCrypto = globalThis.crypto

afterEach(() => {
  vi.stubGlobal('crypto', originalCrypto)
})

describe('createClientId', () => {
  it('uses randomUUID when available', () => {
    vi.stubGlobal('crypto', {
      randomUUID: () => 'native-id',
    })

    expect(createClientId()).toBe('native-id')
  })

  it('creates a UUID when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0)
        return bytes
      },
    })

    expect(createClientId()).toBe('00000000-0000-4000-8000-000000000000')
  })
})
