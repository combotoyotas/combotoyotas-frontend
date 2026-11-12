'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Smartphone } from 'lucide-react'
import { BRAND_NAME, BRAND_SHORT } from '@/config/brand'

/** Súbelo cuando cambien icono PWA, nombre en manifest o instalación en inicio. */
export const PWA_INSTALL_REVISION = '2025-11-combotoyotas-icon'

const STORAGE_KEY = 'pwa_install_revision_ack'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/**
 * Avisa cuando hay versión nueva del panel (service worker) y guía si el icono del inicio no cambió.
 */
export default function PwaUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [showIconGuide, setShowIconGuide] = useState(false)

  const applyUpdate = useCallback(() => {
    if (!waitingWorker) {
      window.location.reload()
      return
    }
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }, [waitingWorker])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const onControllerChange = () => {
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    const track = (worker: ServiceWorker | null) => {
      if (!worker) return
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          setWaitingWorker(worker)
        }
      })
    }

    navigator.serviceWorker.ready.then((registration) => {
      track(registration.installing)
      registration.addEventListener('updatefound', () => {
        track(registration.installing)
      })

      const check = () => {
        void registration.update().catch(() => {})
      }
      check()
      const interval = window.setInterval(check, 60 * 60 * 1000)
      const onVis = () => {
        if (document.visibilityState === 'visible') check()
      }
      document.addEventListener('visibilitychange', onVis)

      return () => {
        clearInterval(interval)
        document.removeEventListener('visibilitychange', onVis)
      }
    })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  useEffect(() => {
    if (!isStandalone()) return
    try {
      if (localStorage.getItem(STORAGE_KEY) === PWA_INSTALL_REVISION) return
      setShowIconGuide(true)
    } catch {
      setShowIconGuide(true)
    }
  }, [])

  const dismissIconGuide = () => {
    try {
      localStorage.setItem(STORAGE_KEY, PWA_INSTALL_REVISION)
    } catch {
      /* ignore */
    }
    setShowIconGuide(false)
  }

  return (
    <>
      {waitingWorker && (
        <div
          className="fixed inset-x-0 top-0 z-[200] flex justify-center p-2 pointer-events-none sm:p-3"
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex w-full max-w-lg flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm shadow-lg sm:flex-row sm:items-center sm:justify-between">
            <p className="text-amber-950">
              <strong>Nueva versión</strong> de {BRAND_SHORT}. Actualiza para usar los últimos cambios.
            </p>
            <button
              type="button"
              onClick={applyUpdate}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 min-h-[44px]"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Actualizar ahora
            </button>
          </div>
        </div>
      )}

      {showIconGuide && (
        <div
          className="fixed inset-0 z-[210] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-icon-guide-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
                <Smartphone className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 id="pwa-icon-guide-title" className="text-base font-semibold text-slate-900">
                  Icono nuevo en el inicio
                </h2>
                <p className="mt-1 text-xs text-slate-500">{BRAND_NAME}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              El panel ya tiene marca e icono nuevos. <strong>Dentro de la app</strong> se actualizan al pulsar
              &quot;Actualizar ahora&quot; cuando aparezca el aviso.
            </p>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              El <strong>acceso en la pantalla de inicio</strong> a veces sigue mostrando el icono viejo: es
              limitación del celular, no del panel.
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-600">
              {isIos() ? (
                <>
                  <li>Quita el icono antiguo del inicio (mantén pulsado → eliminar).</li>
                  <li>Abre el panel en Safari y usa Compartir → Agregar a pantalla de inicio.</li>
                </>
              ) : (
                <>
                  <li>Mantén pulsado el icono → desinstalar o quitar.</li>
                  <li>Abre el panel en Chrome y usa Instalar app o Agregar a pantalla de inicio.</li>
                </>
              )}
            </ol>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={dismissIconGuide}
                className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 min-h-[44px]"
              >
                Entendido
              </button>
              {waitingWorker && (
                <button
                  type="button"
                  onClick={() => {
                    applyUpdate()
                    dismissIconGuide()
                  }}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 min-h-[44px]"
                >
                  Actualizar panel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
