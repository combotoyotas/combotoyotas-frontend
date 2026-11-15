'use client'

import VentasMobileActionBar from '@/components/ventas/VentasMobileActionBar'

type Props = {
  visible: boolean
  label: string
  onContinue: () => void
  disabled?: boolean
}

/** Un solo botón “Continuar” flotante (paso boletas). */
export default function VentasMobileContinueFab({
  visible,
  label,
  onContinue,
  disabled,
}: Props) {
  return (
    <VentasMobileActionBar
      visible={visible}
      ariaLabel="Continuar venta"
      actions={[
        {
          id: 'continue',
          label: (
            <span className="inline-flex items-center gap-2">
              {label}
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          ),
          onClick: onContinue,
          disabled,
          variant: 'primary',
        },
      ]}
    />
  )
}