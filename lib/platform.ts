/**
 * 기기·브라우저 판별 — 설치 안내(아이폰 홈 화면 추가)와 알림 가능 여부 안내에 쓴다.
 * 아이폰은 「홈 화면에 추가」한 앱에서만 웹 푸시가 된다(iOS 16.4+).
 * 카카오톡·네이버 등 앱 안 브라우저에서는 홈 화면 추가 자체가 안 되므로 사파리로 먼저 내보내야 한다.
 */

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isAndroid(): boolean {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

/** iOS 주버전·부버전 (예: [17, 5]). 모르면 null. iPadOS 데스크톱 UA 는 Version/ 으로 추정 */
export function iosVersion(): [number, number] | null {
  if (typeof navigator === "undefined") return null;
  const m = navigator.userAgent.match(/OS (\d+)_(\d+)/) || navigator.userAgent.match(/Version\/(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** 아이폰 웹 푸시 최소 버전 16.4 */
export function iosSupportsPush(): boolean {
  const v = iosVersion();
  return !v || v[0] > 16 || (v[0] === 16 && v[1] >= 4);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export type InAppBrowser = "kakaotalk" | "naver" | "instagram" | "facebook" | "line" | "band" | "other" | null;

/** 앱 안 브라우저(웹뷰) 판별 — 한국 사용자는 카카오톡으로 받은 링크를 여는 경우가 가장 많다 */
export function inAppBrowser(): InAppBrowser {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return "kakaotalk";
  if (/NAVER\(inapp/i.test(ua)) return "naver";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV/i.test(ua)) return "facebook";
  if (/\bLine\//i.test(ua)) return "line";
  if (/BAND\//i.test(ua)) return "band";
  // iOS 웹뷰: Safari 토큰이 없고 Mobile/ 만 있음(크롬 CriOS·파이어폭스 FxiOS·엣지 EdgiOS 는 정식 브라우저)
  if (isIos() && !/Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) return "other";
  return null;
}

/** 카카오톡 인앱 브라우저에서 기본 브라우저(사파리/크롬)로 여는 공식 스킴 */
export function kakaoOpenExternalUrl(url: string): string {
  return "kakaotalk://web/openExternal?url=" + encodeURIComponent(url);
}

/** 홈 화면 아이콘 숫자 배지 — 지원 안 하면 조용히 무시 */
export function setAppBadge(n: number): void {
  try {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (n > 0) nav.setAppBadge?.(n)?.catch(() => {});
    else nav.clearAppBadge?.()?.catch(() => {});
  } catch {
    /* 무시 */
  }
}
