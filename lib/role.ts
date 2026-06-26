// SSOT: 회원앱(/app) 역할(role) 정의
// 한 앱에서 보호자/돌봄전문가/기관을 일관되게 분기하기 위한 단일 출처.
// 화면 분기는 전부 이 테이블을 조회한다 (산재해 있던 role === "caregiver" 이분법 제거).
//
// Phase 1: 역할 SSOT 골격 (라벨/셸/진입가능 통합, 시각 무변경)
// Phase 2: accent 토큰으로 인라인 색 통일
// Phase 3: organization 을 memberApp:true 로 전환하며 회원앱 정식 편입
//
// 돌봄전문가의 세부 직군(요양보호/간병/가사) 라벨은 [[caregiverType.ts]] 가 담당한다.

export type Role = "guardian" | "caregiver" | "organization" | "admin";

/** 레이아웃 셸 종류. Phase 2에서 단일 셸 + accent 로 통합 예정. */
export type ShellKind = "guardian" | "caregiver";

export interface RoleConfig {
  /** 한글 역할명 (배지/헤더 표기) */
  label: string;
  /** 회원앱(/app) 진입 허용 여부 */
  memberApp: boolean;
  /** 렌더링할 레이아웃 셸 */
  shell: ShellKind;
  /** 강조색 Tailwind 토큰 prefix (Phase 2 디자인 통일용) */
  accent: string;
}

export const ROLE_CONFIG: Record<Role, RoleConfig> = {
  guardian: { label: "보호자", memberApp: true, shell: "guardian", accent: "brand" },
  caregiver: { label: "돌봄전문가", memberApp: true, shell: "caregiver", accent: "brand" },
  // 기관(에이전시): 간병인을 구하는 매칭요청 발주. 요청자 프로필은 guardian 재사용 → guardian 셸.
  organization: { label: "기관", memberApp: true, shell: "guardian", accent: "brand" },
  // 관리자: 회원앱 비대상 (로그인 시 admin 콘솔로 리다이렉트)
  admin: { label: "관리자", memberApp: false, shell: "guardian", accent: "brand" },
};

const FALLBACK: RoleConfig = ROLE_CONFIG.guardian;

function lookup(role: string | null | undefined): RoleConfig | undefined {
  return role ? (ROLE_CONFIG as Record<string, RoleConfig>)[role] : undefined;
}

/** 역할 설정 조회 (알 수 없는 역할은 보호자 기본값으로 폴백) */
export function roleConfig(role: string | null | undefined): RoleConfig {
  return lookup(role) ?? FALLBACK;
}

/** 역할 한글 라벨 */
export function roleLabel(role: string | null | undefined): string {
  return roleConfig(role).label;
}

/** 돌봄전문가 셸을 쓰는 역할인지 (기존 `role === "caregiver"` 분기 대체) */
export function usesCaregiverShell(role: string | null | undefined): boolean {
  return roleConfig(role).shell === "caregiver";
}

/** 회원앱(/app) 진입 허용 역할인지 (기존 login 화이트리스트 대체) */
export function canUseMemberApp(role: string | null | undefined): boolean {
  return lookup(role)?.memberApp === true;
}
