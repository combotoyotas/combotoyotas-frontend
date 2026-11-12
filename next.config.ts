import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// Si tu API está en otro puerto (ej. 4000), define NEXT_PUBLIC_API_URL en .env.local
const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
const backendOrigin = apiBase.replace(/\/api\/?$/, "");

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  scope: "/",
  reloadOnOnline: true,
  // Sin modo offline: no cachear navegación ni start URL
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  cacheStartUrl: false,
  workboxOptions: {
    // Esperar confirmación del usuario (PwaUpdatePrompt) antes de activar el SW nuevo
    skipWaiting: false,
    clientsClaim: true,
    // API y mutaciones siempre por red — nunca datos en caché
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.method !== "GET",
        handler: "NetworkOnly",
      },
      {
        urlPattern: ({ url, request }) => {
          if (request.method !== "GET") return false;
          if (url.pathname.startsWith("/api")) return true;
          if (url.pathname.startsWith("/storage")) return true;
          if (url.hostname.includes("railway.app")) return true;
          return false;
        },
        handler: "NetworkOnly",
      },
    ],
  },
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Proxy /storage/* al backend para evitar ERR_BLOCKED_BY_RESPONSE.NotSameOrigin
      {
        source: "/storage/:path*",
        destination: `${backendOrigin}/storage/:path*`,
      },
    ];
  },
};

export default withPWA(nextConfig);
