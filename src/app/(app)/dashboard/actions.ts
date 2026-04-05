'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createBoard(formData: FormData): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = (formData.get('title') as string)?.trim() || 'Untitled Board'

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('boards')
    .insert({ title, owner_id: user.id })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { id: data.id }
}

export async function deleteBoard(boardId: string): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership before deleting
  const admin = createAdminClient()
  const { data: board } = await admin
    .from('boards')
    .select('owner_id')
    .eq('id', boardId)
    .single()

  if (!board || board.owner_id !== user.id) {
    return { error: 'Only the board owner can delete it' }
  }

  const { error } = await admin
    .from('boards')
    .delete()
    .eq('id', boardId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
}
