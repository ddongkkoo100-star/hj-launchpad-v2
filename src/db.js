// IndexedDB 래퍼 — HJ 런치패드 v2 Step 2
// DB명: hj-launchpad-v2, 버전: 1
// Stores 3개: runs, cardStates, results
//
// 함수 시그니처는 Promise 기반. async/await로 사용.
// I/O 외 비즈니스 로직은 store.js와 state-machine.js로 분리.

const DB_NAME    = 'hj-launchpad-v2';
const DB_VERSION = 1;

const STORE = {
  RUNS:        'runs',
  CARD_STATES: 'cardStates',
  RESULTS:     'results',
};

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;

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
  // 가장 최근 startedAt부터 역순으로 보면서 status=='active' 첫 번째
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

// ── 디버그 / 초기화 ────────────────────────────────
export async function deleteEverything() {
  // 개발 중 DB 초기화용. 프로덕션 UI에서는 자료관리 화면(Step 6)에서 호출.
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

export const DB_INFO = { name: DB_NAME, version: DB_VERSION, stores: STORE };
