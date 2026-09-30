"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { memberApi, type ReviewableCare } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { domainLabel } from "@/lib/caregiverType";

// 만족도 빠른 선택 태그(긍정)
const PRESET_TAGS = ["친절해요", "시간 약속을 잘 지켜요", "전문적이에요", "소통이 잘 돼요", "청결하게 관리해요", "안심이 돼요"];

const stripName = (s: string) => s.replace(/^\[.*?\]\s*/, "");
function fmtDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function SatisfactionPage() {
  const q = useQuery({
    queryKey: ["member", "reviewable"],
    queryFn: () => memberApi.reviewableCares(),
    retry: false,
  });
  const list = q.data ?? [];

  return (
    <div className="px-4 pt-4 pb-6 lg:mx-auto lg:max-w-3xl">
      <h1 className="text-xl font-extrabold tracking-tight text-warm-800">케어 만족도</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-warm-500">
        완료된 케어에 대해 돌봄전문가 만족도를 남겨주세요. 다른 보호자의 선택에도 도움이 돼요.
      </p>

      {q.isLoading && <Card className="mt-5 p-8 text-center text-sm text-warm-500">불러오는 중…</Card>}

      {!q.isLoading && q.isError && (
        <Card className="mt-5 p-8 text-center">
          <p className="mb-4 text-sm text-warm-500">목록을 불러오지 못했습니다.</p>
          <Button variant="outline" size="sm" onClick={() => q.refetch()}>다시 시도</Button>
        </Card>
      )}

      {!q.isLoading && !q.isError && list.length === 0 && (
        <Card className="mt-5 p-8 text-center text-sm text-warm-500">
          평가할 완료된 케어가 아직 없어요.
          <br />
          돌봄이 끝나면 이곳에서 만족도를 남길 수 있어요.
        </Card>
      )}

      <div className="mt-5 space-y-4">
        {list.map((c) => (
          <ReviewCard key={c.match_id} care={c} />
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ care }: { care: ReviewableCare }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(care.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(care.comment ?? "");
  const [tags, setTags] = useState<string[]>(care.tags ?? []);
  const [scores, setScores] = useState<Record<string, number>>(care.scores ?? {});

  const submit = useMutation({
    mutationFn: () => memberApi.submitReview({ match_id: care.match_id, rating, comment: comment || undefined, tags, scores }),
    onSuccess: () => {
      toast.success("케어 만족도가 등록되었어요");
      qc.invalidateQueries({ queryKey: ["member", "reviewable"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const toggleTag = (t: string) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <Card className="p-4 lg:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-warm-800">{stripName(care.caregiver_name)}</div>
          <div className="mt-0.5 text-xs text-warm-500">
            {domainLabel(care.service_domain)} · {care.recipient_name}
            {fmtDate(care.scheduled_start) ? ` · ${fmtDate(care.scheduled_start)}` : ""}
          </div>
        </div>
        {care.reviewed && (
          <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-bold text-brand-600">평가 완료</span>
        )}
      </div>

      {/* 별점 */}
      <div className="mt-3 flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n}점`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            className="p-2"
          >
            <Star
              className={`h-7 w-7 transition-colors ${(hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-warm-500"}`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm font-bold text-warm-600">{rating ? `${rating}.0` : "평점 선택"}</span>
      </div>

      {/* 서비스별 평가 항목(선택) */}
      {care.criteria?.length > 0 && (
        <div className="mt-3 rounded-xl bg-warm-50 px-3 py-2">
          <p className="mb-1 text-xs font-semibold text-warm-600">항목별 평가 (선택)</p>
          {care.criteria.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-2">
              <span className="text-sm text-warm-700">{c.label}</span>
              <div className="flex" role="radiogroup" aria-label={`${c.label} 점수`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={scores[c.key] === n}
                    aria-label={`${c.label} ${n}점`}
                    onClick={() => setScores((p) => ({ ...p, [c.key]: n }))}
                    className="p-1.5"
                  >
                    <Star className={`h-5 w-5 ${(scores[c.key] ?? 0) >= n ? "fill-amber-400 text-amber-400" : "text-warm-400"}`} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 빠른 태그 */}
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESET_TAGS.map((t) => {
          const on = tags.includes(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggleTag(t)}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
                (on ? "border-brand-500 bg-brand-500 text-white" : "border-warm-300 bg-white text-warm-600 hover:border-brand-300")
              }
            >
              {on && "✓ "}
              {t}
            </button>
          );
        })}
      </div>

      {/* 코멘트 */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="더 남기고 싶은 의견이 있다면 적어주세요 (선택)"
        className="mt-3 w-full resize-none rounded-xl border border-warm-200 px-3 py-2.5 text-sm text-warm-700 placeholder:text-warm-500 focus:border-brand-400 focus:outline-none"
      />

      <Button
        variant="brand"
        size="lg"
        className="mt-3 w-full"
        disabled={rating < 1 || submit.isPending}
        onClick={() => submit.mutate()}
      >
        {submit.isPending ? "등록 중…" : care.reviewed ? "평가 수정" : "만족도 등록"}
      </Button>
    </Card>
  );
}
