'use client'

import { useRef, useState } from 'react'

const fmt = (n: number) => String(n).padStart(4, '0')

type Props = {
  titulo: string
  subtitulo?: string
  color: 'violet' | 'teal'
  numeros: number[]
  onChange: (nums: number[]) => void
  onAgregarNumero: (n: number) => Promise<{ ok: boolean; mensaje?: string }>
  disabled?: boolean
}

export default function NumeroCarritoTrueque({
  titulo,
  subtitulo,
  color,
  numeros,
  onChange,
  onAgregarNumero,
  disabled,
}: Props) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [agregando, setAgregando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const ring = color === 'violet' ? 'focus:ring-violet-500 border-violet-200' : 'focus:ring-teal-500 border-teal-200'
  const chip =
    color === 'violet'
      ? 'bg-violet-100 text-violet-900 border-violet-200'
      : 'bg-teal-100 text-teal-900 border-teal-200'

  const intentarAgregar = async () => {
    const t = input.trim()
    if (!/^\d{4}$/.test(t)) {
      setError('Escribe exactamente 4 cifras (ej. 0123)')
      return
    }
    const n = Number(t)
    if (numeros.includes(n)) {
      setError('Ya está en el carrito')
      return
    }
    setAgregando(true)
    setError('')
    try {
      const r = await onAgregarNumero(n)
      if (!r.ok) {
        setError(r.mensaje || 'No se puede agregar')
        return
      }
      onChange([...numeros, n])
      setInput('')
      inputRef.current?.focus()
    } finally {
      setAgregando(false)
    }
  }

  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${ring.split(' ')[2]}`}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">{titulo}</h3>
        {subtitulo && <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>}
      </div>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="0000"
          value={input}
          disabled={disabled || agregando}
          onChange={(e) => {
            setInput(e.target.value.replace(/\D/g, '').slice(0, 4))
            setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void intentarAgregar()
            }
          }}
          className={`flex-1 min-h-[44px] px-3 rounded-xl border text-sm font-mono tracking-widest ${ring} focus:outline-none focus:ring-2`}
        />
        <button
          type="button"
          disabled={disabled || agregando}
          onClick={() => void intentarAgregar()}
          className={`shrink-0 px-4 rounded-xl text-sm font-medium text-white min-h-[44px] disabled:opacity-50 ${
            color === 'violet' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >
          {agregando ? '…' : '+'}
        </button>
      </div>
      {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5 min-h-[36px]">
        {numeros.length === 0 ? (
          <span className="text-xs text-slate-400">Sin números — escribe y Enter</span>
        ) : (
          numeros.map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              onClick={() => onChange(numeros.filter((x) => x !== n))}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-mono ${chip} hover:opacity-80`}
              title="Quitar"
            >
              {fmt(n)}
              <span className="opacity-60">×</span>
            </button>
          ))
        )}
      </div>
      {numeros.length > 0 && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([])}
          className="mt-2 text-xs text-slate-500 hover:text-slate-800 underline"
        >
          Vaciar carrito
        </button>
      )}
    </div>
  )
}
