"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight, Plus, Stethoscope } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { memberApi } from "@/lib/api/member";
import { ageFromBirthDate, mobilityLabel } from "@/lib/care";

/**
 * 보호자 — 환자(간병 대상) 관리
 * 등록한 환자 목록 + 등록/수정 진입점
 */
export default function PatientsPage() {
  const query = useQuery({
    queryKey: ["member", "patients"],
    queryFn: () => memberApi.patients(),
  });

  return (
    <div className="p-5 lg:mx-auto lg:max-w-4xl">
      <div className="lg:flex lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-warm-800 mb-1">환자 관리</h1>
          <p className="text-sm text-warm-500 mb-5 lg:mb-0">병원 간병이 필요한 환자를 등록하고 관리하세요</p>
        </div>
        <Link href="/patients/new" className="block lg:inline-block lg:shrink-0">
          <Button variant="brand" size="lg" className="w-full mb-6 lg:mb-0 lg:w-auto lg:px-6">
            <Plus className="w-4 h-4" /> 환자 등록
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-3 lg:mt-7">
        <h2 className="font-bold text-warm-700">등록 환자</h2>
        <span className="text-xs text-warm-400">{query.data?.length ?? 0}명</span>
      </div>

      {query.isLoading && <p className="text-center text-warm-400 py-10">불러오는 중…</p>}
      {query.data?.length === 0 && (
        <Card className="p-8 text-center text-warm-400 text-sm">
          등록된 환자가 없습니다.
          <br />환자를 등록하면 병원 간병 매칭을 이용할 수 있습니다.
        </Card>
      )}

      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
        {query.data?.map((p) => {
          const age = ageFromBirthDate(p.birth_date);
          return (
            <Link key={p.id} href={`/patients/${p.id}`} className="block lg:h-full">
              <Card className="p-4 flex items-center justify-between active:bg-warm-50 transition-colors lg:h-full lg:hover:border-warm-300">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-5 h-5 text-brand-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-warm-800 truncate">{p.name}</span>
                      <Badge variant="outline">{mobilityLabel(p.mobility)}</Badge>
                    </div>
                    <div className="text-xs text-warm-500 truncate">
                      {age !== null ? `${age}세` : "나이 미상"} · {p.gender === "F" ? "여" : "남"}
                      {p.hospital_name && ` · ${p.hospital_name}`}
                      {p.ward_room && ` ${p.ward_room}`}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-warm-300 flex-shrink-0" />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
