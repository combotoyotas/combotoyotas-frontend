'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PageHeader from '@/components/admin/PageHeader'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import {
  intercambiosApi,
  type ConsultaNumeroIntercambio,
  type IntercambioContexto,
  type IntercambioDireccion,
  type IntercambioListado,
  type IntercambioSolicitud,
} from '@/lib/intercambiosApi'

const POLL_MS = 12_000
const LEIDAS_KEY = 'intercambios_leidas_v1'

function claveLeida(s: IntercambioSolicitud) {
  return `${s.id}:${s.estado}`
}

function cargarLeidas(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(LEIDAS_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function guardarLeidas(set: Set<string>) {
  localStorage.setItem(LEIDAS_KEY, JSON.stringify([...set]))
}

function pad4(n: number) {
  return String(n).padStart(4, '0')
}

const ESTADO_STYLE: Record<string, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-900',
  ACEPTADA: 'bg-emerald-100 text-emerald-900',
  RECHAZADA: 'bg-red-100 text-red-900',
  CANCELADA: 'bg-slate-200 text-slate-700',
}

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
}

function fmtFecha(iso?: string | null) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function soloDigitos4(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 4)
}

function firmaListado(d: IntercambioListado | null) {
  if (!d) return ''
  return [...d.por_aprobar, ...d.historial]
    .map((s) => `${s.id}:${s.estado}:${s.responded_at ?? ''}:${s.updated_at ?? ''}`)
    .join('|')
}

function normalizarListado(data: IntercambioListado): IntercambioListado {
  return {
    por_aprobar: data.por_aprobar ?? [],
    historial:
      data.historial ??
      (data.mis_solicitudes ?? []).map((s) => ({ ...s, direccion: 'ENVIADA' as const })),
  }
}

function TarjetaSolicitud({
  s,
  variant,
  onCancelar,
  onAceptar,
  onRechazar,
  busy,
}: {
  s: IntercambioSolicitud
  variant: 'aprobar' | 'historial'
  onCancelar?: (id: string) => void
  onAceptar?: (id: string) => void
  onRechazar?: (id: string) => void
  busy: string | null
}) {
  const dir: IntercambioDireccion =
    s.direccion ?? (variant === 'aprobar' ? 'RECIBIDA' : 'ENVIADA')
  const contraparte =
    s.contraparte_tipo === 'OFICINA' ? 'Oficina' : s.contraparte_vendedor_nombre || 'Vendedor'
  const solicitante = s.solicitante_nombre || 'Un vendedor'

  const textoPrincipal = (() => {
    if (variant === 'aprobar') {
      return (
        <p className="text-base text-slate-900 leading-snug">
          <strong>{solicitante}</strong>
          {s.contraparte_tipo === 'OFICINA' ? (
            <>
              {' '}
              solicita el número <strong className="font-mono">#{pad4(s.numero_solicitado)}</strong>{' '}
              de <strong>oficina</strong>
            </>
          ) : (
            <>
              {' '}
              solicita tu número <strong className="font-mono">#{pad4(s.numero_solicitado)}</strong>
            </>
          )}
          {' y te ofrece a cambio '}
          <strong className="font-mono">#{pad4(s.numero_ofrecido)}</strong>.
        </p>
      )
    }

    if (dir === 'ENVIADA') {
      return (
        <p className="text-base text-slate-900 leading-snug">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Enviaste · </span>
          Pediste <strong className="font-mono">#{pad4(s.numero_solicitado)}</strong> a{' '}
          <strong>{contraparte}</strong> y ofreciste{' '}
          <strong className="font-mono">#{pad4(s.numero_ofrecido)}</strong>.
          {s.estado === 'RECHAZADA' && (
            <span className="block mt-1 text-red-900">
              {contraparte} rechazó la solicitud
              {s.responded_by_nombre ? ` (${s.responded_by_nombre})` : ''}.
            </span>
          )}
          {s.estado === 'CANCELADA' && (
            <span className="block mt-1 text-slate-600">Cancelaste esta solicitud.</span>
          )}
        </p>
      )
    }

    return (
      <p className="text-base text-slate-900 leading-snug">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Te pidieron · </span>
        <strong>{solicitante}</strong> pidió tu número{' '}
        <strong className="font-mono">#{pad4(s.numero_solicitado)}</strong> y ofreció{' '}
        <strong className="font-mono">#{pad4(s.numero_ofrecido)}</strong>.
        {s.estado === 'RECHAZADA' && (
          <span className="block mt-1 text-slate-700">Rechazaste esta solicitud.</span>
        )}
      </p>
    )
  })()

  const fechaPrincipal = s.responded_at ?? s.created_at

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_STYLE[s.estado] || ''}`}
          >
            {ESTADO_LABEL[s.estado] || s.estado}
          </span>
          {variant === 'historial' && (
            <span className="text-xs text-slate-500">
              {dir === 'ENVIADA' ? 'Enviada' : 'Recibida'}
            </span>
          )}
        </div>
        <time className="text-xs text-slate-500 whitespace-nowrap" dateTime={fechaPrincipal}>
          {fmtFecha(fechaPrincipal)}
        </time>
      </div>
      {s.rifa_nombre && (
        <p className="text-xs text-slate-500 -mt-1">{s.rifa_nombre}</p>
      )}
      {textoPrincipal}
      {s.estado === 'ACEPTADA' && s.resultado?.resumen && dir === 'ENVIADA' && (
        <p className="text-sm text-emerald-900 bg-emerald-50 rounded-xl px-3 py-2.5">
          Te quedó <strong className="font-mono">#{s.resultado.resumen.numero_solicitado_fmt}</strong>{' '}
          en tu inventario. {contraparte} quedó con{' '}
          <strong className="font-mono">#{s.resultado.resumen.numero_ofrecido_fmt}</strong>.
        </p>
      )}
      {s.estado === 'ACEPTADA' && s.resultado?.resumen && dir === 'RECIBIDA' && (
        <p className="text-sm text-emerald-900 bg-emerald-50 rounded-xl px-3 py-2.5">
          Intercambio hecho: tú quedaste con{' '}
          <strong className="font-mono">#{s.resultado.resumen.numero_ofrecido_fmt}</strong>;{' '}
          {solicitante} quedó con{' '}
          <strong className="font-mono">#{s.resultado.resumen.numero_solicitado_fmt}</strong>.
        </p>
      )}
      {s.estado === 'PENDIENTE' && dir === 'ENVIADA' && onCancelar && (
        <button
          type="button"
          disabled={busy === s.id}
          onClick={() => onCancelar(s.id)}
          className="w-full min-h-11 text-sm font-medium text-slate-700 border border-slate-300 rounded-xl active:bg-slate-50 disabled:opacity-50"
        >
          Cancelar solicitud
        </button>
      )}
      {s.estado === 'PENDIENTE' && variant === 'aprobar' && onAceptar && onRechazar && (
        <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
          <button
            type="button"
            disabled={busy === s.id}
            onClick={() => onAceptar(s.id)}
            className="flex-1 min-h-12 px-4 rounded-xl bg-emerald-700 text-white text-base font-semibold active:bg-emerald-800 disabled:opacity-50"
          >
            Aceptar intercambio
          </button>
          <button
            type="button"
            disabled={busy === s.id}
            onClick={() => onRechazar(s.id)}
            className="flex-1 min-h-12 px-4 rounded-xl border-2 border-slate-300 text-base font-medium active:bg-slate-50 disabled:opacity-50"
          >
            Rechazar
          </button>
        </div>
      )}
    </article>
  )
}

export default function IntercambiosPage() {
  const [ctx, setCtx] = useState<IntercambioContexto | null>(null)
  const [numPedido, setNumPedido] = useState('')
  const [numOfrezco, setNumOfrezco] = useState('')
  const [filtroOfrezco, setFiltroOfrezco] = useState('')
  const [preview, setPreview] = useState<ConsultaNumeroIntercambio | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [listado, setListado] = useState<IntercambioListado | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [rol, setRol] = useState('')
  const [pestaña, setPestaña] = useState<'bandeja' | 'historial'>('bandeja')
  const [leidas, setLeidas] = useState<Set<string>>(() => cargarLeidas())
  const [confirmarEnvio, setConfirmarEnvio] = useState(false)
  const busyRef = useRef(busy)
  busyRef.current = busy

  const esVendedor = rol === 'VENDEDOR'
  const rifaId = ctx?.rifa.id ?? ''

  const numerosFiltrados = useMemo(() => {
    const list = ctx?.numeros_disponibles ?? []
    const q = filtroOfrezco.replace(/\D/g, '')
    if (!q) return list
    return list.filter((n) => pad4(n).includes(q) || String(n).includes(q))
  }, [ctx?.numeros_disponibles, filtroOfrezco])

  const aplicarListado = useCallback((data: IntercambioListado) => {
    const norm = normalizarListado(data)
    setListado((prev) => (firmaListado(prev) === firmaListado(norm) ? prev : norm))
  }, [])

  const cargarListado = useCallback(async () => {
    const data = await intercambiosApi.listar()
    aplicarListado(data)
  }, [aplicarListado])

  const recargarContexto = useCallback(async () => {
    const data = await intercambiosApi.getContexto()
    setCtx(data)
    return data
  }, [])

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      setRol(String(u.rol || '').toUpperCase())
    } catch {
      setRol('')
    }
    Promise.all([recargarContexto(), cargarListado()]).catch((e) =>
      setError(e instanceof Error ? e.message : 'Error al cargar')
    )
  }, [cargarListado, recargarContexto])

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible' || busyRef.current) return
      cargarListado().catch(() => {})
    }
    const id = window.setInterval(tick, POLL_MS)
    return () => window.clearInterval(id)
  }, [cargarListado])

  useEffect(() => {
    if (!rifaId || numPedido.length !== 4) {
      setPreview(null)
      setPreviewLoading(false)
      return
    }
    const n = Number(numPedido)
    if (!Number.isInteger(n)) return

    let cancelled = false
    setPreviewLoading(true)
    setError(null)

    const t = window.setTimeout(() => {
      intercambiosApi
        .consultarNumero(rifaId, n)
        .then((data) => {
          if (!cancelled) setPreview(data)
        })
        .catch((e: unknown) => {
          if (!cancelled) {
            setPreview(null)
            setError(e instanceof Error ? e.message : 'No se pudo consultar')
          }
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false)
        })
    }, 280)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [numPedido, rifaId])

  const puedeEnviar =
    esVendedor &&
    numPedido.length === 4 &&
    numOfrezco.length === 4 &&
    preview?.intercambio_posible &&
    ctx?.numeros_disponibles.includes(Number(numOfrezco))

  const enviarSolicitud = async () => {
    setError(null)
    setOkMsg(null)
    if (!rifaId || numPedido.length !== 4 || numOfrezco.length !== 4) {
      setError('Indica dos números de 4 dígitos')
      return
    }
    if (!preview?.intercambio_posible) {
      setError('El número pedido no está disponible para intercambio')
      return
    }
    setBusy('crear')
    try {
      await intercambiosApi.crear({
        rifa_id: rifaId,
        numero_solicitado: Number(numPedido),
        numero_ofrecido: Number(numOfrezco),
      })
      setOkMsg('Solicitud enviada. La otra parte debe aceptarla.')
      setNumPedido('')
      setNumOfrezco('')
      setFiltroOfrezco('')
      setPreview(null)
      await Promise.all([cargarListado(), recargarContexto()])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo crear')
    } finally {
      setBusy(null)
    }
  }

  const wrapAccion =
    (fn: (id: string) => Promise<unknown>, okText?: string) => async (id: string) => {
      setError(null)
      setOkMsg(null)
      setBusy(id)
      try {
        const res = await fn(id)
        if (okText) {
          setOkMsg(okText)
        } else if (res && typeof res === 'object' && 'resultado' in res) {
          const r = res as {
            resultado?: { resumen?: { numero_solicitado_fmt: string; numero_ofrecido_fmt: string } }
          }
          setOkMsg(
            `Intercambio realizado: #${r.resultado?.resumen?.numero_solicitado_fmt} ↔ #${r.resultado?.resumen?.numero_ofrecido_fmt}`
          )
        } else {
          setOkMsg('Actualizado.')
        }
        await Promise.all([cargarListado(), esVendedor ? recargarContexto() : Promise.resolve()])
        setLeidas((prev) => {
          const next = new Set(prev)
          next.add(`${id}:PENDIENTE`)
          next.add(`${id}:ACEPTADA`)
          next.add(`${id}:RECHAZADA`)
          next.add(`${id}:CANCELADA`)
          guardarLeidas(next)
          return next
        })
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error')
      } finally {
        setBusy(null)
      }
    }

  const historialOrdenado = useMemo(() => {
    const items = [...(listado?.historial ?? [])]
    items.sort((a, b) => {
      const ta = new Date(a.responded_at ?? a.created_at).getTime()
      const tb = new Date(b.responded_at ?? b.created_at).getTime()
      return tb - ta
    })
    return items
  }, [listado?.historial])

  const pendientesEnviadas = useMemo(
    () => historialOrdenado.filter((s) => s.direccion === 'ENVIADA' && s.estado === 'PENDIENTE'),
    [historialOrdenado]
  )

  const novedadesNoLeidas = useMemo(
    () =>
      historialOrdenado.filter(
        (s) => s.estado !== 'PENDIENTE' && !leidas.has(claveLeida(s))
      ),
    [historialOrdenado, leidas]
  )

  const marcarLeida = useCallback((s: IntercambioSolicitud) => {
    setLeidas((prev) => {
      const next = new Set(prev)
      next.add(claveLeida(s))
      guardarLeidas(next)
      return next
    })
  }, [])

  const marcarTodasLeidas = useCallback((items: IntercambioSolicitud[]) => {
    setLeidas((prev) => {
      const next = new Set(prev)
      for (const s of items) next.add(claveLeida(s))
      guardarLeidas(next)
      return next
    })
  }, [])

  const abrirHistorial = () => {
    setPestaña('historial')
    marcarTodasLeidas(historialOrdenado.filter((s) => s.estado !== 'PENDIENTE'))
  }

  const badgeBandeja =
    (listado?.por_aprobar.length ?? 0) + pendientesEnviadas.length + novedadesNoLeidas.length

  const confirmarYEnviar = async () => {
    setConfirmarEnvio(false)
    await enviarSolicitud()
  }

  return (
    <div className="max-w-lg mx-auto px-3 py-4 pb-28 space-y-5">
      <PageHeader
        title="Intercambios"
        description="Intercambia un número libre del inventario de otro vendedor u oficina por uno tuyo."
      />

      {ctx?.rifa && (
        <p className="text-sm text-slate-600 -mt-2">
          Proyecto activo: <strong className="text-slate-900">{ctx.rifa.nombre}</strong>
        </p>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      )}
      {okMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {okMsg}
        </div>
      )}

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setPestaña('bandeja')}
          className={`flex-1 min-h-11 rounded-lg text-sm font-semibold transition-colors relative ${
            pestaña === 'bandeja' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          Bandeja
          {badgeBandeja > 0 && (
            <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs text-white">
              {badgeBandeja > 9 ? '9+' : badgeBandeja}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={abrirHistorial}
          className={`flex-1 min-h-11 rounded-lg text-sm font-semibold transition-colors ${
            pestaña === 'historial' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          Historial
          {historialOrdenado.length > 0 && (
            <span className="ml-1 text-xs font-normal text-slate-500">({historialOrdenado.length})</span>
          )}
        </button>
      </div>

      {pestaña === 'bandeja' && (
        <section className="space-y-4">
          {badgeBandeja === 0 && (
            <p className="text-sm text-slate-500 text-center py-6 rounded-xl border border-dashed border-slate-200">
              Sin pendientes ni novedades. Revisa el historial o crea una solicitud abajo.
            </p>
          )}

          {listado && listado.por_aprobar.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden />
                Por aprobar ({listado.por_aprobar.length})
              </h2>
              {listado.por_aprobar.map((s) => (
                <TarjetaSolicitud
                  key={s.id}
                  s={s}
                  variant="aprobar"
                  busy={busy}
                  onAceptar={wrapAccion(intercambiosApi.aceptar)}
                  onRechazar={wrapAccion(intercambiosApi.rechazar, 'Solicitud rechazada.')}
                />
              ))}
            </div>
          )}

          {pendientesEnviadas.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-slate-900">En espera de respuesta</h2>
              {pendientesEnviadas.map((s) => (
                <TarjetaSolicitud
                  key={s.id}
                  s={s}
                  variant="historial"
                  busy={busy}
                  onCancelar={esVendedor ? wrapAccion(intercambiosApi.cancelar) : undefined}
                />
              ))}
            </div>
          )}

          {novedadesNoLeidas.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-slate-900">Novedades</h2>
              {novedadesNoLeidas.map((s) => (
                <div key={s.id} className="space-y-2">
                  <TarjetaSolicitud s={s} variant="historial" busy={busy} />
                  <button
                    type="button"
                    onClick={() => marcarLeida(s)}
                    className="w-full min-h-10 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl active:bg-slate-50"
                  >
                    Marcar como leída
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {pestaña === 'historial' && (
        <section className="space-y-3 max-h-[min(55vh,420px)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 p-3 -mx-0.5">
          {!historialOrdenado.length ? (
            <p className="text-sm text-slate-500 text-center py-8">Sin registros en el historial.</p>
          ) : (
            historialOrdenado.map((s) => (
              <TarjetaSolicitud
                key={s.id}
                s={s}
                variant="historial"
                busy={busy}
                onCancelar={
                  esVendedor && s.direccion === 'ENVIADA' && s.estado === 'PENDIENTE'
                    ? wrapAccion(intercambiosApi.cancelar)
                    : undefined
                }
              />
            ))
          )}
        </section>
      )}

      {esVendedor && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">Nueva solicitud</h2>

          <div className="space-y-2">
            <label htmlFor="num-pedido" className="text-sm font-medium text-slate-800">
              Número que quieres (4 dígitos)
            </label>
            <input
              id="num-pedido"
              className="w-full min-h-14 px-4 text-center text-2xl font-mono tracking-widest border-2 border-slate-300 rounded-xl focus:border-slate-900 focus:outline-none"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="off"
              placeholder="0000"
              value={numPedido}
              onChange={(e) => setNumPedido(soloDigitos4(e.target.value))}
            />
            {numPedido.length > 0 && numPedido.length < 4 && (
              <p className="text-xs text-slate-500">Escribe los 4 dígitos para ver dueño y disponibilidad</p>
            )}
            {previewLoading && (
              <p className="text-sm text-slate-500 animate-pulse">Consultando inventario…</p>
            )}
            {preview && !previewLoading && (
              <div
                className={`rounded-xl px-4 py-3 text-sm ${
                  preview.intercambio_posible
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-950'
                    : 'bg-amber-50 border border-amber-200 text-amber-950'
                }`}
              >
                <p>
                  <span className="font-mono font-bold">#{preview.numero_fmt}</span> está en{' '}
                  <strong>{preview.contraparte_nombre || '—'}</strong>
                </p>
                <p className="mt-1">
                  {preview.intercambio_posible ? (
                    <strong>Disponible — puedes solicitar el intercambio</strong>
                  ) : (
                    <span>{preview.mensaje || 'No se puede intercambiar este número'}</span>
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="num-ofrezco" className="text-sm font-medium text-slate-800">
              Número que ofreces (tu inventario libre)
            </label>
            <input
              id="num-ofrezco"
              className="w-full min-h-14 px-4 text-center text-2xl font-mono tracking-widest border-2 border-slate-300 rounded-xl focus:border-slate-900 focus:outline-none"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="off"
              placeholder="0000"
              value={numOfrezco}
              onChange={(e) => {
                const v = soloDigitos4(e.target.value)
                setNumOfrezco(v)
                setFiltroOfrezco(v)
              }}
            />
            <p className="text-xs text-slate-500">
              {ctx?.total_disponibles ?? 0} números libres en tu inventario — elige en la lista o escribe arriba
            </p>
            <input
              type="search"
              className="w-full min-h-11 px-3 text-base border border-slate-200 rounded-xl"
              placeholder="Filtrar lista…"
              value={filtroOfrezco}
              onChange={(e) => setFiltroOfrezco(soloDigitos4(e.target.value))}
            />
            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 -mx-0.5">
              {numerosFiltrados.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">Sin coincidencias</p>
              ) : (
                numerosFiltrados.slice(0, 200).map((n) => {
                  const sel = numOfrezco === pad4(n) || numOfrezco === String(n)
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setNumOfrezco(pad4(n))
                        setFiltroOfrezco(pad4(n))
                      }}
                      className={`w-full min-h-11 px-4 text-left font-mono text-base active:bg-slate-100 ${
                        sel ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
                      }`}
                    >
                      #{pad4(n)}
                    </button>
                  )
                })
              )}
            </div>
            {numerosFiltrados.length > 200 && (
              <p className="text-xs text-slate-500">Mostrando 200. Afina el filtro para ver más.</p>
            )}
          </div>

          <button
            type="button"
            disabled={!puedeEnviar || busy === 'crear'}
            onClick={() => setConfirmarEnvio(true)}
            className="w-full min-h-14 rounded-xl bg-slate-900 text-white text-base font-semibold disabled:opacity-40 active:bg-slate-800"
          >
            Enviar solicitud
          </button>
        </section>
      )}

      <ConfirmDialog
        isOpen={confirmarEnvio}
        title="Confirmar intercambio"
        type="info"
        wide
        confirmText="Confirmar envío"
        cancelText="Volver"
        onCancel={() => setConfirmarEnvio(false)}
        onConfirm={confirmarYEnviar}
      >
        <div className="space-y-3 text-sm text-slate-800">
          <p className="text-slate-600">
            Revisa el resumen antes de enviar. La otra parte deberá aceptar el intercambio.
          </p>
          <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50">
            <li className="px-4 py-3 flex justify-between gap-2">
              <span>Pides</span>
              <strong className="font-mono text-base">#{pad4(Number(numPedido) || 0)}</strong>
            </li>
            <li className="px-4 py-3 flex justify-between gap-2">
              <span>De</span>
              <strong>{preview?.contraparte_nombre || '—'}</strong>
            </li>
            <li className="px-4 py-3 flex justify-between gap-2">
              <span>Ofreces</span>
              <strong className="font-mono text-base">#{pad4(Number(numOfrezco) || 0)}</strong>
            </li>
            {ctx?.rifa?.nombre && (
              <li className="px-4 py-3 flex justify-between gap-2 text-slate-600">
                <span>Proyecto</span>
                <span className="text-right font-medium text-slate-900">{ctx.rifa.nombre}</span>
              </li>
            )}
          </ul>
        </div>
      </ConfirmDialog>
    </div>
  )
}