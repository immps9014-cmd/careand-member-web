"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, HeartPulse, Stethoscope, Sparkles, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { memberApi } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";

const MODES = [
  { key: "normal", label: "일반" },
  { key: "emergency", label: "긴급" },
  { key: "recurring", label: "정기" },
];

type Domain = "senior" | "nursing" | "housekeeping";

const DOMAINS: { key: Domain; label: string; desc: string; icon: typeof HeartPulse }[] = [
  { key: "senior", label: "시니어 돌봄", desc: "어르신 방문 돌봄", icon: HeartPulse },
  { key: "nursing", label: "병원 간병", desc: "입원 환자 간병", icon: Stethoscope },
  { key: "housekeeping", label: "가사 서비스", desc: "청소·수리·정리수납", icon: Sparkles },
];

export default function NewRequestPage() {
  const router = useRouter();
  const [domain, setDomain] = useState<Domain>("senior");

  // 시니어 플로우 상태 (기존 동작 유지)
  const [seniorId, setSeniorId] = useState<number | "">("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [mode, setMode] = useState("normal");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState(120);
  const [memo, setMemo] = useState("");

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

  function selectDomain(d: Domain) {
    if (d === domain) return;
    setDomain(d);
    setCategoryId(""); // 도메인별 카테고리가 다르므로 초기화
  }

  const create = useMutation({
    mutationFn: () => {
      // datetime-local(2026-06-12T14:00) → Y-m-d\TH:i:sP (+09:00)
      const scheduled = `${start}:00+09:00`;
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
          requirements: { photo_required: photoRequired },
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

  const noPatients = domain === "nursing" && patients.isSuccess && patients.data.length === 0;
  const noAddresses = domain === "housekeeping" && addresses.isSuccess && addresses.data.length === 0;
  const noCategories = categories.isSuccess && categories.data.length === 0;

  return (
    <div className="p-5">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-4">
        <ChevronLeft className="w-4 h-4" /> 뒤로
      </button>
      <h1 className="text-xl font-extrabold text-warm-800 mb-1">새 매칭 요청</h1>
      <p className="text-sm text-warm-500 mb-5">돌봄 대상과 일정을 선택하면 AI가 인력을 추천합니다</p>

      {/* 1단계: 서비스 종류(도메인) 선택 */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-warm-600 mb-1.5">어떤 서비스가 필요하세요?</label>
        <div className="grid grid-cols-3 gap-2">
          {DOMAINS.map((d) => {
            const Icon = d.icon;
            const active = domain === d.key;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => selectDomain(d.key)}
                className={
                  "rounded-lg border p-3 text-left transition-colors " +
                  (active ? "border-brand-500 bg-brand-50" : "border-warm-200 bg-white")
                }
              >
                <Icon className={"w-5 h-5 mb-1.5 " + (active ? "text-brand-600" : "text-warm-400")} />
                <div className={"text-[13px] font-bold " + (active ? "text-brand-700" : "text-warm-700")}>{d.label}</div>
                <div className="text-[10px] text-warm-400 mt-0.5">{d.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="p-5 space-y-4">
        {/* 대상 선택 */}
        {domain === "senior" && (
          <div>
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">돌봄 대상</label>
            <select
              value={seniorId}
              onChange={(e) => setSeniorId(e.target.value ? Number(e.target.value) : "")}
              className="w-full h-10 rounded-md border border-warm-200 bg-white px-3 text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="">대상자를 선택하세요</option>
              {seniors.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.age ? `(${s.age}세)` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {domain === "nursing" && (
          <div>
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">간병 대상 환자</label>
            {noPatients ? (
              <div className="rounded-md bg-warm-50 p-3.5 text-center">
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
                className="w-full h-10 rounded-md border border-warm-200 bg-white px-3 text-sm focus:outline-none focus:border-brand-500"
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
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">서비스 주소</label>
            {noAddresses ? (
              <div className="rounded-md bg-warm-50 p-3.5 text-center">
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
                className="w-full h-10 rounded-md border border-warm-200 bg-white px-3 text-sm focus:outline-none focus:border-brand-500"
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
        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">서비스 종류</label>
          {noCategories ? (
            <p className="rounded-md bg-warm-50 p-3 text-xs text-warm-500 text-center">
              현재 신청 가능한 서비스가 준비 중입니다. 오픈 시 알림으로 안내드릴게요.
            </p>
          ) : (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
              className="w-full h-10 rounded-md border border-warm-200 bg-white px-3 text-sm focus:outline-none focus:border-brand-500"
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
          <div>
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">유형</label>
            <div className="flex gap-2">
              {MODES.map((m) => (
                <Button
                  key={m.key}
                  variant={mode === m.key ? "brand" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setMode(m.key)}
                >
                  {m.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* 일정 */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">시작 일시</label>
          <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>

        {/* 시간 */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">
            소요 시간 (분, 60~{maxDuration}{domain === "nursing" ? " · 최대 24시간" : ""})
          </label>
          <Input
            type="number"
            min={60}
            max={maxDuration}
            step={30}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>

        {/* 연속 일수 (간병 전용) */}
        {domain === "nursing" && (
          <div>
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">연속 일수 (1~30일)</label>
            <Input
              type="number"
              min={1}
              max={30}
              step={1}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
            <p className="text-[11px] text-warm-400 mt-1">
              {days >= 2 ? `매일 같은 시간에 ${days}일간 반복되는 정기 간병으로 요청됩니다.` : "하루 단위 간병으로 요청됩니다."}
            </p>
          </div>
        )}

        {/* 완료사진 요구 (가사 전용) */}
        {domain === "housekeeping" && (
          <div>
            <label className="block text-xs font-semibold text-warm-600 mb-1.5">작업 완료사진</label>
            <div className="flex gap-2">
              {([[true, "요청"], [false, "불필요"]] as const).map(([v, l]) => (
                <Button
                  key={l}
                  variant={photoRequired === v ? "brand" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setPhotoRequired(v)}
                >
                  {l}
                </Button>
              ))}
            </div>
            <p className="text-[11px] text-warm-400 mt-1">
              {photoRequired
                ? "작업자가 완료사진을 등록해야 작업을 종료할 수 있습니다."
                : "완료사진 없이 작업을 종료할 수 있습니다."}
            </p>
          </div>
        )}

        {/* 메모 */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">요청사항 (선택)</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="특이사항이나 요청사항을 입력하세요"
            className="w-full rounded-md border border-warm-200 bg-white px-3 py-2 text-sm placeholder:text-warm-400 focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>

        <Button
          variant="brand"
          size="lg"
          className="w-full"
          disabled={!valid || create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending ? "요청 중…" : "AI 매칭 요청"}
        </Button>
      </Card>
    </div>
  );
}
