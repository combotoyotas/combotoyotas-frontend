import type { MetadataRoute } from 'next'
import {
  BRAND_BACKGROUND_COLOR,
  BRAND_NAME,
  BRAND_SHORT,
  BRAND_THEME_COLOR,
} from '@/config/brand'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND_NAME} — Panel`,
    short_name: BRAND_SHORT,
    description: `${BRAND_SHORT} — gestión de rifas, ventas y sorteos.`,
    start_url: '/login',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait-primary',
    background_color: BRAND_BACKGROUND_COLOR,
    theme_color: BRAND_THEME_COLOR,
    lang: 'es',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
