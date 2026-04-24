import { useRef, useState } from 'react'

/**
 * Touch & mouse friendly drag-to-reorder hook using Pointer Events.
 * Works on mobile (touch) and desktop (mouse) without any library.
 */
export function useDragToReorder<T>(
  items: T[],
  onReorder: (newItems: T[]) => void
) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  // Refs to avoid stale closures in pointer event handlers
  const dragIndexRef = useRef<number | null>(null)
  const overIndexRef = useRef<number | null>(null)
  const itemsRef = useRef(items)
  const listRef = useRef<HTMLElement | null>(null)
  itemsRef.current = items

  function getHandleProps(index: number) {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        // Only primary button / first touch
        if (e.button !== undefined && e.button !== 0) return
        
        // Capture the pointer to receive all subsequent events
        e.currentTarget.setPointerCapture(e.pointerId)
        
        // Store the list reference for later use
        const list = (e.currentTarget as HTMLElement).closest('[data-drag-list]')
        if (list) listRef.current = list as HTMLElement
        
        dragIndexRef.current = index
        overIndexRef.current = index
        setDragIndex(index)
        setOverIndex(index)
        e.preventDefault()
        e.stopPropagation()
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (dragIndexRef.current === null) return
        e.preventDefault()
        e.stopPropagation()

        // Find which item the pointer is currently over by hit-testing siblings
        const list = listRef.current
        if (!list) return
        
        const children = Array.from(list.querySelectorAll('[data-drag-item]'))
        const y = e.clientY
        let newOver = dragIndexRef.current
        
        for (let i = 0; i < children.length; i++) {
          const rect = children[i].getBoundingClientRect()
          // Check if pointer is within the vertical bounds of this item
          if (y >= rect.top && y <= rect.bottom) {
            newOver = i
            break
          }
        }
        
        if (newOver !== overIndexRef.current) {
          overIndexRef.current = newOver
          setOverIndex(newOver)
        }
      },
      onPointerUp: (e: React.PointerEvent) => {
        if (dragIndexRef.current === null) return
        e.preventDefault()
        e.stopPropagation()
        
        const from = dragIndexRef.current
        const to = overIndexRef.current ?? from
        if (from !== to) {
          const next = [...itemsRef.current]
          const [moved] = next.splice(from, 1)
          next.splice(to, 0, moved)
          onReorder(next)
        }
        
        dragIndexRef.current = null
        overIndexRef.current = null
        setDragIndex(null)
        setOverIndex(null)
        listRef.current = null
      },
      onPointerCancel: () => {
        dragIndexRef.current = null
        overIndexRef.current = null
        setDragIndex(null)
        setOverIndex(null)
        listRef.current = null
      },
      style: { 
        touchAction: 'none', 
        cursor: dragIndex === index ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      } as React.CSSProperties,
    }
  }

  function getItemProps(index: number) {
    const isDragging = dragIndex === index
    const isOver = overIndex === index && dragIndex !== null && dragIndex !== index
    return {
      'data-drag-item': true,
      style: {
        opacity: isDragging ? 0.4 : 1,
        transition: 'opacity 0.15s',
        outline: isOver ? '2px solid #4d8eff' : undefined,
        borderRadius: isOver ? '8px' : undefined,
        touchAction: 'none', // Critical: prevent touch scrolling on items
        userSelect: 'none',
        WebkitUserSelect: 'none',
      } as React.CSSProperties,
    }
  }

  return { getHandleProps, getItemProps, dragIndex, overIndex }
}
