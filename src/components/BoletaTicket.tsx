'use client'

import { useState, useEffect } from 'react'
import { getStorageImageUrl } from '@/lib/storageImageUrl'
import {
  BOLETA_WIDTH,
  BOLETA_LEFT_WIDTH,
  BOLETA_RIGHT_WIDTH,
  BOLETA_DEFAULT_HEIGHT,
  BOLETA_ARTE_BONO,
  bonoFooterHeightPx,
  bonoNumeroHeightPx,
  boletaHeightForImage,
} from '@/constants/boletaDimensions'
import { getPrincipalGift } from '@/utils/formatBoletaNumeros'
import {
  type AbonoBonoLine,
  bonoAbonoLineFontPx,
  bonoAbonoLinesGapPx,
  formatMontoBono,
  resolveBonoFooterDetalle,
} from '@/utils/boletaBonoFooter'

interface BoletaTicketProps {
  qrUrl: string
  barcode: string
  numero: number
  numeros?: number[]
  numeroPrincipal?: number | null
  imagenUrl?: string | null
  rifaNombre: string
  estado: string
  clienteInfo?: {
    nombre: string
    identificacion?: string
  } | null
  deuda?: number | string | null
  reservadaHasta?: string | null
  precio?: number | null
  nota?: string | null
  hideQr?: boolean
  hideIdentificacion?: boolean
  abonos?: AbonoBonoLine[] | null
}

export default function BoletaTicket(props: BoletaTicketProps) {
  const {
    qrUrl,
    numero,
    numeros,
    numeroPrincipal = null,
    imagenUrl,
    rifaNombre,
    estado,
    clienteInfo,
    deuda,
    precio,
    nota,
    hideQr = false,
    hideIdentificacion = false,
    abonos = null,
  } = props

  const [imageError, setImageError] = useState(false)
  const [ticketHeight, setTicketHeight] = useState(BOLETA_DEFAULT_HEIGHT)
  const imagen = getStorageImageUrl(imagenUrl ?? null) ?? imagenUrl
  const hasImagen = Boolean(imagen && imagen.trim())

  useEffect(() => {
    if (!hasImagen || !imagen) {
      setTicketHeight(BOLETA_DEFAULT_HEIGHT)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setTicketHeight(boletaHeightForImage(img.naturalWidth, img.naturalHeight))
    }
    img.onerror = () => setTicketHeight(BOLETA_DEFAULT_HEIGHT)
    img.src = imagen
  }, [imagen, hasImagen])

  const estadoNorm = (estado ?? '').toString().trim().toUpperCase()
  const deudaNum =
    typeof deuda === 'number'
      ? deuda
      : deuda
        ? Number(String(deuda).replace(/[^0-9.-]/g, '')) || null
        : null
  const precioNum =
    typeof precio === 'number'
      ? precio
      : precio
        ? Number(String(precio).replace(/[^0-9.-]/g, '')) || null
        : null
  const tieneCliente = Boolean(clienteInfo && (clienteInfo.nombre || clienteInfo.identificacion))

  const esReservada = estadoNorm === 'RESERVADA'
  const esCancelada = estadoNorm === 'ANULADA' || estadoNorm === 'CANCELADA'
  const estadoPagadoWords = new Set(['CON_PAGO', 'PAGADA', 'PAGADO', 'VENDIDA'])
  const esPagada =
    (estadoPagadoWords.has(estadoNorm) || (tieneCliente && deudaNum === 0)) && tieneCliente
  const esAbonada =
    estadoNorm === 'ABONADA' || (tieneCliente && typeof deudaNum === 'number' && deudaNum > 0)

  const { principal, gift } = getPrincipalGift(numeros, numero, numeroPrincipal)
  const numDisplay = principal ?? numero

  const bonoCancelado =
    tieneCliente &&
    (esPagada ||
      estadoPagadoWords.has(estadoNorm) ||
      (typeof deudaNum === 'number' &&
        deudaNum <= 0 &&
        !esReservada &&
        !esAbonada &&
        !esCancelada))

  const bonoDetalle = resolveBonoFooterDetalle({
    bonoCancelado,
    esAbonada,
    abonos,
  })

  type BarVariant = 'cancelada' | 'bloqueada' | 'reservada' | 'pagada' | 'abonada' | 'disponible'

  let barLabel = 'DISPONIBLE'
  let barVariant: BarVariant = 'disponible'

  if (esCancelada) {
    barLabel = 'BOLETA CANCELADA'
    barVariant = 'cancelada'
  } else if (esReservada && !tieneCliente) {
    barLabel = 'BLOQUEADA'
    barVariant = 'bloqueada'
  } else if (esReservada) {
    barLabel = 'RESERVADA'
    barVariant = 'reservada'
  } else if (esPagada) {
    barLabel = 'PAGADA'
    barVariant = 'pagada'
  } else if (esAbonada) {
    barLabel = 'ABONADA'
    barVariant = 'abonada'
  }

  const showCliente =
    !esCancelada &&
    !(esReservada && !tieneCliente) &&
    barVariant !== 'disponible' &&
    tieneCliente

  const bonoBandPx = bonoFooterHeightPx(ticketHeight)
  const bonoFooterEm = Math.max(9, Math.round(bonoBandPx * 0.2))
  const bonoAbonoCount = bonoDetalle.kind === 'abonos' ? bonoDetalle.lineas.length : 0
  const bonoAbonoLinePx =
    bonoAbonoCount > 0 ? bonoAbonoLineFontPx(bonoBandPx, bonoAbonoCount) : 0
  const bonoAbonoGapPx = bonoAbonoCount > 0 ? bonoAbonoLinesGapPx(bonoAbonoCount) : 0
  const bonoCanceladoPx = Math.max(16, Math.round(bonoBandPx * 0.54))
  const numeroFooterEm = Math.max(8, Math.round(bonoNumeroHeightPx(ticketHeight) * 0.21))

  return (
    <div
      className="boleta-ticket boleta-ticket--oficial"
      style={{
        width: `${BOLETA_WIDTH}px`,
        height: `${ticketHeight}px`,
        minWidth: `${BOLETA_WIDTH}px`,
      }}
    >
      <div
        className="boleta-ticket__left"
        style={{ width: `${BOLETA_LEFT_WIDTH}px`, height: `${ticketHeight}px` }}
      >
        <div className="boleta-ticket__rules">
          <p>- Boleta sin pagar no juega</p>
          <p>- 128 días de caducidad</p>
          <p>- Juega hasta quedar en</p>
          <p>&nbsp;&nbsp;poder del público</p>
        </div>

        <div className={`boleta-ticket__estado-bar boleta-ticket__estado-bar--${barVariant}`}>
          {barLabel}
        </div>

        {esCancelada && (
          <p className="boleta-ticket__cliente" style={{ fontWeight: 700 }}>
            Esta boleta no tiene validez
          </p>
        )}

        {esReservada && !tieneCliente && (
          <p className="boleta-ticket__cliente">Boleta bloqueada momentáneamente</p>
        )}

        {esAbonada && typeof deudaNum === 'number' && deudaNum > 0 && (
          <p className="boleta-ticket__deuda">Deuda: ${deudaNum.toLocaleString('es-CO')}</p>
        )}

        {showCliente && (
          <div className="boleta-ticket__cliente">
            <p>A nombre de:</p>
            <p className="boleta-ticket__cliente-name">{clienteInfo?.nombre ?? '—'}</p>
            {!hideIdentificacion && (
              <p>CC. {clienteInfo?.identificacion ?? '—'}</p>
            )}
          </div>
        )}

        {!hideQr && (
          <img src={qrUrl} alt="QR" className="boleta-ticket__qr" crossOrigin="anonymous" />
        )}

        {nota && (
          <div className="boleta-ticket__nota" style={{ fontSize: 7, color: '#555' }}>
            {nota}
          </div>
        )}

        <div className="boleta-ticket__numero-grande">
          #{String(numDisplay ?? 0).padStart(4, '0')}
        </div>
        {gift != null && (
          <div className="boleta-ticket__regalo-line">
            + #{String(gift).padStart(4, '0')}
          </div>
        )}
        {typeof precioNum === 'number' && precioNum > 0 && (
          <div className="boleta-ticket__precio-grande">
            ${precioNum.toLocaleString('es-CO')}
          </div>
        )}
      </div>

      <div
        className="boleta-ticket__right"
        style={{ width: `${BOLETA_RIGHT_WIDTH}px`, height: `${ticketHeight}px` }}
      >
        {hasImagen && !imageError && imagen ? (
          <img
            src={imagen}
            alt={rifaNombre}
            crossOrigin="anonymous"
            onLoad={(e) => {
              const img = e.currentTarget
              if (img.naturalWidth > 0) {
                setTicketHeight(boletaHeightForImage(img.naturalWidth, img.naturalHeight))
              }
            }}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="boleta-ticket__right-fallback">
            <div>
              <p>
                <strong>{rifaNombre}</strong>
              </p>
              <p>#{String(numDisplay ?? 0).padStart(4, '0')}</p>
            </div>
          </div>
        )}
        <div
          className="boleta-bono-footer"
          style={{
            bottom: BOLETA_ARTE_BONO.bottom,
            gap: BOLETA_ARTE_BONO.gap,
            paddingRight: BOLETA_ARTE_BONO.right,
          }}
        >
          <div
            className="boleta-bono-footer__numero"
            style={{
              width: BOLETA_ARTE_BONO.numeroWidth,
              height: `${bonoNumeroHeightPx(ticketHeight)}px`,
              flex: `0 0 auto`,
              fontSize: `${numeroFooterEm}px`,
            }}
          >
            <span className="boleta-bono-footer__numero-principal">
              {String(numDisplay ?? 0).padStart(4, '0')}
            </span>
            {gift != null && (
              <span className="boleta-bono-footer__numero-regalo">
                +{String(gift).padStart(4, '0')}
              </span>
            )}
          </div>
          <div
            className={`boleta-bono-footer__bono${
              bonoDetalle.kind === 'cancelado'
                ? ' boleta-bono-footer__bono--cancelado'
                : bonoDetalle.kind === 'abonos'
                  ? ` boleta-bono-footer__bono--abonos-${Math.min(bonoDetalle.lineas.length, 4)}`
                  : ''
            }`}
            style={{
              width: BOLETA_ARTE_BONO.bonoWidth,
              height: `${bonoFooterHeightPx(ticketHeight)}px`,
              flex: `0 0 auto`,
              fontSize: `${bonoFooterEm}px`,
            }}
          >
            <div className="boleta-bono-footer__bono-title">BONO DE CANCELACION</div>
            {bonoDetalle.kind === 'abonos' && (
              <div
                className="boleta-bono-footer__bono-abonos"
                style={{ gap: `${bonoAbonoGapPx}px` }}
              >
                {bonoDetalle.lineas.map((linea, idx) => (
                  <div
                    key={`${linea.fechaLabel}-${linea.monto}-${idx}`}
                    className="boleta-bono-footer__bono-abono-linea"
                    style={{ fontSize: `${bonoAbonoLinePx}px`, lineHeight: bonoAbonoCount >= 4 ? 1.05 : 1.15 }}
                  >
                    <span className="boleta-bono-footer__bono-abono-monto">{formatMontoBono(linea.monto)}</span>
                    <span className="boleta-bono-footer__bono-abono-sep" aria-hidden>
                      ·
                    </span>
                    <span className="boleta-bono-footer__bono-abono-fecha">{linea.fechaLabel}</span>
                  </div>
                ))}
              </div>
            )}
            {bonoDetalle.kind === 'cancelado' && (
              <div className="boleta-bono-footer__bono-estado" style={{ fontSize: `${bonoCanceladoPx}px` }}>
                CANCELADO
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
