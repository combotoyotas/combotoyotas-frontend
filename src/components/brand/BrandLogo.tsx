import Image from 'next/image'
import { BRAND_LOGO_SRC, BRAND_NAME } from '@/config/brand'

type BrandLogoProps = {
  className?: string
  /** Altura en px (ancho automático) */
  height?: number
  priority?: boolean
}

export default function BrandLogo({ className = '', height = 56, priority }: BrandLogoProps) {
  return (
    <Image
      src={BRAND_LOGO_SRC}
      alt={BRAND_NAME}
      width={Math.round(height * 1.1)}
      height={height}
      className={`h-auto w-auto object-contain ${className}`}
      style={{ maxHeight: height }}
      priority={priority}
    />
  )
}
