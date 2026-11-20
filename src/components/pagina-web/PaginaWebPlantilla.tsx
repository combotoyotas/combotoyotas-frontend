'use client'

import { useEffect, useState } from 'react'
import { paginasWebApi } from '@/lib/paginasWebApi'
import { PLANTILLA_PAGINA_WEB_DEFAULT } from '@/utils/paginaWebMensaje'

export default function PaginaWebPlantilla() {
  const [plantilla, setPlantilla] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await paginasWebApi.getContactoPagina()
        if (res.success) {
          setPlantilla(res.data?.plantilla_contacto || '')
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const guardar = async () => {
    setSaving(true)
    setOk(false)
    try {
      const res = await paginasWebApi.savePlantillaContacto(plantilla)
      if (!res.success) throw new Error(res.message)
      setOk(true)
      setTimeout(() => setOk(false), 2500)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Cargando plantilla…</p>

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm mb-4">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Mensaje al contactar cliente</h2>
      <p className="text-xs text-slate-500 mb-3">
        Se usa al pulsar «Contactar» en cada reserva. Variables:{' '}
        <code className="text-[11px] bg-slate-100 px-1 rounded">{'{{nombre}}'}</code>,{' '}
        <code className="text-[11px] bg-slate-100 px-1 rounded">{'{{cedula}}'}</code>,{' '}
        <code className="text-[11px] bg-slate-100 px-1 rounded">{'{{rifa}}'}</code>,{' '}
        <code className="text-[11px] bg-slate-100 px-1 rounded">{'{{boletas}}'}</code>,{' '}
        <code className="text-[11px] bg-slate-100 px-1 rounded">{'{{total}}'}</code>,{' '}
        <code className="text-[11px] bg-slate-100 px-1 rounded">{'{{medios_pago}}'}</code>
      </p>
      <textarea
        value={plantilla}
        onChange={(e) => setPlantilla(e.target.value)}
        rows={12}
        className="w-full font-mono text-sm border border-slate-200 rounded-lg p-3 resize-y"
        placeholder={PLANTILLA_PAGINA_WEB_DEFAULT}
      />
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <button
          type="button"
          disabled={saving}
          onClick={guardar}
          className="text-sm font-medium text-white bg-slate-900 px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar plantilla'}
        </button>
        <button
          type="button"
          className="text-xs text-slate-600 hover:underline"
          onClick={() => setPlantilla('')}
        >
          Usar plantilla por defecto
        </button>
        {ok ? <span className="text-xs text-emerald-600 font-medium">Guardado ✓</span> : null}
      </div>
    </section>
  )
}