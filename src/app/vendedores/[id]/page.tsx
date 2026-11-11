'use client'

import { Suspense, useEffect, useMemo, useState, use } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  vendedoresStatsApi,
  VendedorDetalleResponse,
  VendedorBoletaRow,
  CuentaDesgloseBoletas,
} from '@/lib/vendedoresStatsApi'
import { rifaApi } from '@/lib/rifaApi'
import { boletaApi } from '@/lib/boletaApi'
import BoletaCuadricula, { CuadriculaBoleta } from '@/components/BoletaCuadricula'
import type { Rifa } from '@/types/rifa'

const BOLETA_NUM_WIDTH = 5

const fmtNumBoleta = (n: number) => String(n).padStart(BOLETA_NUM_WIDTH, '0')

const formatBoletaNumeros = (b: { numero: number; numeros?: number[] }) => {
  const nums = b.numeros?.length ? b.numeros : [b.numero]
  return nums.map((n) => `#${fmtNumBoleta(n)}`).join(' · ')
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0)

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—'

const todayISO = () => new Date().toISOString().slice(0, 10)

const ESTADO_BADGE: Record<string, string> = {
  PAGADA: 'bg-emerald-100 text-emerald-700',
  ABONADA: 'bg-blue-100 text-blue-700',
  RESERVADA: 'bg-amber-100 text-amber-700',
  PENDIENTE: 'bg-amber-100 text-amber-700',
  CANCELADA: 'bg-red-100 text-red-700',
  EXPIRADA: 'bg-slate-200 text-slate-600',
}

type Area = 'operacion' | 'cuenta'
type TabOperacion = 'boletas' | 'ventas' | 'clientes' | 'libres'
type FiltroBoleta = 'TODAS' | 'PAGADA' | 'ABONADA' | 'RESERVADA'

export default function VendedorDetallePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-slate-600">Cargando…</div>}>
      <VendedorDetallePageContent params={params} />
    </Suspense>
  )
}

function VendedorDetallePageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const sp = useSearchParams()

  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null as string | null)
  const [data, setData] = useState(null as VendedorDetalleResponse | null)
  const [fechaInicio, setFechaInicio] = useState(sp.get('fechaInicio') || '')
  const [fechaFin, setFechaFin] = useState(sp.get('fechaFin') || '')
  const [area, setArea] = useState('operacion' as Area)
  const [tabOp, setTabOp] = useState('boletas' as TabOperacion)
  const [filtroBoleta, setFiltroBoleta] = useState('TODAS' as FiltroBoleta)
  const [liqMonto, setLiqMonto] = useState('')
  const [liqNotas, setLiqNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [rifasCuadricula, setRifasCuadricula] = useState([] as Rifa[])
  const [rifaCuadriculaId, setRifaCuadriculaId] = useState('')
  const [cuadriculaBoletas, setCuadriculaBoletas] = useState([] as CuadriculaBoleta[])
  const [loadingCuadricula, setLoadingCuadricula] = useState(false)

  const esVendedor = data?.vendedor?.rol === 'VENDEDOR'

  const porCobrar = data?.resumen?.por_cobrar_global ?? data?.cuenta_global?.por_cobrar ?? 0
  const desgloseCuenta = data?.cuenta_global?.desglose

  const termino = busqueda.trim().toLowerCase()

  const matchBoleta = (b: VendedorBoletaRow) => {
    if (!termino) return true
    const nums = b.numeros?.length ? b.numeros : [b.numero]
    const numHit = nums.some((n) => {
      const raw = String(n)
      const pad = fmtNumBoleta(n)
      return raw.includes(termino) || pad.includes(termino) || `#${pad}`.includes(termino)
    })
    const cli = `${b.cliente_nombre || ''} ${b.cliente_telefono || ''}`.toLowerCase()
    return numHit || cli.includes(termino)
  }

  const matchClienteTexto = (nombre?: string | null, tel?: string | null, email?: string | null) => {
    if (!termino) return true
    return `${nombre || ''} ${tel || ''} ${email || ''}`.toLowerCase().includes(termino)
  }

  const boletasFiltradas = useMemo(() => {
    let list = data?.boletas ?? []
    if (filtroBoleta !== 'TODAS') list = list.filter((b) => b.estado === filtroBoleta)
    if (termino) list = list.filter(matchBoleta)
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.boletas, filtroBoleta, termino])

  const ventasFiltradas = useMemo(() => {
    const list = data?.ventas ?? []
    if (!termino) return list
    return list.filter((v) => matchClienteTexto(v.cliente_nombre, v.cliente_telefono))
  }, [data?.ventas, termino])

  const clientesFiltrados = useMemo(() => {
    const list = data?.clientes ?? []
    if (!termino) return list
    return list.filter((c) => matchClienteTexto(c.nombre, c.telefono, c.email))
  }, [data?.clientes, termino])

  const libresFiltradas = useMemo(() => {
    const list = data?.boletas_libres ?? []
    if (!termino) return list
    return list.filter((b) => {
      const pad = fmtNumBoleta(b.numero)
      return pad.includes(termino) || String(b.numero).includes(termino) || b.rifa_nombre.toLowerCase().includes(termino)
    })
  }, [data?.boletas_libres, termino])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token || !userData) {
      router.push('/login')
      return
    }
    try {
      const u = JSON.parse(userData)
      if (String(u.rol || '').toUpperCase() === 'SUPER_ADMIN') {
        setAuthorized(true)
      } else {
        router.push('/dashboard')
      }
    } catch {
      router.push('/login')
    }
  }, [router])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await vendedoresStatsApi.detalle(id, fechaInicio || undefined, fechaFin || undefined)
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authorized) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized])

  useEffect(() => {
    if (!esVendedor && area === 'cuenta') setArea('operacion')
  }, [esVendedor, area])

  useEffect(() => {
    if (!authorized || area !== 'cuenta' || !esVendedor) return
    let cancel = false
    ;(async () => {
      try {
        const res = await rifaApi.getRifasOperativas()
        if (cancel) return
        const lista = res.data || []
        setRifasCuadricula(lista)
        setRifaCuadriculaId((prev) => {
          if (prev && lista.some((r) => r.id === prev)) return prev
          const fromLibres = data?.boletas_libres?.[0]?.rifa_id
          if (fromLibres && lista.some((r) => r.id === fromLibres)) return fromLibres
          return lista[0]?.id || ''
        })
      } catch {
        if (!cancel) setRifasCuadricula([])
      }
    })()
    return () => {
      cancel = true
    }
  }, [authorized, area, esVendedor, data?.boletas_libres])

  useEffect(() => {
    if (!authorized || area !== 'cuenta' || !esVendedor || !rifaCuadriculaId) {
      setCuadriculaBoletas([])
      return
    }
    let cancel = false
    setLoadingCuadricula(true)
    ;(async () => {
      try {
        const res = await boletaApi.getBoletasCuadricula(rifaCuadriculaId, { vendedorId: id })
        if (!cancel) setCuadriculaBoletas(res.data.boletas || [])
      } catch {
        if (!cancel) setCuadriculaBoletas([])
      } finally {
        if (!cancel) setLoadingCuadricula(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [authorized, area, esVendedor, rifaCuadriculaId, id])

  const registrarEntrega = async () => {
    setGuardando(true)
    setError(null)
    try {
      await vendedoresStatsApi.registrarLiquidacion(id, {
        monto: Number(liqMonto),
        notas: liqNotas || undefined,
      })
      setLiqMonto('')
      setLiqNotas('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error registrando entrega')
    } finally {
      setGuardando(false)
    }
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/30">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-14">
            <a href="/dashboard" className="text-slate-500 hover:text-slate-800 text-sm font-medium">
              ← Dashboard
            </a>
            <span className="text-slate-300">/</span>
            <a href="/vendedores" className="text-slate-500 hover:text-slate-800 text-sm font-medium">
              Equipo
            </a>
            <span className="text-slate-300">/</span>
            <h1 className="text-base font-semibold text-slate-800 truncate">{data?.vendedor?.nombre || 'Detalle'}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {data?.vendedor && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xl font-semibold text-slate-900">{data.vendedor.nombre}</div>
                <div className="text-sm text-slate-500">{data.vendedor.email}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {data.vendedor.rol} · Último login {fmtDate(data.vendedor.ultimo_login)}
                </div>
              </div>
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${data.vendedor.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
              >
                {data.vendedor.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            {esVendedor && (
              <div className="mt-4 flex flex-col sm:flex-row gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setArea('operacion')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    area === 'operacion' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Operación comercial
                </button>
                <button
                  type="button"
                  onClick={() => setArea('cuenta')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    area === 'cuenta' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cuenta y entregas
                  {porCobrar > 0 && (
                    <span className="ml-2 text-xs font-bold text-rose-600">{fmtMoney(porCobrar)}</span>
                  )}
                </button>
              </div>
            )}
          </section>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {area === 'cuenta' && esVendedor && data && (
          <section className="space-y-4">
            <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide">Estado de cuenta</h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                Lo que el vendedor debe entregar a la organización: en pagadas aplica{' '}
                {Number(data.resumen.comision_porcentaje ?? 0)}% para el vendedor; en abonadas{' '}
                {Number(data.resumen.comision_abono_porcentaje ?? data.resumen.comision_porcentaje ?? 0)}% sobre lo
                abonado (configurado en Ajustes). Hasta registrar la entrega, no suma al recaudo del panel.
              </p>
              {desgloseCuenta && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-xs sm:text-sm border border-emerald-100 rounded-lg overflow-hidden">
                    <thead className="bg-emerald-100/60 text-emerald-900 uppercase text-[10px] tracking-wide">
                      <tr>
                        <th className="px-3 py-2 text-left">Tipo</th>
                        <th className="px-3 py-2 text-right">Cant.</th>
                        <th className="px-3 py-2 text-right">A la organización</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-50">
                      <DesgloseRow
                        label={`Pagadas (vendedor ${desgloseCuenta.pagadas.comision_porcentaje ?? data.resumen.comision_porcentaje ?? 0}%)`}
                        line={desgloseCuenta.pagadas}
                      />
                      <DesgloseRow
                        label={`Abonadas (vendedor ${desgloseCuenta.abonadas.comision_porcentaje ?? data.resumen.comision_abono_porcentaje ?? 0}%)`}
                        line={desgloseCuenta.abonadas}
                      />
                      <DesgloseRow label="Reservadas" potencial={desgloseCuenta.reservadas} />
                      <DesgloseRow label="Libres en inventario" potencial={desgloseCuenta.libres} />
                    </tbody>
                  </table>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Histórico global. Solo pagadas y abonadas generan saldo por entregar a la organización.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-4 max-w-md">
                <StatBox label="Por cobrar" value={fmtMoney(porCobrar)} tone="rose" large />
                <StatBox
                  label="Entregado"
                  value={fmtMoney(data.resumen.entregado_global ?? data.cuenta_global?.entregado ?? 0)}
                  tone="emerald"
                  large
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-800">Registrar entrega de dinero</h3>
                <p className="text-xs text-slate-500">Solo super admin · reduce el saldo por cobrar</p>
              </div>
              <div className="p-4 flex flex-col lg:flex-row gap-4 lg:items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-600">Monto entregado</label>
                  <input
                    type="number"
                    min={1}
                    value={liqMonto}
                    onChange={(e) => setLiqMonto(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                    placeholder="Ej. 105000"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setLiqMonto(String(Math.round(porCobrar)))}
                      disabled={porCobrar <= 0}
                      className="text-xs px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 disabled:opacity-40"
                    >
                      Saldo completo ({fmtMoney(porCobrar)})
                    </button>
                  </div>
                </div>
                <div className="flex-[2]">
                  <label className="text-xs font-medium text-slate-600">Notas (opcional)</label>
                  <input
                    value={liqNotas}
                    onChange={(e) => setLiqNotas(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                    placeholder="Efectivo, Nequi, fecha de entrega…"
                  />
                </div>
                <button
                  type="button"
                  disabled={guardando || !liqMonto || Number(liqMonto) <= 0}
                  onClick={registrarEntrega}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 shrink-0"
                >
                  {guardando ? 'Guardando…' : 'Registrar entrega'}
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800">Historial de entregas</h3>
              </div>
              {!data.liquidaciones?.length ? (
                <p className="p-8 text-center text-sm text-slate-400">Aún no hay entregas registradas</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Fecha</th>
                        <th className="px-4 py-2 text-right">Monto</th>
                        <th className="px-4 py-2 text-left">Notas</th>
                        <th className="px-4 py-2 text-left">Registró</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.liquidaciones.map((l) => (
                        <tr key={l.id} className="border-t border-slate-100">
                          <td className="px-4 py-2 whitespace-nowrap">{fmtDate(l.created_at)}</td>
                          <td className="px-4 py-2 text-right font-semibold text-emerald-700">
                            {fmtMoney(Number(l.monto))}
                          </td>
                          <td className="px-4 py-2 text-slate-600">{l.notas || '—'}</td>
                          <td className="px-4 py-2 text-slate-500">{l.registrado_por_nombre || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-4">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Inventario del vendedor</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Blanco = libre · Verde = vendida, reservada o no disponible (igual que en Boletas)
                  </p>
                </div>
                {rifasCuadricula.length > 0 && (
                  <div className="w-full sm:max-w-xs">
                    <label className="text-xs font-medium text-slate-500">Proyecto</label>
                    <select
                      value={rifaCuadriculaId}
                      onChange={(e) => setRifaCuadriculaId(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      {rifasCuadricula.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <BoletaCuadricula
                boletas={cuadriculaBoletas}
                rifaNombre={rifasCuadricula.find((r) => r.id === rifaCuadriculaId)?.nombre}
                alcance="inventario_vendedor"
                vendedorNombre={data.vendedor.nombre}
                loading={loadingCuadricula}
              />
            </div>
          </section>
        )}

        {area === 'operacion' && (
          <>
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-medium text-slate-500 mb-2">Filtro de periodo (solo operación comercial)</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-xs text-slate-500">Desde</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    max={fechaFin || todayISO()}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Hasta</label>
                  <input
                    type="date"
                    value={fechaFin}
                    min={fechaInicio || undefined}
                    max={todayISO()}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <button
                    type="button"
                    onClick={load}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                  >
                    {loading ? '…' : 'Aplicar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFechaInicio('')
                      setFechaFin('')
                      setTimeout(load, 0)
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg"
                  >
                    Todo el historial
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const t = todayISO()
                      setFechaInicio(t)
                      setFechaFin(t)
                      setTimeout(load, 0)
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg"
                  >
                    Hoy
                  </button>
                </div>
              </div>
            </section>

            {data?.resumen && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <MiniStat label="Ventas" value={data.resumen.total_ventas} />
                <MiniStat label="Pagadas" value={data.resumen.boletas_pagadas} color="emerald" />
                <MiniStat label="Abonadas" value={data.resumen.boletas_abonadas} color="blue" />
                <MiniStat label="Reservadas" value={data.resumen.boletas_reservadas} color="amber" />
                <MiniStat label="Boletas vendidas" value={data.resumen.boletas_vendidas} />
                <MiniStat label="Inventario libre" value={data.resumen.boletas_libres ?? 0} color="slate" />
              </div>
            )}

            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 flex flex-wrap gap-1 p-2 bg-slate-50/80">
                {(
                  [
                    ['boletas', 'Boletas', data?.boletas?.length ?? 0],
                    ['ventas', 'Ventas', data?.ventas.length ?? 0],
                    ['clientes', 'Clientes', data?.clientes.length ?? 0],
                    ['libres', 'Inventario', data?.boletas_libres?.length ?? 0],
                  ] as const
                ).map(([key, label, count]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTabOp(key)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      tabOp === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'
                    }`}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>

              <div className="px-4 py-3 border-b border-slate-100 bg-white">
                <SearchBar
                  value={busqueda}
                  onChange={setBusqueda}
                  placeholder={
                    tabOp === 'libres'
                      ? 'Buscar número de boleta o proyecto…'
                      : 'Buscar número de boleta o cliente…'
                  }
                />
              </div>

              {loading ? (
                <div className="p-12 flex justify-center">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tabOp === 'boletas' ? (
                <>
                  <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-2">
                    {(
                      [
                        ['TODAS', 'Todas', data?.boletas?.length ?? 0],
                        ['PAGADA', 'Pagadas', data?.resumen?.boletas_pagadas ?? 0],
                        ['ABONADA', 'Abonadas', data?.resumen?.boletas_abonadas ?? 0],
                        ['RESERVADA', 'Reservadas', data?.resumen?.boletas_reservadas ?? 0],
                      ] as const
                    ).map(([key, label, count]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFiltroBoleta(key)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
                          filtroBoleta === key
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {label} ({count})
                      </button>
                    ))}
                  </div>
                  <BoletasTable
                    boletas={boletasFiltradas}
                    emptyMsg={termino ? 'Sin boletas que coincidan con la búsqueda' : 'Sin boletas en este filtro'}
                    showGestionar
                  />
                </>
              ) : tabOp === 'ventas' ? (
                !ventasFiltradas.length ? (
                  <EmptyState msg={termino ? 'Sin ventas que coincidan' : 'Sin ventas en el periodo'} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-2 text-left">Fecha</th>
                          <th className="px-4 py-2 text-left">Cliente</th>
                          <th className="px-4 py-2 text-left">Proyecto</th>
                          <th className="px-4 py-2 text-right">Boletas</th>
                          <th className="px-4 py-2 text-right">Total</th>
                          <th className="px-4 py-2 text-right">Abonado</th>
                          <th className="px-4 py-2 text-right">Saldo cliente</th>
                          <th className="px-4 py-2 text-left">Estado</th>
                          <th className="px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {ventasFiltradas.map((v) => (
                          <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                            <td className="px-4 py-2 whitespace-nowrap text-slate-600">{fmtDate(v.created_at)}</td>
                            <td className="px-4 py-2">
                              <div className="font-medium">{v.cliente_nombre}</div>
                              {v.cliente_telefono && (
                                <div className="text-xs text-slate-400">{v.cliente_telefono}</div>
                              )}
                            </td>
                            <td className="px-4 py-2">{v.rifa_nombre}</td>
                            <td className="px-4 py-2 text-right">{v.total_boletas}</td>
                            <td className="px-4 py-2 text-right font-medium">{fmtMoney(v.monto_total)}</td>
                            <td className="px-4 py-2 text-right text-emerald-600">{fmtMoney(v.abono_total)}</td>
                            <td className="px-4 py-2 text-right text-amber-600">{fmtMoney(v.saldo_pendiente)}</td>
                            <td className="px-4 py-2">
                              <EstadoBadge estado={v.estado_venta} />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <Link href={`/ventas?gestionar=${v.id}`} className="text-xs text-indigo-600 font-medium hover:underline">
                                Gestionar
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : tabOp === 'clientes' ? (
                !clientesFiltrados.length ? (
                  <EmptyState msg={termino ? 'Sin clientes que coincidan' : 'Sin clientes en el periodo'} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-2 text-left">Cliente</th>
                          <th className="px-4 py-2 text-left">Contacto</th>
                          <th className="px-4 py-2 text-right">Ventas</th>
                          <th className="px-4 py-2 text-right">Monto</th>
                          <th className="px-4 py-2 text-right">Abonado</th>
                          <th className="px-4 py-2 text-left">Última venta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientesFiltrados.map((c) => (
                          <tr key={c.id} className="border-t border-slate-100">
                            <td className="px-4 py-2 font-medium">{c.nombre}</td>
                            <td className="px-4 py-2 text-slate-600">{c.telefono || c.email || '—'}</td>
                            <td className="px-4 py-2 text-right">{c.total_ventas}</td>
                            <td className="px-4 py-2 text-right">{fmtMoney(c.monto_total)}</td>
                            <td className="px-4 py-2 text-right text-emerald-600">{fmtMoney(c.abonado_total)}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{fmtDate(c.ultima_venta)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : !libresFiltradas.length ? (
                <EmptyState msg={termino ? 'Sin boletas libres que coincidan' : 'Sin boletas libres en inventario'} />
              ) : (
                <div className="overflow-x-auto max-h-[420px]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left">Número</th>
                        <th className="px-4 py-2 text-left">Proyecto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {libresFiltradas.map((b) => (
                        <tr key={b.id} className="border-t border-slate-100">
                          <td className="px-4 py-2 font-mono">#{fmtNumBoleta(b.numero)}</td>
                          <td className="px-4 py-2">{b.rifa_nombre}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${ESTADO_BADGE[estado] || 'bg-slate-100 text-slate-600'}`}
    >
      {estado}
    </span>
  )
}

function BoletasTable({
  boletas,
  emptyMsg,
  showGestionar,
}: {
  boletas: VendedorDetalleResponse['boletas']
  emptyMsg: string
  showGestionar?: boolean
}) {
  if (!boletas.length) {
    return <EmptyState msg={emptyMsg} />
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2 text-left">Número</th>
            <th className="px-4 py-2 text-left">Estado</th>
            <th className="px-4 py-2 text-left">Cliente</th>
            <th className="px-4 py-2 text-left">Proyecto</th>
            <th className="px-4 py-2 text-left">Fecha venta</th>
            {showGestionar && <th className="px-4 py-2 text-right">Acción</th>}
          </tr>
        </thead>
        <tbody>
          {boletas.map((b) => (
            <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50/50">
              <td className="px-4 py-2 font-mono font-medium">{formatBoletaNumeros(b)}</td>
              <td className="px-4 py-2">
                <EstadoBadge estado={b.estado} />
              </td>
              <td className="px-4 py-2">
                <div>{b.cliente_nombre || '—'}</div>
                {b.cliente_telefono && <div className="text-xs text-slate-400">{b.cliente_telefono}</div>}
              </td>
              <td className="px-4 py-2">{b.rifa_nombre}</td>
              <td className="px-4 py-2 whitespace-nowrap text-slate-600">{fmtDate(b.venta_fecha)}</td>
              {showGestionar && (
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/ventas?gestionar=${b.venta_id}`}
                    className="text-xs font-medium text-indigo-600 hover:underline"
                  >
                    {b.estado === 'ABONADA' ? 'Abonar' : 'Ver venta'}
                  </Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState({ msg }: { msg: string }) {
  return <p className="p-10 text-center text-sm text-slate-400">{msg}</p>
}

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative max-w-md">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
      />
      <svg
        className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
      </svg>
    </div>
  )
}

function DesgloseRow({
  label,
  line,
  potencial,
}: {
  label: string
  line?: CuentaDesgloseBoletas['pagadas']
  potencial?: CuentaDesgloseBoletas['libres']
}) {
  if (potencial) {
    return (
      <tr className="bg-slate-50/50">
        <td className="px-3 py-2 font-medium text-slate-700">{label}</td>
        <td className="px-3 py-2 text-right tabular-nums">{potencial.cantidad}</td>
        <td className="px-3 py-2 text-right text-slate-400">—</td>
      </tr>
    )
  }
  if (!line) return null
  return (
    <tr>
      <td className="px-3 py-2 font-medium text-slate-700">{label}</td>
      <td className="px-3 py-2 text-right tabular-nums">{line.cantidad}</td>
      <td className="px-3 py-2 text-right font-semibold text-amber-900 tabular-nums">
        {fmtMoney(line.debe_organizacion)}
      </td>
    </tr>
  )
}

function StatBox({
  label,
  value,
  tone,
  large,
  hint,
}: {
  label: string
  value: string
  tone: 'rose' | 'emerald' | 'amber' | 'slate' | 'purple'
  large?: boolean
  hint?: string
}) {
  const tones = {
    rose: 'border-rose-200 bg-rose-50/80 text-rose-800',
    emerald: 'border-emerald-200 bg-emerald-50/80 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50/80 text-amber-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-800',
    purple: 'border-purple-200 bg-purple-50/80 text-purple-800',
  }
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="text-[10px] uppercase font-semibold opacity-80">{label}</div>
      <div className={`font-bold mt-1 ${large ? 'text-2xl' : 'text-lg'}`}>{value}</div>
      {hint ? <p className="text-[10px] mt-1 opacity-75 leading-snug">{hint}</p> : null}
    </div>
  )
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color?: 'emerald' | 'blue' | 'amber' | 'slate'
}) {
  const c =
    color === 'emerald'
      ? 'text-emerald-600'
      : color === 'blue'
        ? 'text-blue-600'
        : color === 'amber'
          ? 'text-amber-600'
          : 'text-slate-800'
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5">
      <div className="text-[10px] uppercase text-slate-400 font-medium">{label}</div>
      <div className={`text-xl font-semibold ${c}`}>{value}</div>
    </div>
  )
}
