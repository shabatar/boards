/**
 * Data-access layer for board_items.
 * Writes use server actions with the admin client (bypasses RLS).
 * Reads go through the server component in the board page.
 */

import type { BoardItem as DbRow } from '@/lib/types/database'
import type { BoardItem } from '@/app/stores/board-store'
import {
  serverInsertItem,
  serverUpdateItem,
  serverDeleteItem,
} from './board-repo-actions'

// ── Mapping ─────────────────────────────────────────────────

export function rowToItem(row: DbRow): BoardItem {
  return {
    id: row.id,
    boardId: row.board_id,
    type: row.type as BoardItem['type'],
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    content: row.content,
    color: row.color,
    zIndex: row.z_index,
    createdBy: row.created_by,
    fontSize: row.font_size,
    fontFamily: row.font_family,
    strokeColor: row.stroke_color,
    strokeWidth: row.stroke_width,
    points: row.points,
  }
}

function itemToRow(item: BoardItem): Omit<DbRow, 'created_at' | 'updated_at'> {
  return {
    id: item.id,
    board_id: item.boardId,
    type: item.type,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    content: item.content,
    color: item.color,
    z_index: item.zIndex,
    created_by: item.createdBy,
    font_size: item.fontSize,
    font_family: item.fontFamily,
    stroke_color: item.strokeColor,
    stroke_width: item.strokeWidth,
    points: item.points,
  }
}

// ── Writes (server actions with admin client) ───────────────

export async function insertItem(item: BoardItem): Promise<void> {
  await serverInsertItem(itemToRow(item))
}

async function updateItemInDb(
  id: string,
  patch: Partial<BoardItem>,
): Promise<void> {
  const dbPatch: Record<string, unknown> = {}
  if (patch.x !== undefined) dbPatch.x = patch.x
  if (patch.y !== undefined) dbPatch.y = patch.y
  if (patch.width !== undefined) dbPatch.width = patch.width
  if (patch.height !== undefined) dbPatch.height = patch.height
  if (patch.content !== undefined) dbPatch.content = patch.content
  if (patch.color !== undefined) dbPatch.color = patch.color
  if (patch.zIndex !== undefined) dbPatch.z_index = patch.zIndex
  if (patch.fontSize !== undefined) dbPatch.font_size = patch.fontSize
  if (patch.fontFamily !== undefined) dbPatch.font_family = patch.fontFamily
  if (patch.strokeColor !== undefined) dbPatch.stroke_color = patch.strokeColor
  if (patch.strokeWidth !== undefined) dbPatch.stroke_width = patch.strokeWidth
  if (patch.points !== undefined) dbPatch.points = patch.points

  if (Object.keys(dbPatch).length === 0) return
  await serverUpdateItem(id, dbPatch)
}

export async function deleteItemFromDb(id: string): Promise<void> {
  await serverDeleteItem(id)
}

// ── Debounced update ────────────────────────────────────────

const pendingUpdates = new Map<string, ReturnType<typeof setTimeout>>()
const DEBOUNCE_MS = 500

export function debouncedUpdate(id: string, getBoardItem: () => BoardItem | undefined) {
  const existing = pendingUpdates.get(id)
  if (existing) clearTimeout(existing)

  pendingUpdates.set(
    id,
    setTimeout(() => {
      pendingUpdates.delete(id)
      const item = getBoardItem()
      if (!item) return
      updateItemInDb(id, item).catch(() => {})
    }, DEBOUNCE_MS),
  )
}

export function flushPendingUpdates(getItem: (id: string) => BoardItem | undefined) {
  for (const [id, timer] of pendingUpdates) {
    clearTimeout(timer)
    pendingUpdates.delete(id)
    const item = getItem(id)
    if (item) updateItemInDb(id, item).catch(() => {})
  }
}
