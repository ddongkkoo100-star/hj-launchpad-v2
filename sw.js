// HJ 런치패드 Service Worker — Step 1 골격
// 캐싱 전략은 Step 6에서 본격 구현. 지금은 install/activate 라이프사이클만.

const SW_VERSION = 'hj-lp-v0.1-step1';

self.addEventListener('install', (event) => {
  // skipWaiting을 명시적으로 호출하지 않음 — Step 6에서 캐시 전략 확정 후 도입.
  console.log('[SW] install', SW_VERSION);
});

self.addEventListener('activate', (event) => {
  console.log('[SW] activate', SW_VERSION);
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Step 1: 네트워크 통과만. 캐시는 Step 6에서.
  return;
});
