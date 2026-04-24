import { useRef, useState, useCallback } from 'react'

/**
 * Touch & mouse friendly drag-to-reorder hook using Pointer Events.
 *
 * Desktop (mouse): drag starts immediately on pointerdown.
 * Mobile (touch):  drag starts after a 250 ms long-press, giving the browser
 *                  time to decide whether the gesture is a scroll or a drag.
 *                  If the finger moves more than TOUCH_SLOP px before the
 *                  timer fires, the gesture is treated as a scroll and the
 *                  drag is cancelled — exactly like @dnd-kit TouchSensor.
 */

const LONG_PRESS_DELAY = 250  // ms before touch drag activates
const TOUCH_SLOP       = 8    // px of movement allowed before cancelling long-press

export function useDragToReorder<T>(
  items: T[],
  onReorder: (newItems: T[]) => void
) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  // ── Refs (never go stale in pointer handlers) ──────────────────────────────
  const dragIndexRef  = useRef<number | null>(null)
  const overIndexRef  = useRef<number | null>(null)
  const itemsRef      = useRef(items)
  const listRef       = useRef<HTMLElement | null>(null)
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activatedRef  = useRef(false)          // true once long-press fires
  const startYRef     = useRef(0)
  const startXRef     = useRef(0)
  const pendingIdRef  = useRef<number | null>(null)  // pointerId waiting for long-press
  const captureElRef  = useRef<Element | null>(null)

  itemsRef.current = items

  // ── Helpers ────────────────────────────────────────────────────────────────

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function resetState() {
    clearTimer()
    activatedRef.current  = false
    pendingIdRef.current  = null
    captureElRef.current  = null
    dragIndexRef.current  = null
    overIndexRef.current  = null
    listRef.current       = null
    setDragIndex(null)
    setOverIndex(null)
  }

  function activate(index: number, el: Element, pointerId: number) {
    activatedRef.current = true
    // Now that we're sure this is a drag (not a scroll), capture the pointer
    el.setPointerCapture(pointerId)
    dragIndexRef.current = index
    overIndexRef.current = index
    setDragIndex(index)
    setOverIndex(index)
  }

  function hitTest(clientY: number) {
    const list = listRef.current
    if (!list) return
    const children = Array.from(list.querySelectorAll('[data-drag-item]'))
    let newOver = dragIndexRef.current!
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect()
      if (clientY >= rect.top && clientY <= rect.bottom) {
        newOver = i
        break
      }
    }
    if (newOver !== overIndexRef.current) {
      overIndexRef.current = newOver
      setOverIndex(newOver)
    }
  }

  // ── Handle props (spread onto the grip icon) ───────────────────────────────

  const getHandleProps = useCallback((index: number) => {
    return {
      // ── Pointer down: start long-press timer for touch, immediate for mouse ──
      onPointerDown: (e: React.PointerEvent) => {
        // Ignore non-primary buttons (right-click, etc.)
        if (e.button !== 0) return

        const el   = e.currentTarget as Element
        const list = el.closest('[data-drag-list]')
        if (!list) return
        listRef.current = list as HTMLElement

        const isTouch = e.pointerType === 'touch'

        if (isTouch) {
          // ── Touch: wait for long-press before activating ──────────────────
          pendingIdRef.current = e.pointerId
          captureElRef.current = el
          startYRef.current    = e.clientY
          startXRef.current    = e.clientX

          timerRef.current = setTimeout(() => {
            if (pendingIdRef.current === null) return
            activate(index, captureElRef.current!, pendingIdRef.current)
          }, LONG_PRESS_DELAY)

          // Do NOT call preventDefault here — let the browser handle scroll
          // until the long-press fires.
        } else {
          // ── Mouse: activate immediately ───────────────────────────────────
          el.setPointerCapture(e.pointerId)
          activatedRef.current = true
          dragIndexRef.current = index
          overIndexRef.current = index
          setDragIndex(index)
          setOverIndex(index)
          e.preventDefault()
        }
      },

      // ── Pointer move ───────────────────────────────────────────────────────
      onPointerMove: (e: React.PointerEvent) => {
        const isTouch = e.pointerType === 'touch'

        if (isTouch && !activatedRef.current) {
          // Long-press hasn't fired yet — check if finger moved too far (scroll intent)
          if (pendingIdRef.current === null) return
          const dx = Math.abs(e.clientX - startXRef.current)
          const dy = Math.abs(e.clientY - startYRef.current)
          if (dx > TOUCH_SLOP || dy > TOUCH_SLOP) {
            // User is scrolling — cancel the pending drag
            clearTimer()
            pendingIdRef.current = null
            captureElRef.current = null
          }
          return
        }

        if (!activatedRef.current || dragIndexRef.current === null) return
        e.preventDefault()
        hitTest(e.clientY)
      },

      // ── Pointer up ─────────────────────────────────────────────────────────
      onPointerUp: (e: React.PointerEvent) => {
        if (!activatedRef.current) {
          // Long-press never fired — treat as a tap, clean up timer
          resetState()
          return
        }

        e.preventDefault()
        const from = dragIndexRef.current!
        const to   = overIndexRef.current ?? from
        if (from !== to) {
          const next = [...itemsRef.current]
          const [moved] = next.splice(from, 1)
          next.splice(to, 0, moved)
          onReorder(next)
        }
        resetState()
      },

      // ── Pointer cancel (e.g. incoming call on iOS) ─────────────────────────
      onPointerCancel: () => {
        resetState()
      },

      style: {
        // touch-action: none on the handle tells the browser this element
        // does NOT participate in scroll/zoom — required for pointer capture
        // to work on touch. We set it always (not just during drag) so the
        // browser knows before the first touch event fires.
        touchAction:       'none',
        cursor:            dragIndex === index ? 'grabbing' : 'grab',
        userSelect:        'none',
        WebkitUserSelect:  'none',
      } as React.CSSProperties,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragIndex, onReorder])

  // ── Item props (spread onto each list row) ─────────────────────────────────

  const getItemProps = useCallback((index: number) => {
    const isDragging = dragIndex === index
    const isOver     = overIndex === index && dragIndex !== null && dragIndex !== index
    return {
      'data-drag-item': true,
      style: {
        opacity:          isDragging ? 0.4 : 1,
        transition:       'opacity 0.15s',
        outline:          isOver ? '2px solid #4d8eff' : undefined,
        borderRadius:     isOver ? '8px' : undefined,
        // touch-action: none on the row prevents the browser from claiming
        // the touch for scroll while a drag is in progress.
        touchAction:      'none',
        userSelect:       'none',
        WebkitUserSelect: 'none',
      } as React.CSSProperties,
    }
  }, [dragIndex, overIndex])

  return { getHandleProps, getItemProps, dragIndex, overIndex }
}
