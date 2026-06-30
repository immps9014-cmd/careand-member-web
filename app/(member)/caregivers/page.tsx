"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, UserPlus, X, Clock, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { organizationApi } from "@/lib/api/organization";
import { caregiverDomainLabels } from "@/lib/caregiverType";
import { getApiErrorMessage } from "@/lib/api/client";

const STATUS_LABEL: Record<string, { label: string; variant: "success" | "outline" | "warn" }> = {
  active: { label: "활동중", variant: "success" },
  pending: { label: "검수중", variant: "warn" },
  suspended: { label: "정지", variant: "outline" },
  rejected: { label: "반려", variant: "outline" },
};

export default function OrgCaregiversPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");

  const roster = useQuery({
    queryKey: ["org", "roster"],
    queryFn: organizationApi.roster,
    retry: false,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["org", "roster"] });

  const invite = useMutation({
    mutationFn: () => organizationApi.inviteCaregiver(phone),
    onSuccess: (res) => {
      toast.success(res.message);
      if (res.data?.invite_link) {
        // 미가입 초대: 링크를 함께 안내(SMS 외 직접 공유 가능)
        toast(res.data.invite_link, { duration: 8000 });
      }
      setPhone("");
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => organizationApi.removeCaregiver(id),
    onSuccess: () => { toast.success("소속을 해제했습니다."); invalidate(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const cancel = useMutation({
    mutationFn: (id: number) => organizationApi.cancelInvite(id),
    onSuccess: () => { toast.success("초대를 취소했습니다."); invalidate(); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const phoneValid = /^01[0-9]\d{7,8}$/.test(phone);
  const members = roster.data?.members ?? [];
  const invites = roster.data?.pending_invites ?? [];

  return (
    <div className="min-h-screen bg-warm-50">
      <header className="sticky top-0 z-10 bg-white border-b border-warm-100 px-4 py-3.5 flex items-center gap-2">
        <button onClick={() => router.push("/home")} className="text-warm-700 -ml-1" aria-label="뒤로">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-extrabold text-warm-800">소속 간병인 관리</h1>
      </header>

      <div className="p-4 space-y-5 lg:mx-auto lg:max-w-3xl">
        {/* 초대/추가 */}
        <Card className="p-4">
          <div className="text-sm font-bold text-warm-700 mb-2">간병인 추가</div>
          <p className="text-xs text-warm-500 mb-3">
            전화번호로 추가합니다. 가입된 간병인은 바로 소속되고, 미가입자는 가입 초대를 보냅니다.
          </p>
          <div className="flex gap-2">
            <Input
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="01012345678"
              maxLength={11}
            />
            <Button
              variant="brand"
              disabled={!phoneValid || invite.isPending}
              onClick={() => invite.mutate()}
              className="shrink-0"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              {invite.isPending ? "처리 중" : "추가"}
            </Button>
          </div>
        </Card>

        {/* 소속 명단 */}
        <div>
          <div className="flex items-center mb-2">
            <h2 className="text-base font-extrabold text-warm-800">소속 간병인</h2>
            <span className="ml-auto text-xs font-bold text-warm-400">{members.length}명</span>
          </div>
          {roster.isLoading && <div className="text-center text-warm-400 text-sm py-6">불러오는 중…</div>}
          {!roster.isLoading && members.length === 0 && (
            <Card className="p-6 text-center text-warm-400 text-sm">아직 소속 간병인이 없습니다</Card>
          )}
          <div className="space-y-2">
            {members.map((m) => {
              const st = STATUS_LABEL[m.status] ?? { label: m.status, variant: "outline" as const };
              const domains = caregiverDomainLabels(m.service_domains).join(" · ");
              return (
                <Card key={m.caregiver_id} className="p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-700">
                    {m.name?.[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-warm-800 truncate">{m.name ?? "이름없음"}</span>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                    <div className="text-xs text-warm-500 mt-0.5 truncate">{domains || "직군 미지정"}</div>
                  </div>
                  <button
                    onClick={() => { if (confirm(`${m.name} 간병인의 소속을 해제할까요?`)) remove.mutate(m.caregiver_id); }}
                    className="text-warm-400 hover:text-danger p-1"
                    aria-label="소속 해제"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 대기 중 초대 */}
        {invites.length > 0 && (
          <div>
            <h2 className="text-base font-extrabold text-warm-800 mb-2">대기 중 초대</h2>
            <div className="space-y-2">
              {invites.map((iv) => (
                <Card key={iv.invite_id} className="p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center text-warm-500">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-warm-700 font-semibold">
                      <Phone className="w-3.5 h-3.5 text-warm-400" />
                      {iv.phone}
                    </div>
                    <div className="text-xs text-warm-400 mt-0.5">가입 대기 중</div>
                  </div>
                  <button
                    onClick={() => cancel.mutate(iv.invite_id)}
                    className="text-warm-400 hover:text-danger p-1"
                    aria-label="초대 취소"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
