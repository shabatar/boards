import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the board-repo module before importing the store
vi.mock('@/lib/board-repo', () => ({
  insertItem: vi.fn().mockResolvedValue(undefined),
  deleteItemFromDb: vi.fn().mockResolvedValue(undefined),
  debouncedUpdate: vi.fn(),
  flushPendingUpdates: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }))
vi.mock('@/lib/analytics', () => ({ captureError: vi.fn() }))

import { useBoardStore, type BoardItem } from '@/app/stores/board-store'

function makeItem(overrides: Partial<BoardItem> = {}): BoardItem {
  return {
    id: crypto.randomUUID(),
    boardId: 'board-1',
    type: 'note',
    x: 0, y: 0, width: 200, height: 200,
    content: '', color: '#fef08a', zIndex: 1,
    createdBy: null, fontSize: 14, fontFamily: 'sans',
    strokeColor: '#18181b', strokeWidth: 2, points: null,
    ...overrides,
  }
}

describe('useBoardStore', () => {
  beforeEach(() => {
    useBoardStore.setState({ boardId: null, items: {} })
  })

  it('hydrates with items', () => {
    const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' })]
    useBoardStore.getState().hydrate('board-1', items)

    expect(useBoardStore.getState().boardId).toBe('board-1')
    expect(Object.keys(useBoardStore.getState().items)).toHaveLength(2)
    expect(useBoardStore.getState().items['a']).toBeDefined()
  })

  it('adds an item', () => {
    useBoardStore.getState().hydrate('board-1', [])
    const item = makeItem({ id: 'new-1' })
    useBoardStore.getState().addItem(item)

    expect(useBoardStore.getState().items['new-1']).toEqual(item)
  })

  it('updates an item', () => {
    const item = makeItem({ id: 'upd-1', content: 'hello' })
    useBoardStore.getState().hydrate('board-1', [item])
    useBoardStore.getState().updateItem('upd-1', { content: 'world' })

    expect(useBoardStore.getState().items['upd-1'].content).toBe('world')
  })

  it('ignores update for non-existent item', () => {
    useBoardStore.getState().hydrate('board-1', [])
    useBoardStore.getState().updateItem('missing', { content: 'x' })
    expect(Object.keys(useBoardStore.getState().items)).toHaveLength(0)
  })

  it('removes an item', () => {
    const item = makeItem({ id: 'del-1' })
    useBoardStore.getState().hydrate('board-1', [item])
    useBoardStore.getState().removeItem('del-1')

    expect(useBoardStore.getState().items['del-1']).toBeUndefined()
  })

  it('duplicates an item with offset', () => {
    const item = makeItem({ id: 'orig', x: 100, y: 100 })
    useBoardStore.getState().hydrate('board-1', [item])
    const dupId = useBoardStore.getState().duplicateItem('orig')

    expect(dupId).toBeDefined()
    const dup = useBoardStore.getState().items[dupId!]
    expect(dup.x).toBe(120) // +20
    expect(dup.y).toBe(120) // +20
    expect(dup.id).not.toBe('orig')
    expect(dup.type).toBe('note')
  })

  it('returns undefined for duplicating non-existent item', () => {
    useBoardStore.getState().hydrate('board-1', [])
    const dupId = useBoardStore.getState().duplicateItem('missing')
    expect(dupId).toBeUndefined()
  })

  it('nextZIndex returns 1 for empty board', () => {
    useBoardStore.getState().hydrate('board-1', [])
    expect(useBoardStore.getState().nextZIndex()).toBe(1)
  })

  it('nextZIndex returns max + 1', () => {
    useBoardStore.getState().hydrate('board-1', [
      makeItem({ id: 'a', zIndex: 5 }),
      makeItem({ id: 'b', zIndex: 10 }),
    ])
    expect(useBoardStore.getState().nextZIndex()).toBe(11)
  })

  it('applyRemoteUpsert adds new item without DB call', () => {
    useBoardStore.getState().hydrate('board-1', [])
    const item = makeItem({ id: 'remote-1' })
    useBoardStore.getState().applyRemoteUpsert(item)

    expect(useBoardStore.getState().items['remote-1']).toEqual(item)
  })

  it('applyRemoteDelete removes item without DB call', () => {
    const item = makeItem({ id: 'remote-del' })
    useBoardStore.getState().hydrate('board-1', [item])
    useBoardStore.getState().applyRemoteDelete('remote-del')

    expect(useBoardStore.getState().items['remote-del']).toBeUndefined()
  })
})
