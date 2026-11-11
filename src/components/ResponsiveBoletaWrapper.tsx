'use client'

import { useRef, useEffect, useState, ReactNode } from 'react'
import { BOLETA_WIDTH, BOLETA_DEFAULT_HEIGHT } from '@/constants/boletaDimensions'

/**
 * Wrapper que escala visualmente un BoletaTicket para pantallas estrechas.
 * La altura se adapta al ticket real (según proporción del arte del proyecto).
 */
export default function ResponsiveBoletaWrapper({ children, id }: { children: ReactNode; id?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [ticketHeight, setTicketHeight] = useState(BOLETA_DEFAULT_HEIGHT)

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return
      const parentWidth =
        containerRef.current.parentElement?.clientWidth ?? containerRef.current.clientWidth
      const usable = Math.max(0, parentWidth - 8)
      const newScale = usable < BOLETA_WIDTH ? usable / BOLETA_WIDTH : 1
      setScale(newScale)
    }

    updateScale()

    const ro = new ResizeObserver(updateScale)
    const parent = containerRef.current?.parentElement
    if (parent) ro.observe(parent)
    window.addEventListener('resize', updateScale)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateScale)
    }
  }, [])

  useEffect(() => {
    const inner = innerRef.current
    if (!inner) return

    const observeTicket = () => {
      const ticket = inner.querySelector('.boleta-ticket') as HTMLElement | null
      if (!ticket) return
      const h = ticket.offsetHeight
      if (h > 0) setTicketHeight(h)
    }

    observeTicket()
    const ro = new ResizeObserver(observeTicket)
    const ticket = inner.querySelector('.boleta-ticket')
    if (ticket) ro.observe(ticket)
    return () => ro.disconnect()
  }, [children])

  const scaledHeight = Math.ceil(ticketHeight * scale) + 4

  return (
    <div
      ref={containerRef}
      className="w-full relative"
      style={{ height: `${scaledHeight}px`, minHeight: `${scaledHeight}px` }}
    >
      <div
        ref={innerRef}
        id={id}
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: 'top center',
          width: `${BOLETA_WIDTH}px`,
          height: `${ticketHeight}px`,
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </div>
  )
}
