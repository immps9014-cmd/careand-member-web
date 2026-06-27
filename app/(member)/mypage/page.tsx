"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Mail, ShieldCheck, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/store";
import { authApi } from "@/lib/api/auth";
import { memberApi } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { caregiverRoleLabel } from "@/lib/caregiverType";
import { roleLabel } from "@/lib/role";

export default function MyPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, logout } = useAuth();
  const isCaregiver = user?.role === "caregiver";
  const cg = useQuery({ queryKey: ["mypage", "caregiver"], queryFn: memberApi.myCaregiver, enabled: isCaregiver, retry: false });

  const [rate, setRate] = useState("");
  const [autoBid, setAutoBid] = useState(false);
  useEffect(() => {
    if (cg.data) {
      setRate(cg.data.default_rate != null ? String(cg.data.default_rate) : "");
      setAutoBid(!!cg.data.auto_bid);
    }
  }, [cg.data]);

  const save = useMutation({
    mutationFn: () =>
      memberApi.updateCaregiver({
        default_rate: rate && Number(rate) > 0 ? Number(rate) : null,
        auto_bid: autoBid,
      }),
    onSuccess: () => {
      toast.success("입찰 설정을 저장했습니다.");
      qc.invalidateQueries({ queryKey: ["mypage", "caregiver"] });
      qc.invalidateQueries({ queryKey: ["member", "cg"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  async function handleLogout() {
    await authApi.logout();
    logout();
    router.replace("/login");
  }

  return (
    <div className="p-5">
      <h1 className="text-xl font-extrabold text-warm-800 mb-5">내 정보</h1>

      <Card className="p-5 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xl">
            {user?.name?.[0] ?? "회"}
          </div>
          <div>
            <div className="font-bold text-warm-800 text-lg">{user?.name}</div>
            <Badge variant="success">{isCaregiver ? caregiverRoleLabel(cg.data?.service_domains) : roleLabel(user?.role)}</Badge>
          </div>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-3 text-warm-600">
            <Mail className="w-4 h-4 text-warm-400" />
            <span className="font-en">{user?.email ?? "-"}</span>
          </div>
          <div className="flex items-center gap-3 text-warm-600">
            <ShieldCheck className="w-4 h-4 text-warm-400" />
            <span>{user?.status === "active" ? "활성 계정" : user?.status}</span>
          </div>
        </div>
      </Card>

      {/* 역경매 입찰 설정 (돌봄전문가 전용) */}
      {isCaregiver && cg.data?.status === "active" && (
        <Card className="p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-brand-600" />
            <h2 className="font-bold text-warm-800">입찰 설정</h2>
          </div>

          <label className="block text-[12.5px] font-bold text-warm-600 mb-2">표준 희망 시급</label>
          <Input
            type="number"
            inputMode="numeric"
            step={500}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="예) 20000"
            className="tabular-nums"
          />
          <p className="text-[11px] text-warm-400 mt-1.5">매칭 초대 시 입찰가가 이 금액으로 미리 채워집니다.</p>

          <label className="flex items-center justify-between mt-4 cursor-pointer">
            <span className="text-[13.5px] font-semibold text-warm-700">자동 입찰</span>
            <button
              type="button"
              role="switch"
              aria-checked={autoBid}
              onClick={() => setAutoBid((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${autoBid ? "bg-brand-600" : "bg-warm-300"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${autoBid ? "translate-x-5" : ""}`} />
            </button>
          </label>
          <p className="text-[11px] text-warm-400 mt-1.5">켜면 새 매칭 초대 시 표준 시급으로 자동 입찰합니다.</p>

          <Button
            variant="brand"
            className="w-full mt-4"
            disabled={save.isPending || (autoBid && !(rate && Number(rate) > 0))}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "저장 중…" : "저장"}
          </Button>
          {autoBid && !(rate && Number(rate) > 0) && (
            <p className="text-[11px] text-danger mt-1.5">자동 입찰을 켜려면 표준 희망 시급을 입력하세요.</p>
          )}
        </Card>
      )}

      <Button variant="outline" className="w-full" onClick={handleLogout}>
        <LogOut className="w-4 h-4" />
        로그아웃
      </Button>

      <p className="text-center text-xs text-warm-400 mt-6">Care& 회원 앱 v1.0</p>
    </div>
  );
}
