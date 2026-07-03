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
import { BirthDateSelect } from "@/components/ui/birth-date-select";
import { memberApi, type CreateChildPayload } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";

const SECTION_LABEL = "block text-[12.5px] font-bold text-warm-600 mb-2";

export default function NewChildPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState(""); // "YYYY-MM-DD" (BirthDateSelect)
  const [gender, setGender] = useState<"M" | "F">("F");
  const [homeAddress, setHomeAddress] = useState("");
  const [notes, setNotes] = useState("");
  const currentYear = new Date().getFullYear();

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
            <BirthDateSelect value={birthDate} onChange={setBirthDate} minYear={currentYear - 18} />
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
