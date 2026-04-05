'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rowToItem } from '@/lib/board-repo'
import type { BoardItem } from '@/app/stores/board-store'

/**
 * Fetch all items for a board.
 * Authenticated users: verified via RLS (accessible_board_ids).
 * Anonymous users: must provide a valid share token.
 */
export async function fetchBoardItems(boardId: string, shareToken?: string): Promise<BoardItem[]> {
  // Try authenticated path first (respects RLS)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data } = await supabase
        .from('board_items')
        .select('*')
        .eq('board_id', boardId)
      return (data ?? []).map(rowToItem)
    }
  } catch {
    // No auth session — fall through to share token check
  }

  // Anonymous: require valid share token
  if (!shareToken) return []

  const admin = createAdminClient()
  const { data: board } = await admin
    .from('boards')
    .select('id')
    .eq('id', boardId)
    .eq('share_token', shareToken)
    .single()

  if (!board) return []

  const { data } = await admin
    .from('board_items')
    .select('*')
    .eq('board_id', boardId)

  return (data ?? []).map(rowToItem)
}
