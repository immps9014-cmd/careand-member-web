"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CreateAddressPayload, ServiceAddress, DwellingType } from "@/lib/api/member";
import { DWELLING_OPTIONS } from "@/lib/care";
import { openPostcode } from "@/lib/postcode";

/**
 * 서비스 주소 등록/수정 공용 폼 (가사 도메인)
 * — patients/patient-form과 동일한 UX 패턴
 */
export function AddressForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
}: {
  initial?: ServiceAddress;
  submitLabel: string;
  pending: boolean;
  onSubmit: (payload: CreateAddressPayload) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [baseAddress, setBaseAddress] = useState(initial?.address ?? "");
  const [zonecode, setZonecode] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [dwelling, setDwelling] = useState<DwellingType>(initial?.dwelling_type ?? "apartment");
  const [sizeM2, setSizeM2] = useState<number | "">(initial?.size_m2 ?? "");
  const [hasPets, setHasPets] = useState(initial?.has_pets ?? false);
  const [entryNote, setEntryNote] = useState(initial?.entry_note ?? "");

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

  const fullAddress = [baseAddress, detailAddress.trim()].filter(Boolean).join(" ");
  const valid = label.trim() && baseAddress;

  function handleSubmit() {
    onSubmit({
      label: label.trim(),
      // 좌표는 서버가 주소로 자동 지오코딩 (돌봄전문가 체크인 검증용)
      address: fullAddress,
      dwelling_type: dwelling,
      size_m2: sizeM2 === "" ? undefined : Number(sizeM2),
      has_pets: hasPets,
      entry_note: entryNote.trim() || undefined,
    });
  }

  return (
    <Card className="p-5 space-y-4">
      <div>
        <label htmlFor="address-label" className="block text-xs font-semibold text-warm-600 mb-1.5">주소 이름</label>
        <Input id="address-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={50} placeholder="우리집, 부모님댁" />
      </div>

      {/* 주소: Daum 우편번호 검색 */}
      <div>
        <label htmlFor="address-detail" className="block text-xs font-semibold text-warm-600 mb-1.5">주소</label>
        <Button type="button" variant="outline" className="w-full mb-2" onClick={handleSearchAddress}>
          <Search className="w-4 h-4" /> 주소 검색
        </Button>
        {baseAddress && (
          <div className="flex items-start gap-2 text-sm text-warm-700 bg-warm-50 rounded-md p-2.5 mb-2">
            <MapPin className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
            <span>
              {zonecode && <span className="text-xs text-warm-500 font-en mr-1">[{zonecode}]</span>}
              {baseAddress}
            </span>
          </div>
        )}
        <Input
          id="address-detail"
          value={detailAddress}
          onChange={(e) => setDetailAddress(e.target.value)}
          maxLength={100}
          placeholder="상세주소 (동/호수 등, 선택)"
          disabled={!baseAddress}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-warm-600 mb-1.5">주거 형태</label>
        <div className="grid grid-cols-5 gap-1.5">
          {DWELLING_OPTIONS.map((d) => (
            <Button
              key={d.value}
              variant={dwelling === d.value ? "brand" : "outline"}
              size="sm"
              onClick={() => setDwelling(d.value)}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="address-size" className="block text-xs font-semibold text-warm-600 mb-1.5">평수 (㎡, 선택)</label>
        <Input
          id="address-size"
          type="number"
          min={1}
          max={3000}
          value={sizeM2}
          onChange={(e) => setSizeM2(e.target.value ? Number(e.target.value) : "")}
          placeholder="84"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-warm-600 mb-1.5">반려동물</label>
        <div className="flex gap-2">
          {([[false, "없음"], [true, "있음"]] as const).map(([v, l]) => (
            <Button
              key={l}
              variant={hasPets === v ? "brand" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setHasPets(v)}
            >
              {l}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="address-entry-note" className="block text-xs font-semibold text-warm-600 mb-1.5">출입 안내 (선택)</label>
        <textarea
          id="address-entry-note"
          value={entryNote}
          onChange={(e) => setEntryNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="공동현관 비밀번호, 주차 안내 등 (확정된 돌봄전문가에게만 전달됩니다)"
          className="w-full rounded-md border border-warm-200 bg-white px-3 py-2 text-sm placeholder:text-warm-500 focus:outline-none focus:border-brand-500 resize-none"
        />
      </div>

      <Button variant="brand" size="lg" className="w-full" disabled={!valid || pending} onClick={handleSubmit}>
        {pending ? "저장 중…" : submitLabel}
      </Button>
    </Card>
  );
}
