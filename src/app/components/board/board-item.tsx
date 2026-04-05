'use client'

import { useEffect, useRef } from 'react'
import type { BoardItem } from '@/app/stores/board-store'
import { useBoardStore } from '@/app/stores/board-store'
import { useUIStore } from '@/app/stores/ui-store'
import { track } from '@/lib/analytics'
import { cn, fontMap } from '@/lib/utils'

// ── Text content (shared by note, text, and shapes with text) ──

function TextDisplay({ item }: { item: BoardItem }) {
  const placeholder = item.type === 'note' ? 'Empty note' : item.type === 'text' ? 'Empty text' : ''
  return (
    <p
      className="leading-snug whitespace-pre-wrap break-words"
      style={{
        fontSize: item.fontSize,
        fontFamily: fontMap[item.fontFamily] || fontMap.sans,
        color: item.type === 'note' ? '#27272a' : 'var(--text)',
      }}
    >
      {item.content || (placeholder && <span className="italic text-text-muted">{placeholder}</span>)}
    </p>
  )
}

// ── Per-type renderers ──────────────────────────────────────

function NoteContent({ item }: { item: BoardItem }) {
  return (
    <div className="h-full w-full p-3">
      <TextDisplay item={item} />
    </div>
  )
}

function TextContent({ item }: { item: BoardItem }) {
  return (
    <div className="h-full w-full p-2">
      <TextDisplay item={item} />
    </div>
  )
}

function RectContent({ item }: { item: BoardItem }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-md p-3"
      style={{
        border: `${item.strokeWidth}px solid ${item.strokeColor}`,
        backgroundColor: item.color === 'transparent' ? undefined : item.color,
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
        <div className="absolute inset-0 flex items-center justify-center p-4 pt-8">
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
        <div className="absolute inset-0 flex items-center justify-center p-4">
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
}

// ── Editable types (double-click to type text) ──────────────

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

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return
    e.stopPropagation()
    if (isEditing) return
    if (isViewOnly) return // No drag in viewer mode

    // Ctrl/Cmd+click for additive (multi) selection
    const additive = e.ctrlKey || e.metaKey
    useUIStore.getState().selectItem(item.id, additive)

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
        <div className={cn('h-full w-full', item.type === 'note' ? 'p-3' : 'p-2')}>
          {isEditing ? <ItemEditor item={item} /> : <ReadOnly item={item} />}
        </div>
      ) : isShapeWithEditor ? (
        // Shape with editor overlay
        <>
          <ReadOnly item={item} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
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
