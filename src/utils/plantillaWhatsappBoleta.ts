import { formatBoletaNumeros } from '@/utils/formatBoletaNumeros'
import { nombreProyecto } from '@/utils/whatsappMensajes'

export type PlantillaWhatsappVars = {
  nombre?: string | null
  boleta?: string | null
  proyecto?: string | null
  saldo?: string | null
  abono?: string | null
  precio?: string | null
  saldo_linea?: string | null
}

const fmtCop = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export function buildPlantillaVarsFromBoleta(input: {
  clienteNombre?: string | null
  rifaNombre?: string | null
  numeros?: number[] | null
  numero?: number | null
  saldoPendiente?: number | null
  totalPagado?: number | null
  precioBoleta?: number | null
}): PlantillaWhatsappVars {
  const nombre = (input.clienteNombre || 'amigo/a').trim().split(/\s+/)[0] || 'amigo/a'
  const boleta = `Boleta ${formatBoletaNumeros(input.numeros, input.numero ?? 0)}`
  const proyecto = nombreProyecto(input.rifaNombre || 'proyecto')

  let saldo_linea = ''
  if (input.saldoPendiente != null && input.saldoPendiente > 0) {
    saldo_linea = `Te falta por pagar: *${fmtCop(input.saldoPendiente)}*`
  } else if (input.precioBoleta != null && input.precioBoleta > 0) {
    saldo_linea = `Valor de la boleta: *${fmtCop(input.precioBoleta)}*`
  }

  return {
    nombre,
    boleta,
    proyecto,
    saldo: input.saldoPendiente != null ? fmtCop(input.saldoPendiente) : '',
    abono: input.totalPagado != null ? fmtCop(input.totalPagado) : '',
    precio: input.precioBoleta != null ? fmtCop(input.precioBoleta) : '',
    saldo_linea,
  }
}

export function aplicarPlantillaWhatsapp(plantilla: string, vars: PlantillaWhatsappVars): string {
  let out = String(plantilla || '')
  const entries = Object.entries(vars) as [string, string | null | undefined][]
  for (const [key, value] of entries) {
    out = out.split(`{{${key}}}`).join(value ?? '')
  }
  return out.replace(/\n{3,}/g, '\n\n').trim()
}

export type TipoPlantillaBoleta = 'RESERVADA' | 'ABONADA'
