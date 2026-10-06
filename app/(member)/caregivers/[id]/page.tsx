"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Star, ShieldCheck, MapPin, Briefcase, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { memberApi, type RecommendedCaregiver } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { caregiverDomainLabels, domainLabel } from "@/lib/caregiverType";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/lib/auth/store";
import { CaregiverReviews } from "@/components/care/caregiver-reviews";
import { CareandCertMark } from "@/components/care/careand-cert-mark";

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

  // 「매칭 요청하기」 — 이 전문가가 맡을 수 있는 진행 중(open) 요청이 있으면 새 요청 대신 그 요청의 후보로 추가하도록 고르게 한다.
  // (칠칠칠칠 사례: 요청이 이미 있는데 상세에서 누르면 늘 새 요청 화면으로 가 「매칭했는데 새 요청으로 돌아온다」)
  const isGuardian = useAuth((s) => s.user?.role) === "guardian";
  const [pickOpen, setPickOpen] = useState(false);
  const openReqQ = useQuery({
    queryKey: ["member", "guardian", "requests"],
    queryFn: () => memberApi.guardianRequests(),
    enabled: isGuardian,
    staleTime: 30_000,
  });
  const cgDomains = (q.data?.service_domains ?? "").split(",").filter(Boolean);
  const openReqs = (openReqQ.data ?? []).filter(
    (r) => r.status === "open" && (!r.service_domain || cgDomains.length === 0 || cgDomains.includes(r.service_domain)),
  );
  const invite = useMutation({
    mutationFn: (requestId: number) => memberApi.inviteToRequest(requestId, id).then(() => requestId),
    onSuccess: (requestId) => {
      toast.success("진행 중인 요청의 후보로 추가했어요. 전문가가 응답하면 알려드릴게요.");
      qc.invalidateQueries({ queryKey: ["member", "candidates", requestId] });
      router.push(`/request/${requestId}`);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const startRequest = () => (openReqs.length > 0 ? setPickOpen(true) : router.push(`/request/new?preferred=${id}`));

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
                <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center text-2xl font-extrabold text-brand-600 shrink-0 overflow-hidden">
                  {/* 프로필 사진(서명 링크) — 없으면 이름 첫 글자 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.photo_url ? <img src={c.photo_url} alt={`${name} 사진`} className="w-full h-full object-cover" /> : (name.charAt(0) || "?")}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-extrabold text-warm-800 truncate">{name}</h1>
                    {c.license_verified && (
                      <Badge variant="success" className="gap-1"><ShieldCheck className="w-3 h-3" />자격인증</Badge>
                    )}
                  </div>
                  {c.careand_certified && <CareandCertMark className="mt-1" />}
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

            {/* 케어앤에듀 인증 자격(2026-10-07) — 활동 기록·보호자 평점 기준을 넘어 케어앤에듀가 인정 */}
            {c.careand_cert && (
              <Card className="p-4 mb-4 border-amber-200 bg-amber-50/50">
                <div className="flex items-center gap-2">
                  <CareandCertMark />
                  <span className="text-sm font-bold text-warm-800">{c.careand_cert.name}</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-warm-600">
                  이 플랫폼에서 꾸준히 돌봄을 하고 보호자에게 좋은 평가를 받아 {c.careand_cert.issuer}가 인정한 돌봄전문가예요.
                </p>
                <div className="mt-1 text-[12.5px] tabular-nums text-warm-500">
                  자격 번호 {c.careand_cert.number} · {c.careand_cert.issued_date} 발급
                </div>
              </Card>
            )}

            <Card className="p-5 mb-4 space-y-3">
              <Row label="완료 케어" value={`${c.completed_sessions}건`} />
              {c.default_rate != null && (
                <Row label="기본 시급" value={`${won(c.default_rate)}~`} />
              )}
              {c.specialties && <Row label="전문 분야" value={c.specialties} icon={<Briefcase className="w-4 h-4" />} />}
              {c.base_address && <Row label="활동 지역" value={c.base_address} icon={<MapPin className="w-4 h-4" />} />}
              {c.organization && <Row label="소속" value={c.organization.name} />}
            </Card>

            {/* 확인된 자격 서류 — 산모신생아 건강관리 구비서류 중 이용자 공개 항목. 파일은 보이지 않고 이름·유효기간만 */}
            {!!c.verified_documents?.length && (
              <Card className="p-5 mb-4">
                <div className="flex items-center gap-1.5 font-bold text-warm-800">
                  <ShieldCheck className="w-4 h-4 text-brand-600" /> 운영팀이 확인한 서류
                </div>
                <ul className="mt-2.5 space-y-2">
                  {c.verified_documents.map((d) => (
                    <li key={d.type} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-warm-700">{d.label}</span>
                      <span className="shrink-0 text-right text-[12.5px] tabular-nums text-warm-500">
                        {d.expires_at ? `${d.expires_at}까지` : "확인 완료"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <CaregiverReviews caregiverId={c.id} />

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
              <Button variant="brand" size="lg" className="flex-[2]" onClick={startRequest}>
                매칭 요청하기
              </Button>
            </div>

            {pickOpen && (
              <Card className="mt-3 p-4">
                <div className="text-sm font-bold text-warm-800">진행 중인 요청이 있어요</div>
                <p className="mt-0.5 text-xs text-warm-500">이 전문가를 기존 요청의 후보로 추가하거나, 새로 요청할 수 있어요.</p>
                <div className="mt-3 space-y-2">
                  {openReqs.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      disabled={invite.isPending}
                      onClick={() => invite.mutate(r.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-3.5 py-3 text-left disabled:opacity-60"
                    >
                      <span className="min-w-0">
                        <span className="block text-[14.5px] font-bold text-warm-800">
                          {domainLabel(r.service_domain)}{r.senior?.name ? ` · ${r.senior.name}` : ""}
                        </span>
                        <span className="block text-[12.5px] text-warm-500">
                          {r.scheduled_start ? formatDateTime(r.scheduled_start) : "일정 미정"} · 후보 추천 중
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-bold text-brand-600">이 요청에 추가</span>
                    </button>
                  ))}
                </div>
                <Button variant="outline" size="lg" className="mt-3 w-full" onClick={() => router.push(`/request/new?preferred=${id}`)}>
                  새 요청으로 신청
                </Button>
              </Card>
            )}
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
