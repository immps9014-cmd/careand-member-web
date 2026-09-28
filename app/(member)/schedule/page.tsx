"use client";
import { DOMAIN_LABEL as DOMAIN } from "@/lib/caregiverType";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { memberApi } from "@/lib/api/member";
import { formatDateTime } from "@/lib/utils";
import { DirectionsLink } from "@/components/care/directions-link";

const STATUS: Record<string, { variant: "warn" | "success" | "outline"; label: string }> = {
  scheduled: { variant: "warn", label: "예정" },
  in_progress: { variant: "success", label: "진행중" },
  completed: { variant: "outline", label: "완료" },
  cancelled: { variant: "outline", label: "취소" },
};

export default function SchedulePage() {
  const query = useQuery({ queryKey: ["member", "cg", "sessions"], queryFn: memberApi.mySessions });

  return (
    <div className="p-5">
      <h1 className="text-xl font-extrabold text-warm-800 mb-1">내 일정</h1>
      <p className="text-sm text-warm-500 mb-5">배정된 케어 세션 일정입니다</p>

      {query.isLoading && <p className="text-center text-warm-500 py-10">불러오는 중…</p>}
      {query.data?.length === 0 && (
        <Card className="p-8 text-center text-warm-500 text-sm">예정된 일정이 없습니다</Card>
      )}

      {/* 모바일: 카드 리스트 */}
      <div className="space-y-3 lg:hidden">
        {query.data?.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-warm-800">{s.senior_name}</span>
                <Badge variant="outline">{DOMAIN[s.service_domain] ?? s.service_domain}</Badge>
              </div>
              <Badge variant={STATUS[s.status]?.variant ?? "outline"}>
                {STATUS[s.status]?.label ?? s.status}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-warm-500">
              <CalendarClock className="w-3.5 h-3.5" />
              {s.scheduled_start ? formatDateTime(s.scheduled_start) : "-"}
              {s.duration_min ? ` · ${s.duration_min}분` : ""}
            </div>
            {s.place && <div className="mt-2"><DirectionsLink place={s.place} /></div>}
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
                  <th className="px-5 py-3 text-left">대상자</th>
                  <th className="px-5 py-3 text-left">서비스</th>
                  <th className="px-5 py-3 text-left">일시</th>
                  <th className="px-5 py-3 text-right">소요</th>
                  <th className="px-5 py-3 text-center">상태</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.map((s) => (
                  <tr key={s.id} className="border-b border-warm-50 last:border-0 hover:bg-warm-50/60">
                    <td className="whitespace-nowrap px-5 py-3.5 font-bold text-warm-800">{s.senior_name}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline">{DOMAIN[s.service_domain] ?? s.service_domain}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-warm-600">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-warm-500" />
                        {s.scheduled_start ? formatDateTime(s.scheduled_start) : "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-warm-600">{s.duration_min ? `${s.duration_min}분` : "-"}</td>
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
