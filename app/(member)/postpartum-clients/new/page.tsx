"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressSearch } from "@/components/address-search";
import { memberApi, type CreatePostpartumClientPayload, type DeliveryType } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";

const SECTION_LABEL = "block text-[12.5px] font-bold text-warm-600 mb-2";
const SELECT_CLASS =
  "w-full h-12 rounded-xl border border-warm-200 bg-white px-3.5 text-[14.5px] text-warm-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20";

// 시/도 — region_code 로 그대로 저장(가격 지역지수 매칭에 사용)
const REGIONS = ["서울", "경기", "인천", "부산", "대구", "대전", "광주", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
const DELIVERY: { v: DeliveryType; l: string }[] = [
  { v: "natural", l: "자연분만" },
  { v: "cesarean", l: "제왕절개" },
  { v: "vbac", l: "브이백(VBAC)" },
];

export default function NewPostpartumClientPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // 생년월일: 년/월/일 드롭다운(앱 공통 UX) → "YYYY-MM-DD". 캘린더로 수십 년 넘길 필요 없음.
  const [birthY, setBirthY] = useState<number | "">("");
  const [birthM, setBirthM] = useState<number | "">("");
  const [birthD, setBirthD] = useState<number | "">("");
  const [address, setAddress] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("natural");
  const [isFirstBaby, setIsFirstBaby] = useState(true);

  // 산모 대상 → 올해부터 1940년까지(내림차순)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1940 + 1 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = birthY !== "" && birthM !== "" ? new Date(birthY, birthM, 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const birthDate =
    birthY !== "" && birthM !== "" && birthD !== ""
      ? `${birthY}-${String(birthM).padStart(2, "0")}-${String(birthD).padStart(2, "0")}`
      : "";
  function handleBirthYear(v: string) {
    const y = v ? Number(v) : "";
    setBirthY(y);
    if (y !== "" && birthM !== "" && birthD !== "" && birthD > new Date(y, birthM, 0).getDate()) setBirthD("");
  }
  function handleBirthMonth(v: string) {
    const m = v ? Number(v) : "";
    setBirthM(m);
    if (birthY !== "" && m !== "" && birthD !== "" && birthD > new Date(birthY, m, 0).getDate()) setBirthD("");
  }

  const create = useMutation({
    mutationFn: (payload: CreatePostpartumClientPayload) => memberApi.createPostpartumClient(payload),
    onSuccess: (res) => {
      toast.success("산모 정보를 등록했습니다.");
      qc.invalidateQueries({ queryKey: ["member", "postpartum-clients"] });
      const id = res?.data?.data?.id;
      router.push(`/request/new?domain=postpartum${id ? `&postpartum_client_id=${id}` : ""}`);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const valid = name && phone && birthDate && address && regionCode && deliveryDate;

  return (
    <div className="min-h-screen bg-warm-50 pb-28">
      <div className="p-5 lg:mx-auto lg:max-w-2xl">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-3">
          <ChevronLeft className="w-4 h-4" /> 뒤로
        </button>
        <h1 className="text-xl font-extrabold text-warm-800 mb-1">산모 등록</h1>
        <p className="text-sm text-warm-500 mb-5">산후관리 서비스를 받으실 산모 정보를 입력하세요</p>

        <Card className="rounded-2xl p-5 space-y-4">
          <div>
            <label className={SECTION_LABEL}>산모 성함</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="성함" className="h-12 rounded-xl text-[14.5px]" />
          </div>
          <div>
            <label className={SECTION_LABEL}>연락처</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" inputMode="tel" className="h-12 rounded-xl text-[14.5px]" />
          </div>
          <div>
            <label className={SECTION_LABEL}>생년월일</label>
            <div className="grid grid-cols-3 gap-2">
              <select value={birthY} onChange={(e) => handleBirthYear(e.target.value)} className={SELECT_CLASS}>
                <option value="">년도</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
              <select value={birthM} onChange={(e) => handleBirthMonth(e.target.value)} className={SELECT_CLASS}>
                <option value="">월</option>
                {months.map((m) => (
                  <option key={m} value={m}>{m}월</option>
                ))}
              </select>
              <select value={birthD} onChange={(e) => setBirthD(e.target.value ? Number(e.target.value) : "")} className={SELECT_CLASS}>
                <option value="">일</option>
                {days.map((d) => (
                  <option key={d} value={d}>{d}일</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={SECTION_LABEL}>주소</label>
            <AddressSearch onChange={setAddress} />
          </div>
          <div>
            <label className={SECTION_LABEL}>지역(시·도)</label>
            <select value={regionCode} onChange={(e) => setRegionCode(e.target.value)} className={SELECT_CLASS}>
              <option value="">지역을 선택하세요</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={SECTION_LABEL}>출산(예정)일</label>
            <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="h-12 rounded-xl text-[14.5px]" />
          </div>
          <div>
            <label className={SECTION_LABEL}>출산 유형</label>
            <div className="grid grid-cols-3 gap-2">
              {DELIVERY.map((d) => {
                const on = deliveryType === d.v;
                return (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => setDeliveryType(d.v)}
                    className={
                      "h-11 rounded-xl border text-[13px] font-bold transition-colors " +
                      (on ? "border-brand-500 bg-brand-500 text-white" : "border-warm-200 bg-white text-warm-600")
                    }
                  >
                    {d.l}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className={SECTION_LABEL}>첫 출산인가요?</label>
            <div className="grid grid-cols-2 gap-2">
              {([[true, "첫 출산"], [false, "경산모"]] as const).map(([v, l]) => {
                const on = isFirstBaby === v;
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setIsFirstBaby(v)}
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
          </div>
        </Card>

        <Button
          variant="brand"
          size="lg"
          className="mt-5 w-full rounded-2xl shadow-md"
          disabled={!valid || create.isPending}
          onClick={() =>
            create.mutate({
              name,
              phone,
              birth_date: birthDate,
              address,
              region_code: regionCode,
              delivery_date: deliveryDate,
              delivery_type: deliveryType,
              is_first_baby: isFirstBaby,
            })
          }
        >
          {create.isPending ? "등록 중…" : "산모 등록"}
        </Button>
      </div>
    </div>
  );
}
