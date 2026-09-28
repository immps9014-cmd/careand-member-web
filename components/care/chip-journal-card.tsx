"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ListChecks, AlertTriangle, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { memberApi, type JournalChip } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/**
 * 칩으로 빠르게 기록하기 (기능 40, 2026-09-28 S5)
 * 누른 칩은 퇴근 때 「칩 → 온톨로지 조회 → 정규화 → AI 조립」으로 보호자용 일지가 된다.
 * 안전 알림 칩(빨간색)은 저장하면 일지 생성 때 보호자·운영팀에 바로 알림이 간다.
 */
export function ChipJournalCard({ sessionId, status }: { sessionId: number; status?: string }) {
  const qc = useQueryClient();
  const catalog = useQuery({ queryKey: ["member", "journal-chips"], queryFn: memberApi.journalChips, staleTime: 10 * 60_000 });
  const saved = useQuery({ queryKey: ["member", "session-chips", sessionId], queryFn: () => memberApi.sessionChips(sessionId) });

  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (saved.data && !dirty) {
      setPicked(saved.data.chips);
      setNote(saved.data.note ?? "");
    }
  }, [saved.data, dirty]);

  const groups = useMemo(() => {
    const m = new Map<string, { label: string; order: number; chips: JournalChip[] }>();
    for (const c of catalog.data ?? []) {
      const g = m.get(c.category) ?? { label: c.category_label, order: c.category_order, chips: [] };
      g.chips.push(c);
      m.set(c.category, g);
    }
    return [...m.values()].sort((a, b) => a.order - b.order);
  }, [catalog.data]);

  const save = useMutation({
    mutationFn: () => memberApi.saveSessionChips(sessionId, picked, note.trim() || null),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? "저장했어요");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["member", "session-chips", sessionId] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const editable = (status === "in_progress" || status === "completed") && !saved.data?.locked;
  const toggle = (code: string) => {
    if (!editable) return;
    setDirty(true);
    setPicked((p) => (p.includes(code) ? p.filter((x) => x !== code) : [...p, code]));
  };
  const alertPicked = (catalog.data ?? []).filter((c) => c.alert && picked.includes(c.code));

  return (
    <Card className="p-4 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <ListChecks className="w-4 h-4 text-brand-600" />
        <h2 className="font-bold text-warm-800 text-sm">칩으로 빠르게 기록</h2>
        {picked.length > 0 && <span className="ml-auto text-xs font-semibold text-brand-700">{picked.length}개 선택</span>}
      </div>
      <p className="text-xs text-warm-500 mb-3">해당하는 항목을 누르면 퇴근 후 보호자용 일지로 정리돼요.</p>

      {saved.data?.locked && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-warm-50 px-3 py-2 text-xs text-warm-600">
          <Lock className="h-3.5 w-3.5" /> 보호자에게 이미 전송된 일지라 수정할 수 없어요.
        </div>
      )}
      {catalog.isLoading && <p className="text-center text-xs text-warm-500 py-4">불러오는 중…</p>}
      {catalog.isError && <p className="text-center text-xs text-danger py-4">{getApiErrorMessage(catalog.error)}</p>}

      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="mb-1.5 text-[12px] font-bold text-warm-600">{g.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {g.chips.map((c) => {
                const on = picked.includes(c.code);
                const isAlert = !!c.alert;
                return (
                  <button
                    key={c.code}
                    type="button"
                    aria-pressed={on}
                    disabled={!editable}
                    onClick={() => toggle(c.code)}
                    className={cn(
                      "min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60",
                      on
                        ? isAlert ? "border-red-600 bg-red-600 text-white" : "border-brand-500 bg-brand-500 text-white"
                        : isAlert ? "border-red-200 bg-red-50 text-red-700" : "border-warm-300 bg-white text-warm-700",
                    )}
                  >
                    {on && "✓ "}
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {alertPicked.length > 0 && (
        <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="mt-px h-3.5 w-3.5 flex-none" />
          {alertPicked.map((c) => c.label).join(", ")} — 일지가 만들어지면 보호자와 운영팀에 바로 알림이 가요. 응급이면 119에 먼저 연락하세요.
        </div>
      )}

      {groups.length > 0 && (
        <>
          <textarea
            value={note}
            disabled={!editable}
            onChange={(e) => { setNote(e.target.value); setDirty(true); }}
            rows={2}
            maxLength={500}
            placeholder="칩으로 표현이 안 되는 내용이 있으면 짧게 적어 주세요 (선택)"
            className="mt-3 w-full resize-none rounded-xl border border-warm-200 px-3 py-2.5 text-sm text-warm-700 placeholder:text-warm-500 focus:border-brand-400 focus:outline-none disabled:bg-warm-50"
          />
          <Button variant="brand" className="mt-2 w-full" disabled={!editable || !dirty || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "저장 중…" : "칩 기록 저장"}
          </Button>
        </>
      )}
    </Card>
  );
}
