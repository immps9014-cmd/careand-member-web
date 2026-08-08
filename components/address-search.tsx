"use client";

import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { openPostcode } from "@/lib/postcode";

interface AddressSearchProps {
  /** 전체 주소(도로명 + 상세) 변경 콜백 */
  onChange: (full: string) => void;
  className?: string;
}

/**
 * Daum(카카오) 우편번호 검색 + 상세주소 입력 필드.
 * 라벨은 호출 측에서 렌더링(폼별 라벨 유지). 선택한 도로명 + 상세주소를 합쳐 onChange 로 전달.
 */
export function AddressSearch({ onChange, className }: AddressSearchProps) {
  const [base, setBase] = useState("");
  const [zonecode, setZonecode] = useState("");
  const [detail, setDetail] = useState("");

  const emit = (b: string, d: string) => onChange([b, d.trim()].filter(Boolean).join(" "));

  async function search() {
    try {
      const r = await openPostcode();
      if (r) {
        setBase(r.address);
        setZonecode(r.zonecode);
        emit(r.address, detail);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "주소 검색에 실패했습니다");
    }
  }

  return (
    <div className={className}>
      <Button type="button" variant="outline" className="mb-2 h-12 w-full rounded-xl" onClick={search}>
        <Search className="h-4 w-4" /> 주소 검색
      </Button>
      {base && (
        <div className="mb-2 flex items-start gap-2 rounded-md bg-warm-50 p-2.5 text-sm text-warm-700">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-500" />
          <span>
            {zonecode && <span className="font-en mr-1 text-xs text-warm-500">[{zonecode}]</span>}
            {base}
          </span>
        </div>
      )}
      <Input
        value={detail}
        onChange={(e) => {
          setDetail(e.target.value);
          emit(base, e.target.value);
        }}
        maxLength={100}
        placeholder="상세주소 (동/호수 등)"
        disabled={!base}
        className="h-12 rounded-xl text-[14.5px]"
      />
    </div>
  );
}
