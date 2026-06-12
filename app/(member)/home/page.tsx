"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, Check, X, LogIn, LogOut, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/store";
import { memberApi } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";

const REQ_STATUS: Record<string, { variant: "warn" | "success" | "danger" | "outline"; label: string }> = {
  open: { variant: "warn", label: "매칭중" },
  matching: { variant: "warn", label: "매칭중" },
  matched: { variant: "success", label: "매칭완료" },
  cancelled: { variant: "danger", label: "취소" },
  expired: { variant: "danger", label: "만료" },
};

const DOMAIN: Record<string, string> = {
  senior: "시니어", postpartum: "산후", care: "간병", companion: "동행", housekeeping: "가사",
};

export default function HomePage() {
  const user = useAuth((s) => s.user);
  if (user?.role === "caregiver") return <CaregiverHome />;
  return <GuardianHome name={user?.name} />;
}

/* ============ 보호자 홈 ============ */
function GuardianHome({ name }: { name?: string }) {
  const query = useQuery({
    queryKey: ["member", "guardian", "requests"],
    queryFn: () => memberApi.guardianRequests(),
  });

  return (
    <div className="p-5">
      <h1 className="text-xl font-extrabold text-warm-800 mb-1">안녕하세요, {name}님</h1>
      <p className="text-sm text-warm-500 mb-5">진행 중인 돌봄 매칭을 확인하세요</p>

      <Link href="/request/new">
        <Button variant="brand" size="lg" className="w-full mb-6">
          <Plus className="w-4 h-4" /> 새 돌봄 매칭 요청
        </Button>
      </Link>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-warm-700">내 매칭 요청</h2>
        <span className="text-xs text-warm-400">{query.data?.length ?? 0}건</span>
      </div>

      {query.isLoading && <p className="text-center text-warm-400 py-10">불러오는 중…</p>}
      {query.data?.length === 0 && (
        <Card className="p-8 text-center text-warm-400 text-sm">매칭 요청이 없습니다</Card>
      )}

      <div className="space-y-3">
        {query.data?.map((r) => (
          <Link key={r.id} href={`/request/${r.id}`}>
            <Card className="p-4 flex items-center justify-between active:bg-warm-50 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-warm-800">
                    {r.senior?.name ?? r.nursing_patient?.name ?? "대상자"}
                  </span>
                  {r.service_domain === "nursing" && <Badge variant="info">간병</Badge>}
                  <Badge variant={REQ_STATUS[r.status]?.variant ?? "outline"}>
                    {REQ_STATUS[r.status]?.label ?? r.status}
                  </Badge>
                </div>
                <div className="text-xs text-warm-500">
                  {r.category?.name ?? "돌봄"} ·{" "}
                  {r.scheduled_start ? formatDateTime(r.scheduled_start) : "일정 미정"}
                  {r.nursing_patient?.hospital_name && ` · ${r.nursing_patient.hospital_name}`}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-warm-300" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ============ 인력 홈 ============ */
function CaregiverHome() {
  const qc = useQueryClient();
  const matches = useQuery({ queryKey: ["member", "cg", "matches"], queryFn: memberApi.myMatches });
  const sessions = useQuery({ queryKey: ["member", "cg", "sessions"], queryFn: memberApi.mySessions });

  const accept = useMutation({
    mutationFn: (cid: number) => memberApi.acceptMatch(cid),
    onSuccess: () => { toast.success("수락했습니다."); qc.invalidateQueries({ queryKey: ["member", "cg"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const reject = useMutation({
    mutationFn: (cid: number) => memberApi.rejectMatch(cid),
    onSuccess: () => { toast.success("거절했습니다."); qc.invalidateQueries({ queryKey: ["member", "cg"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const checkin = useMutation({
    mutationFn: (sid: number) => memberApi.checkin(sid),
    onSuccess: () => { toast.success("출근 체크 완료"); qc.invalidateQueries({ queryKey: ["member", "cg", "sessions"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const checkout = useMutation({
    mutationFn: (sid: number) => memberApi.checkout(sid),
    onSuccess: () => { toast.success("퇴근 체크 완료"); qc.invalidateQueries({ queryKey: ["member", "cg", "sessions"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const pending = matches.data?.filter((m) => m.response === "pending") ?? [];

  return (
    <div className="p-5">
      <h1 className="text-xl font-extrabold text-warm-800 mb-5">오늘의 케어</h1>

      {/* 매칭 알림 (수락 대기) */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-warm-700">새 매칭 제안</h2>
        <span className="text-xs text-warm-400">{pending.length}건</span>
      </div>
      {pending.length === 0 && (
        <Card className="p-6 text-center text-warm-400 text-sm mb-6">대기 중인 매칭 제안이 없습니다</Card>
      )}
      <div className="space-y-3 mb-6">
        {pending.map((m) => (
          <Card key={m.candidate_id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-warm-800">{m.senior_name}</span>
                <Badge variant="outline">{DOMAIN[m.service_domain] ?? m.service_domain}</Badge>
                {m.rank === 1 && <Badge variant="success">1순위</Badge>}
              </div>
              <span className="text-xs text-warm-400 font-en">AI {(m.ai_score * 100).toFixed(0)}점</span>
            </div>
            <div className="text-xs text-warm-500 mb-3">
              {m.scheduled_start ? formatDateTime(m.scheduled_start) : "일정 미정"} · {m.duration_min}분
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="brand" className="flex-1" disabled={accept.isPending}
                onClick={() => accept.mutate(m.candidate_id)}>
                <Check className="w-4 h-4" /> 수락
              </Button>
              <Button size="sm" variant="outline" className="flex-1" disabled={reject.isPending}
                onClick={() => reject.mutate(m.candidate_id)}>
                <X className="w-4 h-4" /> 거절
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* 오늘 일정 */}
      <h2 className="font-bold text-warm-700 mb-3">내 케어 일정</h2>
      {sessions.data?.length === 0 && (
        <Card className="p-6 text-center text-warm-400 text-sm">예정된 일정이 없습니다</Card>
      )}
      <div className="space-y-3">
        {sessions.data?.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-warm-800">{s.senior_name}</span>
              <Badge variant={s.status === "in_progress" ? "success" : s.status === "completed" ? "outline" : "warn"}>
                {s.status === "in_progress" ? "진행중" : s.status === "completed" ? "완료" : s.status === "scheduled" ? "예정" : s.status}
              </Badge>
            </div>
            <div className="text-xs text-warm-500 mb-3">
              {s.scheduled_start ? formatDateTime(s.scheduled_start) : "-"}
            </div>
            {s.status === "scheduled" && (
              <Button size="sm" variant="brand" className="w-full" disabled={checkin.isPending}
                onClick={() => checkin.mutate(s.id)}>
                <LogIn className="w-4 h-4" /> 출근 체크
              </Button>
            )}
            {s.status === "in_progress" && (
              <Button size="sm" variant="outline" className="w-full" disabled={checkout.isPending}
                onClick={() => checkout.mutate(s.id)}>
                <LogOut className="w-4 h-4" /> 퇴근 체크
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
