// Configuración de medios de pago — Rifa Super Toyota (única cuenta para todos los roles)

import { RIFA_SUPERTOYOTA_CONTACT } from '@/config/rifaSuperToyotaContact'

interface PaymentInfo {
  llave: string | null
  cuentaBancolombia: string
  titular: string
  whatsapp: string | null
}

const RIFA_SUPERTOYOTA_PAYMENT: PaymentInfo = {
  llave: RIFA_SUPERTOYOTA_CONTACT.llaveBreve,
  cuentaBancolombia: RIFA_SUPERTOYOTA_CONTACT.cuentaBancolombia,
  titular: RIFA_SUPERTOYOTA_CONTACT.titular,
  whatsapp: RIFA_SUPERTOYOTA_CONTACT.whatsappDisplay.replace(/\s/g, ''),
}

export function getPaymentInfo(): PaymentInfo {
  return RIFA_SUPERTOYOTA_PAYMENT
}

/**
 * Genera el bloque de texto de medios de pago para mensajes de WhatsApp.
 */
export function getMediosDePagoTexto(): string {
  let texto = `*Cómo pagar (Rifa Super Toyota)*\n`
  texto += `💰 Llave Bre-B: ${RIFA_SUPERTOYOTA_CONTACT.llaveBreve}\n`
  texto += `💰 Cuenta de ahorros Bancolombia: ${RIFA_SUPERTOYOTA_CONTACT.cuentaBancolombia}\n`
  texto += `${RIFA_SUPERTOYOTA_CONTACT.titular}\n`
  texto += `📲 WhatsApp: ${RIFA_SUPERTOYOTA_CONTACT.whatsappDisplay}\n`
  texto += `\n*Importante: envía comprobante de pago una vez realizada la transferencia* ✅`
  return texto
}

export function getMediosDePagoBloque(): string {
  return `\n\n${getMediosDePagoTexto()}`
}
