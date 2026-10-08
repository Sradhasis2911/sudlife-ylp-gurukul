/* ==========================================================================
   Leadership Competency Mandala (spec 35). Five petals, one per domain.
   Fill reaches the validated domain level; colour follows the brief
   (grey no evidence, red L1, amber L2, green L3, gold L4–5). The gold ring is
   the fixed Level 3 target; the dark arc is the baseline. Every petal also
   carries its number and status in text.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var h = YLP.dom.h, s = YLP.dom.s, byId = YLP.dom.byId, clear = YLP.dom.clear, fmt = YLP.dom.fmt, D = YLP.dates, M = YLP.model, U = YLP.util;
  var state = { who: 'cohort', domain: 0 };

  function colourFor(dom) {
    var P = YLP.charts.PAL;
    if (dom.insufficient || dom.band === null) return P.noev;
    return dom.band >= 4 ? P.l4 : dom.band === 3 ? P.l3 : dom.band === 2 ? P.l2 : P.l1;
  }
  function statusText(dom) {
    if (dom.insufficient || dom.score === null) return dom.noEvidence ? 'No Evidence' : 'Insufficient Evidence';
    return dom.score.toFixed(2) + ' (Level ' + dom.band + ')';
  }

  function sector(cx, cy, r0, r1, a0, a1) {
    var large = a1 - a0 > Math.PI ? 1 : 0;
    var p = function (r, a) { return (cx + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2); };
    return 'M' + p(r0, a0) + 'L' + p(r1, a0) + 'A' + r1 + ' ' + r1 + ' 0 ' + large + ' 1 ' + p(r1, a1) + 'L' + p(r0, a1) + 'A' + r0 + ' ' + r0 + ' 0 ' + large + ' 0 ' + p(r0, a0) + 'Z';
  }
  function arc(cx, cy, r, a0, a1) {
    var p = function (a) { return (cx + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2); };
    return 'M' + p(a0) + 'A' + r + ' ' + r + ' 0 0 1 ' + p(a1);
  }

  /* domains: [{name, short, score, band, baseline, insufficient, noEvidence}] */
  var NARROW = '(max-width: 640px)';
  function isNarrow() { return !!(window.matchMedia && window.matchMedia(NARROW).matches); }

  // Compact layout for phones: a squarer canvas with larger, wrapped labels so the
  // text stays legible once the SVG is scaled down to about 340 px.
  function wrapLabel(t) {
    var i = t.indexOf(' & ');
    return i === -1 ? [t] : [t.slice(0, i + 2), t.slice(i + 3)];
  }

  // Crop the viewBox to the drawn content once the SVG is in the page, so labels
  // render as large as the container allows. Skipped while hidden (getBBox is 0).
  function fitWhenShown(svg) {
    var tries = 0;
    var fit = function () {
      if (!svg.isConnected) { if (++tries < 20) requestAnimationFrame(fit); return; }
      var b; try { b = svg.getBBox(); } catch (e) { return; }
      if (!b || !b.width) { if (++tries < 20) requestAnimationFrame(fit); return; }
      var pad = 8;
      svg.setAttribute('viewBox', [b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2].map(function (n) { return n.toFixed(1); }).join(' '));
    };
    requestAnimationFrame(fit);
  }

  function build(domains, opts) {
    opts = opts || {};
    var compact = opts.compact !== undefined ? opts.compact : isNarrow();
    var W = 760, H = 600, cx = W / 2, cy = H / 2, r0 = compact ? 54 : 70, rMax = compact ? 136 : 190;
    var fs1 = compact ? 25 : 18, fs2 = compact ? 21 : 15, fsC = compact ? 19 : 15;
    var rl = function (l) { return r0 + Math.max(0, Math.min(5, l)) / 5 * (rMax - r0); };
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': opts.label || 'Leadership Competency Mandala' });
    var step = Math.PI * 2 / domains.length, gap = 0.035;
    domains.forEach(function (dom, i) {
      var a0 = -Math.PI / 2 - step / 2 + i * step + gap, a1 = a0 + step - 2 * gap;
      var g = s('g', { 'class': 'petal', tabindex: opts.interactive ? 0 : null, role: opts.interactive ? 'button' : null, 'aria-pressed': opts.interactive ? (opts.selected === i ? 'true' : 'false') : null, 'aria-label': dom.name + ': ' + statusText(dom) + (dom.baseline !== null && dom.baseline !== undefined ? ', baseline ' + dom.baseline.toFixed(2) : '') + ', target Level 3' });
      g.appendChild(s('path', { 'class': 'petal-bg', d: sector(cx, cy, r0, rMax, a0, a1), fill: '#F3E9D3', stroke: '#D4B66A', 'stroke-width': 1 }));
      [1, 2, 4, 5].forEach(function (l) { g.appendChild(s('path', { d: arc(cx, cy, rl(l), a0, a1), fill: 'none', stroke: '#E4D8BE', 'stroke-width': 1 })); });
      var col = colourFor(dom);
      if (dom.insufficient || dom.score === null) g.appendChild(s('path', { d: sector(cx, cy, r0, rMax, a0, a1), fill: col, opacity: 0.55 }));
      else g.appendChild(s('path', { d: sector(cx, cy, r0, rl(dom.score), a0, a1), fill: col }));
      if (dom.baseline !== null && dom.baseline !== undefined) g.appendChild(s('path', { d: arc(cx, cy, rl(dom.baseline), a0 + 0.04, a1 - 0.04), fill: 'none', stroke: '#292723', 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
      // Label outside the petal
      var mid = (a0 + a1) / 2, lr = rMax + (compact ? 22 : 30);
      var lx = cx + lr * Math.cos(mid), ly = cy + lr * Math.sin(mid);
      var anchor = Math.cos(mid) > 0.3 ? 'start' : Math.cos(mid) < -0.3 ? 'end' : 'middle';
      var lines = wrapLabel(dom.short);
      var lh = fs1 + 3, total = lines.length * lh + fs2 + 3;
      // Labels above the centre grow upward, labels below grow downward, side labels centre on the petal.
      var top = Math.sin(mid) < -0.5 ? ly - total + fs1 : Math.sin(mid) > 0.5 ? ly + fs1 * 0.6 : ly - total / 2 + fs1 * 0.8;
      lines.forEach(function (line, k) { g.appendChild(s('text', { x: lx, y: top + k * lh, 'text-anchor': anchor, 'font-size': fs1, 'font-weight': 700, fill: '#3E1116', text: line })); });
      g.appendChild(s('text', { x: lx, y: top + lines.length * lh + 1, 'text-anchor': anchor, 'font-size': fs2, fill: '#292723', text: statusText(dom) }));
      if (opts.interactive) {
        g.addEventListener('click', function () { opts.onSelect(i); });
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onSelect(i); } });
      }
      svg.appendChild(g);
    });
    // Target ring at Level 3
    svg.appendChild(s('circle', { cx: cx, cy: cy, r: rl(3), fill: 'none', stroke: '#C89B3C', 'stroke-width': 2.5, 'pointer-events': 'none' }));
    if (!compact) svg.appendChild(s('text', { x: cx + rl(3) * 0.71 + 6, y: cy - rl(3) * 0.71 - 6, 'font-size': 12, fill: '#5E5850', text: 'Target Level 3' }));
    // Centre
    svg.appendChild(s('circle', { cx: cx, cy: cy, r: r0 - 6, fill: '#5B1D22', stroke: '#C89B3C', 'stroke-width': 2 }));
    var centre = compact ? ['Future', 'SUD Life', 'Leader'] : ['Future SUD Life', 'Leader'];
    var cl = fsC + 3, c0 = cy - (centre.length - 1) * cl / 2 + fsC * 0.35;
    centre.forEach(function (t, k) { svg.appendChild(s('text', { x: cx, y: c0 + k * cl, 'text-anchor': 'middle', 'font-family': YLP.charts.SERIF, 'font-size': fsC, 'font-weight': 700, fill: '#FAF5EA', text: t })); });
    fitWhenShown(svg);
    return svg;
  }

  function legend() {
    var P = YLP.charts.PAL;
    var items = [[P.noev, 'Grey: No Evidence'], [P.l1, 'Red: Level 1'], [P.l2, 'Amber: Level 2'], [P.l3, 'Green: Level 3'], [P.l4, 'Gold: Level 4 or 5']];
    var ul = h('ul', { 'class': 'mandala-legend' }, items.map(function (x) { return h('li', null, [h('span', { 'class': 'swatch', 'data-color': x[0] }), x[1]]); }));
    ul.appendChild(h('li', { text: 'Gold ring: target Level 3' }));
    ul.appendChild(h('li', { text: 'Dark arc: baseline' }));
    return ul;
  }

  /* Cohort aggregate per domain across the metrics set. */
  function cohortDomains(d) {
    return d.fw.domains.map(function (fd, i) {
      var ds = d.metric.map(function (v) { return v.competency.domains[i]; });
      var withScore = ds.filter(function (x) { return x.score !== null; });
      var score = withScore.length ? U.round(U.mean(withScore.map(function (x) { return x.score; })), 2) : null;
      var bases = ds.map(function (x) { return x.baseline; }).filter(function (x) { return x !== null; });
      var dates = ds.map(function (x) { return x.lastAssessmentDate; }).filter(D.isIso).sort();
      var reviews = ds.map(function (x) { return x.nextReviewDate; }).filter(function (x) { return D.isIso(x) && !D.isPast(x); }).sort();
      return {
        name: fd.name, short: fd.short, level3: fd.level3, score: score, band: M.bandFor(score),
        insufficient: withScore.length === 0, noEvidence: ds.every(function (x) { return x.anchors.every(function (a) { return a.recordCount === 0; }); }),
        baseline: bases.length ? U.round(U.mean(bases), 2) : null,
        gap: score !== null ? U.round(3 - score, 2) : null,
        gapCategory: withScore.length ? M.gapCategory(M.bandFor(score)) : 'Insufficient Evidence',
        evidenceCount: ds.reduce(function (n, x) { return n + x.evidenceCount; }, 0),
        lastAssessmentDate: dates.length ? dates[dates.length - 1] : null,
        assessor: U.uniq([].concat.apply([], ds.map(function (x) { return x.assessors; }))).length + ' assessors',
        developmentAction: ds.reduce(function (n, x) { return n + x.developmentActions.length; }, 0) + ' development actions recorded',
        nextReviewDate: reviews[0] || null,
        validation: withScore.length + ' of ' + ds.length + ' participants with validated evidence in this domain',
        assessmentStatus: fmt.plural(ds.filter(function (x) { return x.overdueCount; }).length, 'participant') + ' with overdue assessments',
        distribution: ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'].map(function (lab, j) { return [lab, ds.filter(function (x) { return x.band === j + 1; }).length]; }).concat([['Insufficient Evidence', ds.filter(function (x) { return x.insufficient; }).length]])
      };
    });
  }

  function personDomains(v) {
    return v.competency.domains.map(function (x) {
      return {
        name: x.name, short: x.short, level3: x.level3, score: x.score, band: x.band, insufficient: x.insufficient, noEvidence: x.assessmentStatus === 'Not assessed',
        baseline: x.baseline, gap: x.gap, gapCategory: x.gapCategory, evidenceCount: x.evidenceCount, lastAssessmentDate: x.lastAssessmentDate,
        assessor: x.assessors.join(', ') || 'Not recorded', developmentAction: x.developmentActions.join('; ') || 'None recorded', nextReviewDate: x.nextReviewDate,
        validation: x.validationSummary + (x.pendingCount ? ' (' + x.pendingCount + ' Level 3 indicated, validation pending)' : ''), assessmentStatus: x.assessmentStatus, anchors: x.anchors
      };
    });
  }

  function detailPanel(dom, isPerson) {
    var rows = [
      ['Baseline proficiency', dom.baseline !== null ? dom.baseline.toFixed(2) + ' (Level ' + M.bandFor(dom.baseline) + ')' : 'Not available'],
      ['Current proficiency', dom.score !== null ? dom.score.toFixed(2) + ' (Level ' + dom.band + ')' : 'Insufficient Evidence'],
      ['Target', 'Level 3: ' + M.behaviouralLevel3Label + ' (fixed)'],
      ['Gap to target', dom.gap !== null ? (dom.gap > 0 ? dom.gap.toFixed(2) + ' below target' : dom.gap === 0 ? 'At target' : Math.abs(dom.gap).toFixed(2) + ' above target') : 'Not calculated'],
      ['Status', dom.gapCategory],
      ['Evidence count', fmt.num(dom.evidenceCount)],
      ['Last assessment date', D.display(dom.lastAssessmentDate) || 'Not assessed'],
      ['Assessor', dom.assessor],
      ['Development action', dom.developmentAction],
      ['Next review date', D.display(dom.nextReviewDate) || 'Not scheduled'],
      ['Validation status', dom.validation],
      ['Assessment status', dom.assessmentStatus]
    ];
    var box = h('div', { 'class': 'dash-card', id: 'mandala-detail', 'aria-live': 'polite' }, [
      h('h3', { text: dom.name }),
      h('p', { 'class': 'small muted', text: 'Level 3 means: ' + dom.level3 }),
      h('dl', { 'class': 'kv' }, [].concat.apply([], rows.map(function (r) { return [h('dt', { text: r[0] }), h('dd', { text: r[1] })]; })))
    ]);
    if (isPerson && dom.anchors) {
      box.appendChild(h('div', { 'class': 'table-wrap' }, h('table', null, [
        h('caption', { text: 'Anchors in this domain' }),
        h('thead', null, h('tr', null, ['Anchor', 'Baseline', 'Current', 'Status'].map(function (x) { return h('th', { scope: 'col', text: x }); }))),
        h('tbody', null, dom.anchors.map(function (a) {
          return h('tr', null, [h('th', { scope: 'row', text: a.anchor }), h('td', { 'class': 'num', text: a.baseline !== null ? String(a.baseline) : '—' }), h('td', { 'class': 'num', text: a.current !== null ? String(a.current) : (a.selfLevel !== null ? 'Self ' + a.selfLevel : '—') }), h('td', null, YLP.profile.anchorChip(a))]);
        }))
      ])));
    } else if (dom.distribution) {
      box.appendChild(h('h4', { text: 'Participants by domain level' }));
      box.appendChild(h('ul', null, dom.distribution.map(function (x) { return h('li', { text: x[0] + ': ' + x[1] }); })));
    }
    return box;
  }

  function frameworkReference(d) {
    var wrap = h('div', { 'class': 'court' }, [h('div', { 'class': 'court-title' }, [h('h3', { text: 'Leadership competency framework' }), h('span', { 'class': 'muted', text: 'Framework: ' + d.fw.version + '. ' + d.fw.anchorCount + ' behavioural anchors, common target Level 3: Proficient.' })])]);
    var grid = h('div', { 'class': 'grid grid-2' });
    d.fw.domains.forEach(function (dom, i) {
      var card = h('div', { 'class': 'dash-card' }, [
        h('h4', { text: 'Domain ' + (i + 1) + ': ' + dom.name }),
        h('p', { 'class': 'small', text: 'Level 3 summary: ' + dom.level3 })
      ]);
      dom.anchors.forEach(function (a) {
        card.appendChild(h('details', null, [
          h('summary', { text: a.name }),
          h('p', { 'class': 'small', text: a.definition }),
          a.summary ? h('p', { 'class': 'small muted', text: 'Summary: ' + a.summary }) : null,
          h('ol', { 'class': 'small' }, [1, 2, 3, 4, 5].map(function (l) { return h('li', { 'class': l === 3 ? null : 'hod-skip' }, [h('strong', { text: M.levelNames[l] + ': ' }), a.levels[l]]); }))
        ]));
      });
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    wrap.appendChild(h('p', { 'class': 'small muted', text: 'Behavioural Level 3 (Proficient) is a different scale from KRA rating Level 3 (Meets Expectations). The two are never combined.' }));
    return wrap;
  }

  function render(d) {
    var root = clear(byId('mandala-root'));
    var people = d.views.slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    if (state.who !== 'cohort' && !d.byId[state.who]) state.who = 'cohort';
    var sel = h('select', { id: 'mandala-who' }, [h('option', { value: 'cohort', text: 'Cohort average (metrics set)' })].concat(people.map(function (v) { return h('option', { value: v.id, selected: state.who === v.id ? true : null, text: v.name + ' (' + v.id + ')' + (v.isSample ? ' — sample' : '') }); })));
    sel.addEventListener('change', function () { state.who = sel.value; render(d); byId('mandala-who').focus(); });
    var isPerson = state.who !== 'cohort';
    var doms = isPerson ? personDomains(d.byId[state.who]) : cohortDomains(d);
    var svgEl = build(doms, { interactive: true, selected: state.domain, onSelect: function (i) { state.domain = i; render(d); var p = YLP.dom.qsa('#mandala-root .petal')[i]; if (p) p.focus(); } });
    var v = isPerson ? d.byId[state.who] : null;
    var overall = isPerson ? h('p', null, [h('strong', { text: 'Overall: ' }), v.competency.score !== null ? v.competency.score.toFixed(2) + ' (Level ' + v.competency.band + '), ' : '', v.competency.status, v.competency.level3Blocked ? ' — Level 3 not confirmed: ' + v.competency.blockers.join('; ') : '']) : h('p', { 'class': 'small muted', text: 'Cohort values average each participant’s validated domain score. Participants without validated evidence in a domain are counted separately, never as zero.' });
    root.appendChild(h('div', { 'class': 'court' }, [
      h('div', { 'class': 'filter-row' }, [h('div', { 'class': 'field' }, [h('label', { 'for': 'mandala-who', text: 'Show' }), sel])]),
      h('div', { 'class': 'mandala-wrap' }, [
        h('div', { 'class': 'mandala' }, [svgEl, legend(), overall]),
        detailPanel(doms[state.domain], isPerson)
      ])
    ]));
    root.appendChild(frameworkReference(d));
    YLP.charts.paintSwatches(root);
  }

  YLP.views = YLP.views || [];
  YLP.views.push({ name: 'mandala', render: render });
  // Redraw when the viewport crosses the phone breakpoint (rotation, window resize).
  if (window.matchMedia) {
    var mq = window.matchMedia(NARROW);
    var redraw = function () { if (YLP.store && YLP.store.derived) { render(YLP.store.derived()); if (YLP.profile) YLP.profile.refresh(); } };
    if (mq.addEventListener) mq.addEventListener('change', redraw); else if (mq.addListener) mq.addListener(redraw);
  }
  YLP.mandala = { build: build, legend: legend, personDomains: personDomains, cohortDomains: cohortDomains };
})(window.YLP);
