import { BRAND_NAME } from '@/config/brand'

/** Promotora / titular de cuentas de cobro (misma fuente que pagina-supertoyota config.js) */
export const PROMOTORA_NAME = 'Inversiones Castaño'

export const COMBOTOYOTAS_CONTACT = {
  nombre: BRAND_NAME,
  promotora: PROMOTORA_NAME,
  titularCuenta: 'Inversiones Castaño Asociados SAS',
  nequi: '0091761012',
  nequiLabel: 'Nequi · llave',
  cuentaBancolombia: '70800002342',
  bancoLabel: 'Bancolombia — Ahorros',
  whatsappDisplay: '311 359 6334',
  whatsappWaMe: '573113596334',
} as const

const siteFromEnv = (
  process.env.NEXT_PUBLIC_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  ''
).replace(/\/$/, '')

export const PUBLIC_SITE_BASE_URL =
  siteFromEnv || 'https://combotoyotas.com'