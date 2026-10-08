/* ==========================================================================
   Optional library loader (spec section 5).

   SheetJS is shipped inside the project (vendor/xlsx.full.min.js) instead of
   being fetched from a CDN, so Excel upload works offline, on an intranet
   and on GitHub Pages alike. If the file is missing or blocked, only the
   Excel control is disabled; CSV and JSON upload keep working.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var EXCEL_UNAVAILABLE = 'Excel processing is unavailable because the approved Excel library could not be loaded. ' +
    'Please upload CSV or JSON files, or open this application in an approved environment where SheetJS is available.';

  function loadScript(src, timeoutMs) {
    return new Promise(function (resolve) {
      var done = false;
      var el = document.createElement('script');
      var timer = setTimeout(function () { finish(false); }, timeoutMs || 8000);
      function finish(ok) { if (done) return; done = true; clearTimeout(timer); resolve(ok); }
      el.src = src;
      el.async = true;
      el.onload = function () { finish(true); };
      el.onerror = function () { finish(false); };
      document.head.appendChild(el);
    });
  }

  var state = { excel: { available: false, version: null, message: 'Checking for the Excel library…' } };

  function init() {
    return loadScript('vendor/xlsx.full.min.js', 8000).then(function (ok) {
      var lib = window.XLSX;
      var usable = ok && lib && typeof lib.read === 'function' && lib.utils && typeof lib.utils.sheet_to_json === 'function';
      state.excel = usable
        ? { available: true, version: lib.version || 'unknown', message: 'Excel (.xlsx) upload is available. SheetJS ' + (lib.version || '') + ' is loaded from this project folder.' }
        : { available: false, version: null, message: EXCEL_UNAVAILABLE };
      return state;
    });
  }

  YLP.libs = { init: init, state: state, EXCEL_UNAVAILABLE: EXCEL_UNAVAILABLE };
})(window.YLP);
