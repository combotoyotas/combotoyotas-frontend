'use client'

import { Cliente } from '@/types/ventas'

interface ClienteSeleccionadoProps {
  cliente: Cliente
  onCambiarCliente?: () => void
  onActualizarCliente?: (patch: Partial<Cliente>) => void
}

export default function ClienteSeleccionado({
  cliente,
  onCambiarCliente,
  onActualizarCliente,
}: ClienteSeleccionadoProps) {
  // Validación de seguridad - verificar que el cliente exista y tenga nombre no vacío
  if (!cliente || !cliente.nombre || cliente.nombre.trim() === '') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="text-center text-slate-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-slate-600">Cliente no seleccionado</p>
          <p className="text-sm text-slate-500 mt-1">
            Por favor, selecciona un cliente para continuar
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-slate-900">Cliente Seleccionado</h2>
        {onCambiarCliente && (
          <button
            onClick={onCambiarCliente}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Cambiar cliente
          </button>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <div className="font-medium text-slate-900">{cliente.nombre || 'Sin nombre'}</div>
            <div className="text-sm text-slate-600">{cliente.telefono || 'Sin teléfono'}</div>
          </div>
        </div>
        
        {cliente.email && (
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>{cliente.email}</span>
          </div>
        )}
        
        {cliente.identificacion && (
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
            <span>ID: {cliente.identificacion}</span>
          </div>
        )}
        
        <div className="pt-1">
          <label className="block text-sm font-medium text-slate-800 mb-1.5">
            Ciudad / municipio{' '}
            <span className="text-slate-400 font-normal">(aparece en la boleta)</span>
          </label>
          {onActualizarCliente ? (
            <textarea
              value={cliente.direccion ?? ''}
              onChange={(e) => onActualizarCliente({ direccion: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Ej: Pereira, Dosquebradas..."
            />
          ) : cliente.direccion ? (
            <div className="flex items-start space-x-2 text-sm text-slate-600">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{cliente.direccion}</span>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin ciudad registrada</p>
          )}
        </div>
      </div>
    </div>
  )
}
