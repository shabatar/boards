import { create } from 'zustand'

export type Tool = 'select' | 'marquee' | 'note' | 'text' | 'rect' | 'arrow' | 'triangle' | 'circle' | 'freehand'

interface UIState {
  // Mode
  mode: 'editor' | 'viewer'

  // Viewport
  zoom: number
  panX: number
  panY: number
  isPanning: boolean

  // Tool & selection
  selectedTool: Tool
  selectedIds: Set<string>
  editingItemId: string | null

  // Marquee selection
  marquee: { startX: number; startY: number; endX: number; endY: number } | null

  // Actions — viewport
  setPan: (x: number, y: number) => void
  panBy: (dx: number, dy: number) => void
  zoomTo: (zoom: number, anchorX: number, anchorY: number) => void
  setIsPanning: (v: boolean) => void

  // Actions — tool & selection
  setSelectedTool: (tool: Tool) => void
  selectItem: (id: string, additive?: boolean) => void
  deselectAll: () => void
  setSelectedIds: (ids: Set<string>) => void
  setEditingItemId: (id: string | null) => void
  setMarquee: (m: UIState['marquee']) => void
  setMode: (m: 'editor' | 'viewer') => void
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5

export const useUIStore = create<UIState>()((set, get) => ({
  mode: 'editor' as const,

  zoom: 1,
  panX: 0,
  panY: 0,
  isPanning: false,

  selectedTool: 'select',
  selectedIds: new Set<string>(),
  editingItemId: null,
  marquee: null,

  setPan(x, y) {
    set({ panX: x, panY: y })
  },

  panBy(dx, dy) {
    set((s) => ({ panX: s.panX + dx, panY: s.panY + dy }))
  },

  zoomTo(nextZoom, anchorX, anchorY) {
    const { zoom, panX, panY } = get()
    const clamped = Math.min(Math.max(nextZoom, MIN_ZOOM), MAX_ZOOM)
    const ratio = clamped / zoom
    set({
      zoom: clamped,
      panX: anchorX - (anchorX - panX) * ratio,
      panY: anchorY - (anchorY - panY) * ratio,
    })
  },

  setIsPanning(v) {
    set({ isPanning: v })
  },

  setSelectedTool(tool) {
    set({ selectedTool: tool, selectedIds: new Set(), editingItemId: null })
  },

  selectItem(id, additive = false) {
    const { selectedIds } = get()
    if (additive) {
      const next = new Set(selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      set({ selectedIds: next, editingItemId: null })
    } else {
      set({ selectedIds: new Set([id]), editingItemId: null })
    }
  },

  deselectAll() {
    set({ selectedIds: new Set(), editingItemId: null })
  },

  setSelectedIds(ids) {
    set({ selectedIds: ids, editingItemId: null })
  },

  setEditingItemId(id) {
    if (id) {
      set({ editingItemId: id, selectedIds: new Set([id]) })
    } else {
      set({ editingItemId: null })
    }
  },

  setMarquee(m) {
    set({ marquee: m })
  },

  setMode(m) {
    set({ mode: m })
  },
}))
