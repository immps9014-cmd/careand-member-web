"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** 토스페이먼츠 결제창 실패·취소 복귀 (S4) — 결제사가 준 사유를 보여 준다. 청구된 금액은 없다. */
function FailInner() {
  const q = useSearchParams();
  const code = q.get("code");
  const message = q.get("message");
  const matchId = q.get("matchId");
  const cancelled = code === "PAY_PROCESS_CANCELED" || code === "USER_CANCEL";
  return (
    <div className="min-h-screen bg-warm-50 p-5">
      <div className="mx-auto mt-16 max-w-sm text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-warm-400" />
        <h1 className="mt-4 text-lg font-bold text-warm-800">{cancelled ? "결제를 취소했어요" : "결제에 실패했어요"}</h1>
        <p className="mt-1.5 text-sm text-warm-500">{message || "결제가 진행되지 않았어요. 청구된 금액은 없습니다."}</p>
        <div className="mt-6 flex flex-col gap-2.5">
          {matchId && (
            <Link href={`/payments/${matchId}`}><Button variant="brand" size="lg" className="w-full rounded-2xl">다시 결제하기</Button></Link>
          )}
          <Link href="/home"><Button variant="outline" size="lg" className="w-full rounded-2xl">홈으로</Button></Link>
        </div>
      </div>
    </div>
  );
}

export default function TossFailPage() {
  return (
    <Suspense fallback={null}>
      <FailInner />
    </Suspense>
  );
}
