/* ==========================================================================
   KRA rules (spec sections 42 and 47).
   - Weight normalisation: 0 < n <= 1 is multiplied by 100; "20%" -> 20;
     20 stays 20. A bare 1 is flagged because it could mean 1% or 100%.
   - Totals are validated per Employee ID + Financial Year.
   - Repeated KRA titles are kept and flagged, never merged.
   ========================================================================== */
(function (YLP) {
  'use strict';

  function round2(x) { return Math.round(x * 100) / 100; }

  function normalizeWeight(raw) {
    if (raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '')) {
      return { value: null, note: 'missing' };
    }
    var n, pct = false;
    if (typeof raw === 'number') {
      n = raw;
    } else {
      var t = String(raw).trim().replace(/,/g, '');
      if (/%$/.test(t)) { pct = true; t = t.replace(/%$/, '').trim(); }
      n = t === '' ? NaN : Number(t);
    }
    if (!isFinite(n)) return { value: null, note: 'not-a-number' };
    if (n < 0) return { value: null, note: 'negative' };
    if (pct) return { value: round2(n), note: 'percent-text' };
    if (n > 0 && n <= 1) return { value: round2(n * 100), note: n === 1 ? 'ambiguous-one' : 'decimal' };
    return { value: round2(n), note: 'as-is' };
  }

  function classifyTotal(total) {
    if (Math.abs(total - 100) < 1e-9) return 'Valid';
    if (total >= 99 && total <= 101) return 'Warning';
    return 'Error';
  }

  function titleKey(name) { return String(name || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  /* Group by EmployeeID + FinancialYear and validate each group. */
  function validateGroups(kras) {
    var groups = {}, order = [];
    kras.forEach(function (k) {
      var key = (k.EmployeeID || '(no ID)') + '|' + (k.FinancialYear || '(no FY)');
      if (!groups[key]) { groups[key] = { employeeID: k.EmployeeID || '', employeeName: k.EmployeeName || '', financialYear: k.FinancialYear || '', items: [] }; order.push(key); }
      groups[key].items.push(k);
    });
    return order.map(function (key) {
      var g = groups[key];
      var total = 0, missing = 0, seen = {}, repeated = [];
      g.items.forEach(function (k) {
        if (typeof k.Weightage === 'number') total += k.Weightage; else missing++;
        var tk = titleKey(k.KRAName);
        if (tk) {
          if (seen[tk] === 1) repeated.push(k.KRAName);
          seen[tk] = (seen[tk] || 0) + 1;
        }
      });
      total = round2(total);
      return {
        employeeID: g.employeeID, employeeName: g.employeeName, financialYear: g.financialYear,
        count: g.items.length, total: total, missingWeights: missing,
        status: missing ? 'Error' : classifyTotal(total),
        repeatedTitles: repeated
      };
    });
  }

  YLP.kra = {
    normalizeWeight: normalizeWeight,
    classifyTotal: classifyTotal,
    validateGroups: validateGroups,
    repeatedTitleMessage: 'Repeated KRA title detected. Review descriptions before consolidation.'
  };
})(window.YLP);
