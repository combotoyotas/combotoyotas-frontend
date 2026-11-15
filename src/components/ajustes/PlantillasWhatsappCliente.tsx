'use client'

import { useState } from 'react'
import { ajustesApi } from '@/lib/ajustesApi'
import { invalidatePlantillaClienteWhatsappCache } from '@/lib/clienteRecordatorioWhatsapp'

const VARIABLES_HELP =
  '{{nombre}}, {{nombre_completo}}, {{proyecto}}, {{pachas}}, {{pachas_linea}}, {{deuda}}'

type Props = {
  mode: 'vendedor' | 'global'
  initial: { plantilla: string }
  onSaved?: (data: { plantilla: string }) => void
}

export default function PlantillasWhatsappCliente({ mode, initial, onSaved }: Props) {
  const [plantilla, setPlantilla] = useState(initial.plantilla)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const guardar = async () => {
    setGuardando(true)
    setMsg(null)
    try {
      const data =
        mode === 'global'
          ? await ajustesApi.saveGlobalWhatsappPlantillaCliente({ plantilla })
          : await ajustesApi.saveVendedorWhatsappPlantillaCliente({ plantilla })
      invalidatePlantillaClienteWhatsappCache()
      setPlantilla(data.plantilla)
      setMsg('Plantilla guardada')
      onSaved?.(data)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6">
      <h2 className="font-semibold text-slate-900 mb-1">WhatsApp — recordatorio en Clientes</h2>
      <p className="text-xs text-slate-500 mb-4">
        {mode === 'vendedor'
          ? 'Mensaje al pulsar «Recordar» en el módulo Clientes. Es distinto al recordatorio por boleta. Si lo dejas vacío, se usa la plantilla global.'
          : 'Plantilla por defecto para el botón Recordar del módulo Clientes (vendedores pueden personalizar la suya).'}{' '}
        Variables: {VARIABLES_HELP}
      </p>

      <textarea
        value={plantilla}
        onChange={(e) => setPlantilla(e.target.value)}
        rows={8}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono leading-relaxed"
        placeholder="Mensaje de recordatorio al cliente…"
      />

      <div className="flex items-center gap-3 mt-4">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar plantilla'}
        </button>
        {msg && <span className="text-sm text-slate-600">{msg}</span>}
      </div>
    </section>
  )
}