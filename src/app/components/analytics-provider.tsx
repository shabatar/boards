'use client'

import { useEffect } from 'react'
import { initErrorHandlers } from '@/lib/analytics'

export function AnalyticsProvider() {
  useEffect(() => {
    initErrorHandlers()
  }, [])

  return null
}
