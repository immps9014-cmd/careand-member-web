"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight, Plus, MapPin, PawPrint } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { memberApi } from "@/lib/api/member";
import { dwellingLabel } from "@/lib/care";

/**
 * 보호자 — 서비스 주소(가사 대상) 관리
 * 등록한 주소 목록 + 등록/수정 진입점
 */
export default function AddressesPage() {
  const query = useQuery({
    queryKey: ["member", "addresses"],
    queryFn: () => memberApi.addresses(),
  });

  return (
    <div className="p-5">
      <h1 className="text-xl font-extrabold text-warm-800 mb-1">주소 관리</h1>
      <p className="text-sm text-warm-500 mb-5">가사 서비스를 받을 주소를 등록하고 관리하세요</p>

      <Link href="/addresses/new">
        <Button variant="brand" size="lg" className="w-full mb-6">
          <Plus className="w-4 h-4" /> 주소 등록
        </Button>
      </Link>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-warm-700">등록 주소</h2>
        <span className="text-xs text-warm-400">{query.data?.length ?? 0}곳</span>
      </div>

      {query.isLoading && <p className="text-center text-warm-400 py-10">불러오는 중…</p>}
      {query.data?.length === 0 && (
        <Card className="p-8 text-center text-warm-400 text-sm">
          등록된 주소가 없습니다.
          <br />주소를 등록하면 가사 서비스 매칭을 이용할 수 있습니다.
        </Card>
      )}

      <div className="space-y-3">
        {query.data?.map((a) => (
          <Link key={a.id} href={`/addresses/${a.id}`}>
            <Card className="p-4 flex items-center justify-between active:bg-warm-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-brand-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-warm-800 truncate">{a.label}</span>
                    <Badge variant="outline">{dwellingLabel(a.dwelling_type)}</Badge>
                    {a.has_pets && (
                      <span className="inline-flex items-center text-warm-400">
                        <PawPrint className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-warm-500 truncate">
                    {a.address}
                    {a.size_m2 && ` · ${a.size_m2}㎡`}
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
