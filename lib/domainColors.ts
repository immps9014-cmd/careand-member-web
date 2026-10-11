/**
 * 분야 색 — 앱 lib/core/domain_colors.dart · 관리자 components/domain/domain-badge.tsx · 공개웹 lib/domainColors.ts 와 같은 값(CAREN-COLOR-01 §3).
 * fill = 채움(흰 글자 4.8:1+) · tint = 옅은 바탕 · ink = 옅은 바탕 위 글자(4.5:1+). 바꿀 땐 네 곳 같이.
 */
export const DOMAIN_COLOR: Record<string, { fill: string; tint: string; ink: string }> = {
  postpartum: { fill: "#C2412D", tint: "#FBE7E3", ink: "#A83524" },
  senior: { fill: "#9A6416", tint: "#FDF3DC", ink: "#9A6416" },
  nursing: { fill: "#2F64B5", tint: "#E8F0FB", ink: "#2F64B5" },
  living_support: { fill: "#2E7D80", tint: "#E3F1F1", ink: "#24686B" },
  housekeeping: { fill: "#2E7D80", tint: "#E3F1F1", ink: "#24686B" },
  childcare: { fill: "#4F7A28", tint: "#EEF5E6", ink: "#4F7A28" },
  mental_care: { fill: "#5B4BC4", tint: "#EAE7FB", ink: "#5B4BC4" },
};
export const DOMAIN_FALLBACK = { fill: "#6E6757", tint: "#EFEDEA", ink: "#4F4A40" };

export function domainColor(domain: string | null | undefined) {
  return (domain && DOMAIN_COLOR[domain]) || DOMAIN_FALLBACK;
}
