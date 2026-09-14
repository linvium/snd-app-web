import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { UNVERIFIED_USER } from '../fixtures/users'

/**
 * public.users is written only by the auth triggers and the service role.
 *
 * A signed-in user talking to the REST API with their own token must not be
 * able to verify their own email (the publish gate reads email_verified_at),
 * promote themselves, or change their status or balance. Uses the unverified
 * test account, so a successful write would also be a gate bypass.
 */

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const text = readFileSync(resolve(process.cwd(), file), 'utf8')
      for (const line of text.split('\n')) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
        if (!match || process.env[match[1]]) continue
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim()
      }
    } catch {
      // optional file
    }
  }
}

const PERMISSION_DENIED = '42501'

test.describe('users table from a signed-in client', () => {
  let supabase: SupabaseClient
  let userId: string

  test.beforeAll(async () => {
    loadEnv()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    test.skip(!url || !anonKey, 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required')

    supabase = createClient(url!, anonKey!, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data, error } = await supabase.auth.signInWithPassword(UNVERIFIED_USER)
    test.skip(Boolean(error) || !data.user, 'Seed test users first: npm run test:e2e:seed')
    userId = data.user!.id
  })

  test.afterAll(async () => {
    await supabase?.auth.signOut()
  })

  test('can still read its own row', async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, role, email_verified_at')
      .eq('id', userId)
      .single()

    expect(error).toBeNull()
    expect(data?.id).toBe(userId)
    expect(data?.email_verified_at).toBeNull()
  })

  test('cannot verify its own email, change its role, status or balance', async () => {
    const { error } = await supabase
      .from('users')
      .update({
        email_verified_at: new Date().toISOString(),
        role: 'admin',
        status: 'active',
        credit_balance_minor: 999_999,
      })
      .eq('id', userId)
      .select()

    expect(error?.code).toBe(PERMISSION_DENIED)

    const { data } = await supabase.from('users').select('role, email_verified_at').eq('id', userId).single()
    expect(data?.role).toBe('user')
    expect(data?.email_verified_at).toBeNull()
  })

  test('cannot insert or delete user rows', async () => {
    const insert = await supabase
      .from('users')
      .insert({ id: crypto.randomUUID(), email: 'intruder@snd.rs', role: 'admin' })
    expect(insert.error?.code).toBe(PERMISSION_DENIED)

    const remove = await supabase.from('users').delete().eq('id', userId)
    expect(remove.error?.code).toBe(PERMISSION_DENIED)
  })
})
