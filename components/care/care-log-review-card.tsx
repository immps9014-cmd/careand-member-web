"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { memberApi } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";

/**
 * 돌봄전문가 일지 검토·수정 (기능 14, 2026-09-29)
 * 퇴근 후 AI 가 만든 보호자용 일지를 보고, 보호자에게 가기 전이면 고칠 수 있다.
 * 고친 일지는 원문 대조를 거치지 않았으므로 운영팀이 확인한 뒤 보호자에게 간다. 위험 없는 일지는 고치지 않으면 자동 전송된다.
 */
export function CareLogReviewCard({ sessionId }: { sessionId: number }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["member", "session-log", sessionId],
    queryFn: () => memberApi.careSessionAiSummary(sessionId),
    retry: false,
    refetchInterval: (query) => (query.state.data ? false : 8000), // 일지 생성 대기 중엔 주기적으로 다시 본다
  });
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const save = useMutation({
    mutationFn: () => memberApi.updateSessionLog(sessionId, text.trim(), reason.trim() || undefined),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? "수정했어요");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["member", "session-log", sessionId] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const d = q.data;
  return (
    <Card className="p-4 mb-5">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-4 h-4 text-brand-600" />
        <h2 className="font-bold text-warm-800 text-sm">오늘 일지 확인</h2>
        {d && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold">
            {d.sent ? (
              <span className="text-brand-700 inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />보호자에게 전송됨</span>
            ) : (
              <span className="text-warn inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />운영팀 확인 중</span>
            )}
          </span>
        )}
      </div>
      {!d && <p className="text-xs text-warm-500">AI 가 일지를 정리하고 있어요. 잠시 후 여기에 나타나요.</p>}
      {d && !editing && (
        <>
          <p className="whitespace-pre-wrap rounded-xl bg-warm-50 px-3 py-2.5 text-sm leading-relaxed text-warm-700">{d.guardian_version}</p>
          {d.edited_at && <p className="mt-1.5 text-[11px] text-warm-500">수정한 일지예요 — 운영팀 확인 후 전달돼요.</p>}
          {d.editable && (
            <Button variant="outline" className="mt-3 w-full" onClick={() => { setText(d.guardian_version ?? ""); setEditing(true); }}>
              내용 고치기
            </Button>
          )}
          {!d.editable && d.sent && <p className="mt-2 text-[11px] text-warm-500">전송된 일지는 고칠 수 없어요. 잘못된 내용이 있으면 운영팀에 알려 주세요.</p>}
        </>
      )}
      {d && editing && (
        <>
          <textarea aria-label="보호자용 일지" value={text} onChange={(e) => setText(e.target.value)} rows={7} maxLength={5000}
            className="w-full rounded-xl border border-warm-200 px-3 py-2.5 text-sm text-warm-700 focus:border-brand-400 focus:outline-none" />
          <input aria-label="고친 이유" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255}
            placeholder="고친 이유 (선택) — 예: 식사량이 잘못 적힘"
            className="mt-2 h-10 w-full rounded-xl border border-warm-200 px-3 text-sm" />
          <p className="mt-1.5 text-[11px] text-warm-500">고친 일지는 운영팀이 확인한 뒤 보호자에게 전달돼요.</p>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>취소</Button>
            <Button variant="brand" className="flex-1" disabled={save.isPending || text.trim().length < 10} onClick={() => save.mutate()}>
              {save.isPending ? "저장 중…" : "고친 내용 저장"}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
