"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { memberApi } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";

/**
 * 토스페이먼츠 결제창 성공 복귀 — 서버 승인(confirm)을 요청하고 결과를 보여 준다 (S4).
 * 결제창이 붙여 준 paymentKey·orderId·amount 를 그대로 서버에 넘기고, 금액 검증과 승인은 서버가 한다.
 * 새로고침해도 서버가 이미 처리된 결제로 응답한다(중복 승인 없음).
 */
function SuccessInner() {
  const q = useSearchParams();
  const qc = useQueryClient();
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [msg, setMsg] = useState("");
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const paymentKey = q.get("paymentKey"), orderId = q.get("orderId"), amount = Number(q.get("amount"));
    if (!paymentKey || !orderId || !amount) {
      setState("error");
      setMsg("결제 정보가 없습니다. 결제를 다시 진행해 주세요.");
      return;
    }
    memberApi
      .tossConfirm({ payment_key: paymentKey, order_id: orderId, amount })
      .then(() => {
        setState("done");
        qc.invalidateQueries({ queryKey: ["member", "payments"] });
      })
      .catch((e) => {
        setState("error");
        setMsg(getApiErrorMessage(e));
      });
  }, [q, qc]);

  const matchId = q.get("matchId");
  return (
    <div className="min-h-screen bg-warm-50 p-5">
      <div className="mx-auto mt-16 max-w-sm text-center">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-500" />
            <h1 className="mt-4 text-lg font-bold text-warm-800">결제를 확인하고 있어요</h1>
            <p className="mt-1.5 text-sm text-warm-500">창을 닫지 말고 잠시만 기다려 주세요.</p>
          </>
        )}
        {state === "done" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-500">
              <Check className="h-8 w-8 text-white" strokeWidth={3} />
            </div>
            <h1 className="mt-4 text-xl font-extrabold text-warm-800">결제가 완료되었어요</h1>
            <p className="mt-1.5 text-sm text-warm-500">돌봄 일정은 방문일정에서 확인할 수 있어요.</p>
          </>
        )}
        {state === "error" && (
          <>
            <AlertCircle className="mx-auto h-12 w-12 text-danger" />
            <h1 className="mt-4 text-lg font-bold text-warm-800">결제를 완료하지 못했어요</h1>
            <p className="mt-1.5 text-sm text-warm-500">{msg}</p>
          </>
        )}
        {state !== "loading" && (
          <div className="mt-6 flex flex-col gap-2.5">
            {state === "error" && matchId ? (
              <Link href={`/payments/${matchId}`}><Button variant="brand" size="lg" className="w-full rounded-2xl">다시 결제하기</Button></Link>
            ) : (
              <Link href="/payments"><Button variant="outline" size="lg" className="w-full rounded-2xl">결제 내역 보기</Button></Link>
            )}
            <Link href="/home"><Button variant={state === "done" ? "brand" : "outline"} size="lg" className="w-full rounded-2xl">홈으로</Button></Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TossSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  );
}
