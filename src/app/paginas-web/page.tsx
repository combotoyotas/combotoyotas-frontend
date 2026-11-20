'use client'

import { useCallback, useEffect, useState } from 'react'
import { paginasWebApi, VendedorPaginaRow } from '@/lib/paginasWebApi'
import { TokenManager } from '@/utils/auth'
import { useRouter } from 'next/navigation'

export default function PaginasWebAdminPage() {
  const router = useRouter()
  const [rows, setRows] = useState<VendedorPaginaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const user = TokenManager.getUser()
      if (String(user?.rol).toUpperCase() !== 'SUPER_ADMIN') {
        router.replace('/dashboard')
        return
      }
      const res = await paginasWebApi.listVendedores()
      if (!res.success) throw new Error(res.message || 'Error al cargar')
      setRows(res.data || [])
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  async function save(row: VendedorPaginaRow) {
    setSavingId(row.id)
    try {
      const slugInput = document.getElementById(`slug-${row.id}`) as HTMLInputElement | null
      const enabled = (document.getElementById(`on-${row.id}`) as HTMLInputElement)?.checked
      const slug = slugInput?.value?.trim() || ''
      if (enabled && slug.length < 2) {
        alert('Escribe un enlace (slug) de al menos 2 letras, por ejemplo: andres')
        return
      }
      const res = await paginasWebApi.configurar(row.id, Boolean(enabled), slug)
      if (!res.success) throw new Error(res.message || 'No se pudo guardar')
      alert(
        enabled
          ? `Página activada. El vendedor debe recargar el dashboard (o volver a entrar).`
          : 'Página desactivada.'
      )
      await load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Páginas web de vendedores</h1>
        <p className="text-slate-600 mb-6 text-sm">
          Habilita un enlace tipo <strong>combotoyotas.com/nombre</strong>. El cliente reserva solo del
          inventario asignado a ese vendedor; las reservas llegan al módulo &quot;Página web&quot; del
          vendedor, no a Ventas públicas.
        </p>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        {loading ? (
          <p className="text-slate-500">Cargando…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="px-4 py-3">Vendedor</th>
                  <th className="px-4 py-3">Activo</th>
                  <th className="px-4 py-3">Página</th>
                  <th className="px-4 py-3">Slug / enlace</th>
                  <th className="px-4 py-3">Reservas</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{row.nombre}</td>
                    <td className="px-4 py-3">{row.activo ? 'Sí' : 'No'}</td>
                    <td className="px-4 py-3">
                      <input
                        id={`on-${row.id}`}
                        type="checkbox"
                        defaultChecked={row.pagina_web_habilitada}
                        disabled={!row.activo}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        id={`slug-${row.id}`}
                        className="border rounded px-2 py-1 w-40"
                        defaultValue={row.pagina_web_slug || ''}
                        placeholder="andres"
                      />
                      {row.url && (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-indigo-600 text-xs mt-1"
                        >
                          {row.url}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">{row.reservas_pagina ?? 0}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 disabled:opacity-50"
                        disabled={!row.activo || savingId === row.id}
                        onClick={() => save(row)}
                      >
                        {savingId === row.id ? 'Guardando…' : 'Guardar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}