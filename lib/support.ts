/**
 * 고객센터 연락처 — 화면 곳곳에 흩어져 있던 번호를 한 곳으로 모았다.
 * 기본값은 케어앤 대표 번호 031-375-3535(2026-10-18 운영사 지시 — 백엔드 COMPANY_TEL·영수증과 같은 값, 앱 AppConfig.csPhone 도 같음).
 * 다른 번호를 쓰려면 빌드 환경변수 NEXT_PUBLIC_CS_PHONE / NEXT_PUBLIC_CS_HOURS 로 바꾼다.
 */
const phone = process.env.NEXT_PUBLIC_CS_PHONE || "031-375-3535";

export const SUPPORT = {
  phone,
  tel: "tel:" + phone.replace(/[^0-9+]/g, ""),
  hours: process.env.NEXT_PUBLIC_CS_HOURS || "평일 9시~18시",
} as const;
