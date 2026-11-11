'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/admin/PageHeader'

export default function VentasHomePage() {
  const router = useRouter()

  return (
    <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      <PageHeader
        eyebrow="Ventas"
        title="¿Qué deseas hacer?"
        description="Selecciona una opción para continuar"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <button
          type="button"
          onClick={() => router.push('/ventas/nueva-venta')}
          className="text-left bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-md card-hover"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Nueva venta</h3>
          <p className="text-slate-500 mt-2 text-sm">
            Registrar una nueva venta de boletas para un cliente, con bloqueo en tiempo real.
          </p>
        </button>

        <button
          type="button"
          onClick={() => router.push('/ventas/gestionar')}
          className="text-left bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-md card-hover"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a5 5 0 00-10 0v2M5 13h14l-1.5 8h-11L5 13z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Cobrar venta pendiente</h3>
          <p className="text-slate-500 mt-2 text-sm">
            Registrar pagos o abonos a ventas existentes por número o cliente.
          </p>
        </button>
      </div>
    </div>
  )
}
