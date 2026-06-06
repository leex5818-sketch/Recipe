// version: 2026-06-06-offline-v1
// 이 버전 문자열이 바뀌면 새 service worker가 활성화되며 옛 캐시를 정리한다.
// 전략:
//   · 앱 셸/데이터(동일 출처): network-first → 항상 최신, 오프라인이면 캐시 폴백 (stuck 버전 방지)
//   · CDN 라이브러리(버전 고정 cross-origin): cache-first → 오프라인 재방문에도 부팅 가능
//   · 카카오 인증·번역·쿠팡·Supabase·분석 등 동적/민감 요청: 캐시 개입 없음(그대로 통과)
const CACHE = 'recipe-v1-2026-06-06';
const SHELL = ['./', './index.html', './app.js', './recipes.json', './manifest.json', './icon-192.svg', './icon-512.svg'];

// 캐시에 절대 넣지 않을 호스트(인증·결제·외부 API·분석)
const BYPASS = ['kauth.kakao.com', 'kapi.kakao.com', 'supabase.co', 'translate.googleapis.com', 'coupang.com', 'web-analytics-steel-one'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // POST 등(수정제안·로그인·번역)은 그대로
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (BYPASS.some(h => url.hostname.includes(h))) return; // 인증·결제·API·분석은 손대지 않음

  if (url.origin === self.location.origin) {
    // 앱 셸·데이터: network-first (최신 우선, 오프라인이면 캐시)
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
  } else {
    // CDN 라이브러리(react·kakao sdk·pretendard·iconify 등 버전 고정): cache-first
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit))
    );
  }
});
