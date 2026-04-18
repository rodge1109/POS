/**
 * offlineDB.js
 * IndexedDB utility for POS offline mode.
 * - Caches menu/product data for offline browsing
 * - Queues orders created while offline for sync when back online
 */

const DB_NAME = 'pos_offline_db';
const DB_VERSION = 1;
const STORE_MENU = 'menu_cache';
const STORE_QUEUE = 'order_queue';

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_MENU)) {
        db.createObjectStore(STORE_MENU, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'localId', autoIncrement: true });
      }
    };
    request.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };
    request.onerror = (e) => reject(e.target.error);
  });
}

// ─── Menu Cache ───────────────────────────────────────────────────────────────

export async function cacheMenuData(menuData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MENU, 'readwrite');
    const store = tx.objectStore(STORE_MENU);
    store.put({ key: 'menuData', data: menuData, cachedAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = (e) => reject(e.target.error);
  });
}

export async function getCachedMenuData() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MENU, 'readonly');
    const store = tx.objectStore(STORE_MENU);
    const request = store.get('menuData');
    request.onsuccess = (e) => resolve(e.target.result || null);
    request.onerror = (e) => reject(e.target.error);
  });
}

// ─── Order Queue ──────────────────────────────────────────────────────────────

export async function queueOrder(orderPayload) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_QUEUE);
    const record = { ...orderPayload, queuedAt: Date.now(), status: 'pending' };
    const request = store.add(record);
    request.onsuccess = (e) => resolve(e.target.result); // returns localId
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function getPendingOrders() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readonly');
    const store = tx.objectStore(STORE_QUEUE);
    const request = store.getAll();
    request.onsuccess = (e) => resolve(e.target.result || []);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function deleteQueuedOrder(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_QUEUE);
    const request = store.delete(localId);
    request.onsuccess = resolve;
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function updateQueuedOrder(localId, updates) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_QUEUE);
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const data = getReq.result;
      if (!data) return resolve();
      const updated = { ...data, ...updates };
      const putReq = store.put(updated);
      putReq.onsuccess = resolve;
      putReq.onerror = (e) => reject(e.target.error);
    };
    getReq.onerror = (e) => reject(e.target.error);
  });
}

export async function clearOrderQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_QUEUE);
    const request = store.clear();
    request.onsuccess = resolve;
    request.onerror = (e) => reject(e.target.error);
  });
}
