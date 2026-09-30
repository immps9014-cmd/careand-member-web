"use client";

import { useEffect, useState } from "react";
import { useSeniorMode } from "@/lib/senior-mode";

/**
 * 「글자 크게」 토글 — 로그인·가입처럼 마이페이지에 가기 전 화면에서도 켤 수 있게.
 * 상태는 마이페이지 「시니어 모드」와 같은 저장소(careand-senior-mode)를 쓴다.
 */
export function SeniorModeToggle({ className = "" }: { className?: string }) {
  const { on, toggle } = useSeniorMode();
  // persist 복원 전 서버 렌더와 어긋나지 않게 마운트 후에만 상태를 그린다
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const active = mounted && on;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      className={
        "inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-bold transition-colors " +
        (active ? "border-brand-500 bg-brand-500 text-white" : "border-warm-300 bg-white text-warm-700") +
        (className ? " " + className : "")
      }
    >
      <span aria-hidden className="text-base leading-none">가</span>
      {active ? "글자 크게 켜짐" : "글자 크게"}
    </button>
  );
}
