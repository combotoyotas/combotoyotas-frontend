'use client'

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Boleta } from '@/types/boleta'
import type { Rifa } from '@/types/rifa'
import { formatBoletaNumeros } from '@/utils/formatBoletaNumeros'
import { mensajeCompartirBoletaAlCliente } from '@/utils/whatsappMensajes'
import { generarWhatsAppLinkConMensaje } from '@/utils/telefono'
import { WHATSAPP_MENSAJE_ACTIVO, WHATSAPP_VENTAS_ACTIVO } from '@/config/features'
import {
  abrirWhatsappRecordatorioBoleta,
  boletaEstaDisponibleParaVender,
  tipoRecordatorioBoleta,
  urlVenderBoleta,
} from '@/lib/boletaWhatsappAcciones'

export type BoletaEstadoInfo = { label: string; classes: string }

export type BoletaMenuAction = {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  hint?: string
  tone?: 'default' | 'success' | 'danger'
}

type Props = {
  open: boolean
  onClose: () => void
  boleta: Boleta
  rifaInfo?: Rifa | null
  estadoInfo: BoletaEstadoInfo
  onVerDetalle: () => void
  onImprimir: () => void
  onEditarNota?: () => void
  rifaId?: string | null
  onIrAVender?: (href: string) => void
  /** En móvil: bottom sheet; en desktop: popover anclado */
  mode?: 'sheet' | 'popover'
  anchorEl?: HTMLElement | null
}

function buildWhatsAppAction(
  boleta: Boleta,
  rifaInfo: Rifa | null | undefined,
  estadoLabel: string,
  onClose: () => void
): BoletaMenuAction {
  const tel = boleta.cliente_info?.telefono
  const mensaje = mensajeCompartirBoletaAlCliente({
    nombreCliente: boleta.cliente_info?.nombre,
    rifaNombre: rifaInfo?.nombre,
    numeros: boleta.numeros,
    numero: boleta.numero,
    estadoLabel,
  })
  const waActivo = WHATSAPP_VENTAS_ACTIVO || WHATSAPP_MENSAJE_ACTIVO
  const url = waActivo && tel ? generarWhatsAppLinkConMensaje(tel, mensaje) : null

  return {
    id: 'whatsapp',
    label: 'Enviar boleta por WhatsApp',
    hint: !boleta.cliente_info?.telefono
      ? 'La boleta no tiene cliente con teléfono'
      : !waActivo
        ? 'WhatsApp desactivado en configuración'
        : undefined,
    disabled: !url,
    tone: 'success',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    onClick: () => {
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
      onClose()
    },
  }
}

export function buildBoletaMenuActions(props: {
  boleta: Boleta
  rifaInfo?: Rifa | null
  rifaId?: string | null
  estadoInfo: BoletaEstadoInfo
  onVerDetalle: () => void
  onImprimir: () => void
  onEditarNota?: () => void
  onIrAVender?: (href: string) => void
  onClose: () => void
}): BoletaMenuAction[] {
  const {
    boleta,
    rifaInfo,
    rifaId,
    estadoInfo,
    onVerDetalle,
    onImprimir,
    onEditarNota,
    onIrAVender,
    onClose,
  } = props

  const actions: BoletaMenuAction[] = []

  if (boletaEstaDisponibleParaVender(boleta) && rifaId) {
    actions.push({
      id: 'vender',
      label: 'Vender esta boleta',
      tone: 'success',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      onClick: () => {
        const href = urlVenderBoleta(rifaId, boleta.id)
        if (onIrAVender) onIrAVender(href)
        else if (typeof window !== 'undefined') window.location.href = href
        onClose()
      },
    })
  }

  const tipoRec = tipoRecordatorioBoleta(boleta)
  if (tipoRec) {
    actions.push({
      id: 'recordatorio',
      label: tipoRec === 'ABONADA' ? 'Recordatorio (abonada)' : 'Recordatorio (reservada)',
      tone: 'success',
      disabled: !boleta.cliente_info?.telefono,
      hint: !boleta.cliente_info?.telefono ? 'Falta teléfono del cliente' : 'Usa la plantilla de Ajustes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      onClick: () => {
        void abrirWhatsappRecordatorioBoleta(boleta, rifaInfo).then((r) => {
          if (!r.ok && typeof window !== 'undefined') {
            window.alert(r.error || 'No se pudo abrir WhatsApp')
          }
          onClose()
        })
      },
    })
  }

  actions.push(
    {
      id: 'ver',
      label: 'Ver detalle',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      onClick: () => {
        onVerDetalle()
        onClose()
      },
    },
    {
      id: 'print',
      label: 'Imprimir / descargar',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      ),
      onClick: () => {
        onImprimir()
        onClose()
      },
    },
    buildWhatsAppAction(boleta, rifaInfo, estadoInfo.label, onClose)
  )

  if (onEditarNota) {
    actions.push({
      id: 'nota',
      label: 'Editar nota interna',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      onClick: () => {
        onEditarNota()
        onClose()
      },
    })
  }

  return actions
}

function MenuList({
  titleId,
  boleta,
  actions,
  onClose,
}: {
  titleId: string
  boleta: Boleta
  actions: BoletaMenuAction[]
  onClose: () => void
}) {
  return (
    <ul className="py-1" role="menu" aria-labelledby={titleId}>
      {actions.map((action) => (
        <li key={action.id} role="none">
          <button
            type="button"
            role="menuitem"
            disabled={action.disabled}
            onClick={action.onClick}
            className={`w-full flex items-start gap-3 px-4 py-3.5 text-left text-sm transition-colors min-h-[48px] disabled:opacity-45 disabled:cursor-not-allowed ${
              action.tone === 'success'
                ? 'text-emerald-800 hover:bg-emerald-50'
                : 'text-slate-800 hover:bg-slate-50'
            }`}
          >
            <span className="mt-0.5 shrink-0 text-slate-500">{action.icon}</span>
            <span className="flex-1 min-w-0">
              <span className="font-medium block">{action.label}</span>
              {action.hint && (
                <span className="text-xs text-slate-500 mt-0.5 block">{action.hint}</span>
              )}
            </span>
          </button>
        </li>
      ))}
      <li role="none" className="border-t border-slate-100 mt-1">
        <button
          type="button"
          role="menuitem"
          onClick={onClose}
          className="w-full px-4 py-3.5 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50 min-h-[48px]"
        >
          Cancelar
        </button>
      </li>
    </ul>
  )
}

export default function BoletaOpcionesMenu({
  open,
  onClose,
  boleta,
  rifaInfo,
  estadoInfo,
  onVerDetalle,
  onImprimir,
  onEditarNota,
  rifaId = null,
  onIrAVender,
  mode = 'sheet',
  anchorEl = null,
}: Props) {
  const titleId = useId()
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    if (mode === 'sheet') {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, mode])

  if (!open || typeof document === 'undefined') return null

  const actions = buildBoletaMenuActions({
    boleta,
    rifaInfo,
    rifaId,
    estadoInfo,
    onVerDetalle,
    onImprimir,
    onEditarNota,
    onIrAVender,
    onClose,
  })

  const numeroLabel = formatBoletaNumeros(boleta.numeros, boleta.numero)
  const subtitulo =
    boleta.cliente_info?.nombre ||
    boleta.inventario_info?.nombre ||
    'Sin asignar'

  if (mode === 'popover' && anchorEl) {
    const rect = anchorEl.getBoundingClientRect()
    const top = rect.bottom + 6
    const right = Math.max(8, window.innerWidth - rect.right)

    return createPortal(
      <>
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          aria-label="Cerrar menú"
          onClick={onClose}
        />
        <div
          className="fixed z-50 w-72 max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white shadow-xl"
          style={{ top, right }}
          role="dialog"
          aria-labelledby={titleId}
        >
          <div className="px-4 py-3 border-b border-slate-100">
            <p id={titleId} className="font-semibold text-slate-900">
              Boleta {numeroLabel}
            </p>
            <p className="text-xs text-slate-500 truncate">{subtitulo}</p>
          </div>
          <MenuList titleId={titleId} boleta={boleta} actions={actions} onClose={onClose} />
        </div>
      </>,
      document.body
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Cerrar menú"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="relative w-full max-h-[min(85vh,520px)] overflow-hidden rounded-t-2xl sm:rounded-2xl sm:max-w-md bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-slate-200" aria-hidden />
        </div>
        <div className="px-4 py-3 border-b border-slate-100">
          <p id={titleId} className="font-semibold text-slate-900 text-lg">
            Boleta {numeroLabel}
          </p>
          <p className="text-sm text-slate-500 truncate">{subtitulo}</p>
          <span
            className={`inline-flex mt-2 px-2.5 py-0.5 text-xs font-bold rounded-full ${estadoInfo.classes}`}
          >
            {estadoInfo.label}
          </span>
        </div>
        <div className="overflow-y-auto overscroll-contain">
          <MenuList titleId={titleId} boleta={boleta} actions={actions} onClose={onClose} />
        </div>
      </div>
    </div>,
    document.body
  )
}
