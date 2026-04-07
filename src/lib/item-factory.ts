import type { BoardItem, ItemType } from '@/app/stores/board-store'

interface CreateItemOptions {
  boardId: string
  type: ItemType
  x: number
  y: number
  zIndex: number
  createdBy: string | null
  strokeColor?: string
}

interface ItemDefaults {
  width: number
  height: number
  color: string
  content: string
  fontSize: number
  fontFamily: string
  strokeColor: string
  strokeWidth: number
  points: Array<{ x: number; y: number }> | null
  padding: number
}

const defaults: Record<ItemType, ItemDefaults> = {
  note: {
    width: 200, height: 200, color: '#fef08a', content: '',
    fontSize: 14, fontFamily: 'sans', strokeColor: '#18181b', strokeWidth: 2, points: null,
    padding: 12,
  },
  text: {
    width: 240, height: 48, color: 'transparent', content: '',
    fontSize: 16, fontFamily: 'sans', strokeColor: '#18181b', strokeWidth: 2, points: null,
    padding: 8,
  },
  rect: {
    width: 200, height: 150, color: 'transparent', content: '',
    fontSize: 14, fontFamily: 'sans', strokeColor: '#18181b', strokeWidth: 2, points: null,
    padding: 12,
  },
  arrow: {
    width: 200, height: 0, color: 'transparent', content: '',
    fontSize: 14, fontFamily: 'sans', strokeColor: '#18181b', strokeWidth: 2,
    points: [{ x: 0, y: 0 }, { x: 200, y: 0 }],
    padding: 0,
  },
  triangle: {
    width: 180, height: 160, color: 'transparent', content: '',
    fontSize: 14, fontFamily: 'sans', strokeColor: '#18181b', strokeWidth: 2, points: null,
    padding: 16,
  },
  circle: {
    width: 160, height: 160, color: 'transparent', content: '',
    fontSize: 14, fontFamily: 'sans', strokeColor: '#18181b', strokeWidth: 2, points: null,
    padding: 16,
  },
  freehand: {
    width: 0, height: 0, color: 'transparent', content: '',
    fontSize: 14, fontFamily: 'sans', strokeColor: '#18181b', strokeWidth: 2,
    points: [],
    padding: 0,
  },
  emoji: {
    width: 80, height: 80, color: 'transparent', content: '✅',
    fontSize: 64, fontFamily: 'sans', strokeColor: '#18181b', strokeWidth: 0,
    points: null,
    padding: 0,
  },
}

/** Get default dimensions for a given item type */
export function getDefaultSize(type: ItemType): { width: number; height: number } {
  const d = defaults[type]
  return { width: d.width, height: d.height }
}

/** Detect dark theme for default stroke color */
function defaultStrokeColor(): string {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return '#fafafa'
  }
  return '#18181b'
}

export function createItem(opts: CreateItemOptions): BoardItem {
  const d = defaults[opts.type]
  const stroke = opts.strokeColor ?? defaultStrokeColor()
  return {
    id: crypto.randomUUID(),
    boardId: opts.boardId,
    type: opts.type,
    x: opts.x - d.width / 2,
    y: opts.y - d.height / 2,
    width: d.width,
    height: d.height,
    content: d.content,
    color: d.color,
    zIndex: opts.zIndex,
    createdBy: opts.createdBy,
    fontSize: d.fontSize,
    fontFamily: d.fontFamily,
    strokeColor: stroke,
    strokeWidth: d.strokeWidth,
    points: d.points ? [...d.points] : null,
    padding: d.padding,
  }
}
