'use client'

import { useState } from 'react'
import {
  compartirBoletaWhatsappConImagen,
  guardarBoletaEnDispositivo,
  nombreArchivoBoleta,
} from '@/utils/ventasBoletaEntrega'

type Props = {
  elementId: string
  numero: number
  numeros?: number[]
  identificacion?: string
  telefono?: string
  clienteNombre?: string
  rifaNombre?: string
  estadoLabel: string
  estadoRaw?: string
  boletaId?: string
  compact?: boolean
}

const btn =
  'inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium min-h-[40px] disabled:opacity-50'

export default function BoletaEntregaAcciones({
  elementId,
  numero,
  numeros,
  identificacion,
  telefono,
  clienteNombre,
  rifaNombre,
  estadoLabel,
  estadoRaw,
  boletaId,
  compact,
}: Props) {
  const [guardando, setGuardando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const fileName = nombreArchivoBoleta(numero, identificacion)

  const onGuardar = async () => {
    setGuardando(true)
    try {
      await guardarBoletaEnDispositivo(elementId, fileName)
    } finally {
      setGuardando(false)
    }
  }

  const onWhatsapp = async () => {
    setEnviando(true)
    try {
      await compartirBoletaWhatsappConImagen({
        elementId,
        fileName,
        telefono,
        clienteNombre,
        rifaNombre,
        numeros,
        numero,
        estadoLabel,
        estadoRaw,
        boletaId,
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'justify-end'}`}>
      <button
        type="button"
        onClick={onGuardar}
        disabled={guardando || enviando}
        className={`${btn} bg-blue-600 text-white hover:bg-blue-700`}
      >
        {guardando ? '…' : 'Descargar'}
      </button>
      <button
        type="button"
        onClick={onWhatsapp}
        disabled={enviando || guardando || !telefono?.trim()}
        title={!telefono?.trim() ? 'El cliente no tiene teléfono' : 'Compartir imagen por WhatsApp'}
        className={`${btn} bg-green-600 text-white hover:bg-green-700`}
      >
        {enviando ? '…' : 'WhatsApp'}
      </button>
    </div>
  )
}