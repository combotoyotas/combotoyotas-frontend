'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/admin/PageHeader'
import { TokenManager } from '@/utils/auth'
import {
  ajustesApi,
  type LineaVentaItem,
  type MedioPagoItem,
} from '@/lib/ajustesApi'
import PlantillasWhatsappBoleta from '@/components/ajustes/PlantillasWhatsappBoleta'

type ConfigItem = MedioPagoItem | LineaVentaItem

function AjustesList({
  items,
  onSave,
  onDelete,
  onToggleActivo,
}: {
  items: ConfigItem[]
  onSave: (item: ConfigItem, nombre: string, descripcion: string) => Promise<void>
  onDelete: (item: ConfigItem) => Promise<void>
  onToggleActivo: (item: ConfigItem) => Promise<void>
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const startEdit = (item: ConfigItem) => {
    setEditingId(item.id)
    setEditNombre(item.nombre)
    setEditDesc(item.descripcion || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditNombre('')
    setEditDesc('')
  }

  const commitEdit = async (item: ConfigItem) => {
    if (!editNombre.trim()) return
    setBusyId(item.id)
    try {
      await onSave(item, editNombre.trim(), editDesc.trim())
      cancelEdit()
    } finally {
      setBusyId(null)
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500 mb-3 border border-dashed border-slate-200 rounded-lg px-3 py-4 text-center">
        Sin registros. Agrega uno abajo.
      </p>
    )
  }

  return (
    <ul className="space-y-2 mb-4">
      {items.map((item) => {
        const isEditing = editingId === item.id
        const inactive = item.activo === false
        return (
          <li
            key={item.id}
            className={`border rounded-lg px-3 py-2.5 ${
              inactive ? 'border-slate-100 bg-slate-50' : 'border-slate-200 bg-white'
            }`}
          >
            {isEditing ? (
              <div className="space-y-2">
                <input
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                  placeholder="Nombre"
                />
                <input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                  placeholder="Descripción (opcional)"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-xs text-slate-600 hover:underline"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!editNombre.trim() || busyId === item.id}
                    onClick={() => commitEdit(item)}
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
                  {item.descripcion ? (
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{item.descripcion}</div>
                  ) : null}
                  {inactive && (
                    <span className="inline-block mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                      Inactivo
                    </span>
                  )}
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
                    disabled={busyId === item.id}
                    onClick={async () => {
                      if (!confirm(`¿Eliminar «${item.nombre}»?`)) return
                      setBusyId(item.id)
                      try {
                        await onDelete(item)
                      } finally {
                        setBusyId(null)
                      }
                    }}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
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
  )
}

export default function AjustesPage() {
  const router = useRouter()
  const [rol, setRol] = useState<string | null>(null)
  const [medios, setMedios] = useState<MedioPagoItem[]>([])
  const [lineas, setLineas] = useState<LineaVentaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nuevoMedio, setNuevoMedio] = useState('')
  const [nuevaLinea, setNuevaLinea] = useState('')
  const [comisionPagadaPct, setComisionPagadaPct] = useState('25')
  const [comisionAbonoPct, setComisionAbonoPct] = useState('20')
  const [guardandoComision, setGuardandoComision] = useState(false)
  const [plantillasWa, setPlantillasWa] = useState<{ reservada: string; abonada: string }>({
    reservada: '',
    abonada: '',
  })

  const load = useCallback(async (userRol: string) => {
    setLoading(true)
    setError(null)
    try {
      if (userRol === 'SUPER_ADMIN') {
        const [gMedios, gLineas, comision, plantillas] = await Promise.all([
          ajustesApi.getGlobalMedios(),
          ajustesApi.getGlobalLineas(),
          ajustesApi.getComisionVendedores(),
          ajustesApi.getGlobalWhatsappPlantillasBoleta(),
        ])
        setMedios(gMedios)
        setLineas(gLineas)
        setPlantillasWa(plantillas)
        setComisionPagadaPct(
          String(comision.comision_vendedores_pagada_pct ?? comision.comision_vendedores_pct ?? 25)
        )
        setComisionAbonoPct(String(comision.comision_vendedores_abono_pct ?? 20))
      } else if (userRol === 'VENDEDOR') {
        const [data, plantillas] = await Promise.all([
          ajustesApi.getMisAjustes(),
          ajustesApi.getWhatsappPlantillasBoleta(),
        ])
        setMedios(data.medios_pago)
        setLineas(data.lineas_venta)
        setPlantillasWa(plantillas)
      } else {
        router.replace('/dashboard')
        return
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error cargando ajustes')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const user = TokenManager.getUser()
    if (!user) {
      router.replace('/login')
      return
    }
    const r = String(user.rol || '').toUpperCase()
    if (r !== 'VENDEDOR' && r !== 'SUPER_ADMIN') {
      router.replace('/dashboard')
      return
    }
    setRol(r)
    load(r)
  }, [load, router])

  const isSuper = rol === 'SUPER_ADMIN'

  const saveMedio = async (item: ConfigItem, nombre: string, descripcion: string) => {
    if (!rol) return
    const body = {
      id: item.id,
      nombre,
      descripcion: descripcion || null,
      activo: item.activo !== false,
    }
    if (isSuper) {
      await ajustesApi.saveGlobalMedio(body)
    } else {
      await ajustesApi.saveMedioVendedor(body)
    }
    await load(rol)
  }

  const saveLinea = async (item: ConfigItem, nombre: string, descripcion: string) => {
    if (!rol) return
    const body = {
      id: item.id,
      nombre,
      descripcion: descripcion || null,
      activo: item.activo !== false,
    }
    if (isSuper) {
      await ajustesApi.saveGlobalLinea(body)
    } else {
      await ajustesApi.saveLineaVendedor(body)
    }
    await load(rol)
  }

  const toggleMedio = async (m: MedioPagoItem) => {
    if (!rol) return
    try {
      const body = {
        id: m.id,
        nombre: m.nombre,
        descripcion: m.descripcion,
        activo: !m.activo,
      }
      if (isSuper) await ajustesApi.saveGlobalMedio(body)
      else await ajustesApi.saveMedioVendedor(body)
      await load(rol)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error guardando')
    }
  }

  const toggleLinea = async (l: LineaVentaItem) => {
    if (!rol) return
    try {
      const body = {
        id: l.id,
        nombre: l.nombre,
        descripcion: l.descripcion,
        activo: !l.activo,
      }
      if (isSuper) await ajustesApi.saveGlobalLinea(body)
      else await ajustesApi.saveLineaVendedor(body)
      await load(rol)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error guardando')
    }
  }

  const deleteMedio = async (m: ConfigItem) => {
    if (!rol) return
    try {
      if (isSuper) await ajustesApi.deleteGlobalMedio(m.id)
      else await ajustesApi.deleteMedioVendedor(m.id)
      await load(rol)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar')
    }
  }

  const deleteLinea = async (l: ConfigItem) => {
    if (!rol) return
    try {
      if (isSuper) await ajustesApi.deleteGlobalLinea(l.id)
      else await ajustesApi.deleteLineaVendedor(l.id)
      await load(rol)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar')
    }
  }

  const addMedio = async () => {
    if (!nuevoMedio.trim() || !rol) return
    try {
      if (isSuper) {
        const row = await ajustesApi.saveGlobalMedio({ nombre: nuevoMedio.trim(), activo: true })
        setMedios((prev) => [...prev.filter((m) => m.id !== row.id), row])
      } else {
        const row = await ajustesApi.saveMedioVendedor({ nombre: nuevoMedio.trim(), activo: true })
        setMedios((prev) => [...prev.filter((m) => m.id !== row.id), row])
      }
      setNuevoMedio('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error creando medio')
    }
  }

  const addLinea = async () => {
    if (!nuevaLinea.trim() || !rol) return
    try {
      if (isSuper) {
        const row = await ajustesApi.saveGlobalLinea({ nombre: nuevaLinea.trim(), activo: true })
        setLineas((prev) => [...prev.filter((l) => l.id !== row.id), row])
      } else {
        const row = await ajustesApi.saveLineaVendedor({ nombre: nuevaLinea.trim(), activo: true })
        setLineas((prev) => [...prev.filter((l) => l.id !== row.id), row])
      }
      setNuevaLinea('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error creando línea')
    }
  }

  return (
    <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-3xl">
      <PageHeader
        eyebrow="Configuración"
        title="Ajustes"
        description={
          isSuper
            ? 'Medios de pago y líneas de venta globales para administradores y movimientos del panel.'
            : 'Tus medios de pago y líneas de venta (canal) para ventas, abonos y reservas.'
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Cargando…</p>
      ) : (
        <>
          {isSuper && (
            <section className="bg-white border border-indigo-200 rounded-xl p-5 mb-6 shadow-sm">
              <h2 className="font-semibold text-slate-900 mb-1">Comisión vendedores</h2>
              <p className="text-xs text-slate-500 mb-4">
                Dos porcentajes globales usados en «Mis ganancias» y cuentas de vendedores: uno sobre
                el precio de boletas <strong>pagadas</strong> y otro sobre el dinero{' '}
                <strong>abonado</strong> en boletas abonadas. El resto es parte de la empresa.
              </p>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600">Comisión boletas pagadas (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={comisionPagadaPct}
                    onChange={(e) => setComisionPagadaPct(e.target.value)}
                    className="mt-1 block w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Comisión boletas abonadas (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={comisionAbonoPct}
                    onChange={(e) => setComisionAbonoPct(e.target.value)}
                    className="mt-1 block w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <button
                  type="button"
                  disabled={guardandoComision}
                  onClick={async () => {
                    setGuardandoComision(true)
                    setError(null)
                    try {
                      const row = await ajustesApi.saveComisionVendedores({
                        comision_vendedores_pagada_pct: Number(comisionPagadaPct),
                        comision_vendedores_abono_pct: Number(comisionAbonoPct),
                      })
                      setComisionPagadaPct(String(row.comision_vendedores_pagada_pct))
                      setComisionAbonoPct(String(row.comision_vendedores_abono_pct))
                    } catch (e: unknown) {
                      setError(e instanceof Error ? e.message : 'Error guardando comisión')
                    } finally {
                      setGuardandoComision(false)
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                >
                  {guardandoComision ? 'Guardando…' : 'Guardar comisiones'}
                </button>
              </div>
            </section>
          )}

          <PlantillasWhatsappBoleta
            mode={isSuper ? 'global' : 'vendedor'}
            initial={plantillasWa}
            onSaved={setPlantillasWa}
          />

          <section className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-1">Medios de pago</h2>
            <p className="text-xs text-slate-500 mb-4">
              Aparecen al registrar abonos y ventas. Puedes editar, desactivar o eliminar si no
              tienen movimientos.
            </p>
            <AjustesList
              items={medios}
              onSave={saveMedio}
              onDelete={deleteMedio}
              onToggleActivo={(item) => toggleMedio(item as MedioPagoItem)}
            />
            <div className="flex gap-2">
              <input
                value={nuevoMedio}
                onChange={(e) => setNuevoMedio(e.target.value)}
                placeholder="Nuevo medio…"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addMedio()}
              />
              <button
                type="button"
                onClick={addMedio}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg"
              >
                Agregar
              </button>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-1">Líneas de venta</h2>
            <p className="text-xs text-slate-500 mb-4">
              Canal del movimiento (WhatsApp, presencial, etc.). Obligatorio en venta, abono y
              reserva.
            </p>
            <AjustesList
              items={lineas}
              onSave={saveLinea}
              onDelete={deleteLinea}
              onToggleActivo={(item) => toggleLinea(item as LineaVentaItem)}
            />
            <div className="flex gap-2">
              <input
                value={nuevaLinea}
                onChange={(e) => setNuevaLinea(e.target.value)}
                placeholder="Nueva línea…"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addLinea()}
              />
              <button
                type="button"
                onClick={addLinea}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg"
              >
                Agregar
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
