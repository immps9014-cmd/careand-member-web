"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Star, ShieldCheck, MapPin, Briefcase, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { memberApi, type RecommendedCaregiver } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { caregiverDomainLabels } from "@/lib/caregiverType";

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const stripTag = (s: string | null | undefined) => (s ?? "").replace(/^\[.*?\]\s*/, "");

export default function CaregiverDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const qc = useQueryClient();
  const id = Number(params.id);

  const q = useQuery({
    queryKey: ["member", "caregiver", id],
    queryFn: () => memberApi.caregiverDetail(id),
    enabled: Number.isFinite(id),
    retry: false,
  });

  // 찜(관심) 상태 — 관심 목록 기준으로 판정, 토글은 낙관적 반영
  const favQ = useQuery({
    queryKey: ["member", "caregivers", "favorites"],
    queryFn: () => memberApi.favoriteCaregivers(),
    staleTime: 60_000,
  });
  const isFav = !!favQ.data?.some((f) => f.id === id);
  const toggleFav = useMutation({
    mutationFn: () => memberApi.toggleFavorite(id),
    onSuccess: (favorited) => {
      toast.success(favorited ? "관심 돌봄전문가에 담았어요." : "찜을 해제했어요.");
      qc.setQueryData<RecommendedCaregiver[]>(["member", "caregivers", "favorites"], (old) => {
        const list = old ?? [];
        if (favorited) return list.some((c) => c.id === id) ? list : [...list, { id } as RecommendedCaregiver];
        return list.filter((c) => c.id !== id);
      });
      qc.invalidateQueries({ queryKey: ["member", "caregivers", "favorites"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="px-4 pt-4 pb-6 lg:mx-auto lg:max-w-3xl">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-4">
        <ChevronLeft className="w-4 h-4" /> 뒤로
      </button>

      {q.isLoading && <Card className="p-8 text-center text-warm-500 text-sm">불러오는 중…</Card>}

      {!q.isLoading && q.isError && (
        <Card className="p-8 text-center">
          <p className="text-sm text-warm-500 mb-4">전문가 정보를 불러오지 못했습니다.</p>
          <Button variant="outline" size="sm" onClick={() => q.refetch()}>다시 시도</Button>
        </Card>
      )}

      {q.data && (() => {
        const c = q.data;
        const name = stripTag(c.name) || "돌봄전문가";
        const domains = caregiverDomainLabels(c.service_domains);
        const genderAge = [
          c.gender === "M" ? "남" : c.gender === "F" ? "여" : null,
          c.age != null ? `${c.age}세` : null,
        ].filter(Boolean).join(" · ");
        return (
          <>
            <Card className="p-5 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center text-2xl font-extrabold text-brand-600 shrink-0">
                  {name.charAt(0) || "?"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-extrabold text-warm-800 truncate">{name}</h1>
                    {c.license_verified && (
                      <Badge variant="success" className="gap-1"><ShieldCheck className="w-3 h-3" />자격인증</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-warm-500">
                    <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {c.rating_count ? Number(c.rating_avg).toFixed(1) : "신규"}
                    </span>
                    {!!c.rating_count && <span>({c.rating_count})</span>}
                    {genderAge && <span>· {genderAge}</span>}
                  </div>
                  {domains.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {domains.map((d) => <Badge key={d} variant="outline">{d}</Badge>)}
                      {c.grade_level && <Badge variant="brand">{c.grade_level}</Badge>}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-5 mb-4 space-y-3">
              <Row label="완료 케어" value={`${c.completed_sessions}건`} />
              {c.default_rate != null && (
                <Row label="기본 시급" value={`${won(c.default_rate)}~`} />
              )}
              {c.specialties && <Row label="전문 분야" value={c.specialties} icon={<Briefcase className="w-4 h-4" />} />}
              {c.base_address && <Row label="활동 지역" value={c.base_address} icon={<MapPin className="w-4 h-4" />} />}
              {c.organization && <Row label="소속" value={c.organization.name} />}
            </Card>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                className={"flex-1 " + (isFav ? "border-danger/40 text-danger" : "")}
                disabled={toggleFav.isPending}
                onClick={() => toggleFav.mutate()}
              >
                <Heart className={"w-4 h-4 " + (isFav ? "fill-current" : "")} /> {isFav ? "찜함" : "찜하기"}
              </Button>
              <Button variant="brand" size="lg" className="flex-[2]" onClick={() => router.push(`/request/new?preferred=${id}`)}>
                매칭 요청하기
              </Button>
            </div>
          </>
        );
      })()}
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-warm-500 shrink-0 inline-flex items-center gap-1.5">{icon}{label}</span>
      <span className="text-warm-800 font-semibold text-right">{value}</span>
    </div>
  );
}
