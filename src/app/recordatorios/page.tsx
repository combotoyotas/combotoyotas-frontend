'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import RecordatoriosList from '@/components/RecordatoriosList'

export default function RecordatoriosPage() {
  const router = useRouter()
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    setOk(true)
  }, [router])

  if (!ok) {
    return (
      <div className="px-4 py-16 flex justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          Cargando...
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      <header className="mb-6 pb-4 border-b border-slate-200/80">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Cobranza</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1 text-slate-900">
          Recordatorios
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Sigue pagos pendientes y contacta por WhatsApp.
        </p>
      </header>
      <RecordatoriosList />
    </div>
  )
}
