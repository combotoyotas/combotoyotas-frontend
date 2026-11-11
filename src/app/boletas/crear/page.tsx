'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { rifaApi } from '@/lib/rifaApi'
import { boletaApi } from '@/lib/boletaApi'
import { uploadApi } from '@/lib/uploadApi'
import { getStorageImageUrl } from '@/lib/storageImageUrl'
import { Rifa } from '@/types/rifa'
import { BoletaGenerateRequest } from '@/types/boleta'
import BoletaPreview from '@/components/BoletaPreview'

export default function CrearBoletasPage() {
  const [rifas, setRifas] = useState<Rifa[]>([])
  const [selectedRifa, setSelectedRifa] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [cachedImageFile, setCachedImageFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Form fields for the new parameters
  const [formData, setFormData] = useState<BoletaGenerateRequest>({
    qr_base_url: 'https://rifasupertoyota.com.co/verificar/',
    imagen_url: '',
    diseño_template: 'modern',
    modo_pareo: 'manual',
  })
  const [pares, setPares] = useState<[number | '', number | ''][]>([['', '']])
  const [paresCsv, setParesCsv] = useState('')
  const [entradaManual, setEntradaManual] = useState<'formulario' | 'csv'>('formulario')
  const [num1Draft, setNum1Draft] = useState('')
  const [num2Draft, setNum2Draft] = useState('')
  const [parError, setParError] = useState<string | null>(null)

  const hasImage = Boolean(cachedImageFile || formData.imagen_url)
  const rifaSeleccionada = rifas.find(r => r.id === selectedRifa)
  const esDobleOportunidad = Boolean(rifaSeleccionada?.doble_oportunidad)
  const totalBoletasEsperado = rifaSeleccionada?.total_boletas ?? 0

  const paresCompletos = pares.filter(
    (p): p is [number, number] =>
      typeof p[0] === 'number' && typeof p[1] === 'number' && !Number.isNaN(p[0]) && !Number.isNaN(p[1])
  )

  const numerosUsados = new Set<number>()
  for (const [a, b] of paresCompletos) {
    numerosUsados.add(a)
    numerosUsados.add(b)
  }

  const parseNumeroDraft = (raw: string): number | null => {
    const t = raw.trim()
    if (t === '') return null
    const n = parseInt(t, 10)
    if (Number.isNaN(n) || n < 0 || n > 9999) return null
    return n
  }

  const agregarPar = () => {
    setParError(null)
    const a = parseNumeroDraft(num1Draft)
    const b = parseNumeroDraft(num2Draft)
    if (a === null || b === null) {
      setParError('Ingresa dos números válidos entre 0 y 9999')
      return
    }
    if (a === b) {
      setParError('Los dos números del par deben ser distintos')
      return
    }
    if (numerosUsados.has(a) || numerosUsados.has(b)) {
      setParError(`Número ya usado: ${numerosUsados.has(a) ? String(a).padStart(4, '0') : String(b).padStart(4, '0')}`)
      return
    }
    if (paresCompletos.length >= totalBoletasEsperado) {
      setParError(`Ya tienes los ${totalBoletasEsperado} pares requeridos`)
      return
    }
    setPares((prev) => {
      const next = [...prev]
      // Reemplazar fila vacía final o agregar
      const last = next[next.length - 1]
      if (last && last[0] === '' && last[1] === '') {
        next[next.length - 1] = [a, b]
      } else {
        next.push([a, b])
      }
      return next
    })
    setNum1Draft('')
    setNum2Draft('')
  }

  const quitarPar = (index: number) => {
    setPares(paresCompletos.filter((_, i) => i !== index))
  }

  const sincronizarParesDesdeCsv = (texto: string) => {
    setParesCsv(texto)
    const parsed = texto
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,;\s]+/).map((p) => parseInt(p.trim(), 10))
        if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null
        return [parts[0], parts[1]] as [number, number]
      })
      .filter((p): p is [number, number] => p !== null)
    setPares(parsed.length > 0 ? parsed : [['', '']])
  }
  
  useEffect(() => {
    if (esDobleOportunidad) {
      setFormData((prev) => ({ ...prev, modo_pareo: prev.modo_pareo || 'manual' }))
    }
  }, [esDobleOportunidad])

  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      const user = JSON.parse(userData)
      const rol = String(user.rol || '').toUpperCase()
      setUserRole(rol)

      if (rol !== 'SUPER_ADMIN') {
        router.push('/boletas')
        return
      }

      fetchRifas()
    } catch (error) {
      router.push('/login')
    }
  }, [router])

  const fetchRifas = async () => {
    try {
      const response = await rifaApi.getRifas()
      setRifas(
        response.data.filter((rifa) =>
          ['BORRADOR', 'ACTIVA', 'PAUSADA'].includes(rifa.estado)
        )
      )
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar proyectos')
    } finally {
      setLoading(false)
    }
  }

  const handleCrearBoletas = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedRifa) {
      setError('Por favor selecciona un proyecto para generar boletas')
      return
    }

    if (!formData.qr_base_url || !hasImage || !formData.diseño_template) {
      setError('Por favor completa todos los campos de configuración')
      return
    }

    let paresParsed: [number, number][] | undefined
    if (esDobleOportunidad && formData.modo_pareo === 'manual') {
      if (entradaManual === 'csv') {
        try {
          paresParsed = paresCsv
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const parts = line.split(/[,;\s]+/).map((p) => parseInt(p.trim(), 10))
              if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) {
                throw new Error(`Línea inválida: "${line}" (usa formato 2809,7633)`)
              }
              return [parts[0], parts[1]] as [number, number]
            })
        } catch (parseErr) {
          setError(parseErr instanceof Error ? parseErr.message : 'Error parseando pares')
          return
        }
      } else {
        paresParsed = paresCompletos
      }

      const totalEsperado = rifaSeleccionada?.total_boletas ?? 0
      if (!paresParsed || paresParsed.length !== totalEsperado) {
        setError(`Debes definir exactamente ${totalEsperado} pares (tienes ${paresParsed?.length ?? 0})`)
        return
      }
      const usados = new Set<number>()
      for (const [a, b] of paresParsed) {
        if (a === b || a < 0 || a > 9999 || b < 0 || b > 9999) {
          setError(`Par inválido: ${a}, ${b}`)
          return
        }
        if (usados.has(a) || usados.has(b)) {
          setError(`Número duplicado en los pares: ${usados.has(a) ? a : b}`)
          return
        }
        usados.add(a)
        usados.add(b)
      }
    }

    try {
      setCreating(true)
      setError(null)
      setSuccess(null)

      let imagenUrl = formData.imagen_url

      if (cachedImageFile) {
        setUploadingImage(true)
        const uploadResponse = await uploadApi.uploadImagen(cachedImageFile)
        imagenUrl = uploadResponse.url
        setUploadingImage(false)
      }

      const payload: BoletaGenerateRequest = {
        ...formData,
        imagen_url: imagenUrl,
      }
      if (esDobleOportunidad) {
        payload.modo_pareo = formData.modo_pareo || 'aleatorio'
        if (payload.modo_pareo === 'manual' && paresParsed) {
          payload.pares = paresParsed
        }
      }

      const response = await boletaApi.generarBoletas(selectedRifa, payload)
      
      setSuccess(`Se han generado ${response.data.boletas_generadas} boletas exitosamente con la configuración proporcionada`)
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        router.push('/boletas/ver')
      }, 2000)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar boletas')
    } finally {
      setCreating(false)
      setUploadingImage(false)
    }
  }

  const handleInputChange = (field: keyof BoletaGenerateRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de archivo no válido. Solo se permiten JPG, PNG o WEBP')
      return
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo es demasiado grande. Máximo 5MB')
      return
    }

    setError(null)

    // Revocar URL anterior si existía (para evitar fugas de memoria)
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }

    // Cachear en frontend: guardar el archivo y crear URL local para vista previa
    // La imagen solo se subirá a storage cuando se generen las boletas correctamente
    setCachedImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }
    setCachedImageFile(null)
    setImagePreview(null)
    setFormData(prev => ({
      ...prev,
      imagen_url: ''
    }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handlePreview = () => {
    if (!selectedRifa) {
      setError('Por favor selecciona un proyecto para previsualizar')
      return
    }
    if (!hasImage) {
      setError('Por favor carga una imagen de plantilla antes de previsualizar')
      return
    }
    setShowPreview(true)
  }

  if (userRole && userRole !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-lg max-w-md">
          <h2 className="text-lg font-medium mb-2">Acceso Restringido</h2>
          <p>Solo el super admin puede crear boletas.</p>
          <button
            onClick={() => router.push('/boletas')}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            Volver a Boletas
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/boletas/ver')}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                ← Boletas
              </button>
              <h1 className="text-2xl font-light text-neutral-100">Crear Boletas</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-medium text-slate-900 mb-4">Información del proyecto</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          <form onSubmit={handleCrearBoletas} className="space-y-6">
            <div>
              <label htmlFor="rifa" className="block text-sm font-bold text-black mb-2">
                Seleccionar Proyecto activo
              </label>
              <select
                id="rifa"
                value={selectedRifa}
                onChange={(e) => setSelectedRifa(e.target.value)}
                className="w-full px-4 py-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-black bg-white"
                disabled={creating}
              >
                <option value="">Selecciona una proyecto activo...</option>
                {rifas.map((rifa) => (
                  <option key={rifa.id} value={rifa.id}>
                    {rifa.nombre} - {rifa.premio || rifa.premio_principal} (Estado: {rifa.estado})
                  </option>
                ))}
              </select>
              {rifas.length === 0 && (
                <p className="mt-2 text-sm text-slate-500">
                  No hay proyectos en borrador, activos o pausados disponibles para generar boletas
                </p>
              )}
            </div>

            {/* Configuración de Boletas */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">Configuración de Boletas</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="qr_base_url" className="block text-sm font-bold text-black mb-2">
                    URL de Verificación (QR) *
                  </label>
                  <input
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    id="qr_base_url"
                    value={formData.qr_base_url}
                    onChange={(e) => handleInputChange('qr_base_url', e.target.value)}
                    placeholder="https://rifasupertoyota.com.co/verificar/"
                    className="w-full px-4 py-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-black bg-white"
                    disabled={creating}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    URL donde el cliente verá el estado de su boleta al escanear el QR (ej. rifasupertoyota.com.co).
                  </p>
                </div>

                <div>
                  <label htmlFor="imagen_file" className="block text-sm font-bold text-black mb-2">
                    Imagen de Plantilla *
                  </label>
                  
                  {!hasImage ? (
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="imagen_file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageUpload}
                        className="w-full px-4 py-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-black bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        disabled={creating || uploadingImage}
                      />
                      <p className="text-xs text-slate-500">
                        Formatos permitidos: JPG, PNG, WEBP. Tamaño máximo: 5MB
                      </p>
                      <p className="text-xs text-slate-500">
                        La imagen se guardará en el servidor solo al generar las boletas correctamente
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative border border-slate-300 rounded-lg p-4 bg-slate-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">Imagen cargada:</span>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                            disabled={creating || uploadingImage}
                          >
                            Eliminar
                          </button>
                        </div>
                        {(imagePreview || formData.imagen_url) && (
                          <div className="mt-2">
                            <img
                              src={imagePreview || (typeof formData.imagen_url === 'string' ? (getStorageImageUrl(formData.imagen_url) ?? formData.imagen_url) : formData.imagen_url)}
                              alt="Preview"
                              className="max-w-full max-h-48 rounded border border-slate-200"
                            />
                          </div>
                        )}
                        <p className="mt-2 text-xs text-slate-500">
                          {cachedImageFile
                            ? `Imagen en caché (${cachedImageFile.name}). Se guardará al generar boletas.`
                            : formData.imagen_url}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        disabled={creating || uploadingImage}
                      >
                        Cambiar imagen
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={creating || uploadingImage}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Información de Generación</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Proyecto seleccionado:</strong> {rifas.find(r => r.id === selectedRifa)?.nombre}</p>
                <p><strong>Premio:</strong> {rifas.find(r => r.id === selectedRifa)?.premio || rifas.find(r => r.id === selectedRifa)?.premio_principal}</p>
                <p><strong>Total de boletas:</strong> {rifas.find(r => r.id === selectedRifa)?.total_boletas || 'N/A'}</p>
                <p><strong>Estado:</strong> {rifas.find(r => r.id === selectedRifa)?.estado}</p>
                {esDobleOportunidad && (
                  <p><strong>Tipo:</strong> Doble oportunidad (2 números por boleta)</p>
                )}
              </div>
              {esDobleOportunidad && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-2">Cómo definir los 2 números de cada boleta</label>
                    <select
                      value={formData.modo_pareo || 'manual'}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          modo_pareo: e.target.value as 'aleatorio' | 'manual',
                        }))
                      }
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white text-slate-900"
                    >
                      <option value="manual">Elegir yo los 2 números de cada boleta</option>
                      <option value="aleatorio">Aleatorio (el sistema arma los pares)</option>
                    </select>
                  </div>
                  {formData.modo_pareo === 'manual' && (
                    <div className="space-y-3 rounded-lg border border-blue-200 bg-white p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEntradaManual('formulario')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                            entradaManual === 'formulario' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          Elegir números
                        </button>
                        <button
                          type="button"
                          onClick={() => setEntradaManual('csv')}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                            entradaManual === 'csv' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          Pegar lista CSV
                        </button>
                      </div>

                      {entradaManual === 'formulario' ? (
                        <>
                          <p className="text-xs text-blue-800">
                            Cada boleta lleva 2 números. Agrega el par: número A + número B.
                            Progreso: <strong>{paresCompletos.length}</strong> / {totalBoletasEsperado}
                          </p>
                          <div className="flex flex-wrap items-end gap-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Número 1</label>
                              <input
                                type="number"
                                min={0}
                                max={9999}
                                value={num1Draft}
                                onChange={(e) => setNum1Draft(e.target.value)}
                                placeholder="2809"
                                className="w-28 px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                              />
                            </div>
                            <div className="pb-2 text-slate-400 font-bold">+</div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Número 2</label>
                              <input
                                type="number"
                                min={0}
                                max={9999}
                                value={num2Draft}
                                onChange={(e) => setNum2Draft(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarPar())}
                                placeholder="7633"
                                className="w-28 px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={agregarPar}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                            >
                              Agregar par
                            </button>
                          </div>
                          {parError && <p className="text-xs text-red-600">{parError}</p>}

                          {paresCompletos.length > 0 && (
                            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                              {paresCompletos.map(([a, b], idx) => (
                                <div key={`${a}-${b}-${idx}`} className="flex items-center justify-between px-3 py-2 text-sm">
                                  <span className="font-mono text-slate-900">
                                    Boleta {idx + 1}: <strong>#{String(a).padStart(4, '0')}</strong>
                                    {' · '}
                                    <strong>#{String(b).padStart(4, '0')}</strong>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => quitarPar(idx)}
                                    className="text-xs text-red-600 hover:text-red-800"
                                  >
                                    Quitar
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-blue-900 mb-2">
                            Pares (uno por línea: 2809,7633)
                          </label>
                          <textarea
                            value={paresCsv}
                            onChange={(e) => sincronizarParesDesdeCsv(e.target.value)}
                            rows={8}
                            placeholder={'2809,7633\n0042,9911\n...'}
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg font-mono text-sm text-slate-900 bg-white"
                          />
                          <p className="mt-1 text-xs text-blue-700">
                            Debes ingresar exactamente {totalBoletasEsperado} líneas. Números del 0 al 9999, sin repetir.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>Nota:</strong> El sistema generará automáticamente todas las boletas para este proyecto según la configuración.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={handlePreview}
                className="px-6 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                disabled={creating || uploadingImage || !selectedRifa || !hasImage}
              >
                Vista Previa
              </button>
              
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => router.push('/boletas')}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={creating || uploadingImage || !selectedRifa || !formData.qr_base_url || !hasImage || !formData.diseño_template}
                >
                  {creating ? 'Generando...' : 'Generar Boletas'}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-medium text-slate-900 mb-3">Información Importante</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p>• Las boletas se generarán automáticamente según la configuración proporcionada</p>
            <p>• Todas las boletas nuevas tendrán estado "DISPONIBLE"</p>
            <p>• Cada boleta tendrá un código QR único que apuntará a la URL configurada</p>
            <p>• Cada boleta tendrá un código de barras único (formato: BOLETA-[rifa_id]-0001)</p>
            <p>• La imagen de plantilla se usará como fondo para todas las boletas</p>
            <p>• Solo puedes generar boletas una vez por proyecto</p>
            <p>• Puedes generar boletas en borrador, activo o pausado (no en terminado)</p>
          </div>
        </div>

        {/* Preview Modal */}
        {showPreview && selectedRifa && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center">
                <h2 className="text-xl font-medium text-slate-900">Vista Previa de Boleta</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-4">
                <BoletaPreview
                  qrBaseUrl={formData.qr_base_url}
                  imagenUrl={imagePreview || (formData.imagen_url ? (getStorageImageUrl(formData.imagen_url) ?? formData.imagen_url) : '')}
                  diseñoTemplate={formData.diseño_template}
                  rifaId={selectedRifa}
                  boletaNumero={
                    esDobleOportunidad && paresCompletos[0]
                      ? paresCompletos[0][0]
                      : esDobleOportunidad
                        ? 2809
                        : 1
                  }
                  numeros={
                    esDobleOportunidad
                      ? (paresCompletos[0] || [2809, 7633])
                      : undefined
                  }
                  barcode={`BOLETA-${selectedRifa}-0001`}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
