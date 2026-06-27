"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeft,
  HeartPulse,
  Stethoscope,
  Sparkles,
  Plus,
  Check,
  Minus,
  Sparkle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { memberApi } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/store";

const MODES = [
  { key: "normal", label: "일반" },
  { key: "emergency", label: "긴급" },
  { key: "recurring", label: "정기" },
];

type Domain = "senior" | "nursing" | "housekeeping";

const DOMAINS: { key: Domain; label: string; desc: string; icon: typeof HeartPulse }[] = [
  { key: "senior", label: "요양보호", desc: "어르신 방문", icon: HeartPulse },
  { key: "nursing", label: "병원 간병", desc: "입원 환자", icon: Stethoscope },
  { key: "housekeeping", label: "가사 서비스", desc: "청소·정리", icon: Sparkles },
];

const SECTION_LABEL = "block text-[12.5px] font-bold text-warm-600 mb-2";
const SELECT_CLASS =
  "w-full h-12 rounded-xl border border-warm-200 bg-white px-3.5 text-[14.5px] text-warm-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20";

export default function NewRequestPage() {
  const router = useRouter();
  const [domain, setDomain] = useState<Domain>("senior");
  // 병원 간병(nursing)은 기관(organization) 발주 전용 → 보호자에게는 도메인 자체를 숨김
  const role = useAuth((s) => s.user?.role);
  const availableDomains = DOMAINS.filter((d) => d.key !== "nursing" || role !== "guardian");

  // 시니어 플로우 상태 (기존 동작 유지)
  const [seniorId, setSeniorId] = useState<number | "">("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [mode, setMode] = useState("normal");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState(120);
  const [memo, setMemo] = useState("");
  // 선호 돌봄전문가 성별 ("" = 무관). 매칭에서 소프트 가산 신호로만 쓰임.
  const [preferredGender, setPreferredGender] = useState<"" | "M" | "F">("");
  // 보호자가 선호 성별을 직접 건드렸는지 — true면 자동 권장값보다 사용자 선택을 우선
  const [genderTouched, setGenderTouched] = useState(false);

  // 간병 플로우 상태
  const [patientId, setPatientId] = useState<number | "">("");
  const [days, setDays] = useState(1);

  // 가사 플로우 상태
  const [addressId, setAddressId] = useState<number | "">("");
  const [photoRequired, setPhotoRequired] = useState(true);

  const seniors = useQuery({ queryKey: ["member", "seniors"], queryFn: () => memberApi.seniors() });
  const patients = useQuery({
    queryKey: ["member", "patients"],
    queryFn: () => memberApi.patients(),
    enabled: domain === "nursing",
  });
  const addresses = useQuery({
    queryKey: ["member", "addresses"],
    queryFn: () => memberApi.addresses(),
    enabled: domain === "housekeeping",
  });
  const categories = useQuery({
    queryKey: ["member", "categories", domain],
    queryFn: () => memberApi.categories(domain),
  });

  // 방문목욕(BATH)은 동성 매칭이 하드 조건 → 선호 성별 수동선택 대신 안내만 표시
  const selectedCategory = categories.data?.find((c) => c.id === categoryId);
  const sameGenderForced = selectedCategory?.code === "BATH";

  // 신체 케어 비중이 큰 카테고리는 동성 매칭을 기본 권장(소프트) — 대상자 성별로 프리셋하되 변경 가능
  const GENDER_RECOMMENDED_CODES = ["NURSING_HOSPITAL", "VISIT_CARE", "NIGHT_CARE", "SHORT_STAY"];
  const genderRecommended = !!selectedCategory?.code && GENDER_RECOMMENDED_CODES.includes(selectedCategory.code);
  const recipientGender: "M" | "F" | "" =
    domain === "nursing"
      ? ((patients.data?.find((p) => p.id === patientId)?.gender as "M" | "F") ?? "")
      : domain === "senior"
        ? ((seniors.data?.find((s) => s.id === seniorId)?.gender as "M" | "F") ?? "")
        : "";
  // 실제 적용 선호 성별: 직접 선택했으면 그 값, 아니면 권장 카테고리 한정 대상자 성별 자동 적용
  const effectiveGender: "" | "M" | "F" = genderTouched
    ? preferredGender
    : genderRecommended && recipientGender
      ? recipientGender
      : preferredGender;

  function selectDomain(d: Domain) {
    if (d === domain) return;
    setDomain(d);
    setCategoryId(""); // 도메인별 카테고리가 다르므로 초기화
  }

  // 홈 퀵메뉴(간병/가사관리)에서 ?domain= 으로 진입 시 해당 도메인 자동 선택
  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get("domain");
    if ((d === "nursing" || d === "housekeeping") && availableDomains.some((x) => x.key === d)) selectDomain(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const create = useMutation({
    mutationFn: () => {
      // datetime-local(2026-06-12T14:00) → Y-m-d\TH:i:sP (+09:00)
      const scheduled = `${start}:00+09:00`;
      // 선호 성별 지정 시에만 requirements에 실어 보냄 (무관이면 키 자체 생략).
      // 방문목욕은 백엔드가 동성 매칭을 강제하므로 수동 선호 성별은 전송하지 않음.
      const effPreferred = sameGenderForced ? "" : effectiveGender;
      const genderReq = effPreferred ? { preferred_gender: effPreferred } : {};
      if (domain === "nursing") {
        const recurring = days >= 2;
        return memberApi.createRequest({
          service_domain: "nursing",
          nursing_patient_id: Number(patientId),
          category_id: Number(categoryId),
          mode: recurring ? "recurring" : "normal",
          scheduled_start: scheduled,
          duration_min: Number(duration),
          ...(recurring ? { recurrence_rule: { days: Number(days) } } : {}),
          ...(effPreferred ? { requirements: genderReq } : {}),
          special_request: memo || undefined,
        });
      }
      if (domain === "housekeeping") {
        return memberApi.createRequest({
          service_domain: "housekeeping",
          service_address_id: Number(addressId),
          category_id: Number(categoryId),
          mode: "normal",
          scheduled_start: scheduled,
          duration_min: Number(duration),
          requirements: { photo_required: photoRequired, ...genderReq },
          special_request: memo || undefined,
        });
      }
      // 시니어: 기존 페이로드 그대로 (service_domain 생략 → senior)
      return memberApi.createRequest({
        senior_id: Number(seniorId),
        category_id: Number(categoryId),
        mode,
        scheduled_start: scheduled,
        duration_min: Number(duration),
        ...(effPreferred ? { requirements: genderReq } : {}),
        special_request: memo || undefined,
      });
    },
    onSuccess: () => {
      toast.success("매칭을 요청했습니다. AI가 후보를 추천합니다.");
      router.push("/home");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const maxDuration = domain === "nursing" ? 1440 : 720;
  const valid =
    domain === "nursing"
      ? patientId && categoryId && start && duration >= 60 && duration <= 1440 && days >= 1 && days <= 30
      : domain === "housekeeping"
        ? addressId && categoryId && start && duration >= 60 && duration <= 720
        : seniorId && categoryId && start && duration >= 60;

  const noSeniors = domain === "senior" && seniors.isSuccess && seniors.data.length === 0;
  const noPatients = domain === "nursing" && patients.isSuccess && patients.data.length === 0;
  const noAddresses = domain === "housekeeping" && addresses.isSuccess && addresses.data.length === 0;
  const noCategories = categories.isSuccess && categories.data.length === 0;

  // 소요 시간 스테퍼/빠른선택 (duration 상태 그대로 사용 — 60~maxDuration, 30분 단위)
  const durHours = (duration / 60).toFixed(duration % 60 ? 1 : 0);
  function bumpDuration(delta: number) {
    setDuration((d) => Math.min(maxDuration, Math.max(60, d + delta)));
  }
  const durChips =
    domain === "nursing"
      ? [
          { m: 240, t: "4시간" },
          { m: 480, t: "8시간" },
          { m: 720, t: "12시간" },
          { m: 1440, t: "종일" },
        ]
      : [
          { m: 120, t: "2시간" },
          { m: 240, t: "4시간" },
          { m: 360, t: "6시간" },
          { m: 720, t: "종일" },
        ];

  return (
    <div className="min-h-screen bg-warm-50 pb-28">
      <div className="p-5">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-3">
          <ChevronLeft className="w-4 h-4" /> 뒤로
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight text-warm-800">새 매칭 요청</h1>
        <p className="text-sm text-warm-500 mt-1.5 leading-relaxed">
          돌봄 대상과 일정만 알려주시면, AI가 가장 잘 맞는 돌봄전문가를 찾아 드려요.
        </p>

        {/* 1단계: 서비스 종류(도메인) 선택 */}
        <label className={SECTION_LABEL + " mt-5"}>어떤 서비스가 필요하세요?</label>
        <div className={`grid gap-2.5 ${availableDomains.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {availableDomains.map((d) => {
            const Icon = d.icon;
            const active = domain === d.key;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => selectDomain(d.key)}
                className={
                  "relative rounded-2xl border p-3 text-center transition-colors " +
                  (active ? "border-brand-500 bg-brand-50" : "border-warm-200 bg-white")
                }
              >
                {active && (
                  <span className="absolute top-2 right-2 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand-500">
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
                  </span>
                )}
                <span
                  className={
                    "mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl " +
                    (active ? "bg-brand-500 text-white" : "bg-warm-100 text-warm-400")
                  }
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className={"text-[12.5px] font-bold " + (active ? "text-brand-700" : "text-warm-800")}>
                  {d.label}
                </div>
                <div className="text-[10px] text-warm-400 mt-0.5">{d.desc}</div>
              </button>
            );
          })}
        </div>

        <Card className="mt-4 rounded-2xl p-5 pt-4">
          {/* 대상 선택 */}
          {domain === "senior" && (
            <div>
              <label className={SECTION_LABEL}>돌봄 대상</label>
              {noSeniors ? (
                <div className="rounded-xl bg-warm-50 p-3.5 text-center">
                  <p className="text-xs text-warm-500 mb-2.5">등록된 어르신이 없습니다. 먼저 어르신을 등록해주세요.</p>
                  <Link href="/seniors/new">
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="w-4 h-4" /> 어르신 등록하러 가기
                    </Button>
                  </Link>
                </div>
              ) : (
                <select
                  value={seniorId}
                  onChange={(e) => setSeniorId(e.target.value ? Number(e.target.value) : "")}
                  className={SELECT_CLASS}
                >
                  <option value="">대상자를 선택하세요</option>
                  {seniors.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.age ? `(${s.age}세)` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {domain === "nursing" && (
            <div>
              <label className={SECTION_LABEL}>간병 대상 환자</label>
              {noPatients ? (
                <div className="rounded-xl bg-warm-50 p-3.5 text-center">
                  <p className="text-xs text-warm-500 mb-2.5">등록된 환자가 없습니다. 먼저 환자를 등록해주세요.</p>
                  <Link href="/patients/new">
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="w-4 h-4" /> 환자 등록하러 가기
                    </Button>
                  </Link>
                </div>
              ) : (
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value ? Number(e.target.value) : "")}
                  className={SELECT_CLASS}
                >
                  <option value="">환자를 선택하세요</option>
                  {patients.data?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.hospital_name ? `(${p.hospital_name})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {domain === "housekeeping" && (
            <div>
              <label className={SECTION_LABEL}>서비스 주소</label>
              {noAddresses ? (
                <div className="rounded-xl bg-warm-50 p-3.5 text-center">
                  <p className="text-xs text-warm-500 mb-2.5">등록된 주소가 없습니다. 먼저 주소를 등록해주세요.</p>
                  <Link href="/addresses/new">
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="w-4 h-4" /> 주소 등록하러 가기
                    </Button>
                  </Link>
                </div>
              ) : (
                <select
                  value={addressId}
                  onChange={(e) => setAddressId(e.target.value ? Number(e.target.value) : "")}
                  className={SELECT_CLASS}
                >
                  <option value="">주소를 선택하세요</option>
                  {addresses.data?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} ({a.address})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* 서비스 종류 */}
          <div className="mt-4">
            <label className={SECTION_LABEL}>서비스 종류</label>
            {noCategories ? (
              <p className="rounded-xl bg-warm-50 p-3 text-xs text-warm-500 text-center">
                현재 신청 가능한 서비스가 준비 중입니다. 오픈 시 알림으로 안내드릴게요.
              </p>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                className={SELECT_CLASS}
              >
                <option value="">서비스를 선택하세요</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* 모드 (시니어 전용 — 간병은 연속 일수로 자동 결정, 가사는 1회 방문) */}
          {domain === "senior" && (
            <div className="mt-4">
              <label className={SECTION_LABEL}>유형</label>
              <div className="grid grid-cols-3 gap-2">
                {MODES.map((m) => {
                  const on = mode === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMode(m.key)}
                      className={
                        "h-11 rounded-xl border text-[13.5px] font-bold transition-colors " +
                        (on
                          ? "border-brand-500 bg-brand-500 text-white"
                          : "border-warm-200 bg-white text-warm-600")
                      }
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 일정 */}
          <div className="mt-4">
            <label className={SECTION_LABEL}>시작 일시</label>
            <Input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-12 rounded-xl text-[14.5px]"
            />
          </div>

          {/* 소요 시간 — 스테퍼 + 빠른선택 칩 (duration 상태 그대로) */}
          <div className="mt-4">
            <label className={SECTION_LABEL}>소요 시간</label>
            <div className="flex items-center gap-3 mb-2.5">
              <button
                type="button"
                onClick={() => bumpDuration(-60)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-warm-200 bg-white text-warm-600 active:scale-95 transition-transform"
                aria-label="시간 줄이기"
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="flex-1 text-center">
                <span className="text-[22px] font-extrabold text-warm-800">{duration}</span>
                <span className="text-[13px] font-semibold text-warm-400"> 분 · {durHours}시간</span>
              </div>
              <button
                type="button"
                onClick={() => bumpDuration(60)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-warm-200 bg-white text-warm-600 active:scale-95 transition-transform"
                aria-label="시간 늘리기"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {durChips.map((c) => {
                const on = duration === c.m;
                return (
                  <button
                    key={c.m}
                    type="button"
                    onClick={() => setDuration(c.m)}
                    className={
                      "h-9 rounded-lg border text-xs font-bold transition-colors " +
                      (on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-warm-200 bg-white text-warm-600")
                    }
                  >
                    {c.t}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-warm-400 mt-2">
              60분~{maxDuration}분{domain === "nursing" ? " · 최대 24시간" : ""} · 30분 단위로 조절돼요
            </p>
          </div>

          {/* 연속 일수 (간병 전용) */}
          {domain === "nursing" && (
            <div className="mt-4">
              <label className={SECTION_LABEL}>연속 일수 (1~30일)</label>
              <Input
                type="number"
                min={1}
                max={30}
                step={1}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="h-12 rounded-xl text-[14.5px]"
              />
              <p className="text-[11px] text-warm-400 mt-1.5">
                {days >= 2 ? `매일 같은 시간에 ${days}일간 반복되는 정기 간병으로 요청됩니다.` : "하루 단위 간병으로 요청됩니다."}
              </p>
            </div>
          )}

          {/* 완료사진 요구 (가사 전용) */}
          {domain === "housekeeping" && (
            <div className="mt-4">
              <label className={SECTION_LABEL}>작업 완료사진</label>
              <div className="grid grid-cols-2 gap-2">
                {([[true, "요청"], [false, "불필요"]] as const).map(([v, l]) => {
                  const on = photoRequired === v;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setPhotoRequired(v)}
                      className={
                        "h-11 rounded-xl border text-[13.5px] font-bold transition-colors " +
                        (on
                          ? "border-brand-500 bg-brand-500 text-white"
                          : "border-warm-200 bg-white text-warm-600")
                      }
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-warm-400 mt-1.5">
                {photoRequired
                  ? "작업자가 완료사진을 등록해야 작업을 종료할 수 있습니다."
                  : "완료사진 없이 작업을 종료할 수 있습니다."}
              </p>
            </div>
          )}

          {/* 선호 돌봄전문가 성별 (선택) — 모든 도메인 공통. 방문목욕은 동성 강제라 안내로 대체 */}
          <div className="mt-4">
            <label className={SECTION_LABEL}>선호 성별 (선택)</label>
            {sameGenderForced ? (
              <div className="rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-3">
                <p className="text-[13px] font-bold text-brand-700">동성 돌봄전문가만 배정돼요</p>
                <p className="text-[11.5px] text-warm-500 mt-1 leading-relaxed">
                  방문목욕은 신체 노출을 동반하므로 어르신과 같은 성별의 돌봄전문가만 매칭됩니다.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {([["", "무관"], ["F", "여성"], ["M", "남성"]] as const).map(([v, l]) => {
                    const on = effectiveGender === v;
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          setPreferredGender(v);
                          setGenderTouched(true);
                        }}
                        className={
                          "h-11 rounded-xl border text-[13.5px] font-bold transition-colors " +
                          (on
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-warm-200 bg-white text-warm-600")
                        }
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-warm-400 mt-1.5">
                  {genderRecommended && !genderTouched && recipientGender
                    ? "이 서비스는 신체 케어가 포함돼 동성 돌봄을 권장합니다. 대상자와 같은 성별로 기본 선택했어요. (변경 가능)"
                    : "선택하시면 해당 성별 돌봄전문가를 우선 추천합니다. (절대 조건은 아니에요)"}
                </p>
              </>
            )}
          </div>

          {/* 메모 */}
          <div className="mt-4">
            <label className={SECTION_LABEL}>요청사항 (선택)</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="특이사항이나 요청사항을 입력하세요"
              className="w-full rounded-xl border border-warm-200 bg-white px-3.5 py-3 text-[14px] placeholder:text-warm-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 resize-none"
            />
          </div>
        </Card>

        {/* 요청 전 안내 (정적 라벨) */}
        <div className="mt-3.5 flex items-center gap-2 text-[11.5px] text-warm-400">
          <Sparkle className="h-3.5 w-3.5 text-brand-500 shrink-0" />
          <span>
            요청을 보내면 AI가 잘 맞는 후보 <b className="text-warm-600">3~5명</b>을 빠르게 추천해 드려요.
          </span>
        </div>

        {/* 제출 CTA — 본문 끝 인라인(하단 GuardianTabBar z-20과 겹치지 않도록 고정배치 대신) */}
        <Button
          variant="brand"
          size="lg"
          className="mt-5 w-full rounded-2xl shadow-md"
          disabled={!valid || create.isPending}
          onClick={() => create.mutate()}
        >
          <Sparkle className="h-[18px] w-[18px]" />
          {create.isPending ? "요청 중…" : "AI 매칭 요청하기"}
        </Button>
      </div>
    </div>
  );
}
