"use client";

// 바우처 계약 신청 — 지원 유형·기간을 고르면 본인부담금을 안내한다(CAREN-MNH-01 2단계, 2026-10-05).
// 산모는 신청 폼(/request/new?domain=postpartum&mode=voucher)에서 정하고 ?client= 로 넘어온다.
// 금액은 운영자가 입력한 그 해 복지부 고시 기준표(mnh_support_types)에서만 나온다 — 기준표가 없으면 일수만 받고 운영팀이 안내.
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { memberApi } from "@/lib/api/member";
import { mnhApi, mnhDay, todayKst, won } from "@/lib/api/mnh";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const LABEL = "mb-2 block text-[14px] font-bold text-warm-700";

function Chips({ options, value, onChange, label }: { options: [string, string][]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {options.map(([k, v]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          onClick={() => onChange(k)}
          className={cn(
            "min-h-11 rounded-xl border px-3.5 text-[14px] font-bold transition-colors",
            value === k ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-600",
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function MnhNewPageWrapper() {
  return (
    <Suspense fallback={null}>
      <MnhNewPage />
    </Suspense>
  );
}

function MnhNewPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const clients = useQuery({ queryKey: ["member", "postpartum-clients"], queryFn: () => memberApi.postpartumClients() });
  const [clientId, setClientId] = useState<number | null>(() => {
    const v = sp.get("client");
    return v && /^\d+$/.test(v) ? Number(v) : null;
  });
  useEffect(() => {
    if (clientId === null && clients.data?.length) setClientId((clients.data.find((c) => c.is_self) ?? clients.data[0]).id);
  }, [clients.data, clientId]);
  const client = clients.data?.find((c) => c.id === clientId);

  const tomorrow = addDays(todayKst(), 1);
  const [start, setStart] = useState(tomorrow);
  const year = Number((start || tomorrow).slice(0, 4));
  const opts = useQuery({ queryKey: ["member", "mnh", "options", year], queryFn: () => mnhApi.options(year) });
  const o = opts.data;

  const [fetus, setFetus] = useState("single");
  const [order, setOrder] = useState("first");
  const [tier, setTier] = useState("");
  const [period, setPeriod] = useState("");
  const [days, setDays] = useState(10);
  const [pay, setPay] = useState("cash");
  const [note, setNote] = useState("");

  // 고른 태아·순위에 맞는 기준표 행(순위 무관 행 포함)
  const candidates = useMemo(
    () => (o?.support_types ?? []).filter((r) => r.fetus_type === fetus && (r.birth_order === order || r.birth_order === "any")),
    [o, fetus, order],
  );
  const tiers = Array.from(new Set(candidates.map((r) => r.income_tier)));
  const periods = candidates.filter((r) => r.income_tier === tier);
  const chosen = periods.find((r) => r.period === period) ?? null;
  useEffect(() => { if (tier && !tiers.includes(tier)) setTier(""); }, [tiers, tier]);
  useEffect(() => { if (period && !periods.some((r) => r.period === period)) setPeriod(""); }, [periods, period]);

  const ratesReady = !!o?.rates_ready && candidates.length > 0;
  const valid = !!clientId && start >= tomorrow && (ratesReady ? !!chosen : days >= (o?.min_days ?? 5) && days <= (o?.max_days ?? 40));

  const submit = useMutation({
    mutationFn: () =>
      mnhApi.create({
        postpartum_client_id: clientId!,
        start_date: start,
        fetus_type: fetus,
        birth_order: order,
        ...(ratesReady && chosen ? { income_tier: chosen.income_tier, period: chosen.period } : { days }),
        payment_method: pay,
        ...(note.trim() ? { member_note: note.trim() } : {}),
      }),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["member", "mnh"] });
      router.replace(`/mnh/${r.data.id}`);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (clients.isSuccess && clients.data.length === 0) {
    return (
      <div className="px-4 pt-4 lg:mx-auto lg:max-w-3xl">
        <Card className="p-6 text-center">
          <p className="text-sm text-warm-600">산모 정보를 먼저 등록해야 해요.</p>
          <Link href="/request/new?domain=postpartum&mode=voucher" className="mt-3 inline-block text-sm font-bold text-brand-600 underline">산모 정보 입력하러 가기</Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6 lg:mx-auto lg:max-w-3xl">
      <h1 className="text-xl font-extrabold tracking-tight text-warm-800">바우처 계약 신청</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-warm-500">
        정부지원 유형과 기간을 고르면 본인부담금이 계산돼요. 본인부담금은 서비스 시작 전에 케어앤(제공기관)에 먼저 내고, 나머지는 바우처 카드로 결제돼요.
      </p>

      <Card className="mt-4 space-y-5 p-4">
        <div>
          <span className={LABEL}>산모</span>
          {(clients.data?.length ?? 0) > 1 ? (
            <Chips label="산모" value={String(clientId ?? "")} onChange={(v) => setClientId(Number(v))}
              options={clients.data!.map((c) => [String(c.id), c.is_self ? `${c.name} (본인)` : c.name])} />
          ) : (
            <p className="text-[15px] font-bold text-warm-800">{client ? `${client.name}${client.is_self ? " (본인)" : ""}` : "불러오는 중…"}</p>
          )}
          {client?.delivery_date && <p className="mt-1 text-[13px] text-warm-500">출산(예정)일 {mnhDay(client.delivery_date)}</p>}
        </div>

        <div>
          <label className={LABEL} htmlFor="mnh-start">서비스 개시일</label>
          <input id="mnh-start" type="date" min={tomorrow} value={start} onChange={(e) => setStart(e.target.value)}
            className="h-12 w-full rounded-xl border border-warm-200 bg-white px-3 text-[15px]" />
          <p className="mt-1 text-[12.5px] text-warm-500">조리원을 이용하면 퇴소 다음 날로 골라 주세요. 평일 매일 방문하고 공휴일은 운영팀이 연기해 드려요.</p>
        </div>

        {o && (
          <>
            <div>
              <span className={LABEL}>태아 유형</span>
              <Chips label="태아 유형" value={fetus} onChange={setFetus} options={Object.entries(o.fetus_types)} />
            </div>
            <div>
              <span className={LABEL}>출산 순위</span>
              <Chips label="출산 순위" value={order} onChange={setOrder} options={Object.entries(o.birth_orders).filter(([k]) => k !== "any")} />
            </div>

            {ratesReady ? (
              <>
                <div>
                  <span className={LABEL}>지원 유형(소득 구간)</span>
                  <Chips label="지원 유형" value={tier} onChange={setTier} options={tiers.map((t) => [t, t])} />
                  <p className="mt-1 text-[12.5px] text-warm-500">보건소·복지로에서 받은 바우처 결정 통지의 유형을 골라 주세요.</p>
                </div>
                {tier && (
                  <div>
                    <span className={LABEL}>기간</span>
                    <Chips label="기간" value={period} onChange={setPeriod}
                      options={periods.map((r) => [r.period, `${o.periods[r.period] ?? r.period} ${r.days}일`])} />
                  </div>
                )}
                {chosen && (
                  <div className="rounded-xl bg-brand-50 p-4" aria-live="polite">
                    <div className="flex justify-between text-[14px] text-warm-600"><span>서비스 가격</span><span>{won(chosen.total_price)}</span></div>
                    <div className="flex justify-between text-[14px] text-warm-600"><span>정부지원금(바우처)</span><span>- {won(chosen.gov_support)}</span></div>
                    <div className="mt-2 flex justify-between border-t border-brand-200 pt-2 text-[16px] font-extrabold text-brand-700"><span>본인부담금</span><span>{won(chosen.self_pay)}</span></div>
                    <p className="mt-1 text-[12px] text-warm-500">{o.year}년 보건복지부 고시 기준 · {chosen.days}일</p>
                  </div>
                )}
              </>
            ) : (
              <div>
                <span className={LABEL}>이용 일수</span>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="icon" aria-label="하루 줄이기" onClick={() => setDays((d) => Math.max(o.min_days, d - 1))}><Minus /></Button>
                  <span className="w-16 text-center text-xl font-extrabold text-warm-800">{days}일</span>
                  <Button type="button" variant="outline" size="icon" aria-label="하루 늘리기" onClick={() => setDays((d) => Math.min(o.max_days, d + 1))}><Plus /></Button>
                </div>
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] leading-relaxed text-amber-800">
                  {o.year}년 지원 유형 기준표가 아직 등록되지 않았어요. 바우처 결정 통지의 일수를 골라 주시면, 본인부담금은 운영팀이 확인해 안내해 드려요.
                </p>
              </div>
            )}

            <div>
              <span className={LABEL}>본인부담금 납부 방법</span>
              <Chips label="납부 방법" value={pay} onChange={setPay} options={Object.entries(o.payment_methods)} />
            </div>
          </>
        )}

        <div>
          <label className={LABEL} htmlFor="mnh-note">운영팀에 전할 말(선택)</label>
          <textarea id="mnh-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="조리원 퇴소일, 원하는 방문 시간 등"
            className="w-full rounded-xl border border-warm-200 bg-white p-3 text-[15px]" />
        </div>
      </Card>

      <div className="mt-4">
        <Button variant="brand" size="lg" className="w-full rounded-2xl" disabled={!valid || submit.isPending} onClick={() => submit.mutate()}>
          {submit.isPending ? "신청 중…" : "계약 신청"}
        </Button>
      </div>
    </div>
  );
}
