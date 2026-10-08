/* ==========================================================================
   Year-on-year KRA comparison and progression classification (spec 43–44).
   No semantic AI: transparent keyword matching only, always labelled
   "System Suggestion, HR Validation Required".

   Source priority: imported ConfirmedClassification > HR-confirmed override >
   keyword suggestion > Insufficient Data.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var U = YLP.util, M = YLP.model;

  function esc(w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var cache = {};
  function re(word) { return cache[word] || (cache[word] = new RegExp('(^|[^a-z])' + esc(word), 'i')); }

  function textOf(k) { return [k.KRAName, k.KRADescription, k.SMARTGoal, k.KeyParameters].map(U.text).join(' ').toLowerCase(); }
  function matches(k, words) { var t = textOf(k); return words.filter(function (w) { return re(w).test(t); }); }
  function measurable(k) { return /\d|%|\btat\b|turnaround|deadline|\bsla\b|\bby q[1-4]\b|within/i.test(textOf(k)); }

  function weightOf(k, list) {
    var w = U.num(k.Weightage);
    return w !== null ? w : 100 / Math.max(list.length, 1);
  }
  // Share of the KRA set's weight (0–100) whose text matches the test.
  function share(list, test) {
    if (!list.length) return null;
    var total = list.reduce(function (n, k) { return n + weightOf(k, list); }, 0) || 1;
    var hit = list.filter(test).reduce(function (n, k) { return n + weightOf(k, list); }, 0);
    return U.round(hit / total * 100, 0);
  }

  function dimensionRows(prev, curr) {
    var rows = [
      { name: 'Number of KRAs', prev: prev.length, curr: curr.length, unit: '' },
      { name: 'Weight distribution (largest single KRA)', prev: prev.length ? Math.max.apply(null, prev.map(function (k) { return U.num(k.Weightage) || 0; })) : null, curr: curr.length ? Math.max.apply(null, curr.map(function (k) { return U.num(k.Weightage) || 0; })) : null, unit: '%' }
    ];
    M.kraDimensions.forEach(function (d) {
      var test = d.measurable ? measurable : function (k) { return matches(k, d.words).length > 0; };
      rows.push({ name: d.name, prev: share(prev, test), curr: share(curr, test), unit: '% of weight' });
    });
    rows.forEach(function (r) {
      if (r.prev === null || r.curr === null) r.change = 'Insufficient Data';
      else r.change = r.curr > r.prev ? 'Increased' : r.curr < r.prev ? 'Decreased' : 'Unchanged';
    });
    return rows;
  }

  function suggest(prev, curr) {
    if (!prev.length || !curr.length) return { classification: 'Insufficient Data', rationale: 'Both previous and current FY KRAs are needed for a comparison.', words: [] };
    var bu = function (list, f) { return U.uniq(list.map(function (k) { return U.text(k[f]).toLowerCase(); })); };
    var prevBU = bu(prev, 'BusinessUnit'), currBU = bu(curr, 'BusinessUnit'), prevD = bu(prev, 'Department'), currD = bu(curr, 'Department');
    var moved = (prevBU.length && currBU.length && prevBU.join() !== currBU.join()) || (prevD.length && currD.length && prevD.join() !== currD.join());
    if (moved) return { classification: 'Role Transition', rationale: 'Business unit or department differs between the two years (' + (prevD[0] || prevBU[0]) + ' → ' + (currD[0] || currBU[0]) + ').', words: [] };

    var best = null;
    M.kraSuggestionPriority.forEach(function (cls) {
      var words = M.kraKeywords[cls];
      var test = function (k) { return matches(k, words).length > 0; };
      var p = share(prev, test), c = share(curr, test), delta = c - p;
      var found = U.uniq([].concat.apply([], curr.map(function (k) { return matches(k, words); })));
      if (delta >= M.kraSuggestionMinShift && (!best || delta > best.delta)) best = { cls: cls, prev: p, curr: c, delta: delta, words: found };
    });
    if (best) {
      return {
        classification: best.cls, words: best.words,
        rationale: best.cls + ' keywords (' + best.words.slice(0, 4).join(', ') + ') cover ' + best.curr + '% of current FY KRA weight, against ' + best.prev + '% in the previous FY.'
      };
    }
    return { classification: 'Static', rationale: 'No keyword group grew by ' + M.kraSuggestionMinShift + ' or more percentage points of KRA weight between the two years.', words: [] };
  }

  /* emp: participant view; overrides: db.meta.classificationOverrides */
  function compare(prev, curr, employeeID, overrides) {
    var imported = curr.concat(prev).map(function (k) { return U.text(k.ConfirmedClassification); }).filter(Boolean)[0];
    var importedRec = imported ? curr.concat(prev).filter(function (k) { return U.text(k.ConfirmedClassification); })[0] : null;
    var hr = overrides && overrides[employeeID];
    var sys = suggest(prev, curr);
    var result;
    if (imported) result = { classification: imported, source: 'Imported confirmed classification', confirmedBy: U.text(importedRec.ConfirmedBy), confirmationDate: U.text(importedRec.ConfirmationDate), rationale: U.text(importedRec.ClassificationRationale) };
    else if (hr && hr.ConfirmedClassification) result = { classification: hr.ConfirmedClassification, source: 'HR-confirmed classification', confirmedBy: hr.ConfirmedBy, confirmationDate: hr.ConfirmationDate, rationale: hr.ClassificationRationale };
    else if (sys.classification !== 'Insufficient Data') result = { classification: sys.classification, source: M.copy.systemSuggestion, rationale: sys.rationale };
    else result = { classification: 'Insufficient Data', source: 'Not enough KRA data', rationale: sys.rationale };
    result.suggestion = sys;
    result.dimensions = dimensionRows(prev, curr);
    return result;
  }

  // D-52: predominantly transactional current-FY KRA set.
  function transactional(curr) {
    if (!curr.length) return { flag: false, share: null };
    var lt = share(curr, function (k) { return matches(k, M.kraKeywords.Leading.concat(M.kraKeywords.Transforming)).length > 0; });
    var tr = share(curr, function (k) { return matches(k, M.transactionalWords).length > 0; });
    return { flag: tr >= M.transactionalShare && lt === 0, share: tr, leadingShare: lt };
  }

  function crossFunctional(curr) {
    return curr.some(function (k) { return matches(k, M.kraKeywords.Broadening.concat(['cross-functional', 'collaborat', 'inter-department'])).length > 0; });
  }

  YLP.kracompare = { compare: compare, suggest: suggest, transactional: transactional, crossFunctional: crossFunctional, matches: matches, textOf: textOf };
})(window.YLP);
