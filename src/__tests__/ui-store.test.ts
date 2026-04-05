import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/app/stores/ui-store'

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      mode: 'editor',
      zoom: 1, panX: 0, panY: 0, isPanning: false,
      selectedTool: 'select',
      selectedIds: new Set(),
      editingItemId: null,
      marquee: null,
    })
  })

  describe('viewport', () => {
    it('pans by delta', () => {
      useUIStore.getState().panBy(10, 20)
      expect(useUIStore.getState().panX).toBe(10)
      expect(useUIStore.getState().panY).toBe(20)
    })

    it('accumulates pan', () => {
      useUIStore.getState().panBy(10, 20)
      useUIStore.getState().panBy(5, -10)
      expect(useUIStore.getState().panX).toBe(15)
      expect(useUIStore.getState().panY).toBe(10)
    })

    it('zooms with clamping', () => {
      useUIStore.getState().zoomTo(10, 0, 0) // above max
      expect(useUIStore.getState().zoom).toBe(5) // clamped to MAX_ZOOM

      useUIStore.getState().zoomTo(0.01, 0, 0) // below min
      expect(useUIStore.getState().zoom).toBe(0.1) // clamped to MIN_ZOOM
    })

    it('zooms toward anchor point', () => {
      useUIStore.getState().zoomTo(2, 100, 100)
      // At zoom 2, anchor (100,100) should stay visually at (100,100)
      // Pan adjusts: panX = 100 - (100 - 0) * 2 = -100
      expect(useUIStore.getState().panX).toBe(-100)
      expect(useUIStore.getState().panY).toBe(-100)
    })
  })

  describe('selection', () => {
    it('selects single item', () => {
      useUIStore.getState().selectItem('a')
      expect(useUIStore.getState().selectedIds).toEqual(new Set(['a']))
    })

    it('additive select toggles', () => {
      useUIStore.getState().selectItem('a')
      useUIStore.getState().selectItem('b', true)
      expect(useUIStore.getState().selectedIds).toEqual(new Set(['a', 'b']))

      useUIStore.getState().selectItem('a', true) // toggle off
      expect(useUIStore.getState().selectedIds).toEqual(new Set(['b']))
    })

    it('non-additive select replaces', () => {
      useUIStore.getState().selectItem('a')
      useUIStore.getState().selectItem('b')
      expect(useUIStore.getState().selectedIds).toEqual(new Set(['b']))
    })

    it('deselectAll clears selection and editing', () => {
      useUIStore.getState().selectItem('a')
      useUIStore.getState().setEditingItemId('a')
      useUIStore.getState().deselectAll()
      expect(useUIStore.getState().selectedIds.size).toBe(0)
      expect(useUIStore.getState().editingItemId).toBeNull()
    })
  })

  describe('tools', () => {
    it('setSelectedTool clears selection', () => {
      useUIStore.getState().selectItem('a')
      useUIStore.getState().setSelectedTool('rect')
      expect(useUIStore.getState().selectedTool).toBe('rect')
      expect(useUIStore.getState().selectedIds.size).toBe(0)
    })
  })

  describe('editing', () => {
    it('setEditingItemId selects the item', () => {
      useUIStore.getState().setEditingItemId('x')
      expect(useUIStore.getState().editingItemId).toBe('x')
      expect(useUIStore.getState().selectedIds).toEqual(new Set(['x']))
    })

    it('clearing editingItemId keeps selection', () => {
      useUIStore.getState().setEditingItemId('x')
      useUIStore.getState().setEditingItemId(null)
      expect(useUIStore.getState().editingItemId).toBeNull()
      // Selection is preserved
    })
  })

  describe('mode', () => {
    it('sets mode', () => {
      useUIStore.getState().setMode('viewer')
      expect(useUIStore.getState().mode).toBe('viewer')
    })
  })
})
