import { api } from "./api/client";
import { isIos, isStandalone, iosSupportsPush, inAppBrowser } from "./platform";

/**
 * 웹 푸시(PWA 1단계, CAREN-PWA-01) — 브라우저 구독과 서버 등록을 한 곳에서 다룬다.
 *
 * 상태
 *  - unsupported : 이 브라우저는 푸시가 안 됨
 *  - inapp       : 카카오톡 등 앱 안 브라우저 — 사파리/크롬으로 열어야 함
 *  - ios-update  : iOS 16.4 미만 — 업데이트해야 알림 가능
 *  - ios-install : 아이폰·아이패드 사파리 — 홈 화면에 추가한 앱에서만 푸시가 된다(iOS 16.4+)
 *  - denied      : 사용자가 브라우저에서 알림을 막음(브라우저 설정에서 풀어야 함)
 *  - off         : 가능하지만 아직 안 켬
 *  - on          : 이 기기에서 받는 중
 */
export type PushState = "unsupported" | "ios-install" | "ios-update" | "inapp" | "denied" | "off" | "on";

export { isIos, isStandalone } from "./platform";

const SW_URL = "/app/sw.js";
const SCOPE = "/app/";

/** 푸시가 안 되는 이유를 사용자가 할 수 있는 조치 단위로 */
function blockedReason(): PushState {
  if (inAppBrowser()) return "inapp";
  if (isIos()) return !iosSupportsPush() ? "ios-update" : !isStandalone() ? "ios-install" : "unsupported";
  return "unsupported";
}

function supported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return (await navigator.serviceWorker.getRegistration(SCOPE)) ?? (await navigator.serviceWorker.register(SW_URL, { scope: SCOPE }));
}

export async function getPushState(): Promise<PushState> {
  if (!supported()) return blockedReason();
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration(SCOPE);
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function b64uToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function sendToServer(sub: PushSubscription) {
  const j = sub.toJSON();
  await api.post("/v1/push/subscriptions", { endpoint: j.endpoint, keys: j.keys });
}

/** 켜기 — 반드시 버튼 클릭 안에서 불러야 한다(브라우저가 사용자 동작 없는 권한 요청을 막음). */
export async function enablePush(): Promise<PushState> {
  if (!supported()) return blockedReason();
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "denied" : "off";

  const { data } = await api.get("/v1/push/public-key");
  if (!data?.enabled || !data?.public_key) throw new Error("서버 알림 설정이 아직 준비되지 않았어요.");

  const reg = await registration();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  // 서버 키가 바뀌었으면 옛 구독은 쓸 수 없다 — 새로 받는다
  const key = b64uToBytes(data.public_key);
  const cur = sub?.options?.applicationServerKey;
  if (sub && cur && new Uint8Array(cur as ArrayBuffer).join() !== key.join()) {
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key as BufferSource });
  await sendToServer(sub);
  return "on";
}

/** 끄기 — 서버에서 지우고 브라우저 구독도 해지 */
export async function disablePush(): Promise<PushState> {
  if (!supported()) return "unsupported";
  const reg = await navigator.serviceWorker.getRegistration(SCOPE);
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api.delete("/v1/push/subscriptions", { data: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  return "off";
}

/**
 * 로그인 상태로 앱을 열 때마다 — 이미 허용된 구독을 지금 로그인한 계정으로 서버에 다시 알린다
 * (계정을 바꿔 로그인했거나, 서버에서 만료로 지워졌을 때 복구).
 */
export async function syncPush(): Promise<void> {
  try {
    if (!supported() || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker.getRegistration(SCOPE);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await sendToServer(sub);
  } catch {
    /* 조용히 무시 — 다음에 다시 시도 */
  }
}

/** 로그아웃 직전 — 이 기기로 이전 계정 알림이 가지 않게 서버 등록만 푼다(브라우저 허용은 유지) */
export async function detachPushFromServer(): Promise<void> {
  try {
    if (!supported()) return;
    const reg = await navigator.serviceWorker.getRegistration(SCOPE);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await api.delete("/v1/push/subscriptions", { data: { endpoint: sub.endpoint } });
  } catch {
    /* 무시 */
  }
}

export const sendTestPush = () => api.post("/v1/push/test");
