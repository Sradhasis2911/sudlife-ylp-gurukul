/* ==========================================================================
   Runtime compatibility check (spec section 6).
   Each feature is reported as Supported, Partially Supported or Not Supported.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var S = 'Supported', P = 'Partially Supported', N = 'Not Supported';

  function test(name, fn, required) {
    var status, note = '';
    try {
      var r = fn();
      status = r.status; note = r.note || '';
    } catch (e) {
      status = N; note = e && e.message ? e.message : 'Check failed';
    }
    return { name: name, status: status, note: note, required: required !== false };
  }

  function run() {
    var results = [
      test('JavaScript', function () { return { status: S, note: 'Scripts are running' }; }),
      test('FileReader', function () {
        if (typeof FileReader !== 'function') return { status: N };
        var fr = new FileReader();
        var full = typeof fr.readAsText === 'function' && typeof fr.readAsArrayBuffer === 'function';
        return { status: full ? S : P, note: full ? 'Text and binary reading' : 'Binary reading unavailable; Excel upload disabled' };
      }),
      test('localStorage', function () {
        return YLP.storage.localAvailable() ? { status: S } : { status: N, note: 'Data will last for this session only' };
      }),
      test('IndexedDB', function () {
        return YLP.storage.idbAvailable() ? { status: S, note: 'Used for snapshots and large datasets' } : { status: P, note: 'Rollback snapshots unavailable' };
      }, false),
      test('Blob downloads', function () {
        var blob = typeof Blob === 'function';
        var url = window.URL && typeof URL.createObjectURL === 'function';
        var attr = 'download' in document.createElement('a');
        if (blob && url && attr) return { status: S };
        if (blob && url) return { status: P, note: 'Files may open in a tab instead of downloading' };
        return { status: N };
      }),
      test('Canvas', function () {
        var c = document.createElement('canvas');
        return (c.getContext && c.getContext('2d')) ? { status: S } : { status: N };
      }),
      test('SVG', function () {
        var svg = document.createElementNS && document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        return (svg && typeof svg.createSVGRect === 'function') ? { status: S } : { status: N, note: 'Charts fall back to tables' };
      }),
      test('window.print', function () {
        return typeof window.print === 'function' ? { status: S } : { status: N };
      }),
      test('CSS Grid', function () {
        return (window.CSS && CSS.supports && CSS.supports('display', 'grid')) ? { status: S } : { status: P, note: 'Layout will stack' };
      }),
      test('CSS Flexbox', function () {
        return (window.CSS && CSS.supports && CSS.supports('display', 'flex')) ? { status: S } : { status: N };
      })
    ];

    var context = {
      protocol: location.protocol,
      mode: location.protocol === 'file:' ? 'Opened as a local file' : 'Served from a web host',
      secure: !!window.isSecureContext
    };

    var degraded = results.some(function (r) { return r.required && r.status !== S; });
    return { results: results, context: context, degraded: degraded };
  }

  YLP.compat = {
    run: run, SUPPORTED: S, PARTIAL: P, NOT: N,
    degradedMessage: 'This HTML reader does not support all interactive functions. Open the file in Microsoft Edge, Google Chrome, or Firefox for full functionality.'
  };
})(window.YLP);
