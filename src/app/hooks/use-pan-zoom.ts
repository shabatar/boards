import { useEffect, useRef } from 'react'
import { useUIStore } from '@/app/stores/ui-store'

/**
 * Attaches pan and zoom gestures to a container element.
 *
 * Pan:   left-click drag on the viewport background, middle-click drag, space + drag
 * Zoom:  ctrl/cmd + wheel (step zoom), trackpad pinch (smooth)
 * Scroll: plain wheel / two-finger swipe pans the canvas
 *
 * All state reads use `useUIStore.getState()` inside handlers
 * so callbacks are referentially stable and never re-subscribe.
 */
export function usePanZoom(containerRef: React.RefObject<HTMLDivElement | null>) {
  const lastPt = useRef({ x: 0, y: 0 })
  const spaceHeld = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // ── helpers ─────────────────────────────────────────

    /** True when the click target is the viewport or the canvas layer itself,
     *  not a toolbar button, dialog, or other chrome element. Chrome elements
     *  live in z-20 containers which all have pointer-events on, so we just
     *  check whether the target is `el` or a direct child (the canvas div). */
    function isCanvasTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false
      return target === el || target.parentElement === el
    }

    // ── wheel ───────────────────────────────────────────

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const s = useUIStore.getState()

      if (e.ctrlKey || e.metaKey) {
        // ctrl+wheel or trackpad pinch
        const factor = 1 - e.deltaY * 0.01
        s.zoomTo(s.zoom * factor, e.clientX, e.clientY)
      } else {
        // plain scroll / two-finger swipe → pan
        s.panBy(-e.deltaX, -e.deltaY)
      }
    }

    // ── pointer pan ─────────────────────────────────────

    function onPointerDown(e: PointerEvent) {
      const left = e.button === 0
      const middle = e.button === 1
      if (!left && !middle) return

      // Middle-click or space+click always pans.
      // Plain left-click only pans when targeting empty canvas space
      // AND not using a drag-draw tool (arrow, freehand).
      const tool = useUIStore.getState().selectedTool
      const isDragTool = tool !== 'select' && tool !== 'note' && tool !== 'text'
      if (left && !spaceHeld.current && (isDragTool || !isCanvasTarget(e.target))) return

      e.preventDefault()
      el!.setPointerCapture(e.pointerId)
      lastPt.current = { x: e.clientX, y: e.clientY }
      useUIStore.getState().setIsPanning(true)
    }

    function onPointerMove(e: PointerEvent) {
      if (!useUIStore.getState().isPanning) return
      const dx = e.clientX - lastPt.current.x
      const dy = e.clientY - lastPt.current.y
      lastPt.current = { x: e.clientX, y: e.clientY }
      useUIStore.getState().panBy(dx, dy)
    }

    function onPointerUp() {
      if (useUIStore.getState().isPanning) {
        useUIStore.getState().setIsPanning(false)
      }
    }

    // ── space key modifier ──────────────────────────────

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        spaceHeld.current = true
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        spaceHeld.current = false
        if (useUIStore.getState().isPanning) {
          useUIStore.getState().setIsPanning(false)
        }
      }
    }

    // ── bind / unbind ───────────────────────────────────

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [containerRef])
}
