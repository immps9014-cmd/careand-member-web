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
    statusBarStyle: "default",   // 상태바 아래에서 화면 시작(black-translucent 로 바꾸면 모든 상단바에 --safe-top 필요)
    title: "케어앤",
  },
  formatDetection: { telephone: false },   // 날짜·금액 숫자가 전화 링크로 바뀌지 않게(아이폰 사파리)
  icons: {
    icon: [
      { url: "/app/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/app/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/app/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#D5603E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",   // 아이폰 홈 인디케이터 영역까지 — 하단 탭바는 --safe-bot 만큼 띄움
  // 확대 허용 — 고령 사용자가 손가락으로 키워 볼 수 있어야 한다(WCAG 1.4.4). 입력칸은 16px 라 포커스 자동확대도 없다.
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
