// 가입 때 고른 「돌봄 대상과의 관계」(guardians.relation)로 돌봄대상 호칭을 정한다.
// relation 은 회원 본인이 대상에게 어떤 관계인지다 — 기본값 "자녀"면 대상은 부모님.
// 부모님으로 못 박으면 형제·배우자를 돌보는 회원에게 엉뚱한 안내가 나가므로, 모르면 중립 호칭.
const TARGET_BY_RELATION: Record<string, string> = {
  자녀: "부모님",
  배우자: "배우자분",
  형제: "형제·자매분",
  본인: "본인",
};

/** 안내문용 호칭 — 예: "부모님", "형제·자매분", 관계 미상이면 "돌봄받으실 분" */
export function careTargetNoun(relation?: string | null): string {
  return (relation && TARGET_BY_RELATION[relation]) || "돌봄받으실 분";
}

/**
 * 돌봄전문가 화면 한 줄 — 함께 필요한 세부 종류(복수 선택)·아기 요약.
 * 「함께: 산후관리·신생아 돌봄 · 아기 1명 · 생후 3일」. 둘 다 없으면 null.
 */
export function careNote(r: { extra_categories?: string[]; newborn_summary?: string | null }): string | null {
  const parts = [
    ...(r.extra_categories?.length ? [`함께: ${r.extra_categories.join("·")}`] : []),
    ...(r.newborn_summary ? [r.newborn_summary] : []),
  ];
  return parts.length ? parts.join(" · ") : null;
}

/** 「여아 · 생후 3일 · 3.2kg」 — 생후 일수는 한국 날짜 기준 */
export function newbornLine(b: { gender: "M" | "F"; birth_date: string; birth_weight_g: number }): string {
  const todayKst = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const days = Math.round((Date.parse(todayKst) - Date.parse(b.birth_date)) / 86400e3);
  return [b.gender === "F" ? "여아" : "남아", ...(Number.isFinite(days) ? [`생후 ${days}일`] : []), `${(b.birth_weight_g / 1000).toFixed(1)}kg`].join(" · ");
}
