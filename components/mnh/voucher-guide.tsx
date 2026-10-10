"use client";

// 산모신생아 바우처 안내·본인부담 계산기(CAREN-REF-01 1단계, 2026-10-10).
// 안내 표·계산기·신청 화면이 모두 같은 기준표(GET /v1/public/mnh/guide)를 읽는다 — 화면에 금액을 따로 적지 않는다.
// 로그인 없이 열린다(/voucher-guide). 최종 유형은 보건소 바우처 결정 통지가 기준.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Calculator, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mnhApi, MNH_BANDS, MNH_STAFF, parseTier, todayKst, won, type MnhSupportType } from "@/lib/api/mnh";
import { getApiErrorMessage } from "@/lib/api/client";
import { contentsApi } from "@/lib/api/contents";
import { ContentBlocks, NoticeCard } from "@/components/content-blocks";
import { cn } from "@/lib/utils";

const LABEL = "mb-2 block text-[14px] font-bold text-warm-700";
const H2 = "text-[17px] font-extrabold tracking-tight text-warm-800";

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

const PREMIUM_KINDS: [string, string][] = [["employee", "직장가입자"], ["regional", "지역가입자"], ["mixed", "혼합(직장+지역)"]];

/** 단태아는 출산순위, 쌍태아 이상은 제공인력 수로 ①②③ 이 갈린다 */
function subLabel(r: MnhSupportType, birthOrders: Record<string, string>): string {
  const t = parseTier(r.income_tier);
  if (r.fetus_type === "single") return birthOrders[r.birth_order] ?? r.birth_order;
  const staff = t ? MNH_STAFF[t.group]?.[t.no] : undefined;
  return staff ? `인력 ${staff}명` : r.income_tier;
}

export function VoucherGuide({ applyHref }: { applyHref: string }) {
  const year = Number(todayKst().slice(0, 4));
  const q = useQuery({ queryKey: ["public", "mnh", "guide", year], queryFn: () => mnhApi.guide(year) });
  const g = q.data;
  const rows = useMemo(() => g?.support_types ?? [], [g]);
  // 안내 문구·지역 공지는 관리자 「안내 콘텐츠」에서(CAREN-REF-01 3단계) — 못 받으면 아래 기준 문구
  const notesQ = useQuery({ queryKey: ["public", "contents", "voucher_guide"], queryFn: () => contentsApi.list({ placement: "voucher_guide", domain: "postpartum" }), staleTime: 10 * 60_000, retry: false });
  const noticeQ = useQuery({ queryKey: ["public", "contents", "notice", "postpartum"], queryFn: () => contentsApi.list({ kind: "notice", domain: "postpartum" }), staleTime: 10 * 60_000, retry: false });

  // ── 계산기 선택 ──
  const fetusOptions = useMemo(
    () => Object.entries(g?.fetus_types ?? {}).filter(([k]) => rows.some((r) => r.fetus_type === k)),
    [g, rows],
  );
  const [fetus, setFetus] = useState("single");
  const [sub, setSub] = useState("");          // 단태아: birth_order / 그 외: "①"번호
  const [band, setBand] = useState("통합");
  // 바우처를 쓸지 — 쓸 거예요(고시 본인부담) / 안 써요(케어앤 일반 요금) / 잘 모르겠어요(자가진단)
  const [mode, setMode] = useState<"voucher" | "general" | "unsure">("voucher");
  const [genCat, setGenCat] = useState<number | null>(null);
  const [genDays, setGenDays] = useState(5);

  const fetusRows = rows.filter((r) => r.fetus_type === fetus);
  const subOptions: [string, string][] = Array.from(
    new Map(fetusRows.map((r) => {
      const key = fetus === "single" ? r.birth_order : String(parseTier(r.income_tier)?.no ?? "");
      return [key, subLabel(r, g?.birth_orders ?? {})] as [string, string];
    })).entries(),
  );
  useEffect(() => {
    if (subOptions.length && !subOptions.some(([k]) => k === sub)) setSub(subOptions[0][0]);
  }, [subOptions, sub]);

  const picked = fetusRows.filter((r) => {
    const t = parseTier(r.income_tier);
    const okSub = fetus === "single" ? r.birth_order === sub : String(t?.no ?? "") === sub;
    return okSub && t?.band === band;
  });

  // ── 소득구간 자가진단 ──
  const sizes = g?.income_criteria ?? [];
  const [size, setSize] = useState("3");
  const [kind, setKind] = useState("employee");
  const [premium, setPremium] = useState("");
  const crit = sizes.find((c) => String(c.household_size) === size);
  const limit = crit ? (kind === "employee" ? crit.premium_employee : kind === "regional" ? crit.premium_regional : crit.premium_mixed) : null;
  const premiumNum = Number(premium.replace(/[^0-9]/g, ""));
  const judged = limit != null && premium.trim() !== "" ? premiumNum <= limit : null;

  // ── 지원기간표(기준표에서 파생) ──
  const periodTable = useMemo(() => {
    const m = new Map<string, { label: string; days: Record<string, number> }>();
    for (const r of rows) {
      const fl = g?.fetus_types[r.fetus_type] ?? r.fetus_type;
      const key = `${r.fetus_type}|${fetusKey(r)}`;
      const label = `${fl} · ${subLabel(r, g?.birth_orders ?? {})}`;
      const e = m.get(key) ?? { label, days: {} };
      e.days[r.period] = r.days;
      m.set(key, e);
    }
    return Array.from(m.values());
  }, [rows, g]);

  if (q.isLoading) return <Card className="p-8 text-center text-sm text-warm-500">불러오는 중…</Card>;
  if (q.isError) return <Card className="p-6 text-sm text-warm-600">{getApiErrorMessage(q.error)}</Card>;
  if (!g) return null;

  return (
    <div className="space-y-5">
      {(noticeQ.data ?? []).map((n) => <NoticeCard key={n.id} n={n} />)}
      <Card className="p-4">
        <span className={LABEL}>정부 바우처를 쓰시나요?</span>
        <Chips label="바우처 이용" value={mode} onChange={(v) => setMode(v as typeof mode)}
          options={[["voucher", "쓸 거예요"], ["general", "안 써요"], ["unsure", "잘 모르겠어요"]]} />
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-warm-500">
          {mode === "voucher" ? "보건소 바우처로 이용하면 정부지원금을 뺀 본인부담금만 내요."
            : mode === "general" ? "바우처 없이 케어앤 일반 요금으로 이용할 때 금액이에요."
              : "소득 구간을 먼저 확인해 보세요. 결과에 맞는 금액으로 이어서 보여 드려요."}
        </p>
      </Card>
      {mode === "general" && <GeneralCard g={g} cat={genCat} setCat={setGenCat} days={genDays} setDays={setGenDays} onCheck={() => setMode("unsure")} applyHref="/request/new?domain=postpartum" />}
      {mode !== "voucher" ? null : !g.rates_ready ? (
        <Card className="p-5 text-sm leading-relaxed text-warm-600">{g.year}년 기준표가 아직 등록되지 않았어요. 고시가 나오면 바로 반영할게요.</Card>
      ) : (
        <Card className="space-y-5 p-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-brand-600" aria-hidden />
            <h2 className={H2}>내 본인부담금 계산</h2>
          </div>
          <div>
            <span className={LABEL}>태아 유형</span>
            <Chips label="태아 유형" value={fetus} onChange={(v) => { setFetus(v); setSub(""); }} options={fetusOptions} />
            <p className="mt-1 text-[12.5px] leading-relaxed text-warm-500">
              장애 정도가 심한 장애인 산모는 한 단계 위 유형(단태아면 쌍태아 칸)을 골라요. 미숙아로 신생아집중치료실에 입원했다면 한 단계 위 유형을 고를 수 있어요.
            </p>
          </div>
          <div>
            <span className={LABEL}>{fetus === "single" ? "출산 순위" : "제공 인력"}</span>
            <Chips label={fetus === "single" ? "출산 순위" : "제공 인력"} value={sub} onChange={setSub} options={subOptions} />
          </div>
          <div>
            <span className={LABEL}>소득 구간</span>
            <Chips label="소득 구간" value={band} onChange={setBand} options={MNH_BANDS.map((b) => [b.key, b.label])} />
            <p className="mt-1 text-[12.5px] text-warm-500">{MNH_BANDS.find((b) => b.key === band)?.desc} · 모르면 아래 자가진단을 해 보세요.</p>
          </div>

          {picked.length > 0 && (
            <div aria-live="polite">
              <p className="text-[13px] font-bold text-warm-600">바우처 유형 <span className="text-brand-700">{picked[0].income_tier}</span></p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {picked.map((r) => (
                  <div key={r.id} className="rounded-xl border border-warm-200 bg-white p-3">
                    <p className="text-[14px] font-extrabold text-warm-800">{g.periods[r.period] ?? r.period} {r.days}일</p>
                    <dl className="mt-1.5 space-y-0.5 text-[13px] text-warm-600">
                      <div className="flex justify-between"><dt>서비스 가격</dt><dd>{won(r.total_price)}</dd></div>
                      <div className="flex justify-between"><dt>정부지원금</dt><dd>- {won(r.gov_support)}</dd></div>
                    </dl>
                    <div className="mt-2 flex justify-between border-t border-warm-100 pt-2 text-[15px] font-extrabold text-brand-700">
                      <span>내가 낼 돈</span><span>{won(r.self_pay)}</span>
                    </div>
                    <p className="text-right text-[12px] text-warm-500">하루 약 {won(Math.round(r.self_pay / r.days / 100) * 100)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-warm-500">{g.year}년 보건복지부 고시 기준{g.addons.length ? " · 추가 서비스는 케어앤 가격(아래)" : ""} · 서비스 가격은 실제 이용 개시일의 연도를 따라요. 기간(단축·표준·연장)은 신청 뒤 바꿀 수 없어요.</p>
            </div>
          )}
        </Card>
      )}

      {mode !== "general" && sizes.length > 0 && (
        <Card className="space-y-4 p-4">
          <h2 className={H2}>소득 구간 자가진단</h2>
          <p className="text-[13px] leading-relaxed text-warm-500">
            산모와 배우자의 건강보험료 본인부담금 합산액으로 판정해요(장기요양보험료 제외, 신청일 기준 고지액).
          </p>
          <div>
            <label className={LABEL} htmlFor="mnh-size">가구원 수(태아 포함)</label>
            <select id="mnh-size" value={size} onChange={(e) => setSize(e.target.value)}
              className="h-12 w-full rounded-xl border border-warm-200 bg-white px-3 text-[16px]">
              {sizes.map((c) => <option key={c.household_size} value={String(c.household_size)}>{c.household_size}인</option>)}
            </select>
          </div>
          <div>
            <span className={LABEL}>건강보험 가입 형태</span>
            <Chips label="가입 형태" value={kind} onChange={setKind} options={PREMIUM_KINDS} />
          </div>
          <div>
            <label className={LABEL} htmlFor="mnh-premium">월 건강보험료 본인부담 합계(원)</label>
            <input id="mnh-premium" inputMode="numeric" value={premium} placeholder="예: 250000"
              onChange={(e) => setPremium(e.target.value.replace(/[^0-9]/g, ""))}
              className="h-12 w-full rounded-xl border border-warm-200 bg-white px-3 text-[16px]" />
            {limit != null && <p className="mt-1 text-[12.5px] text-warm-500">{size}인 가구 {PREMIUM_KINDS.find(([k]) => k === kind)?.[1]} 기준 {won(limit)} 이하면 150% 이하예요.</p>}
          </div>
          {judged !== null && (
            <div aria-live="polite" className={cn("rounded-xl p-3 text-[14px] leading-relaxed", judged ? "bg-brand-50 text-brand-800" : "bg-amber-50 text-amber-800")}>
              {judged
                ? <><b>기준중위소득 150% 이하</b>예요. 통합형 대상이고, 기초생활수급·차상위 가정이면 가형이에요.</>
                : <><b>150% 초과</b>예요. 라형은 예외지원 대상(다태아·셋째아 이상·장애 산모 등)이거나 시·도가 따로 지원할 때만 받을 수 있어요. 시·도마다 달라요.</>}
              <p className="mt-1 text-[12px] opacity-80">최종 유형은 보건소 바우처 결정 통지가 기준이에요.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="brand" className="rounded-lg" onClick={() => { setBand(judged ? "통합" : "라"); setMode("voucher"); }}>
                  {judged ? "통합형으로 계산하기" : "라형으로 계산하기"}
                </Button>
                {!judged && <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => setMode("general")}>일반 이용 금액 보기</Button>}
              </div>
            </div>
          )}
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-[13px] font-bold text-warm-600">
              {g.year}년 판정 기준표 전체 <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="mt-2 overflow-x-auto rounded-xl border border-warm-200">
              <table className="w-full min-w-[480px] text-[12.5px]">
                <thead className="bg-warm-50 text-warm-600">
                  <tr><th className="p-2 text-left">가구원</th><th className="p-2 text-right">월 소득기준</th><th className="p-2 text-right">직장</th><th className="p-2 text-right">지역</th><th className="p-2 text-right">혼합</th></tr>
                </thead>
                <tbody>
                  {sizes.map((c) => (
                    <tr key={c.household_size} className="border-t border-warm-100 tabular-nums">
                      <td className="p-2">{c.household_size}인</td>
                      <td className="p-2 text-right">{c.income_limit.toLocaleString("ko-KR")}</td>
                      <td className="p-2 text-right">{c.premium_employee.toLocaleString("ko-KR")}</td>
                      <td className="p-2 text-right">{c.premium_regional.toLocaleString("ko-KR")}</td>
                      <td className="p-2 text-right">{c.premium_mixed.toLocaleString("ko-KR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-[12px] text-warm-500">단위 원 · 건강보험료는 장기요양보험료를 뺀 금액</p>
          </details>
        </Card>
      )}

      {mode === "voucher" && g.addons.length > 0 && (
        <Card className="space-y-3 p-4">
          <h2 className={H2}>추가 서비스·대여용품</h2>
          <p className="text-[13px] leading-relaxed text-warm-500">바우처 밖에서 케어앤이 정한 가격이에요. 계약을 신청할 때 골라요.</p>
          <ul className="divide-y divide-warm-100">
            {g.addons.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 py-2.5 text-[14px]">
                <div className="min-w-0">
                  <p className="font-bold text-warm-800">{a.name} <span className="ml-1 text-[12px] font-normal text-warm-500">{g.addon_kinds[a.kind] ?? a.kind}</span></p>
                  {a.note && <p className="text-[12.5px] text-warm-500">{a.note}</p>}
                </div>
                <span className="shrink-0 font-bold tabular-nums text-warm-700">{won(a.price)}/{a.unit_label}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {mode === "voucher" && periodTable.length > 0 && (
        <Card className="space-y-3 p-4">
          <h2 className={H2}>지원 기간</h2>
          <div className="overflow-x-auto rounded-xl border border-warm-200">
            <table className="w-full text-[13px]">
              <thead className="bg-warm-50 text-warm-600">
                <tr><th className="p-2 text-left">유형</th>{Object.entries(g.periods).map(([k, v]) => <th key={k} className="p-2 text-right">{v}</th>)}</tr>
              </thead>
              <tbody>
                {periodTable.map((r) => (
                  <tr key={r.label} className="border-t border-warm-100 tabular-nums">
                    <td className="p-2">{r.label}</td>
                    {Object.keys(g.periods).map((k) => <td key={k} className="p-2 text-right">{r.days[k] ? `${r.days[k]}일` : "-"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="space-y-2 p-4 text-[14px] leading-relaxed text-warm-700">
        {notesQ.data?.length ? notesQ.data.map((c) => (
          <div key={c.id} className="space-y-2">
            <h2 className={H2}>{c.title}</h2>
            <ContentBlocks blocks={c.blocks} />
          </div>
        )) : (
          <>
            <h2 className={H2}>신청 전에 알아 두세요</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>바우처 신청: 출산 예정일 40일 전부터 출산 후 60일까지, 주소지 보건소·복지로·정부24에서 해요.</li>
              <li>바우처는 출산일로부터 90일 안에 다 써야 해요(남아도 소멸).</li>
              <li>보건소에서 받은 결정 통지의 유형(예: A-통합-①형)으로 케어앤에 계약을 신청하면 돼요.</li>
              <li>본인부담금은 서비스 시작 전에 케어앤에 먼저 내고, 정부지원금은 국민행복카드 바우처로 결제돼요.</li>
            </ul>
          </>
        )}
        <Link href={applyHref} className="mt-2 block">
          <Button variant="brand" size="lg" className="w-full rounded-2xl">바우처 계약 신청하기</Button>
        </Link>
      </Card>
    </div>
  );
}

function fetusKey(r: MnhSupportType): string {
  return r.fetus_type === "single" ? r.birth_order : String(parseTier(r.income_tier)?.no ?? "");
}

/** 바우처 없이 — 케어앤 일반 요금(하루 8시간 × 기간). 같은 기간 바우처 본인부담과 견줘 보여 준다. */
function GeneralCard({ g, cat, setCat, days, setDays, onCheck, applyHref }: {
  g: import("@/lib/api/mnh").MnhGuide; cat: number | null; setCat: (v: number) => void; days: number; setDays: (v: number) => void; onCheck: () => void; applyHref: string;
}) {
  const rates = g.general ?? [];
  const r = rates.find((x) => x.category_id === cat) ?? rates[0];
  if (!r) return <Card className="p-5 text-sm text-warm-600">일반 요금을 불러오지 못했어요.</Card>;
  const PRESET = [5, 10, 15, 20];
  const same = g.support_types.filter((t) => t.fetus_type === "single" && t.days === days).sort((a, b) => a.self_pay - b.self_pay);
  return (
    <Card className="space-y-4 p-4">
      <h2 className={H2}>바우처 없이 이용할 때</h2>
      <div>
        <span className={LABEL}>서비스</span>
        <Chips label="서비스" value={String(r.category_id)} onChange={(v) => setCat(Number(v))} options={rates.map((x) => [String(x.category_id), x.name])} />
      </div>
      <div>
        <span className={LABEL}>기간</span>
        <Chips label="기간" value={PRESET.includes(days) ? String(days) : "custom"} onChange={(v) => setDays(v === "custom" ? (PRESET.includes(days) ? 7 : days) : Number(v))}
          options={[...PRESET.map((d) => [String(d), `${d}일`] as [string, string]), ["custom", "직접"]]} />
        {!PRESET.includes(days) && (
          <div className="mt-2 flex items-center gap-3">
            <Button type="button" variant="outline" size="icon" aria-label="하루 줄이기" onClick={() => setDays(Math.max(1, days - 1))}>−</Button>
            <span className="w-14 text-center text-lg font-extrabold text-warm-800">{days}일</span>
            <Button type="button" variant="outline" size="icon" aria-label="하루 늘리기" onClick={() => setDays(Math.min(40, days + 1))}>+</Button>
          </div>
        )}
      </div>
      <div className="rounded-xl bg-brand-50 p-4" aria-live="polite">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[14px] font-bold text-warm-700">예상 금액</span>
          <span className="text-[22px] font-extrabold text-brand-700">{won(r.day_price * days)}</span>
        </div>
        <p className="mt-0.5 text-right text-[12.5px] text-warm-600">하루 {r.day_hours}시간{r.night ? "(밤 10시부터)" : ""} · 하루 {won(r.day_price)} · 시간당 {won(r.hourly)}</p>
        <p className="text-right text-[12px] text-warm-500">보통 하루 {won(r.floor * r.day_hours)} ~ {won(r.ceil * r.day_hours)}</p>
      </div>
      {same.length > 0 && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-[13.5px] leading-relaxed text-sky-900">
          바우처를 쓰면 같은 {days}일에 내 돈 <b>{won(same[0].self_pay)}</b>부터예요({same[0].income_tier}).
          <button type="button" onClick={onCheck} className="ml-1 font-bold underline">바우처 대상인지 확인</button>
        </div>
      )}
      <p className="text-[12px] text-warm-500">케어앤 일반 요금 · 공휴일 제외 평일 기준 · 지역에 따라 달라질 수 있어요.</p>
      <Link href={applyHref} className="block">
        <Button variant="outline" size="lg" className="w-full rounded-2xl">일반 이용 신청하기</Button>
      </Link>
    </Card>
  );
}
