"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ChevronLeft, FileText, Utensils, Activity, HeartPulse, Smile, Sparkles, Share2, Link2Off, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/store";
import { getApiErrorMessage } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { memberApi } from "@/lib/api/member";
import { formatDateTime } from "@/lib/utils";
import { categorizedItems, LOG_MOCK_ENABLED, MOCK_SUMMARY } from "@/lib/logs";

const CATEGORY_ICON: Record<string, typeof Utensils> = {
  meal: Utensils,
  exercise: Activity,
  vital: HeartPulse,
  mood: Smile,
};

/**
 * 보호자 케어일지 상세 (Phase 2 - 2.4)
 * `GET /v1/care-sessions/{id}/ai-summary` → guardian_version + categorized.
 * INV-7: medical_version 은 요청/표시하지 않음(백엔드도 보호자에겐 미전송).
 * INV-6: 미승인 일지는 백엔드가 404(SUMMARY_NOT_APPROVED) → 안내 표시.
 */
export default function LogDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const sessionId = Number(id);
  const validId = Number.isInteger(sessionId) && sessionId > 0;
  const router = useRouter();

  const query = useQuery({
    queryKey: ["member", "ai-summary", sessionId, LOG_MOCK_ENABLED],
    enabled: validId,
    queryFn: async () => {
      if (LOG_MOCK_ENABLED) {
        const m = MOCK_SUMMARY[sessionId];
        if (!m) throw new Error("not_ready");
        return m;
      }
      const s = await memberApi.careSessionAiSummary(sessionId);
      if (!s) throw new Error("not_ready"); // 미생성/미승인(404) → 안내 분기로
      return s;
    },
    retry: false,
  });

  const summary = query.data;
  const cats = categorizedItems(summary?.categorized ?? null);
  const isGuardian = useAuth((s) => s.user?.role) === "guardian";
  const qc = useQueryClient();
  const shares = useQuery({
    queryKey: ["member", "log-shares", sessionId],
    queryFn: () => memberApi.careLogShares(sessionId),
    enabled: validId && isGuardian && !!summary && !LOG_MOCK_ENABLED,
  });
  // 가족 공유(기능 5) — 7일 읽기 전용 링크. 휴대폰이면 공유 창(카카오톡 등), 아니면 주소 복사
  const share = useMutation({
    mutationFn: () => memberApi.shareCareLog(sessionId),
    onSuccess: async ({ url }) => {
      qc.invalidateQueries({ queryKey: ["member", "log-shares", sessionId] });
      const text = "케어앤 돌봄 일지를 공유해요 (7일 동안 볼 수 있어요)";
      try {
        if (navigator.share) { await navigator.share({ title: "케어앤 돌봄 일지", text, url }); return; }
      } catch { /* 공유 창 닫음 — 아래 복사로 */ }
      try { await navigator.clipboard.writeText(url); toast.success("공유 링크를 복사했어요. 가족에게 보내 주세요."); }
      catch { window.prompt("아래 링크를 복사해 가족에게 보내 주세요", url); }
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const revoke = useMutation({
    mutationFn: (id: number) => memberApi.revokeCareLogShare(id),
    onSuccess: () => { toast.success("공유 링크를 껐어요."); qc.invalidateQueries({ queryKey: ["member", "log-shares", sessionId] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="p-5 lg:mx-auto lg:max-w-3xl">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-4">
        <ChevronLeft className="w-4 h-4" /> 뒤로
      </button>

      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-5 h-5 text-brand-500" />
        <h1 className="text-xl font-extrabold text-warm-800">케어 일지</h1>
      </div>

      {validId && query.isLoading && <p className="text-center text-warm-500 py-10">불러오는 중…</p>}

      {(!validId || query.isError) && (
        <Card className="p-8 text-center text-warm-500 text-sm mt-3">
          아직 일지를 볼 수 없습니다.
          <br />관리자 검수가 끝나면 케어 일지가 도착해요.
        </Card>
      )}

      {summary && (
        <>
          <p className="text-xs text-warm-500 mb-4">
            {summary.generated_at ? formatDateTime(summary.generated_at) : ""} 기준
          </p>

          {/* AI 요약 본문(보호자용) */}
          <Card className="p-5 mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Badge variant="ai">
                <Sparkles className="w-3 h-3" /> AI 요약
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-warm-700 whitespace-pre-line">
              {summary.guardian_version ?? "요약 내용이 없습니다."}
            </p>
          </Card>

          {/* 항목별 요약 */}
          {cats.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {cats.map((c) => {
                const Icon = CATEGORY_ICON[c.key] ?? FileText;
                return (
                  <Card key={c.key} className="p-4">
                    <div className="flex items-center gap-1.5 text-warm-500 mb-1">
                      <Icon className="w-4 h-4 text-brand-500" />
                      <span className="text-xs font-bold">{c.label}</span>
                    </div>
                    <p className="text-sm font-bold text-warm-800">{c.text}</p>
                  </Card>
                );
              })}
            </div>
          )}

          {/* 돌봄 사진(기능 5) */}
          {(summary.photos?.length ?? 0) > 0 && (
            <Card className="p-4 mb-4">
              <div className="flex items-center gap-1.5 text-warm-500 mb-2">
                <Camera className="w-4 h-4 text-brand-500" />
                <span className="text-xs font-bold">돌봄 사진</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {summary.photos!.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg bg-warm-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumbnail} alt={p.caption ?? `돌봄 사진 ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* 가족 공유(기능 5) — 보호자만 */}
          {isGuardian && !LOG_MOCK_ENABLED && (
            <Card className="p-4 mb-4">
              <Button variant="outline" className="w-full" disabled={share.isPending} onClick={() => share.mutate()}>
                <Share2 className="w-4 h-4" /> {share.isPending ? "링크 만드는 중…" : "가족에게 일지 공유"}
              </Button>
              <p className="mt-2 text-[11px] leading-relaxed text-warm-500">
                7일 동안 로그인 없이 볼 수 있는 링크예요. 대상자 이름은 가려지고 사진은 포함되지 않아요.
              </p>
              {(shares.data?.length ?? 0) > 0 && (
                <ul className="mt-2 space-y-1">
                  {shares.data!.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-[12px] text-warm-600">
                      <span>공유 중 · {s.expires_at.slice(0, 10)}까지 · 열람 {s.view_count}회</span>
                      <button type="button" className="inline-flex items-center gap-1 text-danger" onClick={() => revoke.mutate(s.id)}>
                        <Link2Off className="w-3.5 h-3.5" /> 끄기
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {typeof summary.confidence === "number" && (
            <p className="text-xs text-warm-500 text-center">
              AI 신뢰도 {Math.round(summary.confidence * 100)}%
            </p>
          )}
        </>
      )}
    </div>
  );
}
