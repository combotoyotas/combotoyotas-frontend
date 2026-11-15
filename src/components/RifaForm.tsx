'use client'

import { useState, useEffect, useRef } from 'react'
import { Rifa, RifaCreateRequest, RifaUpdateRequest } from '@/types/rifa'
import { rifaApi } from '@/lib/rifaApi'
import { uploadApi } from '@/lib/uploadApi'
import RifaPlantillaBoletaEditor from '@/components/rifas/RifaPlantillaBoletaEditor'

interface RifaFormProps {
  rifa?: Rifa | null
  onSubmit: (data: RifaCreateRequest | RifaUpdateRequest) => void
  onCancel: () => void
}

export default function RifaForm({ rifa, onSubmit, onCancel }: RifaFormProps) {
  const [formData, setFormData] = useState<RifaCreateRequest>({
    titulo: '',
    descripcion: '',
    precio_boleta: 0,
    total_boletas: 0,
    fecha_sorteo: '',
    estado: 'BORRADOR',
    doble_oportunidad: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [precioFormateado, setPrecioFormateado] = useState('')
  const [plantillaUrl, setPlantillaUrl] = useState('')
  const [plantillaUrlInicial, setPlantillaUrlInicial] = useState('')
  const [plantillaPreviewBlob, setPlantillaPreviewBlob] = useState<string | null>(null)
  const [plantillaPendingFile, setPlantillaPendingFile] = useState<File | null>(null)
  const [cargandoPlantilla, setCargandoPlantilla] = useState(false)
  const plantillaLoadedFor = useRef<string | null>(null)

  // Función para formatear número a formato pesos colombianos
  const formatearPesos = (valor: number): string => {
    if (valor === 0) return ''
    return valor.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  }

  // Función para parsear el formato pesos colombianos a número
  const parsearPesos = (texto: string): number => {
    if (!texto) return 0
    // Remover puntos y otros caracteres no numéricos excepto decimales
    const numeroLimpio = texto.replace(/[^\d]/g, '')
    return numeroLimpio ? parseInt(numeroLimpio, 10) : 0
  }

  useEffect(() => {
    if (rifa) {
      const precioBoleta = parseFloat(rifa.precio_boleta)
      setFormData({
        titulo: rifa.nombre,
        descripcion: rifa.descripcion,
        precio_boleta: precioBoleta,
        total_boletas: rifa.total_boletas,
        fecha_sorteo: rifa.fecha_sorteo ? new Date(rifa.fecha_sorteo).toISOString().slice(0, 16) : '',
        estado: rifa.estado
      })
      setPrecioFormateado(formatearPesos(precioBoleta))
    } else {
      plantillaLoadedFor.current = null
      setPlantillaUrl('')
      setPlantillaUrlInicial('')
      setPlantillaPendingFile(null)
      if (plantillaPreviewBlob?.startsWith('blob:')) {
        URL.revokeObjectURL(plantillaPreviewBlob)
      }
      setPlantillaPreviewBlob(null)
    }
  }, [rifa])

  useEffect(() => {
    if (!rifa?.id) return
    if (plantillaLoadedFor.current === rifa.id) return
    plantillaLoadedFor.current = rifa.id

    const loadPlantilla = async () => {
      setCargandoPlantilla(true)
      try {
        const res = await rifaApi.getRifaById(rifa.id)
        const url = res.data.imagen_url?.trim() || rifa.imagen_url?.trim() || ''
        setPlantillaUrl(url)
        setPlantillaUrlInicial(url)
      } catch {
        const url = rifa.imagen_url?.trim() || ''
        setPlantillaUrl(url)
        setPlantillaUrlInicial(url)
      } finally {
        setCargandoPlantilla(false)
      }
    }
    loadPlantilla()
  }, [rifa])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (name === 'total_boletas') {
      // Solo permitir números para total_boletas
      const valorNumerico = value === '' ? 0 : parseInt(value.replace(/[^\d]/g, ''), 10)
      setFormData(prev => ({
        ...prev,
        [name]: valorNumerico
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value
      }))
    }
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handlePrecioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value
    const valorNumerico = parsearPesos(valor)
    
    setPrecioFormateado(formatearPesos(valorNumerico))
    setFormData(prev => ({
      ...prev,
      precio_boleta: valorNumerico
    }))
    
    if (errors.precio_boleta) {
      setErrors(prev => ({
        ...prev,
        precio_boleta: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'El título es requerido'
    } else if (formData.titulo.trim().length < 3) {
      newErrors.titulo = 'El título debe tener al menos 3 caracteres'
    } else if (formData.titulo.trim().length > 200) {
      newErrors.titulo = 'El título no puede exceder los 200 caracteres'
    }

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es requerida'
    } else if (formData.descripcion.trim().length < 10) {
      newErrors.descripcion = 'La descripción debe tener al menos 10 caracteres'
    } else if (formData.descripcion.trim().length > 1000) {
      newErrors.descripcion = 'La descripción no puede exceder los 1000 caracteres'
    }

    if (!formData.precio_boleta || formData.precio_boleta <= 0) {
      newErrors.precio_boleta = 'El precio de la boleta debe ser mayor a 0'
    }

    // Solo validar total_boletas cuando se está creando una nuevo proyecto
    if (!rifa) {
      if (!formData.total_boletas || formData.total_boletas <= 0 || !Number.isInteger(formData.total_boletas)) {
        newErrors.total_boletas = 'El total de boletas debe ser un número entero positivo'
      } else if (formData.doble_oportunidad) {
        if (formData.total_boletas * 2 > 10000) {
          newErrors.total_boletas = 'En doble oportunidad, máximo 5.000 boletas (10.000 números)'
        }
      } else if (formData.total_boletas < 1000 || formData.total_boletas > 10000) {
        newErrors.total_boletas = 'El total de boletas debe estar entre 1.000 y 10.000'
      }
    }

    if (!formData.fecha_sorteo.trim()) {
      newErrors.fecha_sorteo = 'La fecha de sorteo es requerida'
    } else if (!rifa) {
      const sorteoDate = new Date(formData.fecha_sorteo)
      const now = new Date()
      if (sorteoDate <= now) {
        newErrors.fecha_sorteo = 'La fecha de sorteo debe ser futura'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const submissionData = {
        ...formData,
        fecha_sorteo: new Date(formData.fecha_sorteo).toISOString()
      }
      
      if (rifa) {
        const { total_boletas, doble_oportunidad, ...dataParaActualizar } = submissionData

        let imagenFinal = plantillaUrl.trim()
        if (plantillaPendingFile) {
          const upload = await uploadApi.uploadImagen(plantillaPendingFile)
          imagenFinal = upload.url
        }

        const plantillaCambio =
          plantillaPendingFile != null ||
          imagenFinal !== plantillaUrlInicial.trim()

        const payload: RifaUpdateRequest = {
          titulo: dataParaActualizar.titulo,
          descripcion: dataParaActualizar.descripcion,
          precio_boleta: dataParaActualizar.precio_boleta,
          fecha_sorteo: dataParaActualizar.fecha_sorteo,
          estado: dataParaActualizar.estado,
        }

        if (plantillaCambio) {
          payload.imagen_url = imagenFinal || null
        }

        await onSubmit(payload)
      } else {
        await onSubmit(submissionData)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-light text-slate-900">
          {rifa ? 'Editar proyecto' : 'Nuevo proyecto'}
        </h2>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="titulo" className="block text-sm font-bold text-black mb-2">
              Título del proyecto *
            </label>
            <div className="relative">
              <input
                type="text"
                id="titulo"
                name="titulo"
                value={formData.titulo}
                onChange={handleInputChange}
                maxLength={200}
                className={`w-full px-4 py-2 pr-20 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all duration-200 text-slate-900 placeholder-slate-400 ${
                  errors.titulo ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
                }`}
                placeholder="Proyecto PlayStation 5"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-500">
                {formData.titulo.length}/200
              </span>
            </div>
            {errors.titulo && (
              <p className="mt-1 text-sm text-red-600">{errors.titulo}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="descripcion" className="block text-sm font-bold text-black mb-2">
              Descripción *
            </label>
            <div className="relative">
              <textarea
                id="descripcion"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                maxLength={1000}
                rows={4}
                className={`w-full px-4 py-2 pr-20 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all duration-200 text-slate-900 placeholder-slate-400 resize-none ${
                  errors.descripcion ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
                }`}
                placeholder="Describe los premios y detalles del proyecto..."
              />
              <span className="absolute right-3 bottom-3 text-xs text-slate-500">
                {formData.descripcion.length}/1000
              </span>
            </div>
            {errors.descripcion && (
              <p className="mt-1 text-sm text-red-600">{errors.descripcion}</p>
            )}
          </div>

          <div>
            <label htmlFor="precio_boleta" className="block text-sm font-bold text-black mb-2">
              Precio por Boleta (COP) *
            </label>
            <input
              type="text"
              id="precio_boleta"
              name="precio_boleta"
              value={precioFormateado}
              onChange={handlePrecioChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all duration-200 text-slate-900 placeholder-slate-400 ${
                errors.precio_boleta ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
              }`}
              placeholder="120.000"
            />
            {errors.precio_boleta && (
              <p className="mt-1 text-sm text-red-600">{errors.precio_boleta}</p>
            )}
          </div>

          <div>
            <label htmlFor="total_boletas" className="block text-sm font-bold text-black mb-2">
              Total de Boletas *
              {rifa && <span className="ml-2 text-xs text-slate-500">(No modificable)</span>}
            </label>
            <input
              type="text"
              id="total_boletas"
              name="total_boletas"
              value={formData.total_boletas === 0 ? '' : formData.total_boletas.toString()}
              onChange={handleInputChange}
              readOnly={!!rifa}
              disabled={!!rifa}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all duration-200 text-slate-900 placeholder-slate-400 ${
                errors.total_boletas ? 'border-red-300 bg-red-50' : 
                rifa ? 'border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed' : 
                'border-slate-300 bg-white'
              }`}
              placeholder={formData.doble_oportunidad ? '5000' : '1000'}
              inputMode="numeric"
              pattern="[0-9]*"
            />
            {errors.total_boletas && (
              <p className="mt-1 text-sm text-red-600">{errors.total_boletas}</p>
            )}
            {rifa && (
              <p className="mt-1 text-xs text-slate-500">
                El total de boletas no se puede modificar después de crear el proyecto
              </p>
            )}
            {!rifa && formData.doble_oportunidad && (
              <p className="mt-1 text-xs text-amber-700">
                Doble oportunidad: cada boleta tiene 2 números (máx. 5.000 boletas = 10.000 números)
              </p>
            )}
          </div>

          {!rifa && (
            <div className="md:col-span-2">
              <label className="flex items-start gap-3 p-4 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={Boolean(formData.doble_oportunidad)}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setFormData((prev) => ({
                      ...prev,
                      doble_oportunidad: checked,
                      total_boletas: checked
                        ? (prev.total_boletas === 0 || prev.total_boletas > 5000 ? 5000 : prev.total_boletas)
                        : prev.total_boletas,
                    }))
                  }}
                  className="mt-1 h-4 w-4 rounded border-slate-400"
                />
                <span>
                  <span className="block text-sm font-bold text-black">Doble oportunidad</span>
                  <span className="block text-xs text-slate-600 mt-1">
                    Cada boleta tendrá 2 números únicos del pool 0000–9999. Se recomienda 5.000 boletas.
                  </span>
                </span>
              </label>
            </div>
          )}

          {rifa?.doble_oportunidad && (
            <div className="md:col-span-2">
              <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
                Este proyecto es de <strong>doble oportunidad</strong> (2 números por boleta).
              </div>
            </div>
          )}

          {rifa && (
            cargandoPlantilla ? (
              <div className="md:col-span-2 text-sm text-slate-500 py-4">Cargando plantilla de boleta…</div>
            ) : (
              <RifaPlantillaBoletaEditor
                rifaId={rifa.id}
                rifaTitulo={formData.titulo || rifa.nombre}
                dobleOportunidad={rifa.doble_oportunidad}
                imagenUrl={plantillaUrl}
                onImagenUrlChange={setPlantillaUrl}
                previewBlobUrl={plantillaPreviewBlob}
                onPreviewBlobUrlChange={setPlantillaPreviewBlob}
                pendingFile={plantillaPendingFile}
                onPendingFileChange={setPlantillaPendingFile}
                disabled={loading}
              />
            )
          )}

          <div>
            <label htmlFor="fecha_sorteo" className="block text-sm font-bold text-black mb-2">
              Fecha de Sorteo *
            </label>
            <input
              type="datetime-local"
              id="fecha_sorteo"
              name="fecha_sorteo"
              value={formData.fecha_sorteo}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all duration-200 text-slate-900 placeholder-slate-400 ${
                errors.fecha_sorteo ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'
              }`}
            />
            {errors.fecha_sorteo && (
              <p className="mt-1 text-sm text-red-600">{errors.fecha_sorteo}</p>
            )}
          </div>

          <div>
            <label htmlFor="estado" className="block text-sm font-bold text-black mb-2">
              Estado
            </label>
            <select
              id="estado"
              name="estado"
              value={formData.estado}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-slate-900 bg-white"
            >
              {/* Crear nuevo proyecto: solo BORRADOR y ACTIVA */}
              {!rifa ? (
                <>
                  <option value="BORRADOR">Borrador</option>
                  <option value="ACTIVA">Activa</option>
                </>
              ) : (
                /* Editar proyecto existente - basado en estado actual */
                rifa.estado === 'BORRADOR' ? (
                  <option value="ACTIVA">Activa</option>
                ) : rifa.estado === 'ACTIVA' ? (
                  <>
                    <option value="ACTIVA">Activa</option>
                    <option value="PAUSADA">Pausada</option>
                    <option value="TERMINADA">Terminada</option>
                  </>
                ) : rifa.estado === 'PAUSADA' ? (
                  <>
                    <option value="ACTIVA">Activa</option>
                    <option value="PAUSADA">Pausada</option>
                    <option value="TERMINADA">Terminada</option>
                  </>
                ) : (
                  <option value="TERMINADA">Terminada</option>
                )
              )}
            </select>
          </div>
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
            {loading ? 'Guardando...' : (rifa ? 'Actualizar' : 'Crear')}
          </button>
        </div>
      </form>
    </div>
  )
}
