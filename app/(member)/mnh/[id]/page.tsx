"use client";

// 바우처 계약 상세 — 기간·본인부담금·담당 관리사(확인된 자격 서류)·일정표(CAREN-MNH-01 2단계, 2026-10-05)
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, FileSignature, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mnhApi, mnhDocApi, MNH_STATUS_CLS, mnhDay, todayKst, won } from "@/lib/api/mnh";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const DAY: Record<string, { cls: string; label: string }> = {
  planned: { cls: "bg-warm-100 text-warm-600", label: "배정 대기" },
  scheduled: { cls: "bg-sky-50 text-sky-700", label: "예정" },
  in_progress: { cls: "bg-brand-500 text-white", label: "방문 중" },
  completed: { cls: "bg-brand-50 text-brand-700", label: "완료" },
};

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-[14px]">
      <span className="shrink-0 text-warm-500">{k}</span>
      <span className="text-right font-semibold text-warm-800">{v}</span>
    </div>
  );
}

export default function MnhDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["member", "mnh", "contract", Number(id)], queryFn: () => mnhApi.contract(Number(id)) });
  const c = q.data;
  const docs = useQuery({ queryKey: ["member", "mnh", "contract-docs", Number(id)], queryFn: () => mnhDocApi.forContract(Number(id)) });
  const cancel = useMutation({
    mutationFn: () => mnhApi.cancel(Number(id)),
    onSuccess: () => { toast.success("신청을 취소했어요."); qc.invalidateQueries({ queryKey: ["member", "mnh"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (q.isError) return <div className="p-6 text-sm text-warm-600">{getApiErrorMessage(q.error)}</div>;
  if (!c) return <div className="p-6 text-sm text-warm-500">불러오는 중…</div>;
  const today = todayKst();
  const changes = c.events.filter((e) => ["postponed", "restored", "swapped", "start_changed"].includes(e.type));

  return (
    <div className="px-4 pt-4 pb-6 lg:mx-auto lg:max-w-3xl">
      <Link href="/mnh" className="inline-flex items-center gap-1 text-sm text-warm-500"><ArrowLeft className="h-4 w-4" />바우처 계약</Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-extrabold tracking-tight text-warm-800">{c.client_name ?? "산모"} 님 바우처</h1>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", MNH_STATUS_CLS[c.status])}>{c.status_label}</span>
      </div>
      <p className="mt-1 text-[13px] text-warm-500">{c.contract_no}</p>

      {c.status === "applied" && (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-[13.5px] leading-relaxed text-amber-800">
          신청이 접수됐어요. 운영팀이 본인부담금 납부 방법을 안내하고 담당 관리사를 배정해 드려요. 본인부담금 납부가 확인돼야 첫 방문이 시작돼요.
        </p>
      )}
      {c.status === "cancelled" && c.cancel_reason && <p className="mt-3 rounded-xl bg-warm-100 px-4 py-3 text-[13.5px]">취소: {c.cancel_reason}</p>}

      <Card className="mt-4 p-4">
        <Row k="기간" v={`${mnhDay(c.start_date)} ~ ${c.end_date ? mnhDay(c.end_date) : "?"}`} />
        <Row k="이용 일수" v={`${c.days}일 (${c.completed_days}일 완료)`} />
        <Row k="방문 시간" v={`${c.daily_start}부터 ${Math.round((c.daily_minutes / 60) * 10) / 10}시간`} />
        {c.support_label && <Row k="지원 유형" v={c.support_label} />}
        {c.rates_set ? (
          <>
            <Row k="서비스 가격" v={won(c.total_price)} />
            <Row k="정부지원금" v={won(c.gov_support)} />
            <Row k="본인부담금" v={<span className="text-brand-700">{won(c.self_pay)}</span>} />
          </>
        ) : (
          <Row k="본인부담금" v={<span className="text-amber-700">운영팀 확인 중</span>} />
        )}
        <Row k="납부" v={c.prepaid ? `${c.payment_method_label} 납부 확인${c.prepaid_at ? ` (${c.prepaid_at.slice(0, 10)})` : ""}` : `${c.payment_method_label} · 납부 전`} />
      </Card>

      {(docs.data?.documents.length ?? 0) > 0 && (
        <Card className="mt-4 p-4">
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-brand-600" />
            <h2 className="text-[15px] font-bold text-warm-800">전자서명 서류</h2>
          </div>
          {docs.data!.missing_before_start.length > 0 && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
              서비스 시작 전에 서명해 주세요: {docs.data!.missing_before_start.join(", ")}
            </p>
          )}
          <ul className="mt-2 divide-y divide-warm-100">
            {docs.data!.documents.filter((d) => d.doc_type !== "provision_record").map((d) => (
              <li key={d.id}>
                <Link href={`/mnh/docs/${d.id}`} className="flex min-h-12 items-center gap-2 py-2">
                  <span className="flex-1 text-[14.5px] font-semibold text-warm-800">{d.title}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-bold", d.status === "signed" ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-800")}>
                    {d.status === "signed" ? "서명 완료" : "서명하기"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-warm-400" />
                </Link>
              </li>
            ))}
          </ul>
          {docs.data!.documents.some((d) => d.doc_type === "provision_record") && (
            <p className="mt-2 text-[13px] text-warm-500">
              서비스 제공기록지 {docs.data!.documents.filter((d) => d.doc_type === "provision_record" && d.status === "signed").length}건 서명 완료 —{" "}
              {docs.data!.documents.filter((d) => d.doc_type === "provision_record").map((d) => (
                <Link key={d.id} href={`/mnh/docs/${d.id}`} className="mr-1.5 font-semibold text-brand-600 underline">{d.issued_at.slice(5, 10).replace("-", "/")}</Link>
              ))}
            </p>
          )}
        </Card>
      )}

      <Card className="mt-4 p-4">
        <h2 className="text-[15px] font-bold text-warm-800">담당 산모신생아 건강관리사</h2>
        {c.caregiver_name ? (
          <>
            <p className="mt-2 text-[16px] font-extrabold text-warm-800">{c.caregiver_name}</p>
            {c.caregiver_documents.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {c.caregiver_documents.map((d) => (
                  <li key={d.type} className="flex items-center gap-2 text-[13px] text-warm-600">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" />
                    {d.label}{d.expires_at ? ` · ${d.expires_at.slice(0, 10)}까지` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[13px] text-warm-500">운영팀이 확인한 공개 서류가 아직 없어요.</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-[14px] text-warm-500">배정되면 알림으로 알려 드려요.</p>
        )}
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="text-[15px] font-bold text-warm-800">일정</h2>
        <ol className="mt-2 divide-y divide-warm-100">
          {c.schedule.map((d) => {
            const st = DAY[d.status] ?? DAY.planned;
            return (
              <li key={d.date} className="flex items-center gap-3 py-2 text-[14px]">
                <span className="w-11 text-[12px] text-warm-500">{d.seq}일차</span>
                <span className={cn("flex-1 font-semibold", d.date === today ? "text-brand-700" : "text-warm-800")}>{mnhDay(d.date)}</span>
                {d.caregiver_name && d.caregiver_name !== c.caregiver_name && <span className="text-[12px] text-warm-500">{d.caregiver_name}</span>}
                <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-bold", st.cls)}>{st.label}</span>
              </li>
            );
          })}
        </ol>
        {c.postponed.length > 0 && (
          <p className="mt-2 text-[13px] text-warm-500">연기된 날: {c.postponed.map(mnhDay).join(", ")}</p>
        )}
      </Card>

      {changes.length > 0 && (
        <Card className="mt-4 p-4">
          <h2 className="text-[15px] font-bold text-warm-800">변경 내역</h2>
          <ul className="mt-2 space-y-1.5 text-[13.5px] text-warm-600">
            {changes.map((e) => (
              <li key={e.id}>
                {e.type === "postponed" && `${e.date ? mnhDay(e.date) : ""} 연기${e.payload?.reason ? ` — ${e.payload.reason}` : ""}`}
                {e.type === "restored" && `${e.date ? mnhDay(e.date) : ""} 연기 취소`}
                {e.type === "swapped" && `${e.date ? mnhDay(e.date) : ""}부터 담당 관리사 변경`}
                {e.type === "start_changed" && "일정 조정"}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {c.status === "applied" && (
        <Button variant="outline" className="mt-5 w-full" disabled={cancel.isPending}
          onClick={() => { if (window.confirm("바우처 계약 신청을 취소할까요?")) cancel.mutate(); }}>
          신청 취소
        </Button>
      )}
      <p className="mt-4 text-center text-[12.5px] text-warm-500">
        일정 변경·관리사 교체는 <Link href="/support" className="font-bold text-brand-600 underline">고객센터</Link>로 요청해 주세요.
      </p>
    </div>
  );
}
