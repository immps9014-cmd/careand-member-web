"use client";

import { Navigation } from "lucide-react";

/**
 * 방문 장소 길찾기 (기능 35, 2026-09-29) — 카카오맵 길찾기 링크(API 키 불필요, 휴대폰이면 카카오맵 앱으로 열림).
 * 좌표는 예정·진행 중 세션에만 내려온다.
 */
export function DirectionsLink({ place }: { place?: { name: string; lat: number; lng: number } | null }) {
  if (!place) return null;
  const url = `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.lat},${place.lng}`;
  return (
    <a href={url} target="_blank" rel="noreferrer"
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
      <Navigation className="h-3.5 w-3.5" />
      <span className="max-w-[14rem] truncate">길찾기 · {place.name}</span>
    </a>
  );
}
