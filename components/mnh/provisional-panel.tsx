"use client";

// 예비 계약 확정 패널(CAREN-REF-01 2단계, 2026-10-10) — 바우처 계약 상세 위쪽.
//   출산 전: 「출산했어요」 → 출산일·분만 방법·아기 등록(confirm-birth) → 제안 개시일 확인 → 확정(confirm-start)
//   출산일·개시일이 2주 이상 바뀌거나 담당 일정이 겹치면 서버가 운영팀 확인 대기로 돌린다(review).
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Baby, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mnhApi, mnhDay, todayKst, type MnhContractDetail } from "@/lib/api/mnh";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const INPUT = "h-12 w-full rounded-xl border border-warm-200 bg-white px-3 text-[16px]";
const LABEL = "mb-1.5 block text-[13.5px] font-bold text-warm-700";
const DELIVERY: [string, string][] = [["natural", "자연분만"], ["cesarean", "제왕절개"], ["vbac", "브이백"]];

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

type Baby = { name: string; gender: "M" | "F"; weight: string };

export function ProvisionalPanel({ c }: { c: MnhContractDetail }) {
  const qc = useQueryClient();
  const today = todayKst();
  const tomorrow = addDays(today, 1);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [type, setType] = useState("natural");
  const [babies, setBabies] = useState<Baby[]>([{ name: "", gender: "F", weight: "" }]);
  const [start, setStart] = useState<string>(c.start_date >= tomorrow ? c.start_date : tomorrow);

  const refresh = () => qc.invalidateQueries({ queryKey: ["member", "mnh"] });

  const birth = useMutation({
    mutationFn: () => mnhApi.confirmBirth(c.postpartum_client_id, {
      delivery_date: date,
      delivery_type: type,
      newborns: babies.filter((b) => b.name.trim() && b.weight).map((b) => ({ name: b.name.trim(), gender: b.gender, birth_weight_g: Number(b.weight) })),
    }),
    onSuccess: (r) => {
      toast.success(r.message);
      const mine = r.data.provisional_contracts.find((k) => k.id === c.id);
      if (mine) setStart(mine.suggested_start);
      setOpen(false);
      refresh();
      qc.invalidateQueries({ queryKey: ["member", "postpartum-clients"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const confirm = useMutation({
    mutationFn: () => mnhApi.confirmStart(c.id, start),
    onSuccess: (r) => { (r.review ? toast.info : toast.success)(r.message); refresh(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (!c.provisional || c.status === "cancelled" || c.status === "completed") return null;

  if (c.start_change_request) {
    const r = c.start_change_request;
    return (
      <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-[13.5px] leading-relaxed text-amber-800" role="status">
        <b>운영팀이 일정을 확인하고 있어요.</b> 요청한 개시일 {mnhDay(r.start_date)} · {r.reason}. 확정되면 알림으로 알려 드려요.
      </div>
    );
  }

  const babiesOk = babies.every((b) => (!b.name.trim() && !b.weight) || (b.name.trim() && Number(b.weight) >= 500 && Number(b.weight) <= 7000));

  return (
    <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-[13.5px] leading-relaxed text-sky-900">
      {!c.birth_confirmed ? (
        <>
          <p>
            <b>출산 전 예비 일정이에요.</b>
            {c.expected_delivery_date && ` 출산 예정일 ${mnhDay(c.expected_delivery_date)} 기준이에요.`} 아기가 태어나면 출산일을 등록해 주세요 — 개시일을 맞춰 확정해요.
          </p>
          {!open ? (
            <Button variant="brand" className="mt-3 w-full rounded-xl" onClick={() => setOpen(true)}><Baby className="h-4 w-4" />출산했어요</Button>
          ) : (
            <div className="mt-3 space-y-3 rounded-xl bg-white p-3 text-warm-800">
              <div>
                <label className={LABEL} htmlFor="pp-birth-date">출산일</label>
                <input id="pp-birth-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} />
              </div>
              <div>
                <span className={LABEL}>분만 방법</span>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="분만 방법">
                  {DELIVERY.map(([k, l]) => (
                    <button key={k} type="button" role="radio" aria-checked={type === k} onClick={() => setType(k)}
                      className={cn("h-11 rounded-xl border text-[14px] font-bold", type === k ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-600")}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <span className={LABEL}>아기(선택)</span>
                {babies.map((b, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-warm-200 p-2">
                    <input aria-label={`아기 ${i + 1} 이름`} placeholder="이름 또는 태명" value={b.name} maxLength={50}
                      onChange={(e) => setBabies((xs) => xs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      className="h-11 min-w-0 flex-1 rounded-lg border border-warm-200 px-2 text-[16px]" />
                    <select aria-label={`아기 ${i + 1} 성별`} value={b.gender}
                      onChange={(e) => setBabies((xs) => xs.map((x, j) => (j === i ? { ...x, gender: e.target.value as "M" | "F" } : x)))}
                      className="h-11 rounded-lg border border-warm-200 px-2 text-[16px]">
                      <option value="F">여아</option><option value="M">남아</option>
                    </select>
                    <input aria-label={`아기 ${i + 1} 체중(g)`} inputMode="numeric" placeholder="체중 g" value={b.weight}
                      onChange={(e) => setBabies((xs) => xs.map((x, j) => (j === i ? { ...x, weight: e.target.value.replace(/[^0-9]/g, "") } : x)))}
                      className="h-11 w-24 rounded-lg border border-warm-200 px-2 text-[16px]" />
                    {babies.length > 1 && (
                      <button type="button" aria-label={`아기 ${i + 1} 빼기`} onClick={() => setBabies((xs) => xs.filter((_, j) => j !== i))}
                        className="grid h-11 w-11 place-items-center text-warm-500"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
                {babies.length < 5 && (
                  <button type="button" onClick={() => setBabies((xs) => [...xs, { name: "", gender: "F", weight: "" }])}
                    className="inline-flex min-h-11 items-center gap-1 text-[13px] font-bold text-brand-600"><Plus className="h-4 w-4" />아기 더 추가(다태아)</button>
                )}
                {!babiesOk && <p className="text-[12.5px] text-danger">아기 이름과 체중(500~7,000g)을 함께 적어 주세요.</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setOpen(false)}>닫기</Button>
                <Button variant="brand" className="flex-1 rounded-xl" disabled={!date || date > today || !babiesOk || birth.isPending} onClick={() => birth.mutate()}>
                  {birth.isPending ? "등록 중…" : "출산일 등록"}
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <p>
            <b>출산일이 등록됐어요{c.delivery_date ? `(${mnhDay(c.delivery_date)})` : ""}.</b> 개시일을 확인하고 확정해 주세요.
            예정일·개시일이 2주 이상 바뀌면 운영팀이 관리사 일정을 확인한 뒤 확정해요.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label className={LABEL} htmlFor="pp-start">서비스 개시일</label>
              <input id="pp-start" type="date" min={tomorrow} value={start} onChange={(e) => setStart(e.target.value)} className={INPUT} />
            </div>
            <Button variant="brand" className="h-12 rounded-xl" disabled={!start || start < tomorrow || confirm.isPending} onClick={() => confirm.mutate()}>
              {confirm.isPending ? "확정 중…" : "이 날짜로 확정"}
            </Button>
          </div>
          <p className="mt-1 text-[12.5px] text-sky-800">조리원을 이용하면 퇴소 다음 날로 골라 주세요. 지금 개시일은 {mnhDay(c.start_date)}예요.</p>
        </>
      )}
    </div>
  );
}
