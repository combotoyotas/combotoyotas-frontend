/** Estilos inline para descarga masiva (mismo diseño oficial blanco). */
export const BOLETA_TICKET_STYLE =
  'display:flex;overflow:hidden;background:#fff;color:#111;border:1px solid #111;font-family:Helvetica,Arial,sans-serif;'

export const BOLETA_LEFT_STYLE =
  'flex-shrink:0;background:#fff;display:flex;flex-direction:column;align-items:center;text-align:center;border-right:1px solid #111;box-sizing:border-box;padding:8px 6px 10px;'

export const BOLETA_BODY_TEXT =
  'font-size:9px;color:#111;line-height:1.35;text-align:center;width:100%;'

export const BOLETA_RULES_HTML = `
  <div style="font-size:9px;line-height:1.35;width:100%;margin-bottom:6px;text-align:center;">
    <p style="margin:0">- Boleta sin pagar no juega</p>
    <p style="margin:0">- 128 días de caducidad</p>
    <p style="margin:0">- Juega hasta quedar en</p>
    <p style="margin:0">&nbsp;&nbsp;poder del público</p>
  </div>`

export const BOLETA_BADGE_STYLES: Record<string, string> = {
  pagada:
    'width:100%;padding:4px 2px;font-size:9px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#fff;margin-bottom:6px;background:#15803d;',
  reservada:
    'width:100%;padding:4px 2px;font-size:9px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#fff;margin-bottom:6px;background:#2563eb;',
  bloqueada:
    'width:100%;padding:4px 2px;font-size:9px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#111;margin-bottom:6px;background:#fde047;',
  abonada:
    'width:100%;padding:4px 2px;font-size:9px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#111;margin-bottom:6px;background:#fb923c;',
  disponible:
    'width:100%;padding:4px 2px;font-size:9px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#111;margin-bottom:6px;background:#6ee7b7;',
  cancelada:
    'width:100%;padding:4px 2px;font-size:9px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#fff;margin-bottom:6px;background:#dc2626;',
}

export const BOLETA_NUMERO_STYLE =
  'font-size:28px;font-weight:700;line-height:1;margin-top:6px;color:#111;text-align:center;'

export const BOLETA_PRECIO_STYLE =
  'font-size:12px;font-weight:700;margin-top:4px;color:#111;text-align:center;'

export const BOLETA_BONO_HTML = (cancelado: boolean) => `
  <div style="position:absolute;right:6px;bottom:6px;z-index:5;background:rgba(255,255,255,0.94);border:1px solid #111;border-radius:2px;padding:4px 6px 5px;min-width:88px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.25);">
    <div style="font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em;color:#111;">Bono de cancelación</div>
    <div style="font-size:10px;font-weight:800;margin-top:2px;color:${cancelado ? '#15803d' : '#737373'};">${cancelado ? 'Cancelado' : 'Pendiente'}</div>
  </div>`
