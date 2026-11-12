'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { API_BASE_URL } from '@/config/api'
import { TokenManager } from '@/utils/auth'
import InstalarAppButton from '@/components/pwa/InstalarAppButton'
import BrandLogo from '@/components/brand/BrandLogo'
import { BRAND_NAME, BRAND_TAGLINE } from '@/config/brand'

interface LoginFormData {
  email: string
  password: string
}

interface LoginResponse {
  success: boolean
  message: string
  data?: {
    token: string
    user: {
      id: string
      email: string
      nombre: string
      rol: string
    }
  }
  error?: string
  details?: Array<{
    field: string
    message: string
  }>
}

const ROL_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrador',
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
}

const ROL_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  SUPER_ADMIN: { bg: 'from-purple-700 to-indigo-900', border: 'border-purple-400', text: 'text-purple-100', badge: 'bg-purple-500/30 text-purple-100 border-purple-400' },
  ADMIN:       { bg: 'from-indigo-700 to-slate-900',  border: 'border-indigo-400',  text: 'text-indigo-100',  badge: 'bg-indigo-500/30 text-indigo-100 border-indigo-400'  },
  VENDEDOR:    { bg: 'from-emerald-700 to-teal-900',  border: 'border-emerald-400', text: 'text-emerald-100', badge: 'bg-emerald-500/30 text-emerald-100 border-emerald-400' },
}

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [welcomeUser, setWelcomeUser] = useState<{ nombre: string; rol: string; email: string } | null>(null)
  const [countdown, setCountdown] = useState(3)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    const tryExistingSession = async () => {
      const user = TokenManager.getUser()
      if (!user) return

      const ok = await TokenManager.validateSessionWithBackend(API_BASE_URL)
      if (cancelled || !ok) return

      router.replace('/dashboard')
    }

    void tryExistingSession()
    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (!welcomeUser) return
    if (countdown <= 0) {
      router.push('/dashboard')
      return
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [welcomeUser, countdown, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data: LoginResponse = await response.json()

      if (data.success) {
        TokenManager.saveAuthData(data.data!.token, data.data!.user)
        setWelcomeUser(data.data!.user)
        setCountdown(3)
      } else if (data.error === 'Validation Error' && data.details) {
        setError(data.details.map((detail) => detail.message).join(', '))
      } else {
        setError(data.message || 'Error al iniciar sesión')
      }
    } catch {
      setError('Error de conexión. Por favor intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  if (welcomeUser) {
    const rol = welcomeUser.rol || 'VENDEDOR'
    const colors = ROL_COLORS[rol] || ROL_COLORS.ADMIN
    const rolLabel = ROL_LABELS[rol] || rol
    const iniciales = welcomeUser.nombre
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()

    return (
      <div className={`min-h-screen min-h-dvh flex flex-col items-center justify-center bg-gradient-to-br ${colors.bg} p-6 relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-lg w-full">
          <div className={`w-36 h-36 rounded-full border-4 ${colors.border} bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-2xl`}>
            <span className="text-5xl font-black text-white tracking-tight">{iniciales}</span>
          </div>
          <div>
            <p className={`text-lg font-medium ${colors.text} opacity-80 mb-1 uppercase tracking-widest`}>
              ¡Bienvenido de nuevo!
            </p>
            <h1 className="text-5xl font-black text-white leading-tight mb-3">
              {welcomeUser.nombre.toUpperCase()}
            </h1>
            <span className={`inline-block px-5 py-1.5 rounded-full border text-sm font-bold uppercase tracking-widest ${colors.badge}`}>
              {rolLabel}
            </span>
            <p className={`mt-3 text-sm ${colors.text} opacity-60`}>{welcomeUser.email}</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full border-4 border-white/30 flex items-center justify-center">
              <span className="text-3xl font-black text-white">{countdown}</span>
            </div>
            <p className={`text-sm ${colors.text} opacity-70`}>Entrando al sistema...</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-1 px-8 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold rounded-xl backdrop-blur-sm transition-all text-sm min-h-[44px]"
            >
              Entrar ahora →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen min-h-dvh flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-300 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-400 rounded-full blur-2xl" />
        </div>
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <div className="mb-6 max-w-sm">
              <BrandLogo height={120} priority className="drop-shadow-2xl" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-3 sr-only">{BRAND_NAME}</h2>
            <p className="text-indigo-200 text-lg leading-relaxed max-w-md">{BRAND_TAGLINE}</p>
          </div>
          <div className="space-y-4 mt-4">
            {['Gestión de ventas en tiempo real', 'Control de boletas y abonos', 'Reportes y analítica avanzada'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-indigo-200">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full max-w-[420px] animate-fade-in">
          <div className="lg:hidden text-center mb-8">
            <BrandLogo height={72} priority className="mx-auto" />
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 sm:p-10 border border-slate-100">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-slate-900 mb-1">Iniciar sesión</h1>
              <p className="text-slate-500 text-sm">Ingresa tus credenciales para acceder al sistema</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder-slate-400 bg-slate-50/50 hover:border-slate-300 text-sm min-h-[44px]"
                  placeholder="tu@correo.com"
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder-slate-400 bg-slate-50/50 hover:border-slate-300 text-sm min-h-[44px]"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm animate-slide-down">
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-xl font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/30 active:scale-[0.98] min-h-[44px]"
              >
                {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </button>
            </form>

            <InstalarAppButton />

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                {BRAND_NAME} © {new Date().getFullYear()} · Todos los derechos reservados
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
