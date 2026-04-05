export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-bg transition-colors">
      <header className="border-b border-border bg-bg-elevated px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="h-7 w-24 animate-pulse rounded-lg bg-bg-surface" />
          <div className="h-8 w-48 animate-pulse rounded-lg bg-bg-surface" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-6 w-32 animate-pulse rounded-lg bg-bg-surface" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-bg-surface" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-bg-surface" />
          ))}
        </div>
      </main>
    </div>
  )
}
