'use client'

import { ZoomIn, ZoomOut } from 'lucide-react'
import { useUIStore } from '@/app/stores/ui-store'

export function ZoomControls() {
  const zoom = useUIStore((s) => s.zoom)
  const zoomTo = useUIStore((s) => s.zoomTo)

  function handleZoom(direction: 'in' | 'out') {
    const factor = direction === 'in' ? 1.25 : 0.8
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    zoomTo(zoom * factor, cx, cy)
  }

  return (
    <div
      className="absolute bottom-4 left-4 z-20 flex items-center gap-1 rounded-xl border border-border p-1 shadow-lg transition-colors"
      style={{ backgroundColor: 'var(--bg-overlay)', backdropFilter: `blur(var(--panel-blur))` }}
    >
      <button
        onClick={() => handleZoom('out')}
        className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-accent-subtle hover:text-accent"
      >
        <ZoomOut size={16} />
      </button>
      <span className="min-w-[3rem] text-center text-xs font-medium text-text-secondary">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={() => handleZoom('in')}
        className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-accent-subtle hover:text-accent"
      >
        <ZoomIn size={16} />
      </button>
    </div>
  )
}
