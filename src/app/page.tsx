'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TokenManager } from '@/utils/auth'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    if (TokenManager.isTokenValid()) {
      router.replace('/dashboard')
      return
    }
    router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen min-h-dvh bg-slate-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-slate-500 text-sm">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        Redirigiendo...
      </div>
    </div>
  )
}
