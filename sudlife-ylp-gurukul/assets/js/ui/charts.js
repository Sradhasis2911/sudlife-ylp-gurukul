/* ==========================================================================
   Native SVG charts — the primary renderer (spec 4: Chart.js is not used).
   Every chart carries: numeric labels, a written summary, a data table and
   hover/keyboard tooltips. Marks are thin (<= 22px), with 4px rounded data
   ends and a 2px surface gap between touching marks.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var h = YLP.dom.h, s = YLP.dom.s, fmt = YLP.dom.fmt;
  var uid = 0;
  var SURFACE = '#FAF5EA';
  var INK = '#292723', MUTED = '#5E5850', GRID = '#E4D8BE';
  var SERIF = '"Cormorant Garamond", "Palatino Linotype", Palatino, Georgia, serif';
  // Hex values (CSS variables are not reliable inside SVG presentation attributes).
  var PAL = {
    c1: '#9B3440', c2: '#B5832A', c3: '#2A8259', track: '#EFE4CC',
    noev: '#C9C4BA', l1: '#A63A32', l2: '#D49A35', l3: '#497A55', l4: '#C89B3C',
    ok: '#497A55', warn: '#D49A35', error: '#A63A32', na: '#8F8A80', maroon: '#5B1D22'
  };

  function barPath(x, y, w, hgt, r) {
    if (w <= 0) return '';
    r = Math.min(r, w / 2, hgt / 2);
    return 'M' + x + ' ' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + hgt - r) + 'Q' + (x + w) + ' ' + (y + hgt) + ' ' + (x + w - r) + ' ' + (y + hgt) + 'H' + x + 'Z';
  }
  function splitLabel(str, n) {
    if (str.length <= n) return [str];
    var cut = str.lastIndexOf(' ', n);
    if (cut < n * 0.4) cut = n;
    return [str.slice(0, cut).trim(), truncate(str.slice(cut).trim(), n)];
  }
  function truncate(str, n) { str = String(str); return str.length > n ? str.slice(0, n - 1) + '…' : str; }

  // Columns are right-aligned only when every value in them is numeric.
  function dataTable(caption, headers, rows) {
    var numeric = headers.map(function (x, i) { return i > 0 && rows.length > 0 && rows.every(function (r) { return /^[\s\d.,%+\-–\/]*$/.test(String(r[i] === null || r[i] === undefined ? '' : r[i])) && String(r[i]).trim() !== ''; }); });
    return h('div', { 'class': 'table-wrap' }, h('table', null, [
      h('caption', { text: caption }),
      h('thead', null, h('tr', null, headers.map(function (x, i) { return h('th', { scope: 'col', 'class': numeric[i] ? 'num' : null, text: x }); }))),
      h('tbody', null, rows.map(function (r) { return h('tr', null, r.map(function (c, i) { return i === 0 ? h('th', { scope: 'row', text: c }) : h('td', { 'class': numeric[i] ? 'num' : null, text: c }); })); }))
    ]));
  }

  function figure(svg, summary, table, legend) {
    return h('figure', { 'class': 'chart' }, [svg, legend || null, h('figcaption', { text: summary }), h('details', null, [h('summary', { text: 'Show data table' }), table])]);
  }

  /* Horizontal bars. data: [{label, value, color?, display?}] */
  function bars(data, opts) {
    opts = opts || {};
    uid++;
    var tid = 'ct' + uid, did = 'cd' + uid;
    var longest = data.reduce(function (m, d) { return Math.max(m, String(d.label).length); }, 4);
    // Drawn at roughly its display width so text stays 12–15px on screen.
    var width = opts.width || 360, valueW = 44;
    var labelW = Math.min(Math.round(width * 0.48), Math.max(70, longest * 6.9 + 12));
    var maxChars = Math.floor((labelW - 12) / 6.6);
    // Long labels wrap onto two lines instead of being cut.
    var wrap = data.some(function (d) { return String(d.label).length > maxChars; });
    var rowH = wrap ? 38 : 30, thick = Math.min(20, rowH - 12);
    var plotW = width - labelW - valueW;
    var max = opts.max || data.reduce(function (m, d) { return Math.max(m, d.value || 0); }, 0) || 1;
    var height = Math.max(rowH * data.length + 22, 54);
    var summary = opts.summary || defaultSummary(data, opts);
    var svg = s('svg', { viewBox: '0 0 ' + width + ' ' + height, role: 'img', 'aria-labelledby': tid + ' ' + did }, [s('title', { id: tid, text: opts.title || 'Chart' }), s('desc', { id: did, text: summary })]);
    svg.style.maxWidth = Math.round(width * 1.3) + 'px';
    // Baseline + light gridlines at quarters
    [0.25, 0.5, 0.75, 1].forEach(function (q) { svg.appendChild(s('line', { x1: labelW + plotW * q, x2: labelW + plotW * q, y1: 4, y2: height - 18, stroke: GRID, 'stroke-width': 1 })); });
    svg.appendChild(s('line', { x1: labelW, x2: labelW, y1: 4, y2: height - 18, stroke: '#BFAE8A', 'stroke-width': 1 }));
    data.forEach(function (d, i) {
      var y = 8 + i * rowH, w = Math.round((Math.max(d.value || 0, 0) / max) * plotW);
      var shown = d.display !== undefined ? d.display : fmt.num(d.value, opts.dp || 0) + (opts.suffix || '');
      var g = s('g', { 'class': 'mark' });
      g.appendChild(s('rect', { x: 0, y: y, width: width, height: rowH, fill: 'transparent' }));
      var lines = splitLabel(String(d.label), maxChars);
      var tx = s('text', { x: labelW - 10, y: y + rowH / 2, 'text-anchor': 'end', 'dominant-baseline': 'middle', 'font-size': 13, fill: INK });
      if (lines.length === 1) tx.textContent = lines[0];
      else lines.forEach(function (ln, k) { tx.appendChild(s('tspan', { x: labelW - 10, dy: k === 0 ? '-0.55em' : '1.15em', text: ln })); });
      g.appendChild(tx);
      if (w > 0) g.appendChild(s('path', { d: barPath(labelW, y + (rowH - thick) / 2, w, thick, 4), fill: d.color || opts.color || PAL.c1 }));
      g.appendChild(s('text', { x: labelW + w + 8, y: y + rowH / 2, 'dominant-baseline': 'middle', 'font-size': 13, 'font-weight': 700, fill: INK, text: shown }));
      YLP.dom.tooltip(g, shown, d.label + (d.note ? ', ' + d.note : ''));
      svg.appendChild(g);
    });
    svg.appendChild(s('text', { x: labelW, y: height - 4, 'font-size': 11, fill: MUTED, text: '0' }));
    svg.appendChild(s('text', { x: labelW + plotW, y: height - 4, 'font-size': 11, fill: MUTED, 'text-anchor': 'end', text: fmt.num(max, opts.dp || 0) + (opts.suffix || '') }));
    var table = dataTable((opts.title || 'Chart') + ' — data table', [opts.labelHeader || 'Category', opts.valueHeader || 'Value'], data.map(function (d) { return [d.label, d.display !== undefined ? d.display : fmt.num(d.value, opts.dp || 0) + (opts.suffix || '')]; }));
    return figure(svg, summary, table, opts.legend ? legend(opts.legend) : null);
  }

  function defaultSummary(data, opts) {
    if (!data.length) return 'No data to display.';
    var total = data.reduce(function (t, d) { return t + (d.value || 0); }, 0);
    var top = data.slice().sort(function (a, b) { return (b.value || 0) - (a.value || 0); })[0];
    var unit = opts.unit ? ' ' + opts.unit : '';
    return (opts.noTotal ? '' : fmt.num(total) + unit + ' across ' + fmt.plural(data.length, 'category', 'categories') + '. ') + 'Largest: ' + top.label + ' (' + (top.display !== undefined ? top.display : fmt.num(top.value, opts.dp || 0) + (opts.suffix || '')) + ').';
  }

  function legend(items) {
    return h('ul', { 'class': 'legend' }, items.map(function (it) {
      return h('li', null, [h('span', { 'class': 'swatch', 'data-color': it.color }, null), it.label]);
    }));
  }

  /* One horizontal part-to-whole bar. segments: [{label, value, color}] */
  function stacked(segments, opts) {
    opts = opts || {};
    uid++;
    var tid = 'ct' + uid, did = 'cd' + uid;
    var width = opts.width || 380, barH = 26, height = 60;
    var total = segments.reduce(function (t, x) { return t + (x.value || 0); }, 0) || 1;
    var summary = opts.summary || segments.map(function (x) { return x.label + ' ' + fmt.num(x.value, opts.dp || 0) + (opts.suffix || ''); }).join('; ') + '.';
    var svg = s('svg', { viewBox: '0 0 ' + width + ' ' + height, role: 'img', 'aria-labelledby': tid + ' ' + did }, [s('title', { id: tid, text: opts.title || 'Chart' }), s('desc', { id: did, text: summary })]);
    svg.style.maxWidth = Math.round(width * 1.3) + 'px';
    var scaleMax = opts.max || total, x = 0;
    segments.forEach(function (seg, i) {
      var w = (seg.value || 0) / scaleMax * width;
      if (w <= 0) return;
      var gap = i < segments.length - 1 ? 2 : 0;
      var g = s('g', { 'class': 'mark' });
      var last = i === segments.length - 1 || x + w >= width - 1;
      g.appendChild(s('path', { d: i === 0 ? (last ? barPath(0, 6, w, barH, 4) : 'M0 6H' + (w - gap) + 'V' + (6 + barH) + 'H0Z') : last ? barPath(x, 6, w, barH, 4) : 'M' + x + ' 6H' + (x + w - gap) + 'V' + (6 + barH) + 'H' + x + 'Z', fill: seg.color }));
      var label = fmt.num(seg.value, opts.dp || 0) + (opts.suffix || '');
      if (w > label.length * 8 + 14) g.appendChild(s('text', { x: x + w / 2, y: 6 + barH / 2, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': 13, 'font-weight': 700, fill: YLP.dom.inkOn(seg.colorHex || seg.color || PAL.c1), text: label }));
      YLP.dom.tooltip(g, label, seg.label);
      svg.appendChild(g);
      x += w;
    });
    if (opts.max && total < opts.max) {
      svg.appendChild(s('path', { d: 'M' + x + ' 6H' + width + 'V' + (6 + barH) + 'H' + x + 'Z', fill: PAL.track }));
    }
    svg.appendChild(s('text', { x: 0, y: height - 6, 'font-size': 11, fill: MUTED, text: '0' }));
    svg.appendChild(s('text', { x: width, y: height - 6, 'font-size': 11, fill: MUTED, 'text-anchor': 'end', text: fmt.num(scaleMax, 0) + (opts.suffix || '') }));
    var table = dataTable((opts.title || 'Chart') + ' — data table', [opts.labelHeader || 'Part', opts.valueHeader || 'Value'], segments.map(function (x2) { return [x2.label, fmt.num(x2.value, opts.dp || 0) + (opts.suffix || '')]; }));
    return figure(svg, summary, table, legend(segments.map(function (x2) { return { label: x2.label + ' (' + fmt.num(x2.value, opts.dp || 0) + (opts.suffix || '') + ')', color: x2.colorHex || x2.color }; })));
  }

  /* Donut. segments: [{label, value, color, colorHex}] */
  function donut(segments, opts) {
    opts = opts || {};
    uid++;
    var tid = 'ct' + uid, did = 'cd' + uid;
    var size = 300, cx = 150, cy = 150, r = 120, inner = 78;
    var total = segments.reduce(function (t, x) { return t + x.value; }, 0) || 1;
    var summary = opts.summary || segments.map(function (x) { return x.label + ' ' + x.value + (opts.suffix || ''); }).join(', ') + '.';
    var svg = s('svg', { viewBox: '0 0 ' + size + ' ' + size, role: 'img', 'aria-labelledby': tid + ' ' + did, 'class': 'donut' }, [s('title', { id: tid, text: opts.title || 'Chart' }), s('desc', { id: did, text: summary })]);
    svg.style.maxWidth = '340px';
    var a0 = -Math.PI / 2;
    segments.forEach(function (seg) {
      var frac = seg.value / total, a1 = a0 + frac * Math.PI * 2;
      var gapA = 0.012;
      var s0 = a0 + gapA, s1 = a1 - gapA, large = s1 - s0 > Math.PI ? 1 : 0;
      var p = 'M' + (cx + r * Math.cos(s0)) + ' ' + (cy + r * Math.sin(s0)) + 'A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + (cx + r * Math.cos(s1)) + ' ' + (cy + r * Math.sin(s1)) +
        'L' + (cx + inner * Math.cos(s1)) + ' ' + (cy + inner * Math.sin(s1)) + 'A' + inner + ' ' + inner + ' 0 ' + large + ' 0 ' + (cx + inner * Math.cos(s0)) + ' ' + (cy + inner * Math.sin(s0)) + 'Z';
      var g = s('g', { 'class': 'mark', 'data-key': seg.key || '' });
      g.appendChild(s('path', { d: p, fill: seg.color }));
      var mid = (a0 + a1) / 2, lr = (r + inner) / 2;
      if (frac > 0.07) g.appendChild(s('text', { x: cx + lr * Math.cos(mid), y: cy + lr * Math.sin(mid), 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': 17, 'font-weight': 700, fill: YLP.dom.inkOn(seg.colorHex || seg.color || PAL.c1), text: seg.value + (opts.suffix || '') }));
      YLP.dom.tooltip(g, seg.value + (opts.suffix || ''), seg.label);
      if (opts.onSelect) { g.setAttribute('role', 'button'); g.style.cursor = 'pointer'; g.addEventListener('click', function () { opts.onSelect(seg); }); g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onSelect(seg); } }); }
      svg.appendChild(g);
      a0 = a1;
    });
    if (opts.centre) {
      svg.appendChild(s('text', { x: cx, y: cy - 8, 'text-anchor': 'middle', 'font-family': SERIF, 'font-size': 30, 'font-weight': 700, fill: '#3E1116', text: opts.centre[0] }));
      svg.appendChild(s('text', { x: cx, y: cy + 18, 'text-anchor': 'middle', 'font-size': 13, fill: MUTED, text: opts.centre[1] }));
    }
    var table = dataTable((opts.title || 'Chart') + ' — data table', [opts.labelHeader || 'Part', opts.valueHeader || 'Value'], segments.map(function (x) { return [x.label, x.value + (opts.suffix || '')]; }));
    return figure(svg, summary, table, legend(segments.map(function (x) { return { label: x.label + ' — ' + x.value + (opts.suffix || ''), color: x.colorHex || x.color }; })));
  }

  /* Small completion ring (returns an <svg>). */
  function ring(pct, label, opts) {
    opts = opts || {};
    var size = 84, c = size / 2, r = 34, w = 7, circ = 2 * Math.PI * r;
    var v = Math.max(0, Math.min(100, pct || 0));
    var svg = s('svg', { viewBox: '0 0 ' + size + ' ' + size, 'class': 'stage-ring', role: 'img', 'aria-label': label + ': ' + Math.round(v) + '%' }, [
      s('circle', { cx: c, cy: c, r: r, fill: 'none', stroke: '#EFE4CC', 'stroke-width': w }),
      s('circle', { cx: c, cy: c, r: r, fill: 'none', stroke: opts.color || PAL.c1, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-dasharray': (circ * v / 100) + ' ' + circ, transform: 'rotate(-90 ' + c + ' ' + c + ')' }),
      s('text', { x: c, y: c + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': 17, 'font-weight': 700, fill: INK, text: Math.round(v) + '%' })
    ]);
    return svg;
  }

  /* HTML meter row: label, value text, bar. */
  function meter(label, value, max, opts) {
    opts = opts || {};
    var pct = max ? Math.max(0, Math.min(100, value / max * 100)) : 0;
    var bar = h('span');
    bar.style.width = pct + '%';
    var text = opts.text || (fmt.num(value, opts.dp || 0) + (opts.suffix || '') + (opts.of ? ' of ' + opts.of : ''));
    return h('div', { 'class': 'meter-row' }, [
      h('span', { text: label }), h('strong', { 'class': 'num', text: text }),
      h('div', { 'class': 'meter', role: 'meter', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': value, 'aria-valuetext': text, 'data-tone': opts.tone || null }, bar)
    ]);
  }

  // Swatches need their colour set through CSSOM (style attributes are blocked by CSP).
  function paintSwatches(root) {
    YLP.dom.qsa('.swatch[data-color]', root).forEach(function (sw) { sw.style.background = sw.getAttribute('data-color'); });
  }

  YLP.charts = { PAL: PAL, SERIF: SERIF, bars: bars, stacked: stacked, donut: donut, ring: ring, meter: meter, dataTable: dataTable, paintSwatches: paintSwatches, barPath: barPath };
})(window.YLP);
