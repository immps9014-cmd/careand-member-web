// 보호자 케어일지(AI) UI 공유 헬퍼 — Phase 2 (2.3 목록 / 2.4 상세)
import type { GuardianSession, AiSummary } from "@/lib/api/member";
import { DOMAIN_LABEL } from "@/lib/caregiverType";

/** mock 미리보기 토글: NEXT_PUBLIC_ENABLE_LOG_MOCK=1 일 때만 mock 사용(라이브 기본 off). */
export const LOG_MOCK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LOG_MOCK === "1";

export function domainLabel(domain: string): string {
  return DOMAIN_LABEL[domain] ?? "돌봄";
}

export type LogBadgeVariant = "success" | "warn" | "info" | "outline";

/**
 * 세션의 일지 상태 → 표시 배지 + 상세 열람 가능 여부.
 * INV-6: 보호자는 review_status='approved' 일지만 열람 가능('도착'만 viewable).
 */
export function logStatus(s: Pick<GuardianSession, "status" | "review_status" | "has_summary">): {
  label: string;
  variant: LogBadgeVariant;
  viewable: boolean;
} {
  if (s.has_summary && s.review_status === "approved") {
    return { label: "일지 도착", variant: "success", viewable: true };
  }
  if (s.has_summary && s.review_status === "pending") {
    return { label: "검수 중", variant: "warn", viewable: false };
  }
  if (s.has_summary && s.review_status === "rejected") {
    return { label: "재작성 중", variant: "info", viewable: false };
  }
  // 일지 미생성
  if (s.status === "completed") return { label: "일지 작성 중", variant: "info", viewable: false };
  if (s.status === "in_progress") return { label: "돌봄 진행 중", variant: "info", viewable: false };
  if (s.status === "cancelled") return { label: "취소됨", variant: "outline", viewable: false };
  return { label: "예정", variant: "outline", viewable: false };
}

const CATEGORY_LABEL: Record<string, string> = {
  meal: "식사",
  medication: "복약",
  exercise: "활동",
  bath: "목욕",
  vital: "활력징후",
  mood: "정서",
  cognition: "인지",
  other: "기타",
};

/** categorized 항목 한 칸을 사람이 읽을 수 있는 라벨+값 텍스트로 변환. 값 형태가 객체/문자열 혼합이라 방어적으로 처리. */
export function categorizedItems(categorized: AiSummary["categorized"]): { key: string; label: string; text: string }[] {
  if (!categorized) return [];
  return Object.entries(categorized).map(([key, raw]) => ({
    key,
    label: CATEGORY_LABEL[key] ?? key,
    text: renderCategoryValue(key, raw),
  }));
}

function renderCategoryValue(key: string, raw: unknown): string {
  if (raw == null) return "-";
  if (typeof raw === "string") {
    if (key === "mood") return raw === "positive" ? "안정적" : raw === "negative" ? "주의 필요" : raw;
    return raw;
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (typeof o.percentage === "number") return `${o.percentage}%`;
    if (typeof o.minutes === "number") return `${o.minutes}분${o.type ? ` · ${o.type}` : ""}`;
    if (o.noted === true) return "기록됨";
    if (typeof o.type === "string") return o.type;
  }
  return "기록됨";
}

/* ===== mock 미리보기 데이터 (BE 미배포 시 화면 확인용) ===== */
export const MOCK_SESSIONS: GuardianSession[] = [
  {
    id: 9001, status: "completed", review_status: "approved", has_summary: true,
    service_domain: "senior", recipient_name: "김복자",
    scheduled_start: "2026-06-14T09:00:00+09:00", scheduled_end: "2026-06-14T13:00:00+09:00",
    actual_start: "2026-06-14T09:02:00+09:00", actual_end: "2026-06-14T13:05:00+09:00", duration_min: 243,
  },
  {
    id: 9002, status: "completed", review_status: "pending", has_summary: true,
    service_domain: "nursing", recipient_name: "박정호",
    scheduled_start: "2026-06-14T08:00:00+09:00", scheduled_end: "2026-06-14T18:00:00+09:00",
    actual_start: "2026-06-14T08:00:00+09:00", actual_end: "2026-06-14T18:10:00+09:00", duration_min: 610,
  },
  {
    id: 9003, status: "in_progress", review_status: "pending", has_summary: false,
    service_domain: "living_support", recipient_name: "우리집",
    scheduled_start: "2026-06-14T14:00:00+09:00", scheduled_end: "2026-06-14T17:00:00+09:00",
    actual_start: "2026-06-14T14:01:00+09:00", actual_end: null, duration_min: 0,
  },
];

export const MOCK_SUMMARY: Record<number, AiSummary> = {
  9001: {
    guardian_version:
      "오늘 김복자 어르신은 컨디션이 안정적이셨어요. 아침 식사는 대부분 드셨고, 30분가량 가벼운 산책을 함께 했습니다. 혈압·체온 모두 정상 범위였고, 기분도 밝으셨습니다. 오후에는 잠시 낮잠을 주무신 뒤 가족 사진을 보며 즐겁게 대화했습니다.",
    categorized: {
      meal: { percentage: 80 },
      exercise: { minutes: 30, type: "산책" },
      vital: { noted: true },
      mood: "positive",
    },
    confidence: 0.86,
    generated_at: "2026-06-14T13:20:00+09:00",
  },
};
