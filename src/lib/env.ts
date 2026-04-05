/**
 * Environment variables.
 * NEXT_PUBLIC_* vars must be referenced as static string literals
 * so the bundler can inline them at build time.
 */

export const env = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    const v = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!v) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
    return v
  },
  /** Server-side URL for reaching Supabase from inside Docker. Falls back to public URL. */
  get SUPABASE_INTERNAL_URL() {
    if (typeof window !== 'undefined') return this.NEXT_PUBLIC_SUPABASE_URL
    return process.env.SUPABASE_INTERNAL_URL || this.NEXT_PUBLIC_SUPABASE_URL
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!v) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return v
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    if (typeof window !== 'undefined') throw new Error('SUPABASE_SERVICE_ROLE_KEY must not be accessed from the browser')
    const v = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!v) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
    return v
  },
}
