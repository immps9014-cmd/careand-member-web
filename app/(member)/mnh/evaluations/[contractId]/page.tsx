"use client";

// 돌봄전문가 → 이용자 평가(수시·종료) — CAREN-MNH-01 4단계
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mnhEvalApi } from "@/lib/api/mnh";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const SCORE = ["", "매우 미흡", "미흡", "보통", "좋음", "매우 좋음"];

export default function ClientEvalPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const id = Number(contractId);
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["member", "mnh", "client-eval", id], queryFn: () => mnhEvalApi.form(id) });
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [timing, setTiming] = useState<"interim" | "final" | null>(null);
  const d = q.data;
  const t = timing ?? (d?.can_final && !d.mine.some((m) => m.timing === "final") ? "final" : "interim");
  const save = useMutation({
    mutationFn: () => mnhEvalApi.submit(id, { scores, comment: comment.trim() || undefined, timing: t }),
    onSuccess: (r) => { toast.success(r.message); setScores({}); setComment(""); qc.invalidateQueries({ queryKey: ["member", "mnh"] }); window.scrollTo({ top: 0 }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="px-4 pt-4 pb-6 lg:mx-auto lg:max-w-3xl">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-warm-500"><ArrowLeft className="h-4 w-4" />뒤로</button>
      {q.isError && <p className="mt-4 text-sm">{getApiErrorMessage(q.error)}</p>}
      {d && (
        <>
          <h1 className="mt-2 text-xl font-extrabold tracking-tight text-warm-800">{d.client_name ?? "산모"} 님 가정 평가</h1>
          <p className="mt-1 text-[13px] text-warm-500">{d.contract_no} · 이용자에게는 보이지 않아요.</p>

          <Card className="mt-4 space-y-5 p-4">
            <fieldset>
              <legend className="mb-1.5 text-[14px] font-bold text-warm-700">평가 시점</legend>
              <div className="flex gap-2" role="radiogroup" aria-label="평가 시점">
                {(["interim", "final"] as const).map((k) => {
                  const disabled = k === "final" && !d.can_final;
                  return (
                    <button key={k} type="button" role="radio" aria-checked={t === k} disabled={disabled} onClick={() => setTiming(k)}
                      className={cn("min-h-11 flex-1 rounded-xl border text-[14px] font-bold disabled:opacity-40", t === k ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-600")}>
                      {k === "interim" ? "수시" : "종료"}
                    </button>
                  );
                })}
              </div>
              {!d.can_final && <p className="mt-1 text-[12.5px] text-warm-500">종료 평가는 내 방문이 모두 끝난 뒤에 할 수 있어요.</p>}
            </fieldset>
            {d.items.map((it) => (
              <fieldset key={it.key}>
                <legend className="mb-1.5 text-[14px] font-bold text-warm-700">{it.label}</legend>
                <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={it.label}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={scores[it.key] === n} onClick={() => setScores((s) => ({ ...s, [it.key]: n }))}
                      className={cn("min-h-12 rounded-xl border text-[15px] font-bold", scores[it.key] === n ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-600")}>
                      {n}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[12px] text-warm-500">{scores[it.key] ? SCORE[scores[it.key]] : "1 매우 미흡 ~ 5 매우 좋음"}</p>
              </fieldset>
            ))}
            <label className="block">
              <span className="mb-1.5 block text-[14px] font-bold text-warm-700">기타사항(선택)</span>
              <textarea rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} className="w-full rounded-xl border border-warm-200 bg-white p-3 text-[15px]" />
            </label>
            <Button variant="brand" size="lg" className="w-full rounded-2xl" disabled={!d.items.every((i) => scores[i.key]) || save.isPending} onClick={() => save.mutate()}>
              {t === "final" && d.mine.some((m) => m.timing === "final") ? "종료 평가 고치기" : "평가 남기기"}
            </Button>
          </Card>

          {d.mine.length > 0 && (
            <Card className="mt-4 p-4">
              <h2 className="text-[15px] font-bold text-warm-800">내가 남긴 평가</h2>
              <ul className="mt-2 divide-y divide-warm-100">
                {d.mine.map((m) => (
                  <li key={m.id} className="py-2 text-[13.5px]">
                    <span className="font-bold text-warm-800">{m.timing_label}</span> <span className="text-warm-500">{m.updated_at.slice(0, 10)}</span>
                    <p className="text-warm-600">{m.items.map((i) => `${i.label} ${i.score}`).join(" · ")}</p>
                    {m.comment && <p className="text-warm-600">“{m.comment}”</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
