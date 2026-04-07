import { useEffect, useRef } from 'react'
import { useBoardStore } from '@/app/stores/board-store'
import type { BoardItem } from '@/app/stores/board-store'

type FetchFn = () => Promise<BoardItem[]>

/**
 * Polls for board changes on an interval.
 * Used as primary sync for anonymous users (no realtime),
 * and as a reliability fallback for authenticated users.
 */
export function usePollBoard(fetchFn: FetchFn | null, intervalMs = 3000) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!fetchFn) return

    timer.current = setInterval(async () => {
      try {
        const remoteItems = await fetchFn()
        const store = useBoardStore.getState()
        const current = store.items
        const remoteMap = new Map(remoteItems.map(i => [i.id, i]))

        // Apply remote additions and updates
        for (const [id, item] of remoteMap) {
          const existing = current[id]
          if (!existing) {
            store.applyRemoteUpsert(item)
          }
        }

        // Apply remote deletions — but skip items whose insert is still
        // in flight to the server, otherwise we GC freshly pasted/created
        // items before the round-trip completes.
        const pending = store.pendingIds
        for (const id of Object.keys(current)) {
          if (!remoteMap.has(id) && !pending.has(id)) {
            store.applyRemoteDelete(id)
          }
        }
      } catch {
        // Ignore poll errors
      }
    }, intervalMs)

    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [fetchFn, intervalMs])
}
