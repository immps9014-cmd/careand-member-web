"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CreditCard, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { memberApi } from "@/lib/api/member";
import { DOMAIN_LABEL } from "@/lib/caregiverType";

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

const STATUS: Record<string, { variant: "warn" | "success" | "danger" | "outline"; label: string }> = {
  pending: { variant: "warn", label: "결제대기" },
  paid: { variant: "success", label: "결제완료" },
  cancelled: { variant: "danger", label: "취소" },
  failed: { variant: "danger", label: "실패" },
};

const METHOD_LABEL: Record<string, string> = {
  card: "카드",
  account: "계좌이체",
  voucher_only: "바우처",
};

// 백엔드 service_domain 값 7종(DOMAIN_LABEL 의 별칭 키는 제외)
const FILTER_DOMAINS = ["senior", "nursing", "housekeeping", "living_support", "postpartum", "childcare", "mental_care"];

/** 최근 12개월(한국 시각) — 월별 필터(기능 8) */
function recentMonths(): string[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

export default function PaymentsPage() {
  const [month, setMonth] = useState("");
  const [domain, setDomain] = useState("");
  const query = useQuery({
    queryKey: ["member", "payments", month, domain],
    queryFn: () => memberApi.payments(undefined, { month: month || undefined, domain: domain || undefined }),
  });
  const selectCls = "h-10 flex-1 rounded-xl border border-warm-200 bg-white px-3 text-sm text-warm-700";

  return (
    <div className="p-5">
      <h1 className="mb-1 text-xl font-extrabold text-warm-800">결제 내역</h1>
      <p className="mb-4 text-sm text-warm-500">돌봄 서비스 결제 내역을 확인하세요</p>
      <div className="mb-4 flex gap-2">
        <select aria-label="월" value={month} onChange={(e) => setMonth(e.target.value)} className={selectCls}>
          <option value="">전체 기간</option>
          {recentMonths().map((m) => <option key={m} value={m}>{m.replace("-", "년 ")}월</option>)}
        </select>
        <select aria-label="서비스" value={domain} onChange={(e) => setDomain(e.target.value)} className={selectCls}>
          <option value="">전체 서비스</option>
          {FILTER_DOMAINS.map((k) => <option key={k} value={k}>{DOMAIN_LABEL[k]}</option>)}
        </select>
      </div>

      {query.isLoading && <p className="py-10 text-center text-warm-500">불러오는 중…</p>}
      {query.data?.length === 0 && (
        <Card className="p-8 text-center text-sm text-warm-500">결제 내역이 없습니다</Card>
      )}

      <div className="space-y-3">
        {query.data?.map((p) => {
          const st = STATUS[p.status] ?? { variant: "outline" as const, label: p.status };
          const pending = p.status === "pending";
          const body = (
            <Card className="p-4">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-warm-700">
                  <CreditCard className="h-4 w-4 text-brand-500" />
                  {p.match?.senior_name ? `${p.match.senior_name} 돌봄` : `매칭 #${p.match?.id ?? p.id}`}
                </div>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-warm-500">
                  {METHOD_LABEL[p.method] ?? p.method}
                  {p.paid_at ? ` · ${p.paid_at.slice(0, 10)}` : p.created_at ? ` · ${p.created_at.slice(0, 10)}` : ""}
                </span>
                <span className="text-[17px] font-extrabold text-warm-800 tabular-nums">{won(p.amount_self_pay)}</span>
              </div>
              {pending && p.match?.id && (
                <p className="mt-2 text-[12px] font-bold text-brand-600">결제를 완료해 주세요 →</p>
              )}
              {(p.status === "paid" || p.status === "cancelled") && (
                <Link href={`/receipt/${p.id}`} className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-brand-600">
                  <Receipt className="h-3.5 w-3.5" /> 영수증 보기
                </Link>
              )}
            </Card>
          );
          // 결제대기 건은 체크아웃 페이지로 연결
          return pending && p.match?.id ? (
            <Link key={p.id} href={`/payments/${p.match.id}`}>
              {body}
            </Link>
          ) : (
            <div key={p.id}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}
