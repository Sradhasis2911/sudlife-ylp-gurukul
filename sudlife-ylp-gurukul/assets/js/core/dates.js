/* ==========================================================================
   Date handling (spec section 62).
   Internal format: YYYY-MM-DD. Display format: DD MMM YYYY.
   Excel serials are converted exactly (1900 and 1904 date systems).
   Text dates such as 03/04/2025 are never guessed: they are reported as
   ambiguous until the user chooses DD/MM/YYYY or MM/DD/YYYY.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAY_MS = 86400000;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function isoFromParts(y, m, d) {
    if (!(y > 1900 && y < 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
    var dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return y + '-' + pad(m) + '-' + pad(d);
  }

  function monthIndex(name) {
    var key = String(name).slice(0, 3).toLowerCase();
    for (var i = 0; i < 12; i++) if (MONTHS[i].toLowerCase() === key) return i + 1;
    return 0;
  }

  function fullYear(y) {
    var n = parseInt(y, 10);
    if (String(y).length === 2) return n < 70 ? 2000 + n : 1900 + n;
    return n;
  }

  /* Excel serial -> ISO. Serial 60 is Excel's fictitious 29 Feb 1900. */
  function fromExcelSerial(serial, date1904) {
    if (typeof serial !== 'number' || !isFinite(serial) || serial <= 0) return { iso: null, issue: 'Not a valid Excel date value' };
    var whole = Math.floor(serial);
    if (date1904) whole += 1462;
    if (whole === 60) return { iso: null, issue: 'Excel serial 60 is the non-existent 29 Feb 1900' };
    var base = whole < 60 ? Date.UTC(1899, 11, 31) : Date.UTC(1899, 11, 30);
    var dt = new Date(base + whole * DAY_MS);
    return { iso: isoFromParts(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()), issue: null };
  }

  /* Parse a text date.
     preference: 'DMY' | 'MDY' | null. Returns { iso, ambiguous, issue }. */
  function parseText(raw, preference) {
    var str = String(raw === null || raw === undefined ? '' : raw).trim();
    if (!str) return { iso: null, ambiguous: false, issue: 'missing' };
    var m;

    // 2025-04-03 or 2025/04/03 (optionally followed by a time)
    if ((m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[T\s].*)?$/.exec(str))) {
      var iso = isoFromParts(+m[1], +m[2], +m[3]);
      return { iso: iso, ambiguous: false, issue: iso ? null : 'invalid' };
    }
    // 03-Apr-2025, 3 April 2025, 03/Apr/25
    if ((m = /^(\d{1,2})[-\s\/.]([A-Za-z]{3,9})[-\s\/.,]*(\d{2}|\d{4})$/.exec(str))) {
      var mi = monthIndex(m[2]);
      var iso2 = mi ? isoFromParts(fullYear(m[3]), mi, +m[1]) : null;
      return { iso: iso2, ambiguous: false, issue: iso2 ? null : 'invalid' };
    }
    // April 3, 2025
    if ((m = /^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/.exec(str))) {
      var mi2 = monthIndex(m[1]);
      var iso3 = mi2 ? isoFromParts(+m[3], mi2, +m[2]) : null;
      return { iso: iso3, ambiguous: false, issue: iso3 ? null : 'invalid' };
    }
    // 03/04/2025 — the ambiguous family
    if ((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/.exec(str))) {
      var a = +m[1], b = +m[2], y = fullYear(m[3]);
      var dmy = isoFromParts(y, b, a), mdy = isoFromParts(y, a, b);
      if (preference === 'DMY') return { iso: dmy, ambiguous: false, issue: dmy ? null : 'invalid' };
      if (preference === 'MDY') return { iso: mdy, ambiguous: false, issue: mdy ? null : 'invalid' };
      if (dmy && !mdy) return { iso: dmy, ambiguous: false, issue: null, inferred: 'DMY' };
      if (mdy && !dmy) return { iso: mdy, ambiguous: false, issue: null, inferred: 'MDY' };
      if (dmy && mdy && dmy === mdy) return { iso: dmy, ambiguous: false, issue: null };
      if (dmy && mdy) return { iso: null, ambiguous: true, issue: 'ambiguous' };
      return { iso: null, ambiguous: false, issue: 'invalid' };
    }
    return { iso: null, ambiguous: false, issue: 'invalid' };
  }

  function display(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    var p = iso.split('-');
    return p[2] + ' ' + MONTHS[+p[1] - 1] + ' ' + p[0];
  }

  // The evaluation date is the viewer's local date. A ?asof=YYYY-MM-DD query
  // parameter overrides it for demonstrations and automated tests.
  function todayIso() {
    var o = YLP.config && YLP.config.todayOverride;
    if (o) return o;
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function isIso(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v); }
  function toTime(iso) { return isIso(iso) ? Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) : NaN; }
  function daysBetween(a, b) { var t = (toTime(b) - toTime(a)) / DAY_MS; return isFinite(t) ? Math.round(t) : null; }
  function isBefore(a, b) { return isIso(a) && isIso(b) && toTime(a) < toTime(b); }
  function isPast(iso) { return isBefore(iso, todayIso()); }
  function addDays(iso, n) {
    if (!isIso(iso)) return null;
    var d = new Date(toTime(iso) + n * DAY_MS);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  function displayTime(isoDateTime) {
    if (!isoDateTime || isoDateTime.length < 16) return display(isoDateTime);
    return display(isoDateTime.slice(0, 10)) + ', ' + isoDateTime.slice(11, 16);
  }
  function nowStamp() {
    var d = new Date();
    return todayIso() + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  YLP.dates = {
    fromExcelSerial: fromExcelSerial, parseText: parseText, display: display, displayTime: displayTime,
    todayIso: todayIso, nowStamp: nowStamp, isoFromParts: isoFromParts, isIso: isIso,
    daysBetween: daysBetween, isBefore: isBefore, isPast: isPast, addDays: addDays, MONTHS: MONTHS
  };
})(window.YLP);
