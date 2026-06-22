"use client";

import { useEffect, useRef, useState } from "react";

interface MapPreviewProps {
  lat: number;
  lng: number;
  height?: number;
}

const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

/**
 * 위치 미리보기 지도.
 * NEXT_PUBLIC_KAKAO_JS_KEY가 설정되면 카카오맵 SDK로 렌더,
 * 미설정(또는 SDK 로드 실패) 시 OSM 임베드로 폴백(키 불필요).
 * → 키가 들어오는 순간 재배포만으로 카카오맵으로 자동 전환된다.
 */

// 카카오맵 SDK는 앱 전체에서 1회만 로드(중복 <script> 방지)
let kakaoSdkPromise: Promise<void> | null = null;
function loadKakaoSdk(appKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).kakao?.maps) return Promise.resolve();
  if (kakaoSdkPromise) return kakaoSdkPromise;
  kakaoSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.async = true;
    script.onload = () => (window as any).kakao.maps.load(() => resolve());
    script.onerror = () => {
      kakaoSdkPromise = null; // 실패 시 다음 시도 허용
      reject(new Error("kakao sdk load failed"));
    };
    document.head.appendChild(script);
  });
  return kakaoSdkPromise;
}

function OsmPreview({ lat, lng }: { lat: number; lng: number }) {
  const d = 0.0045;
  const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  return (
    <iframe
      title="위치 미리보기"
      src={src}
      className="w-full h-full"
      style={{ border: 0 }}
      loading="lazy"
    />
  );
}

export function MapPreview({ lat, lng, height = 240 }: MapPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [kakaoFailed, setKakaoFailed] = useState(false);
  const useKakao = Boolean(KAKAO_JS_KEY) && !kakaoFailed;

  useEffect(() => {
    if (!useKakao || !containerRef.current) return;
    let cancelled = false;
    loadKakaoSdk(KAKAO_JS_KEY as string)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const kakao = (window as any).kakao;
        const center = new kakao.maps.LatLng(lat, lng);
        const map = new kakao.maps.Map(containerRef.current, { center, level: 3 });
        new kakao.maps.Marker({ position: center, map });
      })
      .catch(() => {
        if (!cancelled) setKakaoFailed(true); // 로드 실패 → OSM 폴백
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, useKakao]);

  return (
    <div
      className="rounded-lg overflow-hidden border border-warm-200 bg-warm-100"
      style={{ height }}
    >
      {useKakao ? (
        <div ref={containerRef} className="w-full h-full" />
      ) : (
        <OsmPreview lat={lat} lng={lng} />
      )}
    </div>
  );
}
