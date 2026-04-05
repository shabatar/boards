/**
 * Lightweight analytics and error reporting.
 *
 * In development: logs to console.
 * In production: replace the body of track() and captureError()
 * with your provider (PostHog, Mixpanel, Sentry, etc.)
 *
 * Enable via NEXT_PUBLIC_ANALYTICS_ENABLED=true in .env
 */

const enabled =
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true'

const isDev = process.env.NODE_ENV === 'development'

// ── Event tracking ──────────────────────────────────────────

type EventName =
  | 'signed_in'
  | 'board_created'
  | 'board_opened'
  | 'board_deleted'
  | 'item_created'
  | 'item_edited'
  | 'item_deleted'
  | 'item_duplicated'

type EventProperties = Record<string, string | number | boolean | null>

export function track(event: EventName, properties?: EventProperties) {
  if (isDev) {
    console.debug('[analytics]', event, properties ?? '')
    return
  }
  if (!enabled) return

  // Replace with your analytics provider:
  // posthog.capture(event, properties)
  // mixpanel.track(event, properties)
}

// ── Error reporting ─────────────────────────────────────────

export function captureError(error: unknown, context?: Record<string, string>) {
  if (isDev) {
    console.error('[error]', error, context ?? '')
    return
  }
  if (!enabled) return

  // Replace with your error provider:
  // Sentry.captureException(error, { extra: context })
}

// ── Global error handlers (call once in root layout) ────────

export function initErrorHandlers() {
  if (typeof window === 'undefined') return

  window.addEventListener('unhandledrejection', (e) => {
    captureError(e.reason, { type: 'unhandled_promise' })
  })
}
