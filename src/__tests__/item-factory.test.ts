import { describe, it, expect } from 'vitest'
import { createItem, getDefaultSize } from '@/lib/item-factory'

describe('createItem', () => {
  const base = {
    boardId: 'board-1',
    x: 100,
    y: 200,
    zIndex: 1,
    createdBy: null,
  }

  it('creates a note with default properties', () => {
    const item = createItem({ ...base, type: 'note' })
    expect(item.type).toBe('note')
    expect(item.boardId).toBe('board-1')
    expect(item.color).toBe('#fef08a')
    expect(item.width).toBe(200)
    expect(item.height).toBe(200)
    expect(item.id).toBeTruthy()
    expect(item.content).toBe('')
  })

  it('centers item on click position', () => {
    const item = createItem({ ...base, type: 'note' })
    // Note is 200x200, so centered on (100, 200) means top-left at (0, 100)
    expect(item.x).toBe(0)
    expect(item.y).toBe(100)
  })

  it('creates a text item', () => {
    const item = createItem({ ...base, type: 'text' })
    expect(item.type).toBe('text')
    expect(item.fontSize).toBe(16)
    expect(item.color).toBe('transparent')
  })

  it('creates a rect item', () => {
    const item = createItem({ ...base, type: 'rect' })
    expect(item.type).toBe('rect')
    expect(item.strokeWidth).toBe(2)
  })

  it('creates an arrow with points', () => {
    const item = createItem({ ...base, type: 'arrow' })
    expect(item.type).toBe('arrow')
    expect(item.points).toEqual([{ x: 0, y: 0 }, { x: 200, y: 0 }])
  })

  it('creates a freehand with empty points', () => {
    const item = createItem({ ...base, type: 'freehand' })
    expect(item.type).toBe('freehand')
    expect(item.points).toEqual([])
  })

  it('creates triangle and circle', () => {
    const tri = createItem({ ...base, type: 'triangle' })
    expect(tri.type).toBe('triangle')
    const circ = createItem({ ...base, type: 'circle' })
    expect(circ.type).toBe('circle')
    expect(circ.width).toBe(160)
    expect(circ.height).toBe(160)
  })

  it('uses custom stroke color when provided', () => {
    const item = createItem({ ...base, type: 'arrow', strokeColor: '#ff0000' })
    expect(item.strokeColor).toBe('#ff0000')
  })

  it('generates unique IDs', () => {
    const a = createItem({ ...base, type: 'note' })
    const b = createItem({ ...base, type: 'note' })
    expect(a.id).not.toBe(b.id)
  })
})

describe('getDefaultSize', () => {
  it('returns correct defaults for each type', () => {
    expect(getDefaultSize('note')).toEqual({ width: 200, height: 200 })
    expect(getDefaultSize('text')).toEqual({ width: 240, height: 48 })
    expect(getDefaultSize('rect')).toEqual({ width: 200, height: 150 })
    expect(getDefaultSize('arrow')).toEqual({ width: 200, height: 0 })
    expect(getDefaultSize('triangle')).toEqual({ width: 180, height: 160 })
    expect(getDefaultSize('circle')).toEqual({ width: 160, height: 160 })
    expect(getDefaultSize('freehand')).toEqual({ width: 0, height: 0 })
  })
})
