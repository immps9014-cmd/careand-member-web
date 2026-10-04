"use client";

// 에딘버러 산후우울 검사(EPDS) — 산모신생아 건강관리 회원 지원(요구사항분석 PDF, 2026-10-05)
// 검사 → 수검자 분석 보고서 → 필요하면 마음돌봄(심리지원) 신청으로 연결. 문항·위기 연락처는 백엔드 config/epds.php.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HeartHandshake, Phone, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { memberApi, type EpdsReport } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const RISK_CLS: Record<EpdsReport["risk_level"], string> = {
  low: "bg-brand-50 text-brand-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
  critical: "bg-red-600 text-white",
};

export default function EpdsPage() {
  const qc = useQueryClient();
  const clients = useQuery({ queryKey: ["member", "postpartum-clients"], queryFn: () => memberApi.postpartumClients() });
  const [clientId, setClientId] = useState<number | null>(null);
  useEffect(() => {
    if (clientId === null && clients.data?.length) setClientId((clients.data.find((c) => c.is_self) ?? clients.data[0]).id);
  }, [clients.data, clientId]);

  const ov = useQuery({ queryKey: ["member", "epds", clientId], queryFn: () => memberApi.epds(clientId!), enabled: !!clientId });
  const [taking, setTaking] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [result, setResult] = useState<EpdsReport | null>(null);

  const submit = useMutation({
    mutationFn: () => memberApi.submitEpds(clientId!, answers as number[]),
    onSuccess: (r) => {
      setResult(r);
      setTaking(false);
      setAnswers(Array(10).fill(null));
      qc.invalidateQueries({ queryKey: ["member", "epds", clientId] });
      window.scrollTo({ top: 0 });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const answered = answers.filter((a) => a !== null).length;
  const latest = result ?? ov.data?.history[0] ?? null;

  return (
    <div className="px-4 pt-4 pb-6 lg:mx-auto lg:max-w-3xl">
      <h1 className="text-xl font-extrabold tracking-tight text-warm-800">산후우울 자가검사</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-warm-500">
        에딘버러 산후우울 척도(EPDS) 10문항이에요. 3분이면 끝나고, 결과는 본인과 케어앤 상담 담당자만 봐요. 진단이 아니라 지금 마음 상태를 살펴보는 검사예요.
      </p>

      {clients.isLoading && <Card className="mt-5 p-8 text-center text-sm text-warm-500">불러오는 중…</Card>}
      {clients.isSuccess && clients.data.length === 0 && (
        <Card className="mt-5 p-6 text-center">
          <p className="text-sm text-warm-600">산모 정보가 있어야 검사할 수 있어요.</p>
          <Link href="/request/new?domain=postpartum" className="mt-3 inline-block text-sm font-bold text-brand-600 underline">
            산모신생아 건강관리 신청하면서 등록하기
          </Link>
        </Card>
      )}

      {(clients.data?.length ?? 0) > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {clients.data!.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setClientId(c.id); setResult(null); setTaking(false); }}
              className={cn(
                "h-10 rounded-xl border px-3.5 text-[14px] font-bold",
                clientId === c.id ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-600"
              )}
            >
              {c.is_self ? `${c.name} (본인)` : c.name}
            </button>
          ))}
        </div>
      )}

      {ov.data && latest && !taking && <ReportCard r={latest} contacts={ov.data.crisis_contacts} fresh={!!result} />}

      {ov.data && !taking && (
        <Card className="mt-4 p-5">
          {ov.data.can_take_today ? (
            <>
              <p className="text-sm text-warm-600">
                {latest ? "출산 후에는 마음이 자주 바뀌어요. 2주에 한 번 정도 다시 해 보세요." : "지난 7일 동안 어떻게 지내셨는지 떠올리며 답해 주세요."}
              </p>
              <Button variant="brand" className="mt-3 w-full" onClick={() => { setTaking(true); setResult(null); }}>
                {latest ? "다시 검사하기" : "검사 시작하기"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-warm-600">오늘은 검사를 마쳤어요. 내일부터 다시 할 수 있어요.</p>
          )}
        </Card>
      )}

      {ov.data && taking && (
        <div className="mt-5 space-y-3">
          <p className="text-[14px] font-bold text-warm-700">
            {ov.data.period}, 나는… <span className="font-medium text-warm-500">({answered}/10)</span>
          </p>
          {ov.data.questions.map((q, i) => (
            <Card key={q.no} className="p-4">
              <p className="font-bold text-warm-800">
                {q.no}. {q.text}
              </p>
              <div className="mt-3 grid gap-2" role="radiogroup" aria-label={`${q.no}번 문항`}>
                {q.options.map(([label, score]) => {
                  const on = answers[i] === score;
                  return (
                    <button
                      key={label}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setAnswers((a) => a.map((v, j) => (j === i ? score : v)))}
                      className={cn(
                        "min-h-11 rounded-xl border px-3.5 py-2 text-left text-[14.5px] font-semibold transition-colors",
                        on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-warm-200 bg-white text-warm-700"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
          <Button variant="brand" className="w-full" disabled={answered < 10 || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "결과 만드는 중…" : answered < 10 ? `${10 - answered}문항 남았어요` : "결과 보기"}
          </Button>
          <button type="button" onClick={() => setTaking(false)} className="block w-full text-center text-[13px] font-semibold text-warm-500 underline">
            그만하기
          </button>
        </div>
      )}

      {ov.data && !taking && ov.data.history.length > 1 && (
        <Card className="mt-4 p-5">
          <h2 className="font-bold text-warm-800">지난 검사</h2>
          <ul className="mt-2 divide-y divide-warm-100">
            {ov.data.history.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="tabular-nums text-warm-600">{h.date}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums font-bold text-warm-800">{h.total}점</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-bold", RISK_CLS[h.risk_level])}>{h.risk_label}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ReportCard({ r, contacts, fresh }: { r: EpdsReport; contacts: { label: string; number: string }[]; fresh: boolean }) {
  const urgent = r.self_harm || r.risk_level === "critical";
  return (
    <Card className="mt-5 p-5">
      {urgent && (
        <div className="mb-4 rounded-xl bg-red-50 p-4">
          <p className="font-bold text-red-700">혼자 견디지 마세요. 지금 바로 이야기할 수 있어요.</p>
          <ul className="mt-2 space-y-1.5">
            {contacts.map((c) => (
              <li key={c.number} className="flex items-center gap-2 text-[15px]">
                <Phone className="h-4 w-4 flex-none text-red-600" />
                <span className="text-warm-700">{c.label}</span>
                <a href={`tel:${c.number}`} className="ml-auto select-all font-extrabold tabular-nums text-red-700">{c.number}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12.5px] font-semibold text-warm-500">{fresh ? "방금 검사 결과" : `최근 검사 · ${r.date}`}</p>
          <p className="mt-0.5 text-3xl font-extrabold tabular-nums text-warm-800">
            {r.total}<span className="text-base font-bold text-warm-400"> / {r.max}점</span>
          </p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-[13px] font-bold", RISK_CLS[r.risk_level])}>{r.risk_label}</span>
      </div>
      <p className="mt-3 text-[14.5px] leading-relaxed text-warm-700">{r.message}</p>

      <div className="mt-4 space-y-2.5">
        {r.subscales.map((s) => (
          <div key={s.key}>
            <div className="flex justify-between text-[13px]">
              <span className="font-semibold text-warm-600">{s.label}{s.flag ? " · 불안이 높은 편" : ""}</span>
              <span className="tabular-nums text-warm-500">{s.score}/{s.max}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-warm-100">
              <div className={cn("h-full rounded-full", s.flag ? "bg-amber-500" : "bg-brand-500")} style={{ width: `${(s.score / s.max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {r.recommend_mental_care && (
        <Link href="/request/new?domain=mental_care" className="mt-5 block">
          <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
            <HeartHandshake className="h-6 w-6 flex-none text-brand-600" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-brand-700">마음돌봄 상담 신청하기</p>
              <p className="text-[12.5px] text-warm-600">집으로 찾아가는 심리상담 선생님을 연결해 드려요.</p>
            </div>
            <ChevronRight className="h-5 w-5 flex-none text-brand-500" />
          </div>
        </Link>
      )}
      <p className="mt-4 text-[12px] leading-relaxed text-warm-400">
        이 결과는 선별 검사이며 의학적 진단이 아니에요. 걱정되는 점이 있으면 산부인과·정신건강의학과 진료를 받아 보세요.
      </p>
    </Card>
  );
}
