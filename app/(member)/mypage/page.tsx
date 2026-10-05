"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, Wallet, User as UserIcon, Phone, Mail, MapPin, KeyRound, ChevronDown, Type, AlertTriangle, FileCheck2, ChevronRight, Star } from "lucide-react";
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
import { useSeniorMode } from "@/lib/senior-mode";
import { PushSettingsCard } from "@/components/push-settings";
import { CaregiverExtrasCard } from "@/components/caregiver-extras";

export default function MyPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const seniorOn = useSeniorMode((s) => s.on);
  const toggleSenior = useSeniorMode((s) => s.toggle);
  const setUser = useAuth((s) => s.setUser);
  const logout = useAuth((s) => s.logout);
  const isCaregiver = user?.role === "caregiver";
  const cg = useQuery({ queryKey: ["mypage", "caregiver"], queryFn: memberApi.myCaregiver, enabled: isCaregiver, retry: false });
  const leaveToggle = useMutation({
    mutationFn: (returning: boolean) => (returning ? memberApi.requestReturn() : memberApi.requestLeave()),
    onSuccess: (res) => { toast.success(res.data?.message ?? "처리했어요"); qc.invalidateQueries({ queryKey: ["mypage", "caregiver"] }); },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  /* ===== 계정 정보 ===== */
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
      setEmail(user.email ?? "");
    }
  }, [user]);

  // 비밀번호 변경(접이식)
  const [pwOpen, setPwOpen] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");

  const accountDirty =
    name !== (user?.name ?? "") || phone !== (user?.phone ?? "") || email !== (user?.email ?? "");
  const pwDirty = pwOpen && (curPw || newPw || confPw);

  const saveAccount = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof authApi.updateMe>[0] = {};
      if (name !== (user?.name ?? "")) payload.name = name.trim();
      if (phone !== (user?.phone ?? "")) payload.phone = phone.trim();
      if (email !== (user?.email ?? "")) payload.email = email.trim();
      if (pwDirty) {
        payload.current_password = curPw;
        payload.password = newPw;
        payload.password_confirmation = confPw;
      }
      return authApi.updateMe(payload);
    },
    onSuccess: ({ user: u }) => {
      setUser(u);
      toast.success("계정 정보를 저장했습니다.");
      setCurPw(""); setNewPw(""); setConfPw(""); setPwOpen(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  function submitAccount() {
    if (!name.trim()) { toast.error("이름을 입력하세요."); return; }
    if (pwDirty) {
      if (!curPw) { toast.error("현재 비밀번호를 입력하세요."); return; }
      if (newPw.length < 8) { toast.error("새 비밀번호는 8자 이상이어야 합니다."); return; }
      if (newPw !== confPw) { toast.error("새 비밀번호 확인이 일치하지 않습니다."); return; }
    }
    if (!accountDirty && !pwDirty) { toast("변경된 내용이 없습니다."); return; }
    saveAccount.mutate();
  }

  /* ===== 가입 정보(인력): 활동 지역 주소 ===== */
  const [address, setAddress] = useState("");
  useEffect(() => {
    if (cg.data) setAddress(cg.data.base_address ?? "");
  }, [cg.data]);
  const addressDirty = address !== (cg.data?.base_address ?? "");

  const saveProfile = useMutation({
    mutationFn: () => memberApi.updateCaregiver({ base_address: address.trim() }),
    onSuccess: () => {
      toast.success("가입 정보를 저장했습니다.");
      qc.invalidateQueries({ queryKey: ["mypage", "caregiver"] });
      qc.invalidateQueries({ queryKey: ["member", "cg"] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  /* ===== 역경매 입찰 설정 ===== */
  const [rate, setRate] = useState("");
  const [autoBid, setAutoBid] = useState(false);
  useEffect(() => {
    if (cg.data) {
      setRate(cg.data.default_rate != null ? String(cg.data.default_rate) : "");
      setAutoBid(!!cg.data.auto_bid);
    }
  }, [cg.data]);

  const saveBid = useMutation({
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
    qc.clear(); // 다음 로그인 사용자에게 이전 계정 캐시가 남지 않도록 비움
    router.replace("/login");
  }

  /* ===== 회원 탈퇴 ===== */
  const [wOpen, setWOpen] = useState(false);
  const [wPw, setWPw] = useState("");
  const [wReason, setWReason] = useState("");
  const withdraw = useMutation({
    mutationFn: () => authApi.withdraw({ current_password: wPw, reason: wReason.trim() || undefined }),
    onSuccess: () => {
      toast.success("회원 탈퇴가 완료되었습니다.");
      logout();
      qc.clear();
      router.replace("/login");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  function submitWithdraw() {
    if (!wPw) { toast.error("현재 비밀번호를 입력하세요."); return; }
    if (typeof window !== "undefined" && !window.confirm("정말 탈퇴하시겠습니까? 계정과 이용 내역은 복구할 수 없습니다.")) return;
    withdraw.mutate();
  }

  return (
    <div className="p-5 lg:mx-auto lg:max-w-5xl">
      <h1 className="text-xl font-extrabold text-warm-800 mb-5">내 정보</h1>

      {/* 데스크톱 2단: 좌(프로필 sticky) / 우(편집 카드) */}
      <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6 lg:items-start">
      {/* ── 좌측: 프로필 ── */}
      <div className="lg:sticky lg:top-6">
      {/* 프로필 헤더 */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xl">
            {user?.name?.[0] ?? "회"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-warm-800 text-lg">{user?.name}</div>
            <Badge variant="success">{isCaregiver ? caregiverRoleLabel(cg.data?.service_domains) : roleLabel(user?.role)}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-warm-500 mt-3">
          <ShieldCheck className="w-3.5 h-3.5 text-warm-500" />
          {user?.status === "active" ? "활성 계정" : user?.status}
        </div>
      </Card>
      </div>

      {/* ── 우측: 편집 카드 + 로그아웃 ── */}
      <div>
      {/* 화면 설정 — 시니어 모드 (P2-5) */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Type className="w-4 h-4 text-brand-600" />
          <h2 className="font-bold text-warm-800">화면 설정</h2>
        </div>
        <button
          type="button"
          onClick={toggleSenior}
          aria-pressed={seniorOn}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-warm-800">시니어 모드</div>
            <div className="text-[13px] text-warm-500 mt-0.5">글씨를 크게, 색을 더 진하게 보여줘요</div>
          </div>
          <span
            className={
              "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors " +
              (seniorOn ? "bg-brand-500" : "bg-warm-200")
            }
          >
            <span
              className={
                "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform " +
                (seniorOn ? "translate-x-6" : "translate-x-1")
              }
            />
          </span>
        </button>
      </Card>

      {/* 계정 정보 수정 */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <UserIcon className="w-4 h-4 text-brand-600" />
          <h2 className="font-bold text-warm-800">계정 정보</h2>
        </div>

        <Field label="이름" icon={<UserIcon className="w-4 h-4 text-warm-500" />}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" maxLength={50} />
        </Field>
        <Field label="연락처" icon={<Phone className="w-4 h-4 text-warm-500" />}>
          <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\-]/g, ""))} inputMode="numeric" placeholder="01012345678" className="font-en tabular-nums" />
        </Field>
        <Field label="이메일" icon={<Mail className="w-4 h-4 text-warm-500" />}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="font-en" />
        </Field>

        {/* 비밀번호 변경 */}
        <button
          type="button"
          onClick={() => setPwOpen((v) => !v)}
          className="flex items-center gap-2 w-full mt-1 mb-1 text-[14px] font-semibold text-warm-600"
        >
          <KeyRound className="w-4 h-4 text-warm-500" />
          비밀번호 변경
          <ChevronDown className={`w-4 h-4 ml-auto text-warm-500 transition-transform ${pwOpen ? "rotate-180" : ""}`} />
        </button>
        {pwOpen && (
          <div className="space-y-2.5 mt-2 mb-1">
            <Input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} placeholder="현재 비밀번호" autoComplete="current-password" />
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="새 비밀번호 (8자 이상)" autoComplete="new-password" />
            <Input type="password" value={confPw} onChange={(e) => setConfPw(e.target.value)} placeholder="새 비밀번호 확인" autoComplete="new-password" />
          </div>
        )}

        <Button
          variant="brand"
          className="w-full mt-4"
          disabled={saveAccount.isPending || (!accountDirty && !pwDirty)}
          onClick={submitAccount}
        >
          {saveAccount.isPending ? "저장 중…" : "계정 정보 저장"}
        </Button>
      </Card>

      {/* 서류·정산 계좌(인력) — 기능 9·20 */}
      {isCaregiver && (
        <Link href="/documents" className="mb-4 block">
          <Card className="flex items-center gap-3 p-5 transition-colors lg:hover:bg-warm-50/60">
            <FileCheck2 className="h-5 w-5 flex-none text-brand-600" />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-warm-800">서류 · 정산 계좌</div>
              <div className="text-xs text-warm-500">신분증·통장 사본·범죄경력 회보서 등 자격 서류 제출과 정산 계좌 등록</div>
            </div>
            <ChevronRight className="h-4 w-4 flex-none text-warm-400" />
          </Card>
        </Link>
      )}

      {/* 전자서명 계약서(산모신생아 건강관리사 근로·프리랜서 계약 등, CAREN-MNH-01 3단계) */}
      {isCaregiver && (cg.data?.service_domains ?? "").split(",").includes("postpartum") && (
        <Link href="/mnh/docs" className="mb-4 block">
          <Card className="flex items-center gap-3 p-5 transition-colors lg:hover:bg-warm-50/60">
            <FileCheck2 className="h-5 w-5 flex-none text-brand-600" />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-warm-800">전자서명 계약서</div>
              <div className="text-xs text-warm-500">제공기관과 맺는 근로·프리랜서 계약서 확인과 서명</div>
            </div>
            <ChevronRight className="h-4 w-4 flex-none text-warm-400" />
          </Card>
        </Link>
      )}
      {isCaregiver && (cg.data?.service_domains ?? "").split(",").includes("postpartum") && (
        <Link href="/mnh/evaluations" className="mb-4 block">
          <Card className="flex items-center gap-3 p-5 transition-colors lg:hover:bg-warm-50/60">
            <Star className="h-5 w-5 flex-none text-brand-600" />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-warm-800">종합평가 · 이용자 평가</div>
              <div className="text-xs text-warm-500">내 육각형 종합평가와 맡은 산모 가정 평가</div>
            </div>
            <ChevronRight className="h-4 w-4 flex-none text-warm-400" />
          </Card>
        </Link>
      )}

      {/* 받은 후기·활동(기능 16) */}
      {isCaregiver && (
        <Link href="/my-activity" className="mb-4 block">
          <Card className="flex items-center gap-3 p-5 transition-colors lg:hover:bg-warm-50/60">
            <Star className="h-5 w-5 flex-none text-amber-500" />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-warm-800">받은 후기 · 활동</div>
              <div className="text-xs text-warm-500">평균 평점, 월별 돌봄 횟수, 보호자 후기</div>
            </div>
            <ChevronRight className="h-4 w-4 flex-none text-warm-400" />
          </Card>
        </Link>
      )}

      {/* 휴직·복귀(기능 16) — 휴직 중엔 새 매칭 후보에서 빠진다 */}
      {isCaregiver && cg.data && (cg.data.status === "active" || cg.data.status === "leave") && (
        <Card className="p-5 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-warm-800">{cg.data.status === "leave" ? "휴직 중" : "활동 중"}</div>
              <div className="text-xs text-warm-500">
                {cg.data.status === "leave" ? "복귀하면 다시 새 돌봄 요청을 받을 수 있어요." : "휴직하면 새 돌봄 요청을 받지 않아요. 이미 잡힌 일정은 그대로 진행해 주세요."}
              </div>
            </div>
            <Button variant="outline" size="sm" disabled={leaveToggle.isPending}
              onClick={() => { if (window.confirm(cg.data!.status === "leave" ? "복귀할까요?" : "휴직할까요?")) leaveToggle.mutate(cg.data!.status === "leave"); }}>
              {cg.data.status === "leave" ? "복귀하기" : "휴직 신청"}
            </Button>
          </div>
        </Card>
      )}

      {/* 가입 정보(인력): 활동 지역 */}
      {isCaregiver && cg.data && (
        <Card className="p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-brand-600" />
            <h2 className="font-bold text-warm-800">가입 정보</h2>
          </div>
          <Field label="활동 지역(주소)" icon={<MapPin className="w-4 h-4 text-warm-500" />}>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="예) 경기 화성시 동탄대로 100" maxLength={255} />
          </Field>
          <p className="text-[12px] text-warm-500 mt-1.5">주소를 바꾸면 매칭 거리 계산에 자동 반영됩니다.</p>
          {cg.data.specialties && cg.data.specialties.length > 0 && (
            <div className="mt-3">
              <div className="text-[13.5px] font-bold text-warm-600 mb-1.5">가능 서비스</div>
              <div className="flex flex-wrap gap-1.5">
                {cg.data.specialties.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
              </div>
            </div>
          )}
          <Button
            variant="brand"
            className="w-full mt-4"
            disabled={saveProfile.isPending || !addressDirty || !address.trim()}
            onClick={() => saveProfile.mutate()}
          >
            {saveProfile.isPending ? "저장 중…" : "가입 정보 저장"}
          </Button>
        </Card>
      )}

      {/* 프로필 사진·비상연락처·희망사항(2026-10-05) */}
      {isCaregiver && cg.data && <CaregiverExtrasCard />}

      {/* 역경매 입찰 설정 (돌봄전문가 전용) */}
      {isCaregiver && cg.data?.status === "active" && (
        <Card className="p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-brand-600" />
            <h2 className="font-bold text-warm-800">입찰 설정</h2>
          </div>

          <label className="block text-[13.5px] font-bold text-warm-600 mb-2">표준 희망 시급</label>
          <Input
            type="number"
            inputMode="numeric"
            step={500}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="예) 20000"
            className="tabular-nums"
          />
          <p className="text-[12px] text-warm-500 mt-1.5">매칭 초대 시 입찰가가 이 금액으로 미리 채워집니다.</p>

          <label className="flex items-center justify-between mt-4 cursor-pointer">
            <span className="text-[14.5px] font-semibold text-warm-700">자동 입찰</span>
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
          <p className="text-[12px] text-warm-500 mt-1.5">켜면 새 매칭 초대 시 표준 시급으로 자동 입찰합니다.</p>

          <Button
            variant="brand"
            className="w-full mt-4"
            disabled={saveBid.isPending || (autoBid && !(rate && Number(rate) > 0))}
            onClick={() => saveBid.mutate()}
          >
            {saveBid.isPending ? "저장 중…" : "입찰 설정 저장"}
          </Button>
          {autoBid && !(rate && Number(rate) > 0) && (
            <p className="text-[12px] text-danger mt-1.5">자동 입찰을 켜려면 표준 희망 시급을 입력하세요.</p>
          )}
        </Card>
      )}

      {/* 웹 푸시 알림(PWA 1단계) */}
      <PushSettingsCard />

      {/* 바로가기 — 돌봄 받는 분(보호자) · 산후우울 검사(산모) · 고객센터 */}
      <Card className="mb-4 divide-y divide-warm-100 p-0">
        {!isCaregiver && (
          <Link href="/recipients" className="flex min-h-14 items-center justify-between px-5 py-3 text-base font-bold text-warm-800">
            돌봄 받는 분 <ChevronRight className="h-5 w-5 text-warm-400" />
          </Link>
        )}
        {!isCaregiver && (user?.guardian?.intent === "postpartum" || user?.guardian?.preferences?.services?.includes("postpartum")) && (
          <>
            <Link href="/mnh" className="flex min-h-14 items-center justify-between px-5 py-3 text-base font-bold text-warm-800">
              바우처 계약 <ChevronRight className="h-5 w-5 text-warm-400" />
            </Link>
            <Link href="/mnh/journal" className="flex min-h-14 items-center justify-between px-5 py-3 text-base font-bold text-warm-800">
              이용일지 <ChevronRight className="h-5 w-5 text-warm-400" />
            </Link>
            <Link href="/epds" className="flex min-h-14 items-center justify-between px-5 py-3 text-base font-bold text-warm-800">
              산후우울 자가검사 <ChevronRight className="h-5 w-5 text-warm-400" />
            </Link>
          </>
        )}
        <Link href="/support" className="flex min-h-14 items-center justify-between px-5 py-3 text-base font-bold text-warm-800">
          고객센터 · 자주 묻는 질문 <ChevronRight className="h-5 w-5 text-warm-400" />
        </Link>
      </Card>

      <Button variant="outline" className="w-full" onClick={handleLogout}>
        <LogOut className="w-4 h-4" />
        로그아웃
      </Button>

      {/* 회원 탈퇴 */}
      <div className="mt-3">
        {!wOpen ? (
          <button
            type="button"
            onClick={() => setWOpen(true)}
            className="mx-auto block text-[14px] font-semibold text-warm-500 underline underline-offset-2 hover:text-danger"
          >
            회원 탈퇴
          </button>
        ) : (
          <Card className="p-5 border-danger/40">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-danger" />
              <h2 className="font-bold text-danger">회원 탈퇴</h2>
            </div>
            <p className="text-[13.5px] leading-relaxed text-warm-600 mb-4">
              탈퇴하면 계정과 이용 내역에 다시 접근할 수 없으며, 진행 중인 매칭 요청은 자동 취소됩니다.
              {isCaregiver && " 활동 중인 돌봄전문가 프로필도 노출이 중단됩니다."} 이 작업은 되돌릴 수 없습니다.
            </p>
            <Field label="현재 비밀번호 확인" icon={<KeyRound className="w-4 h-4 text-warm-500" />}>
              <Input
                type="password"
                value={wPw}
                onChange={(e) => setWPw(e.target.value)}
                placeholder="현재 비밀번호"
                autoComplete="current-password"
              />
            </Field>
            <div className="mb-4">
              <label className="mb-1.5 block text-[13.5px] font-bold text-warm-600">탈퇴 사유 (선택)</label>
              <Input value={wReason} onChange={(e) => setWReason(e.target.value)} placeholder="개선에 참고할게요" maxLength={500} />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={withdraw.isPending}
                onClick={() => { setWOpen(false); setWPw(""); setWReason(""); }}
              >
                취소
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={withdraw.isPending || !wPw}
                onClick={submitWithdraw}
              >
                {withdraw.isPending ? "처리 중…" : "탈퇴하기"}
              </Button>
            </div>
          </Card>
        )}
      </div>

      <p className="text-center text-xs text-warm-500 mt-6">Care& 회원 앱 v1.0</p>
      </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="flex items-center gap-1.5 text-[13.5px] font-bold text-warm-600 mb-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
