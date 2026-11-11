'use client'

import { useState } from 'react'
import { ajustesApi } from '@/lib/ajustesApi'
import { invalidatePlantillasWhatsappCache } from '@/lib/boletaWhatsappAcciones'

const VARIABLES_HELP =
  '{{nombre}}, {{boleta}}, {{proyecto}}, {{saldo}}, {{abono}}, {{precio}}, {{saldo_linea}}'

type Props = {
  mode: 'vendedor' | 'global'
  initial: { reservada: string; abonada: string }
  onSaved?: (data: { reservada: string; abonada: string }) => void
}

export default function PlantillasWhatsappBoleta({ mode, initial, onSaved }: Props) {
  const [reservada, setReservada] = useState(initial.reservada)
  const [abonada, setAbonada] = useState(initial.abonada)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const guardar = async () => {
    setGuardando(true)
    setMsg(null)
    try {
      const data =
        mode === 'global'
          ? await ajustesApi.saveGlobalWhatsappPlantillasBoleta({ reservada, abonada })
          : await ajustesApi.saveVendedorWhatsappPlantillasBoleta({ reservada, abonada })
      invalidatePlantillasWhatsappCache()
      setReservada(data.reservada)
      setAbonada(data.abonada)
      setMsg('Plantillas guardadas')
      onSaved?.(data)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6">
      <h2 className="font-semibold text-slate-900 mb-1">WhatsApp — recordatorios de boleta</h2>
      <p className="text-xs text-slate-500 mb-4">
        {mode === 'vendedor'
          ? 'Mensajes al usar «Recordatorio» en Ver Boletas. Si dejas vacío un campo, se usa la plantilla global.'
          : 'Plantillas por defecto del sistema (vendedores pueden personalizar las suyas en Ajustes).'}
        {' '}Variables: {VARIABLES_HELP}
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Boletas reservadas</label>
          <textarea
            value={reservada}
            onChange={(e) => setReservada(e.target.value)}
            rows={6}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono leading-relaxed"
            placeholder="Mensaje para clientes con boleta reservada…"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Boletas abonadas</label>
          <textarea
            value={abonada}
            onChange={(e) => setAbonada(e.target.value)}
            rows={6}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono leading-relaxed"
            placeholder="Mensaje para clientes con boleta abonada…"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar plantillas'}
        </button>
        {msg && <span className="text-sm text-slate-600">{msg}</span>}
      </div>
    </section>
  )
}
