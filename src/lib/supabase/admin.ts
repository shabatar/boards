import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { env } from '@/lib/env'

/**
 * Admin client using the service role key. Bypasses RLS.
 * Use only in server actions after verifying auth via getUser().
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    env.SUPABASE_INTERNAL_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  )
}
