'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/types/database'

type ItemInsert = Database['public']['Tables']['board_items']['Insert']
type ItemUpdate = Database['public']['Tables']['board_items']['Update']

/** Current share token set by the client for anonymous write access. */
let _shareToken: string | undefined

/** Called by the client to set the share token for anonymous write verification. */
export async function setShareToken(token: string): Promise<void> {
  _shareToken = token
}

/**
 * Verify the caller can write to the given board.
 * Allowed if: (a) authenticated user with access, or
 * (b) board has an editor share token AND caller provided the correct token.
 */
async function verifyWriteAccess(boardId: string): Promise<void> {
  // Check auth first
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Verify user actually has access to this board via RLS
      const { data: board } = await supabase
        .from('boards')
        .select('id')
        .eq('id', boardId)
        .single()
      if (board) return
    }
  } catch {
    // No auth — fall through to share token check
  }

  // Anonymous: require matching share token
  if (!_shareToken) throw new Error('Not authorized')

  const admin = createAdminClient()
  const { data: board } = await admin
    .from('boards')
    .select('share_role')
    .eq('id', boardId)
    .eq('share_token', _shareToken)
    .single()

  if (!board || board.share_role !== 'editor') throw new Error('Not authorized')
}

export async function serverInsertItem(row: ItemInsert): Promise<void> {
  if (!row.board_id || !row.type || !row.id) {
    throw new Error('Invalid item data')
  }
  await verifyWriteAccess(row.board_id)
  const admin = createAdminClient()
  const { error } = await admin.from('board_items').insert(row)
  if (error) throw error
}

export async function serverUpdateItem(id: string, patch: ItemUpdate): Promise<void> {
  if (!id) throw new Error('Missing item id')

  const admin = createAdminClient()
  const { data: item } = await admin
    .from('board_items')
    .select('board_id')
    .eq('id', id)
    .single()

  if (!item) throw new Error('Item not found')

  await verifyWriteAccess(item.board_id)

  const { error } = await admin.from('board_items').update(patch).eq('id', id)
  if (error) throw error
}

export async function serverDeleteItem(id: string): Promise<void> {
  if (!id) throw new Error('Missing item id')

  const admin = createAdminClient()
  const { data: item } = await admin
    .from('board_items')
    .select('board_id')
    .eq('id', id)
    .single()

  if (!item) throw new Error('Item not found')

  await verifyWriteAccess(item.board_id)

  const { error } = await admin.from('board_items').delete().eq('id', id)
  if (error) throw error
}
