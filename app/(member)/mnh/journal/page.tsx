"use client";

// 이용일지 — 산모신생아 건강관리 이용자가 수시로 쓰고 기관(케어앤 운영팀)이 확인한다(요구사항분석 「이용자 이용일지」, 2026-10-05).
// 아기 발열·저체온, 산모 발열·컨디션 나쁨, 서비스 의견은 저장 즉시 담당 관리자에게 알림이 간다. 규칙은 백엔드 App\Support\MnhClientJournal.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Milk, Droplets, Moon, Thermometer, HeartPulse, MessageSquareText, NotebookPen, Phone, CheckCircle2, Trash2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  memberApi,
  type EmergencyContact,
  type JournalEntry,
  type JournalKind,
  type JournalOverview,
  type JournalValues,
  type PostpartumClient,
} from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const TZ = "Asia/Seoul";
const KIND_ICON: Record<JournalKind, typeof Milk> = {
  feeding: Milk, diaper: Droplets, sleep: Moon, temperature: Thermometer, mother: HeartPulse, service: MessageSquareText, note: NotebookPen,
};
const KIND_HINT: Record<JournalKind, string> = {
  feeding: "수유 방법·양·시간",
  diaper: "소변·대변",
  sleep: "잠잔 시간",
  temperature: "아기·산모 체온",
  mother: "오늘 몸·마음 상태",
  service: "관리사·서비스에 바라는 점",
  note: "그 밖의 메모",
};
const BABY_KINDS: JournalKind[] = ["feeding", "diaper", "sleep"];
const RELATIONS = ["배우자", "부모", "형제자매", "자녀", "친척", "지인", "기타"];
const fmtPhone = (p?: string | null) => (p ?? "").replace(/^(02|0\d{2})(\d{3,4})(\d{4})$/, "$1-$2-$3");

/** 지금 한국시각 "YYYY-MM-DDTHH:mm" — datetime-local 기본값(백엔드는 시간대 없는 값을 한국시각으로 읽는다) */
function nowKstLocal() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .format(new Date()).replace(" ", "T");
}
const kstDay = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date(iso));
const kstTime = (iso: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
function dayLabel(d: string) {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());
  const yest = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date(Date.now() - 86400000));
  const [, m, dd] = d.split("-").map(Number);
  const dow = "일월화수목금토"[new Date(d + "T12:00:00+09:00").getUTCDay()];
  return `${m}월 ${dd}일 (${dow})${d === today ? " · 오늘" : d === yest ? " · 어제" : ""}`;
}

export default function MnhJournalPage() {
  const clients = useQuery({ queryKey: ["member", "postpartum-clients"], queryFn: () => memberApi.postpartumClients() });
  const [clientId, setClientId] = useState<number | null>(null);
  useEffect(() => {
    if (clientId === null && clients.data?.length) setClientId((clients.data.find((c) => c.is_self) ?? clients.data[0]).id);
  }, [clients.data, clientId]);
  const client = clients.data?.find((c) => c.id === clientId) ?? null;

  return (
    <div className="px-4 pt-4 pb-6 lg:mx-auto lg:max-w-3xl">
      <h1 className="text-xl font-extrabold tracking-tight text-warm-800">이용일지</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-warm-500">
        아기 수유·기저귀·수면·체온과 산모 상태, 서비스에 바라는 점을 수시로 남겨 주세요. 케어앤 담당자가 확인하고, 열이 나거나 의견을 남기면 바로 알림을 받아요.
      </p>

      {clients.isLoading && <Card className="mt-5 p-8 text-center text-sm text-warm-500">불러오는 중…</Card>}
      {clients.isError && <Card className="mt-5 p-6 text-sm text-warm-600">{getApiErrorMessage(clients.error)}</Card>}
      {clients.isSuccess && clients.data.length === 0 && (
        <Card className="mt-5 p-6 text-center">
          <p className="text-sm text-warm-600">산모 정보가 있어야 이용일지를 쓸 수 있어요.</p>
          <Link href="/request/new?domain=postpartum" className="mt-3 inline-block text-sm font-bold text-brand-600 underline">
            산모신생아 건강관리 신청하면서 등록하기
          </Link>
        </Card>
      )}

      {(clients.data?.length ?? 0) > 1 && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="산모 선택">
          {clients.data!.map((c) => (
            <button key={c.id} type="button" aria-pressed={clientId === c.id} onClick={() => setClientId(c.id)}
              className={cn("h-10 rounded-xl border px-3.5 text-[14px] font-bold",
                clientId === c.id ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-600")}>
              {c.is_self ? `${c.name} (본인)` : c.name}
            </button>
          ))}
        </div>
      )}

      {client && (
        <>
          <EmergencyCard client={client} />
          <JournalBody clientId={client.id} />
        </>
      )}
    </div>
  );
}

/* ───── 산모 비상연락처 ───── */

function EmergencyCard({ client }: { client: PostpartumClient }) {
  const qc = useQueryClient();
  const v = client.emergency_contact ?? null;
  const [open, setOpen] = useState(!v);
  const [name, setName] = useState(v?.name ?? "");
  const [relation, setRelation] = useState(v?.relation ?? "배우자");
  const [phone, setPhone] = useState(fmtPhone(v?.phone));
  useEffect(() => {
    setOpen(!v); setName(v?.name ?? ""); setRelation(v?.relation ?? "배우자"); setPhone(fmtPhone(v?.phone));
  }, [client.id, v?.name, v?.relation, v?.phone]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useMutation({
    mutationFn: (body: EmergencyContact) => memberApi.savePostpartumEmergency(client.id, body),
    onSuccess: () => {
      toast.success("비상연락처를 저장했어요.");
      qc.invalidateQueries({ queryKey: ["member", "postpartum-clients"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (!open && v) {
    return (
      <Card className="mt-4 flex items-center gap-3 p-4">
        <Phone className="h-5 w-5 shrink-0 text-warm-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-warm-500">산모 비상연락처</p>
          <p className="text-[15px] font-bold text-warm-800 truncate">{v.name}({v.relation}) {fmtPhone(v.phone)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>고치기</Button>
      </Card>
    );
  }
  return (
    <Card className={cn("mt-4 p-4", !v && "border-amber-300 bg-amber-50/60")}>
      <form className="grid gap-2" aria-label="산모 비상연락처"
        onSubmit={(e) => { e.preventDefault(); save.mutate({ name: name.trim(), relation, phone: phone.trim() }); }}>
        <p className="flex items-center gap-1.5 text-[14px] font-bold text-warm-800"><Phone className="h-4 w-4 text-warm-500" aria-hidden />산모 비상연락처</p>
        <p className="-mt-1 text-[12.5px] text-warm-600">
          {v ? "산모와 연락이 안 될 때 케어앤이 연락할 가족·지인이에요." : "아직 없어요. 산모와 연락이 안 될 때 케어앤이 연락할 가족·지인을 알려 주세요."}
        </p>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="이름" aria-label="비상연락처 이름" required />
          <select aria-label="관계" value={relation} onChange={(e) => setRelation(e.target.value)}
            className="h-12 rounded-xl border border-warm-200 bg-white px-3 text-[16px]">
            {RELATIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" aria-label="비상연락처 전화번호" required />
        <div className="flex gap-2">
          {v && <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>닫기</Button>}
          <Button type="submit" variant="brand" className="flex-1" disabled={save.isPending || !name.trim() || !phone.trim()}>
            {save.isPending ? "저장 중…" : "저장"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/* ───── 기록하기 + 목록 ───── */

function JournalBody({ clientId }: { clientId: number }) {
  const qc = useQueryClient();
  const [days, setDays] = useState(7);
  const ov = useQuery({ queryKey: ["member", "mnh-journal", clientId, days], queryFn: () => memberApi.journal(clientId, days) });
  const [kind, setKind] = useState<JournalKind | null>(null);
  useEffect(() => setKind(null), [clientId]);

  const del = useMutation({
    mutationFn: (id: number) => memberApi.deleteJournal(clientId, id),
    onSuccess: () => { toast.success("기록을 지웠어요."); qc.invalidateQueries({ queryKey: ["member", "mnh-journal", clientId] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const groups = useMemo(() => {
    const m = new Map<string, JournalEntry[]>();
    for (const e of ov.data?.entries ?? []) {
      const d = kstDay(e.logged_at);
      m.set(d, [...(m.get(d) ?? []), e]);
    }
    return [...m.entries()];
  }, [ov.data]);

  const kinds = ov.data?.options.kinds;

  return (
    <>
      <h2 className="mt-6 text-[15px] font-extrabold text-warm-800">기록하기</h2>
      <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7" role="group" aria-label="기록 종류">
        {(Object.keys(KIND_ICON) as JournalKind[]).map((k) => {
          const Icon = KIND_ICON[k];
          const on = kind === k;
          return (
            <button key={k} type="button" aria-pressed={on} onClick={() => setKind(on ? null : k)}
              className={cn("flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border px-1 text-[13px] font-bold",
                on ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-700 hover:bg-warm-50")}>
              <Icon className="h-5 w-5" aria-hidden />
              {kinds?.[k] ?? k}
            </button>
          );
        })}
      </div>

      {kind && ov.data && (
        <EntryForm key={kind} clientId={clientId} kind={kind} overview={ov.data} onDone={() => setKind(null)} />
      )}

      <div className="mt-7 flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold text-warm-800">기록</h2>
        <select aria-label="기간" value={days} onChange={(e) => setDays(Number(e.target.value))}
          className="h-10 rounded-xl border border-warm-200 bg-white px-3 text-[14px]">
          <option value={7}>최근 7일</option>
          <option value={30}>최근 30일</option>
        </select>
      </div>

      {ov.isLoading && <Card className="mt-3 p-8 text-center text-sm text-warm-500">불러오는 중…</Card>}
      {ov.isError && <Card className="mt-3 p-6 text-sm text-warm-600">{getApiErrorMessage(ov.error)}</Card>}
      {ov.isSuccess && groups.length === 0 && (
        <Card className="mt-3 p-6 text-center text-sm text-warm-500">아직 기록이 없어요. 위에서 종류를 골라 첫 기록을 남겨 보세요.</Card>
      )}

      {groups.map(([d, list]) => (
        <section key={d} className="mt-4" aria-label={dayLabel(d)}>
          <h3 className="mb-2 text-[13px] font-bold text-warm-500">{dayLabel(d)} · {list.length}건</h3>
          <Card className="divide-y divide-warm-100 p-0">
            {list.map((e) => {
              const Icon = KIND_ICON[e.kind] ?? NotebookPen;
              return (
                <div key={e.id} className="flex gap-3 px-4 py-3">
                  <div className="w-12 shrink-0 pt-0.5 text-[14px] font-bold tabular-nums text-warm-700">{kstTime(e.logged_at)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[14.5px] font-bold text-warm-800">
                      <Icon className="h-4 w-4 text-warm-500" aria-hidden />
                      {e.kind_label}
                      {e.newborn_name && <span className="font-semibold text-warm-500">· {e.newborn_name}</span>}
                      {e.flag_label && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-[12px] font-bold text-red-700">
                          <AlertTriangle className="h-3 w-3" aria-hidden />{e.flag_label}
                        </span>
                      )}
                    </p>
                    {e.summary && <p className="mt-0.5 text-[14px] text-warm-700">{e.summary}</p>}
                    {e.note && <p className="mt-0.5 whitespace-pre-wrap break-words text-[14px] text-warm-600">{e.note}</p>}
                    {e.checked_at ? (
                      <p className="mt-1 flex items-center gap-1 text-[12.5px] font-semibold text-brand-700">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />케어앤 확인{e.check_note ? ` — ${e.check_note}` : ""}
                      </p>
                    ) : null}
                  </div>
                  {!e.checked_at && (
                    <button type="button" aria-label={`${kstTime(e.logged_at)} ${e.kind_label} 기록 지우기`}
                      disabled={del.isPending}
                      onClick={() => { if (confirm("이 기록을 지울까요?")) del.mutate(e.id); }}
                      className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-warm-400 hover:bg-warm-50 hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </Card>
        </section>
      ))}
    </>
  );
}

function EntryForm({ clientId, kind, overview, onDone }: {
  clientId: number; kind: JournalKind; overview: JournalOverview; onDone: () => void;
}) {
  const qc = useQueryClient();
  const o = overview.options;
  const babies = overview.newborns;
  const [at, setAt] = useState(nowKstLocal());
  const [values, setValues] = useState<JournalValues>(kind === "temperature" ? { target: "baby" } : {});
  const [note, setNote] = useState("");
  const [newbornId, setNewbornId] = useState<number | null>(babies.length === 1 ? babies[0].id : null);
  const set = (patch: JournalValues) => setValues((v) => ({ ...v, ...patch }));

  const babyKind = BABY_KINDS.includes(kind) || (kind === "temperature" && values.target !== "mother");
  const needNote = kind === "service" || kind === "note";
  const valid =
    (kind === "feeding" ? !!values.method : true) &&
    (kind === "diaper" ? !!values.type : true) &&
    (kind === "sleep" ? !!values.minutes && values.minutes > 0 : true) &&
    (kind === "temperature" ? typeof values.celsius === "number" && values.celsius >= 34 && values.celsius <= 42 : true) &&
    (kind === "mother" ? !!values.condition : true) &&
    (needNote ? note.trim().length > 0 : true) &&
    (babyKind && babies.length > 1 ? !!newbornId : true);

  // 체온 미리 경고 — 저장하면 기관에 바로 알림이 간다
  const t = o.thresholds;
  const tempWarn = kind === "temperature" && typeof values.celsius === "number"
    ? values.target === "mother"
      ? values.celsius >= t.mother_fever ? `산모 ${t.mother_fever}℃ 이상은 산욕열일 수 있어요. 병원에 문의해 주세요.` : null
      : values.celsius >= t.baby_fever ? `아기 ${t.baby_fever}℃ 이상은 발열이에요. 소아과에 문의해 주세요.`
      : values.celsius < t.baby_low ? `아기 ${t.baby_low}℃ 미만은 저체온일 수 있어요. 따뜻하게 하고 다시 재 주세요.` : null
    : null;

  const add = useMutation({
    mutationFn: () => memberApi.addJournal(clientId, {
      kind,
      newborn_id: babyKind ? newbornId : null,
      logged_at: at,
      values: Object.keys(values).length ? values : undefined,
      note: note.trim() || undefined,
    }),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["member", "mnh-journal", clientId] });
      onDone();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const chip = (on: boolean) => cn("h-11 rounded-xl border px-3 text-[14px] font-bold",
    on ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-700");
  const label = "mb-1.5 block text-[13px] font-bold text-warm-600";

  return (
    <Card className="mt-3 p-4">
      <form className="grid gap-4" aria-label={`${o.kinds[kind]} 기록`} onSubmit={(e) => { e.preventDefault(); if (valid) add.mutate(); }}>
        <p className="text-[13px] text-warm-500">{KIND_HINT[kind]}</p>

        {babyKind && babies.length > 1 && (
          <div>
            <span className={label}>어느 아기인가요?</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="아기">
              {babies.map((b) => (
                <button key={b.id} type="button" aria-pressed={newbornId === b.id} onClick={() => setNewbornId(b.id)} className={chip(newbornId === b.id)}>{b.name}</button>
              ))}
            </div>
          </div>
        )}

        {kind === "feeding" && (
          <>
            <div>
              <span className={label}>수유 방법</span>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="수유 방법">
                {Object.entries(o.feeding_methods).map(([k, l]) => (
                  <button key={k} type="button" aria-pressed={values.method === k} onClick={() => set({ method: k as JournalValues["method"] })} className={chip(values.method === k)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className={label}>양(ml, 선택)</span>
                <Input type="number" inputMode="numeric" min={0} max={500} value={values.ml ?? ""}
                  onChange={(e) => set({ ml: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="예: 80" />
              </label>
              <label>
                <span className={label}>걸린 시간(분, 선택)</span>
                <Input type="number" inputMode="numeric" min={1} max={180} value={values.minutes ?? ""}
                  onChange={(e) => set({ minutes: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="예: 15" />
              </label>
            </div>
          </>
        )}

        {kind === "diaper" && (
          <div>
            <span className={label}>기저귀</span>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="기저귀">
              {Object.entries(o.diaper_types).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={values.type === k} onClick={() => set({ type: k as JournalValues["type"] })} className={chip(values.type === k)}>{l}</button>
              ))}
            </div>
          </div>
        )}

        {kind === "sleep" && (
          <div>
            <span className={label}>잠잔 시간</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="잠잔 시간 빠른 선택">
              {[30, 60, 90, 120, 180].map((m) => (
                <button key={m} type="button" aria-pressed={values.minutes === m} onClick={() => set({ minutes: m })} className={chip(values.minutes === m)}>
                  {m >= 60 ? `${m / 60}시간` : `${m}분`}
                </button>
              ))}
            </div>
            <Input className="mt-2" type="number" inputMode="numeric" min={1} max={1440} value={values.minutes ?? ""} aria-label="잠잔 시간(분)"
              onChange={(e) => set({ minutes: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="직접 입력(분)" />
          </div>
        )}

        {kind === "temperature" && (
          <>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="누구 체온">
              <button type="button" aria-pressed={values.target !== "mother"} onClick={() => set({ target: "baby" })} className={chip(values.target !== "mother")}>아기</button>
              <button type="button" aria-pressed={values.target === "mother"} onClick={() => set({ target: "mother" })} className={chip(values.target === "mother")}>산모</button>
            </div>
            <label>
              <span className={label}>체온(℃)</span>
              <Input type="number" inputMode="decimal" step="0.1" min={34} max={42} value={values.celsius ?? ""}
                onChange={(e) => set({ celsius: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="예: 36.8" />
            </label>
            {tempWarn && (
              <p className="flex gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700" role="alert">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{tempWarn} 저장하면 케어앤 담당자에게도 바로 알려요.
              </p>
            )}
          </>
        )}

        {kind === "mother" && (
          <div>
            <span className={label}>오늘 컨디션</span>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="컨디션">
              {Object.entries(o.conditions).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={values.condition === k} onClick={() => set({ condition: k as JournalValues["condition"] })} className={chip(values.condition === k)}>{l}</button>
              ))}
            </div>
            {values.condition === "bad" && (
              <p className="mt-2 text-[13px] text-warm-600">
                저장하면 담당자가 연락드릴 수 있어요. 마음이 많이 힘들면 <Link href="/epds" className="font-bold text-brand-600 underline">산후우울 자가검사</Link>도 해 보세요.
              </p>
            )}
          </div>
        )}

        <label>
          <span className={label}>{needNote ? "내용" : "메모(선택)"}</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={needNote ? 4 : 2}
            placeholder={kind === "service" ? "예: 아기 목욕을 오전에 해 주시면 좋겠어요." : "특이사항이 있으면 적어 주세요."}
            className="w-full rounded-xl border border-warm-200 bg-white px-3.5 py-3 text-[16px] text-warm-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </label>

        <label>
          <span className={label}>시각</span>
          <Input type="datetime-local" value={at} max={nowKstLocal()} onChange={(e) => setAt(e.target.value)} />
        </label>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onDone}>취소</Button>
          <Button type="submit" variant="brand" className="flex-1" disabled={!valid || add.isPending}>{add.isPending ? "저장 중…" : "기록"}</Button>
        </div>
      </form>
    </Card>
  );
}
