'use client'

import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  /** Ej. «Boleta #0042» */
  boletaLabel?: string
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  saving?: boolean
}

export default function BoletaNotaEditorModal({
  open,
  boletaLabel,
  value,
  onChange,
  onSave,
  onCancel,
  saving = false,
}: Props) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onCancel()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onCancel, saving])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Cerrar"
        disabled={saving}
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center pt-2 pb-0 sm:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-slate-200" />
        </div>
        <div className="px-5 pt-4 pb-5 sm:pt-5">
          <h4 id={titleId} className="text-lg font-semibold text-slate-900">
            Nota en la boleta
          </h4>
          {boletaLabel ? (
            <p className="text-sm text-slate-600 mt-0.5 font-mono">{boletaLabel}</p>
          ) : null}
          <p className="text-xs text-slate-500 mt-2 mb-3">
            Se imprime debajo del código QR, al mismo tamaño que el nombre del cliente.
          </p>
          <label className="sr-only" htmlFor={`${titleId}-nota`}>
            Texto de la nota
          </label>
          <textarea
            id={`${titleId}-nota`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={500}
            rows={4}
            autoFocus
            disabled={saving}
            enterKeyHint="done"
            className="w-full min-h-[120px] text-base sm:text-sm border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
            placeholder="Ej. Entregar en la casa del cliente…"
          />
          <p className="text-[11px] text-slate-400 mt-1 text-right">{value.length}/500</p>
          <div className="flex flex-col-reverse sm:flex-row gap-2 mt-4 sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="min-h-[48px] px-4 py-2.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="min-h-[48px] px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar nota'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}