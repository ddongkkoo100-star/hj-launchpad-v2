// IndexedDB 래퍼 — HJ 런치패드 v2
// DB명: hj-launchpad-v2
// 버전 1: runs / cardStates / results
// 버전 2: + settings (Step 6) — keyPath 'key' 단일 키-값 저장소
//
// 함수 시그니처는 Promise 기반. async/await로 사용.
// I/O 외 비즈니스 로직은 store.js와 state-machine.js로 분리.
//
// ⚠ 마이그레이션 정책:
//   - onupgradeneeded는 oldVersion → newVersion 단계별로 적용
//   - 기존 stores(runs/cardStates/results)는 절대 삭제·변경하지 않음 (사용자 데이터 보존)
//   - settings store만 v2에서 신규 추가

const DB_NAME    = 'hj-launchpad-v2';
const DB_VERSION = 2;

const STORE = {
  RUNS:        'runs',
  CARD_STATES: 'cardStates',
  RESULTS:     'results',
  SETTINGS:    'settings',
};

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      const oldVersion = ev.oldVersion;

      // v0 → v1 (Step 2): runs / cardStates / results
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORE.RUNS)) {
          const s = db.createObjectStore(STORE.RUNS, { keyPath: 'runId' });
          s.createIndex('idx_startedAt', 'startedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE.CARD_STATES)) {
          const s = db.createObjectStore(STORE.CARD_STATES, { keyPath: 'id' });
          s.createIndex('idx_runId', 'runId', { unique: false });
          s.createIndex('idx_runId_cardCode', ['runId', 'cardCode'], { unique: true });
        }
        if (!db.objectStoreNames.contains(STORE.RESULTS)) {
          const s = db.createObjectStore(STORE.RESULTS, { keyPath: 'id' });
          s.createIndex('idx_runId', 'runId', { unique: false });
        }
      }

      // v1 → v2 (Step 6): settings 추가. 기존 stores는 손대지 않음.
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE.SETTINGS)) {
          db.createObjectStore(STORE.SETTINGS, { keyPath: 'key' });
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB upgrade blocked — close other tabs.'));
  });
  return _dbPromise;
}

function tx(db, stores, mode = 'readonly') {
  return db.transaction(stores, mode);
}

function p(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── runs ─────────────────────────────────────────────
export async function addRun(run) {
  const db = await openDB();
  return p(tx(db, [STORE.RUNS], 'readwrite').objectStore(STORE.RUNS).add(run));
}

export async function getRun(runId) {
  const db = await openDB();
  return p(tx(db, [STORE.RUNS]).objectStore(STORE.RUNS).get(runId));
}

export async function updateRun(run) {
  const db = await openDB();
  return p(tx(db, [STORE.RUNS], 'readwrite').objectStore(STORE.RUNS).put(run));
}

export async function getActiveRun() {
  const db = await openDB();
  const store = tx(db, [STORE.RUNS]).objectStore(STORE.RUNS);
  return new Promise((resolve, reject) => {
    const idx = store.index('idx_startedAt');
    const req = idx.openCursor(null, 'prev');
    req.onsuccess = (ev) => {
      const cur = ev.target.result;
      if (!cur) return resolve(null);
      if (cur.value.status === 'active') return resolve(cur.value);
      cur.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function listRuns() {
  const db = await openDB();
  return p(tx(db, [STORE.RUNS]).objectStore(STORE.RUNS).getAll());
}

export async function deleteRunRow(runId) {
  const db = await openDB();
  return p(tx(db, [STORE.RUNS], 'readwrite').objectStore(STORE.RUNS).delete(runId));
}

// ── cardStates ───────────────────────────────────────
const cardStateId = (runId, cardCode) => `${runId}::${cardCode}`;

export async function putCardState(cardState) {
  const db = await openDB();
  return p(tx(db, [STORE.CARD_STATES], 'readwrite').objectStore(STORE.CARD_STATES).put(cardState));
}

export async function bulkPutCardStates(cardStates) {
  const db = await openDB();
  const t = tx(db, [STORE.CARD_STATES], 'readwrite');
  const store = t.objectStore(STORE.CARD_STATES);
  return new Promise((resolve, reject) => {
    let pending = cardStates.length;
    if (pending === 0) return resolve();
    cardStates.forEach(cs => {
      const r = store.put(cs);
      r.onsuccess = () => { if (--pending === 0) resolve(); };
      r.onerror   = () => reject(r.error);
    });
    t.onerror = () => reject(t.error);
  });
}

export async function getCardState(runId, cardCode) {
  const db = await openDB();
  return p(tx(db, [STORE.CARD_STATES])
    .objectStore(STORE.CARD_STATES)
    .get(cardStateId(runId, cardCode)));
}

export async function getCardStatesByRun(runId) {
  const db = await openDB();
  const idx = tx(db, [STORE.CARD_STATES]).objectStore(STORE.CARD_STATES).index('idx_runId');
  return p(idx.getAll(IDBKeyRange.only(runId)));
}

// ── results ──────────────────────────────────────────
const resultId = (runId, cardCode) => `${runId}::${cardCode}`;

export async function putResult(result) {
  const db = await openDB();
  return p(tx(db, [STORE.RESULTS], 'readwrite').objectStore(STORE.RESULTS).put(result));
}

export async function getResult(runId, cardCode) {
  const db = await openDB();
  return p(tx(db, [STORE.RESULTS])
    .objectStore(STORE.RESULTS)
    .get(resultId(runId, cardCode)));
}

export async function getResultsByRun(runId) {
  const db = await openDB();
  const idx = tx(db, [STORE.RESULTS]).objectStore(STORE.RESULTS).index('idx_runId');
  return p(idx.getAll(IDBKeyRange.only(runId)));
}

export async function deleteResult(runId, cardCode) {
  const db = await openDB();
  return p(tx(db, [STORE.RESULTS], 'readwrite')
    .objectStore(STORE.RESULTS)
    .delete(resultId(runId, cardCode)));
}

// ── settings (Step 6, DB v2) ─────────────────────────
//   key-value store. 단일 row 단위로 setting/setting/setting...
//   현재 사용 키:
//     'fontScale' → 'small' | 'normal' | 'large'

export async function getSetting(key) {
  const db = await openDB();
  const row = await p(tx(db, [STORE.SETTINGS]).objectStore(STORE.SETTINGS).get(key));
  return row ? row.value : null;
}

export async function setSetting(key, value) {
  const db = await openDB();
  return p(tx(db, [STORE.SETTINGS], 'readwrite')
    .objectStore(STORE.SETTINGS)
    .put({ key, value, updatedAt: Date.now() }));
}

export async function getAllSettings() {
  const db = await openDB();
  return p(tx(db, [STORE.SETTINGS]).objectStore(STORE.SETTINGS).getAll());
}

// ── 디버그 / 초기화 ────────────────────────────────
export async function deleteEverything() {
  // 자료관리 화면에서 호출. settings도 함께 비움.
  const db = await openDB();
  const t = tx(db, [STORE.RUNS, STORE.CARD_STATES, STORE.RESULTS, STORE.SETTINGS], 'readwrite');
  return new Promise((resolve, reject) => {
    t.objectStore(STORE.RUNS).clear();
    t.objectStore(STORE.CARD_STATES).clear();
    t.objectStore(STORE.RESULTS).clear();
    t.objectStore(STORE.SETTINGS).clear();
    t.oncomplete = () => resolve();
    t.onerror    = () => reject(t.error);
  });
}

// ── Step 6 PART 1: Export ─────────────────────────────
//   3개 main store(runs/cardStates/results)를 모두 읽어 객체 반환.
//   settings는 export 대상에서 제외(브라우저별 환경 설정이라 백업 의미 적음).
export async function exportAllData() {
  const db = await openDB();
  const t = tx(db, [STORE.RUNS, STORE.CARD_STATES, STORE.RESULTS]);
  const [runs, cardStates, results] = await Promise.all([
    p(t.objectStore(STORE.RUNS).getAll()),
    p(t.objectStore(STORE.CARD_STATES).getAll()),
    p(t.objectStore(STORE.RESULTS).getAll()),
  ]);
  return {
    version: 1,                                  // export 스키마 버전 (DB 버전과 별개)
    exportedAt: new Date().toISOString(),
    appVersion: 'v2',
    runs,
    cardStates,
    results,
  };
}

// ── Step 6 PART 2: Import ─────────────────────────────
//   3개 main store만 비우고 새 데이터 일괄 삽입.
//   settings는 보존 (사용자의 글자 크기 등 환경 설정 유지).
export async function clearMainData() {
  const db = await openDB();
  const t = tx(db, [STORE.RUNS, STORE.CARD_STATES, STORE.RESULTS], 'readwrite');
  return new Promise((resolve, reject) => {
    t.objectStore(STORE.RUNS).clear();
    t.objectStore(STORE.CARD_STATES).clear();
    t.objectStore(STORE.RESULTS).clear();
    t.oncomplete = () => resolve();
    t.onerror    = () => reject(t.error);
  });
}

export async function importAllData(data) {
  // 호출 전 검증은 호출자(views/data.js)에서. 여기는 단순 삽입.
  const db = await openDB();
  await clearMainData();
  const t = tx(db, [STORE.RUNS, STORE.CARD_STATES, STORE.RESULTS], 'readwrite');
  return new Promise((resolve, reject) => {
    const sR  = t.objectStore(STORE.RUNS);
    const sCS = t.objectStore(STORE.CARD_STATES);
    const sRe = t.objectStore(STORE.RESULTS);
    for (const r  of data.runs       || []) sR.add(r);
    for (const cs of data.cardStates || []) sCS.add(cs);
    for (const re of data.results    || []) sRe.add(re);
    t.oncomplete = () => resolve();
    t.onerror    = () => reject(t.error);
  });
}

// ── Step 6 PART 3: 특정 run 삭제 (cascade) ────────────
export async function deleteRunCascade(runId) {
  const db = await openDB();
  const t = tx(db, [STORE.RUNS, STORE.CARD_STATES, STORE.RESULTS], 'readwrite');

  const csIdx = t.objectStore(STORE.CARD_STATES).index('idx_runId');
  const reIdx = t.objectStore(STORE.RESULTS).index('idx_runId');

  // 인덱스로 cascade 키들 수집한 뒤 삭제
  return new Promise((resolve, reject) => {
    let pending = 0;
    let allDone = false;

    function tryResolve() {
      if (allDone && pending === 0) resolve();
    }

    // runs
    pending++;
    const r1 = t.objectStore(STORE.RUNS).delete(runId);
    r1.onsuccess = () => { pending--; tryResolve(); };
    r1.onerror   = () => reject(r1.error);

    // cardStates
    pending++;
    const c1 = csIdx.openCursor(IDBKeyRange.only(runId));
    c1.onsuccess = (ev) => {
      const cur = ev.target.result;
      if (cur) { cur.delete(); cur.continue(); }
      else { pending--; tryResolve(); }
    };
    c1.onerror = () => reject(c1.error);

    // results
    pending++;
    const c2 = reIdx.openCursor(IDBKeyRange.only(runId));
    c2.onsuccess = (ev) => {
      const cur = ev.target.result;
      if (cur) { cur.delete(); cur.continue(); }
      else { pending--; tryResolve(); }
    };
    c2.onerror = () => reject(c2.error);

    t.oncomplete = () => { allDone = true; tryResolve(); };
    t.onerror    = () => reject(t.error);
  });
}

export const DB_INFO = { name: DB_NAME, version: DB_VERSION, stores: STORE };
