import { createClient } from '@/lib/supabase/server'
import { BoardCard } from '@/app/components/dashboard/board-card'
import { CreateBoardDialog } from '@/app/components/dashboard/create-board-dialog'
import { LogOut } from 'lucide-react'
import { logout } from '@/app/(auth)/actions'
import { ThemeToggle } from '@/app/components/theme-toggle'
import { SessionTracker } from '@/app/components/dashboard/session-tracker'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [ownedResult, memberResult] = await Promise.all([
    supabase
      .from('boards')
      .select('*')
      .eq('owner_id', user!.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('board_members')
      .select('board_id')
      .eq('user_id', user!.id),
  ])

  const ownedBoards = ownedResult.data ?? []

  const sharedBoardIds = (memberResult.data ?? []).map((m) => m.board_id)

  let sharedBoards: Array<(typeof ownedBoards)[number] & { ownerName?: string }> = []
  if (sharedBoardIds.length > 0) {
    const { data: sharedBoardData } = await supabase
      .from('boards')
      .select('*')
      .in('id', sharedBoardIds)
      .order('updated_at', { ascending: false })

    const ownerIds = [...new Set((sharedBoardData ?? []).map((b) => b.owner_id))]
    const { data: ownerProfiles } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .in('id', ownerIds)

    const profileMap = new Map((ownerProfiles ?? []).map((p) => [p.id, p]))

    sharedBoards = (sharedBoardData ?? []).map((b) => {
      const owner = profileMap.get(b.owner_id)
      return { ...b, ownerName: owner?.display_name || owner?.email || 'Unknown' }
    })
  }

  return (
    <div className="min-h-screen bg-bg transition-colors">
      <header className="border-b border-border bg-bg-elevated px-6 py-4 transition-colors">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-xl font-semibold text-text">Boards</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">{user?.email}</span>
            <ThemeToggle />
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-surface hover:text-text-secondary"
              >
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <SessionTracker />
      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-medium text-text">Your boards</h2>
          <CreateBoardDialog label="New board" />
        </div>

        {ownedBoards.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ownedBoards.map((board) => (
              <BoardCard key={board.id} board={board} isOwner />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 transition-colors">
            <p className="mb-4 text-text-muted">No boards yet</p>
            <CreateBoardDialog label="Create your first board" />
          </div>
        )}

        {sharedBoards.length > 0 && (
          <>
            <h2 className="mb-4 mt-10 text-lg font-medium text-text">Shared with you</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sharedBoards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  isOwner={false}
                  ownerName={board.ownerName}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
