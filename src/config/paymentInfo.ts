// Medios de pago públicos — Inversiones Castaño (alineado con landing)

import { COMBOTOYOTAS_CONTACT } from '@/config/combotoyotasContact'

interface PaymentInfo {
  nequi: string
  cuentaBancolombia: string
  titular: string
  promotora: string
  whatsapp: string | null
}

const PAYMENT: PaymentInfo = {
  nequi: COMBOTOYOTAS_CONTACT.nequi,
  cuentaBancolombia: COMBOTOYOTAS_CONTACT.cuentaBancolombia,
  titular: COMBOTOYOTAS_CONTACT.titularCuenta,
  promotora: COMBOTOYOTAS_CONTACT.promotora,
  whatsapp: COMBOTOYOTAS_CONTACT.whatsappDisplay.replace(/\s/g, ''),
}

export function getPaymentInfo(): PaymentInfo {
  return PAYMENT
}

/**
 * Bloque de medios de pago para mensajes de WhatsApp (reservas, saldos, recordatorios).
 */
export function getMediosDePagoTexto(): string {
  const c = COMBOTOYOTAS_CONTACT
  let texto = `*Cómo pagar (${c.promotora})*\n`
  texto += `📱 ${c.nequiLabel}: ${c.nequi}\n`
  texto += `💰 ${c.bancoLabel}: ${c.cuentaBancolombia}\n`
  texto += `${c.titularCuenta}\n`
  texto += `📲 WhatsApp: ${c.whatsappDisplay}\n`
  texto += `\n*Importante: envía comprobante de pago una vez realizada la transferencia* ✅`
  return texto
}

export function getMediosDePagoBloque(): string {
  return `\n\n${getMediosDePagoTexto()}`
}