'use client'

import { useEffect, useRef, useState } from 'react'
import { EMOJI_CATEGORIES } from '@/lib/emoji-data'
import { cn } from '@/lib/utils'

interface EmojiPickerProps {
  value?: string
  onPick: (emoji: string) => void
  onClose?: () => void
  /** Render as a popover (with backdrop dismissal) — defaults to inline. */
  popover?: boolean
}

export function EmojiPicker({ value, onPick, onClose, popover }: EmojiPickerProps) {
  const [activeCat, setActiveCat] = useState(EMOJI_CATEGORIES[0].id)
  const ref = useRef<HTMLDivElement>(null)

  // Outside-click dismissal for popover mode
  useEffect(() => {
    if (!popover || !onClose) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose!()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose!()
    }
    // Defer registration so the click that opened us doesn't immediately close it
    const t = setTimeout(() => {
      window.addEventListener('mousedown', onDown)
      window.addEventListener('keydown', onKey)
    }, 0)
    return () => {
      clearTimeout(t)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [popover, onClose])

  const cat = EMOJI_CATEGORIES.find((c) => c.id === activeCat) ?? EMOJI_CATEGORIES[0]

  return (
    <div
      ref={ref}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        'flex w-64 flex-col gap-2 rounded-2xl border border-border p-2 shadow-xl',
        popover && 'absolute z-30',
      )}
      style={{ backgroundColor: 'var(--bg-overlay)', backdropFilter: 'blur(var(--panel-blur))' }}
    >
      {/* Category tabs */}
      <div className="flex gap-0.5 overflow-x-auto">
        {EMOJI_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCat(c.id)}
            title={c.label}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-base hover:bg-accent-subtle',
              activeCat === c.id && 'bg-accent-subtle',
            )}
          >
            {c.icon}
          </button>
        ))}
      </div>

      {/* Grid — scrollable */}
      <div className="grid h-72 grid-cols-8 gap-0.5 overflow-y-auto pr-1">
        {cat.emojis.map((e, i) => (
          <button
            key={`${e}-${i}`}
            onClick={() => onPick(e)}
            title={e}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md text-lg hover:bg-accent-subtle',
              value === e && 'bg-accent-subtle ring-1 ring-accent',
            )}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}
