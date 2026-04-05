export default function SharedNotFound() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-bg">
      <p className="text-lg font-medium text-text">Link expired or invalid</p>
      <p className="text-sm text-text-muted">This shared board link is no longer available.</p>
    </div>
  )
}
