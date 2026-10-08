/* ==========================================================================
   SUD Life YLP Gurukul — shared namespace and configuration.

   All scripts are classic scripts (not ES modules) attached to one global
   object, window.YLP. ES modules are blocked by browsers when a page is
   opened from file://, so this pattern is what lets the same folder run
   by double-clicking index.html AND from GitHub Pages.
   ========================================================================== */
(function (global) {
  'use strict';

  var YLP = global.YLP || {};

  YLP.version = '1.0.0';

  // ?asof=YYYY-MM-DD fixes the evaluation date (overdue rules, current
  // assessment window) for demonstrations and automated tests.
  var asof = null;
  try {
    var m = /[?&]asof=(\d{4}-\d{2}-\d{2})/.exec(global.location.search || '');
    if (m) asof = m[1];
  } catch (e) { asof = null; }

  YLP.config = {
    todayOverride: asof,
    // Every key is prefixed. On GitHub Pages all project sites under one
    // account share a single origin (username.github.io), so unprefixed keys
    // would collide with other projects on the same account.
    storagePrefix: 'ylpGurukul.v1.',
    idbName: 'ylpGurukul.v1',
    maxSnapshots: 10,
    // Chromium allows roughly 5 MB of UTF-16 text per origin in localStorage.
    // 4.5 MB is used as the safe threshold; a warning is shown at 70% of it.
    safeLocalStorageBytes: 4.5 * 1024 * 1024,
    warnRatio: 0.7,
    previewRows: 50
  };

  // Minimal publish/subscribe so every view can re-render after data changes.
  var listeners = {};
  YLP.events = {
    on: function (name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    emit: function (name, payload) {
      (listeners[name] || []).forEach(function (fn) {
        try { fn(payload); } catch (err) { YLP.reportError(err); }
      });
    }
  };

  // Errors are surfaced on the page instead of failing silently.
  YLP.errors = [];
  YLP.reportError = function (err) {
    var msg = (err && err.message) ? err.message : String(err);
    YLP.errors.push(msg);
    var box = global.document && document.getElementById('runtime-errors');
    if (box) {
      box.hidden = false;
      var li = document.createElement('li');
      li.textContent = msg;
      box.querySelector('ul').appendChild(li);
    }
  };

  global.YLP = YLP;
})(window);
