'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ClientesPasados from '@/components/ClientesPasados'

const ROLES_PERMITIDOS = ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR']

export default function ClientesPasadosPage() {
  const [authorized, setAuthorized] = useState(false)
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
      const rol = user.rol?.toUpperCase()
      if (ROLES_PERMITIDOS.includes(rol || '')) {
        setAuthorized(true)
      } else {
        router.push('/dashboard')
      }
    } catch {
      router.push('/login')
    }
  }, [router])

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl">
        <ClientesPasados />
      </div>
    </div>
  )
}
