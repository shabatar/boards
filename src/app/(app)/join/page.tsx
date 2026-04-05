import { redirect } from 'next/navigation'
import { joinByToken } from '@/app/(app)/boards/[boardId]/actions'

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) redirect('/dashboard')

  const result = await joinByToken(token)

  if ('error' in result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <p className="text-lg font-medium text-text">Unable to join board</p>
          <p className="mt-2 text-sm text-text-muted">{result.error}</p>
          <a href="/dashboard" className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">
            Go to dashboard
          </a>
        </div>
      </div>
    )
  }

  redirect(`/boards/${result.boardId}`)
}
