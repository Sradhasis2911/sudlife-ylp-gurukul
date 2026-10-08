/* ==========================================================================
   Gurukul Home (spec 14) and Executive Overview (spec 16).
   ========================================================================== */
(function (YLP) {
  'use strict';

  var h = YLP.dom.h, s = YLP.dom.s, byId = YLP.dom.byId, clear = YLP.dom.clear, fmt = YLP.dom.fmt, icon = YLP.dom.icon, M = YLP.model;

  /* A cusped heritage arch drawn in code: outer arch, multifoil inner arch,
     lattice, a winding path with six lamps (the stages) rising to Uday. */
  function heroArt() {
    var W = 360, H = 430, cx = 180, cy = 196, R = 150, r = 120, lobes = 7;
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, focusable: 'false' });
    var defs = s('defs', null, [
      s('pattern', { id: 'jali', width: 16, height: 16, patternUnits: 'userSpaceOnUse' }, [s('path', { d: 'M8 1L15 8L8 15L1 8Z', fill: 'none', stroke: '#C89B3C', 'stroke-opacity': '0.32', 'stroke-width': 1 })])
    ]);
    svg.appendChild(defs);
    // Multifoil inner arch
    var d = 'M' + (cx - r) + ' ' + H + 'V' + cy;
    for (var k = 0; k < lobes; k++) {
      var t0 = Math.PI - k * Math.PI / lobes, t1 = Math.PI - (k + 1) * Math.PI / lobes;
      var x1 = cx + r * Math.cos(t1), y1 = cy - r * Math.sin(t1);
      var chord = 2 * r * Math.sin(Math.PI / lobes / 2);
      d += 'A' + (chord * 0.62).toFixed(1) + ' ' + (chord * 0.62).toFixed(1) + ' 0 0 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
    }
    d += 'V' + H + 'Z';
    svg.appendChild(s('path', { d: d, fill: 'url(#jali)' }));
    svg.appendChild(s('path', { d: d, fill: 'none', stroke: '#D4B66A', 'stroke-width': 1.6 }));
    svg.appendChild(s('path', { d: 'M' + (cx - R) + ' ' + H + 'V' + cy + 'A' + R + ' ' + R + ' 0 0 1 ' + (cx + R) + ' ' + cy + 'V' + H, fill: 'none', stroke: '#C89B3C', 'stroke-width': 3 }));
    // Keystone: eight-pointed star
    var star = s('g', { transform: 'translate(' + cx + ' ' + (cy - R - 2) + ')' }, [
      s('rect', { x: -10, y: -10, width: 20, height: 20, fill: '#C89B3C' }),
      s('rect', { x: -10, y: -10, width: 20, height: 20, fill: '#D4B66A', transform: 'rotate(45)' }),
      s('circle', { r: 4.5, fill: '#5B1D22' })
    ]);
    svg.appendChild(star);
    // Threshold steps
    [0, 1, 2].forEach(function (i) { svg.appendChild(s('rect', { x: cx - R - 14 - i * 12, y: H - 8 - i * 8, width: 2 * R + 28 + i * 24, height: 3, fill: '#C89B3C', opacity: 0.55 - i * 0.12 })); });
    // Winding path and six lamps
    var pts = [[180, 404], [150, 352], [206, 306], [158, 262], [200, 222], [180, 178]];
    var pd = 'M' + pts[0].join(' ');
    for (var i = 1; i < pts.length; i++) {
      var p0 = pts[i - 1], p1 = pts[i];
      pd += 'C' + p0[0] + ' ' + (p0[1] - 26) + ' ' + p1[0] + ' ' + (p1[1] + 26) + ' ' + p1[0] + ' ' + p1[1];
    }
    svg.appendChild(s('path', { d: pd, fill: 'none', stroke: '#E7D3AE', 'stroke-width': 2, 'stroke-dasharray': '3 7', 'stroke-linecap': 'round' }));
    pts.forEach(function (p, j) {
      var last = j === pts.length - 1;
      var g = s('g', { 'class': 'lamp' }, [
        s('circle', { cx: p[0], cy: p[1], r: last ? 15 : 9, fill: '#C89B3C', opacity: 0.22 }),
        s('circle', { cx: p[0], cy: p[1], r: last ? 8 : 5, fill: last ? '#FAF5EA' : '#C89B3C' })
      ]);
      g.style.setProperty('--i', j);
      svg.appendChild(g);
      var label = s('text', { x: p[0] + (j % 2 ? -18 : 18), y: p[1] + 4, 'text-anchor': j % 2 ? 'end' : 'start', 'font-size': 12.5, fill: '#E7D3AE', 'font-family': YLP.charts.SERIF, text: M.stages[j] });
      svg.appendChild(label);
    });
    return svg;
  }

  function heroStats(d) {
    var k = d.kpis;
    var stats = [
      [fmt.num(k.total), 'Total participants'],
      [fmt.num(k.functions), 'Functions represented'],
      [fmt.num(k.projectsActive), 'Active cross-functional projects'],
      [fmt.num(k.level3), 'Participants demonstrating Level 3'],
      [fmt.num(k.idpCompleted), 'IDPs completed'],
      [k.mentoringCoverage === null ? '—' : k.mentoringCoverage + '%', 'Mentoring coverage']
    ];
    var root = clear(byId('hero-stats'));
    stats.forEach(function (st) { root.appendChild(h('div', { 'class': 'hero-stat' }, [h('div', { 'class': 'value', text: st[0] }), h('div', { 'class': 'label', text: st[1] })])); });
  }

  function kpi(label, value, sub, ico, tone, wide) {
    return h('div', { 'class': 'kpi' + (wide ? ' wide' : ''), 'data-tone': tone || null }, [
      h('div', { 'class': 'label' }, [ico ? icon(ico) : null, h('span', { text: label })]),
      h('div', { 'class': 'value', text: value }),
      sub ? h('div', { 'class': 'sub', text: sub }) : null
    ]);
  }

  function overview(d) {
    var k = d.kpis, root = clear(byId('overview-root'));
    var total = k.total || 0;
    var share = function (n) { return total ? Math.round(n / total * 100) + '% of participants' : ''; };
    var grid = h('div', { 'class': 'courtyard' }, [
      h('div', { 'class': 'centre' }, [h('p', { text: M.copy.overview }), h('p', { 'class': 'small', text: d.scoped ? 'Metrics use actual imported records only.' : d.env === 'SAMPLE' ? 'Showing fictional sample data.' : 'Metrics include every record.' })]),
      kpi('Total active participants', fmt.num(k.total), 'In the metrics set', 'user'),
      kpi('FY2025 cohort', fmt.num(k.fy2025), share(k.fy2025), 'user'),
      kpi('FY2026 cohort', fmt.num(k.fy2026), share(k.fy2026), 'user'),
      kpi('Functions represented', fmt.num(k.functions), 'Distinct business units', 'project'),
      kpi('Active projects', fmt.num(k.projectsActive), 'Of ' + fmt.plural(k.projectsTotal, 'project'), 'project'),
      kpi('Completed projects', fmt.num(k.projectsCompleted), null, 'ok', k.projectsCompleted ? 'ok' : null),
      kpi('Projects at risk', fmt.num(k.projectsAtRisk), 'Status, schedule or target date', 'warn', k.projectsAtRisk ? 'warn' : null),
      kpi('Participants allocated to projects', fmt.num(k.allocated), share(k.allocated), 'project'),
      kpi('Participants without projects', fmt.num(k.withoutProject), k.withoutProject ? M.copy.mandatoryPending : 'Every participant allocated', 'flag', k.withoutProject ? 'error' : 'ok'),
      kpi('Participants with mentors', fmt.num(k.withMentor), share(k.withMentor), 'mentor'),
      kpi('IDPs completed', fmt.num(k.idpCompleted), 'Every action completed', 'idp'),
      kpi('Participants demonstrating Level 3', fmt.num(k.level3), 'Validated, with no critical gaps', 'ok', 'ok'),
      kpi('Participants progressing toward Level 3', fmt.num(k.progressing), k.priority ? fmt.plural(k.priority, 'more participant') + ' with a priority development need' : null, 'pending'),
      kpi('Participants with insufficient evidence', fmt.num(k.insufficient), 'Not converted to zero', 'na', k.insufficient ? 'warn' : null)
    ]);
    var comp = h('div', { 'class': 'kpi wide' }, [
      h('div', { 'class': 'label' }, [icon('info'), h('span', { text: 'Data completeness' })]),
      h('div', { 'class': 'value', text: k.completeness === null ? '—' : k.completeness + '%' }),
      YLP.charts.meter('Average evidence weight available', k.completeness || 0, 100, { suffix: '%', tone: k.completeness < 50 ? 'error' : k.completeness < 80 ? 'warn' : 'ok' })
    ]);
    grid.appendChild(comp);
    root.appendChild(grid);
    root.appendChild(h('p', { 'class': 'disclaimer', text: M.copy.disclaimer }));
  }

  function render(d, store) {
    var art = byId('hero-art');
    if (!art.firstChild) {
      art.appendChild(heroArt());
      // One orchestrated moment: the six lamps light in sequence on first load.
      requestAnimationFrame(function () { requestAnimationFrame(function () { art.classList.add('is-lit'); }); });
    }
    heroStats(d);
    overview(d);
  }

  YLP.views = YLP.views || [];
  YLP.views.push({ name: 'home', render: render });
  YLP.home = { heroArt: heroArt };
})(window.YLP);
