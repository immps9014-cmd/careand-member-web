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
