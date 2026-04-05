import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { rowToItem } from '@/lib/board-repo'
import { BoardCanvas } from '@/app/components/board/board-canvas'

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>
}) {
  const { boardId } = await params
  const supabase = await createClient()

  const [boardResult, itemsResult, userResult] = await Promise.all([
    supabase.from('boards').select('*').eq('id', boardId).single(),
    supabase.from('board_items').select('*').eq('board_id', boardId),
    supabase.auth.getUser(),
  ])

  if (!boardResult.data || !userResult.data.user) notFound()

  const board = boardResult.data
  const items = (itemsResult.data ?? []).map(rowToItem)

  return (
    <BoardCanvas
      boardId={board.id}
      boardTitle={board.title}
      ownerId={board.owner_id}
      initialItems={items}
      userId={userResult.data.user.id}
    />
  )
}
