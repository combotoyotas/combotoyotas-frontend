'use client'

import { useCallback, useEffect, useState } from 'react'
import { paginasWebApi, type PaginaContactoItem } from '@/lib/paginasWebApi'

function ContactoList({
  title,
  hint,
  valorPlaceholder,
  items,
  onSave,
  onDelete,
  onToggleActivo,
  onCreate,
}: {
  title: string
  hint: string
  valorPlaceholder: string
  items: PaginaContactoItem[]
  onSave: (item: PaginaContactoItem, nombre: string, valor: string) => Promise<void>
  onDelete: (item: PaginaContactoItem) => Promise<void>
  onToggleActivo: (item: PaginaContactoItem) => Promise<void>
  onCreate: (nombre: string, valor: string) => Promise<void>
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editValor, setEditValor] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoValor, setNuevoValor] = useState('')
  const [busy, setBusy] = useState(false)

  const startEdit = (item: PaginaContactoItem) => {
    setEditingId(item.id)
    setEditNombre(item.nombre)
    setEditValor(item.valor || '')
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm mb-4">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">{title}</h2>
      <p className="text-xs text-slate-500 mb-3">{hint}</p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg px-3 py-4 text-center mb-3">
          Sin registros. Agrega uno abajo.
        </p>
      ) : (
        <ul className="space-y-2 mb-4">
          {items.map((item) => {
            const inactive = item.activo === false
            const isEditing = editingId === item.id
            return (
              <li
                key={item.id}
                className={`border rounded-lg px-3 py-2.5 ${
                  inactive ? 'border-slate-100 bg-slate-50' : 'border-slate-200'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                      placeholder="Nombre (ej. Nequi)"
                    />
                    <input
                      value={editValor}
                      onChange={(e) => setEditValor(e.target.value)}
                      className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                      placeholder={valorPlaceholder}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-xs text-slate-600 hover:underline"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!editNombre.trim() || !editValor.trim() || busy}
                        onClick={async () => {
                          setBusy(true)
                          try {
                            await onSave(item, editNombre.trim(), editValor.trim())
                            setEditingId(null)
                          } finally {
                            setBusy(false)
                          }
                        }}
                        className="text-xs font-medium text-white bg-slate-900 px-3 py-1 rounded-md disabled:opacity-50"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div
                        className={`font-medium text-sm ${
                          inactive ? 'text-slate-400 line-through' : 'text-slate-900'
                        }`}
                      >
                        {item.nombre}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5 break-all">{item.valor}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleActivo(item)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        {inactive ? 'Activar' : 'Desactivar'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(`¿Eliminar «${item.nombre}»?`)) return
                          setBusy(true)
                          try {
                            await onDelete(item)
                          } finally {
                            setBusy(false)
                          }
                        }}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <div className="border-t border-slate-100 pt-3 space-y-2">
        <p className="text-xs font-medium text-slate-700">Agregar</p>
        <input
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm"
          placeholder="Nombre"
        />
        <input
          value={nuevoValor}
          onChange={(e) => setNuevoValor(e.target.value)}
          className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm"
          placeholder={valorPlaceholder}
        />
        <button
          type="button"
          disabled={!nuevoNombre.trim() || !nuevoValor.trim() || busy}
          onClick={async () => {
            setBusy(true)
            try {
              await onCreate(nuevoNombre.trim(), nuevoValor.trim())
              setNuevoNombre('')
              setNuevoValor('')
            } finally {
              setBusy(false)
            }
          }}
          className="text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-indigo-700"
        >
          Guardar nuevo
        </button>
      </div>
    </section>
  )
}

export default function PaginaWebContacto() {
  const [medios, setMedios] = useState<PaginaContactoItem[]>([])
  const [lineas, setLineas] = useState<PaginaContactoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await paginasWebApi.getContactoPagina()
      if (!res.success) throw new Error(res.message || 'Error')
      setMedios(res.data?.medios_pago || [])
      setLineas(res.data?.lineas_whatsapp || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <p className="text-sm text-slate-500 mb-4">Cargando ajustes de página…</p>
  if (error) return <p className="text-sm text-red-600 mb-4">{error}</p>

  return (
  <>
    <ContactoList
      title="Medios de pago"
      hint="Nombre visible y valor (llave, cuenta o número). Solo en tu landing."
      valorPlaceholder="Llave, cuenta o número (ej. 3001234567)"
      items={medios}
      onCreate={async (nombre, valor) => {
        const res = await paginasWebApi.saveMedioPagina({ nombre, valor })
        if (!res.success) throw new Error(res.message)
        setMedios((prev) => [...prev, res.data])
      }}
      onSave={async (item, nombre, valor) => {
        const res = await paginasWebApi.saveMedioPagina({ id: item.id, nombre, valor })
        if (!res.success) throw new Error(res.message)
        setMedios((prev) => prev.map((m) => (m.id === item.id ? res.data : m)))
      }}
      onToggleActivo={async (item) => {
        const res = await paginasWebApi.saveMedioPagina({
          id: item.id,
          nombre: item.nombre,
          valor: item.valor,
          activo: !(item.activo !== false),
        })
        if (!res.success) throw new Error(res.message)
        setMedios((prev) => prev.map((m) => (m.id === item.id ? res.data : m)))
      }}
      onDelete={async (item) => {
        const res = await paginasWebApi.deleteMedioPagina(item.id)
        if (!res.success) throw new Error(res.message)
        setMedios((prev) => prev.filter((m) => m.id !== item.id))
      }}
    />
    <ContactoList
      title="Líneas WhatsApp (landing)"
      hint="Nombre en el botón de la página; el número va en valor (celular con o sin 57)."
      valorPlaceholder="Número WhatsApp (ej. 573001234567)"
      items={lineas}
      onCreate={async (nombre, valor) => {
        const res = await paginasWebApi.saveLineaWhatsApp({ nombre, valor })
        if (!res.success) throw new Error(res.message)
        setLineas((prev) => [...prev, res.data])
      }}
      onSave={async (item, nombre, valor) => {
        const res = await paginasWebApi.saveLineaWhatsApp({ id: item.id, nombre, valor })
        if (!res.success) throw new Error(res.message)
        setLineas((prev) => prev.map((m) => (m.id === item.id ? res.data : m)))
      }}
      onToggleActivo={async (item) => {
        const res = await paginasWebApi.saveLineaWhatsApp({
          id: item.id,
          nombre: item.nombre,
          valor: item.valor,
          activo: !(item.activo !== false),
        })
        if (!res.success) throw new Error(res.message)
        setLineas((prev) => prev.map((m) => (m.id === item.id ? res.data : m)))
      }}
      onDelete={async (item) => {
        const res = await paginasWebApi.deleteLineaWhatsApp(item.id)
        if (!res.success) throw new Error(res.message)
        setLineas((prev) => prev.filter((m) => m.id !== item.id))
      }}
    />
  </>
  )
}