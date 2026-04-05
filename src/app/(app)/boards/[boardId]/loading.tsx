export default function BoardLoading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-canvas-bg transition-colors">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
        <p className="text-sm text-text-muted">Loading board…</p>
      </div>
    </div>
  )
}
