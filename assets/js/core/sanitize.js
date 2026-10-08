/* ==========================================================================
   Input sanitising for uploaded values.
   - Strips control characters and trims.
   - Caps very long cells.
   - Refuses keys that could pollute object prototypes.
   - Guards CSV exports against spreadsheet formula injection.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
  var UNSAFE_KEYS = ['__proto__', 'constructor', 'prototype'];
  var MAX_CELL = 4000;

  function text(v, max) {
    if (v === null || v === undefined) return '';
    var out = String(v).replace(CONTROL, '').replace(/\r\n?/g, '\n').trim();
    var limit = max || MAX_CELL;
    return out.length > limit ? out.slice(0, limit) : out;
  }

  function isSafeKey(k) { return UNSAFE_KEYS.indexOf(String(k)) === -1; }

  function isBlank(v) { return v === null || v === undefined || (typeof v === 'string' && v.trim() === ''); }

  // A cell starting with = + - @ (or tab/CR) is executed as a formula when a
  // CSV is opened in Excel. Prefix with an apostrophe unless it is a plain number.
  function formulaGuard(v) {
    var str = String(v);
    if (/^[=+\-@\t\r]/.test(str) && !/^[+-]?\d+(\.\d+)?$/.test(str)) return "'" + str;
    return str;
  }

  // Deep-clean a parsed JSON value: drops unsafe keys, sanitises strings.
  function cleanJson(value, depth) {
    depth = depth || 0;
    if (depth > 12) return null;
    if (Array.isArray(value)) return value.map(function (v) { return cleanJson(v, depth + 1); });
    if (value && typeof value === 'object') {
      var out = {};
      Object.keys(value).forEach(function (k) {
        if (isSafeKey(k)) out[text(k, 120)] = cleanJson(value[k], depth + 1);
      });
      return out;
    }
    if (typeof value === 'string') return text(value);
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
    return null;
  }

  YLP.sanitize = { text: text, isSafeKey: isSafeKey, isBlank: isBlank, formulaGuard: formulaGuard, cleanJson: cleanJson };
})(window.YLP);
