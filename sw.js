// HJ 런치패드 Service Worker — Step 6
//
// 전략:
//   - 정적 리소스 (HTML/JS/CSS): network-first
//     → 네트워크 시도 → 성공 시 캐시 갱신 + 응답 / 실패 시 캐시 fallback
//     → 코드 변경 시 즉시 반영, 오프라인 시에도 마지막 캐시로 동작
//   - 아이콘 / manifest: cache-first (잘 안 변하므로)
//   - 외부 도메인 (그록·클로드·챗GPT 사이트): 캐시 안 함 (network-only)
//
// 안전장치:
//   - install: skipWaiting() — 새 SW를 즉시 활성화 후보로
//   - activate: clients.claim() + 옛 CACHE_VERSION 모두 삭제
//   - 캐시 키에 버전 포함 → 버전 올리면 옛 캐시 자동 무효화
//
// 사용자 강제 갱신:
//   F12 → Application → Service Workers → Unregister
//   F12 → Application → Storage → Clear site data

const CACHE_VERSION = 'hj-launchpad-v2-step6';
const CACHE_STATIC  = `${CACHE_VERSION}-static`;
const CACHE_ASSETS  = `${CACHE_VERSION}-assets`;

// 사전 캐싱 — 앱 셸 핵심 리소스 (install 시 한 번에)
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './app.js',
  './src/router.js',
  './src/db.js',
  './src/state-machine.js',
  './src/store.js',
  './src/prompt.js',
  './src/views/dashboard.js',
  './src/views/card.js',
  './src/views/import.js',
  './src/views/data.js',
  './src/views/settings.js',
  './data/cards.js',
  './data/deps.js',
  './data/rules.js',
];

const ASSETS_URLS = [
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

// ── install: 핵심 리소스 사전 캐싱 ───────────────
self.addEventListener('install', (event) => {
  console.log('[SW] install', CACHE_VERSION);
  event.waitUntil((async () => {
    try {
      const staticCache = await caches.open(CACHE_STATIC);
      // 개별 add로 처리 — 일부 실패해도 나머지는 진행 (addAll은 하나라도 실패하면 전체 실패)
      await Promise.all(PRECACHE_URLS.map(url =>
        staticCache.add(url).catch(e => console.warn('[SW] precache fail', url, e))));
      const assetsCache = await caches.open(CACHE_ASSETS);
      await Promise.all(ASSETS_URLS.map(url =>
        assetsCache.add(url).catch(e => console.warn('[SW] asset cache fail', url, e))));
      // skipWaiting → 새 SW 즉시 waiting 상태로
      await self.skipWaiting();
    } catch (e) {
      console.error('[SW] install error', e);
    }
  })());
});

// ── activate: 옛 캐시 정리 + 즉시 클라이언트 장악 ──
self.addEventListener('activate', (event) => {
  console.log('[SW] activate', CACHE_VERSION);
  event.waitUntil((async () => {
    // 옛 버전 캐시 모두 삭제
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k !== CACHE_STATIC && k !== CACHE_ASSETS)
        .map(k => {
          console.log('[SW] delete old cache', k);
          return caches.delete(k);
        })
    );
    await self.clients.claim();
  })());
});

// ── fetch: 전략 분기 ────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // GET만 처리 (POST 등은 통과)
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 같은 origin만 캐시 처리. 외부 도메인(그록·클로드·챗GPT 등)은 통과.
  if (url.origin !== self.location.origin) return;

  // hash 라우터 navigation (예: /#/card/P1A) 은 결국 /index.html 요청과 동일하게 처리됨

  // 아이콘/매니페스트 — cache-first
  if (url.pathname.includes('/assets/') || url.pathname.endsWith('manifest.json')) {
    event.respondWith(cacheFirst(req, CACHE_ASSETS));
    return;
  }

  // 그 외 같은 origin 정적 리소스 — network-first
  event.respondWith(networkFirst(req, CACHE_STATIC));
});

// ── 전략 함수 ──────────────────────────────────
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      // 응답 복제 후 캐시에 저장 (백그라운드)
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    // 오프라인 또는 네트워크 실패 → 캐시 fallback
    const cached = await cache.match(request);
    if (cached) return cached;
    // navigation 요청이면 index.html로 fallback (PWA 시작점)
    if (request.mode === 'navigate') {
      const idx = await cache.match('./index.html');
      if (idx) return idx;
    }
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    throw err;
  }
}

// 메시지 채널 — 향후 강제 활성화 메시지 등에 대응 가능 (현재 미사용)
self.addEventListener('message', (ev) => {
  if (ev.data && ev.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
