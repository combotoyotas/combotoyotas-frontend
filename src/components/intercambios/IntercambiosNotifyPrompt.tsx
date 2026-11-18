'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowLeftRight, X } from 'lucide-react'
import { intercambiosApi, type IntercambioSolicitud } from '@/lib/intercambiosApi'
import {
  cargarLeidas,
  claveLeida,
  clavePendingEntrante,
  guardarLeidas,
  marcarLeidaClave,
} from '@/lib/intercambiosLeidas'

const POLL_MS = 15_000

type AlertKind = 'entrante' | 'respuesta'

type AlertItem = {
  kind: AlertKind
  clave: string
  solicitud: IntercambioSolicitud
}

function pad4(n: number) {
  return String(n).padStart(4, '0')
}

function etiquetaSolicitante(s: IntercambioSolicitud) {
  if (s.solicitante_es_oficina || s.solicitante_nombre === 'Oficina') return 'Oficina'
  return s.solicitante_nombre || 'Un vendedor'
}

function puedeRecibirIntercambios(rol: string) {
  const r = rol.toUpperCase()
  return r === 'VENDEDOR' || r === 'ADMIN' || r === 'SUPER_ADMIN'
}

function construirCola(
  porAprobar: IntercambioSolicitud[],
  historial: IntercambioSolicitud[],
  leidas: Set<string>
): AlertItem[] {
  const items: AlertItem[] = []

  for (const s of porAprobar) {
    if (s.estado !== 'PENDIENTE') continue
    const clave = clavePendingEntrante(s.id)
    if (leidas.has(clave)) continue
    items.push({ kind: 'entrante', clave, solicitud: s })
  }

  for (const s of historial) {
    if (s.direccion !== 'ENVIADA') continue
    if (s.estado !== 'ACEPTADA' && s.estado !== 'RECHAZADA') continue
    const clave = claveLeida(s)
    if (leidas.has(clave)) continue
    items.push({ kind: 'respuesta', clave, solicitud: s })
  }

  items.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'entrante' ? -1 : 1
    const ta = new Date(a.solicitud.created_at).getTime()
    const tb = new Date(b.solicitud.created_at).getTime()
    return tb - ta
  })

  return items
}

export default function IntercambiosNotifyPrompt() {
  const router = useRouter()
  const pathname = usePathname() || ''
  const [alerta, setAlerta] = useState<AlertItem | null>(null)
  const [leidas, setLeidas] = useState<Set<string>>(() => cargarLeidas())
  const [habilitado, setHabilitado] = useState(false)

  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      const raw = localStorage.getItem('user')
      if (!token || !raw) {
        setHabilitado(false)
        return
      }
      const user = JSON.parse(raw)
      setHabilitado(puedeRecibirIntercambios(String(user?.rol || '')))
    } catch {
      setHabilitado(false)
    }
  }, [pathname])

  const refrescar = useCallback(async () => {
    if (!habilitado) return
    if (document.visibilityState !== 'visible') return
    if (pathname === '/login' || pathname.startsWith('/login')) return

    try {
      const data = await intercambiosApi.listar()
      const ack = cargarLeidas()
      setLeidas(ack)
      const cola = construirCola(data.por_aprobar ?? [], data.historial ?? [], ack)
      setAlerta((prev) => {
        if (!cola.length) return null
        if (prev && cola.some((c) => c.clave === prev.clave)) return prev
        return cola[0]
      })
    } catch {
      /* sin token válido o red */
    }
  }, [habilitado, pathname])

  useEffect(() => {
    if (!habilitado) return
    void refrescar()
    const id = window.setInterval(() => void refrescar(), POLL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') void refrescar()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [habilitado, refrescar])

  const descartar = useCallback(
    (item: AlertItem) => {
      const next = marcarLeidaClave(item.clave)
      setLeidas(next)
      setAlerta(null)
      void refrescar()
    },
    [refrescar]
  )

  const irAIntercambios = useCallback(
    (item: AlertItem) => {
      marcarLeidaClave(item.clave)
      if (item.kind === 'respuesta') {
        marcarLeidaClave(claveLeida(item.solicitud))
      }
      setLeidas(cargarLeidas())
      setAlerta(null)
      router.push('/intercambios')
    },
    [router]
  )

  const cuerpo = useMemo(() => {
    if (!alerta) return null
    const s = alerta.solicitud
    const sol = etiquetaSolicitante(s)
    const ofr = pad4(s.numero_ofrecido)
    const ped = pad4(s.numero_solicitado)

    if (alerta.kind === 'entrante') {
      const texto =
        s.contraparte_tipo === 'OFICINA'
          ? `${sol} solicita el número #${ped} del pool de oficina y ofrece #${ofr}.`
          : `${sol} solicita tu número #${ped} y ofrece a cambio #${ofr}.`
      return {
        titulo: 'Nueva solicitud de intercambio',
        texto,
        accion: 'Ver y responder',
        tono: 'indigo' as const,
      }
    }

    if (s.estado === 'RECHAZADA') {
      const contra =
        s.contraparte_tipo === 'OFICINA'
          ? 'Oficina'
          : s.contraparte_vendedor_nombre || 'La otra parte'
      return {
        titulo: 'Solicitud rechazada',
        texto: `${contra} rechazó tu intercambio (pediste #${ped}, ofreciste #${ofr}).`,
        accion: 'Ver en intercambios',
        tono: 'rose' as const,
      }
    }

    const res = s.resultado?.resumen
    const pedFmt = res?.numero_solicitado_fmt || ped
    const ofrFmt = res?.numero_ofrecido_fmt || ofr
    const contra = res?.contraparte_nombre || s.contraparte_vendedor_nombre || 'La otra parte'
    const detalleOficina = s.solicitante_es_oficina
      ? `Oficina quedó con #${pedFmt} en el pool; ${contra} quedó con #${ofrFmt}.`
      : `Te quedó #${pedFmt} en tu inventario; ${contra} quedó con #${ofrFmt}.`

    return {
      titulo: 'Intercambio aceptado',
      texto: `Aceptaron tu trueque (#${ped} por #${ofr}). ${detalleOficina}`,
      accion: 'Ver detalle',
      tono: 'emerald' as const,
    }
  }, [alerta])

  if (!habilitado || !alerta || !cuerpo) return null

  const estilos =
    cuerpo.tono === 'emerald'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
      : cuerpo.tono === 'rose'
        ? 'border-rose-300 bg-rose-50 text-rose-950'
        : 'border-indigo-300 bg-indigo-50 text-indigo-950'

  const btnPrimary =
    cuerpo.tono === 'emerald'
      ? 'bg-emerald-700 hover:bg-emerald-800'
      : cuerpo.tono === 'rose'
        ? 'bg-rose-700 hover:bg-rose-800'
        : 'bg-indigo-700 hover:bg-indigo-800'

  return (
    <div
      className="fixed inset-x-0 top-0 z-[195] flex justify-center p-2 pointer-events-none sm:p-3 pt-[max(0.5rem,var(--sat))]"
      role="status"
      aria-live="assertive"
    >
      <div
        className={`pointer-events-auto flex w-full max-w-lg flex-col gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${estilos}`}
      >
        <div className="flex items-start gap-2">
          <ArrowLeftRight className="h-5 w-5 shrink-0 mt-0.5 opacity-80" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{cuerpo.titulo}</p>
            <p className="mt-1 leading-snug">{cuerpo.texto}</p>
          </div>
          <button
            type="button"
            onClick={() => descartar(alerta)}
            className="shrink-0 rounded-lg p-1.5 opacity-70 hover:opacity-100 hover:bg-black/5 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar aviso"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => irAIntercambios(alerta)}
          className={`w-full min-h-11 rounded-lg px-4 py-2.5 font-semibold text-white ${btnPrimary}`}
        >
          {cuerpo.accion}
        </button>
      </div>
    </div>
  )
}