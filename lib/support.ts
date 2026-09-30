/**
 * 고객센터 연락처 — 화면 곳곳에 흩어져 있던 번호를 한 곳으로 모았다.
 * 실제 번호는 빌드 환경변수 NEXT_PUBLIC_CS_PHONE / NEXT_PUBLIC_CS_HOURS 로 넣는다(.env.production).
 * ⚠ 기본값 1600-0000 은 자리표시 번호다 — 개시 전 반드시 실번호로 설정할 것.
 */
const phone = process.env.NEXT_PUBLIC_CS_PHONE || "1600-0000";

export const SUPPORT = {
  phone,
  tel: "tel:" + phone.replace(/[^0-9+]/g, ""),
  hours: process.env.NEXT_PUBLIC_CS_HOURS || "평일 9시~18시",
} as const;
