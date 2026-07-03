"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search, MapPin, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BirthDateSelect } from "@/components/ui/birth-date-select";
import type { CreatePatientPayload, NursingPatient, PatientMobility } from "@/lib/api/member";
import { CARE_REQUIREMENT_PRESETS, MOBILITY_OPTIONS } from "@/lib/care";
import { openPostcode } from "@/lib/postcode";

/**
 * 환자 등록/수정 공용 폼 (간병 도메인)
 * — seniors/new 폼과 동일한 UX 패턴
 */
export function PatientForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
}: {
  initial?: NursingPatient;
  submitLabel: string;
  pending: boolean;
  onSubmit: (payload: CreatePatientPayload) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  // 생년월일: 편집 시 기존 birth_date("YYYY-MM-DD")로 초기화 (BirthDateSelect)
  const [birth, setBirth] = useState(initial?.birth_date?.slice(0, 10) ?? "");
  const [gender, setGender] = useState<"M" | "F">(initial?.gender === "M" ? "M" : "F");
  const [hospitalName, setHospitalName] = useState(initial?.hospital_name ?? "");
  const [baseAddress, setBaseAddress] = useState(initial?.hospital_address ?? "");
  const [zonecode, setZonecode] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [wardRoom, setWardRoom] = useState(initial?.ward_room ?? "");
  const [mobility, setMobility] = useState<PatientMobility>(initial?.mobility ?? "independent");
  const [diseases, setDiseases] = useState((initial?.diseases ?? []).join(", "));
  const [careReqs, setCareReqs] = useState<string[]>(initial?.care_requirements ?? []);
  const [customReq, setCustomReq] = useState("");
  const [notes, setNotes] = useState(initial?.special_notes ?? "");

  async function handleSearchAddress() {
    try {
      const result = await openPostcode();
      if (result) {
        setBaseAddress(result.address);
        setZonecode(result.zonecode);
        setDetailAddress("");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "주소 검색에 실패했습니다");
    }
  }

  function toggleReq(tag: string) {
    setCareReqs((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function addCustomReq() {
    const tag = customReq.trim();
    if (!tag) return;
    if (!careReqs.includes(tag)) setCareReqs((prev) => [...prev, tag]);
    setCustomReq("");
  }

  const fullAddress = [baseAddress, detailAddress.trim()].filter(Boolean).join(" ");
  const customReqs = careReqs.filter((t) => !CARE_REQUIREMENT_PRESETS.includes(t));

  const valid = name.trim() && birth && hospitalName.trim() && baseAddress;

  function handleSubmit() {
    onSubmit({
      name: name.trim(),
      birth_date: birth,
      gender,
      hospital_name: hospitalName.trim(),
      // 좌표는 서버가 주소로 자동 지오코딩
      hospital_address: fullAddress,
      ward_room: wardRoom.trim() || undefined,
      mobility,
      diseases: diseases
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean),
      care_requirements: careReqs,
      special_notes: notes.trim() || undefined,
    });
  }

  return (
    <Card className="p-5 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-warm-600 mb-1.5">성함</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="홍길동" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-warm-600 mb-1.5">생년월일</label>
        <BirthDateSelect
          value={birth}
          onChange={setBirth}
          order="asc"
          selectClassName="h-10 rounded-md border border-warm-200 bg-white px-2 text-sm focus:outline-none focus:border-brand-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-warm-600 mb-1.5">성별</label>
        <div className="flex gap-2">
          {([["F", "여성"], ["M", "남성"]] as const).map(([k, label]) => (
            <Button key={k} variant={gender === k ? "brand" : "outline"} size="sm" className="flex-1" onClick={() => setGender(k)}>
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-warm-600 mb-1.5">병원명</label>
        <Input value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} maxLength={100} placeholder="OO대학교병원" />
      </div>

      {/* 병원 주소: Daum 우편번호 검색 */}
      <div>
        <label className="block text-xs font-semibold text-warm-600 mb-1.5">병원 주소</label>
        <Button type="button" variant="outline" className="w-full mb-2" onClick={handleSearchAddress}>
          <Search className="w-4 h-4" /> 주소 검색
        </Button>
        {baseAddress && (
          <div className="flex items-start gap-2 text-sm text-warm-700 bg-warm-50 rounded-md p-2.5 mb-2">
            <MapPin className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
            <span>
              {zonecode && <span className="text-xs text-warm-400 font-en mr-1">[{zonecode}]</span>}
              {baseAddress}
            </span>
          </div>
        )}
        <Input
          value={detailAddress}
          onChange={(e) => setDetailAddress(e.target.value)}
          maxLength={100}
          placeholder="상세주소 (건물/동 등, 선택)"
          disabled={!baseAddress}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-warm-600 mb-1.5">병동·호실 (선택)</label>
        <Input value={wardRoom} onChange={(e) => setWardRoom(e.target.value)} maxLength={50} placeholder="본관 7병동 701호" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-warm-600 mb-1.5">거동 상태</label>
        <div className="flex gap-2">
          {MOBILITY_OPTIONS.map((m) => (
            <Button
              key={m.value}
              variant={mobility === m.value ? "brand" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMobility(m.value)}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-warm-600 mb-1.5">질환 (선택, 쉼표로 구분)</label>
        <Input value={diseases} onChange={(e) => setDiseases(e.target.value)} placeholder="뇌경색, 당뇨, 고관절 골절" />
      </div>

      {/* 케어 요구사항: 프리셋 태그 + 자유입력 */}
      <div>
        <label className="block text-xs font-semibold text-warm-600 mb-1.5">케어 요구사항 (선택)</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {[...CARE_REQUIREMENT_PRESETS, ...customReqs].map((tag) => {
            const selected = careReqs.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleReq(tag)}
                className={
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors " +
                  (selected ? "bg-brand-500 text-white" : "bg-warm-100 text-warm-500")
                }
              >
                {tag}
                {selected && <X className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Input
            value={customReq}
            onChange={(e) => setCustomReq(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomReq();
              }
            }}
            maxLength={30}
            placeholder="직접 입력 (예: 재활보조)"
          />
          <Button type="button" variant="outline" size="md" onClick={addCustomReq} disabled={!customReq.trim()}>
            추가
          </Button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-warm-600 mb-1.5">특이사항 (선택)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="수술 이력, 주의사항, 보호자 요청 등"
          className="w-full rounded-md border border-warm-200 bg-white px-3 py-2 text-sm placeholder:text-warm-400 focus:outline-none focus:border-brand-500 resize-none"
        />
      </div>

      <Button variant="brand" size="lg" className="w-full" disabled={!valid || pending} onClick={handleSubmit}>
        {pending ? "저장 중…" : submitLabel}
      </Button>
    </Card>
  );
}
