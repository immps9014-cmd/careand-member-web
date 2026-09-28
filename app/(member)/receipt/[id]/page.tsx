"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ChevronLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { memberApi } from "@/lib/api/member";
import { getApiErrorMessage } from "@/lib/api/client";

/**
 * 결제 영수증 (기능 8, 2026-09-28 S5) — 「인쇄 / PDF 저장」으로 브라우저가 PDF 로 저장한다(서버 PDF 라이브러리 없음).
 * 인쇄할 때는 #receipt 영역만 나온다.
 */
const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

export default function ReceiptPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const id = Number(params.id);
  const q = useQuery({ queryKey: ["member", "receipt", id], queryFn: () => memberApi.receipt(id), enabled: id > 0, retry: false });
  const r = q.data;

  return (
    <div className="px-4 pt-4 pb-8 lg:mx-auto lg:max-w-2xl">
      <style>{`@media print { body * { visibility: hidden !important; } #receipt, #receipt * { visibility: visible !important; }
        #receipt { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: 0; } }`}</style>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => router.back()} className="flex items-center gap-1 text-sm text-warm-600">
          <ChevronLeft className="h-4 w-4" /> 뒤로
        </button>
        {r && (
          <Button variant="brand" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> 인쇄 / PDF 저장
          </Button>
        )}
      </div>

      {q.isLoading && <p className="py-10 text-center text-warm-500">불러오는 중…</p>}
      {q.isError && <p className="py-10 text-center text-sm text-warm-500">{getApiErrorMessage(q.error)}</p>}

      {r && (
        <section id="receipt" className="rounded-2xl border border-warm-200 bg-white p-5 text-warm-800">
          <h1 className="text-center text-xl font-extrabold tracking-tight">영 수 증</h1>
          <p className="mt-1 text-center text-xs text-warm-500">No. {r.receipt_no}{r.status === "cancelled" ? " · 취소된 결제" : ""}</p>

          <dl className="mt-5 grid grid-cols-[88px_1fr] gap-y-1.5 text-sm">
            <dt className="text-warm-500">결제 일시</dt><dd>{r.paid_at ?? "-"}</dd>
            <dt className="text-warm-500">결제 수단</dt><dd>{r.method}{r.pg_tid_tail ? ` (승인 …${r.pg_tid_tail})` : ""}</dd>
            <dt className="text-warm-500">구매자</dt><dd>{r.buyer}</dd>
            <dt className="text-warm-500">서비스</dt><dd>{r.service}</dd>
            <dt className="text-warm-500">이용 기간</dt><dd>{r.service_period ?? "-"}</dd>
            <dt className="text-warm-500">대상자</dt><dd>{r.recipient}님</dd>
            {r.caregiver && (<><dt className="text-warm-500">돌봄전문가</dt><dd>{r.caregiver}</dd></>)}
          </dl>

          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="border-y border-warm-200 text-left text-xs text-warm-500">
                <th className="py-2 font-semibold">항목</th><th className="py-2 text-right font-semibold">금액</th>
              </tr>
            </thead>
            <tbody>
              {r.items.map((it, i) => (
                <tr key={i} className="border-b border-warm-100"><td className="py-2">{it.description}</td><td className="py-2 text-right tabular-nums">{won(it.amount)}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-warm-500">서비스 금액</span><span className="tabular-nums">{won(r.total_amount)}</span></div>
            {r.ltc_pay > 0 && <div className="flex justify-between"><span className="text-warm-500">장기요양 청구분</span><span className="tabular-nums">-{won(r.ltc_pay)}</span></div>}
            <div className="flex justify-between border-t border-warm-200 pt-2 text-base font-extrabold"><span>결제 금액</span><span className="tabular-nums">{won(r.self_pay)}</span></div>
          </div>

          <div className="mt-6 border-t border-dashed border-warm-300 pt-3 text-xs leading-relaxed text-warm-500">
            <p className="font-semibold text-warm-700">{r.seller.name} (대표 {r.seller.ceo})</p>
            <p>사업자등록번호 {r.seller.biz_no}{r.seller.tel ? ` · ${r.seller.tel}` : ""}</p>
            <p>{r.seller.address}</p>
            <p className="mt-2">이 영수증은 결제 사실 확인용이며 세금계산서가 아닙니다.</p>
          </div>
        </section>
      )}
    </div>
  );
}
