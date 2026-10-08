/* ==========================================================================
   Browser-local persistence (spec sections 3, 58, 63).

   - The working database is saved to localStorage while it fits under the
     safe threshold; larger datasets move to IndexedDB (also browser-local,
     with a far larger quota). Nothing is ever sent over the network.
   - Snapshots for rollback live in IndexedDB and are capped at
     config.maxSnapshots so storage cannot be exhausted.
   - If saving fails, the in-memory session keeps working and the caller is
     told so it can warn and offer a JSON export.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var cfg = YLP.config;
  var DB_KEY = cfg.storagePrefix + 'db';
  var WHERE_KEY = cfg.storagePrefix + 'where';
  var STORE_CURRENT = 'current';
  var STORE_SNAP = 'snapshots';

  function localAvailable() {
    try {
      var k = cfg.storagePrefix + '__probe';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }

  function idbAvailable() {
    try { return typeof window.indexedDB !== 'undefined' && window.indexedDB !== null; } catch (e) { return false; }
  }

  var idbConn = null;
  var idbPromise = null;

  function openIdb() {
    if (!idbAvailable()) return Promise.reject(new Error('IndexedDB is not available in this browser'));
    if (idbPromise) return idbPromise;
    idbPromise = new Promise(function (resolve, reject) {
      var req;
      try { req = window.indexedDB.open(cfg.idbName, 1); } catch (e) { reject(e); return; }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE_CURRENT)) db.createObjectStore(STORE_CURRENT);
        if (!db.objectStoreNames.contains(STORE_SNAP)) db.createObjectStore(STORE_SNAP, { keyPath: 'id' });
      };
      req.onsuccess = function () { idbConn = req.result; resolve(idbConn); };
      req.onerror = function () { reject(req.error || new Error('IndexedDB open failed')); };
      req.onblocked = function () { reject(new Error('IndexedDB is blocked by another open tab')); };
    });
    idbPromise.catch(function () { idbPromise = null; });
    return idbPromise;
  }

  function tx(store, mode, fn) {
    return openIdb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, mode);
        var req = fn(t.objectStore(store));
        var result;
        if (req) req.onsuccess = function () { result = req.result; };
        t.oncomplete = function () { resolve(result); };
        t.onerror = function () { reject(t.error || new Error('IndexedDB transaction failed')); };
        t.onabort = function () { reject(t.error || new Error('IndexedDB transaction aborted')); };
      });
    });
  }

  // Browsers count localStorage in UTF-16 code units: 2 bytes per character.
  function byteSize(str) { return str.length * 2; }

  function save(db) {
    var json = JSON.stringify(db);
    var size = byteSize(json);
    var result = { ok: false, where: null, bytes: size, nearLimit: size > cfg.safeLocalStorageBytes * cfg.warnRatio, error: null };

    if (localAvailable() && size <= cfg.safeLocalStorageBytes) {
      try {
        window.localStorage.setItem(DB_KEY, json);
        window.localStorage.setItem(WHERE_KEY, 'local');
        result.ok = true; result.where = 'local';
        return tx(STORE_CURRENT, 'readwrite', function (s) { return s.delete('db'); })
          .catch(function () { /* IndexedDB copy is optional */ })
          .then(function () { return result; });
      } catch (e) {
        result.error = (e && e.name) || 'QuotaExceededError';
      }
    }
    return tx(STORE_CURRENT, 'readwrite', function (s) { return s.put(json, 'db'); })
      .then(function () {
        try { window.localStorage.removeItem(DB_KEY); window.localStorage.setItem(WHERE_KEY, 'idb'); } catch (e) { /* pointer is a hint only */ }
        result.ok = true; result.where = 'idb'; result.error = null;
        return result;
      })
      .catch(function (e) {
        result.ok = false;
        result.error = result.error || (e && (e.name || e.message)) || 'StorageError';
        return result;
      });
  }

  function load() {
    var where = null;
    try { where = window.localStorage.getItem(WHERE_KEY); } catch (e) { where = null; }
    if (where !== 'idb') {
      try {
        var json = window.localStorage.getItem(DB_KEY);
        if (json) return Promise.resolve({ db: JSON.parse(json), where: 'local' });
      } catch (e) {
        return Promise.resolve({ db: null, where: null, error: 'Saved data could not be read (' + e.name + ')' });
      }
    }
    return tx(STORE_CURRENT, 'readonly', function (s) { return s.get('db'); })
      .then(function (json) { return json ? { db: JSON.parse(json), where: 'idb' } : null; })
      .catch(function () { return null; });
  }

  function addSnapshot(db, label) {
    var json = JSON.stringify(db);
    var snap = { id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), createdAt: new Date().toISOString(), label: label, bytes: byteSize(json), json: json };
    return tx(STORE_SNAP, 'readwrite', function (s) { return s.put(snap); })
      .then(prune)
      .then(function () { return snap.id; });
  }

  function listSnapshots() {
    return tx(STORE_SNAP, 'readonly', function (s) { return s.getAll(); }).then(function (all) {
      return (all || []).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; })
        .map(function (x) { return { id: x.id, createdAt: x.createdAt, label: x.label, bytes: x.bytes }; });
    });
  }

  function getSnapshot(id) {
    return tx(STORE_SNAP, 'readonly', function (s) { return s.get(id); })
      .then(function (snap) { return snap ? JSON.parse(snap.json) : null; });
  }

  function deleteSnapshot(id) {
    return tx(STORE_SNAP, 'readwrite', function (s) { return s.delete(id); });
  }

  function prune() {
    return listSnapshots().then(function (list) {
      var extra = list.slice(cfg.maxSnapshots);
      return Promise.all(extra.map(function (x) { return deleteSnapshot(x.id); }));
    });
  }

  function clearAll() {
    try {
      var keys = [];
      for (var i = 0; i < window.localStorage.length; i++) {
        var k = window.localStorage.key(i);
        if (k && k.indexOf(cfg.storagePrefix) === 0) keys.push(k);
      }
      keys.forEach(function (k) { window.localStorage.removeItem(k); });
    } catch (e) { /* localStorage unavailable */ }
    if (idbConn) { try { idbConn.close(); } catch (e) { /* already closed */ } }
    idbConn = null; idbPromise = null;
    if (!idbAvailable()) return Promise.resolve();
    return new Promise(function (resolve) {
      var req = window.indexedDB.deleteDatabase(cfg.idbName);
      req.onsuccess = req.onerror = req.onblocked = function () { resolve(); };
    });
  }

  function estimate() {
    if (navigator.storage && navigator.storage.estimate) {
      return navigator.storage.estimate().catch(function () { return null; });
    }
    return Promise.resolve(null);
  }

  /* Small per-viewer settings (filters, scope) and the demonstration HOD
     approval status (spec 74) live in their own localStorage keys. They are
     conveniences: if storage is blocked the page keeps working without them. */
  function getJson(name, fallback) {
    try {
      var raw = window.localStorage.getItem(cfg.storagePrefix + name);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function setJson(name, value) {
    try { window.localStorage.setItem(cfg.storagePrefix + name, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  YLP.storage = {
    localAvailable: localAvailable, idbAvailable: idbAvailable,
    save: save, load: load,
    addSnapshot: addSnapshot, listSnapshots: listSnapshots, getSnapshot: getSnapshot,
    clearAll: clearAll, estimate: estimate, byteSize: byteSize,
    getPref: function (k, fb) { var p = getJson('prefs', {}); return p.hasOwnProperty(k) ? p[k] : fb; },
    setPref: function (k, v) { var p = getJson('prefs', {}); p[k] = v; return setJson('prefs', p); },
    getApproval: function () { return getJson('approval', { items: {}, reviewer: '', date: '' }); },
    setApproval: function (v) { return setJson('approval', v); }
  };
})(window.YLP);
