'use client'

import { useEffect } from 'react'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** Aplica clase PWA y evita gestos del navegador que rompen la sensación nativa. */
export default function PwaNativeEffects() {
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      root.classList.toggle('pwa-standalone', isStandalone())
    }
    apply()

    const mq = window.matchMedia('(display-mode: standalone)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  return null
}
