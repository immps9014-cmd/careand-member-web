// PG(결제대행) 카드 토큰화 추상화 레이어.
//
// 실 PG 자격증명이 설정되면(NEXT_PUBLIC_PG_PROVIDER + NEXT_PUBLIC_PG_STORE_ID) 브라우저
// PG SDK를 로드해 카드 결제창을 띄우고 토큰(card_token)을 받는다. 미설정이면 스텁 토큰을
// 반환해 백엔드 stub 승인(EXTERNAL_STUB=true)과 함께 개발/데모에서 결제 흐름이 동작한다.
//
// ⚠️ 실제 카드 청구에는 (1) 백엔드 PG 가맹점 키(PG_MID/PG_API_KEY + EXTERNAL_STUB=false),
//    (2) 프론트 PG_STORE_ID(가맹점 식별코드)가 모두 필요하다.

const PROVIDER = process.env.NEXT_PUBLIC_PG_PROVIDER ?? ""; // "" = 스텁, "portone" 등
const STORE_ID = process.env.NEXT_PUBLIC_PG_STORE_ID ?? "";
const CHANNEL = process.env.NEXT_PUBLIC_PG_CHANNEL ?? "html5_inicis"; // PortOne 채널(예: KG이니시스)
const PORTONE_SDK = "https://cdn.iamport.kr/v1/iamport.js";

/** 실 PG가 설정돼 있는지(가맹점 코드 존재). false면 스텁 결제. */
export function isRealPgConfigured(): boolean {
  return !!(PROVIDER && STORE_ID);
}

export interface TokenizeParams {
  amount: number;
  orderId: string;
  buyerName?: string;
}

export interface TokenizeResult {
  card_token: string;
  provider: string;
}

interface PgResponse {
  success: boolean;
  imp_uid?: string;
  error_msg?: string;
}
interface Iamport {
  init: (storeCode: string) => void;
  request_pay: (params: Record<string, unknown>, callback: (rsp: PgResponse) => void) => void;
}

let portOneLoader: Promise<void> | null = null;
function loadPortOne(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("브라우저 환경이 아닙니다"));
  if ((window as { IMP?: unknown }).IMP) return Promise.resolve();
  if (portOneLoader) return portOneLoader;
  portOneLoader = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = PORTONE_SDK;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      portOneLoader = null;
      reject(new Error("결제 모듈을 불러오지 못했습니다"));
    };
    document.head.appendChild(el);
  });
  return portOneLoader;
}

/**
 * 카드 결제 토큰화. 성공 시 백엔드 approve에 넘길 card_token 반환.
 * 실 PG 미설정 시 스텁 토큰("tok_stub_card") — 백엔드 stub 승인과 연동.
 * 사용자가 결제창을 취소하면 reject.
 */
export async function tokenizeCard(params: TokenizeParams): Promise<TokenizeResult> {
  if (!isRealPgConfigured()) {
    return { card_token: "tok_stub_card", provider: "stub" };
  }

  if (PROVIDER === "portone") {
    await loadPortOne();
    const IMP = (window as unknown as { IMP: Iamport }).IMP;
    IMP.init(STORE_ID);
    const token = await new Promise<string>((resolve, reject) => {
      IMP.request_pay(
        {
          pg: CHANNEL,
          pay_method: "card",
          merchant_uid: params.orderId,
          name: "케어앤드 돌봄 결제",
          amount: params.amount,
          buyer_name: params.buyerName,
        },
        (rsp: { success: boolean; imp_uid?: string; error_msg?: string }) => {
          if (rsp.success && rsp.imp_uid) resolve(rsp.imp_uid);
          else reject(new Error(rsp.error_msg || "결제가 취소되었습니다."));
        },
      );
    });
    return { card_token: token, provider: "portone" };
  }

  throw new Error(`지원하지 않는 PG 제공자입니다: ${PROVIDER}`);
}
