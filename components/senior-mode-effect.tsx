"use client";

import { useEffect } from "react";
import { useSeniorMode } from "@/lib/senior-mode";

/**
 * 시니어 모드를 <html>에 반영. zoom 으로 px 타이포까지 균일 확대(Chromium은
 * 레이아웃 뷰포트를 재계산해 가로 스크롤 없이 리플로우), data-tone 으로 고대비 CSS 적용.
 */
export function SeniorModeEffect() {
  const on = useSeniorMode((s) => s.on);
  useEffect(() => {
    const el = document.documentElement;
    if (on) {
      el.dataset.tone = "senior";
      el.style.zoom = "1.2";
    } else {
      delete el.dataset.tone;
      el.style.zoom = "";
    }
  }, [on]);
  return null;
}
