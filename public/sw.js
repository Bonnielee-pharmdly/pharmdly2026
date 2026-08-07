// 팜들리 Service Worker — PWA 설치 배너 활성화용
const CACHE = "pharmdly-v1";
const PRECACHE = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  // 네트워크 우선, 실패 시 캐시 fallback
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
