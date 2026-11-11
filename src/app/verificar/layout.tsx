import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verificar Boleta | Rifa Super Toyota',
  description: 'Verifica la autenticidad de tu boleta escaneando el código QR.',
}

export default function VerificarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
