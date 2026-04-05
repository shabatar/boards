'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { rowToItem } from '@/lib/board-repo'
import type { BoardItem } from '@/app/stores/board-store'

export type SharedBoard = {
  id: string
  title: string
  ownerId: string
  role: 'editor' | 'viewer'
  items: BoardItem[]
}

export async function getSharedBoard(token: string): Promise<SharedBoard | null> {
  const admin = createAdminClient()

  const { data: board } = await admin
    .from('boards')
    .select('id, title, owner_id, share_role')
    .eq('share_token', token)
    .single()

  if (!board) return null

  const { data: items } = await admin
    .from('board_items')
    .select('*')
    .eq('board_id', board.id)

  return {
    id: board.id,
    title: board.title,
    ownerId: board.owner_id,
    role: board.share_role as 'editor' | 'viewer',
    items: (items ?? []).map(rowToItem),
  }
}
