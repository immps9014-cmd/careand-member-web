"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, ChevronRight, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { memberApi } from "@/lib/api/member";
import { formatDateTime } from "@/lib/utils";
import { domainLabel, logStatus, LOG_MOCK_ENABLED, MOCK_SESSIONS } from "@/lib/logs";

/**
 * 보호자 케어일지 목록 (#5, Phase 2 - 2.3)
 * 매칭된 돌봄 세션을 카드로 표시. 검수 '승인'된 일지만 상세 열람 가능(INV-6).
 * BE 2.2(`GET /v1/guardians/me/sessions`) 의존 — 미배포 시 NEXT_PUBLIC_ENABLE_LOG_MOCK=1 로 미리보기.
 */
export default function LogsPage() {
  const query = useQuery({
    queryKey: ["member", "guardian", "sessions", LOG_MOCK_ENABLED],
    queryFn: async () => (LOG_MOCK_ENABLED ? MOCK_SESSIONS : memberApi.guardianSessions()),
  });

  const sessions = query.data ?? [];

  return (
    <div className="p-5 lg:mx-auto lg:max-w-3xl">
      <h1 className="text-xl font-extrabold text-warm-800 mb-1">케어 일지</h1>
      <p className="text-sm text-warm-500 mb-4">돌봄이 끝나면 AI가 정리한 케어 일지를 받아보실 수 있어요</p>

      {/* 케어 만족도 진입 (모바일에서도 접근) */}
      <Link
        href="/satisfaction"
        className="mb-5 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-warm-700">
          <Star className="h-4 w-4 fill-brand-400 text-brand-400" /> 케어 만족도 평가하기
        </span>
        <ChevronRight className="h-4 w-4 text-warm-500" />
      </Link>

      {LOG_MOCK_ENABLED && (
        <Card className="p-3 mb-4 bg-info-bg/40 text-info text-xs font-bold">
          미리보기(mock) — 실제 데이터는 백엔드 일지 API 배포 후 표시됩니다.
        </Card>
      )}

      {query.isLoading && <p className="text-center text-warm-500 py-10">불러오는 중…</p>}

      {!LOG_MOCK_ENABLED && query.isError && (
        <Card className="p-8 text-center text-warm-500 text-sm">
          케어 일지 기능을 준비 중입니다.
          <br />잠시 후 다시 시도해 주세요.
        </Card>
      )}

      {!query.isLoading && !query.isError && sessions.length === 0 && (
        <Card className="p-8 text-center text-warm-500 text-sm">
          아직 케어 일지가 없습니다.
          <br />돌봄이 진행되면 케어 일지가 여기에 표시됩니다.
        </Card>
      )}

      {/* 모바일: 카드 / 데스크톱: 타임라인 (좌측 라인 + 점) */}
      <div className="space-y-3 lg:relative lg:space-y-0 lg:before:absolute lg:before:left-[7px] lg:before:top-2 lg:before:bottom-2 lg:before:w-0.5 lg:before:bg-warm-200">
        {sessions.map((s) => {
          const st = logStatus(s);
          const inner = (
            <Card className={`p-4 ${st.viewable ? "active:bg-warm-50 transition-colors lg:hover:border-brand-300" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-500" />
                  <span className="font-bold text-warm-800">{s.recipient_name}</span>
                  <Badge variant="info">{domainLabel(s.service_domain)}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={st.variant}>{st.label}</Badge>
                  {st.viewable && <ChevronRight className="w-4 h-4 text-warm-500" />}
                </div>
              </div>
              <div className="text-xs text-warm-500">
                {s.actual_start ? formatDateTime(s.actual_start) : s.scheduled_start ? formatDateTime(s.scheduled_start) : "-"}
                {s.duration_min > 0 &&
                  ` · ${Math.floor(s.duration_min / 60)}시간${s.duration_min % 60 > 0 ? ` ${s.duration_min % 60}분` : ""}`}
              </div>
              {st.viewable ? (
                <p className="text-xs text-brand-600 mt-2 font-medium">탭하여 케어 일지 보기</p>
              ) : (
                <p className="text-xs text-warm-500 mt-2">
                  {st.label === "검수 중" ? "관리자 검수 후 일지가 도착해요." : "돌봄이 끝나면 AI 케어 일지가 정리됩니다."}
                </p>
              )}
            </Card>
          );

          const dot = (
            <span className="hidden h-4 w-4 rounded-full border-2 border-brand-400 bg-white lg:absolute lg:left-0 lg:top-4 lg:block" />
          );
          const wrap = "block lg:relative lg:pl-9 lg:pb-3";
          return st.viewable ? (
            <Link key={s.id} href={`/logs/${s.id}`} className={wrap}>
              {dot}
              {inner}
            </Link>
          ) : (
            <div key={s.id} className={wrap}>
              {dot}
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
