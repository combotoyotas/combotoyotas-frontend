'use client'

import { useState, useEffect, useRef } from 'react'
import { Cliente, ClienteCreateRequest, ClienteUpdateRequest } from '@/types/cliente'
import { clienteApi } from '@/lib/clienteApi'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function displayOptionalText(value: string | null | undefined): string {
  if (value == null) return ''
  const s = String(value).trim()
  if (!s || s === '—' || s.toLowerCase() === 'null') return ''
  return s
}

function displayEmail(value: string | null | undefined): string {
  const s = displayOptionalText(value)
  if (!s) return ''
  return EMAIL_PATTERN.test(s) ? s : ''
}

function displayIdentificacion(value: string | null | undefined): string {
  const s = displayOptionalText(value)
  if (!s) return ''
  return s.length >= 5 ? s : ''
}

interface ClienteFormProps {
  cliente?: Cliente | null
  onSubmit: (data: ClienteCreateRequest | ClienteUpdateRequest) => void
  onCancel: () => void
}

export default function ClienteForm({ cliente, onSubmit, onCancel }: ClienteFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    identificacion: '',
    direccion: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [generandoId, setGenerandoId] = useState(false)
  const [esVendedor, setEsVendedor] = useState(false)
  const initialEditSnapshot = useRef<typeof formData | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user')
      if (!raw) return
      const user = JSON.parse(raw)
      setEsVendedor(String(user?.rol || '').toUpperCase() === 'VENDEDOR')
    } catch {
      setEsVendedor(false)
    }
  }, [])

  useEffect(() => {
    if (cliente) {
      const next = {
        nombre: displayOptionalText(cliente.nombre),
        telefono: displayOptionalText(cliente.telefono),
        email: displayEmail(cliente.email),
        identificacion: displayIdentificacion(cliente.identificacion),
        direccion: displayOptionalText(cliente.direccion),
      }
      setFormData(next)
      initialEditSnapshot.current = { ...next }
    } else {
      initialEditSnapshot.current = null
    }
    setSubmitError(null)
    setErrors({})
  }, [cliente])

  const isEdit = Boolean(cliente)
  const identificacionRequeridaEnAlta = !isEdit && !esVendedor

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
    } catch {
      setErrors(prev => ({ ...prev, identificacion: 'Error al generar identificación' }))
    } finally {
      setGenerandoId(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    }
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es requerido'
    }
    const emailTrim = formData.email.trim()
    if (emailTrim && !EMAIL_PATTERN.test(emailTrim)) {
      newErrors.email = 'El email no es válido'
    }
    if (identificacionRequeridaEnAlta && !formData.identificacion.trim()) {
      newErrors.identificacion = 'La identificación es requerida'
    }
    const idTrim = formData.identificacion.trim()
    if (idTrim && idTrim.length < 5) {
      newErrors.identificacion = 'Mínimo 5 caracteres si ingresas identificación'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const buildPayload = (): ClienteCreateRequest | ClienteUpdateRequest => {
    const nombre = formData.nombre.trim()
    const telefono = formData.telefono.trim()

    if (isEdit) {
      const payload: ClienteUpdateRequest = { nombre, telefono }
      const snap = initialEditSnapshot.current
      const changed = (key: keyof typeof formData) =>
        !snap || formData[key].trim() !== (snap[key] || '').trim()

      if (changed('email')) {
        const emailTrim = formData.email.trim()
        payload.email = emailTrim || null
      }
      if (changed('identificacion')) {
        const idTrim = formData.identificacion.trim()
        payload.identificacion = idTrim || null
      }
      if (changed('direccion')) {
        payload.direccion = formData.direccion.trim() || null
      }
      return payload
    }

    return {
      nombre,
      telefono,
      email: formData.email.trim() || undefined,
      identificacion: formData.identificacion.trim() || undefined,
      direccion: formData.direccion.trim() || undefined,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setSubmitError(null)
    try {
      await onSubmit(buildPayload())
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo guardar el cliente')
    } finally {
      setLoading(false)
    }
  }

  const hasRequiredFields =
    Boolean(formData.nombre.trim()) && Boolean(formData.telefono.trim())

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
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          ✕
        </button>
      </div>

      {submitError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
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
              type="text"
              inputMode="email"
              autoComplete="email"
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
              Identificación
              {identificacionRequeridaEnAlta ? ' *' : (
                <span className="font-normal text-slate-500"> (opcional)</span>
              )}
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
                placeholder={identificacionRequeridaEnAlta ? '1234567890' : 'Opcional'}
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
            Dirección <span className="font-normal text-slate-500">(opcional)</span>
          </label>
          <input
            type="text"
            id="direccion"
            name="direccion"
            value={formData.direccion}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all duration-200 text-slate-900 placeholder-slate-400 border-slate-300 bg-white"
            placeholder="Opcional"
          />
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
            disabled={loading || !hasRequiredFields}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Guardando...' : (cliente ? 'Actualizar' : 'Crear')}
          </button>
        </div>
      </form>
    </div>
  )
}