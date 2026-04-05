import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('env validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test'

    await expect(async () => {
      const { env } = await import('@/lib/env')
      void env.NEXT_PUBLIC_SUPABASE_URL
    }).rejects.toThrow('Missing NEXT_PUBLIC_SUPABASE_URL')
  })

  it('throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test'

    await expect(async () => {
      const { env } = await import('@/lib/env')
      void env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }).rejects.toThrow('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  })

  it('throws when service role key accessed from browser', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test'
    // In jsdom, window exists — simulates browser
    const { env } = await import('@/lib/env')
    expect(() => env.SUPABASE_SERVICE_ROLE_KEY).toThrow('must not be accessed from the browser')
  })
})
