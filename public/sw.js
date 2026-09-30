/* Care& 보호자 PWA service worker
 * 설치 가능(installability) 요건 충족용 최소 SW.
 * 정책: 네비게이션/동일출처 GET만 네트워크 우선(실패 시 캐시 폴백).
 * API(POST 등)·교차출처는 가로채지 않고 그대로 통과 → 데이터 정합성 보존.
 */
const CACHE = "careand-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // GET·동일출처만 처리. 그 외(POST/PUT/API 토큰요청/교차출처)는 통과.
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        // 정적 셸 자원만 캐시(문서/스크립트/스타일/이미지)
        if (res && res.status === 200 && ["document", "script", "style", "image", "font"].includes(req.destination)) {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        return res;
      } catch (err) {
        const cached = await caches.match(req);
        if (cached) return cached;
        throw err;
      }
    })()
  );
});

/* ===== 웹 푸시(PWA 1단계, CAREN-PWA-01) =====
 * 서버(WebPushService)가 aes128gcm 으로 암호화해 보낸 JSON: { title, body, url, tag, urgent, notification_id }
 * 브라우저가 복호화해 event.data 로 넘겨준다.
 */
self.addEventListener("push", (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch (e) {
    msg = { body: event.data ? event.data.text() : "" };
  }
  const title = msg.title || "케어앤 알림";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: msg.body || "",
      icon: "/app/icons/icon-192.png",
      badge: "/app/icons/icon-192.png",
      tag: msg.tag || undefined,
      renotify: !!msg.tag,
      // 안전·이상징후 알림은 사용자가 닫을 때까지 남긴다
      requireInteraction: !!msg.urgent,
      lang: "ko",
      data: { url: msg.url || "/app/notifications" },
    })
  );
});

// 알림을 누르면 — 이미 열린 앱 창이 있으면 그 창을 해당 화면으로, 없으면 새로 연다
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || "/app/notifications";
  const target = new URL(raw, self.location.origin);
  if (target.origin !== self.location.origin || !target.pathname.startsWith("/app")) return;   // 앱 밖 주소는 열지 않음
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if (new URL(w.url).pathname.startsWith("/app")) {
          await w.focus();
          if ("navigate" in w) return w.navigate(target.href);
          return;
        }
      }
      return self.clients.openWindow(target.href);
    })()
  );
});
