import { describe, expect, it } from 'vitest'

import { shareInflightPromise } from '@/lib/listings/listings.helpers'

describe('shareInflightPromise', () => {
  it('reuses one in-flight call and retries after failure', async () => {
    let calls = 0
    const shared = shareInflightPromise(async () => {
      calls += 1
      if (calls === 1) {
        await Promise.resolve()
        throw new Error('boom')
      }
      return 'ok'
    })

    const first = shared()
    const second = shared()
    await expect(first).rejects.toThrow('boom')
    await expect(second).rejects.toThrow('boom')
    expect(calls).toBe(1)

    await expect(shared()).resolves.toBe('ok')
    await expect(shared()).resolves.toBe('ok')
    expect(calls).toBe(2)
  })
})
