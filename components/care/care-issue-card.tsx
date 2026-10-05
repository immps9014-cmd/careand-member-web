"use client";

// 돌봄전문가 교체 요청·신고(2026-10-05) — 매칭된 요청 화면 하단. 운영팀(CS)이 확인하고 답변하면 알림이 온다.
// 실제 교체(남은 일정 재배정)는 운영팀이 처리한다. 같은 종류가 처리 중이면 새로 받지 않는다.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flag, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { memberApi, type IssueKind } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const STATUS_CLS: Record<string, string> = {
  open: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  resolved: "bg-brand-50 text-brand-700",
  rejected: "bg-warm-100 text-warm-600",
};
const day = (iso: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

export function CareIssueCard({ requestId }: { requestId: number }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["member", "care-issues", requestId], queryFn: () => memberApi.careIssues(requestId) });
  const [kind, setKind] = useState<IssueKind | null>(null);
  const [category, setCategory] = useState("");
  const [detail, setDetail] = useState("");
  const send = useMutation({
    mutationFn: () => memberApi.reportCareIssue(requestId, { kind: kind!, category, detail: detail.trim() }),
    onSuccess: (msg) => {
      toast.success(msg);
      setKind(null); setCategory(""); setDetail("");
      qc.invalidateQueries({ queryKey: ["member", "care-issues", requestId] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const d = q.data;
  if (!d || (!d.can_report && d.issues.length === 0)) return null;

  return (
    <Card className="mt-6 p-5" aria-labelledby="issue-title">
      <h2 id="issue-title" className="font-bold text-warm-800">돌봄전문가 교체·신고</h2>
      <p className="mt-1 text-[13px] text-warm-500">
        맞지 않거나 문제가 있었다면 알려 주세요. 케어앤 운영팀이 확인하고 답변드려요. 돌봄전문가에게는 누가 남겼는지 알리지 않아요.
      </p>

      {d.issues.length > 0 && (
        <ul className="mt-3 space-y-2">
          {d.issues.map((i) => (
            <li key={i.id} className="rounded-xl border border-warm-100 px-3.5 py-3">
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className={cn("rounded-full px-2 py-0.5 font-bold", STATUS_CLS[i.status])}>{i.status_label}</span>
                <span className="font-bold text-warm-800">{i.kind_label}</span>
                <span className="text-warm-500">· {i.category_label} · {day(i.created_at)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-[14px] text-warm-700">{i.detail}</p>
              {i.admin_reply && (
                <p className="mt-2 rounded-lg bg-warm-50 px-3 py-2 text-[13.5px] text-warm-800"><b>운영팀 답변</b> {i.admin_reply}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {d.can_report && !kind && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setKind("replace")}><RefreshCw className="w-4 h-4" />교체 요청</Button>
          <Button variant="outline" className="text-danger border-danger/30" onClick={() => setKind("report")}><Flag className="w-4 h-4" />신고</Button>
        </div>
      )}

      {kind && (
        <form className="mt-3 grid gap-3" aria-label={d.kinds[kind]} onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
          <p className="text-[14px] font-bold text-warm-800">{d.kinds[kind]}</p>
          <div role="group" aria-label="사유" className="flex flex-wrap gap-1.5">
            {Object.entries(d.categories).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={category === k} onClick={() => setCategory(k)}
                className={cn("h-10 rounded-xl border px-3 text-[14px] font-semibold",
                  category === k ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-700")}>
                {l}
              </button>
            ))}
          </div>
          <label>
            <span className="mb-1.5 block text-[13px] font-bold text-warm-600">어떤 일이 있었나요?</span>
            <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={4} maxLength={2000}
              placeholder={kind === "replace" ? "예: 아이를 대하는 방식이 저희 집과 잘 맞지 않아요." : "예: 약속한 시간보다 40분 늦게 왔어요."}
              className="w-full rounded-xl border border-warm-200 bg-white px-3.5 py-3 text-[16px] text-warm-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </label>
          {kind === "report" && category === "safety" && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700" role="alert">
              지금 위험한 상황이면 먼저 112·119에 신고해 주세요.
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setKind(null)}>취소</Button>
            <Button type="submit" variant="brand" className="flex-1" disabled={!category || detail.trim().length < 5 || send.isPending}>
              {send.isPending ? "보내는 중…" : "보내기"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
