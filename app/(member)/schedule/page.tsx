"use client";
import { DOMAIN_LABEL as DOMAIN } from "@/lib/caregiverType";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { memberApi } from "@/lib/api/member";
import { useAuth } from "@/lib/auth/store";
import { usesCaregiverShell } from "@/lib/role";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";
import { DirectionsLink } from "@/components/care/directions-link";

const STATUS: Record<string, { variant: "warn" | "success" | "outline"; label: string }> = {
  scheduled: { variant: "warn", label: "예정" },
  in_progress: { variant: "success", label: "진행중" },
  completed: { variant: "outline", label: "완료" },
  cancelled: { variant: "outline", label: "취소" },
};

/** 보호자와 돌봄전문가가 같은 주소(/schedule)를 쓴다 — API 만 역할별로 다르다. */
export default function SchedulePage() {
  const { user } = useAuth();
  return user && !usesCaregiverShell(user.role) ? <GuardianSchedule /> : <CaregiverSchedule />;
}

/** 보호자 「방문일정」 — 돌봄 대상의 예정·진행·완료 방문. 완료된 방문은 케어일지로 이어진다. */
function GuardianSchedule() {
  const query = useQuery({ queryKey: ["member", "guardian", "sessions"], queryFn: memberApi.guardianSessions });
  const list = [...(query.data ?? [])].sort((a, b) => {
    // 다가오는 일정이 위로, 지난 일정은 최근 것부터
    const upcoming = (x: typeof a) => (x.status === "scheduled" || x.status === "in_progress" ? 0 : 1);
    if (upcoming(a) !== upcoming(b)) return upcoming(a) - upcoming(b);
    const ta = a.scheduled_start ? Date.parse(a.scheduled_start) : 0;
    const tb = b.scheduled_start ? Date.parse(b.scheduled_start) : 0;
    return upcoming(a) === 0 ? ta - tb : tb - ta;
  });

  return (
    <div className="p-5 lg:mx-auto lg:max-w-3xl">
      <h1 className="text-xl font-extrabold text-warm-800 mb-1">방문일정</h1>
      <p className="text-sm text-warm-500 mb-5">돌봄전문가가 방문하는 일정이에요</p>

      {query.isLoading && <p className="text-center text-warm-500 py-10">불러오는 중…</p>}
      {query.isError && (
        <Card className="p-6 text-center text-sm text-warm-600">{getApiErrorMessage(query.error)}</Card>
      )}
      {query.data?.length === 0 && (
        <Card className="p-8 text-center text-warm-500 text-sm">
          아직 잡힌 방문 일정이 없어요.<br />
          <Link href="/request/new" className="mt-2 inline-block font-bold text-brand-600 underline">돌봄 신청하기</Link>
        </Card>
      )}

      <div className="space-y-3">
        {list.map((s) => {
          const body = (
            <>
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-bold text-warm-800">{s.recipient_name}</span>
                  <Badge variant="outline">{DOMAIN[s.service_domain] ?? s.service_domain}</Badge>
                </div>
                <Badge variant={STATUS[s.status]?.variant ?? "outline"}>{STATUS[s.status]?.label ?? s.status}</Badge>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-warm-600">
                <CalendarClock className="w-4 h-4" />
                {s.scheduled_start ? formatDateTime(s.scheduled_start) : "-"}
                {s.duration_min ? ` · ${s.duration_min}분` : ""}
              </div>
              {s.status === "completed" && (
                <div className="mt-2 text-sm font-semibold text-brand-600">{s.has_summary ? "케어일지 보기 ›" : "케어일지 준비 중"}</div>
              )}
            </>
          );
          return s.status === "completed" && s.has_summary ? (
            <Link key={s.id} href={`/logs/${s.id}`} className="block"><Card className="p-4">{body}</Card></Link>
          ) : (
            <Card key={s.id} className="p-4">{body}</Card>
          );
        })}
      </div>
    </div>
  );
}

function CaregiverSchedule() {
  const query = useQuery({ queryKey: ["member", "cg", "sessions"], queryFn: memberApi.mySessions });

  return (
    <div className="p-5">
      <h1 className="text-xl font-extrabold text-warm-800 mb-1">내 일정</h1>
      <p className="text-sm text-warm-500 mb-5">배정된 케어 세션 일정입니다</p>

      {query.isLoading && <p className="text-center text-warm-500 py-10">불러오는 중…</p>}
      {query.isError && (
        <Card className="p-6 text-center text-sm text-warm-600">{getApiErrorMessage(query.error)}</Card>
      )}
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
