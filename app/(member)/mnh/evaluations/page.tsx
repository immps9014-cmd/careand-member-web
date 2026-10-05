"use client";

// 돌봄전문가 — 내 종합평가 육각형 + 이용자 평가(CAREN-MNH-01 4단계)
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { HexagonChart } from "@/components/mnh/hexagon-chart";
import { mnhEvalApi, mnhDay } from "@/lib/api/mnh";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export default function MnhEvaluationsPage() {
  const hex = useQuery({ queryKey: ["member", "mnh", "my-hex"], queryFn: mnhEvalApi.myHexagon, retry: false });
  const list = useQuery({ queryKey: ["member", "mnh", "client-evals"], queryFn: mnhEvalApi.contracts, retry: false });
  const h = hex.data;
  return (
    <div className="px-4 pt-4 pb-6 lg:mx-auto lg:max-w-3xl">
      <h1 className="text-xl font-extrabold tracking-tight text-warm-800">평가</h1>
      <p className="mt-1.5 text-sm text-warm-500">내 종합평가와, 내가 맡은 산모 가정에 대한 평가예요.</p>

      <Card className="mt-4 p-4">
        <h2 className="text-[15px] font-bold text-warm-800">내 종합평가</h2>
        {hex.isError && <p className="mt-2 text-sm text-warm-600">{getApiErrorMessage(hex.error)}</p>}
        {h && (
          <>
            <p className="mt-1 text-[13px] text-warm-500">
              이용자 후기 {h.counts.reviews}건 · 기관 평가 {h.counts.org_evaluations}건 · 완료 방문 {h.counts.completed_visits}회를 모았어요.
            </p>
            <div className="mx-auto mt-2 max-w-sm"><HexagonChart axes={h.axes} compare={h.team_average} title="나" size={160} fontScale={1.5} pad={150} /></div>
            <ul className="mt-2 divide-y divide-warm-100">
              {h.axes.map((a) => (
                <li key={a.key} className="flex items-center justify-between py-2 text-[14px]">
                  <span className="text-warm-700">{a.label}</span>
                  <span className="font-bold tabular-nums text-warm-800">
                    {a.score === null ? <span className="font-normal text-warm-500">자료 없음</span> : a.score.toFixed(1)}
                    {a.score !== null && !a.enough && <span className="ml-1 text-[12px] font-normal text-warm-500">(근거 적음)</span>}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <h2 className="mt-6 text-[15px] font-bold text-warm-800">이용자 평가</h2>
      <p className="mt-1 text-[13px] text-warm-500">기본 예절·업무범위·휴게시간·협조를 평가해요. 이용자에게는 보이지 않고 운영팀만 봐요.</p>
      {list.isSuccess && list.data.length === 0 && <Card className="mt-3 p-6 text-center text-sm text-warm-500">맡은 바우처 가정이 없어요.</Card>}
      <ul className="mt-3 space-y-2">
        {list.data?.map((c) => (
          <li key={c.contract_id}>
            <Link href={`/mnh/evaluations/${c.contract_id}`}>
              <Card className="flex items-center gap-3 p-4 hover:bg-warm-50">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-warm-800">{c.client_name ?? "산모"} 님</p>
                  <p className="text-[13px] text-warm-500">{mnhDay(c.start_date)} ~ {c.end_date ? mnhDay(c.end_date) : "?"} · 수시 {c.interim_count}회</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", c.final_done ? "bg-brand-50 text-brand-700" : c.status === "completed" ? "bg-amber-50 text-amber-800" : "bg-warm-100 text-warm-600")}>
                  {c.final_done ? "종료 평가 완료" : c.status === "completed" ? "종료 평가 필요" : "진행 중"}
                </span>
                <ChevronRight className="h-5 w-5 text-warm-400" />
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
