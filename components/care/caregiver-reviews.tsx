"use client";

// 돌봄전문가 상세의 보호자 후기(2026-10-05) — 작성자는 첫 글자만, 낮은 점수도 그대로 보인다. 운영팀 답변이 있으면 함께.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareText, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { memberApi, type CaregiverReview } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";

const day = (iso: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));

export function CaregiverReviews({ caregiverId }: { caregiverId: number }) {
  const [page, setPage] = useState(1);
  const [more, setMore] = useState<CaregiverReview[]>([]);
  const q = useQuery({ queryKey: ["member", "caregiver-reviews", caregiverId, page], queryFn: () => memberApi.caregiverReviews(caregiverId, page) });
  const d = q.data;
  const list = page === 1 ? d?.reviews ?? [] : [...more, ...(d?.reviews ?? [])];
  const max = Math.max(1, ...Object.values(d?.summary.distribution ?? {}));

  return (
    <Card className="p-5 mb-4" aria-labelledby="cg-reviews">
      <h2 id="cg-reviews" className="flex items-center gap-1.5 font-bold text-warm-800">
        <MessageSquareText className="w-4 h-4 text-brand-600" /> 보호자 후기
        {d && d.summary.count > 0 && <span className="text-sm font-semibold text-warm-500">{d.summary.count}건</span>}
      </h2>
      {q.isLoading && <p className="mt-3 text-sm text-warm-500">불러오는 중…</p>}
      {q.isError && <p className="mt-3 text-sm text-warm-600">{getApiErrorMessage(q.error)}</p>}
      {d && d.summary.count === 0 && <p className="mt-3 text-sm text-warm-500">아직 후기가 없어요. 첫 케어를 마치면 보호자 후기가 여기에 보여요.</p>}

      {d && d.summary.count > 0 && (
        <>
          <div className="mt-3 flex items-center gap-4">
            <div className="text-center shrink-0">
              <div className="text-3xl font-extrabold tabular-nums text-warm-800">{d.summary.avg?.toFixed(1)}</div>
              <div className="flex justify-center text-amber-500" aria-label={`평균 ${d.summary.avg}점`}>
                {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={"w-3.5 h-3.5 " + (n <= Math.round(d.summary.avg ?? 0) ? "fill-current" : "")} />)}
              </div>
            </div>
            <ul className="flex-1 space-y-1" aria-label="점수 분포">
              {[5, 4, 3, 2, 1].map((r) => {
                const n = d.summary.distribution[r] ?? 0;
                return (
                  <li key={r} className="flex items-center gap-2 text-[12px] text-warm-500">
                    <span className="w-6 tabular-nums">{r}점</span>
                    <span className="h-1.5 flex-1 rounded-full bg-warm-100 overflow-hidden">
                      <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(n / max) * 100}%` }} />
                    </span>
                    <span className="w-5 text-right tabular-nums">{n}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <ul className="mt-4 divide-y divide-warm-100">
            {list.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="inline-flex items-center gap-0.5 font-bold text-amber-500"><Star className="w-3.5 h-3.5 fill-current" />{r.rating}</span>
                  <span className="font-semibold text-warm-700">{r.reviewer}</span>
                  <span className="text-warm-400">· {r.service_label} · {day(r.created_at)}</span>
                </div>
                {r.comment && <p className="mt-1 whitespace-pre-wrap break-words text-[14.5px] text-warm-800">{r.comment}</p>}
                {r.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {r.tags.map((t) => <span key={t} className="rounded-full bg-warm-100 px-2 py-0.5 text-[12px] text-warm-600">{t}</span>)}
                  </div>
                )}
                {r.admin_reply && (
                  <p className="mt-2 rounded-lg bg-warm-50 px-3 py-2 text-[13px] text-warm-700"><b className="text-warm-800">케어앤 답변</b> {r.admin_reply}</p>
                )}
              </li>
            ))}
          </ul>
          {d.meta.page < d.meta.last_page && (
            <Button variant="outline" className="mt-2 w-full" disabled={q.isFetching}
              onClick={() => { setMore(list); setPage(page + 1); }}>
              후기 더 보기
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
