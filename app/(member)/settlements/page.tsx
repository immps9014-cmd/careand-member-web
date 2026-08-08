"use client";

import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { memberApi } from "@/lib/api/member";
import { formatKRW } from "@/lib/utils";

const STATUS: Record<string, { variant: "warn" | "success" | "danger" | "outline"; label: string }> = {
  draft: { variant: "outline", label: "작성중" },
  confirmed: { variant: "warn", label: "확정" },
  paid: { variant: "success", label: "지급완료" },
  failed: { variant: "danger", label: "실패" },
};

export default function MemberSettlementsPage() {
  const query = useQuery({ queryKey: ["member", "settlements"], queryFn: memberApi.settlements });

  return (
    <div className="p-5">
      <h1 className="text-xl font-extrabold text-warm-800 mb-1">정산 내역</h1>
      <p className="text-sm text-warm-500 mb-5">주간 정산 명세와 입금 내역을 확인하세요</p>

      {query.isLoading && <p className="text-center text-warm-500 py-10">불러오는 중…</p>}
      {query.data?.length === 0 && (
        <Card className="p-8 text-center text-warm-500 text-sm">정산 내역이 없습니다</Card>
      )}

      {/* 모바일: 카드 리스트 */}
      <div className="space-y-3 lg:hidden">
        {query.data?.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-warm-600">
                <Wallet className="w-4 h-4 text-brand-500" />
                {s.period_start} ~ {s.period_end}
              </div>
              <Badge variant={STATUS[s.status]?.variant ?? "outline"}>
                {STATUS[s.status]?.label ?? s.status}
              </Badge>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-warm-500">세전 금액</span>
                <span className="font-en text-warm-700">{formatKRW(s.gross_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-warm-500">원천징수 (3.3%)</span>
                <span className="font-en text-warm-500">-{formatKRW(s.withholding_tax)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-warm-100">
                <span className="font-bold text-warm-700">실지급액</span>
                <span className="font-en font-extrabold text-brand-600">{formatKRW(s.net_amount)}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 데스크톱: 표 */}
      {!!query.data?.length && (
        <div className="hidden lg:block">
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-100 bg-warm-50 text-xs font-bold text-warm-500">
                  <th className="px-5 py-3 text-left">정산 기간</th>
                  <th className="px-5 py-3 text-right">세전 금액</th>
                  <th className="px-5 py-3 text-right">원천징수 (3.3%)</th>
                  <th className="px-5 py-3 text-right">실지급액</th>
                  <th className="px-5 py-3 text-center">상태</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map((s) => (
                  <tr key={s.id} className="border-b border-warm-50 last:border-0 hover:bg-warm-50/60">
                    <td className="whitespace-nowrap px-5 py-3.5 text-warm-700">
                      <span className="inline-flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-brand-500" />
                        {s.period_start} ~ {s.period_end}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-en text-warm-700">{formatKRW(s.gross_amount)}</td>
                    <td className="px-5 py-3.5 text-right font-en text-warm-500">-{formatKRW(s.withholding_tax)}</td>
                    <td className="px-5 py-3.5 text-right font-en font-extrabold text-brand-600">{formatKRW(s.net_amount)}</td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant={STATUS[s.status]?.variant ?? "outline"}>
                        {STATUS[s.status]?.label ?? s.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
