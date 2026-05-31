// version: 2026-05-31-kakao-fix
// 항상 최신 파일 사용 (캐시 비활성화)
// 이 버전 주석이 바뀌면 PWA가 새 service worker 받음 → 모든 캐시 강제 무효화
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request));
});
