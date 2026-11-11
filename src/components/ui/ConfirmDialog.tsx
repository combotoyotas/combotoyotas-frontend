'use client'

import { useEffect, type ReactNode } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message?: string
  children?: ReactNode
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info' | 'success'
  wide?: boolean
  hideConfirm?: boolean
  /** Solo muestra el botón de confirmación (p. ej. modal de éxito). */
  confirmOnly?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  children,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning',
  wide = false,
  hideConfirm = false,
  confirmOnly = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: '⚠️',
          confirmBg: 'bg-red-600 hover:bg-red-700',
          confirmBorder: 'border-red-200'
        }
      case 'warning':
        return {
          icon: '⚡',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
          confirmBorder: 'border-yellow-200'
        }
      case 'info':
        return {
          icon: 'ℹ️',
          confirmBg: 'bg-blue-600 hover:bg-blue-700',
          confirmBorder: 'border-blue-200'
        }
      case 'success':
        return {
          icon: '✅',
          confirmBg: 'bg-emerald-600 hover:bg-emerald-700',
          confirmBorder: 'border-emerald-200'
        }
      default:
        return {
          icon: '⚡',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
          confirmBorder: 'border-yellow-200'
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full transform transition-all max-h-[90vh] overflow-hidden flex flex-col ${
          wide ? 'max-w-lg' : 'max-w-md'
        }`}
      >
        <div className="p-6 overflow-y-auto">
          <div className="flex items-center mb-4">
            <div className={`text-2xl mr-3`}>{styles.icon}</div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          </div>

          {message ? (
            <p className="text-slate-600 mb-4 leading-relaxed whitespace-pre-line text-sm">{message}</p>
          ) : null}
          {children ? <div className="mb-6">{children}</div> : !message ? null : <div className="mb-2" />}

          <div
            className={`flex gap-3 pt-2 border-t border-slate-100 ${
              confirmOnly ? 'justify-center' : 'justify-end'
            }`}
          >
            {!confirmOnly && (
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                {cancelText}
              </button>
            )}
            {!hideConfirm && (
              <button
                onClick={onConfirm}
                className={`px-4 py-2 text-white rounded-lg transition-colors font-medium ${styles.confirmBg} ${
                  confirmOnly ? 'min-w-[140px]' : ''
                }`}
              >
                {confirmText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
