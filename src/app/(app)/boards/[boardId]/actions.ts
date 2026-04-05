'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Share link ──────────────────────────────────────────────

export async function getOrCreateShareToken(
  boardId: string,
  role: 'editor' | 'viewer' = 'editor',
): Promise<{ token: string; role: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: board } = await admin
    .from('boards')
    .select('owner_id, share_token, share_role')
    .eq('id', boardId)
    .single()

  if (!board || board.owner_id !== user.id) {
    return { error: 'Only the board owner can share' }
  }

  if (board.share_token) {
    // Update role if changed
    if (board.share_role !== role) {
      await admin.from('boards').update({ share_role: role }).eq('id', boardId)
    }
    return { token: board.share_token, role }
  }

  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  const { error } = await admin
    .from('boards')
    .update({ share_token: token, share_role: role })
    .eq('id', boardId)

  if (error) return { error: error.message }
  return { token, role }
}

export async function joinByToken(token: string): Promise<{ boardId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: board } = await admin
    .from('boards')
    .select('id, owner_id, share_role')
    .eq('share_token', token)
    .single()

  if (!board) return { error: 'Invalid or expired link' }
  if (board.owner_id === user.id) return { boardId: board.id }

  // Add member with the role specified on the share link
  await admin
    .from('board_members')
    .upsert(
      { board_id: board.id, user_id: user.id, role: board.share_role as 'editor' | 'viewer' },
      { onConflict: 'board_id,user_id' },
    )

  revalidatePath(`/boards/${board.id}`)
  revalidatePath('/dashboard')
  return { boardId: board.id }
}

// ── Member management ───────────────────────────────────────

export async function addMember(
  boardId: string,
  email: string,
  role: 'editor' | 'viewer' = 'editor',
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: board } = await admin
    .from('boards')
    .select('owner_id')
    .eq('id', boardId)
    .single()

  if (!board || board.owner_id !== user.id) {
    return { error: 'Only the board owner can invite members' }
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!profile || profile.id === user.id) return { error: 'Unable to invite this user' }

  const { error } = await admin
    .from('board_members')
    .upsert(
      { board_id: boardId, user_id: profile.id, role },
      { onConflict: 'board_id,user_id' },
    )

  if (error) return { error: error.message }

  revalidatePath(`/boards/${boardId}`)
  return { ok: true }
}

export async function removeMember(
  boardId: string,
  userId: string,
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: board } = await admin
    .from('boards')
    .select('owner_id')
    .eq('id', boardId)
    .single()

  if (!board || board.owner_id !== user.id) {
    return { error: 'Only the board owner can remove members' }
  }

  const { error } = await admin
    .from('board_members')
    .delete()
    .eq('board_id', boardId)
    .eq('user_id', userId)

  if (error) return { error: error.message }

  revalidatePath(`/boards/${boardId}`)
  return { ok: true }
}

export type MemberWithProfile = {
  user_id: string
  role: string
  email: string
  display_name: string | null
}

type MemberRow = {
  user_id: string
  role: string
  profiles: { email: string; display_name: string | null } | null
}

export async function getMembers(boardId: string): Promise<MemberWithProfile[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Verify user has access to this board (RLS enforced)
  const { data: board } = await supabase
    .from('boards')
    .select('id')
    .eq('id', boardId)
    .single()
  if (!board) return []

  const admin = createAdminClient()
  const { data } = await admin
    .from('board_members')
    .select('user_id, role, profiles(email, display_name)')
    .eq('board_id', boardId)
    .returns<MemberRow[]>()

  if (!data) return []

  return data.map((row) => ({
    user_id: row.user_id,
    role: row.role,
    email: row.profiles?.email ?? '',
    display_name: row.profiles?.display_name ?? null,
  }))
}

// ── Board list (for board switcher) ─────────────────────────

export async function getUserBoards(): Promise<Array<{ id: string; title: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminClient()

  const [owned, memberships] = await Promise.all([
    admin.from('boards').select('id, title').eq('owner_id', user.id).order('updated_at', { ascending: false }),
    admin.from('board_members').select('board_id').eq('user_id', user.id),
  ])

  const boards = owned.data ?? []
  const memberBoardIds = (memberships.data ?? []).map((m) => m.board_id)

  if (memberBoardIds.length > 0) {
    const { data: shared } = await admin
      .from('boards')
      .select('id, title')
      .in('id', memberBoardIds)
    if (shared) boards.push(...shared)
  }

  return boards
}
