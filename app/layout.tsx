import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";
import { PwaRegister } from "@/components/pwa-register";
import { ChunkReloader } from "@/components/chunk-reloader";

export const metadata: Metadata = {
  title: {
    default: "Care&",
    template: "%s · Care&",
  },
  description: "AI 기반 통합돌봄 서비스 - 보호자·돌봄전문가 회원 앱",
  applicationName: "Care&",
  // manifest는 <head>에 raw <link>로 직접 주입 — Next가 자동으로 붙이는
  // crossorigin="use-credentials"가 일부 Android Chrome에서 manifest 인식을
  // 방해하는 이슈를 회피하기 위함.
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
  themeColor: "#4E8069",
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
      <head>
        <link rel="manifest" href="/app/manifest.webmanifest" />
      </head>
      <body>
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
        <PwaRegister />
        <ChunkReloader />
      </body>
    </html>
  );
}
