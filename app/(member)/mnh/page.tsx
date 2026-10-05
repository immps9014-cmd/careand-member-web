"use client";

// 내 바우처 계약 — 산모신생아 건강관리 기간형(CAREN-MNH-01 2단계, 2026-10-05)
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, NotebookPen, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mnhApi, MNH_STATUS_CLS, mnhDay, won } from "@/lib/api/mnh";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export default function MnhListPage() {
  const q = useQuery({ queryKey: ["member", "mnh", "contracts"], queryFn: mnhApi.contracts });
  const rows = q.data ?? [];

  return (
    <div className="px-4 pt-4 pb-6 lg:mx-auto lg:max-w-3xl">
      <h1 className="text-xl font-extrabold tracking-tight text-warm-800">바우처 계약</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-warm-500">
        보건복지부 산모신생아 건강관리 바우처로 5~40일 동안 건강관리사가 방문해요. 케어앤이 제공기관으로 계약·담당 배정·일정을 맡아요.
      </p>

      <Link href="/request/new?domain=postpartum&mode=voucher" className="mt-4 block">
        <Button variant="brand" size="lg" className="w-full rounded-2xl"><Plus className="h-5 w-5" />새 바우처 계약 신청</Button>
      </Link>
      <Link href="/mnh/journal" className="mt-2 block">
        <Button variant="outline" size="lg" className="w-full rounded-2xl"><NotebookPen className="h-5 w-5" />이용일지 쓰기</Button>
      </Link>

      {q.isLoading && <Card className="mt-4 p-8 text-center text-sm text-warm-500">불러오는 중…</Card>}
      {q.isError && <Card className="mt-4 p-6 text-sm text-warm-600">{getApiErrorMessage(q.error)}</Card>}
      {q.isSuccess && rows.length === 0 && (
        <Card className="mt-4 p-6 text-center text-sm text-warm-500">아직 신청한 바우처 계약이 없어요.</Card>
      )}

      <ul className="mt-4 space-y-3">
        {rows.map((c) => (
          <li key={c.id}>
            <Link href={`/mnh/${c.id}`}>
              <Card className="p-4 flex items-center gap-3 hover:bg-warm-50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", MNH_STATUS_CLS[c.status])}>{c.status_label}</span>
                    <span className="text-[15px] font-bold text-warm-800 truncate">{c.client_name ?? "산모"} 님 · {c.days}일</span>
                  </div>
                  <p className="mt-1 text-[13px] text-warm-600">
                    {mnhDay(c.start_date)} ~ {c.end_date ? mnhDay(c.end_date) : "?"}
                  </p>
                  <p className="text-[13px] text-warm-500">
                    본인부담금 {c.rates_set ? won(c.self_pay) : "운영팀 확인 중"} · {c.prepaid ? "납부 확인" : "납부 전"}
                    {c.caregiver_name ? ` · 담당 ${c.caregiver_name}` : ""}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-warm-400" />
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
