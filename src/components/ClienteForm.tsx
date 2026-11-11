'use client'

import { useState, useEffect } from 'react'
import { Cliente, ClienteCreateRequest, ClienteUpdateRequest } from '@/types/cliente'
import { clienteApi } from '@/lib/clienteApi'

interface ClienteFormProps {
  cliente?: Cliente | null
  onSubmit: (data: ClienteCreateRequest | ClienteUpdateRequest) => void
  onCancel: () => void
}

export default function ClienteForm({ cliente, onSubmit, onCancel }: ClienteFormProps) {
  const [formData, setFormData] = useState<ClienteCreateRequest>({
    nombre: '',
    telefono: '',
    email: '',
    identificacion: '',
    direccion: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [generandoId, setGenerandoId] = useState(false)

  useEffect(() => {
    if (cliente) {
      setFormData({
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        email: cliente.email,
        identificacion: cliente.identificacion,
        direccion: cliente.direccion
      })
    }
  }, [cliente])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const generarIdentificacion = async () => {
    setGenerandoId(true)
    try {
      const response = await clienteApi.getNextIdentificacion()
      setFormData(prev => ({
        ...prev,
        identificacion: response.data.identificacion
      }))
      if (errors.identificacion) {
        setErrors(prev => ({ ...prev, identificacion: '' }))
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, identificacion: 'Error al generar identificación' }))
    } finally {
      setGenerandoId(false)
    }
  }

  const validateForm = async () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    }
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es requerido'
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido'
    }
    if (!formData.identificacion.trim()) {
      newErrors.identificacion = 'La identificación es requerida'
    }
    if (!formData.direccion.trim()) {
      newErrors.direccion = 'La dirección es requerida'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!(await validateForm())) {
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        ...formData,
        email: formData.email.trim() || undefined,
        direccion: formData.direccion.trim() || undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-light text-slate-900">
            {cliente ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          {cliente?.codigo && (
            <p className="text-sm text-slate-500 mt-1 font-mono">
              Código de ficha: <span className="font-semibold text-slate-800">{cliente.codigo}</span>
            </p>
          )}
        </div>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="nombre" className="block text-sm font-bold text-black mb-2">
              Nombre Completo *
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all duration-200 text-slate-900 placeholder-slate-400 ${
                errors.nombre ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
              }`}
              placeholder="Juan Pérez"
            />
            {errors.nombre && (
              <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
            )}
          </div>

          <div>
            <label htmlFor="telefono" className="block text-sm font-bold text-black mb-2">
              Teléfono *
            </label>
            <input
              type="tel"
              id="telefono"
              name="telefono"
              value={formData.telefono}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all duration-200 text-slate-900 placeholder-slate-400 ${
                errors.telefono ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
              }`}
              placeholder="8095551234"
            />
            {errors.telefono && (
              <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-bold text-black mb-2">
              Correo Electrónico <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all duration-200 text-slate-900 placeholder-slate-400 ${
                errors.email ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
              }`}
              placeholder="Opcional"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="identificacion" className="block text-sm font-bold text-black mb-2">
              Identificación *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="identificacion"
                name="identificacion"
                value={formData.identificacion}
                onChange={handleInputChange}
                className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all duration-200 text-slate-900 placeholder-slate-400 ${
                  errors.identificacion ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
                }`}
                placeholder="12345678901"
              />
              {!cliente && (
                <button
                  type="button"
                  onClick={generarIdentificacion}
                  disabled={generandoId}
                  className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  {generandoId ? '...' : 'Generar'}
                </button>
              )}
            </div>
            {errors.identificacion && (
              <p className="mt-1 text-sm text-red-600">{errors.identificacion}</p>
            )}
            {!cliente && (
              <p className="mt-1 text-xs text-slate-500">
                La cédula puede repetirse entre vendedores. Al guardar, el sistema asigna un código único de ficha.
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="direccion" className="block text-sm font-bold text-black mb-2">
            Dirección *
          </label>
          <input
            type="text"
            id="direccion"
            name="direccion"
            value={formData.direccion}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all duration-200 text-slate-900 placeholder-slate-400 ${
              errors.direccion ? 'border-red-500 bg-red-100' : 'border-slate-300 bg-white'
            }`}
            placeholder="Calle Principal #123, Santo Domingo"
          />
          {errors.direccion && (
            <p className="mt-1 text-sm text-red-600">{errors.direccion}</p>
          )}
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Guardando...' : (cliente ? 'Actualizar' : 'Crear')}
          </button>
        </div>
      </form>
    </div>
  )
}
