'use client'

import { useRef, useState } from 'react'
import BoletaTicket from '@/components/BoletaTicket'
import { getStorageImageUrl } from '@/lib/storageImageUrl'

type Props = {
  rifaId: string
  rifaTitulo: string
  dobleOportunidad?: boolean
  imagenUrl: string
  onImagenUrlChange: (url: string) => void
  previewBlobUrl: string | null
  onPreviewBlobUrlChange: (url: string | null) => void
  pendingFile: File | null
  onPendingFileChange: (file: File | null) => void
  disabled?: boolean
}

function resolvePreviewSrc(imagenUrl: string, previewBlobUrl: string | null): string {
  if (previewBlobUrl) return previewBlobUrl
  if (!imagenUrl.trim()) return ''
  return getStorageImageUrl(imagenUrl) ?? imagenUrl
}

export default function RifaPlantillaBoletaEditor({
  rifaId,
  rifaTitulo,
  dobleOportunidad,
  imagenUrl,
  onImagenUrlChange,
  previewBlobUrl,
  onPreviewBlobUrlChange,
  pendingFile,
  onPendingFileChange,
  disabled,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showVistaPrevia, setShowVistaPrevia] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const hasImage = Boolean(pendingFile || imagenUrl.trim() || previewBlobUrl)
  const previewSrc = resolvePreviewSrc(imagenUrl, previewBlobUrl)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setLocalError('Solo JPG, PNG o WEBP')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setLocalError('Máximo 5MB')
      return
    }

    setLocalError(null)
    if (previewBlobUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewBlobUrl)
    }
    onPendingFileChange(file)
    onPreviewBlobUrlChange(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    if (previewBlobUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewBlobUrl)
    }
    onPendingFileChange(null)
    onPreviewBlobUrlChange(null)
    onImagenUrlChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const qrPreview = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
    `https://combotoyotas.com/verificar/preview-${rifaId}`
  )}`

  return (
    <div className="md:col-span-2 border border-slate-200 rounded-xl p-4 sm:p-5 bg-slate-50/50 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Imagen de la boleta</h3>
        <p className="text-xs text-slate-600 mt-1">
          Plantilla que ven clientes y vendedores. Al guardar, se actualiza en el proyecto y en todas las boletas ya generadas.
        </p>
      </div>

      {localError && (
        <p className="text-sm text-red-600">{localError}</p>
      )}

      {!hasImage ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleImageUpload}
          disabled={disabled}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:font-medium"
        />
      ) : (
        <div className="space-y-3">
          {previewSrc && (
            <img
              src={previewSrc}
              alt="Plantilla actual"
              className="max-w-full max-h-40 rounded-lg border border-slate-200 object-contain bg-white"
            />
          )}
          <p className="text-xs text-slate-500 break-all">
            {pendingFile ? `Nueva imagen: ${pendingFile.name} (se subirá al guardar)` : imagenUrl || 'Sin URL'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
            >
              Cambiar imagen
            </button>
            <button
              type="button"
              onClick={() => setShowVistaPrevia(true)}
              disabled={disabled || !previewSrc}
              className="text-sm px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Vista previa boleta
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={disabled}
              className="text-sm px-3 py-1.5 rounded-lg text-red-700 border border-red-200 hover:bg-red-50"
            >
              Quitar
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleImageUpload}
            className="hidden"
            disabled={disabled}
          />
        </div>
      )}

      {showVistaPrevia && previewSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-white">
              <h4 className="font-semibold text-slate-900">Vista previa de boleta</h4>
              <button
                type="button"
                onClick={() => setShowVistaPrevia(false)}
                className="text-slate-400 hover:text-slate-700 text-xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="p-4 flex justify-center">
              <BoletaTicket
                qrUrl={qrPreview}
                barcode={`R${rifaId.slice(0, 4)}-0001`}
                numero={dobleOportunidad ? 2738 : 1}
                numeros={dobleOportunidad ? [2738, 5545] : undefined}
                imagenUrl={previewSrc}
                rifaNombre={rifaTitulo}
                estado="DISPONIBLE"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}