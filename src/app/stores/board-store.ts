import { create } from 'zustand'
import toast from 'react-hot-toast'
import { captureError } from '@/lib/analytics'
import {
  insertItem as dbInsert,
  deleteItemFromDb as dbDelete,
  debouncedUpdate,
  flushPendingUpdates,
} from '@/lib/board-repo'

// ── Item types ──────────────────────────────────────────────

export type ItemType = 'note' | 'text' | 'rect' | 'arrow' | 'triangle' | 'circle' | 'freehand' | 'emoji'

export type BoardItem = {
  id: string
  boardId: string
  type: ItemType
  x: number
  y: number
  width: number
  height: number
  content: string
  color: string
  zIndex: number
  createdBy: string | null
  fontSize: number
  fontFamily: string
  strokeColor: string
  strokeWidth: number
  points: Array<{ x: number; y: number }> | null
  padding: number
}

// ── Store ───────────────────────────────────────────────────

interface BoardState {
  boardId: string | null
  items: Record<string, BoardItem>
  /** IDs of items whose insert/delete is in-flight to the DB. The poller
   *  must not garbage-collect these — otherwise locally-created items get
   *  wiped before the round-trip completes. */
  pendingIds: Set<string>

  hydrate: (boardId: string, items: BoardItem[]) => void
  addItem: (item: BoardItem) => void
  updateItem: (id: string, patch: Partial<BoardItem>) => void
  removeItem: (id: string) => void
  duplicateItem: (id: string) => string | undefined
  nextZIndex: () => number
  flushAll: () => void

  applyRemoteUpsert: (item: BoardItem) => void
  applyRemoteDelete: (id: string) => void
}

function onSaveError(err: unknown) {
  const msg = err instanceof Error ? err.message : 'Failed to save'
  toast.error(msg, { id: 'save-error' })
  captureError(err, { context: 'board-item-save' })
}

export const useBoardStore = create<BoardState>()((set, get) => ({
  boardId: null,
  items: {},
  pendingIds: new Set<string>(),

  hydrate(boardId, items) {
    const record: Record<string, BoardItem> = {}
    for (const item of items) record[item.id] = item
    set({ boardId, items: record })
  },

  addItem(item) {
    set((s) => {
      const pending = new Set(s.pendingIds)
      pending.add(item.id)
      return { items: { ...s.items, [item.id]: item }, pendingIds: pending }
    })
    dbInsert(item)
      .catch(onSaveError)
      .finally(() => {
        set((s) => {
          if (!s.pendingIds.has(item.id)) return s
          const pending = new Set(s.pendingIds)
          pending.delete(item.id)
          return { pendingIds: pending }
        })
      })
  },

  updateItem(id, patch) {
    set((s) => {
      const existing = s.items[id]
      if (!existing) return s
      return { items: { ...s.items, [id]: { ...existing, ...patch } } }
    })
    debouncedUpdate(id, () => get().items[id])
  },

  removeItem(id) {
    set((s) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _, ...rest } = s.items
      return { items: rest }
    })
    dbDelete(id).catch(onSaveError)
  },

  duplicateItem(id) {
    const source = get().items[id]
    if (!source) return

    const dup: BoardItem = {
      ...source,
      id: crypto.randomUUID(),
      x: source.x + 20,
      y: source.y + 20,
      zIndex: get().nextZIndex(),
    }

    get().addItem(dup)

    return dup.id
  },

  nextZIndex() {
    const vals = Object.values(get().items)
    if (vals.length === 0) return 1
    return Math.max(...vals.map((i) => i.zIndex)) + 1
  },

  flushAll() {
    flushPendingUpdates((id) => get().items[id])
  },

  applyRemoteUpsert(item) {
    set((s) => ({ items: { ...s.items, [item.id]: item } }))
  },

  applyRemoteDelete(id) {
    set((s) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _, ...rest } = s.items
      return { items: rest }
    })
  },
}))
