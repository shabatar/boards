'use client'

import { useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useUIStore } from '@/app/stores/ui-store'
import { useBoardStore, type BoardItem } from '@/app/stores/board-store'
import { usePanZoom } from '@/app/hooks/use-pan-zoom'
import { track } from '@/lib/analytics'
import { setShareToken } from '@/lib/board-repo-actions'
import { createItem, getDefaultSize } from '@/lib/item-factory'
import { getCurrentEmoji } from '@/app/stores/emoji-pref'
import { useRealtimeBoard } from '@/app/hooks/use-realtime-board'
import { usePollBoard } from '@/app/hooks/use-poll-board'
import { fetchBoardItems } from '@/lib/poll-actions'
import { ThemeToggle } from '@/app/components/theme-toggle'
import { BoardSwitcher } from './board-switcher'
import { ToolPanel } from './toolbar'
import { FontPanel } from './font-panel'
import { ShareDialog } from './share-dialog'
import { ZoomControls } from './zoom-controls'
import { BoardItemView } from './board-item'

// Tools that use drag-to-draw (start corner, drag to set size)
const dragDrawTools = new Set(['arrow', 'freehand', 'rect', 'triangle', 'circle'])

// Tools that are click-to-place (click to center item)
const clickPlaceTools = new Set(['note', 'text', 'emoji'])

// Magic prefix used to round-trip board items through the system clipboard.
// We write JSON with this prefix on internal copy/cut, and detect it on
// paste to distinguish "rich" board paste from a plain-text paste.
const CLIPBOARD_MARKER = 'boards/v1:'

interface ClipboardPayload {
  __boards: 1
  items: BoardItem[]
}

/** Convert screen coords to board coords. */
function screenToBoardCoords(
  clientX: number,
  clientY: number,
  canvasEl: HTMLElement,
) {
  const rect = canvasEl.getBoundingClientRect()
  const { panX, panY, zoom } = useUIStore.getState()
  return {
    x: (clientX - rect.left - panX) / zoom,
    y: (clientY - rect.top - panY) / zoom,
  }
}

function viewportCenterBoardCoords(canvasEl: HTMLElement) {
  const rect = canvasEl.getBoundingClientRect()
  return screenToBoardCoords(rect.left + rect.width / 2, rect.top + rect.height / 2, canvasEl)
}

/** Deep-clone an item (including its `points` array) so later mutations
 *  to the original don't shift what was copied. */
function cloneItem(item: BoardItem): BoardItem {
  return { ...item, points: item.points ? item.points.map((p) => ({ ...p })) : null }
}

function snapshotSelected(ids: Iterable<string>): BoardItem[] {
  const store = useBoardStore.getState()
  const out: BoardItem[] = []
  for (const id of ids) {
    const it = store.items[id]
    if (it) out.push(cloneItem(it))
  }
  return out
}

function writeItemsToClipboard(items: BoardItem[]) {
  const payload: ClipboardPayload = { __boards: 1, items }
  navigator.clipboard?.writeText(CLIPBOARD_MARKER + JSON.stringify(payload)).catch(() => {})
}

/** Centroid-anchor a clipboard group at the cursor and add each item. */
function pasteItemsAt(items: BoardItem[], anchor: { x: number; y: number }, boardId: string) {
  let cx = 0, cy = 0
  for (const s of items) { cx += s.x + s.width / 2; cy += s.y + s.height / 2 }
  cx /= items.length
  cy /= items.length
  const dx = anchor.x - cx
  const dy = anchor.y - cy
  const store = useBoardStore.getState()
  let z = store.nextZIndex()
  const newIds = new Set<string>()
  for (const source of items) {
    const pasted: BoardItem = {
      ...source,
      id: crypto.randomUUID(),
      boardId,
      x: source.x + dx,
      y: source.y + dy,
      zIndex: z++,
    }
    store.addItem(pasted)
    newIds.add(pasted.id)
  }
  useUIStore.getState().setSelectedIds(newIds)
}

/** Create a text item containing arbitrary string content at a board point. */
function createTextItemAt(
  content: string,
  anchor: { x: number; y: number },
  boardId: string,
  userId: string | null,
  source: 'system_paste' | 'drop',
) {
  const item = createItem({
    boardId,
    type: 'text',
    x: anchor.x,
    y: anchor.y,
    zIndex: useBoardStore.getState().nextZIndex(),
    createdBy: userId,
  })
  item.content = content
  const lines = content.split('\n').length
  item.height = Math.max(item.height, 24 + lines * (item.fontSize + 4))
  useBoardStore.getState().addItem(item)
  useUIStore.getState().selectItem(item.id)
  track('item_created', { type: 'text', source })
}

interface BoardCanvasProps {
  boardId: string
  boardTitle: string
  ownerId: string
  initialItems: BoardItem[]
  userId: string | null
  /** 'editor' (default) = full access, 'viewer' = read-only (pan/zoom only) */
  mode?: 'editor' | 'viewer'
  /** True when user is authenticated (show board switcher, share) */
  isAuthenticated?: boolean
  /** Share token for anonymous access (polling & writes) */
  shareToken?: string
}

export function BoardCanvas({ boardId, boardTitle, ownerId, initialItems, userId, mode = 'editor', isAuthenticated = true, shareToken }: BoardCanvasProps) {
  const isReadOnly = mode === 'viewer'
  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const hydratedRef = useRef(false)
  const drawingRef = useRef<{ itemId: string; startX: number; startY: number } | null>(null)
  const lastCreateClickRef = useRef<{ time: number; x: number; y: number } | null>(null)
  // Cursor in board coords — used as the paste/drop anchor.
  const cursorBoardRef = useRef<{ x: number; y: number } | null>(null)

  const panX = useUIStore((s) => s.panX)
  const panY = useUIStore((s) => s.panY)
  const zoom = useUIStore((s) => s.zoom)
  const isPanning = useUIStore((s) => s.isPanning)
  const selectedTool = useUIStore((s) => s.selectedTool)
  const items = useBoardStore((s) => s.items)
  const marquee = useUIStore((s) => s.marquee)

  usePanZoom(viewportRef)
  // Realtime for fast updates (authenticated only)
  useRealtimeBoard(isAuthenticated ? boardId : '')
  // Polling as fallback for all users — catches admin-client writes
  // that realtime may miss, and serves as primary sync for anonymous users
  const pollFn = useCallback(() => fetchBoardItems(boardId, shareToken), [boardId, shareToken])
  usePollBoard(pollFn, isAuthenticated ? 5000 : 3000)

  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    useBoardStore.getState().hydrate(boardId, initialItems)
    useUIStore.getState().setMode(mode)
    if (shareToken) setShareToken(shareToken)
    track('board_opened', { boardId, itemCount: initialItems.length })
  }, [boardId, initialItems, mode, shareToken])

  useEffect(() => {
    return () => useBoardStore.getState().flushAll()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (useUIStore.getState().editingItemId) return
      if (isReadOnly) return // No shortcuts in viewer mode
      switch (e.key) {
        case 'Delete':
        case 'Backspace': {
          const ids = useUIStore.getState().selectedIds
          if (ids.size > 0) {
            for (const id of ids) useBoardStore.getState().removeItem(id)
            useUIStore.getState().deselectAll()
            toast.success(`${ids.size} item${ids.size > 1 ? 's' : ''} deleted`, { id: 'item-deleted', duration: 1500 })
            track('item_deleted', { count: ids.size })
          }
          break
        }
        case 'c':
        case 'C': {
          if (!(e.ctrlKey || e.metaKey)) break
          const ids = useUIStore.getState().selectedIds
          if (ids.size > 0) {
            e.preventDefault()
            writeItemsToClipboard(snapshotSelected(ids))
            toast.success(`${ids.size} item${ids.size > 1 ? 's' : ''} copied`, { id: 'item-copied', duration: 1200 })
          }
          break
        }
        case 'x':
        case 'X': {
          if (!(e.ctrlKey || e.metaKey)) break
          e.preventDefault()
          const ids = useUIStore.getState().selectedIds
          if (ids.size > 0) {
            writeItemsToClipboard(snapshotSelected(ids))
            const store = useBoardStore.getState()
            for (const id of ids) store.removeItem(id)
            useUIStore.getState().deselectAll()
            toast.success(`${ids.size} item${ids.size > 1 ? 's' : ''} cut`, { id: 'item-cut', duration: 1200 })
          }
          break
        }
        // Cmd/Ctrl+V is handled by the document-level `paste` event below.
        case 'd':
        case 'D': {
          if (!(e.ctrlKey || e.metaKey)) break
          e.preventDefault()
          const ids = useUIStore.getState().selectedIds
          if (ids.size > 0) {
            const newIds = new Set<string>()
            for (const id of ids) {
              const dupId = useBoardStore.getState().duplicateItem(id)
              if (dupId) newIds.add(dupId)
            }
            useUIStore.getState().setSelectedIds(newIds)
            track('item_duplicated', { count: newIds.size })
          }
          break
        }
        case 'a':
        case 'A': {
          if (!(e.ctrlKey || e.metaKey)) break
          e.preventDefault()
          const allIds = new Set(Object.keys(useBoardStore.getState().items))
          useUIStore.getState().setSelectedIds(allIds)
          break
        }
        case ']': {
          // Bring forward — flush immediately so order persists
          const fwdIds = useUIStore.getState().selectedIds
          for (const id of fwdIds) {
            const z = useBoardStore.getState().nextZIndex()
            useBoardStore.getState().updateItem(id, { zIndex: z })
          }
          useBoardStore.getState().flushAll()
          break
        }
        case '[': {
          // Send back — flush immediately so order persists
          const backIds = useUIStore.getState().selectedIds
          const allItems = Object.values(useBoardStore.getState().items)
          const minZ = allItems.length > 0 ? Math.min(...allItems.map(i => i.zIndex)) : 0
          let z = minZ - 1
          for (const id of backIds) {
            useBoardStore.getState().updateItem(id, { zIndex: z-- })
          }
          useBoardStore.getState().flushAll()
          break
        }
        case 'Escape': useUIStore.getState().deselectAll(); break
        case '1': useUIStore.getState().setSelectedTool('select'); break
        case '2': useUIStore.getState().setSelectedTool('marquee'); break
        case '3': useUIStore.getState().setSelectedTool('note'); break
        case '4': useUIStore.getState().setSelectedTool('text'); break
        case '5': useUIStore.getState().setSelectedTool('rect'); break
        case '6': useUIStore.getState().setSelectedTool('arrow'); break
        case '7': useUIStore.getState().setSelectedTool('freehand'); break
        case '8': useUIStore.getState().setSelectedTool('emoji'); break
      }
    }
    // Reads clipboardData synchronously — no permission prompt — and
    // routes based on a JSON marker the app writes for internal copies.
    function onPaste(e: ClipboardEvent) {
      if (isReadOnly) return
      if (useUIStore.getState().editingItemId) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }

      const anchor = cursorBoardRef.current ?? (canvasRef.current && viewportCenterBoardCoords(canvasRef.current))
      if (!anchor) return

      const text = e.clipboardData?.getData('text/plain') ?? ''

      if (text.startsWith(CLIPBOARD_MARKER)) {
        try {
          const payload = JSON.parse(text.slice(CLIPBOARD_MARKER.length)) as ClipboardPayload
          if (payload.__boards === 1 && Array.isArray(payload.items) && payload.items.length > 0) {
            e.preventDefault()
            pasteItemsAt(payload.items, anchor, boardId)
            return
          }
        } catch {
          // Malformed payload — fall through to plain text paste
        }
      }

      if (!text) return
      e.preventDefault()
      createTextItemAt(text, anchor, boardId, userId, 'system_paste')
    }
    // A missed pointerup leaves a "ghost" item that follows the cursor.
    function clearStuckCanvasState() {
      if (drawingRef.current) {
        const id = drawingRef.current.itemId
        const item = useBoardStore.getState().items[id]
        drawingRef.current = null
        if (item && item.width < 10 && item.height < 10 && item.type !== 'freehand') {
          const size = getDefaultSize(item.type)
          useBoardStore.getState().updateItem(id, { width: size.width, height: size.height })
        }
      }
      if (useUIStore.getState().marquee) useUIStore.getState().setMarquee(null)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerup', clearStuckCanvasState)
    window.addEventListener('pointercancel', clearStuckCanvasState)
    window.addEventListener('blur', clearStuckCanvasState)
    document.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerup', clearStuckCanvasState)
      window.removeEventListener('pointercancel', clearStuckCanvasState)
      window.removeEventListener('blur', clearStuckCanvasState)
      document.removeEventListener('paste', onPaste)
    }
  }, [isReadOnly, boardId, userId])

  // ── Canvas pointer handlers ───────────────────────────────

  const onCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    if (isReadOnly) return // No creation in viewer mode
    const isDirectCanvasClick = e.target === canvasRef.current

    const tool = useUIStore.getState().selectedTool

    if (tool === 'select') {
      if (isDirectCanvasClick) useUIStore.getState().deselectAll()
      return
    }

    if (tool === 'marquee') {
      if (!isDirectCanvasClick) return
      e.stopPropagation()
      canvasRef.current!.setPointerCapture(e.pointerId)
      const board = screenToBoardCoords(e.clientX, e.clientY, canvasRef.current!)
      useUIStore.getState().setMarquee({ startX: board.x, startY: board.y, endX: board.x, endY: board.y })
      useUIStore.getState().deselectAll()
      return
    }

    const board = screenToBoardCoords(e.clientX, e.clientY, canvasRef.current!)

    // Require a double-click (within 400ms / 8px) to create — single
    // clicks are too easy to fire by accident.
    const now = performance.now()
    const last = lastCreateClickRef.current
    const isDoubleClick =
      !!last &&
      now - last.time < 400 &&
      Math.abs(e.clientX - last.x) < 8 &&
      Math.abs(e.clientY - last.y) < 8
    if (!isDoubleClick) {
      lastCreateClickRef.current = { time: now, x: e.clientX, y: e.clientY }
      return
    }
    lastCreateClickRef.current = null

    if (dragDrawTools.has(tool)) {
      e.stopPropagation()
      canvasRef.current!.setPointerCapture(e.pointerId)

      const item = createItem({
        boardId,
        type: tool,
        x: board.x,
        y: board.y,
        zIndex: useBoardStore.getState().nextZIndex(),
        createdBy: userId,
      })

      // Override factory centering — start at exact cursor point
      item.x = board.x
      item.y = board.y

      if (tool === 'arrow') {
        item.points = [{ x: 0, y: 0 }, { x: 0, y: 0 }]
        item.width = 1
        item.height = 1
      } else if (tool === 'freehand') {
        item.points = [{ x: 0, y: 0 }]
        item.width = 1
        item.height = 1
      } else {
        // Shapes: start with zero size, grow on drag
        item.width = 1
        item.height = 1
      }

      useBoardStore.getState().addItem(item)
      drawingRef.current = { itemId: item.id, startX: board.x, startY: board.y }
    } else if (clickPlaceTools.has(tool) && isDirectCanvasClick) {
      const item = createItem({
        boardId,
        type: tool,
        x: board.x,
        y: board.y,
        zIndex: useBoardStore.getState().nextZIndex(),
        createdBy: userId,
      })
      if (item.type === 'emoji') item.content = getCurrentEmoji()
      useBoardStore.getState().addItem(item)
      useUIStore.getState().selectItem(item.id)
      track('item_created', { type: item.type })
    }
  }, [boardId, userId, isReadOnly])

  const onCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    // Track cursor position in board coordinates so paste can anchor here.
    if (canvasRef.current) {
      cursorBoardRef.current = screenToBoardCoords(e.clientX, e.clientY, canvasRef.current)
    }

    // Marquee selection
    const marquee = useUIStore.getState().marquee
    if (marquee) {
      const board = screenToBoardCoords(e.clientX, e.clientY, canvasRef.current!)
      useUIStore.getState().setMarquee({ ...marquee, endX: board.x, endY: board.y })

      // Select items inside the marquee rectangle
      const left = Math.min(marquee.startX, board.x)
      const top = Math.min(marquee.startY, board.y)
      const right = Math.max(marquee.startX, board.x)
      const bottom = Math.max(marquee.startY, board.y)

      const hits = new Set<string>()
      const items = useBoardStore.getState().items
      for (const it of Object.values(items)) {
        if (it.x + it.width > left && it.x < right && it.y + it.height > top && it.y < bottom) {
          hits.add(it.id)
        }
      }
      useUIStore.getState().setSelectedIds(hits)
      return
    }

    const drawing = drawingRef.current
    if (!drawing) return

    const board = screenToBoardCoords(e.clientX, e.clientY, canvasRef.current!)
    const item = useBoardStore.getState().items[drawing.itemId]
    if (!item) return

    if (item.type === 'arrow') {
      const dx = board.x - drawing.startX
      const dy = board.y - drawing.startY
      const x = Math.min(drawing.startX, board.x)
      const y = Math.min(drawing.startY, board.y)
      const w = Math.abs(dx) || 1
      const h = Math.abs(dy) || 1
      useBoardStore.getState().updateItem(drawing.itemId, {
        x, y, width: w, height: h,
        points: [
          { x: drawing.startX < board.x ? 0 : w, y: drawing.startY < board.y ? 0 : h },
          { x: drawing.startX < board.x ? w : 0, y: drawing.startY < board.y ? h : 0 },
        ],
      })
    } else if (item.type === 'freehand') {
      const relX = board.x - item.x
      const relY = board.y - item.y
      const newPoints = [...(item.points || []), { x: relX, y: relY }]

      let minX = item.x, minY = item.y
      let maxX = item.x + item.width, maxY = item.y + item.height
      if (board.x < minX) minX = board.x
      if (board.y < minY) minY = board.y
      if (board.x > maxX) maxX = board.x
      if (board.y > maxY) maxY = board.y

      const offsetX = item.x - minX
      const offsetY = item.y - minY
      const adjustedPoints = offsetX > 0 || offsetY > 0
        ? newPoints.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }))
        : newPoints

      useBoardStore.getState().updateItem(drawing.itemId, {
        x: minX, y: minY,
        width: maxX - minX || 1,
        height: maxY - minY || 1,
        points: adjustedPoints,
      })
    } else {
      // Shapes (rect, triangle, circle): drag from start corner
      const x = Math.min(drawing.startX, board.x)
      const y = Math.min(drawing.startY, board.y)
      const w = Math.abs(board.x - drawing.startX) || 1
      const h = Math.abs(board.y - drawing.startY) || 1
      useBoardStore.getState().updateItem(drawing.itemId, {
        x, y, width: w, height: h,
      })
    }
  }, [])

  // Drop URLs / text from any app onto the canvas as a text item.
  // Links auto-render as clickable via TextDisplay.
  const onCanvasDrop = useCallback((e: React.DragEvent) => {
    if (isReadOnly) return
    e.preventDefault()
    const dt = e.dataTransfer
    if (!dt) return

    const uri = dt.getData('text/uri-list')
    const plain = dt.getData('text/plain')
    const content = (uri && uri.split('\n').filter((l) => l && !l.startsWith('#')).join('\n')) || plain
    if (!content) return

    const dropAt = screenToBoardCoords(e.clientX, e.clientY, canvasRef.current!)
    createTextItemAt(content, dropAt, boardId, userId, 'drop')
  }, [boardId, userId, isReadOnly])

  const onCanvasPointerUp = useCallback(() => {
    // End marquee
    if (useUIStore.getState().marquee) {
      useUIStore.getState().setMarquee(null)
      return
    }

    if (drawingRef.current) {
      const id = drawingRef.current.itemId
      const item = useBoardStore.getState().items[id]
      drawingRef.current = null
      if (!item) return

      // Single click (no drag) → place at default size
      if (item.width < 10 && item.height < 10 && item.type !== 'freehand') {
        const size = getDefaultSize(item.type)
        useBoardStore.getState().updateItem(id, {
          width: size.width,
          height: size.height,
          ...(item.type === 'arrow' ? {
            points: [{ x: 0, y: 0 }, { x: size.width, y: 0 }],
          } : {}),
        })
      }

      useUIStore.getState().selectItem(id)
      track('item_created', { type: item.type })
    }
  }, [])

  const itemList = Object.values(items)

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full overflow-hidden bg-canvas-bg transition-colors"
      style={{ cursor: isPanning ? 'grabbing' : (selectedTool === 'select' || selectedTool === 'marquee') ? 'default' : 'crosshair' }}
    >
      {/* ── Top toolbar ── */}
      <div
        className="absolute left-0 right-0 top-0 z-20 flex items-center gap-3 border-b border-border px-4 py-2 transition-colors"
        style={{ backgroundColor: 'var(--bg-overlay)', backdropFilter: `blur(var(--panel-blur))` }}
      >
        {isAuthenticated ? (
          <>
            <Link
              href="/dashboard"
              className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-surface hover:text-text-secondary"
              title="All boards"
            >
              <ArrowLeft size={18} />
            </Link>
            <BoardSwitcher currentBoardId={boardId} currentTitle={boardTitle} />
          </>
        ) : (
          <span className="text-sm font-medium text-text">{boardTitle}</span>
        )}
        <span className="flex-1" />
        {isReadOnly && (
          <span className="rounded-md bg-bg-surface px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">
            view only
          </span>
        )}
        <ThemeToggle />
        {isAuthenticated && !isReadOnly && <ShareDialog boardId={boardId} isOwner={ownerId === userId} />}
      </div>

      {!isReadOnly && <ToolPanel />}
      {!isReadOnly && <FontPanel />}

      {/* ── Infinite dot grid background (moves with pan, scales with zoom) ── */}
      <div
        className="canvas-grid pointer-events-none absolute inset-0 top-[45px]"
        style={{
          backgroundPosition: `${panX}px ${panY}px`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        }}
      />

      {/* ── Click target layer (always covers full viewport) ── */}
      <div
        ref={canvasRef}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onDragOver={(e) => { if (!isReadOnly) e.preventDefault() }}
        onDrop={onCanvasDrop}
        className="absolute inset-0 top-[45px]"
      >
        {/* ── Transform layer (positions items in board space) ── */}
        <div
          className="absolute origin-top-left pointer-events-none"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            willChange: 'transform',
            /* Make enormous so items far away still render */
            left: 0, top: 0, width: 1, height: 1,
          }}
        >
          {itemList.map((item) => (
            <BoardItemView key={item.id} item={item} />
          ))}

          {/* Marquee selection rectangle */}
          {marquee && (
            <div
              className="pointer-events-none absolute border border-accent bg-accent/10"
              style={{
                left: Math.min(marquee.startX, marquee.endX),
                top: Math.min(marquee.startY, marquee.endY),
                width: Math.abs(marquee.endX - marquee.startX),
                height: Math.abs(marquee.endY - marquee.startY),
              }}
            />
          )}
        </div>
      </div>

      {itemList.length === 0 && (
        <div className="pointer-events-none absolute inset-0 top-[45px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-medium text-text-muted">No items yet</p>
            <p className="mt-1 text-xs text-text-muted">Select a tool and click to add one</p>
          </div>
        </div>
      )}

      <ZoomControls />
    </div>
  )
}
