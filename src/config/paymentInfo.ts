// Configuración de medios de pago — Combo Toyotas (única cuenta para todos los roles)

import { COMBOTOYOTAS_CONTACT } from '@/config/combotoyotasContact'
import { BRAND_NAME } from '@/config/brand'

interface PaymentInfo {
  llave: string | null
  cuentaBancolombia: string
  titular: string
  whatsapp: string | null
}

const COMBOTOYOTAS_PAYMENT: PaymentInfo = {
  llave: COMBOTOYOTAS_CONTACT.llaveBreve,
  cuentaBancolombia: COMBOTOYOTAS_CONTACT.cuentaBancolombia,
  titular: COMBOTOYOTAS_CONTACT.titular,
  whatsapp: COMBOTOYOTAS_CONTACT.whatsappDisplay.replace(/\s/g, ''),
}

export function getPaymentInfo(): PaymentInfo {
  return COMBOTOYOTAS_PAYMENT
}

/**
 * Genera el bloque de texto de medios de pago para mensajes de WhatsApp.
 */
export function getMediosDePagoTexto(): string {
  let texto = `*Cómo pagar (${BRAND_NAME})*\n`
  texto += `💰 Llave Bre-B: ${COMBOTOYOTAS_CONTACT.llaveBreve}\n`
  texto += `💰 Cuenta de ahorros Bancolombia: ${COMBOTOYOTAS_CONTACT.cuentaBancolombia}\n`
  texto += `${COMBOTOYOTAS_CONTACT.titular}\n`
  texto += `📲 WhatsApp: ${COMBOTOYOTAS_CONTACT.whatsappDisplay}\n`
  texto += `\n*Importante: envía comprobante de pago una vez realizada la transferencia* ✅`
  return texto
}

export function getMediosDePagoBloque(): string {
  return `\n\n${getMediosDePagoTexto()}`
}
