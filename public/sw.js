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
