// SSOT: 돌봄전문가 직군(service domain) ↔ 한글 라벨
// senior=요양보호, nursing=간병, housekeeping=가사, postpartum=산후
// (레거시 별칭: care=간병, companion=동행)
// service_domains(복수, 돌봄전문가 본인의 직군)와 service_domain(단수, 요청/세션 유형)
// 모두 동일 분류를 쓰므로 이 한 곳에서 라벨을 관리한다.

export const DOMAIN_LABEL: Record<string, string> = {
  senior: "요양보호",
  nursing: "간병",
  housekeeping: "가사",
  living_support: "생활지원",
  postpartum: "산후",
  childcare: "아이돌봄",
  mental_care: "마음돌봄",
  companion: "동행",
  care: "간병",
};

/** 단일 도메인 코드 → 한글 라벨 (빈 값은 "-") */
export function domainLabel(code: string | null | undefined): string {
  if (!code) return "-";
  return DOMAIN_LABEL[code] ?? code;
}

/** "senior,housekeeping" → ["요양보호","가사"] */
export function caregiverDomainLabels(serviceDomains: string | null | undefined): string[] {
  return (serviceDomains || "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => DOMAIN_LABEL[d] ?? d);
}

/** "senior,housekeeping" → "돌봄전문가(요양보호·가사)" / 빈 값 → "돌봄전문가" */
export function caregiverRoleLabel(serviceDomains: string | null | undefined): string {
  const labels = caregiverDomainLabels(serviceDomains);
  return labels.length ? `돌봄전문가(${labels.join("·")})` : "돌봄전문가";
}

/** 돌봄전문가 본인의 주 직군 코드(현재 전원 단일 직군; 복수면 첫 직군 대표) */
export function caregiverPrimaryDomain(serviceDomains: string | null | undefined): string {
  const first = (serviceDomains || "").split(",").map((d) => d.trim()).filter(Boolean)[0];
  return first || "senior";
}

/**
 * 직군별 앱 UI 어휘.
 * 요양보호·간병은 '사람 돌봄'이라 공통 "케어", 가사(housekeeping)는 집안 서비스라 "가사"로 분기.
 * (요양↔간병은 분리하지 않음 — 사용자 피드백: 직군마다 따로 뜨면 어색)
 */
export interface CaregiverUiVocab {
  homeTitle: string;   // 홈 헤더
  actionNoun: string;  // 케어/가사 — "○○ 요청", "내 ○○ 일정", "완료 ○○", "○○ 진행 중"
  searchPlaceholder: string; // 상단바 검색 pill
}
export function caregiverUi(serviceDomains: string | null | undefined): CaregiverUiVocab {
  if (caregiverPrimaryDomain(serviceDomains) === "living_support") {
    return { homeTitle: "오늘의 생활지원", actionNoun: "생활지원", searchPlaceholder: "어떤 생활지원 요청을 찾으세요?" };
  }
  return { homeTitle: "오늘의 케어", actionNoun: "케어", searchPlaceholder: "어떤 케어 요청을 찾으세요?" };
}
