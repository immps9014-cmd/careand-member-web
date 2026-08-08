"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Search, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BirthDateSelect } from "@/components/ui/birth-date-select";
import { memberApi } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { CARE_GRADES } from "@/lib/care";
import { openPostcode } from "@/lib/postcode";

export default function NewSeniorPage() {
  const router = useRouter();
  const qc = useQueryClient();

  // 매칭요청 흐름(/request/new)에서 진입한 경우: 등록 후 그 화면으로 방금 등록한 대상과 함께 복귀.
  // returnTo가 있으면 "재가입"이 아니라 매칭용 대상 등록임을 문구로 명확히 한다.
  const [returnTo, setReturnTo] = useState<string | null>(null);
  useEffect(() => {
    const rt = new URLSearchParams(window.location.search).get("returnTo");
    if (rt && /^\/(?![/\\])/.test(rt)) setReturnTo(rt);
  }, []);
  const fromMatching = !!returnTo;

  const [name, setName] = useState("");
  const [birth, setBirth] = useState(""); // 생년월일 "YYYY-MM-DD" (BirthDateSelect)
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
    onSuccess: (res: any) => {
      toast.success("돌봄대상을 등록했습니다.");
      qc.invalidateQueries({ queryKey: ["member", "seniors"] });
      // 매칭요청에서 왔으면 방금 등록한 대상(senior_id)을 붙여 그 화면으로 복귀 → 이어서 매칭 진행.
      if (returnTo) {
        const newId = res?.data?.data?.id ?? res?.data?.id;
        const sep = returnTo.includes("?") ? "&" : "?";
        router.push(newId ? `${returnTo}${sep}senior_id=${newId}` : returnTo);
        return;
      }
      router.push("/seniors");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const valid = name.trim() && birth && grade !== "" && baseAddress;

  return (
    <div className="p-5 lg:mx-auto lg:max-w-2xl">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-500 mb-4">
        <ChevronLeft className="w-4 h-4" /> 뒤로
      </button>
      <h1 className="text-xl font-extrabold text-warm-800 mb-1">
        {fromMatching ? "돌봄받으실 어르신 등록" : "돌봄대상 등록"}
      </h1>
      <p className="text-sm text-warm-500 mb-5">
        {fromMatching
          ? "매칭을 위해 돌봄받으실 어르신 정보를 입력해주세요. 등록하면 바로 매칭요청으로 돌아갑니다."
          : "돌봄대상의 정보를 입력하세요"}
      </p>

      <Card className="p-5 space-y-4">
        <div>
          <label htmlFor="senior-name" className="block text-xs font-semibold text-warm-600 mb-1.5">성함</label>
          <Input id="senior-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="홍길동" />
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
          <label htmlFor="senior-grade" className="block text-xs font-semibold text-warm-600 mb-1.5">장기요양 등급</label>
          <select
            id="senior-grade"
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
          <label htmlFor="senior-grade-no" className="block text-xs font-semibold text-warm-600 mb-1.5">장기요양 인정번호 (선택)</label>
          <Input id="senior-grade-no" value={gradeNo} onChange={(e) => setGradeNo(e.target.value)} maxLength={30} placeholder="L0000000000" />
        </div>

        {/* 주소: Daum 우편번호 검색 */}
        <div>
          <label htmlFor="senior-address-detail" className="block text-xs font-semibold text-warm-600 mb-1.5">주소</label>
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
            id="senior-address-detail"
            value={detailAddress}
            onChange={(e) => setDetailAddress(e.target.value)}
            maxLength={100}
            placeholder="상세주소 (동/호수 등)"
            disabled={!baseAddress}
          />
        </div>

        <div>
          <label htmlFor="senior-diseases" className="block text-xs font-semibold text-warm-600 mb-1.5">질환 (선택, 쉼표로 구분)</label>
          <Input id="senior-diseases" value={diseases} onChange={(e) => setDiseases(e.target.value)} placeholder="고혈압, 당뇨, 치매" />
        </div>

        <div>
          <label htmlFor="senior-notes" className="block text-xs font-semibold text-warm-600 mb-1.5">특이사항 (선택)</label>
          <textarea
            id="senior-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="거동 상태, 복약, 주의사항 등"
            className="w-full rounded-md border border-warm-200 bg-white px-3 py-2 text-sm placeholder:text-warm-500 focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>

        <Button variant="brand" size="lg" className="w-full" disabled={!valid || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? "등록 중…" : fromMatching ? "등록하고 매칭 계속하기" : "돌봄대상 등록"}
        </Button>
      </Card>
    </div>
  );
}
