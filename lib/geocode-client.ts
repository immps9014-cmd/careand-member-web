export interface GeoResult {
  lat: number;
  lng: number;
  display?: string;
}

/**
 * 브라우저측 지오코딩 (Nominatim/OSM, 키 불필요) — 데모/미리보기용.
 * 운영 좌표 저장은 서버 GeocodingService(Kakao→VWorld→Nominatim)가 담당.
 */
export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  if (!address.trim()) return null;
  const qs = new URLSearchParams({
    format: "json",
    limit: "1",
    countrycodes: "kr",
    "accept-language": "ko",
    q: address,
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${qs.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
}
