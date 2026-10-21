import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { verifyStandardWebhook } from '../supabase/functions/_shared/standard-webhooks'

const SIGNING_KEY = 'super-secret-signing-key-for-tests'
const SECRET = `whsec_${Buffer.from(SIGNING_KEY).toString('base64')}`
const BODY = JSON.stringify({ user: { phone: '+381641234567' }, sms: { otp: '123456' } })

function nowSeconds(): string {
  return String(Math.floor(Date.now() / 1000))
}

function sign(id: string, timestamp: string, body: string, key: string = SIGNING_KEY): string {
  return `v1,${createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')}`
}

describe('verifyStandardWebhook', () => {
  it('accepts a correctly signed, fresh request', async () => {
    const timestamp = nowSeconds()
    const signature = sign('msg_1', timestamp, BODY)

    await expect(
      verifyStandardWebhook(BODY, { id: 'msg_1', timestamp, signature }, SECRET)
    ).resolves.toBe(true)
  })

  it('accepts the secret exactly as the Supabase dashboard shows it (v1,whsec_...)', async () => {
    const timestamp = nowSeconds()
    const signature = sign('msg_1', timestamp, BODY)

    await expect(
      verifyStandardWebhook(BODY, { id: 'msg_1', timestamp, signature }, `v1,${SECRET}`)
    ).resolves.toBe(true)
  })

  it('accepts a secret without the whsec_ prefix', async () => {
    const timestamp = nowSeconds()
    const signature = sign('msg_1', timestamp, BODY)

    await expect(
      verifyStandardWebhook(
        BODY,
        { id: 'msg_1', timestamp, signature },
        Buffer.from(SIGNING_KEY).toString('base64')
      )
    ).resolves.toBe(true)
  })

  it('accepts when any of several space-separated signatures matches', async () => {
    const timestamp = nowSeconds()
    const stale = sign('msg_1', timestamp, BODY, 'rotated-out-key')
    const current = sign('msg_1', timestamp, BODY)

    await expect(
      verifyStandardWebhook(
        BODY,
        { id: 'msg_1', timestamp, signature: `${stale} ${current}` },
        SECRET
      )
    ).resolves.toBe(true)
  })

  it('rejects a tampered body', async () => {
    const timestamp = nowSeconds()
    const signature = sign('msg_1', timestamp, BODY)
    const tampered = BODY.replace('123456', '654321')

    await expect(
      verifyStandardWebhook(tampered, { id: 'msg_1', timestamp, signature }, SECRET)
    ).resolves.toBe(false)
  })

  it('rejects a signature made with a different secret', async () => {
    const timestamp = nowSeconds()
    const signature = sign('msg_1', timestamp, BODY, 'some-other-key')

    await expect(
      verifyStandardWebhook(BODY, { id: 'msg_1', timestamp, signature }, SECRET)
    ).resolves.toBe(false)
  })

  it('rejects a different webhook id than the one signed', async () => {
    const timestamp = nowSeconds()
    const signature = sign('msg_1', timestamp, BODY)

    await expect(
      verifyStandardWebhook(BODY, { id: 'msg_2', timestamp, signature }, SECRET)
    ).resolves.toBe(false)
  })

  it('rejects a replayed request outside the tolerance window', async () => {
    const timestamp = String(Math.floor(Date.now() / 1000) - 10 * 60)
    const signature = sign('msg_1', timestamp, BODY)

    await expect(
      verifyStandardWebhook(BODY, { id: 'msg_1', timestamp, signature }, SECRET)
    ).resolves.toBe(false)
  })

  it('rejects missing headers and a non-numeric timestamp', async () => {
    const timestamp = nowSeconds()
    const signature = sign('msg_1', timestamp, BODY)

    await expect(
      verifyStandardWebhook(BODY, { id: null, timestamp, signature }, SECRET)
    ).resolves.toBe(false)
    await expect(
      verifyStandardWebhook(BODY, { id: 'msg_1', timestamp: null, signature }, SECRET)
    ).resolves.toBe(false)
    await expect(
      verifyStandardWebhook(BODY, { id: 'msg_1', timestamp, signature: null }, SECRET)
    ).resolves.toBe(false)
    await expect(
      verifyStandardWebhook(BODY, { id: 'msg_1', timestamp: 'soon', signature }, SECRET)
    ).resolves.toBe(false)
  })
})
