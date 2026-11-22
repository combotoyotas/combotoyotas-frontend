'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/admin/PageHeader'
import NumeroCarritoTrueque from '@/components/trueques/NumeroCarritoTrueque'
import TruequeResumenMovimientos, {
  buildMovimientos,
  type MovimientoTrueque,
  type TruequeTipoOp,
} from '@/components/trueques/TruequeResumenMovimientos'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { rifaApi } from '@/lib/rifaApi'
import type { Rifa } from '@/types/rifa'
import {
  truequesApi,
  type TruequeContexto,
  type TruequeInventarioResponse,
  type TruequeParty,
  type TruequePartyTipo,
} from '@/lib/truequesApi'
import type { InventarioBoleta } from '@/lib/inventarioApi'
import { ArrowLeftRight, ArrowRight, Building2, Users } from 'lucide-react'

const fmt = (n: number) => String(n).padStart(4, '0')

type PartyState = {
  tipo: TruequePartyTipo
  vendedorId: string
}

function partyToApi(p: PartyState): TruequeParty {
  if (p.tipo === 'OFICINA') return { tipo: 'OFICINA' }
  return { tipo: 'VENDEDOR', vendedor_id: p.vendedorId }
}

function partyLabel(p: PartyState, ctx: TruequeContexto | null) {
  if (p.tipo === 'OFICINA') return 'Oficina (pool)'
  const v = ctx?.vendedores.find((x) => x.id === p.vendedorId)
  return v?.nombre || 'Vendedor'
}

function boletaMatchSearch(b: InventarioBoleta, q: string) {
  const t = q.trim()
  if (!t) return true
  if (b.numeros.some((n) => fmt(n).includes(t))) return true
  const n = Number(t)
  if (Number.isInteger(n) && b.numeros.includes(n)) return true
  return false
}

function PartyPicker({
  label,
  value,
  onChange,
  vendedores,
  poolLibres,
  disabled,
  accent,
}: {
  label: string
  value: PartyState
  onChange: (v: PartyState) => void
  vendedores: TruequeContexto['vendedores']
  poolLibres: number
  disabled?: boolean
  accent: 'violet' | 'teal'
}) {
  const border = accent === 'violet' ? 'border-violet-200 bg-violet-50/40' : 'border-teal-200 bg-teal-50/40'
  return (
    <div className={`rounded-2xl border p-4 ${border}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ tipo: 'OFICINA', vendedorId: '' })}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors min-h-[40px] ${
            value.tipo === 'OFICINA'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Oficina
          <span className="text-xs opacity-80">({poolLibres} libres)</span>
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-2">Vendedores</p>
      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
        {vendedores.map((v) => (
          <button
            key={v.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ tipo: 'VENDEDOR', vendedorId: v.id })}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              value.tipo === 'VENDEDOR' && value.vendedorId === v.id
                ? accent === 'violet'
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[140px]">{v.nombre}</span>
            <span className="opacity-75">({v.asignadas_libres})</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function InventarioMini({
  titulo,
  inventario,
  loading,
  busqueda,
  onBusqueda,
  numerosCarrito,
  onToggleNumero,
  accent,
}: {
  titulo: string
  inventario: TruequeInventarioResponse | null
  loading: boolean
  busqueda: string
  onBusqueda: (v: string) => void
  numerosCarrito: number[]
  onToggleNumero: (n: number) => void
  accent: 'violet' | 'teal'
}) {
  const filtradas = useMemo(() => {
    const list = inventario?.boletas || []
    return list.filter((b) => boletaMatchSearch(b, busqueda)).slice(0, 120)
  }, [inventario, busqueda])

  const chipSel =
    accent === 'violet'
      ? 'bg-violet-600 text-white ring-2 ring-violet-300'
      : 'bg-teal-600 text-white ring-2 ring-teal-300'

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 flex flex-col min-h-[200px]">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="text-xs font-semibold text-slate-800">{titulo}</h4>
        <span className="text-[10px] text-slate-500">
          {loading ? '…' : `${inventario?.total ?? 0} disponibles`}
          {inventario?.truncado ? ' (muestra limitada)' : ''}
        </span>
      </div>
      <input
        type="search"
        placeholder="Buscar número…"
        value={busqueda}
        onChange={(e) => onBusqueda(e.target.value.replace(/\D/g, '').slice(0, 4))}
        className="w-full px-3 py-2 mb-2 rounded-lg border border-slate-200 text-sm font-mono bg-white"
      />
      <div className="flex-1 overflow-y-auto max-h-[220px]">
        {loading ? (
          <p className="text-xs text-slate-400 p-2">Cargando inventario…</p>
        ) : filtradas.length === 0 ? (
          <p className="text-xs text-slate-400 p-2">Sin coincidencias</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {filtradas.map((b) => {
              const principal = b.numero_principal ?? b.numero
              const label =
                b.numeros.length > 1
                  ? b.numeros.map(fmt).join(' / ')
                  : fmt(principal)
              const enCarrito = b.numeros.some((n) => numerosCarrito.includes(n)) || numerosCarrito.includes(principal)
              return (
                <button
                  key={b.boleta_id}
                  type="button"
                  onClick={() => onToggleNumero(principal)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-200 bg-white hover:bg-slate-100 ${
                    enCarrito ? chipSel : ''
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-400 mt-2">Clic en un número para agregarlo al carrito</p>
    </div>
  )
}

export default function TruequesPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ rol: string } | null>(null)
  const [rifas, setRifas] = useState<Rifa[]>([])
  const [rifaId, setRifaId] = useState('')
  const [ctx, setCtx] = useState<TruequeContexto | null>(null)
  const [partyA, setPartyA] = useState<PartyState>({ tipo: 'OFICINA', vendedorId: '' })
  const [partyB, setPartyB] = useState<PartyState>({ tipo: 'VENDEDOR', vendedorId: '' })
  const [carritoA, setCarritoA] = useState<number[]>([])
  const [carritoB, setCarritoB] = useState<number[]>([])
  const [invA, setInvA] = useState<TruequeInventarioResponse | null>(null)
  const [invB, setInvB] = useState<TruequeInventarioResponse | null>(null)
  const [busqA, setBusqA] = useState('')
  const [busqB, setBusqB] = useState('')
  const [loadingInvA, setLoadingInvA] = useState(false)
  const [loadingInvB, setLoadingInvB] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [exitoOpen, setExitoOpen] = useState(false)
  const [ultimoExito, setUltimoExito] = useState<{
    tipo: TruequeTipoOp
    movimientos: MovimientoTrueque[]
    modo: string
  } | null>(null)
  const [notas, setNotas] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const raw = localStorage.getItem('user')
    if (!token || !raw) {
      router.push('/login')
      return
    }
    const u = JSON.parse(raw)
    if (String(u.rol || '').toUpperCase() !== 'SUPER_ADMIN') {
      router.push('/dashboard')
      return
    }
    setUser(u)
  }, [router])

  useEffect(() => {
    if (!user) return
    rifaApi
      .getRifasOperativas()
      .then((r) => {
        const lista = r.data || []
        setRifas(lista)
        if (lista.length && !rifaId) setRifaId(lista[0].id)
      })
      .catch(() => setError('No se pudieron cargar proyectos'))
  }, [user, rifaId])

  const loadContexto = useCallback(async () => {
    if (!rifaId) return
    const c = await truequesApi.getContexto(rifaId)
    setCtx(c)
    if (c.vendedores.length && partyB.tipo === 'VENDEDOR' && !partyB.vendedorId) {
      setPartyB({ tipo: 'VENDEDOR', vendedorId: c.vendedores[0].id })
    }
  }, [rifaId, partyB.tipo, partyB.vendedorId])

  const loadInventario = useCallback(
    async (side: 'A' | 'B', party: PartyState) => {
      if (!rifaId) return
      if (party.tipo === 'VENDEDOR' && !party.vendedorId) {
        if (side === 'A') setInvA(null)
        else setInvB(null)
        return
      }
      if (side === 'A') setLoadingInvA(true)
      else setLoadingInvB(true)
      try {
        const data = await truequesApi.getInventario(rifaId, partyToApi(party))
        if (side === 'A') setInvA(data)
        else setInvB(data)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error cargando inventario')
      } finally {
        if (side === 'A') setLoadingInvA(false)
        else setLoadingInvB(false)
      }
    },
    [rifaId]
  )

  useEffect(() => {
    if (!rifaId) return
    loadContexto().catch((e) => setError(e.message))
  }, [rifaId, loadContexto])

  useEffect(() => {
    void loadInventario('A', partyA)
  }, [partyA, loadInventario])

  useEffect(() => {
    void loadInventario('B', partyB)
  }, [partyB, loadInventario])

  const partiesValid = useMemo(() => {
    if (partyA.tipo === 'OFICINA' && partyB.tipo === 'OFICINA') return false
    if (
      partyA.tipo === 'VENDEDOR' &&
      partyB.tipo === 'VENDEDOR' &&
      partyA.vendedorId &&
      partyA.vendedorId === partyB.vendedorId
    ) {
      return false
    }
    if (partyA.tipo === 'VENDEDOR' && !partyA.vendedorId) return false
    if (partyB.tipo === 'VENDEDOR' && !partyB.vendedorId) return false
    return true
  }, [partyA, partyB])

  const agregarValidado = async (side: 'A' | 'B', n: number) => {
    const party = side === 'A' ? partyA : partyB
    if (party.tipo === 'VENDEDOR' && !party.vendedorId) {
      return { ok: false, mensaje: 'Elige un vendedor' }
    }
    try {
      const v = await truequesApi.validar(rifaId, partyToApi(party), [n])
      const item = v.items[0]
      return { ok: item?.ok ?? false, mensaje: item?.mensaje }
    } catch (e: unknown) {
      return { ok: false, mensaje: e instanceof Error ? e.message : 'Error' }
    }
  }

  const toggleFromGrid = async (side: 'A' | 'B', n: number) => {
    const carrito = side === 'A' ? carritoA : carritoB
    const setCarrito = side === 'A' ? setCarritoA : setCarritoB
    if (carrito.includes(n)) {
      setCarrito(carrito.filter((x) => x !== n))
      return
    }
    const r = await agregarValidado(side, n)
    if (r.ok) setCarrito([...carrito, n])
    else setError(r.mensaje || 'No se pudo agregar')
  }

  const tipoOperacion = useMemo(() => {
    const hasA = carritoA.length > 0
    const hasB = carritoB.length > 0
    if (hasA && hasB) return 'TRUEQUE' as const
    if (hasA) return 'ENVIO_A_B' as const
    if (hasB) return 'ENVIO_B_A' as const
    return 'NONE' as const
  }, [carritoA.length, carritoB.length])

  const ejecutar = async () => {
    setConfirmOpen(false)
    setProcesando(true)
    setError('')
    setAviso('')
    const snapshotTipo: TruequeTipoOp =
      tipoOperacion === 'NONE' ? 'ENVIO_A_B' : tipoOperacion
    const snapshotMov = buildMovimientos(snapshotTipo, carritoA, carritoB, labelA, labelB)
    try {
      const result = await truequesApi.ejecutar(rifaId, {
        party_a: partyToApi(partyA),
        party_b: partyToApi(partyB),
        numeros_a: carritoA,
        numeros_b: carritoB,
        notas: notas || undefined,
      })
      setUltimoExito({
        tipo: snapshotTipo,
        movimientos: snapshotMov,
        modo: result.modo,
      })
      setExitoOpen(true)
      setCarritoA([])
      setCarritoB([])
      await loadContexto()
      await loadInventario('A', partyA)
      await loadInventario('B', partyB)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error en la operación')
    } finally {
      setProcesando(false)
    }
  }

  const puedeEjecutar =
    partiesValid && rifaId && (carritoA.length > 0 || carritoB.length > 0) && !procesando

  const labelA = partyLabel(partyA, ctx)
  const labelB = partyLabel(partyB, ctx)

  const movimientosPreview = useMemo(() => {
    if (tipoOperacion === 'NONE') return []
    return buildMovimientos(tipoOperacion, carritoA, carritoB, labelA, labelB)
  }, [tipoOperacion, carritoA, carritoB, labelA, labelB])

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white pb-24">
      <PageHeader
        title="Trueques"
        description="Dos columnas (oficina o vendedor). Carrito en cada una; en el centro «Hacer trueque»: intercambio si hay boletas en ambas, envío si solo hay en una."
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 space-y-6">
        <div className="max-w-md">
          <label className="text-[10px] font-bold uppercase text-slate-400">Proyecto</label>
          <select
            value={rifaId}
            onChange={(e) => {
              setRifaId(e.target.value)
              setCarritoA([])
              setCarritoB([])
            }}
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
          >
            {rifas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          Elige <strong>quién</strong> en cada columna (siempre distintos). Solo boletas <strong>disponibles</strong>.
          Con carritos en las dos columnas se intercambian; con carrito solo en una, es un <strong>envío</strong> a la otra.
        </p>

        {!partiesValid && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            Elige origen y destino distintos (no Oficina↔Oficina ni el mismo vendedor).
          </p>
        )}

        {aviso && (
          <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
            {aviso}
          </p>
        )}
        {error && (
          <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4 lg:gap-6 items-start">
          <section className="space-y-4 min-w-0">
            <PartyPicker
              label="Columna izquierda"
              value={partyA}
              onChange={(p) => {
                setPartyA(p)
                setCarritoA([])
              }}
              vendedores={ctx?.vendedores || []}
              poolLibres={ctx?.pool?.disponibles_libres ?? 0}
              disabled={procesando}
              accent="violet"
            />
            <NumeroCarritoTrueque
              titulo="Carrito"
              subtitulo={partyLabel(partyA, ctx)}
              color="violet"
              numeros={carritoA}
              onChange={setCarritoA}
              onAgregarNumero={(n) => agregarValidado('A', n)}
              disabled={procesando || !partiesValid}
            />
            <InventarioMini
              titulo={`Inventario — ${partyLabel(partyA, ctx)}`}
              inventario={invA}
              loading={loadingInvA}
              busqueda={busqA}
              onBusqueda={setBusqA}
              numerosCarrito={carritoA}
              onToggleNumero={(n) => void toggleFromGrid('A', n)}
              accent="violet"
            />
          </section>

          <div className="flex flex-col items-center justify-center gap-4 py-4 lg:py-16 lg:px-2 sticky top-24 self-center">
            <div className="hidden lg:flex flex-col items-center text-slate-300">
              <ArrowRight className="w-8 h-8 rotate-180 text-violet-400" />
              <ArrowLeftRight className="w-10 h-10 text-slate-400 my-1" />
              <ArrowRight className="w-8 h-8 text-teal-500" />
            </div>
            <div className="text-center max-w-[200px]">
              <p className="text-xs text-slate-500 leading-snug mb-3">
                {tipoOperacion === 'TRUEQUE' &&
                  `Intercambio: ${carritoA.length} ↔ ${carritoB.length}`}
                {tipoOperacion === 'ENVIO_A_B' &&
                  `Envío: ${carritoA.length} → ${partyLabel(partyB, ctx)}`}
                {tipoOperacion === 'ENVIO_B_A' &&
                  `Envío: ${carritoB.length} → ${partyLabel(partyA, ctx)}`}
                {tipoOperacion === 'NONE' && 'Agrega boletas en una o ambas columnas'}
              </p>
              <button
                type="button"
                disabled={!puedeEjecutar}
                onClick={() => setConfirmOpen(true)}
                className="w-full min-w-[160px] px-5 py-4 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {procesando ? 'Procesando…' : 'Hacer trueque'}
              </button>
              <input
                type="text"
                placeholder="Notas (opcional)"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full mt-3 px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              />
            </div>
          </div>

          <section className="space-y-4 min-w-0">
            <PartyPicker
              label="Columna derecha"
              value={partyB}
              onChange={(p) => {
                setPartyB(p)
                setCarritoB([])
              }}
              vendedores={ctx?.vendedores || []}
              poolLibres={ctx?.pool?.disponibles_libres ?? 0}
              disabled={procesando}
              accent="teal"
            />
            <NumeroCarritoTrueque
              titulo="Carrito"
              subtitulo={partyLabel(partyB, ctx)}
              color="teal"
              numeros={carritoB}
              onChange={setCarritoB}
              onAgregarNumero={(n) => agregarValidado('B', n)}
              disabled={procesando || !partiesValid}
            />
            <InventarioMini
              titulo={`Inventario — ${partyLabel(partyB, ctx)}`}
              inventario={invB}
              loading={loadingInvB}
              busqueda={busqB}
              onBusqueda={setBusqB}
              numerosCarrito={carritoB}
              onToggleNumero={(n) => void toggleFromGrid('B', n)}
              accent="teal"
            />
          </section>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        wide
        title={tipoOperacion === 'TRUEQUE' ? 'Confirmar trueque' : 'Confirmar envío'}
        message="Revisa el detalle antes de ejecutar:"
        type="warning"
        confirmText="Sí, ejecutar"
        onConfirm={() => void ejecutar()}
        onCancel={() => setConfirmOpen(false)}
      >
        {tipoOperacion !== 'NONE' && (
          <TruequeResumenMovimientos
            tipo={tipoOperacion}
            movimientos={movimientosPreview}
            variante="preview"
          />
        )}
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={exitoOpen}
        wide
        confirmOnly
        title={ultimoExito?.modo === 'TRUEQUE' ? 'Trueque completado' : 'Operación completada'}
        message="Se aplicaron estos movimientos en inventario:"
        type="success"
        confirmText="Entendido"
        onConfirm={() => {
          setExitoOpen(false)
          setUltimoExito(null)
        }}
        onCancel={() => {
          setExitoOpen(false)
          setUltimoExito(null)
        }}
      >
        {ultimoExito && (
          <TruequeResumenMovimientos
            tipo={ultimoExito.tipo}
            movimientos={ultimoExito.movimientos}
            variante="hecho"
          />
        )}
      </ConfirmDialog>
    </div>
  )
}
