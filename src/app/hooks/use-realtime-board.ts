import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/browser'
import { rowToItem } from '@/lib/board-repo'
import { useBoardStore } from '@/app/stores/board-store'
import type { BoardItem as DbRow } from '@/lib/types/database'

/**
 * How long (ms) after a local mutation to ignore echoed realtime events
 * for the same item ID. Must be longer than the debounce window (500ms)
 * plus a generous round-trip buffer.
 */
const ECHO_WINDOW_MS = 2000

/**
 * Subscribes to Supabase Realtime postgres_changes on board_items
 * for a specific board. Applies remote changes to the Zustand store
 * via applyRemoteUpsert / applyRemoteDelete (no DB write-back).
 *
 * Self-skip: tracks locally-mutated item IDs in a Set with a TTL.
 * If a realtime event arrives for an ID we recently wrote, skip it —
 * our local state is already correct (optimistic update).
 */
export function useRealtimeBoard(boardId: string) {
  const locallyTouched = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  // Expose markLocal so the store can call it — we wire this up via
  // a subscribe listener below.
  const markLocal = (id: string) => {
    const prev = locallyTouched.current.get(id)
    if (prev) clearTimeout(prev)
    locallyTouched.current.set(
      id,
      setTimeout(() => locallyTouched.current.delete(id), ECHO_WINDOW_MS),
    )
  }

  useEffect(() => {
    if (!boardId) return // Skip for anonymous users

    const supabase = createClient()

    // ── Subscribe to item changes ──
    const channel = supabase
      .channel(`board-items:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'board_items',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          const store = useBoardStore.getState()

          switch (payload.eventType) {
            case 'INSERT': {
              const row = payload.new as DbRow
              if (locallyTouched.current.has(row.id)) return
              if (store.items[row.id]) return // already have it
              store.applyRemoteUpsert(rowToItem(row))
              break
            }
            case 'UPDATE': {
              const row = payload.new as DbRow
              if (locallyTouched.current.has(row.id)) return
              store.applyRemoteUpsert(rowToItem(row))
              break
            }
            case 'DELETE': {
              const old = payload.old as { id?: string }
              if (!old.id) return
              if (locallyTouched.current.has(old.id)) return
              store.applyRemoteDelete(old.id)
              break
            }
          }
        },
      )
      .subscribe()

    // ── Track local mutations to suppress echoes ──
    // Listen to store changes and mark IDs that changed locally.
    let prevItems = useBoardStore.getState().items

    const unsub = useBoardStore.subscribe((state) => {
      const curr = state.items

      // Detect added or changed items
      for (const id of Object.keys(curr)) {
        if (curr[id] !== prevItems[id]) {
          markLocal(id)
        }
      }
      // Detect removed items
      for (const id of Object.keys(prevItems)) {
        if (!(id in curr)) {
          markLocal(id)
        }
      }

      prevItems = curr
    })

    // Capture ref value for cleanup (React lint rule)
    const touched = locallyTouched.current

    return () => {
      unsub()
      supabase.removeChannel(channel)
      for (const timer of touched.values()) {
        clearTimeout(timer)
      }
      touched.clear()
    }
  }, [boardId])
}
