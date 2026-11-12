import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PausaGuard from "@/components/PausaGuard";
import ModuleShell from "@/components/layout/ModuleShell";
import PwaNativeEffects from "@/components/pwa/PwaNativeEffects";
import PwaUpdatePrompt from "@/components/pwa/PwaUpdatePrompt";
import { BRAND_NAME, BRAND_SHORT, BRAND_THEME_COLOR } from "@/config/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${BRAND_NAME} | Panel de Administración`,
  description: `${BRAND_SHORT} — gestión de rifas, ventas y sorteos`,
  applicationName: BRAND_NAME,
  manifest: "/manifest.webmanifest",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BRAND_NAME,
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: BRAND_THEME_COLOR,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen min-h-dvh bg-[#f8fafc]`}
      >
        <PwaNativeEffects />
        <PwaUpdatePrompt />
        <PausaGuard>
          <ModuleShell>{children}</ModuleShell>
        </PausaGuard>
      </body>
    </html>
  );
}
