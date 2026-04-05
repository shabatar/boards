'use client'

import { useEffect, useRef } from 'react'
import { track } from '@/lib/analytics'

export function SessionTracker() {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true

    // Track once per browser session
    const key = 'boards_session_tracked'
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1')
      track('signed_in')
    }
  }, [])

  return null
}
