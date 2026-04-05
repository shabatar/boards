'use client'

import { useState } from 'react'
import {
  MousePointer2, BoxSelect, StickyNote, Type, Square, ArrowUpRight,
  Triangle, Circle, Pencil, ChevronRight,
} from 'lucide-react'
import { useUIStore, type Tool } from '@/app/stores/ui-store'
import { cn } from '@/lib/utils'

// ── Shape sub-tools (flyout) ────────────────────────────────

const shapeTools = [
  { id: 'rect' as Tool, icon: Square, label: 'Rectangle' },
  { id: 'triangle' as Tool, icon: Triangle, label: 'Triangle' },
  { id: 'circle' as Tool, icon: Circle, label: 'Circle' },
]

function ShapePicker() {
  const [open, setOpen] = useState(false)
  const selectedTool = useUIStore((s) => s.selectedTool)
  const setSelectedTool = useUIStore((s) => s.setSelectedTool)

  const isShapeActive = shapeTools.some((s) => s.id === selectedTool)
  const activeShape = shapeTools.find((s) => s.id === selectedTool) ?? shapeTools[0]
  const ActiveIcon = activeShape.icon

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (isShapeActive) {
            setOpen(!open)
          } else {
            setSelectedTool(activeShape.id)
          }
        }}
        aria-label={`${activeShape.label} (4)`}
        aria-pressed={isShapeActive}
        title={`${activeShape.label} (4)`}
        className={cn(
          'flex items-center gap-0.5 rounded-xl p-2.5 text-text-muted transition-all hover:bg-accent-subtle hover:text-accent',
          isShapeActive && 'bg-accent-subtle text-accent',
        )}
      >
        <ActiveIcon size={18} aria-hidden />
        <ChevronRight size={10} aria-hidden className="opacity-50" />
      </button>

      {open && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex gap-1 rounded-xl border border-border p-1.5 shadow-lg"
          style={{ backgroundColor: 'var(--bg-overlay)', backdropFilter: `blur(var(--panel-blur))` }}
        >
          {shapeTools.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => {
                setSelectedTool(id)
                setOpen(false)
              }}
              title={label}
              className={cn(
                'rounded-lg p-2 text-text-muted transition-all hover:bg-accent-subtle hover:text-accent',
                selectedTool === id && 'bg-accent-subtle text-accent',
              )}
            >
              <Icon size={16} aria-hidden />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main toolbar ────────────────────────────────────────────

const topTools = [
  { id: 'select' as Tool, icon: MousePointer2, label: 'Select', shortcut: '1' },
  { id: 'marquee' as Tool, icon: BoxSelect, label: 'Marquee Select', shortcut: '2' },
  { id: 'note' as Tool, icon: StickyNote, label: 'Sticky Note', shortcut: '3' },
  { id: 'text' as Tool, icon: Type, label: 'Text', shortcut: '4' },
]

const bottomTools = [
  { id: 'arrow' as Tool, icon: ArrowUpRight, label: 'Arrow', shortcut: '6' },
  { id: 'freehand' as Tool, icon: Pencil, label: 'Freehand', shortcut: '7' },
]

export function ToolPanel() {
  const selectedTool = useUIStore((s) => s.selectedTool)
  const setSelectedTool = useUIStore((s) => s.setSelectedTool)

  return (
    <nav
      aria-label="Drawing tools"
      role="toolbar"
      className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1 rounded-2xl border border-border p-1.5 shadow-lg transition-colors"
      style={{ backgroundColor: 'var(--bg-overlay)', backdropFilter: `blur(var(--panel-blur))` }}
    >
      {topTools.map(({ id, icon: Icon, label, shortcut }) => (
        <button
          key={id}
          onClick={() => setSelectedTool(id)}
          aria-label={`${label} (${shortcut})`}
          aria-pressed={selectedTool === id}
          title={`${label} (${shortcut})`}
          className={cn(
            'rounded-xl p-2.5 text-text-muted transition-all hover:bg-accent-subtle hover:text-accent',
            selectedTool === id && 'bg-accent-subtle text-accent',
          )}
        >
          <Icon size={18} aria-hidden />
        </button>
      ))}

      {/* Shape picker with flyout */}
      <ShapePicker />

      {bottomTools.map(({ id, icon: Icon, label, shortcut }) => (
        <button
          key={id}
          onClick={() => setSelectedTool(id)}
          aria-label={`${label} (${shortcut})`}
          aria-pressed={selectedTool === id}
          title={`${label} (${shortcut})`}
          className={cn(
            'rounded-xl p-2.5 text-text-muted transition-all hover:bg-accent-subtle hover:text-accent',
            selectedTool === id && 'bg-accent-subtle text-accent',
          )}
        >
          <Icon size={18} aria-hidden />
        </button>
      ))}
    </nav>
  )
}
