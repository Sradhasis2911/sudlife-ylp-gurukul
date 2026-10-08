/* ==========================================================================
   Application controller: the store, boot sequence and re-rendering.
   Every data change goes through store.commit(), which saves, bumps the
   version and re-renders every view so dashboards, profiles and filters
   always agree (spec 76).
   ========================================================================== */
(function (YLP) {
  'use strict';

  var TABLES = YLP.schema.ORDER;

  function normaliseDb(db) {
    db = db && typeof db === 'object' ? db : {};
    db.meta = db.meta && typeof db.meta === 'object' ? db.meta : {};
    ['nameMappings', 'idMappings', 'roleMappings', 'classificationOverrides'].forEach(function (k) { if (!db.meta[k] || typeof db.meta[k] !== 'object') db.meta[k] = {}; });
    TABLES.forEach(function (t) { if (!Array.isArray(db[t])) db[t] = []; });
    if (!Array.isArray(db.unmatched)) db.unmatched = [];
    if (!Array.isArray(db.uploadHistory)) db.uploadHistory = [];
    return db;
  }
  function cloneSample() { return normaliseDb(JSON.parse(JSON.stringify(window.YLP_SAMPLE))); }

  var store = {
    db: null, version: 0, where: null, lastSave: null,
    includeSample: !!YLP.storage.getPref('includeSample', false),
    derived: function () { return YLP.derive.run(store.db, store.version, store.includeSample); },
    commit: function (db, message) {
      store.db = normaliseDb(db);
      store.version++;
      return YLP.storage.save(store.db).then(function (res) {
        store.lastSave = res;
        if (res.ok) store.where = res.where;
        renderAll();
        if (message) YLP.shell.announce(message + (res.ok ? '' : '. Warning: not saved to browser storage; export a JSON copy.'));
        return res;
      });
    },
    updateMeta: function (fn, message) {
      var db = JSON.parse(JSON.stringify(store.db));
      fn(db.meta);
      return store.commit(db, message);
    },
    setIncludeSample: function (on) {
      store.includeSample = !!on;
      YLP.storage.setPref('includeSample', store.includeSample);
      store.version++;
      renderAll();
    },
    restoreSnapshot: function (id, label) {
      var current = JSON.parse(JSON.stringify(store.db));
      return YLP.storage.addSnapshot(current, 'Before restoring: ' + label)
        .then(function () { return YLP.storage.getSnapshot(id); })
        .then(function (db) {
          if (!db) throw new Error('Snapshot not found');
          return store.commit(db, 'Restored snapshot: ' + label);
        }).catch(YLP.reportError);
    },
    // Each import records the snapshot taken just before it; the restored
    // data no longer contains that import, so Roll back steps back one at a time.
    rollback: function () {
      var last = store.db.uploadHistory[0];
      if (!last || !last.snapshotId) { YLP.shell.confirm({ title: 'Nothing to roll back', body: 'There is no import with a saved snapshot.', actions: [{ label: 'Close', value: null, kind: 'primary' }] }); return Promise.resolve(); }
      return YLP.storage.listSnapshots().then(function (snaps) {
        if (!snaps.some(function (s) { return s.id === last.snapshotId; })) {
          return YLP.shell.confirm({ title: 'Snapshot no longer kept', body: 'Only the newest ' + YLP.config.maxSnapshots + ' snapshots are kept, and the one for the last import has been removed.', actions: [{ label: 'Close', value: null, kind: 'primary' }] });
        }
        return store.restoreSnapshot(last.snapshotId, 'Before import of ' + last.file);
      }).catch(YLP.reportError);
    },
    resetSample: function () {
      return YLP.shell.confirm({ title: 'Reset to sample data?', body: 'This replaces the current data with the built-in fictional sample. A snapshot is taken first so you can roll back.', actions: [{ label: 'Reset sample data', value: 'yes', kind: 'primary' }, { label: 'Cancel', value: null }] }).then(function (v) {
        if (v !== 'yes') return;
        var snap = YLP.storage.idbAvailable() ? YLP.storage.addSnapshot(JSON.parse(JSON.stringify(store.db)), 'Before sample reset').catch(function () { return null; }) : Promise.resolve(null);
        return snap.then(function () { return store.commit(cloneSample(), 'Sample data restored'); });
      });
    },
    clearLocal: function () {
      return YLP.shell.confirm({
        title: 'Clear local data?',
        body: ['This removes every imported record, snapshot, setting and the approval status saved by this application in this browser. Export a copy first if you may need it.'],
        actions: [{ label: 'Export JSON, then clear', value: 'export', kind: 'primary' }, { label: 'Clear without export', value: 'clear', kind: 'danger' }, { label: 'Cancel', value: null }]
      }).then(function (v) {
        if (!v) return;
        if (v === 'export') YLP.exporter.exportDatabase(store.db);
        return YLP.storage.clearAll().then(function () {
          store.db = cloneSample(); store.version++; store.where = null; store.lastSave = null; store.includeSample = false;
          renderAll();
          YLP.shell.announce('Local data cleared. The built-in sample data is shown and nothing is saved.');
        });
      });
    }
  };
  YLP.store = store;

  function renderAll() {
    var d = store.derived();
    YLP.shell.renderEnv(d, store);
    (YLP.views || []).forEach(function (v) {
      try { v.render(d, store); } catch (err) { YLP.reportError(new Error(v.name + ': ' + (err && err.message))); }
    });
    YLP.profile.refresh();
    YLP.present.refresh();
    document.documentElement.setAttribute('data-version', String(store.version));
  }

  function boot() {
    document.documentElement.classList.add('is-booted');
    window.addEventListener('error', function (e) { YLP.reportError(e.error || e.message); });
    window.addEventListener('unhandledrejection', function (e) { YLP.reportError(e.reason || 'Unhandled promise rejection'); });
    var compat = YLP.compat.run();
    if (compat.degraded) {
      var warn = YLP.dom.byId('boot-warning');
      warn.setAttribute('data-degraded', 'true');
      document.documentElement.classList.remove('is-booted');
    }
    YLP.shell.initNav();
    ['nav-present', 'hero-present'].forEach(function (id) { var b = YLP.dom.byId(id); if (b) b.addEventListener('click', YLP.present.open); });
    store.db = cloneSample();
    Promise.all([
      YLP.libs.init().catch(function () { return null; }),
      YLP.storage.load().catch(function () { return null; })
    ]).then(function (r) {
      var loaded = r[1];
      if (loaded && loaded.db) { store.db = normaliseDb(loaded.db); store.where = loaded.where; }
      store.version++;
      renderAll();
      if (loaded && loaded.error) YLP.shell.announce(loaded.error + '. Sample data is shown instead.');
      document.documentElement.setAttribute('data-ready', 'true');
    }).catch(YLP.reportError);
  }

  YLP.app = { boot: boot, normaliseDb: normaliseDb };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.YLP);
