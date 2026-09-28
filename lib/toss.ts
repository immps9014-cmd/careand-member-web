/**
 * 토스페이먼츠 결제창(v2 표준 SDK) — 사업계획서 기능 4·31 (2026-09-28, 구현계획 S4).
 * 흐름: 서버 준비(/v1/payments/toss/prepare) → 결제창 → successUrl(/app/payments/toss/success)에서 서버 승인.
 * 금액·주문번호는 서버가 정한 값만 쓴다(화면에서 계산하지 않음). 테스트 키면 실제 청구가 없다.
 */
const SDK_URL = "https://js.tosspayments.com/v2/standard";

type TossPaymentWindow = {
  requestPayment: (args: Record<string, unknown>) => Promise<void>;
};
type TossFactory = (clientKey: string) => { payment: (opts: { customerKey: string }) => TossPaymentWindow };

declare global {
  interface Window {
    TossPayments?: TossFactory;
  }
}

let loading: Promise<TossFactory> | null = null;

function loadSdk(): Promise<TossFactory> {
  if (typeof window !== "undefined" && window.TossPayments) return Promise.resolve(window.TossPayments);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => (window.TossPayments ? resolve(window.TossPayments) : reject(new Error("결제 모듈을 불러오지 못했습니다.")));
    s.onerror = () => {
      loading = null;
      reject(new Error("결제 모듈을 불러오지 못했습니다. 네트워크를 확인해 주세요."));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export interface TossPrepared {
  toss_required: boolean;
  client_key?: string;
  test_mode?: boolean;
  order_id?: string;
  order_name?: string;
  amount?: number;
  customer_key?: string;
  customer_name?: string;
}

/** 결제창을 연다 — 성공하면 브라우저가 successUrl 로 이동한다(이 함수는 돌아오지 않음). */
export async function openTossPayment(prep: TossPrepared, method: "card" | "account", matchId: number): Promise<void> {
  if (!prep.client_key || !prep.order_id || !prep.amount) throw new Error("결제 준비 정보가 올바르지 않습니다.");
  const Toss = await loadSdk();
  const payment = Toss(prep.client_key).payment({ customerKey: prep.customer_key ?? "ANONYMOUS" });
  const base = `${window.location.origin}/app/payments/toss`;
  await payment.requestPayment({
    method: method === "account" ? "TRANSFER" : "CARD",
    amount: { currency: "KRW", value: prep.amount },
    orderId: prep.order_id,
    orderName: prep.order_name ?? "케어앤 돌봄 서비스",
    customerName: prep.customer_name,
    successUrl: `${base}/success?matchId=${matchId}`,
    failUrl: `${base}/fail?matchId=${matchId}`,
  });
}
