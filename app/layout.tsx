import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: {
    default: "Care&",
    template: "%s · Care&",
  },
  description: "AI 기반 통합돌봄 서비스 - 보호자·인력 회원 앱",
  applicationName: "Care&",
  manifest: "/app/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Care&",
  },
  icons: {
    icon: [
      { url: "/app/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/app/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/app/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#FF5A4D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
