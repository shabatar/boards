import Link from 'next/link'

export default function BoardNotFound() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-bg transition-colors">
      <p className="text-lg font-medium text-text">Board not found</p>
      <p className="text-sm text-text-muted">
        It may have been deleted or you don&apos;t have access.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
