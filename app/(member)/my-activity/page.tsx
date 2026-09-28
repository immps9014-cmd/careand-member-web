"use client";

import { useQuery } from "@tanstack/react-query";
import { Star, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { memberApi } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";

/**
 * 받은 후기 · 활동 (기능 16, 2026-09-29) — 돌봄전문가 전용
 * 보호자 이름은 보이지 않는다. 인센티브 제도는 아직 없어 표시하지 않는다(평점의 매칭 반영만 안내).
 */
export default function MyActivityPage() {
  const q = useQuery({ queryKey: ["member", "my-performance"], queryFn: memberApi.myPerformance, retry: false });
  const d = q.data;
  const maxSessions = Math.max(1, ...(d?.months.map((m) => m.sessions) ?? [1]));

  return (
    <div className="px-4 pt-4 pb-8 lg:mx-auto lg:max-w-3xl">
      <h1 className="text-xl font-extrabold tracking-tight text-warm-800">받은 후기 · 활동</h1>
      {q.isLoading && <Card className="mt-5 p-8 text-center text-sm text-warm-500">불러오는 중…</Card>}
      {q.isError && <Card className="mt-5 p-8 text-center text-sm text-warm-500">{getApiErrorMessage(q.error)}</Card>}
      {d && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Card className="p-3 text-center">
              <div className="text-[11px] font-semibold text-warm-500">평균 평점</div>
              <div className="mt-1 flex items-center justify-center gap-1 text-lg font-extrabold text-warm-800">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />{d.rating_count ? d.rating_avg.toFixed(1) : "-"}
              </div>
              <div className="text-[11px] text-warm-500">후기 {d.rating_count}건</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-[11px] font-semibold text-warm-500">완료 돌봄</div>
              <div className="mt-1 text-lg font-extrabold text-warm-800">{d.completed_sessions}회</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-[11px] font-semibold text-warm-500">경력 단계</div>
              <div className="mt-1 text-lg font-extrabold text-warm-800">{d.career_track}</div>
            </Card>
          </div>
          <p className="mt-2 text-[11px] text-warm-500">{d.rating_note}</p>

          <Card className="mt-4 p-4">
            <div className="mb-3 flex items-center gap-1.5 text-sm font-bold text-warm-800">
              <TrendingUp className="h-4 w-4 text-brand-600" /> 최근 6개월
            </div>
            <div className="space-y-2">
              {d.months.map((m) => (
                <div key={m.month} className="flex items-center gap-2 text-xs">
                  <span className="w-14 flex-none font-semibold text-warm-600">{m.month.slice(2).replace("-", ".")}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-warm-100" aria-hidden>
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(m.sessions / maxSessions) * 100}%` }} />
                  </div>
                  <span className="w-28 flex-none text-right text-warm-600">
                    {m.sessions}회 · {m.hours}시간{m.avg_rating != null ? ` · ★${m.avg_rating}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <h2 className="mt-5 mb-2 text-sm font-bold text-warm-800">받은 후기</h2>
          {d.reviews.length === 0 && <Card className="p-6 text-center text-sm text-warm-500">아직 받은 후기가 없어요.</Card>}
          <div className="space-y-3">
            {d.reviews.map((r, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-2">
                  <span className="flex" aria-label={`${r.rating}점`}>
                    {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-4 w-4 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-warm-300"}`} />)}
                  </span>
                  <span className="text-xs text-warm-500">{r.service} · {r.created_at.slice(0, 10)}</span>
                </div>
                {r.comment && <p className="mt-2 text-sm text-warm-700">{r.comment}</p>}
                {(r.scores.length > 0 || r.tags.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.scores.map((s) => <span key={s.label} className="rounded-full bg-warm-50 px-2 py-0.5 text-[11px] text-warm-600">{s.label} {s.score}</span>)}
                    {r.tags.map((t) => <span key={t} className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-700">{t}</span>)}
                  </div>
                )}
                {r.reply && <p className="mt-2 rounded-lg bg-warm-50 px-3 py-2 text-xs text-warm-600">운영팀: {r.reply}</p>}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
