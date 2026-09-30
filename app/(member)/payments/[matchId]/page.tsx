"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, ShieldCheck, Check, CreditCard, Landmark, Ticket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { memberApi, type PaymentMethod } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";
import { openTossPayment } from "@/lib/toss";

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const SECTION_LABEL = "block text-[13.5px] font-bold text-warm-600 mb-2";

const METHODS: { key: PaymentMethod; label: string; desc: string; icon: typeof CreditCard }[] = [
  { key: "card", label: "카드 결제", desc: "신용·체크카드", icon: CreditCard },
  { key: "account", label: "계좌이체", desc: "실시간 계좌이체", icon: Landmark },
  { key: "voucher_only", label: "바우처", desc: "장기요양 바우처", icon: Ticket },
];

export default function PaymentCheckoutPage({ params }: { params: { matchId: string } }) {
  const matchId = Number(params.matchId);
  const router = useRouter();
  const qc = useQueryClient();
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [agree, setAgree] = useState(false);
  const [done, setDone] = useState(false);

  const calc = useQuery({
    queryKey: ["member", "payment-calc", matchId],
    queryFn: () => memberApi.paymentCalculate(matchId),
    enabled: Number.isFinite(matchId) && matchId > 0,
    retry: false,
  });

  const voucherUsable = (calc.data?.voucher_remaining ?? 0) > 0;

  const approve = useMutation({
    mutationFn: async () => {
      // 카드·계좌이체 = 토스페이먼츠 결제창(S4). 서버가 금액·주문번호를 정하고, 성공하면 결제창이
      // /app/payments/toss/success 로 돌려보내 거기서 서버 승인한다(이 경우 이 함수는 돌아오지 않음).
      if (method !== "voucher_only") {
        const prep = await memberApi.tossPrepare(matchId, method);
        if (prep.toss_required) {
          await openTossPayment(prep, method, matchId);
          return "redirect" as const;
        }
      }
      // 바우처 전액(본인부담 0원) — 결제창 없이 서버 승인
      await memberApi.paymentApprove({ match_id: matchId, method: "voucher_only" });
      return "done" as const;
    },
    onSuccess: (r) => {
      if (r === "redirect") return;
      setDone(true);
      qc.invalidateQueries({ queryKey: ["member", "payments"] });
      toast.success("결제가 완료되었습니다.");
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (done) {
    return (
      <div className="min-h-screen bg-warm-50 p-5">
        <div className="mx-auto mt-16 max-w-sm text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-500">
            <Check className="h-8 w-8 text-white" strokeWidth={3} />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-warm-800">결제가 완료되었어요</h1>
          <p className="mt-1.5 text-sm text-warm-500">돌봄 일정은 방문일정에서 확인할 수 있어요.</p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link href="/payments">
              <Button variant="outline" size="lg" className="w-full rounded-2xl">결제 내역 보기</Button>
            </Link>
            <Link href="/home">
              <Button variant="brand" size="lg" className="w-full rounded-2xl">홈으로</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50 pb-28">
      <div className="p-5">
        <button onClick={() => router.back()} className="mb-3 flex items-center gap-1 text-sm text-warm-500">
          <ChevronLeft className="h-4 w-4" /> 뒤로
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight text-warm-800">결제</h1>
        <p className="mt-1.5 text-sm text-warm-500">확정된 돌봄 매칭 금액을 결제합니다.</p>

        {calc.isLoading ? (
          <p className="mt-6 text-sm text-warm-500">결제 금액을 불러오는 중…</p>
        ) : calc.isError || !calc.data ? (
          <Card className="mt-5 p-5">
            <p className="text-sm text-warm-500">
              결제 금액을 불러오지 못했습니다. 매칭이 확정되었는지 확인해 주세요.
            </p>
          </Card>
        ) : (
          <>
            {/* 결제 금액 내역 */}
            <Card className="mt-5 p-5">
              <label className={SECTION_LABEL}>결제 금액</label>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-warm-500">총 서비스 금액</span>
                <span className="text-[16px] font-bold text-warm-700 tabular-nums">{won(calc.data.total_amount)}</span>
              </div>
              {calc.data.ltc_pay > 0 && (
                <div className="mt-1.5 flex items-baseline justify-between">
                  <span className="text-sm text-warm-500">
                    장기요양공단 부담
                    {calc.data.copay_rate != null && (
                      <span className="text-warm-500"> · 본인부담 {Math.round(calc.data.copay_rate * 100)}%</span>
                    )}
                  </span>
                  <span className="text-[15px] font-semibold text-warm-500 tabular-nums">- {won(calc.data.ltc_pay)}</span>
                </div>
              )}
              <div className="mt-3 flex items-baseline justify-between border-t border-warm-100 pt-3">
                <span className="text-[14px] font-bold text-warm-700">본인부담 결제금액</span>
                <span className="text-[22px] font-extrabold text-brand-700 tabular-nums">{won(calc.data.self_pay)}</span>
              </div>
              {calc.data.voucher_remaining != null && (
                <p className="mt-2 text-[12.5px] text-warm-500 tabular-nums">
                  장기요양 바우처 잔액 {won(calc.data.voucher_remaining)}
                  {calc.data.voucher_after_payment != null && ` → 결제 후 ${won(calc.data.voucher_after_payment)}`}
                </p>
              )}
            </Card>

            {/* 결제 수단 */}
            <Card className="mt-3.5 p-5">
              <label className={SECTION_LABEL}>결제 수단</label>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => {
                  const disabled = m.key === "voucher_only" && !voucherUsable;
                  const on = method === m.key;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      disabled={disabled}
                      onClick={() => setMethod(m.key)}
                      className={
                        "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-colors disabled:opacity-40 " +
                        (on ? "border-brand-500 bg-brand-50" : "border-warm-200 bg-white")
                      }
                    >
                      <Icon className={"h-5 w-5 " + (on ? "text-brand-600" : "text-warm-500")} />
                      <span className={"text-[13.5px] font-bold " + (on ? "text-brand-700" : "text-warm-700")}>{m.label}</span>
                      <span className="text-[12px] text-warm-500">{m.desc}</span>
                    </button>
                  );
                })}
              </div>
              {method === "card" && (
                <p className="mt-2.5 text-[12px] leading-relaxed text-warm-500">
                  ‘결제하기’를 누르면 토스페이먼츠 결제창이 열립니다. 지금은 테스트 결제라 실제로 청구되지 않아요.
                </p>
              )}
            </Card>

            {/* 컴플라이언스 + 동의 */}
            <div className="mt-3.5 flex items-start gap-1.5 rounded-xl border border-warm-200 bg-warm-50 p-3.5 text-[12.5px] leading-relaxed text-warm-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <span>결제·정산은 케어앤드 플랫폼을 통해 안전하게 처리돼요. 돌봄전문가와의 직접 거래는 보호되지 않습니다.</span>
            </div>
            <label className="mt-2.5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-warm-200 bg-white p-3.5">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-brand-500"
              />
              <span className="text-[13.5px] leading-relaxed text-warm-700">
                <b className="text-warm-800">(필수)</b> 결제 금액과 결제 진행에 동의합니다.
              </span>
            </label>

            <Button
              variant="brand"
              size="lg"
              className="mt-5 w-full rounded-2xl shadow-md"
              disabled={!agree || approve.isPending}
              onClick={() => approve.mutate()}
            >
              {approve.isPending ? "결제 중…" : `${won(calc.data.self_pay)} 결제하기`}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
