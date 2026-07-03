"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeft,
  Plus,
  Check,
  Minus,
  Sparkle,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StepIndicator } from "@/components/ui/step-indicator";
import { ServiceGuide } from "@/components/service-guide";
import { AddressSearch } from "@/components/address-search";
import { serviceGuide } from "@/lib/serviceGuides";
import { memberApi } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/store";
import { useServiceDomains, domainIcon, FALLBACK_DOMAINS } from "@/lib/serviceDomains";

const MODES = [
  { key: "normal", label: "일반" },
  { key: "emergency", label: "긴급" },
  { key: "recurring", label: "정기" },
];

// 도메인 토큰은 레지스트리(SSOT)에서 옴 — \App\Support\ServiceDomains / lib/serviceDomains.ts
type Domain = string;

const SECTION_LABEL = "block text-[12.5px] font-bold text-warm-600 mb-2";
const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const SELECT_CLASS =
  "w-full h-12 rounded-xl border border-warm-200 bg-white px-3.5 text-[14.5px] text-warm-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20";

// 3스텝 위저드
const STEPS = ["대상·서비스", "일정·상세", "확인·동의"];

// 도메인 프로모 뱃지 (P2-4) — 신규/베타 서비스 강조. 런칭 큐레이션 설정(운영이 갱신).
const DOMAIN_BADGE: Record<string, { variant: "new" | "hot" | "beta"; label: string }> = {
  mental_care: { variant: "new", label: "NEW" },
  childcare: { variant: "new", label: "NEW" },
};

// 컴플라이언스 고지 (P0-2) — 확인 스텝에서 요약 노출 + 필수 동의
const COMPLIANCE_NOTES = [
  "돌봄전문가와의 직접(개인) 거래·외부 연락처 교환은 금지되며, 위반 시 이용이 제한될 수 있어요.",
  "매칭 확정 후 무단 취소·노쇼(No-show) 시 위약금이 발생할 수 있어요.",
  "돌봄대상의 건강·상태 정보를 사실대로 고지할 의무가 있어요. 사실과 다르면 매칭이 취소될 수 있어요.",
  "결제·정산은 케어앤드 플랫폼을 통해서만 안전하게 진행돼요.",
];

export default function NewRequestPage() {
  const router = useRouter();
  const [domain, setDomain] = useState<Domain>("senior");
  // 홈 서비스카드에서 ?domain= 으로 진입한 경우, 서비스 재선택 그리드를 접어 곧바로 대상·일정 입력으로 진행.
  // '변경'을 누르면 다시 펼쳐 전체 서비스 중 다시 고를 수 있다.
  const [domainPickerOpen, setDomainPickerOpen] = useState(true);
  const role = useAuth((s) => s.user?.role);
  // 도메인 카탈로그/가시성을 레지스트리(SSOT)에서 가져옴. API는 역할별로 서버측 필터됨.
  // (병원 간병=기관 발주 전용 → 보호자 숨김 규칙도 백엔드 hidden_for_roles로 일원화)
  const domainsQuery = useServiceDomains();
  const availableDomains = (domainsQuery.data ?? FALLBACK_DOMAINS).filter(
    (d) => !(d.token === "nursing" && role === "guardian"),
  );
  // 찜한 돌봄전문가 — 매칭 결과에서 우선 표시 안내용
  const favQuery = useQuery({
    queryKey: ["member", "caregivers", "favorites"],
    queryFn: () => memberApi.favoriteCaregivers(),
    staleTime: 60_000,
    enabled: role === "guardian",
  });
  const favCount = favQuery.data?.length ?? 0;

  // 위저드 스텝 (1=대상·서비스, 2=일정·상세, 3=확인·동의)
  const [step, setStep] = useState(1);
  // 확인 스텝 필수 동의
  const [agree, setAgree] = useState(false);
  // 미동의 상태에서 제출을 시도하면 동의 박스를 강조/스크롤해 왜 진행이 안 되는지 안내.
  const [agreeError, setAgreeError] = useState(false);
  const agreeRef = useRef<HTMLLabelElement>(null);
  // 이용 불가 대상 스크리닝 확인(P0-4) — 도메인 변경 시 초기화
  const [screeningOk, setScreeningOk] = useState(false);

  // 시니어 플로우 상태 (기존 동작 유지)
  const [seniorId, setSeniorId] = useState<number | "">("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [mode, setMode] = useState("normal");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState(120);
  const [memo, setMemo] = useState("");
  // 선호 돌봄전문가 성별 ("" = 무관). 매칭에서 소프트 가산 신호로만 쓰임.
  const [preferredGender, setPreferredGender] = useState<"" | "M" | "F">("");
  const [preferredCgId, setPreferredCgId] = useState<number | null>(null); // 직접 지정(찜한 전문가)
  // 보호자가 선호 성별을 직접 건드렸는지 — true면 자동 권장값보다 사용자 선택을 우선
  const [genderTouched, setGenderTouched] = useState(false);

  // 간병 플로우 상태
  const [patientId, setPatientId] = useState<number | "">("");
  const [days, setDays] = useState(1);

  // 가사 플로우 상태
  const [addressId, setAddressId] = useState<number | "">("");
  const [photoRequired, setPhotoRequired] = useState(true);

  // 산후 플로우 상태
  const [postpartumClientId, setPostpartumClientId] = useState<number | "">("");

  // 아이돌봄 플로우 상태
  const [childId, setChildId] = useState<number | "">("");

  // 마음돌봄 플로우 상태
  const [mentalClientId, setMentalClientId] = useState<number | "">("");

  // 역경매: 희망 상한 시급(선택)
  const [budget, setBudget] = useState("");

  // 세부 서비스 항목 멀티셀렉트(선택) — requirements.service_items 로 전달 (P1-1)
  const [serviceItems, setServiceItems] = useState<string[]>([]);
  function toggleItem(it: string) {
    setServiceItems((prev) => (prev.includes(it) ? prev.filter((x) => x !== it) : [...prev, it]));
  }

  // 동행(LS_COMPANION) 경로 (P2-2) — 만남=서비스 주소, 방문/복귀/경유지 + 이동수단
  const [destination, setDestination] = useState("");
  const [returnToOrigin, setReturnToOrigin] = useState(true);
  const [returnAddress, setReturnAddress] = useState("");
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [transport, setTransport] = useState<"taxi" | "transit" | "">("");

  // 정기(recurring) 반복 요일 + 반복 주수 (P1-2) — 시니어 정기 요청에 사용. ISO 1=월..7=일.
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [weeks, setWeeks] = useState(4);
  function toggleWeekday(d: number) {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  }
  // 시니어 정기 요청은 반복 요일 최소 1개 필요
  const recurringNeedsWeekdays = domain === "senior" && mode === "recurring";

  const seniors = useQuery({ queryKey: ["member", "seniors"], queryFn: () => memberApi.seniors() });
  const patients = useQuery({
    queryKey: ["member", "patients"],
    queryFn: () => memberApi.patients(),
    enabled: domain === "nursing",
  });
  const addresses = useQuery({
    queryKey: ["member", "addresses"],
    queryFn: () => memberApi.addresses(),
    enabled: domain === "living_support",
  });
  const postpartumClients = useQuery({
    queryKey: ["member", "postpartum-clients"],
    queryFn: () => memberApi.postpartumClients(),
    enabled: domain === "postpartum",
  });
  const childrenQ = useQuery({
    queryKey: ["member", "children"],
    queryFn: () => memberApi.children(),
    enabled: domain === "childcare",
  });
  const mentalClients = useQuery({
    queryKey: ["member", "mental-care-clients"],
    queryFn: () => memberApi.mentalCareClients(),
    enabled: domain === "mental_care",
  });
  const categories = useQuery({
    queryKey: ["member", "categories", domain],
    queryFn: () => memberApi.categories(domain),
  });

  // 적정 간병비 미리보기 — 입력이 충분하면 실시간 산출
  const estimateEnabled = !!(categoryId && start && duration >= 60);
  const priceEstimate = useQuery({
    queryKey: ["member", "price-estimate", domain, categoryId, mode, start, duration, seniorId, patientId, addressId, serviceItems.join(",")],
    queryFn: () =>
      memberApi.pricingEstimate({
        service_domain: domain,
        category_id: Number(categoryId),
        mode,
        scheduled_start: `${start}:00+09:00`,
        duration_min: Number(duration),
        ...(domain === "senior" && seniorId ? { senior_id: Number(seniorId) } : {}),
        ...(domain === "nursing" && patientId ? { nursing_patient_id: Number(patientId) } : {}),
        ...(domain === "living_support" && addressId ? { service_address_id: Number(addressId) } : {}),
        // 세부 서비스 항목을 견적에 반영(P1-1 가중) — 백엔드 PricingService.serviceItemsAddon
        ...(serviceItems.length ? { requirements: { service_items: serviceItems } } : {}),
      }),
    enabled: estimateEnabled,
    staleTime: 30_000,
  });

  // 방문목욕(BATH)은 동성 매칭이 하드 조건 → 선호 성별 수동선택 대신 안내만 표시
  const selectedCategory = categories.data?.find((c) => c.id === categoryId);
  const sameGenderForced = selectedCategory?.code === "BATH";
  // 동행(LS_COMPANION): 방문 장소·이동수단 필수, 복귀 미동일 시 복귀 장소 필수 (P2-2)
  const isCompanion = selectedCategory?.code === "LS_COMPANION";
  const companionValid = !isCompanion || (!!destination && !!transport && (returnToOrigin || !!returnAddress));

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
    setScreeningOk(false); // 도메인별 이용 불가 대상이 다르므로 스크리닝 재확인
    setServiceItems([]); // 도메인별 세부 항목이 다르므로 초기화
  }

  // 홈 퀵메뉴(간병/가사관리)에서 ?domain= 으로 진입 시 해당 도메인 자동 선택
  // 돌봄대상 상세에서 ?senior_id= 로 진입 시 해당 돌봄대상 자동 선택
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const d = sp.get("domain");
    if ((d === "nursing" || d === "living_support" || d === "postpartum" || d === "childcare" || d === "mental_care") && availableDomains.some((x) => x.token === d)) selectDomain(d);
    // 홈 카드 등에서 유효한 domain으로 진입 시 서비스 재선택 그리드를 접는다(요양보호=senior 포함).
    if ((d === "senior" || d === "nursing" || d === "living_support" || d === "postpartum" || d === "childcare" || d === "mental_care") && availableDomains.some((x) => x.token === d)) {
      setDomainPickerOpen(false);
    }
    // 대상 등록 직후 되돌아온 경우, 방금 등록한 대상을 자동 선택해 흐름이 이어지도록 함
    const num = (k: string) => {
      const v = sp.get(k);
      return v && /^\d+$/.test(v) ? Number(v) : null;
    };
    const sid = num("senior_id");
    if (sid) setSeniorId(sid);
    const pid = num("nursing_patient_id");
    if (pid) setPatientId(pid);
    const aid = num("service_address_id");
    if (aid) setAddressId(aid);
    const ppid = num("postpartum_client_id");
    if (ppid) setPostpartumClientId(ppid);
    const cid = num("childcare_child_id");
    if (cid) setChildId(cid);
    const mid = num("mental_care_client_id");
    if (mid) setMentalClientId(mid);
    // 관심 돌봄전문가 목록에서 '매칭 요청'으로 진입 시 해당 전문가를 직접 지정으로 선택
    const pref = num("preferred");
    if (pref) setPreferredCgId(pref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, domainsQuery.data]);

  const create = useMutation({
    mutationFn: () => {
      // datetime-local(2026-06-12T14:00) → Y-m-d\TH:i:sP (+09:00)
      const scheduled = `${start}:00+09:00`;
      // 선호 성별 지정 시에만 requirements에 실어 보냄 (무관이면 키 자체 생략).
      // 방문목욕은 백엔드가 동성 매칭을 강제하므로 수동 선호 성별은 전송하지 않음.
      const effPreferred = sameGenderForced ? "" : effectiveGender;
      const genderReq = effPreferred ? { preferred_gender: effPreferred } : {};
      const budgetReq = budget && Number(budget) > 0 ? { budget_hourly: Number(budget) } : {};
      // 선호 성별 + 직접 지정(찜한 전문가) + 세부 서비스 항목 을 합쳐 requirements 로 전송
      const itemsReq = serviceItems.length ? { service_items: serviceItems } : {};
      const baseReq = { ...genderReq, ...(preferredCgId ? { preferred_caregiver_id: preferredCgId } : {}), ...itemsReq };
      const reqSpread = Object.keys(baseReq).length ? { requirements: baseReq } : {};
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
          ...reqSpread,
          ...budgetReq,
          special_request: memo || undefined,
        });
      }
      if (domain === "living_support") {
        // 동행이면 완료사진 대신 경로(companion_route)를 전달
        const companionReq = isCompanion
          ? {
              companion_route: {
                destination,
                return_to_origin: returnToOrigin,
                ...(returnToOrigin ? {} : { return_address: returnAddress }),
                ...(waypoints.filter(Boolean).length ? { waypoints: waypoints.filter(Boolean) } : {}),
                transport,
              },
            }
          : { photo_required: photoRequired };
        return memberApi.createRequest({
          service_domain: "living_support",
          service_address_id: Number(addressId),
          category_id: Number(categoryId),
          mode: "normal",
          scheduled_start: scheduled,
          duration_min: Number(duration),
          requirements: { ...companionReq, ...baseReq },
          ...budgetReq,
          special_request: memo || undefined,
        });
      }
      if (domain === "postpartum") {
        return memberApi.createRequest({
          service_domain: "postpartum",
          postpartum_client_id: Number(postpartumClientId),
          category_id: Number(categoryId),
          mode: "normal",
          scheduled_start: scheduled,
          duration_min: Number(duration),
          ...reqSpread,
          ...budgetReq,
          special_request: memo || undefined,
        });
      }
      if (domain === "childcare") {
        return memberApi.createRequest({
          service_domain: "childcare",
          childcare_child_id: Number(childId),
          category_id: Number(categoryId),
          mode: "normal",
          scheduled_start: scheduled,
          duration_min: Number(duration),
          ...reqSpread,
          ...budgetReq,
          special_request: memo || undefined,
        });
      }
      if (domain === "mental_care") {
        return memberApi.createRequest({
          service_domain: "mental_care",
          mental_care_client_id: Number(mentalClientId),
          category_id: Number(categoryId),
          mode: "normal",
          scheduled_start: scheduled,
          duration_min: Number(duration),
          ...reqSpread,
          ...budgetReq,
          special_request: memo || undefined,
        });
      }
      // 시니어: 기존 페이로드 + 정기 요청 시 반복 요일(recurrence_rule) 추가
      return memberApi.createRequest({
        senior_id: Number(seniorId),
        category_id: Number(categoryId),
        mode,
        scheduled_start: scheduled,
        duration_min: Number(duration),
        ...(mode === "recurring" && weekdays.length ? { recurrence_rule: { weekdays, weeks } } : {}),
        ...(Object.keys(baseReq).length ? { requirements: baseReq } : {}),
        ...budgetReq,
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
      : domain === "living_support"
        ? addressId && categoryId && start && duration >= 60 && duration <= 720
        : domain === "postpartum"
          ? postpartumClientId && categoryId && start && duration >= 60 && duration <= 720
          : domain === "childcare"
            ? childId && categoryId && start && duration >= 60 && duration <= 720
            : domain === "mental_care"
              ? mentalClientId && categoryId && start && duration >= 60 && duration <= 720
              : seniorId && categoryId && start && duration >= 60 && (mode !== "recurring" || weekdays.length >= 1);

  // 스텝별 진행 가능 여부
  const recipientId =
    domain === "nursing"
      ? patientId
      : domain === "living_support"
        ? addressId
        : domain === "postpartum"
          ? postpartumClientId
          : domain === "childcare"
            ? childId
            : domain === "mental_care"
              ? mentalClientId
              : seniorId;
  const step1Valid = !!recipientId && !!categoryId && screeningOk;
  const step2Valid =
    !!start &&
    duration >= 60 &&
    duration <= maxDuration &&
    (domain !== "nursing" || (days >= 1 && days <= 30)) &&
    (!recurringNeedsWeekdays || weekdays.length >= 1) &&
    companionValid;

  // 제출 시도 — 비활성으로 침묵하지 않고, 부족한 항목을 토스트/강조로 안내한다.
  function submitRequest() {
    if (create.isPending) return;
    if (!agree) {
      setAgreeError(true);
      toast.error("개인정보 제3자 제공(필수) 동의에 체크해주세요.");
      agreeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!valid) {
      toast.error("요청 내용을 다시 확인해주세요.");
      return;
    }
    create.mutate();
  }

  const noSeniors = domain === "senior" && seniors.isSuccess && seniors.data.length === 0;
  const noPatients = domain === "nursing" && patients.isSuccess && patients.data.length === 0;
  const noAddresses = domain === "living_support" && addresses.isSuccess && addresses.data.length === 0;
  const noPostpartum = domain === "postpartum" && postpartumClients.isSuccess && postpartumClients.data.length === 0;
  const noChildren = domain === "childcare" && childrenQ.isSuccess && childrenQ.data.length === 0;
  const noMental = domain === "mental_care" && mentalClients.isSuccess && mentalClients.data.length === 0;
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

  // 확인 스텝 요약용 라벨
  const domainLabel = availableDomains.find((d) => d.token === domain)?.label ?? domain;
  const recipientName =
    domain === "nursing"
      ? patients.data?.find((p) => p.id === patientId)?.name
      : domain === "living_support"
        ? addresses.data?.find((a) => a.id === addressId)?.label
        : domain === "postpartum"
          ? postpartumClients.data?.find((p) => p.id === postpartumClientId)?.name
          : domain === "childcare"
            ? childrenQ.data?.find((c) => c.id === childId)?.name
            : domain === "mental_care"
              ? mentalClients.data?.find((m) => m.id === mentalClientId)?.name
              : seniors.data?.find((s) => s.id === seniorId)?.name;
  const genderLabel = sameGenderForced
    ? "동성 배정"
    : effectiveGender === "F"
      ? "여성"
      : effectiveGender === "M"
        ? "남성"
        : "무관";
  const estimatedTotal = priceEstimate.data
    ? priceEstimate.data.suggested * (duration / 60) * (domain === "nursing" ? days : 1)
    : null;

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

        {/* 스텝 인디케이터 — 완료 스텝은 클릭해 되돌아갈 수 있음 */}
        <StepIndicator
          steps={STEPS}
          current={step}
          className="mt-4"
          onStepClick={(n) => n < step && setStep(n)}
        />

        {favCount > 0 && step === 1 && (
          <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/50 p-3">
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-warm-700">
              <Sparkle className="h-4 w-4 text-brand-500" /> 찜한 돌봄전문가에게 직접 요청 (선택)
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-warm-500">
              선택하면 해당 전문가에게 직접 요청해요. AI 추천 후보도 함께 받아 비교할 수 있어요.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {favQuery.data?.map((c) => {
                const on = preferredCgId === c.id;
                const nm = c.name.replace(/^\[.*?\]\s*/, "");
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPreferredCgId(on ? null : c.id)}
                    className={
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
                      (on ? "border-brand-500 bg-brand-500 text-white" : "border-warm-300 bg-white text-warm-600")
                    }
                  >
                    {on && "✓ "}{nm}
                    {c.region ? <span className={on ? "text-white/80" : "text-warm-400"}> · {c.region}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 데스크톱 2단: 좌(입력) / 우(적정간병비·제출 sticky) */}
        <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:items-start">
        {/* ── 좌측: 스텝별 입력 ── */}
        <div>

        {/* ═══ STEP 1: 대상·서비스 ═══ */}
        {step === 1 && (
        <>
        <label className={SECTION_LABEL}>어떤 서비스가 필요하세요?</label>
        {!domainPickerOpen ? (
          /* 홈 카드에서 서비스를 이미 고른 경우: 요약 한 줄 + 변경 */
          (() => {
            const cur = availableDomains.find((d) => d.token === domain);
            const CurIcon = domainIcon(cur?.icon ?? "");
            return (
              <div className="flex items-center gap-3 rounded-2xl border border-brand-500 bg-brand-50 p-3.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shrink-0">
                  <CurIcon className="h-[18px] w-[18px]" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold text-brand-700">{cur?.label ?? domainLabel}</div>
                  <div className="text-[11px] text-warm-500 truncate">{cur?.desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setDomainPickerOpen(true)}
                  className="shrink-0 text-xs font-bold text-brand-600 underline underline-offset-2"
                >
                  변경
                </button>
              </div>
            );
          })()
        ) : (
        <div className={`grid gap-2.5 ${availableDomains.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {availableDomains.map((d) => {
            const Icon = domainIcon(d.icon);
            const active = domain === d.token;
            return (
              <button
                key={d.token}
                type="button"
                onClick={() => selectDomain(d.token)}
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
                {DOMAIN_BADGE[d.token] && !active && (
                  <span className="absolute top-1.5 left-1.5">
                    <Badge variant={DOMAIN_BADGE[d.token].variant} className="px-1.5 py-0 text-[9px] leading-4">
                      {DOMAIN_BADGE[d.token].label}
                    </Badge>
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
        )}

        {/* 서비스 안내(제공/미제공) + 이용 불가 대상 스크리닝 게이트 */}
        <ServiceGuide
          domain={domain}
          confirmed={screeningOk}
          onConfirm={setScreeningOk}
          className="mt-4"
        />

        <Card className="mt-4 rounded-2xl p-5 pt-4">
          {/* 대상 선택 */}
          {domain === "senior" && (
            <div>
              <label className={SECTION_LABEL}>돌봄 대상</label>
              {noSeniors ? (
                <div className="rounded-xl bg-warm-50 p-3.5 text-center">
                  <p className="text-xs text-warm-500 mb-2.5">매칭을 위해 돌봄받으실 어르신을 먼저 등록해주세요. (회원가입이 아닌, 매칭 대상 등록이에요.)</p>
                  <Link href={`/seniors/new?returnTo=${encodeURIComponent("/request/new?domain=senior")}`}>
                    <Button variant="brand" size="sm" className="w-full">
                      <Plus className="w-4 h-4" /> 어르신(돌봄대상) 등록하기
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

          {domain === "living_support" && (
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

          {domain === "postpartum" && (
            <div>
              <label className={SECTION_LABEL}>산모 선택</label>
              {noPostpartum ? (
                <div className="rounded-xl bg-warm-50 p-3.5 text-center">
                  <p className="text-xs text-warm-500 mb-2.5">등록된 산모가 없습니다. 먼저 산모를 등록해주세요.</p>
                  <Link href="/postpartum-clients/new">
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="w-4 h-4" /> 산모 등록하러 가기
                    </Button>
                  </Link>
                </div>
              ) : (
                <select
                  value={postpartumClientId}
                  onChange={(e) => setPostpartumClientId(e.target.value ? Number(e.target.value) : "")}
                  className={SELECT_CLASS}
                >
                  <option value="">산모를 선택하세요</option>
                  {postpartumClients.data?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.delivery_date ? `(출산 ${p.delivery_date})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {domain === "childcare" && (
            <div>
              <label className={SECTION_LABEL}>아이 선택</label>
              {noChildren ? (
                <div className="rounded-xl bg-warm-50 p-3.5 text-center">
                  <p className="text-xs text-warm-500 mb-2.5">등록된 아이가 없습니다. 먼저 아이를 등록해주세요.</p>
                  <Link href="/children/new">
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="w-4 h-4" /> 아이 등록하러 가기
                    </Button>
                  </Link>
                </div>
              ) : (
                <select
                  value={childId}
                  onChange={(e) => setChildId(e.target.value ? Number(e.target.value) : "")}
                  className={SELECT_CLASS}
                >
                  <option value="">아이를 선택하세요</option>
                  {childrenQ.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.birth_date ? `(${c.birth_date})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {domain === "mental_care" && (
            <div>
              <label className={SECTION_LABEL}>돌봄 대상</label>
              {noMental ? (
                <div className="rounded-xl bg-warm-50 p-3.5 text-center">
                  <p className="text-xs text-warm-500 mb-2.5">등록된 대상이 없습니다. 먼저 대상을 등록해주세요.</p>
                  <Link href="/mental-care-clients/new">
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="w-4 h-4" /> 대상 등록하러 가기
                    </Button>
                  </Link>
                </div>
              ) : (
                <select
                  value={mentalClientId}
                  onChange={(e) => setMentalClientId(e.target.value ? Number(e.target.value) : "")}
                  className={SELECT_CLASS}
                >
                  <option value="">대상을 선택하세요</option>
                  {mentalClients.data?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.relation ? `(${m.relation})` : ""}
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
        </Card>
        </>
        )}

        {/* ═══ STEP 2: 일정·상세 ═══ */}
        {step === 2 && (
        <Card className="rounded-2xl p-5 pt-4">
          {/* 모드 (시니어 전용 — 간병은 연속 일수로 자동 결정, 가사는 1회 방문) */}
          {domain === "senior" && (
            <div>
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

          {/* 반복 요일 + 주수 (시니어 정기 전용) — P1-2 */}
          {recurringNeedsWeekdays && (
            <div className="mt-4">
              <label className={SECTION_LABEL}>
                반복 요일 <span className="font-semibold text-warm-400">(정기 · 중복 가능)</span>
              </label>
              <div className="grid grid-cols-7 gap-1.5">
                {([[1, "월"], [2, "화"], [3, "수"], [4, "목"], [5, "금"], [6, "토"], [7, "일"]] as const).map(([d, l]) => {
                  const on = weekdays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleWeekday(d)}
                      className={
                        "h-10 rounded-xl border text-[13px] font-bold transition-colors " +
                        (on ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-600")
                      }
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-[12.5px] font-semibold text-warm-600">반복 주수</span>
                <button
                  type="button"
                  onClick={() => setWeeks((w) => Math.max(1, w - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-warm-200 bg-white text-warm-600 active:scale-95"
                  aria-label="주수 줄이기"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-[16px] font-extrabold text-warm-800">{weeks}주</span>
                <button
                  type="button"
                  onClick={() => setWeeks((w) => Math.min(12, w + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-warm-200 bg-white text-warm-600 active:scale-95"
                  aria-label="주수 늘리기"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-warm-400">
                {weekdays.length
                  ? `선택한 요일마다 ${weeks}주간 반복 방문해요. (매칭 확정 후 회차별 일정이 생성돼요)`
                  : "반복할 요일을 선택해 주세요."}
              </p>
            </div>
          )}

          {/* 일정 */}
          <div className={domain === "senior" ? "mt-4" : ""}>
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
            {/* 시작+소요 → 종료시각 실시간 안내 */}
            {start && (
              <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-[12px] font-semibold text-brand-700">
                {start.slice(11, 16)}부터 {durHours}시간 진행 예정이에요.
              </p>
            )}
            <p className="text-[11px] text-warm-400 mt-2">
              60분~{maxDuration}분{domain === "nursing" ? " · 최대 24시간" : ""} · 30분 단위로 조절돼요
            </p>
          </div>

          {/* 세부 서비스 항목 멀티셀렉트 (선택) — 매칭 정확도 향상 (P1-1) */}
          {serviceGuide(domain).items.length > 0 && (
            <div className="mt-4">
              <label className={SECTION_LABEL}>
                필요한 세부 항목 <span className="font-semibold text-warm-400">(선택 · 중복 가능)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {serviceGuide(domain).items.map((it) => {
                  const on = serviceItems.includes(it);
                  return (
                    <button
                      key={it}
                      type="button"
                      onClick={() => toggleItem(it)}
                      className={
                        "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors " +
                        (on ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-600")
                      }
                    >
                      {on && "✓ "}{it}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-warm-400 mt-1.5">
                필요한 항목을 선택하면 돌봄전문가에게 전달돼 매칭이 더 정확해져요.
              </p>
            </div>
          )}

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

          {/* 동행 경로 (LS_COMPANION 전용) — P2-2 */}
          {isCompanion && (
            <div className="mt-4 rounded-2xl border border-warm-200 bg-warm-50/60 p-4">
              <label className={SECTION_LABEL}>동행 경로</label>
              <p className="-mt-1 mb-2 text-[11px] text-warm-400">
                만남 장소는 앞서 선택한 서비스 주소예요. 방문 장소와 이동 수단을 알려주세요.
              </p>
              <div className="text-[12px] font-bold text-warm-600 mb-1">방문 장소</div>
              <AddressSearch onChange={setDestination} />

              <div className="mt-3.5 text-[12px] font-bold text-warm-600 mb-1.5">복귀 장소</div>
              <div className="grid grid-cols-2 gap-2">
                {([[true, "만남 장소와 동일"], [false, "다른 장소"]] as const).map(([v, l]) => {
                  const on = returnToOrigin === v;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setReturnToOrigin(v)}
                      className={
                        "h-11 rounded-xl border text-[12.5px] font-bold transition-colors " +
                        (on ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-600")
                      }
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
              {!returnToOrigin && <div className="mt-2"><AddressSearch onChange={setReturnAddress} /></div>}

              <div className="mt-3.5 flex items-center justify-between">
                <span className="text-[12px] font-bold text-warm-600">경유지 (선택)</span>
                {waypoints.length < 5 && (
                  <button type="button" onClick={() => setWaypoints((w) => [...w, ""])} className="text-[12px] font-bold text-brand-600">
                    + 추가
                  </button>
                )}
              </div>
              {waypoints.map((wp, i) => (
                <div key={i} className="mt-1.5 flex items-center gap-2">
                  <Input
                    value={wp}
                    onChange={(e) => setWaypoints((w) => w.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder={`경유지 ${i + 1} 주소`}
                    className="h-11 flex-1 rounded-xl text-[13.5px]"
                  />
                  <button
                    type="button"
                    onClick={() => setWaypoints((w) => w.filter((_, j) => j !== i))}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-warm-200 text-warm-400"
                    aria-label="경유지 삭제"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <div className="mt-3.5 text-[12px] font-bold text-warm-600 mb-1.5">이동 수단</div>
              <div className="grid grid-cols-2 gap-2">
                {([["taxi", "택시"], ["transit", "대중교통"]] as const).map(([v, l]) => {
                  const on = transport === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTransport(v)}
                      className={
                        "h-11 rounded-xl border text-[13.5px] font-bold transition-colors " +
                        (on ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-600")
                      }
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-warm-400">
                자가용 이용은 불가하며, 교통비 등 실비는 보호자가 부담해요.
              </p>
            </div>
          )}

          {/* 완료사진 요구 (가사 전용 — 동행 제외) */}
          {domain === "living_support" && !isCompanion && (
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
                  방문목욕은 신체 노출을 동반하므로 돌봄대상과 같은 성별의 돌봄전문가만 매칭됩니다.
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
        )}

        {/* ═══ STEP 3: 확인·동의 ═══ */}
        {step === 3 && (
        <Card className="rounded-2xl p-5 pt-4">
          <label className={SECTION_LABEL}>요청 내용 확인</label>
          <dl className="divide-y divide-warm-100 rounded-xl border border-warm-200/70 bg-white">
            {[
              ["서비스", domainLabel],
              ["돌봄 대상", recipientName ?? "-"],
              ["서비스 종류", selectedCategory?.name ?? "-"],
              ...(serviceItems.length ? [["세부 항목", serviceItems.join(", ")] as [string, string]] : []),
              ...(isCompanion
                ? [
                    ["방문 장소", destination || "-"] as [string, string],
                    ["복귀", returnToOrigin ? "만남 장소와 동일" : returnAddress || "-"] as [string, string],
                    ...(waypoints.filter(Boolean).length
                      ? [["경유지", waypoints.filter(Boolean).join(", ")] as [string, string]]
                      : []),
                    ["이동 수단", transport === "taxi" ? "택시" : transport === "transit" ? "대중교통" : "-"] as [string, string],
                  ]
                : []),
              ["시작 일시", start ? start.replace("T", " ") : "-"],
              ["소요 시간", `${duration}분 · ${durHours}시간${domain === "nursing" && days >= 2 ? ` · ${days}일 반복` : ""}`],
              ...(domain === "senior" ? [["유형", MODES.find((m) => m.key === mode)?.label ?? mode] as [string, string]] : []),
              ...(recurringNeedsWeekdays && weekdays.length
                ? [["반복", `${weekdays.map((d) => ["", "월", "화", "수", "목", "금", "토", "일"][d]).join("·")} · ${weeks}주`] as [string, string]]
                : []),
              ["선호 성별", genderLabel],
              ...(budget && Number(budget) > 0 ? [["희망 상한 시급", won(Number(budget))] as [string, string]] : []),
              ...(estimatedTotal ? [["예상 총액", won(estimatedTotal)] as [string, string]] : []),
              ...(memo ? [["요청사항", memo] as [string, string]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                <dt className="shrink-0 text-[12.5px] font-semibold text-warm-500">{k}</dt>
                <dd className="text-right text-[13px] font-bold text-warm-800 break-keep">{v}</dd>
              </div>
            ))}
          </dl>

          {/* 컴플라이언스 고지 (P0-2) */}
          <div className="mt-4 rounded-xl border border-warm-200 bg-warm-50 p-4">
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-warm-700">
              <ShieldCheck className="h-4 w-4 text-brand-500" /> 신청 전 확인해 주세요
            </div>
            <ul className="mt-2.5 space-y-2">
              {COMPLIANCE_NOTES.map((note) => (
                <li key={note} className="flex gap-1.5 text-[11.5px] leading-relaxed text-warm-500">
                  <span className="mt-0.5 text-brand-500">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 필수 동의 */}
          <label
            ref={agreeRef}
            className={
              "mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border bg-white p-3.5 transition-colors " +
              (agreeError && !agree ? "border-danger ring-2 ring-danger/20" : "border-warm-200")
            }
          >
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => {
                setAgree(e.target.checked);
                if (e.target.checked) setAgreeError(false);
              }}
              className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-brand-500"
            />
            <span className="text-[12.5px] leading-relaxed text-warm-700">
              <b className="text-warm-800">(필수)</b> 위 안내 사항과, 매칭된 돌봄전문가에게 돌봄대상 정보가 제공되는 것(개인정보 제3자 제공)에 동의합니다.
            </span>
          </label>
        </Card>
        )}

        {/* 스텝 1·2 하단 반복 고지(간략) */}
        {step !== 3 && (
          <div className="mt-3.5 flex items-center gap-1.5 text-[11px] text-warm-400">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-warm-400" />
            <span>안전을 위해 돌봄전문가와의 직거래·외부 연락처 교환은 금지돼요.</span>
          </div>
        )}
        </div>

        {/* ── 우측: 적정 간병비 + 네비게이션 (데스크톱 sticky) ── */}
        <div className="lg:sticky lg:top-6 lg:self-start">
        {/* 적정 간병비 + 희망 상한 (역경매) — 일정·확인 스텝에서 노출 */}
        {step >= 2 && (
        <Card className="mt-3.5 p-4 lg:mt-0">
          <label className={SECTION_LABEL}>적정 간병비</label>
          {!estimateEnabled ? (
            <p className="text-[12.5px] text-warm-400 mt-1">서비스·일시·소요 시간을 선택하면 권장 시급을 안내해 드려요.</p>
          ) : priceEstimate.isLoading ? (
            <p className="text-[12.5px] text-warm-400 mt-1">권장 시급 계산 중…</p>
          ) : priceEstimate.data ? (
            <div className="mt-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-[22px] font-extrabold text-brand-700 tabular-nums">{won(priceEstimate.data.suggested)}</span>
                <span className="text-[12px] text-warm-400">권장 시급</span>
              </div>
              <div className="text-[12px] text-warm-500 mt-0.5 tabular-nums">
                권장 범위 {won(priceEstimate.data.floor)} ~ {won(priceEstimate.data.ceil)}
                {" · 예상 총액 "}
                {won(priceEstimate.data.suggested * (duration / 60) * (domain === "nursing" ? days : 1))}
              </div>
            </div>
          ) : (
            <p className="text-[12.5px] text-warm-400 mt-1">권장 시급을 불러오지 못했습니다.</p>
          )}

          <label className={SECTION_LABEL + " mt-4"}>희망 상한 시급 (선택)</label>
          <Input
            type="number"
            inputMode="numeric"
            step={500}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder={priceEstimate.data ? String(priceEstimate.data.suggested) : "예) 20000"}
            className="tabular-nums"
          />
          <p className="text-[11px] text-warm-400 mt-1.5">돌봄전문가가 이 금액을 참고해 입찰합니다. 비워두면 권장가 기준으로 진행돼요.</p>
        </Card>
        )}

        {/* 요청 전 안내 (확인 스텝) */}
        {step === 3 && (
        <div className="mt-3.5 flex items-center gap-2 text-[11.5px] text-warm-400">
          <Sparkle className="h-3.5 w-3.5 text-brand-500 shrink-0" />
          <span>
            요청을 보내면 AI가 잘 맞는 후보 <b className="text-warm-600">3~5명</b>을 빠르게 추천해 드려요.
          </span>
        </div>
        )}

        {/* 네비게이션 — 스텝별 이전/다음/제출 */}
        <div className="mt-5 flex gap-2.5">
          {step > 1 && (
            <Button
              variant="outline"
              size="lg"
              className="flex-1 rounded-2xl"
              onClick={() => setStep((s) => s - 1)}
            >
              이전
            </Button>
          )}
          {step === 1 && (
            <Button
              variant="brand"
              size="lg"
              className="flex-1 rounded-2xl shadow-md"
              disabled={!step1Valid}
              onClick={() => setStep(2)}
            >
              다음
            </Button>
          )}
          {step === 2 && (
            <Button
              variant="brand"
              size="lg"
              className="flex-1 rounded-2xl shadow-md"
              disabled={!step2Valid}
              onClick={() => setStep(3)}
            >
              다음
            </Button>
          )}
          {step === 3 && (
            <Button
              variant="brand"
              size="lg"
              className="flex-[2] rounded-2xl shadow-md"
              disabled={create.isPending}
              onClick={submitRequest}
            >
              <Sparkle className="h-[18px] w-[18px]" />
              {create.isPending ? "요청 중…" : "AI 매칭 요청하기"}
            </Button>
          )}
        </div>
        </div>
        </div>
      </div>
    </div>
  );
}
