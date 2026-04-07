'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { BoardItem } from '@/app/stores/board-store'
import { useBoardStore } from '@/app/stores/board-store'
import { useUIStore } from '@/app/stores/ui-store'
import { track } from '@/lib/analytics'
import { cn, fontMap } from '@/lib/utils'

// ── Text content (shared by note, text, and shapes with text) ──

// Trailing punctuation that's commonly part of sentences is excluded so
// URLs don't swallow it.
const URL_REGEX = /\b((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)\]'"])/gi

function renderWithLinks(text: string, linkClass: string): React.ReactNode[] {
  // Cheap test: if no URL prefix appears, skip the regex entirely.
  if (text.indexOf('http') === -1 && text.indexOf('www.') === -1) return [text]
  const out: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0
  text.replace(URL_REGEX, (match, _g, offset: number) => {
    if (offset > lastIndex) out.push(text.slice(lastIndex, offset))
    const href = match.startsWith('http') ? match : `https://${match}`
    out.push(
      <a
        key={`l${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        draggable={false}
        className={linkClass}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDragStart={(e) => e.preventDefault()}
      >
        {match}
      </a>,
    )
    lastIndex = offset + match.length
    return match
  })
  if (lastIndex < text.length) out.push(text.slice(lastIndex))
  return out.length === 0 ? [text] : out
}

function TextDisplay({ item }: { item: BoardItem }) {
  const placeholder = item.type === 'note' ? 'Empty note' : item.type === 'text' ? 'Empty text' : ''
  const linkClass = item.type === 'note'
    ? 'underline decoration-zinc-500/60 underline-offset-2 hover:text-accent'
    : 'underline decoration-current/60 underline-offset-2 text-accent hover:opacity-80'
  const rendered = useMemo(
    () => (item.content ? renderWithLinks(item.content, linkClass) : null),
    [item.content, linkClass],
  )
  return (
    <p
      className="leading-snug whitespace-pre-wrap break-words"
      style={{
        fontSize: item.fontSize,
        fontFamily: fontMap[item.fontFamily] || fontMap.sans,
        color: item.type === 'note' ? '#27272a' : 'var(--text)',
      }}
    >
      {rendered ?? (placeholder && <span className="italic text-text-muted">{placeholder}</span>)}
    </p>
  )
}

// ── Per-type renderers ──────────────────────────────────────

function NoteContent({ item }: { item: BoardItem }) {
  return (
    <div className="h-full w-full" style={{ padding: item.padding }}>
      <TextDisplay item={item} />
    </div>
  )
}

function TextContent({ item }: { item: BoardItem }) {
  return (
    <div className="h-full w-full" style={{ padding: item.padding }}>
      <TextDisplay item={item} />
    </div>
  )
}

function RectContent({ item }: { item: BoardItem }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-md"
      style={{
        border: `${item.strokeWidth}px solid ${item.strokeColor}`,
        backgroundColor: item.color === 'transparent' ? undefined : item.color,
        padding: item.padding,
      }}
    >
      {item.content && <TextDisplay item={item} />}
    </div>
  )
}

function TriangleContent({ item }: { item: BoardItem }) {
  const w = item.width
  const h = item.height
  const sw = item.strokeWidth
  const pts = `${w / 2},${sw} ${w - sw},${h - sw} ${sw},${h - sw}`
  return (
    <div className="relative h-full w-full">
      <svg className="absolute inset-0 h-full w-full">
        <polygon
          points={pts}
          fill={item.color === 'transparent' ? 'none' : item.color}
          stroke={item.strokeColor}
          strokeWidth={item.strokeWidth}
          strokeLinejoin="round"
        />
      </svg>
      {item.content && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ padding: item.padding, paddingTop: item.padding * 2 }}
        >
          <TextDisplay item={item} />
        </div>
      )}
    </div>
  )
}

function CircleContent({ item }: { item: BoardItem }) {
  return (
    <div className="relative h-full w-full">
      <svg className="absolute inset-0 h-full w-full">
        <ellipse
          cx="50%" cy="50%"
          rx={item.width / 2 - item.strokeWidth}
          ry={item.height / 2 - item.strokeWidth}
          fill={item.color === 'transparent' ? 'none' : item.color}
          stroke={item.strokeColor}
          strokeWidth={item.strokeWidth}
        />
      </svg>
      {item.content && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ padding: item.padding }}
        >
          <TextDisplay item={item} />
        </div>
      )}
    </div>
  )
}

function ArrowContent({ item }: { item: BoardItem }) {
  const pts = item.points
  if (!pts || pts.length < 2) return null
  const [start, end] = pts
  const dx = end.x - start.x
  const dy = end.y - start.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return null

  const headLen = Math.min(12, len * 0.3)
  const angle = Math.atan2(dy, dx)
  const a1x = end.x - headLen * Math.cos(angle - Math.PI / 6)
  const a1y = end.y - headLen * Math.sin(angle - Math.PI / 6)
  const a2x = end.x - headLen * Math.cos(angle + Math.PI / 6)
  const a2y = end.y - headLen * Math.sin(angle + Math.PI / 6)

  return (
    <svg className="absolute inset-0 h-full w-full overflow-visible" style={{ pointerEvents: 'none' }}>
      <line
        x1={start.x} y1={start.y} x2={end.x} y2={end.y}
        stroke={item.strokeColor} strokeWidth={item.strokeWidth} strokeLinecap="round"
      />
      <polyline
        points={`${a1x},${a1y} ${end.x},${end.y} ${a2x},${a2y}`}
        fill="none" stroke={item.strokeColor} strokeWidth={item.strokeWidth}
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

function EmojiContent({ item }: { item: BoardItem }) {
  return (
    <div className="flex h-full w-full select-none items-center justify-center leading-none">
      <span style={{ fontSize: Math.min(item.width, item.height) * 0.85, lineHeight: 1 }}>
        {item.content || '😀'}
      </span>
    </div>
  )
}

function FreehandContent({ item }: { item: BoardItem }) {
  const pts = item.points
  if (!pts || pts.length < 2) return null

  const d = pts.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
  }, '')

  return (
    <svg className="absolute inset-0 h-full w-full overflow-visible" style={{ pointerEvents: 'none' }}>
      <path
        d={d}
        fill="none"
        stroke={item.strokeColor}
        strokeWidth={item.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const readOnlyByType: Record<BoardItem['type'], React.FC<{ item: BoardItem }>> = {
  note: NoteContent,
  text: TextContent,
  rect: RectContent,
  triangle: TriangleContent,
  circle: CircleContent,
  arrow: ArrowContent,
  freehand: FreehandContent,
  emoji: EmojiContent,
}

// ── Editable types (double-click to type text) ──────────────

// Emoji items are changed via the FontPanel picker, not inline typing.
const editableTypes = new Set<BoardItem['type']>(['note', 'text', 'rect', 'triangle', 'circle'])

// ── Inline editor ───────────────────────────────────────────

function ItemEditor({ item }: { item: BoardItem }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const valueRef = useRef(item.content)
  const discarded = useRef(false)

  useEffect(() => {
    return () => {
      if (discarded.current) return
      const value = valueRef.current
      if (value !== item.content) {
        useBoardStore.getState().updateItem(item.id, { content: value })
        track('item_edited', { type: item.type })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <textarea
      ref={ref}
      autoFocus
      defaultValue={item.content}
      placeholder={item.type === 'note' ? 'Type a note…' : 'Type here…'}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={() => { valueRef.current = ref.current?.value ?? '' }}
      onBlur={() => {
        const value = valueRef.current
        if (value !== item.content) {
          useBoardStore.getState().updateItem(item.id, { content: value })
          track('item_edited', { type: item.type })
        }
        discarded.current = true
        useUIStore.getState().setEditingItemId(null)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          discarded.current = true
          useUIStore.getState().setEditingItemId(null)
        }
        e.stopPropagation()
      }}
      className="h-full w-full resize-none bg-transparent outline-none leading-snug whitespace-pre-wrap break-words placeholder:italic placeholder:text-text-muted"
      style={{
        fontSize: item.fontSize,
        fontFamily: fontMap[item.fontFamily] || fontMap.sans,
        color: item.type === 'note' ? '#27272a' : 'var(--text)',
      }}
    />
  )
}

// ── Resize handle ───────────────────────────────────────────

const MIN_SIZE = 40

function ResizeHandle({ itemId }: { itemId: string }) {
  const dragRef = useRef<{ px: number; py: number; w: number; h: number } | null>(null)

  function onPointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const item = useBoardStore.getState().items[itemId]
    if (!item) return
    dragRef.current = { px: e.clientX, py: e.clientY, w: item.width, h: item.height }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const zoom = useUIStore.getState().zoom
    const dx = (e.clientX - dragRef.current.px) / zoom
    const dy = (e.clientY - dragRef.current.py) / zoom
    useBoardStore.getState().updateItem(itemId, {
      width: Math.max(MIN_SIZE, dragRef.current.w + dx),
      height: Math.max(MIN_SIZE, dragRef.current.h + dy),
    })
  }

  function onPointerUp() {
    dragRef.current = null
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-accent bg-bg-elevated"
    />
  )
}

// ── Drag state ──────────────────────────────────────────────

interface DragState {
  pointerId: number
  startX: number
  startY: number
  itemX: number
  itemY: number
}

// ── Item shell ──────────────────────────────────────────────

export function BoardItemView({ item }: { item: BoardItem }) {
  const selectedIds = useUIStore((s) => s.selectedIds)
  const editingItemId = useUIStore((s) => s.editingItemId)
  const storeMode = useUIStore((s) => s.mode)
  const isSelected = selectedIds.has(item.id)
  const isEditing = editingItemId === item.id
  const isViewOnly = storeMode === 'viewer'
  const dragRef = useRef<DragState | null>(null)
  const isEditable = !isViewOnly && editableTypes.has(item.type)
  const isResizable = !isViewOnly && item.type !== 'arrow' && item.type !== 'freehand'
  const isSvgOnly = item.type === 'arrow' || item.type === 'freehand'

  const ReadOnly = readOnlyByType[item.type]

  // Safety net: clear any in-flight drag state when the pointer is released
  // anywhere (or focus is lost). Without this, a click that doesn't fire a
  // matching pointerup on the item itself (e.g. release outside the window,
  // pointercancel from a swipe gesture, focus loss) leaves dragRef populated
  // — and the next pointermove over the item silently snaps it to the cursor.
  useEffect(() => {
    function clearDrag() {
      dragRef.current = null
    }
    window.addEventListener('pointerup', clearDrag)
    window.addEventListener('pointercancel', clearDrag)
    window.addEventListener('blur', clearDrag)
    return () => {
      window.removeEventListener('pointerup', clearDrag)
      window.removeEventListener('pointercancel', clearDrag)
      window.removeEventListener('blur', clearDrag)
    }
  }, [])

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return
    e.stopPropagation()
    if (isEditing) return
    if (isViewOnly) return // No drag in viewer mode

    // Ctrl/Cmd+click for additive (multi) selection.
    // If the item is already part of a multi-selection, preserve it so the
    // user can drag the whole group together.
    const additive = e.ctrlKey || e.metaKey
    const currentIds = useUIStore.getState().selectedIds
    const alreadyInGroup = currentIds.size > 1 && currentIds.has(item.id)
    if (!alreadyInGroup) {
      useUIStore.getState().selectItem(item.id, additive)
    }

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      itemX: item.x,
      itemY: item.y,
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag || e.pointerId !== drag.pointerId) return

    if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.setPointerCapture(e.pointerId)
      const z = useBoardStore.getState().nextZIndex()
      useBoardStore.getState().updateItem(item.id, { zIndex: z })
    }

    const zoom = useUIStore.getState().zoom
    const dx = (e.clientX - drag.startX) / zoom
    const dy = (e.clientY - drag.startY) / zoom
    drag.startX = e.clientX
    drag.startY = e.clientY

    // Move all selected items together
    const ids = useUIStore.getState().selectedIds
    if (ids.size > 1 && ids.has(item.id)) {
      const store = useBoardStore.getState()
      for (const id of ids) {
        const it = store.items[id]
        if (it) store.updateItem(id, { x: it.x + dx, y: it.y + dy })
      }
    } else {
      drag.itemX += dx
      drag.itemY += dy
      useBoardStore.getState().updateItem(item.id, { x: drag.itemX, y: drag.itemY })
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null
  }

  function onDoubleClick(e: React.MouseEvent) {
    if (!isEditable) return
    e.stopPropagation()
    dragRef.current = null
    useUIStore.getState().setEditingItemId(item.id)
  }

  // For shapes with text editing: show editor overlay
  const isShapeWithEditor = isEditing && (item.type === 'rect' || item.type === 'triangle' || item.type === 'circle')

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      className={cn(
        'absolute pointer-events-auto',
        !isEditing && 'select-none cursor-grab active:cursor-grabbing',
        item.type === 'note' && 'rounded-xl',
        item.type === 'text' && 'rounded-lg',
        item.type === 'rect' && 'rounded-lg',
      )}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: isSvgOnly ? Math.max(item.height, 20) : item.height,
        zIndex: item.zIndex,
        backgroundColor: item.type === 'note' ? item.color : undefined,
        boxShadow: isSelected
          ? '0 0 0 2px var(--accent), 0 0 16px color-mix(in srgb, var(--accent) 30%, transparent)'
          : item.type === 'note' ? 'var(--item-shadow)' : undefined,
        borderRadius: isSvgOnly && isSelected ? 4 : undefined,
      }}
    >
      {/* Note/text: inline editor replaces content */}
      {isEditable && !isShapeWithEditor && (item.type === 'note' || item.type === 'text') ? (
        isEditing ? (
          <div className="h-full w-full" style={{ padding: item.padding }}>
            <ItemEditor item={item} />
          </div>
        ) : (
          <ReadOnly item={item} />
        )
      ) : isShapeWithEditor ? (
        // Shape with editor overlay
        <>
          <ReadOnly item={item} />
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ padding: item.padding }}
          >
            <ItemEditor item={item} />
          </div>
        </>
      ) : (
        <ReadOnly item={item} />
      )}

      {isSelected && isResizable && <ResizeHandle itemId={item.id} />}
    </div>
  )
}
