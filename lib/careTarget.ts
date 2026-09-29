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
