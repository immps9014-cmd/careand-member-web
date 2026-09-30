import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * /app 서버사이드 인증 게이트.
 * 인증 존재 플래그 쿠키(careand_auth)가 없으면 로그인 페이지의 셸조차 전달하지 않고
 * /login으로 리다이렉트한다. (실제 보안 경계는 백엔드 auth:api — 여기선 셸 노출 차단.)
 *
 * 주: basePath("/app")가 적용되어 미들웨어가 보는 pathname/matcher에는 /app가 제외되고,
 * redirect의 pathname에는 Next가 basePath를 자동으로 다시 붙인다.
 */
// /auth/callback = 카카오·구글 로그인 복귀(비로그인 상태로 도착, S4)
const PUBLIC_PATHS = ["/login", "/signup", "/find-account", "/auth/callback", "/shared"];   // /shared = 가족 공유 일지(기능 5, 토큰으로만)

export function middleware(req: NextRequest) {
  let pathname = req.nextUrl.pathname;
  // 버전별 차이 방어: basePath가 포함돼 들어오면 제거
  if (pathname === "/app") pathname = "/";
  else if (pathname.startsWith("/app/")) pathname = pathname.slice(4);

  // 로그인/가입은 통과(미인증도 접근해야 함)
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const authed = req.cookies.get("careand_auth")?.value === "1";
  if (!authed) {
    // 복귀 URL은 경로+쿼리 전체 보존(신청화면의 ?domain= 등). 로그인 페이지가 redirect 파라미터로 되돌린다.
    const back = pathname + req.nextUrl.search;
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", back);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // 정적 자산·이미지·API 프록시·파일 요청은 제외하고 전부 게이트
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)"],
};
