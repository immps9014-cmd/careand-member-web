"use client";

interface MapPreviewProps {
  lat: number;
  lng: number;
  height?: number;
}

/**
 * 위치 미리보기 지도.
 * 현재 OSM 임베드(키 불필요). 카카오맵 Local API 승인 후 카카오맵 SDK로 교체 예정.
 */
export function MapPreview({ lat, lng, height = 240 }: MapPreviewProps) {
  const d = 0.0045;
  const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  return (
    <div className="rounded-lg overflow-hidden border border-warm-200 bg-warm-100" style={{ height }}>
      <iframe
        title="위치 미리보기"
        src={src}
        className="w-full h-full"
        style={{ border: 0 }}
        loading="lazy"
      />
    </div>
  );
}
