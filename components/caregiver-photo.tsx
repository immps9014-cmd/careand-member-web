/** 돌봄전문가 프로필 사진(캐릭터 포함, 2026-10-11) — 서버 서명 링크(상대 경로). 없거나 못 읽으면 이름 첫 글자 */
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function CaregiverPhoto({ url, name, size = 40, className }: { url?: string | null; name?: string | null; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  const initial = (name ?? "").trim().charAt(0) || "?";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 font-extrabold text-brand-600", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {url && !broken
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
        : initial}
    </span>
  );
}
