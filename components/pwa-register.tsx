"use client";

import { useEffect } from "react";

/**
 * Care& 보호자 PWA service worker 등록.
 * basePath=/app 이므로 SW 파일·scope 모두 /app/ 기준.
 */
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
