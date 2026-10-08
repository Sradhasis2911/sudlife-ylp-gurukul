/* ==========================================================================
   Small shared helpers for the calculation engine.
   ========================================================================== */
(function (YLP) {
  'use strict';

  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var t = String(v).trim().replace(/%$/, '').replace(/,/g, '');
    if (t === '') return null;
    var n = Number(t);
    return isFinite(n) ? n : null;
  }
  function truthy(v) {
    if (v === true || v === 1) return true;
    if (typeof v === 'string') return /^(y|yes|true|1|validated|done|completed)$/i.test(v.trim());
    return false;
  }
  function text(v) { return v === null || v === undefined ? '' : String(v).trim(); }
  function has(v) { return text(v) !== ''; }
  function round(v, dp) { if (v === null || !isFinite(v)) return null; var f = Math.pow(10, dp === undefined ? 2 : dp); return Math.round(v * f) / f; }
  function mean(list) { var a = list.filter(function (x) { return x !== null && x !== undefined && isFinite(x); }); return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function groupBy(list, keyFn) {
    var out = {};
    (list || []).forEach(function (r) { var k = keyFn(r); if (k === null || k === undefined || k === '') return; (out[k] = out[k] || []).push(r); });
    return out;
  }
  function uniq(list) { return list.filter(function (x, i, a) { return x !== '' && x !== null && x !== undefined && a.indexOf(x) === i; }); }
  function normKey(s) { return String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ''); }
  function isClosed(status) { return YLP.model.closedStatuses.test(text(status)); }
  function isCompleted(status) { return /^(completed|done|closed)$/i.test(text(status)); }
  function isCancelled(status) { return /^cancel/i.test(text(status)); }
  function byDate(field, desc) {
    return function (a, b) {
      var x = a[field] || '', y = b[field] || '';
      if (x === y) return 0;
      return (x < y ? -1 : 1) * (desc ? -1 : 1);
    };
  }

  /* D-32: percentage-based items. Completed (or 100%) without evidence is
     credited at most model.evidenceCap. Cancelled items are excluded. */
  function credit(item, pctField, statusField, evidenceFields) {
    var status = text(item[statusField || 'Status']);
    if (isCancelled(status)) return null;
    var pct = num(item[pctField || 'CompletionPercentage']);
    if (isCompleted(status)) pct = 100;
    if (pct === null) pct = /progress/i.test(status) ? 0 : 0;
    pct = clamp(pct, 0, 100) / 100;
    var evid = (evidenceFields || ['Evidence']).some(function (f) { return has(item[f]); });
    if (pct >= 1 && !evid) return { value: YLP.model.evidenceCap, evidenceMissing: true };
    return { value: pct, evidenceMissing: false };
  }

  YLP.util = { num: num, truthy: truthy, text: text, has: has, round: round, mean: mean, clamp: clamp, groupBy: groupBy, uniq: uniq, normKey: normKey, isClosed: isClosed, isCompleted: isCompleted, isCancelled: isCancelled, byDate: byDate, credit: credit };
})(window.YLP);
