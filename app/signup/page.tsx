"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ShieldCheck, Stethoscope, HeartHandshake, Building2, Sparkles, Check, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { caregiverApi } from "@/lib/api/caregiver";
import { organizationApi } from "@/lib/api/organization";
import { useAuth } from "@/lib/auth/store";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type Role = "guardian" | "caregiver" | "organization";
/** 가입 화면에서 사용자가 고르는 카드. 가사요청자(housekeeping)는 백엔드상 guardian으로 가입한다. */
type Kind = "guardian" | "housekeeping" | "postpartum" | "caregiver" | "organization";
type Step = "role" | "account" | "caregiver" | "organization" | "done";

const RELATIONS = ["본인", "자녀", "배우자", "부모", "형제", "기타"];
const SPECIALTIES = ["시니어돌봄", "생활지원서비스", "병원간병", "산후관리", "아이돌봄", "마음돌봄", "방문목욕", "치매전문"];

/** 돌봄전문가 활동 도메인(공급자 직군) 선택지 — service_domains 전송용 */
const CAREGIVER_DOMAINS: { token: string; label: string }[] = [
  { token: "senior", label: "시니어돌봄" },
  { token: "living_support", label: "생활지원서비스" },
  { token: "nursing", label: "병원간병" },
  { token: "postpartum", label: "산모·산후관리" },
  { token: "childcare", label: "아이돌봄" },
  { token: "mental_care", label: "마음돌봄" },
];

/**
 * 도메인별 자격 정책 (백엔드 config/service_domains.php qualification 미러).
 * required=자격번호 필수, types=인정 자격증 종류(있으면 종류 선택), verify=진위조회 경로.
 */
const DOMAIN_QUAL: Record<string, { required: boolean; label: string; types: string[]; manual?: boolean }> = {
  senior: { required: true, label: "요양보호사 자격번호", types: ["요양보호사"] },
  living_support: { required: false, label: "자격번호 (선택)", types: [] },
  nursing: { required: true, label: "간병 관련 자격번호", types: ["요양보호사", "간호조무사", "간병사", "간호사"] },
  postpartum: { required: true, label: "산후관리 관련 자격번호", types: ["산후관리사", "간호사", "간호조무사"] },
  childcare: { required: false, label: "아이돌봄 관련 자격번호 (선택)", types: ["아이돌보미", "보육교사", "유치원정교사", "베이비시터"], manual: true },
  mental_care: {
    required: true,
    label: "상담 관련 자격증 번호",
    types: ["상담심리사", "임상심리사", "정신건강임상심리사", "청소년상담사", "전문상담교사", "정신건강사회복지사", "사회복지사"],
    manual: true,
  },
};

/** YYYY-MM-DD (오늘) */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
/** 만 N세가 되는 최신 생년월일 (date input max) */
function maxBirthDate(minAge: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - minAge);
  return d.toISOString().slice(0, 10);
}

/** 가입 후 돌아갈 내부 경로(신청화면 등). 외부/프로토콜 리다이렉트 차단. */
function safeRedirect(): string | null {
  if (typeof window === "undefined") return null;
  const r = new URLSearchParams(window.location.search).get("redirect");
  return r && /^\/(?![/\\])/.test(r) ? r : null;
}

export default function SignupPage() {
  const router = useRouter();
  const { setUser, setTokens } = useAuth();

  const [step, setStep] = useState<Step>("role");
  const [kind, setKind] = useState<Kind | null>(null);
  // 백엔드 role은 카드 선택에서 파생 — 가사요청자·산모요청자는 guardian으로 가입(intent로 구분)
  const role: Role | null = kind === "housekeeping" || kind === "postpartum" ? "guardian" : kind;

  // 인증 (회원정보 화면에 인라인으로 통합)
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verifyToken, setVerifyToken] = useState("");

  // 계정
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [relation, setRelation] = useState("자녀");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  // 돌봄전문가 자격정보
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"M" | "F" | "">("");
  const [cgDomains, setCgDomains] = useState<string[]>(["senior"]); // 활동 도메인(복수 선택 가능)
  const [licenseNo, setLicenseNo] = useState("");
  const [licenseType, setLicenseType] = useState(""); // 자격증 종류
  const [licenseIssuedAt, setLicenseIssuedAt] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [baseAddress, setBaseAddress] = useState("");

  // 활동 도메인 토글(복수). 변경 시 자격종류 초기화(도메인별 인정 자격이 달라질 수 있음).
  const toggleCgDomain = (token: string) => {
    setCgDomains((prev) =>
      prev.includes(token) ? prev.filter((t) => t !== token) : [...prev, token]
    );
    setLicenseType("");
  };

  // 기관 정보
  const [bizNo, setBizNo] = useState("");
  const [orgName, setOrgName] = useState("");
  const [representative, setRepresentative] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [bizType, setBizType] = useState("");

  const totalSteps = role === "caregiver" || role === "organization" ? 3 : 2;
  const stepIndex: Record<Step, number> = { role: 0, account: 1, caregiver: 2, organization: 2, done: 3 };
  // 현재 단계(1-based). 각 입력 화면 상단 배지에 "N / M 단계"로 표시.
  const stepNo = stepIndex[step] + 1;

  // ===== mutations =====
  const sendOtpM = useMutation({
    mutationFn: () => authApi.sendOtp(phone),
    onSuccess: () => {
      setOtp("");
      setOtpSent(true);
      toast.success("인증번호를 전송했어요.");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const verifyOtpM = useMutation({
    mutationFn: () => authApi.verifyOtp(phone, otp),
    onSuccess: (data: any) => {
      const token = data?.phone_verify_token ?? data?.data?.phone_verify_token ?? "";
      if (!token) {
        toast.error("인증 확인에 실패했어요. 인증번호를 다시 입력해주세요.");
        return;
      }
      setVerifyToken(token); // 인라인 인증 완료 — 단계 이동 없음
      toast.success("휴대폰 인증이 완료됐어요.");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const signupM = useMutation({
    mutationFn: () =>
      authApi.signup({
        email,
        phone,
        phone_verify_token: verifyToken,
        name,
        password,
        password_confirmation: passwordConfirm,
        role: role as Role,
        ...(kind === "housekeeping" ? { intent: "housekeeping" as const } : {}),
        ...(kind === "postpartum" ? { intent: "postpartum" as const } : {}),
        ...(kind === "guardian" ? { relation } : {}),
        agree_terms: agreeTerms,
        agree_privacy: agreePrivacy,
      }),
    onSuccess: (data) => {
      // 두 역할 모두 토큰 저장(돌봄전문가 자격등록 API 인증에 사용)
      setTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      if (role === "caregiver") {
        setStep("caregiver");
      } else if (role === "organization") {
        setStep("organization");
      } else {
        setStep("done"); // 보호자는 완료 화면 표시
      }
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const registerM = useMutation({
    mutationFn: () => {
      const hasLicense = licenseNo.trim().length >= 4;
      return caregiverApi.register({
        birth_date: birthDate,
        gender: gender as "M" | "F",
        service_domains: cgDomains.length ? cgDomains : ["senior"],
        license_no: hasLicense ? licenseNo.trim() : undefined,
        license_type: licenseType || undefined,
        license_issued_at: hasLicense ? licenseIssuedAt : undefined,
        specialties: specialties.length ? specialties : undefined,
        base_address: baseAddress.trim(),
      });
    },
    onSuccess: () => setStep("done"),
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const registerOrgM = useMutation({
    mutationFn: () =>
      organizationApi.register({
        biz_no: bizNo.trim(),
        name: orgName.trim(),
        representative: representative.trim(),
        contact_phone: orgPhone.trim(),
        biz_type: bizType.trim() || undefined,
      }),
    onSuccess: () => setStep("done"),
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  // ===== validation =====
  const phoneValid = /^01[0-9]\d{7,8}$/.test(phone);
  const submitAccount = () => {
    if (!verifyToken) { toast.error("휴대폰 인증을 완료해주세요."); return; }
    if (name.trim().length < 2) { toast.error("이름을 2자 이상 입력해주세요."); return; }
    if (!/^[A-Za-z0-9][A-Za-z0-9._@+-]{3,}$/.test(email)) {
      toast.error("아이디는 영문/숫자로 시작하는 4자 이상이어야 해요."); return;
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      toast.error("비밀번호는 8자 이상이며 영문과 숫자를 포함해야 해요."); return;
    }
    if (password !== passwordConfirm) { toast.error("비밀번호가 일치하지 않아요."); return; }
    if (!agreeTerms || !agreePrivacy) { toast.error("이용약관과 개인정보 처리방침에 동의해주세요."); return; }
    signupM.mutate();
  };
  // 선택 도메인들의 자격 정책 union (복수 선택 대응)
  const cgQuals = cgDomains.map((d) => DOMAIN_QUAL[d]).filter(Boolean);
  const cgRequired = cgQuals.some((q) => q.required);
  const cgTypeOptions = Array.from(new Set(cgQuals.flatMap((q) => q.types)));
  const cgNeedsType = cgQuals.some((q) => q.required && q.types.length > 0);
  const cgLicenseLabel = cgRequired ? "자격번호" : "자격번호 (선택)";
  const licenseTypeValid =
    cgTypeOptions.length === 0
      ? true
      : licenseType
      ? cgTypeOptions.includes(licenseType)
      : !cgNeedsType; // 종류 미선택은 종류가 필요한 경우에만 불가
  const caregiverValid =
    cgDomains.length >= 1 &&
    !!birthDate &&
    !!gender &&
    baseAddress.trim().length >= 5 &&
    (cgRequired ? licenseNo.trim().length >= 4 && !!licenseIssuedAt : true) &&
    licenseTypeValid;
  const orgValid =
    bizNo.trim().length >= 8 && orgName.trim().length >= 2 && representative.trim().length >= 2 && orgPhone.trim().length >= 8;

  const back = () => {
    if (step === "account") setStep("role");
    // caregiver/done 단계는 뒤로가기 비활성(가입 진행 후)
  };

  // 역할 선택(첫 화면)에서 '뒤로' = 직전 페이지로 복귀.
  // 공개 웹(/www)에서 왔으면 거기로, 직접 진입(히스토리 없음)했으면 공개 웹 홈으로 폴백.
  const exitToPrev = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      // basePath(/app) 바깥의 공개 웹 — Next Link가 아닌 절대 경로로 이동
      window.location.href = "/www";
    }
  };

  const toggleSpecialty = (s: string) =>
    setSpecialties((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-warm-100 flex justify-center">
      <div className="w-full max-w-md px-5 py-5 flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center gap-2 h-9">
          {step === "account" ? (
            <button onClick={back} className="text-warm-700 -ml-1" aria-label="뒤로">
              <ChevronLeft className="w-7 h-7" />
            </button>
          ) : step === "role" ? (
            <button onClick={exitToPrev} className="flex items-center gap-0.5 text-warm-700 -ml-1 text-sm font-semibold" aria-label="Care& 홈으로 돌아가기">
              <ChevronLeft className="w-6 h-6" />
              홈으로
            </button>
          ) : (
            <div className="w-6" />
          )}
          {step !== "done" && (
            <div className="flex-1 flex gap-1 ml-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    i < stepIndex[step] ? "bg-brand-500" : "bg-warm-200"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* ===== STEP: 역할 선택 ===== */}
        {step === "role" && (
          <div className="flex-1 pt-6">
            <StepBadge current={1} name="서비스 선택" />
            <h1 className="text-[26px] font-extrabold leading-[1.25] text-warm-800 tracking-tight">
              어떤 돌봄이 필요하신가요?
              <br />
              <span className="text-brand-500">Care&amp;</span>이 도와드리겠습니다.
            </h1>
            <p className="text-sm font-medium text-warm-500 mt-3">
              필요한 서비스를 선택하면 꼭 맞는 검증된 전문가로 연결해 드려요.
            </p>

            <div className="mt-7 space-y-3">
              <RoleCard
                active={kind === "guardian"}
                onClick={() => setKind("guardian")}
                icon={<HeartHandshake className="w-6 h-6" />}
                title="개인 돌봄 요청"
                desc="어르신 · 아이 · 마음 돌봄을 직접 요청해요"
              />
              <RoleCard
                active={kind === "postpartum"}
                onClick={() => setKind("postpartum")}
                icon={<Baby className="w-6 h-6" />}
                title="산모·산후관리 요청"
                desc="본인(산모)을 위한 산후관리 돌봄을 직접 요청해요"
              />
              <RoleCard
                active={kind === "housekeeping"}
                onClick={() => setKind("housekeeping")}
                icon={<Sparkles className="w-6 h-6" />}
                title="생활지원서비스"
                desc="청소 · 정리수납 · 수리 · 동행 도우미를 찾아요"
              />
              <RoleCard
                active={kind === "caregiver"}
                onClick={() => setKind("caregiver")}
                icon={<Stethoscope className="w-6 h-6" />}
                title="돌봄전문가"
                desc="요양보호사 · 간병인 · 생활지원 · 산후 · 아이돌봄 · 상담으로 활동해요"
              />
              <RoleCard
                active={kind === "organization"}
                onClick={() => setKind("organization")}
                icon={<Building2 className="w-6 h-6" />}
                title="기관"
                desc="요양·간병 기관으로 간병인 매칭을 요청해요"
              />
            </div>

            <div className="mt-7">
              <Button
                variant="brand"
                size="lg"
                className="w-full"
                disabled={!kind}
                onClick={() => setStep("account")}
              >
                다음
              </Button>
              <p className="text-center text-xs text-warm-500 mt-4">
                이미 계정이 있으신가요?{" "}
                <Link href="/login" className="text-brand-600 font-semibold">
                  로그인
                </Link>
              </p>
              <button
                type="button"
                onClick={exitToPrev}
                className="mt-3 mx-auto flex items-center gap-1 text-xs font-semibold text-warm-500 hover:text-warm-700"
              >
                <ChevronLeft className="w-4 h-4" />
                메인으로 돌아가기
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP: 계정 정보 (휴대폰 인증 통합) ===== */}
        {step === "account" && (
          <div className="flex-1 pt-6 pb-4">
            <StepBadge current={stepNo} total={totalSteps} name="계정 정보" />
            <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">계정 정보를 입력해주세요</h1>
            <p className="text-sm text-warm-500 mt-2">
              {role === "caregiver"
                ? "활동에 사용할 계정 정보를 입력해주세요."
                : role === "organization"
                ? "기관 담당자 계정 정보를 입력해주세요."
                : kind === "housekeeping"
                ? "가사 서비스를 신청할 계정 정보를 입력해주세요."
                : kind === "postpartum"
                ? "산후관리 서비스를 신청할 계정 정보를 입력해주세요."
                : "마지막으로 보호자 정보를 알려주세요."}
            </p>

            <div className="mt-6 space-y-4">
              {/* 휴대폰 인증 (인라인) */}
              <Field label="휴대폰 번호">
                <div className="flex gap-2">
                  <Input
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="01012345678"
                    maxLength={11}
                    disabled={!!verifyToken}
                    autoComplete="tel"
                  />
                  <Button
                    type="button"
                    variant="brand"
                    className="shrink-0 px-4"
                    disabled={!phoneValid || sendOtpM.isPending || !!verifyToken}
                    onClick={() => sendOtpM.mutate()}
                  >
                    {verifyToken ? "인증완료" : sendOtpM.isPending ? "전송중" : otpSent ? "재전송" : "인증요청"}
                  </Button>
                </div>
              </Field>

              {otpSent && !verifyToken && (
                <Field label="인증번호 6자리">
                  <div className="flex gap-2">
                    <Input
                      inputMode="numeric"
                      autoFocus
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="tracking-[0.3em]"
                    />
                    <Button
                      type="button"
                      variant="brand"
                      className="shrink-0 px-4"
                      disabled={otp.length !== 6 || verifyOtpM.isPending}
                      onClick={() => verifyOtpM.mutate()}
                    >
                      {verifyOtpM.isPending ? "확인중" : "확인"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-warm-400 mt-1.5">
                    개발 테스트 중에는 인증번호 <b className="text-warm-600">123456</b> 을 입력하세요.
                  </p>
                </Field>
              )}

              {verifyToken && (
                <p className="flex items-center gap-1 text-xs font-semibold text-brand-600">
                  <Check className="w-4 h-4" strokeWidth={3} /> 휴대폰 인증이 완료됐어요.
                </p>
              )}

              <Field label="이름">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" autoComplete="name" />
              </Field>
              <Field label="아이디">
                <Input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="영문/숫자 4자 이상"
                  autoComplete="username"
                />
              </Field>
              <Field label="비밀번호 (8자 이상, 영문+숫자)">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </Field>
              <Field
                label="비밀번호 확인"
                error={passwordConfirm.length > 0 && password !== passwordConfirm ? "비밀번호가 일치하지 않아요" : undefined}
              >
                <Input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>

              {kind === "guardian" && (
                <Field label="돌봄 대상과의 관계 (선택)">
                  <div className="flex flex-wrap gap-2">
                    {RELATIONS.map((r) => (
                      <Chip key={r} active={relation === r} onClick={() => setRelation(r)}>
                        {r}
                      </Chip>
                    ))}
                  </div>
                </Field>
              )}

              <div className="bg-warm-100 rounded-xl p-4 space-y-3">
                <CheckRow checked={agreeTerms} onToggle={() => setAgreeTerms((v) => !v)} label="(필수) 이용약관 동의" />
                <CheckRow checked={agreePrivacy} onToggle={() => setAgreePrivacy((v) => !v)} label="(필수) 개인정보 처리방침 동의" />
              </div>
            </div>

            <div className="mt-6">
              <Button
                variant="brand"
                size="lg"
                className="w-full"
                disabled={signupM.isPending}
                onClick={submitAccount}
              >
                {signupM.isPending
                  ? "처리 중..."
                  : role === "caregiver"
                  ? "다음 (자격정보 입력)"
                  : role === "organization"
                  ? "다음 (기관정보 입력)"
                  : "가입 완료"}
              </Button>
              <button
                type="button"
                onClick={back}
                className="mt-3 mx-auto flex items-center gap-1 text-xs font-semibold text-warm-500 hover:text-warm-700"
              >
                <ChevronLeft className="w-4 h-4" />
                이전으로 돌아가기
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP: 돌봄전문가 자격정보 ===== */}
        {step === "caregiver" && (
          <div className="flex-1 pt-6 pb-4">
            <StepBadge current={stepNo} total={totalSteps} name="자격 정보" />
            <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">자격정보를 등록해주세요</h1>
            <p className="text-sm text-warm-500 mt-2">
              {cgDomains.includes("mental_care")
                ? "상담 자격은 담당자 수동 검증을 거쳐 승인됩니다. 자격증 종류를 정확히 선택해 주세요."
                : cgDomains.length > 1
                ? "활동할 도메인을 모두 선택하세요. 자격은 보유 자격증 기준으로 검수됩니다."
                : "자격종류에 맞는 발급기관 진위확인 또는 담당자 검수를 거쳐 승인됩니다."}
            </p>

            <div className="mt-6 space-y-4">
              <Field label="활동 도메인 (하나 이상 선택)">
                <div className="flex flex-wrap gap-2">
                  {CAREGIVER_DOMAINS.map((d) => (
                    <Chip key={d.token} active={cgDomains.includes(d.token)} onClick={() => toggleCgDomain(d.token)}>
                      {d.label}
                    </Chip>
                  ))}
                </div>
              </Field>

              <Field label="생년월일 (만 18세 이상)">
                <Input
                  type="date"
                  value={birthDate}
                  max={maxBirthDate(18)}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </Field>

              <Field label="성별">
                <div className="flex gap-2">
                  <Chip active={gender === "M"} onClick={() => setGender("M")}>남성</Chip>
                  <Chip active={gender === "F"} onClick={() => setGender("F")}>여성</Chip>
                </div>
              </Field>

              {cgTypeOptions.length > 0 && (
                <Field label={`자격증 종류${cgNeedsType ? "" : " (선택)"}`}>
                  <select
                    value={licenseType}
                    onChange={(e) => setLicenseType(e.target.value)}
                    className="h-11 w-full rounded-xl border border-warm-200 bg-white px-3 text-[15px] text-warm-800 outline-none focus:border-brand-400"
                  >
                    <option value="">자격증 종류 선택</option>
                    {cgTypeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label={cgLicenseLabel}>
                <Input
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value)}
                  placeholder={cgRequired ? "자격증 번호" : "자격증 번호 (보유 시)"}
                />
              </Field>

              {(cgRequired || licenseNo.trim().length > 0) && (
                <Field label="자격 취득일">
                  <Input
                    type="date"
                    value={licenseIssuedAt}
                    max={todayStr()}
                    onChange={(e) => setLicenseIssuedAt(e.target.value)}
                  />
                </Field>
              )}

              <Field label="가능 서비스 (선택)">
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((s) => (
                    <Chip key={s} active={specialties.includes(s)} onClick={() => toggleSpecialty(s)}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </Field>

              <Field label="활동 기본 주소">
                <Input
                  value={baseAddress}
                  onChange={(e) => setBaseAddress(e.target.value)}
                  placeholder="예) 서울특별시 강남구 테헤란로 123"
                />
              </Field>
            </div>

            <div className="mt-6">
              <Button
                variant="brand"
                size="lg"
                className="w-full"
                disabled={!caregiverValid || registerM.isPending}
                onClick={() => registerM.mutate()}
              >
                {registerM.isPending ? "등록 중..." : "가입 신청 완료"}
              </Button>
              <button
                type="button"
                onClick={() => router.push("/home")}
                className="mt-3 mx-auto flex items-center gap-1 text-xs font-semibold text-warm-500 hover:text-warm-700"
              >
                <ChevronLeft className="w-4 h-4" />
                나중에 입력하기 (홈으로)
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP: 기관 정보 ===== */}
        {step === "organization" && (
          <div className="flex-1 pt-6 pb-4">
            <StepBadge current={stepNo} total={totalSteps} name="기관 정보" />
            <h1 className="text-2xl font-extrabold text-warm-800 tracking-tight">기관 정보를 등록해주세요</h1>
            <p className="text-sm text-warm-500 mt-2">사업자 정보는 관리자 검수를 거쳐 승인됩니다.</p>

            <div className="mt-6 space-y-4">
              <Field label="사업자등록번호">
                <Input
                  inputMode="numeric"
                  value={bizNo}
                  onChange={(e) => setBizNo(e.target.value)}
                  placeholder="000-00-00000"
                />
              </Field>

              <Field label="기관명">
                <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="예) OO방문요양센터" />
              </Field>

              <Field label="대표자명">
                <Input value={representative} onChange={(e) => setRepresentative(e.target.value)} placeholder="홍길동" />
              </Field>

              <Field label="기관 연락처">
                <Input
                  inputMode="numeric"
                  value={orgPhone}
                  onChange={(e) => setOrgPhone(e.target.value)}
                  placeholder="0212345678"
                />
              </Field>

              <Field label="업종 (선택)">
                <Input value={bizType} onChange={(e) => setBizType(e.target.value)} placeholder="예) 방문요양 · 간병" />
              </Field>
            </div>

            <div className="mt-6">
              <Button
                variant="brand"
                size="lg"
                className="w-full"
                disabled={!orgValid || registerOrgM.isPending}
                onClick={() => registerOrgM.mutate()}
              >
                {registerOrgM.isPending ? "등록 중..." : "가입 신청 완료"}
              </Button>
              <button
                type="button"
                onClick={() => router.push("/home")}
                className="mt-3 mx-auto flex items-center gap-1 text-xs font-semibold text-warm-500 hover:text-warm-700"
              >
                <ChevronLeft className="w-4 h-4" />
                나중에 입력하기 (홈으로)
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP: 완료 ===== */}
        {step === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
            <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center">
              {role === "caregiver" || role === "organization" ? (
                <ShieldCheck className="w-10 h-10 text-brand-600" />
              ) : (
                <Check className="w-10 h-10 text-brand-600" strokeWidth={3} />
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-warm-800 mt-6">
              {role === "caregiver" || role === "organization" ? "가입 신청이 접수되었어요" : "가입이 완료되었어요!"}
            </h1>
            <p className="text-sm text-warm-600 mt-3 leading-relaxed">
              {role === "caregiver" ? (
                <>
                  자격증 진위확인과 관리자 검수가 완료되면<br />
                  활동을 시작하실 수 있어요. 검수 결과는 알림으로 안내드립니다.
                </>
              ) : role === "organization" ? (
                <>
                  사업자 정보 검수가 완료되면 이용하실 수 있어요.<br />
                  검수 결과는 알림으로 안내드립니다.
                </>
              ) : kind === "housekeeping" ? (
                <>
                  {name ? `${name} 님, ` : ""}환영합니다.<br />
                  이제 서비스 받을 주소를 등록하고 생활지원서비스를 신청해보세요.
                </>
              ) : kind === "postpartum" ? (
                <>
                  {name ? `${name} 님, ` : ""}환영합니다.<br />
                  이제 산후관리 서비스를 바로 신청해보세요. (본인 정보로 별도 산모 등록 없이 신청돼요)
                </>
              ) : (
                <>
                  {name ? `${name} 님, ` : ""}환영합니다.<br />
                  이제 필요한 돌봄 서비스를 선택하고 신청해보세요.
                </>
              )}
            </p>
            <div className="w-full mt-8">
              <Button
                variant="brand"
                size="lg"
                className="w-full"
                onClick={() => {
                  // 돌봄전문가·기관은 검수 대기 → 항상 홈. 보호자·가사요청자만 신청 동선으로.
                  if (role === "caregiver" || role === "organization") return router.push("/home");
                  // 공개웹 "신청하기"로 진입한 경우 복귀 URL(신청화면)을 최우선.
                  const back = safeRedirect();
                  router.push(
                    back ??
                      (kind === "housekeeping"
                        ? "/request/new?domain=living_support"
                        : kind === "postpartum"
                        ? "/request/new?domain=postpartum"
                        : "/request/new") // 개인 돌봄 요청 → 도메인 선택 유도
                  );
                }}
              >
                {role === "caregiver" || role === "organization"
                  ? "홈으로 이동"
                  : kind === "housekeeping"
                  ? "생활지원서비스 신청하기"
                  : kind === "postpartum"
                  ? "산후관리 신청하기"
                  : "돌봄 서비스 신청하기"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== 보조 컴포넌트 ===== */
function RoleCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all",
        active ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20" : "border-warm-200 bg-white hover:border-warm-300"
      )}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
          active ? "bg-brand-500 text-white" : "bg-warm-100 text-warm-600"
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-warm-800">{title}</div>
        <div className="text-xs text-warm-500 mt-0.5">{desc}</div>
      </div>
      <div
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
          active ? "border-brand-500 bg-brand-500" : "border-warm-300"
        )}
      >
        {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
    </button>
  );
}

/** 입력 단계 상단의 현재 단계 배지. total 생략 시 "N단계"만 표시(역할 미확정 화면용). */
function StepBadge({ current, total, name }: { current: number; total?: number; name: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs font-bold text-brand-700 bg-brand-100 rounded-full px-2.5 py-1 tabular-nums">
        {total ? `${current} / ${total} 단계` : `${current}단계`}
      </span>
      <span className="text-xs font-semibold text-warm-500">{name}</span>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-semibold text-warm-700 block mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full border text-sm font-semibold transition-colors",
        active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-warm-300 bg-white text-warm-600"
      )}
    >
      {children}
    </button>
  );
}

function CheckRow({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" onClick={onToggle} className="flex items-center gap-3 w-full text-left">
      <div
        className={cn(
          "w-[22px] h-[22px] rounded-md border-[1.5px] flex items-center justify-center shrink-0",
          checked ? "bg-brand-500 border-brand-500" : "bg-white border-warm-400"
        )}
      >
        {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </div>
      <span className="text-sm text-warm-700">{label}</span>
    </button>
  );
}
