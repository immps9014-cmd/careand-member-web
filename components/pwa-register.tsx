"use client";

import { useEffect } from "react";

/**
 * Care& 보호자 PWA service worker 등록.
 * basePath=/app 이므로 SW 파일·scope 모두 /app/ 기준.
 */
/** 안드로이드 크롬의 설치 제안 이벤트 — 설치 안내 화면의 「앱 설치」 버튼이 꺼내 쓴다 */
type InstallEvt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferredInstall: InstallEvt | null = null;
export function takeInstallPrompt(): InstallEvt | null {
  const e = deferredInstall;
  deferredInstall = null;
  return e;
}
export function hasInstallPrompt(): boolean {
  return deferredInstall !== null;
}
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();   // 브라우저 기본 미니 배너 대신 우리 안내 화면에서 띄운다
    deferredInstall = e as InstallEvt;
    window.dispatchEvent(new Event("careand:installable"));
  });
}

export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/app/sw.js", { scope: "/app/" }).catch(() => {
        /* 등록 실패해도 앱 동작엔 영향 없음(폴백) */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
