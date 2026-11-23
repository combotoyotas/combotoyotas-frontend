import { BOLETA_ARTE_BONO, bonoFooterHeightPx, bonoNumeroHeightPx } from '@/constants/boletaDimensions'
import {
  type AbonoBonoLine,
  bonoAbonoLineFontPx,
  bonoAbonoLinesGapPx,
  coalesceAbonosParaBono,
  formatMontoBono,
  resolveBonoFooterDetalle,
} from '@/utils/boletaBonoFooter'

const FOOTER_WRAP = `position:absolute;left:0;right:0;width:100%;bottom:${BOLETA_ARTE_BONO.bottom};z-index:5;display:flex;flex-direction:row;align-items:flex-end;justify-content:flex-end;gap:${BOLETA_ARTE_BONO.gap};padding-right:${BOLETA_ARTE_BONO.right};box-sizing:border-box;`

const NUM_BOX = (ticketHeight: number) =>
  `width:${BOLETA_ARTE_BONO.numeroWidth};height:${bonoNumeroHeightPx(ticketHeight)}px;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;box-sizing:border-box;padding:3px 5px;font-weight:800;line-height:1.05;color:#111;font-family:Helvetica,Arial,sans-serif;`

const BONO_BOX = (ticketHeight: number) =>
  `width:${BOLETA_ARTE_BONO.bonoWidth};height:${bonoFooterHeightPx(ticketHeight)}px;background:#fff;display:flex;flex-direction:column;box-sizing:border-box;font-family:Helvetica,Arial,sans-serif;`

function fontScalePx(ticketHeight: number) {
  const bandBono = bonoFooterHeightPx(ticketHeight)
  const bandNum = bonoNumeroHeightPx(ticketHeight)
  const emBono = Math.max(9, Math.round(bandBono * 0.2))
  const emNum = Math.max(8, Math.round(bandNum * 0.21))
  return {
    emBono,
    emNum,
    num: Math.round(emNum * 1.22),
    gift: Math.round(emNum * 0.62),
    title: Math.round(emBono * 0.68),
  }
}

export function formatNumeroBonoCaja(numero: number, gift: number | null | undefined, ticketHeight?: number) {
  const f = fontScalePx(ticketHeight ?? 334)
  const principal = String(numero).padStart(4, '0')
  if (gift == null) return principal
  return `${principal}<span style="display:block;font-size:${f.gift}px;font-weight:700;line-height:1.1;margin-top:2px;">+${String(gift).padStart(4, '0')}</span>`
}

/** HTML inline para descarga masiva (misma geometría que BoletaTicket). */
function bonoDetalleHtml(
  detalle: ReturnType<typeof resolveBonoFooterDetalle>,
  bandBonoPx: number
): string {
  if (detalle.kind === 'cancelado') {
    const cancelPx = Math.max(16, Math.round(bandBonoPx * 0.54))
    return `<div style="flex:1 1 auto;display:flex;align-items:center;justify-content:center;width:100%;min-height:0;margin-top:2px;padding:0 2px 2px;font-size:${cancelPx}px;font-weight:800;color:#15803d;letter-spacing:0.05em;line-height:1;text-align:center;">CANCELADO</div>`
  }
  if (detalle.kind !== 'abonos') return ''
  const n = detalle.lineas.length
  const linePx = bonoAbonoLineFontPx(bandBonoPx, n)
  const gapPx = bonoAbonoLinesGapPx(n)
  const lh = n >= 4 ? 1.05 : 1.15
  return `<div style="margin-top:0.1em;display:flex;flex-direction:column;gap:${gapPx}px;width:100%;flex:1 1 auto;min-height:0;overflow:hidden;">${detalle.lineas
    .map(
      (l) =>
        `<div style="font-size:${linePx}px;font-weight:800;line-height:${lh};color:#111;white-space:nowrap;letter-spacing:0.01em;display:flex;flex-wrap:nowrap;align-items:baseline;gap:0.28em;"><span>${formatMontoBono(l.monto)}</span><span style="opacity:0.65;">·</span><span>${l.fechaLabel}</span></div>`
    )
    .join('')}</div>`
}

export function BOLETA_BONO_FOOTER_HTML(
  numeroPrincipal: number,
  gift: number | null | undefined,
  bonoCancelado: boolean,
  ticketHeight: number = 334,
  esAbonada = false,
  abonos?: AbonoBonoLine[] | null,
  totalAbonado?: number | null
): string {
  const f = fontScalePx(ticketHeight)
  const bandBonoPx = bonoFooterHeightPx(ticketHeight)
  const numeroInner = formatNumeroBonoCaja(numeroPrincipal, gift, ticketHeight)
  const abonosCoalesced = coalesceAbonosParaBono({ abonos, totalAbonado })
  const detalle = resolveBonoFooterDetalle({
    bonoCancelado,
    esAbonada,
    abonos: abonosCoalesced,
  })
  const detalleHtml = bonoDetalleHtml(detalle, bandBonoPx)

  const bonoBoxAligned = `${BONO_BOX(ticketHeight)}justify-content:flex-start;align-items:flex-start;padding:0.38em 0.55em 0.3em 0.62em;font-size:${f.emBono}px;`

  return `
  <div style="${FOOTER_WRAP}">
    <div style="${NUM_BOX(ticketHeight)}font-size:${f.num}px;text-align:center;">
      ${numeroInner}
    </div>
    <div style="${bonoBoxAligned}">
      <div style="font-size:0.68em;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;line-height:1.15;color:#111;text-align:left;width:100%;flex:0 0 auto;">BONO DE CANCELACION</div>
      ${detalleHtml}
    </div>
  </div>`
}