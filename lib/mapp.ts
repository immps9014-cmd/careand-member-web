/**
 * 보호자·돌봄전문가의 웹 화면은 앱 웹판(/mapp·/mapp-partner)으로 일원화(2026-10-10).
 * 회원웹(/app)은 기관 포털 + 로그인 없는 페이지(공유 일지·바우처 계산기·소셜 로그인 복귀)만 맡는다.
 * 로그인은 같은 출처의 httpOnly 쿠키 세션이라 넘어가도 다시 로그인하지 않는다.
 * 경로 대응(회원웹 → 앱)은 앱 쪽 lib/core/web_entry.dart 한 곳에서 한다 — 여기선 원래 경로를 그대로 넘긴다.
 * 되돌리기: NEXT_PUBLIC_MAPP_REDIRECT=false 로 다시 빌드.
 */
export const MAPP_REDIRECT = process.env.NEXT_PUBLIC_MAPP_REDIRECT !== "false";

const MAPP_BASE: Record<string, string> = { guardian: "/mapp", caregiver: "/mapp-partner" };

/** 이 역할을 앱 웹판으로 보낼 주소. 기관·관리자 등은 null(회원웹에 머묾). path = basePath(/app) 를 뺀 회원웹 경로+쿼리 */
export function mappUrlFor(role: string | undefined | null, path = "/home"): string | null {
  if (!MAPP_REDIRECT || !role || !MAPP_BASE[role]) return null;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${MAPP_BASE[role]}/#/from-web?p=${encodeURIComponent(p)}`;
}
