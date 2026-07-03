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
import { memberApi, type CreateChildPayload } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";

const SECTION_LABEL = "block text-[12.5px] font-bold text-warm-600 mb-2";
const SELECT_CLASS =
  "w-full h-12 rounded-xl border border-warm-200 bg-white px-3.5 text-[14.5px] text-warm-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20";

export default function NewChildPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  // 생년월일: 년/월/일 드롭다운(앱 공통 UX) → "YYYY-MM-DD". 캘린더로 넘길 필요 없음.
  const [birthY, setBirthY] = useState<number | "">("");
  const [birthM, setBirthM] = useState<number | "">("");
  const [birthD, setBirthD] = useState<number | "">("");
  const [gender, setGender] = useState<"M" | "F">("F");
  const [homeAddress, setHomeAddress] = useState("");
  const [notes, setNotes] = useState("");

  // 아이 대상 → 올해부터 18년 전까지(내림차순)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 19 }, (_, i) => currentYear - i);
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
    mutationFn: (payload: CreateChildPayload) => memberApi.createChild(payload),
    onSuccess: (res) => {
      toast.success("아이를 등록했습니다.");
      qc.invalidateQueries({ queryKey: ["member", "children"] });
      const id = res?.data?.data?.id;
      router.push(`/request/new?domain=childcare${id ? `&childcare_child_id=${id}` : ""}`);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const valid = name && birthDate && homeAddress;

  return (
    <div className="min-h-screen bg-warm-50 pb-28">
      <div className="p-5 lg:mx-auto lg:max-w-2xl">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-3">
          <ChevronLeft className="w-4 h-4" /> 뒤로
        </button>
        <h1 className="text-xl font-extrabold text-warm-800 mb-1">아이 등록</h1>
        <p className="text-sm text-warm-500 mb-5">돌봄이 필요한 아이의 정보를 입력하세요</p>

        <Card className="rounded-2xl p-5 space-y-4">
          <div>
            <label className={SECTION_LABEL}>아이 이름</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className="h-12 rounded-xl text-[14.5px]" />
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
            <label className={SECTION_LABEL}>성별</label>
            <div className="grid grid-cols-2 gap-2">
              {([["F", "여아"], ["M", "남아"]] as const).map(([v, l]) => {
                const on = gender === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setGender(v)}
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
          <div>
            <label className={SECTION_LABEL}>돌봄 장소 주소</label>
            <AddressSearch onChange={setHomeAddress} />
            <p className="text-[11px] text-warm-400 mt-1.5">입력한 주소 기준으로 가까운 돌봄전문가를 추천합니다.</p>
          </div>
          <div>
            <label className={SECTION_LABEL}>특이사항 (선택)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="알레르기·투약·돌봄 요청사항 등"
              className="w-full rounded-xl border border-warm-200 bg-white px-3.5 py-3 text-[14px] placeholder:text-warm-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 resize-none"
            />
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
              birth_date: birthDate,
              gender,
              home_address: homeAddress,
              special_notes: notes || undefined,
            })
          }
        >
          {create.isPending ? "등록 중…" : "아이 등록"}
        </Button>
      </div>
    </div>
  );
}
