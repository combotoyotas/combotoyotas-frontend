'use client'

import { useState } from 'react'
import { paginasWebApi } from '@/lib/paginasWebApi'

export default function PaginaWebVentaToggle({
  initialActiva,
  onChanged,
}: {
  initialActiva: boolean
  onChanged?: (activa: boolean) => void
}) {
  const [activa, setActiva] = useState(initialActiva)
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    const next = !activa
    setBusy(true)
    try {
      const res = await paginasWebApi.setVentaActiva(next)
      if (!res.success) throw new Error(res.message)
      const v = res.data?.venta_activa !== false
      setActiva(v)
      onChanged?.(v)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'No se pudo actualizar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Venta online en tu enlace</h2>
          <p className="text-sm text-slate-600 mt-1">
            {activa
              ? 'Los clientes pueden ver boletas y reservar en tu página.'
              : 'Pausado: en tu enlace verán «Venta online pausada» y no podrán reservar.'}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={toggle}
          className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${
            activa
              ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-50'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {busy ? '…' : activa ? 'Pausar ventas' : 'Activar ventas'}
        </button>
      </div>
    </section>
  )
}