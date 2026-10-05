"use client";

// 내 서류 — 서명할(한) 바우처 서류 전체. 돌봄전문가는 근로·프리랜서 계약서가 여기로 온다(CAREN-MNH-01 3단계).
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { mnhDocApi } from "@/lib/api/mnh";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export default function MyMnhDocsPage() {
  const q = useQuery({ queryKey: ["member", "mnh", "my-docs"], queryFn: mnhDocApi.mine });
  const rows = q.data ?? [];
  return (
    <div className="px-4 pt-4 pb-6 lg:mx-auto lg:max-w-3xl">
      <h1 className="text-xl font-extrabold tracking-tight text-warm-800">전자서명 서류</h1>
      <p className="mt-1.5 text-sm text-warm-500">서명이 필요한 서류와 서명한 서류예요. 서명한 서류는 PDF로 받을 수 있어요.</p>
      {q.isError && <Card className="mt-4 p-6 text-sm">{getApiErrorMessage(q.error)}</Card>}
      {q.isSuccess && rows.length === 0 && <Card className="mt-4 p-6 text-center text-sm text-warm-500">서류가 없어요.</Card>}
      <ul className="mt-4 space-y-2">
        {rows.map((d) => (
          <li key={d.id}>
            <Link href={`/mnh/docs/${d.id}`}>
              <Card className="flex items-center gap-3 p-4 hover:bg-warm-50">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-warm-800">{d.title}</p>
                  <p className="text-[13px] text-warm-500">{d.status === "signed" ? `서명 ${d.signed_at?.slice(0, 10)}` : `발행 ${d.issued_at.slice(0, 10)}`}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", d.status === "signed" ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-800")}>
                  {d.status === "signed" ? "서명 완료" : "서명 필요"}
                </span>
                <ChevronRight className="h-5 w-5 text-warm-400" />
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
