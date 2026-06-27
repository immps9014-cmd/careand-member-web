"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Star, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { memberApi, type Candidate } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

type SortKey = "recommended" | "price" | "rating";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "추천순" },
  { key: "price", label: "낮은 입찰가순" },
  { key: "rating", label: "평점순" },
];

// 입찰가가 권장가 대비 어디인지
function bidTone(bid: number | null, suggested: number | null) {
  if (bid == null || suggested == null) return null;
  if (bid <= suggested * 0.95) return { variant: "success" as const, label: "저렴" };
  if (bid >= suggested * 1.1) return { variant: "warn" as const, label: "높음" };
  return { variant: "outline" as const, label: "적정" };
}

export default function RequestDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const requestId = Number(id);
  const router = useRouter();
  const qc = useQueryClient();
  const [sort, setSort] = useState<SortKey>("recommended");

  const query = useQuery({
    queryKey: ["member", "candidates", requestId],
    queryFn: () => memberApi.candidates(requestId),
    refetchInterval: (q) =>
      // 후보 산출/입찰 갱신 동안 폴링
      (q.state.data?.candidates.length ?? 0) === 0 || q.state.data?.request_status !== "matched" ? 4000 : false,
  });

  const select = useMutation({
    mutationFn: (candidateId: number) => memberApi.selectCandidate(requestId, candidateId),
    onSuccess: (res) => {
      const msg = (res?.data as { message?: string } | undefined)?.message;
      toast.success(msg ?? "돌봄전문가를 선택했습니다.");
      qc.invalidateQueries({ queryKey: ["member"] });
      router.push("/home");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const data = query.data;
  const est = data?.price_estimate ?? null;
  const matched = data?.request_status === "matched";

  const sorted: Candidate[] = [...(data?.candidates ?? [])].sort((a, b) => {
    if (sort === "price") {
      // 입찰가 오름차순, 미입찰은 뒤로
      const av = a.bid_hourly ?? Infinity;
      const bv = b.bid_hourly ?? Infinity;
      return av - bv;
    }
    if (sort === "rating") return (b.caregiver?.rating_avg ?? 0) - (a.caregiver?.rating_avg ?? 0);
    return a.rank - b.rank;
  });

  return (
    <div className="p-5">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-4">
        <ChevronLeft className="w-4 h-4" /> 뒤로
      </button>

      <h1 className="text-xl font-extrabold text-warm-800 mb-1">AI 추천 돌봄전문가</h1>
      <p className="text-sm text-warm-500 mb-4">
        돌봄전문가가 제시한 입찰가와 프로필을 비교해 선택하세요
      </p>

      {/* 적정 간병비 권장 가격대 */}
      {est && (
        <Card className="p-4 mb-4 border-brand-200" style={{ background: "rgba(63,125,82,.05)" }}>
          <div className="text-xs font-extrabold tracking-wider text-warm-400 uppercase mb-1.5">적정 간병비 (시급)</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-brand-700 tabular-nums">{won(est.suggested)}</span>
            <span className="text-xs text-warm-400">권장</span>
          </div>
          <div className="text-xs text-warm-500 mt-1 tabular-nums">권장 범위 {won(est.floor)} ~ {won(est.ceil)}</div>
        </Card>
      )}

      {/* 정렬 */}
      {sorted.length > 0 && (
        <div className="flex gap-1.5 mb-3">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                sort === s.key ? "bg-brand-600 text-white border-brand-600" : "bg-white text-warm-500 border-warm-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {query.isLoading && <p className="text-center text-warm-400 py-10">불러오는 중…</p>}

      {data && sorted.length === 0 && (
        <Card className="p-8 text-center text-warm-400 text-sm">
          {data.message ?? "추천 후보가 없습니다."}
        </Card>
      )}

      <div className="space-y-3">
        {sorted.map((c) => {
          const tone = bidTone(c.bid_hourly, est?.suggested ?? null);
          return (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-warm-800">{c.caregiver?.name ?? "돌봄전문가"}</span>
                  {c.source === "self" && <Badge variant="brand">지원함</Badge>}
                  {c.source !== "self" && c.rank === 1 && <Badge variant="success">AI 1순위</Badge>}
                  {c.response === "accepted" && <Badge variant="success">수락됨</Badge>}
                  {c.response === "rejected" && <Badge variant="danger">거절</Badge>}
                </div>
                <span className="text-xs text-warm-400 font-en">
                  {c.source === "self" ? "직접 지원" : `AI ${(c.ai_score * 100).toFixed(0)}점`}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-warm-500 mb-2">
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3 h-3 fill-warn text-warn" />
                  {c.caregiver?.rating_avg?.toFixed(1) ?? "-"}
                </span>
                <span>경력 {c.caregiver?.completed_sessions ?? 0}회</span>
                {c.caregiver?.age && <span>{c.caregiver.age}세</span>}
                {c.caregiver?.gender && <span>{c.caregiver.gender === "F" ? "여" : "남"}</span>}
              </div>

              {/* 입찰가 */}
              <div className="flex items-center justify-between rounded-lg bg-warm-50 px-3.5 py-2.5 mb-3">
                <span className="text-xs text-warm-500">제시 시급</span>
                {c.bid_hourly != null ? (
                  <span className="flex items-center gap-1.5">
                    <span className="text-base font-extrabold text-warm-800 tabular-nums">{won(c.bid_hourly)}</span>
                    {tone && <Badge variant={tone.variant}>{tone.label}</Badge>}
                  </span>
                ) : (
                  <span className="text-xs text-warm-400">입찰 대기 중</span>
                )}
              </div>

              {c.bid_note && (
                <p className="text-xs text-warm-500 mb-3 line-clamp-2">“{c.bid_note}”</p>
              )}

              {c.ai_reasons && c.ai_reasons.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {c.ai_reasons.map((r) => (
                    <Badge key={r} variant="outline">{r}</Badge>
                  ))}
                </div>
              )}

              <Button
                size="sm"
                variant="brand"
                className="w-full"
                disabled={select.isPending || matched}
                onClick={() => select.mutate(c.id)}
              >
                <Check className="w-4 h-4" />
                {matched
                  ? "매칭 완료됨"
                  : c.bid_hourly != null
                    ? `${won(c.bid_hourly)}에 선택 (즉시 확정)`
                    : "이 돌봄전문가 선택"}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
