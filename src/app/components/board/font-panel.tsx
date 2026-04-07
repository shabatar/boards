'use client'

import { useUIStore } from '@/app/stores/ui-store'
import { useBoardStore } from '@/app/stores/board-store'
import { cn, fontMap } from '@/lib/utils'
import { createPersistedValue } from '@/lib/persisted-value'
import { Check, ArrowUp, ArrowDown, Pipette } from 'lucide-react'
import { EmojiPicker } from './emoji-picker'
import { setCurrentEmoji } from '@/app/stores/emoji-pref'

// ── Recently used colors (persisted in localStorage) ────────

const RECENT_MAX = 3
const recentColorsPref = createPersistedValue<string[]>('boards.recentColors', [])

function pushRecent(color: string) {
  if (!color || color === 'transparent') return
  const current = recentColorsPref.get()
  recentColorsPref.set([color, ...current.filter((c) => c !== color)].slice(0, RECENT_MAX))
}

// Chromium-only EyeDropper API. Falls back gracefully when unsupported.
type EyeDropperResult = { sRGBHex: string }
type EyeDropperCtor = new () => { open: () => Promise<EyeDropperResult> }
declare global {
  interface Window { EyeDropper?: EyeDropperCtor }
}

async function pickColorFromScreen(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.EyeDropper) return null
  try {
    const result = await new window.EyeDropper().open()
    return result.sRGBHex
  } catch {
    return null // user cancelled
  }
}

// ── Color palette ───────────────────────────────────────────

const noteColors = [
  { id: '#fef08a', label: 'Lemon' },
  { id: '#fde68a', label: 'Amber' },
  { id: '#fed7aa', label: 'Peach' },
  { id: '#fecaca', label: 'Rose' },
  { id: '#fbcfe8', label: 'Pink' },
  { id: '#e9d5ff', label: 'Lavender' },
  { id: '#c4b5fd', label: 'Violet' },
  { id: '#a5b4fc', label: 'Indigo' },
  { id: '#bfdbfe', label: 'Sky' },
  { id: '#a5f3fc', label: 'Cyan' },
  { id: '#99f6e4', label: 'Teal' },
  { id: '#bbf7d0', label: 'Mint' },
]

const shapeColors = [
  { id: 'transparent', label: 'None' },
  { id: '#fef9c3', label: 'Cream' },
  { id: '#fef08a', label: 'Lemon' },
  { id: '#fed7aa', label: 'Peach' },
  { id: '#fecaca', label: 'Rose' },
  { id: '#fbcfe8', label: 'Pink' },
  { id: '#e9d5ff', label: 'Lavender' },
  { id: '#c4b5fd', label: 'Violet' },
  { id: '#a5b4fc', label: 'Indigo' },
  { id: '#bfdbfe', label: 'Sky' },
  { id: '#99f6e4', label: 'Teal' },
  { id: '#bbf7d0', label: 'Mint' },
]

const strokeColors = [
  { id: '#fafafa', label: 'White' },
  { id: '#18181b', label: 'Charcoal' },
  { id: '#71717a', label: 'Gray' },
  { id: '#dc2626', label: 'Red' },
  { id: '#ea580c', label: 'Orange' },
  { id: '#ca8a04', label: 'Gold' },
  { id: '#16a34a', label: 'Green' },
  { id: '#0891b2', label: 'Teal' },
  { id: '#2563eb', label: 'Blue' },
  { id: '#7c3aed', label: 'Violet' },
  { id: '#c026d3', label: 'Fuchsia' },
  { id: '#f472b6', label: 'Pink' },
]

// ── Font options ────────────────────────────────────────────

const sizes = [12, 14, 16, 20, 24, 32]
const families = [
  { id: 'sans', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'mono', label: 'Mono' },
  { id: 'consolas', label: 'Consolas' },
]

// ── Color swatch grid ───────────────────────────────────────

function ColorGrid({
  colors,
  value,
  onChange,
}: {
  colors: { id: string; label: string }[]
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {colors.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          title={c.label}
          className={cn(
            'relative h-6 w-6 rounded-md border transition-transform hover:scale-110',
            c.id === 'transparent' ? 'border-border bg-bg-surface' : 'border-transparent',
            value === c.id && 'ring-2 ring-accent ring-offset-1',
          )}
          style={{
            backgroundColor: c.id === 'transparent' ? undefined : c.id,
          }}
        >
          {c.id === 'transparent' && (
            <span className="absolute inset-0 flex items-center justify-center text-[8px] text-text-muted">∅</span>
          )}
          {value === c.id && c.id !== 'transparent' && (
            <Check size={12} className="absolute inset-0 m-auto text-zinc-700/70" />
          )}
        </button>
      ))}
    </div>
  )
}

// ── Panel ───────────────────────────────────────────────────

export function FontPanel() {
  const selectedIds = useUIStore((s) => s.selectedIds)
  // Show panel only for single selection
  const singleId = selectedIds.size === 1 ? [...selectedIds][0] : null
  const item = useBoardStore((s) => singleId ? s.items[singleId] : null)
  const recentColors = recentColorsPref.useValue()

  if (!item) return null

  const isTextual = item.type === 'note' || item.type === 'text'
  const isEmoji = item.type === 'emoji'
  const hasColor = item.type === 'note' || item.type === 'rect' || item.type === 'triangle' || item.type === 'circle'
  const hasStroke = item.type === 'rect' || item.type === 'arrow' || item.type === 'triangle' || item.type === 'circle' || item.type === 'freehand'
  const hasPadding = item.type !== 'arrow' && item.type !== 'freehand' && item.type !== 'emoji'

  if (!isTextual && !hasColor && !hasStroke && !isEmoji) return null

  function update(patch: Record<string, unknown>) {
    if (!item) return
    useBoardStore.getState().updateItem(item.id, patch)
  }

  return (
    <div
      className="absolute right-3 top-[56px] z-20 flex flex-col gap-3 rounded-2xl border border-border p-2.5 shadow-lg transition-colors"
      style={{ backgroundColor: 'var(--bg-overlay)', backdropFilter: `blur(var(--panel-blur))` }}
    >
      {/* Emoji glyph picker */}
      {isEmoji && (
        <div className="flex flex-col gap-1">
          <span className="px-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">Emoji</span>
          <EmojiPicker
            value={item.content}
            onPick={(emoji) => { update({ content: emoji }); setCurrentEmoji(emoji) }}
          />
        </div>
      )}

      {/* Color */}
      {hasColor && (
        <div className="flex flex-col gap-1.5">
          <span className="px-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">Color</span>
          <ColorGrid
            colors={item.type === 'note' ? noteColors : shapeColors}
            value={item.color}
            onChange={(color) => { update({ color }); pushRecent(color) }}
          />
          {recentColors.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="px-1 text-[9px] uppercase tracking-wider text-text-muted/80">Recent</span>
              <div className="flex gap-1">
                {recentColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => update({ color: c })}
                    title={c}
                    className={cn(
                      'relative h-6 w-6 rounded-md border transition-transform hover:scale-110',
                      c === 'transparent' ? 'border-border bg-bg-surface' : 'border-transparent',
                      item.color === c && 'ring-2 ring-accent ring-offset-1',
                    )}
                    style={{ backgroundColor: c === 'transparent' ? undefined : c }}
                  >
                    {item.color === c && c !== 'transparent' && (
                      <Check size={12} className="absolute inset-0 m-auto text-zinc-700/70" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-0.5 flex items-center gap-2 px-1 text-[10px] text-text-muted">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="color"
                value={item.color === 'transparent' ? '#ffffff' : item.color}
                onChange={(e) => { update({ color: e.target.value }); pushRecent(e.target.value) }}
                className="h-5 w-5 cursor-pointer rounded border border-border bg-transparent p-0"
                title="Custom color"
              />
              Custom
            </label>
            <button
              type="button"
              onClick={async () => {
                const picked = await pickColorFromScreen()
                if (picked) {
                  update({ color: picked })
                  pushRecent(picked)
                } else if (typeof window !== 'undefined' && !window.EyeDropper) {
                  alert('Eyedropper not supported in this browser. Try Chrome or Edge.')
                }
              }}
              title="Pick color from screen"
              className="flex h-5 w-5 items-center justify-center rounded border border-border hover:bg-accent-subtle hover:text-accent"
            >
              <Pipette size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Stroke color */}
      {hasStroke && (
        <div className="flex flex-col gap-1.5">
          <span className="px-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">Stroke</span>
          <ColorGrid
            colors={strokeColors}
            value={item.strokeColor}
            onChange={(strokeColor) => update({ strokeColor })}
          />
        </div>
      )}

      {/* Font size */}
      {isTextual && (
        <div className="flex flex-col gap-1">
          <span className="px-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">Size</span>
          <div className="grid grid-cols-3 gap-0.5">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => update({ fontSize: s })}
                className={cn(
                  'rounded-lg px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-accent-subtle hover:text-accent',
                  item.fontSize === s && 'bg-accent-subtle font-medium text-accent',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Padding */}
      {hasPadding && (
        <div className="flex flex-col gap-1">
          <span className="px-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">
            Padding · {item.padding}px
          </span>
          <input
            type="range"
            min={0}
            max={48}
            step={1}
            value={item.padding}
            onChange={(e) => update({ padding: Number(e.target.value) })}
            className="h-1 w-full cursor-pointer accent-accent"
          />
        </div>
      )}

      {/* Font family */}
      {isTextual && (
        <div className="flex flex-col gap-1">
          <span className="px-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">Font</span>
          <div className="flex flex-col gap-0.5">
            {families.map((f) => (
              <button
                key={f.id}
                onClick={() => update({ fontFamily: f.id })}
                style={{ fontFamily: fontMap[f.id] }}
                className={cn(
                  'rounded-lg px-2 py-1 text-left text-xs text-text-secondary transition-colors hover:bg-accent-subtle hover:text-accent',
                  item.fontFamily === f.id && 'bg-accent-subtle font-medium text-accent',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Layer order */}
      <div className="flex flex-col gap-1">
        <span className="px-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">Layer</span>
        <div className="flex gap-1">
          <button
            onClick={() => {
              if (!item) return
              useBoardStore.getState().updateItem(item.id, { zIndex: useBoardStore.getState().nextZIndex() })
              useBoardStore.getState().flushAll()
            }}
            title="Bring forward (])"
            className="flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-secondary hover:bg-accent-subtle hover:text-accent"
          >
            <ArrowUp size={12} /> Front
          </button>
          <button
            onClick={() => {
              if (!item) return
              const all = Object.values(useBoardStore.getState().items)
              const minZ = all.length > 0 ? Math.min(...all.map(i => i.zIndex)) : 0
              useBoardStore.getState().updateItem(item.id, { zIndex: minZ - 1 })
              useBoardStore.getState().flushAll()
            }}
            title="Send back ([)"
            className="flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-secondary hover:bg-accent-subtle hover:text-accent"
          >
            <ArrowDown size={12} /> Back
          </button>
        </div>
      </div>
    </div>
  )
}
