import { notFound } from 'next/navigation'
import { getSharedBoard } from './actions'
import { BoardCanvas } from '@/app/components/board/board-canvas'

export default async function SharedBoardPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const board = await getSharedBoard(token)

  if (!board) notFound()

  return (
    <BoardCanvas
      boardId={board.id}
      boardTitle={board.title}
      ownerId={board.ownerId}
      initialItems={board.items}
      userId={null}
      mode={board.role}
      isAuthenticated={false}
      shareToken={token}
    />
  )
}
