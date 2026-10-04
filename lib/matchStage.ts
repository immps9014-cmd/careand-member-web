// 매칭요청 진행 파이프라인 단계 정의 — 보호자/돌봄전문가 앱 공용 SSOT.
// 매칭요청 → 매칭완료 → 결제완료 → 케어시작 → 케어완료
export const MATCH_STAGES = ["매칭요청", "매칭완료", "결제완료", "케어시작", "케어완료"] as const;
export type MatchStageLabel = (typeof MATCH_STAGES)[number];

export interface MatchStageInput {
  requestStatus?: string | null; // open|matching|matched|cancelled|expired
  paymentStatus?: string | null; // null|pending|paid|...
  matchStatus?: string | null;   // confirmed|in_progress|completed|cancelled|no_show
}

/**
 * 현재 도달한 단계 인덱스(0~4)를 반환.
 * 상위 신호(케어완료)부터 역순으로 판정해 가장 진행된 단계를 고른다.
 */
export function matchStageIndex({ requestStatus, paymentStatus, matchStatus }: MatchStageInput): number {
  // 결제 전엔 「매칭완료」에서 멈춘다 — 결제 없이 진행된 옛 데이터가 결제완료로 체크되던 문제(10-04, 이제 결제 전 출근 불가)
  if (requestStatus === "matched" && paymentStatus !== "paid") return 1;
  if (matchStatus === "completed") return 4; // 케어완료
  if (matchStatus === "in_progress") return 3; // 케어시작
  if (paymentStatus === "paid") return 2; // 결제완료
  if (requestStatus === "matched") return 1; // 매칭완료
  return 0; // 매칭요청(접수)
}

/** 취소/만료 등 종료(부정) 상태 — 파이프라인 대신 종료 배지로 표시. */
export function terminatedLabel(requestStatus?: string | null, matchStatus?: string | null): string | null {
  if (matchStatus === "cancelled" || requestStatus === "cancelled") return "취소됨";
  if (matchStatus === "no_show") return "노쇼";
  if (requestStatus === "expired") return "만료됨";
  return null;
}
