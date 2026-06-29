"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Star, ShieldCheck, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { memberApi, type RecommendedCaregiver } from "@/lib/api/member";

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const stripTag = (s: string) => s.replace(/^\[.*?\]\s*/, "");

// 도메인 → "검증된 OO" 명칭 (www 서비스 페이지와 동일 어휘)
const DOMAIN_TITLE: Record<string, string> = {
  senior: "검증된 요양보호사",
  nursing: "검증된 간병인",
  living_support: "검증된 생활지원 도우미",
};

function BrowseList() {
  const router = useRouter();
  const sp = useSearchParams();
  const domain = sp.get("domain") ?? undefined;
  const title = (domain && DOMAIN_TITLE[domain]) || "검증된 돌봄전문가";

  const q = useQuery({
    queryKey: ["member", "caregivers", "browse", domain ?? "all"],
    queryFn: () => memberApi.caregiversByDomain(domain),
    retry: false,
    staleTime: 60_000,
  });
  const list = q.data ?? [];

  return (
    <div className="px-4 pt-4 pb-6">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-3">
        <ChevronLeft className="w-4 h-4" /> 뒤로
      </button>

      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-xl font-extrabold text-warm-800 tracking-tight">{title}</h1>
        {!q.isLoading && <span className="text-sm font-semibold text-warm-400">{list.length}명</span>}
      </div>

      {q.isLoading && <Card className="p-8 text-center text-warm-400 text-sm">불러오는 중…</Card>}

      {!q.isLoading && q.isError && (
        <Card className="p-8 text-center">
          <p className="text-sm text-warm-500 mb-4">목록을 불러오지 못했습니다.</p>
          <Button variant="outline" size="sm" onClick={() => q.refetch()}>다시 시도</Button>
        </Card>
      )}

      {!q.isLoading && !q.isError && list.length === 0 && (
        <Card className="p-8 text-center text-warm-400 text-sm">조건에 맞는 돌봄전문가가 아직 없습니다</Card>
      )}

      <div className="space-y-3">
        {list.map((c) => <BrowseCard key={c.id} c={c} onClick={() => router.push(`/caregivers/${c.id}`)} />)}
      </div>
    </div>
  );
}

function BrowseCard({ c, onClick }: { c: RecommendedCaregiver; onClick: () => void }) {
  const name = stripTag(c.name) || "돌봄전문가";
  const meta = [c.spec, c.distance_km != null ? `${c.distance_km}km` : null].filter(Boolean).join(" · ");
  return (
    <Card className="p-3.5 flex items-center gap-3 cursor-pointer active:scale-[.99] transition" onClick={onClick}>
      <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-lg font-extrabold text-brand-600 shrink-0">
        {name.charAt(0) || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-warm-800 truncate">{name}</span>
          {c.tag && <Badge variant={c.tag === "BEST" ? "brand" : "success"} className="gap-1">
            {c.tag === "인증" && <ShieldCheck className="w-3 h-3" />}{c.tag}
          </Badge>}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-warm-500">
          <span className="inline-flex items-center gap-0.5 text-amber-500 font-bold">
            <Star className="w-3 h-3 fill-current" />{c.rating}
          </span>
          <span className="text-warm-400">({c.rating_count})</span>
          {meta && <span className="truncate inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" />{meta}</span>}
        </div>
      </div>
      {c.base_rate != null && (
        <div className="text-right shrink-0">
          <div className="text-[11px] text-warm-400">시간당</div>
          <div className="text-sm font-extrabold text-brand-600 tabular-nums">{won(c.base_rate)}~</div>
        </div>
      )}
    </Card>
  );
}

export default function CaregiverBrowsePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-warm-400 text-sm">불러오는 중…</div>}>
      <BrowseList />
    </Suspense>
  );
}
