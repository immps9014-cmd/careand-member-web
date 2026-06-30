"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight, Plus, HeartPulse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { memberApi } from "@/lib/api/member";
import { careGradeLabel } from "@/lib/care";

/**
 * 보호자 — 돌봄대상 관리
 * 등록한 돌봄대상 목록 + 건강 모니터링 진입점
 */
export default function SeniorsPage() {
  const query = useQuery({
    queryKey: ["member", "seniors"],
    queryFn: () => memberApi.seniors(),
  });

  return (
    <div className="p-5 lg:mx-auto lg:max-w-4xl">
      <div className="lg:flex lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-warm-800 mb-1">돌봄대상 관리</h1>
          <p className="text-sm text-warm-500 mb-5 lg:mb-0">돌봄대상의 건강을 모니터링하세요</p>
        </div>
        <Link href="/seniors/new" className="block lg:inline-block lg:shrink-0">
          <Button variant="brand" size="lg" className="w-full mb-6 lg:mb-0 lg:w-auto lg:px-6">
            <Plus className="w-4 h-4" /> 돌봄대상 등록
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-3 lg:mt-7">
        <h2 className="font-bold text-warm-700">등록 돌봄대상</h2>
        <span className="text-xs text-warm-400">{query.data?.length ?? 0}명</span>
      </div>

      {query.isLoading && <p className="text-center text-warm-400 py-10">불러오는 중…</p>}
      {query.data?.length === 0 && (
        <Card className="p-8 text-center text-warm-400 text-sm">
          등록된 돌봄대상이 없습니다.
          <br />돌봄대상을 등록하면 돌봄 매칭과 건강 모니터링을 이용할 수 있습니다.
        </Card>
      )}

      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
        {query.data?.map((s) => (
          <Link key={s.id} href={`/seniors/${s.id}`} className="block lg:h-full">
            <Card className="p-4 flex items-center justify-between active:bg-warm-50 transition-colors lg:h-full lg:hover:border-warm-300">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <HeartPulse className="w-5 h-5 text-brand-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-warm-800 truncate">{s.name}</span>
                    <Badge variant="outline">{careGradeLabel(s.care_grade)}</Badge>
                  </div>
                  <div className="text-xs text-warm-500 truncate">
                    {s.age ? `${s.age}세` : "나이 미상"} · {s.gender === "F" ? "여" : "남"}
                    {s.diseases && s.diseases.length > 0 && ` · ${s.diseases.slice(0, 2).join(", ")}`}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-warm-300 flex-shrink-0" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
