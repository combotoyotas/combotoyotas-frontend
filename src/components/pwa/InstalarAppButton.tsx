'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Share, Plus, X, Smartphone } from 'lucide-react'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isIosSafari(): boolean {
  if (!isIos()) return false
  return !/crios|fxios|opios|edgios/i.test(navigator.userAgent)
}

function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false
  return /android/i.test(navigator.userAgent)
}

type GuideKind = 'ios' | 'android' | null

export default function InstalarAppButton() {
  const [visible, setVisible] = useState(false)
  const [guide, setGuide] = useState<GuideKind>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    const onPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)

    if (isIosSafari() || isAndroid()) {
      setVisible(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const handleInstall = useCallback(async () => {
    if (isIos()) {
      setGuide('ios')
      return
    }

    if (deferredPrompt) {
      try {
        setInstalling(true)
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') setVisible(false)
        setDeferredPrompt(null)
      } catch {
        setGuide('android')
      } finally {
        setInstalling(false)
      }
      return
    }

    setGuide('android')
  }, [deferredPrompt])

  if (!visible) return null

  return (
    <>
      <div className="mt-5 pt-5 border-t border-slate-100">
        <button
          type="button"
          onClick={handleInstall}
          disabled={installing}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 disabled:opacity-60 min-h-[44px]"
        >
          <Download className="w-4 h-4 shrink-0" aria-hidden />
          {installing ? 'Abriendo instalador…' : 'Instalar como app'}
        </button>
        <p className="mt-2 text-[11px] text-center text-slate-400 leading-relaxed">
          {isIos()
            ? 'Queda en tu pantalla de inicio, como una app nativa (Safari).'
            : deferredPrompt
              ? 'Un toque y se instala en tu celular.'
              : 'Agrégala a la pantalla de inicio para usarla a pantalla completa.'}
        </p>
      </div>

      {guide && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
          onClick={() => setGuide(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" aria-hidden />
                </div>
                <div>
                  <h2 id="pwa-guide-title" className="text-sm font-semibold text-slate-900">
                    Instalar en {guide === 'ios' ? 'iPhone' : 'Android'}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Rifa Super Toyota</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGuide(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {guide === 'ios' && !isIosSafari() && (
              <p className="text-sm text-red-700 font-medium mb-4 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                Abre esta página en <strong>Safari</strong> para poder instalar la app.
              </p>
            )}

            <ol className="space-y-4 text-sm text-slate-600">
              {guide === 'ios' ? (
                <>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center">1</span>
                    <span className="pt-0.5">
                      Toca <Share className="w-4 h-4 inline -mt-0.5 mx-0.5" aria-hidden /> <strong>Compartir</strong> en Safari.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center">2</span>
                    <span className="pt-0.5">
                      Elige <strong>Agregar a pantalla de inicio</strong>
                      <Plus className="w-4 h-4 inline -mt-0.5 mx-0.5" aria-hidden />.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center">3</span>
                    <span className="pt-0.5">
                      Toca <strong>Agregar</strong>. Listo: se abre a pantalla completa.
                    </span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center">1</span>
                    <span className="pt-0.5">Toca el menú <strong>⋮</strong> en Chrome.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center">2</span>
                    <span className="pt-0.5">
                      Selecciona <strong>Instalar app</strong> o <strong>Agregar a pantalla de inicio</strong>.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center">3</span>
                    <span className="pt-0.5">Confirma y la app quedará en tu pantalla de inicio.</span>
                  </li>
                </>
              )}
            </ol>

            <button
              type="button"
              onClick={() => setGuide(null)}
              className="mt-6 w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 min-h-[44px]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  )
}
