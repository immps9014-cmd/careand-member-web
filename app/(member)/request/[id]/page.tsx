"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, Star, Check, ChevronRight, ShieldCheck, MapPin } from "lucide-react";
import { CareIssueCard } from "@/components/care/care-issue-card";
import { CareandCertMark } from "@/components/care/careand-cert-mark";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { memberApi, type Candidate } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { ProgressPipeline } from "@/components/ProgressPipeline";

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
  // 선택은 즉시 확정될 수 있어 한 번 더 확인받는다(후보 id)
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [askCancel, setAskCancel] = useState(false);

  const query = useQuery({
    queryKey: ["member", "candidates", requestId],
    queryFn: () => memberApi.candidates(requestId),
    refetchInterval: (q) =>
      // 후보 산출/입찰 갱신 동안 폴링
      (q.state.data?.candidates.length ?? 0) === 0 || q.state.data?.request_status !== "matched" ? 4000 : false,
  });

  // 찜한 돌봄전문가 — 후보 중 찜한 인력을 표시·우선 정렬
  const favQ = useQuery({
    queryKey: ["member", "caregivers", "favorites"],
    queryFn: () => memberApi.favoriteCaregivers(),
    staleTime: 60_000,
  });
  const favSet = new Set((favQ.data ?? []).map((c) => c.id));
  const isFav = (c: Candidate) => !!c.caregiver && favSet.has(c.caregiver.id);

  const select = useMutation({
    mutationFn: (candidateId: number) => memberApi.selectCandidate(requestId, candidateId),
    onSuccess: (res) => {
      const body = res?.data as { message?: string; match?: { id: number } } | undefined;
      setConfirmId(null);
      qc.invalidateQueries({ queryKey: ["member"] });
      if (body?.match?.id) {
        // 입찰가 선택 = 즉시 확정 → 곧장 결제로(홈으로 돌려보내면 결제 버튼을 다시 찾아야 했다)
        toast.success("매칭이 확정됐어요. 결제를 진행해 주세요.");
        router.push(`/payments/${body.match.id}`);
        return;
      }
      // 돌봄전문가 수락 대기 — 이 화면에 남아 진행 상태를 보여준다
      toast.success(body?.message ?? "돌봄전문가에게 요청을 보냈어요. 수락하면 알려 드릴게요.");
    },
    onError: (e) => { setConfirmId(null); toast.error(getApiErrorMessage(e)); },
  });

  const cancelReq = useMutation({
    mutationFn: () => memberApi.cancelRequest(requestId),
    onSuccess: () => {
      toast.success("요청을 취소했어요.");
      qc.invalidateQueries({ queryKey: ["member"] });
      router.push("/home");
    },
    onError: (e) => { setAskCancel(false); toast.error(getApiErrorMessage(e)); },
  });

  const data = query.data;
  const est = data?.price_estimate ?? null;
  const matched = data?.request_status === "matched";
  const cancellable = data?.request_status === "open" || data?.request_status === "matching";
  const closed = data?.request_status === "cancelled" || data?.request_status === "expired";

  const sorted: Candidate[] = [...(data?.candidates ?? [])].sort((a, b) => {
    if (sort === "price") {
      // 입찰가 오름차순, 미입찰은 뒤로
      const av = a.bid_hourly ?? Infinity;
      const bv = b.bid_hourly ?? Infinity;
      return av - bv;
    }
    if (sort === "rating") return (b.caregiver?.rating_avg ?? 0) - (a.caregiver?.rating_avg ?? 0);
    // 추천순: 찜한 전문가 우선 → 가성비 점수(value_score) → AI rank
    const af = isFav(a) ? 1 : 0;
    const bf = isFav(b) ? 1 : 0;
    if (af !== bf) return bf - af;
    if (a.value_score != null && b.value_score != null) return b.value_score - a.value_score;
    return a.rank - b.rank;
  });
  // 실제 매칭된 전문가(서버 matched_caregiver_id). 모르면 기존처럼 전원 표시.
  const matchedCgId = data?.matched_caregiver_id ?? null;
  const isMatchedCg = (c: Candidate) => matchedCgId != null && c.caregiver?.id === matchedCgId;
  const visible = matched && matchedCgId != null ? sorted.filter(isMatchedCg) : sorted;
  const hiddenCount = sorted.length - visible.length;

  return (
    <div className="p-5 lg:mx-auto lg:max-w-5xl">
      <button onClick={() => router.push("/home")} className="flex h-10 items-center gap-1 text-sm text-warm-600 mb-2">
        <ChevronLeft className="w-4 h-4" /> 홈으로
      </button>

      <h1 className="text-xl font-extrabold text-warm-800 mb-1">AI 추천 돌봄전문가</h1>
      <p className="text-sm text-warm-500 mb-4">
        돌봄전문가가 제시한 입찰가와 프로필을 비교해 선택하세요
      </p>

      {/* 진행 단계 파이프라인 */}
      {data && (
        <Card className="mb-4 p-4">
          <div className="mb-3 text-xs font-extrabold uppercase tracking-wider text-warm-500">진행 상태</div>
          <ProgressPipeline
            size="md"
            requestStatus={data.request_status}
            matchStatus={data.match_status}
            paymentStatus={data.payment_status}
          />
        </Card>
      )}

      {/* 매칭 확정 & 미결제 시에만 결제 진입 (결제 완료 후에는 파이프라인으로 진행 표시) */}
      {/* 바우처 계약 매칭 — 본인부담금은 제공기관(케어앤)에 선납, 앱 결제 없음 */}
      {matched && data?.payment_status === "voucher" && (
        <Link href="/mnh">
          <Card className="mb-4 flex items-center justify-between border-amber-200 bg-amber-50 p-4">
            <div>
              <div className="text-[14px] font-bold text-amber-800">바우처 본인부담금 납부 확인 전이에요</div>
              <div className="mt-0.5 text-[12.5px] text-warm-500">운영팀 안내에 따라 납부하면 방문이 시작돼요.</div>
            </div>
            <span className="rounded-full bg-white px-3.5 py-2 text-[13.5px] font-bold text-amber-800">계약 보기</span>
          </Card>
        </Link>
      )}
      {matched && data?.match_id && data?.payment_status !== "paid" && data?.payment_status !== "voucher" && (
        <Link href={`/payments/${data.match_id}`}>
          <Card className="mb-4 flex items-center justify-between border-brand-200 bg-brand-50 p-4">
            <div>
              <div className="text-[14px] font-bold text-brand-700">매칭이 확정되었어요</div>
              <div className="mt-0.5 text-[12.5px] text-warm-500">결제를 완료하면 돌봄 일정이 시작돼요.</div>
            </div>
            <span className="rounded-full bg-brand-500 px-3.5 py-2 text-[13.5px] font-bold text-white">결제하기</span>
          </Card>
        </Link>
      )}

      {closed && (
        <Card className="mb-4 p-4 text-center text-sm text-warm-600">
          {data?.request_status === "cancelled" ? "취소된 요청이에요." : "기간이 지나 마감된 요청이에요."}{" "}
          <Link href="/request/new" className="font-bold text-brand-600 underline">새로 신청하기</Link>
        </Card>
      )}

      {/* 적정 간병비 권장 가격대 */}
      {est && (
        <Card className="p-4 mb-4 border-brand-200" style={{ background: "rgba(63,125,82,.05)" }}>
          <div className="text-xs font-extrabold tracking-wider text-warm-500 uppercase mb-1.5">적정 간병비 (시급)</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-brand-700 tabular-nums">{won(est.suggested)}</span>
            <span className="text-xs text-warm-500">권장</span>
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

      {query.isLoading && <p className="text-center text-warm-500 py-10">불러오는 중…</p>}

      {data && sorted.length === 0 && (
        <Card className="p-8 text-center text-warm-500 text-sm">
          {data.message ?? "추천 후보가 없습니다."}
        </Card>
      )}

      {/* 매칭이 끝나면 실제 매칭된 전문가만 — 「수락」한 다른 후보까지 같이 보이면 누가 진행 중인지 헷갈린다(10-04) */}
      {matched && hiddenCount > 0 && (
        <p className="mb-3 text-[13px] text-warm-500">다른 후보 {hiddenCount}명은 마감됐어요.</p>
      )}

      {/* 모바일: 세로 리스트 / 데스크톱: 2열 그리드 */}
      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0">
        {visible.map((c) => {
          const tone = bidTone(c.bid_hourly, est?.suggested ?? null);
          return (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* 사진(서명 링크) — 없으면 첫 글자 */}
                  <span className="w-9 h-9 shrink-0 rounded-full bg-brand-50 overflow-hidden flex items-center justify-center text-sm font-extrabold text-brand-600">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.caregiver?.photo_url ? <img src={c.caregiver.photo_url} alt="" className="w-full h-full object-cover" /> : (c.caregiver?.name ?? "?").charAt(0)}
                  </span>
                  <span className="font-bold text-warm-800">{c.caregiver?.name ?? "돌봄전문가"}</span>
                  {c.source === "direct" && <Badge variant="brand">직접 지정</Badge>}
                  {isFav(c) && <Badge variant="brand">★ 찜</Badge>}
                  {c.source === "self" && <Badge variant="brand">지원함</Badge>}
                  {c.source !== "self" && c.rank === 1 && <Badge variant="success">AI 1순위</Badge>}
                  {matched && isMatchedCg(c)
                    ? <Badge variant="success">매칭된 돌봄전문가</Badge>
                    : c.response === "accepted" && <Badge variant="success">수락됨</Badge>}
                  {c.response === "rejected" && <Badge variant="danger">거절</Badge>}
                </div>
                <span className="text-xs text-warm-500 font-en">
                  {c.source === "self" ? "직접 지원" : `AI ${(c.ai_score * 100).toFixed(0)}점`}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-warm-500 mb-2">
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3 h-3 fill-warn text-warn" />
                  {/* 후기가 없으면 0.0 대신 「신규」(09-29 평점 초기화) */}
                  {c.caregiver?.rating_count ? c.caregiver.rating_avg?.toFixed(1) : "신규"}
                </span>
                <span>경력 {c.caregiver?.completed_sessions ?? 0}회</span>
                {c.caregiver?.age && <span>{c.caregiver.age}세</span>}
                {c.caregiver?.gender && <span>{c.caregiver.gender === "F" ? "여" : "남"}</span>}
              </div>
              {/* 자격 확인·활동 지역 — 상세로 안 들어가도 보이게(2026-10-05) */}
              {(c.caregiver?.careand_certified || c.caregiver?.license_verified || c.caregiver?.region || !!c.caregiver?.verified_doc_count) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-warm-600 mb-2">
                  {c.caregiver?.careand_certified && <CareandCertMark compact />}
                  {c.caregiver?.license_verified && (
                    <span className="inline-flex items-center gap-1 font-semibold text-brand-700"><ShieldCheck className="w-3.5 h-3.5" />자격 확인</span>
                  )}
                  {!!c.caregiver?.verified_doc_count && <span>확인 서류 {c.caregiver.verified_doc_count}종</span>}
                  {c.caregiver?.region && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{c.caregiver.region}</span>}
                </div>
              )}

              {/* 입찰가 */}
              <div className="flex items-center justify-between rounded-lg bg-warm-50 px-3.5 py-2.5 mb-3">
                <span className="text-xs text-warm-500">제시 시급</span>
                {c.bid_hourly != null ? (
                  <span className="flex items-center gap-1.5">
                    <span className="text-base font-extrabold text-warm-800 tabular-nums">{won(c.bid_hourly)}</span>
                    {c.value_reason === "가성비 좋음" && <Badge variant="success">가성비</Badge>}
                    {tone && <Badge variant={tone.variant}>{tone.label}</Badge>}
                  </span>
                ) : (
                  <span className="text-xs text-warm-500">입찰 대기 중</span>
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

              {c.caregiver?.id != null && (
                <Link
                  href={`/caregivers/${c.caregiver.id}`}
                  className="mb-2 flex w-full items-center justify-center gap-0.5 rounded-lg border border-warm-200 py-2 text-sm font-semibold text-warm-600 hover:bg-warm-50"
                >
                  프로필 자세히 보기
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}

              {confirmId === c.id ? (
                <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
                  <p className="text-sm font-semibold text-warm-800">
                    {c.bid_hourly != null
                      ? `${c.caregiver?.name ?? "이 돌봄전문가"} 님을 시급 ${won(c.bid_hourly)}에 확정할까요? 확정하면 바로 결제 화면으로 가요.`
                      : `${c.caregiver?.name ?? "이 돌봄전문가"} 님에게 요청을 보낼까요? 수락하면 확정돼요.`}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setConfirmId(null)}>다시 볼게요</Button>
                    <Button variant="brand" className="flex-1" disabled={select.isPending} onClick={() => select.mutate(c.id)}>
                      {select.isPending ? "처리 중…" : c.bid_hourly != null ? "확정하기" : "요청 보내기"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="brand"
                  className="w-full"
                  disabled={select.isPending || matched || closed || c.response !== "pending"}
                  onClick={() => setConfirmId(c.id)}
                >
                  <Check className="w-4 h-4" />
                  {matched
                    ? "매칭 완료됨"
                    : c.bid_hourly != null
                      ? `${won(c.bid_hourly)}에 선택`
                      : "이 돌봄전문가 선택"}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {/* 확정 전 요청 취소 — 확정 뒤엔 결제·일정이 얽혀 고객센터로 */}
      {cancellable && (
        <div className="mt-8 border-t border-warm-100 pt-5">
          {askCancel ? (
            <Card className="p-4">
              <p className="text-sm font-semibold text-warm-800">이 요청을 취소할까요? 요청을 받은 돌봄전문가에게도 알려 드려요.</p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setAskCancel(false)}>아니요</Button>
                <Button variant="danger" className="flex-1" disabled={cancelReq.isPending} onClick={() => cancelReq.mutate()}>
                  {cancelReq.isPending ? "취소 중…" : "네, 취소할게요"}
                </Button>
              </div>
            </Card>
          ) : (
            <Button variant="outline" className="w-full text-warm-700" onClick={() => setAskCancel(true)}>
              요청 취소
            </Button>
          )}
        </div>
      )}
      {matched && <CareIssueCard requestId={requestId} />}
      {matched && data?.payment_status !== "paid" && (
        <p className="mt-6 text-center text-sm text-warm-600">
          확정된 요청의 취소·일정 변경은 <Link href="/support" className="font-bold text-brand-600 underline">고객센터</Link>로 문의해 주세요.
        </p>
      )}
    </div>
  );
}
