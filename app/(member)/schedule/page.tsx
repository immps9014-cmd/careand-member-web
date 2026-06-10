"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { memberApi } from "@/lib/api/member";
import { formatDateTime } from "@/lib/utils";

const DOMAIN: Record<string, string> = {
  senior: "시니어", postpartum: "산후", care: "간병", companion: "동행", housekeeping: "가사",
};
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

      {query.isLoading && <p className="text-center text-warm-400 py-10">불러오는 중…</p>}
      {query.data?.length === 0 && (
        <Card className="p-8 text-center text-warm-400 text-sm">예정된 일정이 없습니다</Card>
      )}

      <div className="space-y-3">
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
          </Card>
        ))}
      </div>
    </div>
  );
}
