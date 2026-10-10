"use client";

// 적정 돌봄비 — 신청 전에 돌봄 종류·시간대·시간으로 시간당 적정 금액을 미리 본다(앱 /price 와 같은 화면, 2026-10-10).
// 백엔드 GET matching/pricing/estimate(신청 화면과 같은 산출, 저장 안 함). 지역 가산은 대상 주소가 있어야 해 신청 단계에서 반영된다.
// 산모신생아는 시간당이 아니라 바우처 본인부담 / 일반 이용 기간 금액으로 보여 준다(VoucherGuide, CAREN-REF-01 후속).
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useServiceDomains, FALLBACK_DOMAINS } from "@/lib/serviceDomains";
import { memberApi } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { won } from "@/lib/api/mnh";
import { VoucherGuide } from "@/components/mnh/voucher-guide";
import { cn } from "@/lib/utils";

const LABEL = "mb-2 block text-[15px] font-bold text-warm-800";
const DURATIONS = [120, 180, 240, 480, 720, 1440];

function Chips({ options, value, onChange, label }: { options: [string, string][]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {options.map(([k, v]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
          className={cn("min-h-11 rounded-xl border px-3.5 text-[14px] font-bold transition-colors",
            value === k ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-600")}>
          {v}
        </button>
      ))}
    </div>
  );
}

/** 한국시각 "YYYY-MM-DDTHH:mm" (datetime-local 값) */
function kstLocal(d: Date): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

const hours = (m: number) => (m === 1440 ? "24시간" : m % 60 === 0 ? `${m / 60}시간` : `${Math.floor(m / 60)}시간 ${m % 60}분`);

export default function PricePageWrapper() {
  return (
    <Suspense fallback={null}>
      <PricePage />
    </Suspense>
  );
}

function PricePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const ds = useServiceDomains();
  const domains = ds.data?.length ? ds.data : FALLBACK_DOMAINS;
  const [domain, setDomain] = useState<string>(() => sp.get("domain") ?? "");
  useEffect(() => { if (!domain && domains.length) setDomain(domains[0].token); }, [domain, domains]);
  const d = domains.find((x) => x.token === domain);
  const cats = d?.categories ?? [];
  const [cat, setCat] = useState<number | null>(null);
  useEffect(() => { if (cats.length && !cats.some((c) => c.id === cat)) setCat(cats[0].id); }, [cats, cat]);

  const tomorrow9 = useMemo(() => `${kstLocal(new Date(Date.now() + 86_400_000)).slice(0, 10)}T09:00`, []);
  const [start, setStart] = useState(tomorrow9);
  const [minutes, setMinutes] = useState(240);
  const [emergency, setEmergency] = useState(false);

  const postpartum = domain === "postpartum";
  const est = useQuery({
    queryKey: ["member", "price", domain, cat, start, minutes, emergency],
    queryFn: () => memberApi.pricingEstimate({ service_domain: domain, category_id: cat!, mode: emergency ? "emergency" : "normal", scheduled_start: `${start}:00+09:00`, duration_min: minutes }),
    enabled: !postpartum && !!domain && !!cat && !!start,
    staleTime: 60_000,
  });
  const e = est.data;
  const extras = [e?.inputs?.is_night && "야간 가산", e?.inputs?.is_holiday && "휴일 가산", e?.inputs?.is_emergency && "긴급 가산"].filter(Boolean) as string[];

  return (
    <div className="px-4 pt-4 pb-10 lg:mx-auto lg:max-w-3xl">
      <button onClick={() => router.back()} className="mb-2 flex min-h-11 items-center gap-1 text-sm text-warm-500"><ChevronLeft className="h-4 w-4" />뒤로</button>
      <h1 className="text-xl font-extrabold tracking-tight text-warm-800">적정 돌봄비</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-warm-500">
        {postpartum ? "바우처를 쓰는지에 따라 내 돈이 얼마인지 계산해요. 신청 전에 미리 확인해 보세요." : "돌봄 종류와 시간을 고르면 시간당 적정 금액을 계산해요. 신청 전에 미리 확인해 보세요."}
      </p>

      <Card className="mt-4 p-4">
        <span className={LABEL}>돌봄 종류</span>
        <Chips label="돌봄 종류" value={domain} onChange={(v) => { setDomain(v); setCat(null); }} options={domains.map((x) => [x.token, x.label])} />
      </Card>

      {postpartum ? (
        <div className="mt-4"><VoucherGuide applyHref="/mnh" /></div>
      ) : (
        <Card className="mt-4 space-y-5 p-4">
          {cats.length > 1 && (
            <div>
              <span className={LABEL}>서비스</span>
              <Chips label="서비스" value={String(cat ?? "")} onChange={(v) => setCat(Number(v))} options={cats.map((c) => [String(c.id), c.name])} />
            </div>
          )}
          <div>
            <label className={LABEL} htmlFor="price-start">언제</label>
            <input id="price-start" type="datetime-local" value={start} min={kstLocal(new Date())} onChange={(ev) => setStart(ev.target.value)}
              className="h-12 w-full rounded-xl border border-warm-200 bg-white px-3 text-[16px]" />
            <p className="mt-1 text-[12.5px] text-warm-500">밤 10시~아침 6시가 걸치거나 일요일·공휴일이면 가산돼요.</p>
          </div>
          <div>
            <span className={LABEL}>얼마나</span>
            <Chips label="이용 시간" value={String(minutes)} onChange={(v) => setMinutes(Number(v))} options={DURATIONS.map((m) => [String(m), hours(m)])} />
          </div>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
            <span className="text-[15px] font-bold text-warm-800">급하게 필요해요(긴급)</span>
            <input type="checkbox" checked={emergency} onChange={(ev) => setEmergency(ev.target.checked)} className="h-5 w-5 accent-brand-500" />
          </label>

          {est.isError ? (
            <p className="rounded-xl bg-warm-50 p-4 text-sm text-warm-600">{getApiErrorMessage(est.error)}</p>
          ) : !e ? (
            <p className="rounded-xl bg-warm-50 p-4 text-sm text-warm-500">계산 중…</p>
          ) : (
            <div className="rounded-xl bg-amber-50 p-4" aria-live="polite">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[15px] text-warm-600">시간당</span>
                <span className="text-[28px] font-extrabold tabular-nums text-warm-800">{won(e.suggested)}</span>
              </div>
              <p className="text-[13.5px] text-warm-600">보통 {won(e.floor)} ~ {won(e.ceil)}</p>
              <p className="mt-2 text-[15px] font-bold text-warm-800">{hours(minutes)}이면 약 {won(Math.round((e.suggested * minutes) / 60 / 100) * 100)}</p>
              {extras.length > 0 && <p className="mt-1 text-[13px] text-amber-800">{extras.join(" · ")} 반영</p>}
              <p className="mt-2 text-[12px] text-warm-500">지역 가산은 돌봄 받는 분 주소를 넣는 신청 단계에서 반영돼요.</p>
            </div>
          )}
          <Link href={`/request/new?domain=${domain}`} className="block">
            <Button variant="brand" size="lg" className="w-full rounded-2xl">이 돌봄 신청하기</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
