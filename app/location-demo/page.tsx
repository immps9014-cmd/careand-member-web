"use client";

import { useEffect, useState } from "react";
import { Search, MapPin, Navigation, Users, Loader2, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPreview } from "@/components/map-preview";
import { openPostcode } from "@/lib/postcode";
import { geocodeAddress } from "@/lib/geocode-client";

/**
 * 위치 기반 돌봄 매칭 — 주소 검색/좌표 변환 데모 화면 (카카오맵 Local API 심사용)
 * 공개 경로(/app/location-demo), 로그인 불필요.
 */
export default function LocationDemoPage() {
  const [zonecode, setZonecode] = useState("");
  const [address, setAddress] = useState("");
  const [detail, setDetail] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fullAddress = [address, detail.trim()].filter(Boolean).join(" ");

  // 프리필: /app/location-demo?addr=... 로 진입 시 자동 채움 (공유/심사용)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const addr = q.get("addr");
    if (!addr) return;
    setAddress(addr);
    const qlat = parseFloat(q.get("lat") || "");
    const qlng = parseFloat(q.get("lng") || "");
    if (!Number.isNaN(qlat) && !Number.isNaN(qlng)) {
      setCoords({ lat: qlat, lng: qlng });
      return;
    }
    setLoading(true);
    geocodeAddress(addr)
      .then((geo) => {
        if (geo) setCoords({ lat: geo.lat, lng: geo.lng });
        else setError("좌표를 찾지 못했습니다.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSearch() {
    setError("");
    try {
      const r = await openPostcode();
      if (!r) return;
      setAddress(r.address);
      setZonecode(r.zonecode);
      setCoords(null);
      setLoading(true);
      const geo = await geocodeAddress(r.address);
      if (geo) setCoords({ lat: geo.lat, lng: geo.lng });
      else setError("좌표를 찾지 못했습니다. 다른 주소로 시도해 주세요.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "주소 검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm-100 flex justify-center">
      <div className="w-full max-w-md bg-warm-50 min-h-screen flex flex-col shadow-xl">
        {/* 헤더 */}
        <header className="bg-white border-b border-warm-100 px-5 py-3.5 flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center font-extrabold text-white text-sm">
            C
          </div>
          <span className="font-extrabold text-warm-800">Care&amp;</span>
          <Badge variant="outline" className="ml-1">위치 기반 매칭</Badge>
        </header>

        <main className="flex-1 p-5">
          <h1 className="text-xl font-extrabold text-warm-800 mb-1">돌봄 위치 등록</h1>
          <p className="text-sm text-warm-500 mb-5 leading-relaxed">
            어르신 댁 주소를 검색하면 좌표로 변환해 지도에 표시하고,
            <br />가까운 요양보호사를 거리순으로 매칭합니다.
          </p>

          {/* STEP 1 — 주소 검색 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[11px] font-bold flex items-center justify-center">1</span>
            <span className="text-sm font-bold text-warm-700">주소 검색</span>
          </div>
          <Button variant="outline" className="w-full mb-2" onClick={handleSearch}>
            <Search className="w-4 h-4" /> 주소 검색
          </Button>

          {address && (
            <>
              <div className="flex items-start gap-2 text-sm text-warm-700 bg-white rounded-md p-3 border border-warm-100 mb-2">
                <MapPin className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
                <span>
                  {zonecode && <span className="text-xs text-warm-400 font-en mr-1">[{zonecode}]</span>}
                  {address}
                </span>
              </div>
              <input
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="상세주소 (동/호수 등)"
                className="w-full h-10 rounded-md border border-warm-200 bg-white px-3 text-sm placeholder:text-warm-400 focus:outline-none focus:border-brand-500 mb-5"
              />
            </>
          )}

          {/* STEP 2 — 좌표 변환 */}
          {(loading || coords) && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                <span className="text-sm font-bold text-warm-700">좌표 변환</span>
              </div>
              <Card className="p-4 mb-5">
                {loading ? (
                  <div className="flex items-center gap-2 text-warm-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> 좌표 변환 중…
                  </div>
                ) : coords ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] text-warm-400 mb-0.5">위도 (lat)</div>
                      <div className="font-en font-bold text-warm-800">{coords.lat.toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-warm-400 mb-0.5">경도 (lng)</div>
                      <div className="font-en font-bold text-warm-800">{coords.lng.toFixed(6)}</div>
                    </div>
                  </div>
                ) : null}
              </Card>
            </>
          )}

          {/* STEP 3 — 지도 표시 */}
          {coords && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                <span className="text-sm font-bold text-warm-700">지도 위치 확인</span>
              </div>
              <MapPreview lat={coords.lat} lng={coords.lng} height={240} />

              {/* 매칭 설명 */}
              <Card className="p-4 mt-4 bg-brand-50 border-brand-100">
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className="w-4 h-4 text-brand-600" />
                  <span className="font-bold text-brand-700 text-sm">거리 기반 매칭</span>
                </div>
                <p className="text-xs text-brand-700/80 leading-relaxed mb-3">
                  이 좌표를 기준으로 주변 요양보호사와의 이동 거리를 계산해
                  AI가 가까운 순으로 추천합니다.
                </p>
                <div className="space-y-1.5">
                  {[
                    { name: "김○○ 요양보호사", dist: "1.2km", grade: "1순위" },
                    { name: "이○○ 요양보호사", dist: "2.8km", grade: "2순위" },
                    { name: "박○○ 요양보호사", dist: "4.1km", grade: "3순위" },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center justify-between bg-white rounded-md px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-brand-400" />
                        <span className="text-xs font-semibold text-warm-700">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-warm-500 font-en">{c.dist}</span>
                        <Badge variant="success">{c.grade}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="flex items-center gap-1.5 text-xs text-brand-600 mt-4 justify-center">
                <CheckCircle2 className="w-4 h-4" /> 주소 → 좌표 → 지도 → 매칭 흐름 예시
              </div>
            </>
          )}

          {error && <p className="text-sm text-danger mt-4 text-center">{error}</p>}
        </main>

        <footer className="px-5 py-4 text-center text-[11px] text-warm-400 border-t border-warm-100">
          Care&amp; · 위치 기반 돌봄 매칭 서비스 예시 화면
        </footer>
      </div>
    </div>
  );
}
