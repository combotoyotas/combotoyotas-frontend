# combotoyotas-frontend

Panel administrativo del sistema de rifas (Next.js 16). Despliegue recomendado en **Netlify** con el plugin oficial de Next.js.

## Requisitos

- Node.js **≥ 20**
- Backend API desplegado y accesible por HTTPS

## Desarrollo local

```bash
npm install
cp .env.example .env.local
# Edita .env.local con tu API local
npm run dev
```

Abre [http://localhost:3001](http://localhost:3001).

## Desplegar en Netlify

1. Conecta el repositorio [combotoyotas/combotoyotas-frontend](https://github.com/combotoyotas/combotoyotas-frontend).
2. **Build command:** `npm run build` (ya está en `netlify.toml`).
3. **Publish directory:** déjalo **vacío** (el plugin `@netlify/plugin-nextjs` lo gestiona).
4. **Node version:** 20 (definido en `netlify.toml`).
5. Configura las variables de entorno (tabla abajo).
6. En el backend, añade el dominio Netlify a `CORS_ORIGINS`, por ejemplo:  
   `https://tu-sitio.netlify.app,https://panel.tudominio.com`

### Variables de entorno (Netlify)

| Variable | Obligatoria | Ejemplo | Descripción |
|----------|-------------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Sí | `https://api.combotoyotas.com/api` | Base del backend **con** `/api` |
| `NEXT_PUBLIC_WS_URL` | Recomendada | `wss://api.combotoyotas.com` | WebSocket (mismo host que la API, sin `/api`) |
| `NEXT_PUBLIC_PUBLIC_API_KEY` | Sí | (igual que `PUBLIC_API_KEY` del backend) | Clave para rutas públicas que usa el panel |

Opcionales (Netlify las suele definir solo):

| Variable | Valor típico |
|----------|----------------|
| `NODE_ENV` | `production` (automático en Netlify) |
| `NEXT_TELEMETRY_DISABLED` | `1` (ya en `netlify.toml`) |

**No** subas `.env` ni `.env.local` al repositorio.

## Subir este código al repo nuevo

Desde la carpeta del frontend (no el monorepo completo):

```bash
cd rifas-frontend-main   # o la ruta donde copies este proyecto

git init
git add .
git commit -m "Panel Next.js — listo para Netlify"
git branch -M main
git remote add origin https://github.com/combotoyotas/combotoyotas-frontend.git
git push -u origin main
```

Si el remoto ya tiene un commit inicial con solo `README.md`, antes del push:

```bash
git pull origin main --rebase --allow-unrelated-histories
# resuelve conflictos en README si los hay, luego:
git push -u origin main
```

## Build

```bash
npm run build
npm run start
```

El proxy de imágenes `/storage/*` reescribe hacia el host derivado de `NEXT_PUBLIC_API_URL` (`next.config.ts`).
