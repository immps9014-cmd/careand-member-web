/** 장기요양 등급 라벨 (0=등급외, 1~5) */
export function careGradeLabel(grade: number | null | undefined): string {
  if (grade === null || grade === undefined) return "등급 미정";
  if (grade === 0) return "등급외";
  return `장기요양 ${grade}등급`;
}

export const CARE_GRADES = [
  { value: 1, label: "1등급" },
  { value: 2, label: "2등급" },
  { value: 3, label: "3등급" },
  { value: 4, label: "4등급" },
  { value: 5, label: "5등급" },
  { value: 0, label: "등급외" },
];

/** 건강 시계열 지표 정의 (health-timeseries metric) */
export interface HealthMetric {
  key: string;
  label: string;
  unit: string;
  color: string;
}

export const HEALTH_METRICS: HealthMetric[] = [
  { key: "bp_sys", label: "수축기 혈압", unit: "mmHg", color: "#C25450" },
  { key: "blood_sugar", label: "혈당", unit: "mg/dL", color: "#C68A2E" },
  { key: "heart_rate", label: "심박수", unit: "bpm", color: "#3D7AB3" },
  { key: "meal_pct", label: "식사량", unit: "%", color: "#3F7D52" },
  { key: "sleep_hours", label: "수면", unit: "시간", color: "#5C9D6C" },
  { key: "mood_score", label: "기분", unit: "점", color: "#93C09D" },
  { key: "activity_minutes", label: "활동", unit: "분", color: "#2F6240" },
];

/** 이상징후 severity → Badge variant */
export function severityVariant(severity: string): "danger" | "warn" | "info" | "outline" {
  switch (severity) {
    case "critical":
    case "high":
      return "danger";
    case "mid":
      return "warn";
    case "low":
      return "info";
    default:
      return "outline";
  }
}

/* ===== 간병(nursing) 도메인 ===== */

/** 거동 상태 (nursing patient mobility) */
export const MOBILITY_OPTIONS = [
  { value: "independent", label: "자립" },
  { value: "assisted", label: "부분 도움" },
  { value: "bedridden", label: "와상" },
] as const;

export function mobilityLabel(mobility: string | null | undefined): string {
  return MOBILITY_OPTIONS.find((m) => m.value === mobility)?.label ?? "미입력";
}

/** 케어 요구사항 프리셋 (자유입력 병행) */
export const CARE_REQUIREMENT_PRESETS = [
  "석션",
  "욕창케어",
  "식사보조",
  "체위변경",
  "배변보조",
  "투약보조",
  "이동보조",
];

/** 생년월일 → 만 나이 (계산 불가 시 null) */
export function ageFromBirthDate(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

/* ===== 가사(housekeeping) 도메인 ===== */

/** 주거 형태 (service address dwelling_type) */
export const DWELLING_OPTIONS = [
  { value: "apartment", label: "아파트" },
  { value: "villa", label: "빌라" },
  { value: "house", label: "주택" },
  { value: "officetel", label: "오피스텔" },
  { value: "other", label: "기타" },
] as const;

export function dwellingLabel(dwelling: string | null | undefined): string {
  return DWELLING_OPTIONS.find((d) => d.value === dwelling)?.label ?? "미입력";
}
