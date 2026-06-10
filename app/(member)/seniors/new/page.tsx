"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Search, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { memberApi } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { CARE_GRADES } from "@/lib/care";
import { openPostcode } from "@/lib/postcode";

export default function NewSeniorPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [gender, setGender] = useState<"M" | "F">("F");
  const [grade, setGrade] = useState<number | "">("");
  const [gradeNo, setGradeNo] = useState("");
  const [diseases, setDiseases] = useState("");
  const [baseAddress, setBaseAddress] = useState("");
  const [zonecode, setZonecode] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSearchAddress() {
    try {
      const result = await openPostcode();
      if (result) {
        setBaseAddress(result.address);
        setZonecode(result.zonecode);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "주소 검색에 실패했습니다");
    }
  }

  const fullAddress = [baseAddress, detailAddress.trim()].filter(Boolean).join(" ");

  const create = useMutation({
    mutationFn: () =>
      memberApi.createSenior({
        name: name.trim(),
        birth_date: birth,
        gender,
        care_grade: Number(grade),
        care_grade_no: gradeNo.trim() || undefined,
        diseases: diseases
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean),
        special_notes: notes.trim() || undefined,
        // 좌표는 서버가 주소로 자동 지오코딩
        home_address: fullAddress,
      }),
    onSuccess: () => {
      toast.success("어르신을 등록했습니다.");
      qc.invalidateQueries({ queryKey: ["member", "seniors"] });
      router.push("/seniors");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const valid = name.trim() && birth && grade !== "" && baseAddress;

  return (
    <div className="p-5">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-4">
        <ChevronLeft className="w-4 h-4" /> 뒤로
      </button>
      <h1 className="text-xl font-extrabold text-warm-800 mb-1">어르신 등록</h1>
      <p className="text-sm text-warm-500 mb-5">돌봄 대상 어르신의 정보를 입력하세요</p>

      <Card className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">성함</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="홍길동" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">생년월일</label>
          <Input type="date" value={birth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirth(e.target.value)} />
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
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">장기요양 등급</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full h-10 rounded-md border border-warm-200 bg-white px-3 text-sm focus:outline-none focus:border-brand-500"
          >
            <option value="">등급을 선택하세요</option>
            {CARE_GRADES.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">장기요양 인정번호 (선택)</label>
          <Input value={gradeNo} onChange={(e) => setGradeNo(e.target.value)} maxLength={30} placeholder="L0000000000" />
        </div>

        {/* 주소: Daum 우편번호 검색 */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">주소</label>
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
            placeholder="상세주소 (동/호수 등)"
            disabled={!baseAddress}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">질환 (선택, 쉼표로 구분)</label>
          <Input value={diseases} onChange={(e) => setDiseases(e.target.value)} placeholder="고혈압, 당뇨, 치매" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5">특이사항 (선택)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="거동 상태, 복약, 주의사항 등"
            className="w-full rounded-md border border-warm-200 bg-white px-3 py-2 text-sm placeholder:text-warm-400 focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>

        <Button variant="brand" size="lg" className="w-full" disabled={!valid || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? "등록 중…" : "어르신 등록"}
        </Button>
      </Card>
    </div>
  );
}
