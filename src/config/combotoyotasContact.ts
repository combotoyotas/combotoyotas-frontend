import { BRAND_NAME } from '@/config/brand'

/** Datos de contacto y pago oficiales de Combo Toyotas */
export const COMBOTOYOTAS_CONTACT = {
  nombre: BRAND_NAME,
  whatsappDisplay: '313 734 3527',
  whatsappWaMe: '573137343527',
  cuentaBancolombia: '58332955789',
  llaveBreve: '@mauricio5796',
  titular: BRAND_NAME,
} as const

const siteFromEnv = (
  process.env.NEXT_PUBLIC_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  ''
).replace(/\/$/, '')

export const PUBLIC_SITE_BASE_URL =
  siteFromEnv || 'https://combotoyotas.com'
