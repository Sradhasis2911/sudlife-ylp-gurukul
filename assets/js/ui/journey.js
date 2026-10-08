/* ==========================================================================
   Leadership Journey (spec 18–24). A winding path on desktop, a vertical
   path on mobile. Ring = share of participants who have reached the stage
   (D-47); count = participants currently at the stage.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var h = YLP.dom.h, s = YLP.dom.s, byId = YLP.dom.byId, clear = YLP.dom.clear, fmt = YLP.dom.fmt, icon = YLP.dom.icon, M = YLP.model, F = YLP.framework;
  var selected = null, revealed = false;

  // The path runs along the foot of the cards: odd cards stand higher, even
  // cards lower, each joined to its node by a short stem.
  function pathSvg() {
    var W = 1200, xs = [0, 1, 2, 3, 4, 5].map(function (i) { return (i + 0.5) * W / 6; });
    var ys = [32, 92, 32, 92, 32, 92];
    var d = 'M0 62C' + (xs[0] / 2) + ' 62 ' + (xs[0] / 2) + ' ' + ys[0] + ' ' + xs[0] + ' ' + ys[0];
    for (var i = 1; i < 6; i++) {
      var mx = (xs[i - 1] + xs[i]) / 2;
      d += 'C' + mx + ' ' + ys[i - 1] + ' ' + mx + ' ' + ys[i] + ' ' + xs[i] + ' ' + ys[i];
    }
    d += 'C' + ((xs[5] + W) / 2) + ' ' + ys[5] + ' ' + ((xs[5] + W) / 2) + ' 62 ' + W + ' 62';
    var svg = s('svg', { 'class': 'journey-path', viewBox: '0 0 ' + W + ' 120', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' }, [
      s('path', { d: d, fill: 'none', stroke: '#E7D3AE', 'stroke-width': 14, 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }),
      s('path', { d: d, fill: 'none', stroke: '#C89B3C', 'stroke-width': 2, 'stroke-dasharray': '2 9', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' })
    ]);
    return svg;
  }

  function counts(d) {
    var at = M.stages.map(function () { return []; });
    d.metric.forEach(function (v) { if (v.stageIndex >= 0) at[v.stageIndex].push(v); });
    var n = d.metric.length || 1;
    return M.stages.map(function (name, i) {
      var reached = d.metric.filter(function (v) { return v.stageIndex >= i; }).length;
      return { name: name, here: at[i], reached: reached, pct: reached / n * 100 };
    });
  }

  function detail(stage, info, d) {
    var box = h('div', { 'class': 'court stage-detail', id: 'stage-detail', role: 'region', 'aria-label': stage.name + ' details' });
    box.appendChild(h('div', { 'class': 'court-title' }, [h('h3', { text: stage.name + ': ' + stage.subtitle }), h('span', { 'class': 'muted', text: fmt.plural(info.here.length, 'participant') + ' at this stage. ' + Math.round(info.pct) + '% have reached it.' })]));
    var cols = h('div', { 'class': 'cols' });
    cols.appendChild(h('div', null, [h('h4', { text: stage.includesLabel || 'Includes' }), h('ul', null, stage.includes.map(function (x) { return h('li', { text: x }); }))]));
    cols.appendChild(h('div', null, [h('h4', { text: 'Completion evidence' }), h('ul', null, stage.evidence.map(function (x) { return h('li', { text: x }); }))]));
    var people = h('div', null, [h('h4', { text: 'Participants at this stage' })]);
    if (!info.here.length) people.appendChild(h('p', { 'class': 'muted', text: 'No participants are at this stage yet.' }));
    else {
      var chips = h('div', { 'class': 'person-chips' });
      info.here.forEach(function (v) {
        var b = h('button', { type: 'button', 'class': 'person-chip', text: v.name + (v.isSample ? ' (sample)' : '') + (v.stageDerived ? ' *' : '') });
        b.addEventListener('click', function () { YLP.profile.open(v.id); });
        chips.appendChild(b);
      });
      people.appendChild(chips);
      if (info.here.some(function (v) { return v.stageDerived; })) people.appendChild(h('p', { 'class': 'small muted', text: '* Stage not recorded in the participant master; derived from journey activities.' }));
    }
    if (stage.name === 'Uday') {
      var dist = M.readiness.map(function (r) { return { label: r, value: d.metric.filter(function (v) { return v.readiness.category === r; }).length }; });
      people.appendChild(h('h4', { text: 'Development outcomes across the cohort' }));
      people.appendChild(h('ul', null, dist.map(function (x) { return h('li', { text: x.label + ': ' + x.value }); })));
      people.appendChild(h('p', { 'class': 'small muted', text: M.copy.disclaimer }));
    }
    cols.appendChild(people);
    box.appendChild(cols);
    return box;
  }

  function render(d) {
    var root = clear(byId('journey-root'));
    var info = counts(d);
    var wrap = h('div', { 'class': 'journey' });
    var list = h('ol', { 'class': 'journey-stages' });
    F.STAGES.forEach(function (st, i) {
      var li = h('li', { 'class': 'stage' });
      li.style.setProperty('--i', i);
      var card = h('button', { type: 'button', 'class': 'stage-card', 'aria-expanded': selected === i ? 'true' : 'false', 'aria-controls': 'stage-detail' }, [
        icon(st.icon),
        h('span', { 'class': 'stage-num', text: 'Stage ' + (i + 1) + ' of 6' }),
        h('span', { 'class': 'stage-name', text: st.name }),
        h('span', { 'class': 'stage-sub', text: st.subtitle }),
        YLP.charts.ring(info[i].pct, st.name + ' reached'),
        h('span', { 'class': 'stage-count', text: fmt.plural(info[i].here.length, 'participant') + ' here' })
      ]);
      card.querySelector('.icon').setAttribute('class', 'icon stage-icon');
      card.addEventListener('click', function () {
        selected = selected === i ? null : i;
        render(d);
        var det = byId('stage-detail');
        if (det) det.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        var again = YLP.dom.qsa('.stage-card')[i];
        if (again) again.focus();
      });
      li.appendChild(card);
      list.appendChild(li);
    });
    wrap.appendChild(list);
    wrap.appendChild(pathSvg());
    root.appendChild(wrap);
    root.appendChild(h('p', { 'class': 'small muted', text: 'Rings show the share of participants who have reached each stage. Stage is taken from the participant master, or derived from journey activities when not recorded.' }));
    if (selected !== null) root.appendChild(detail(F.STAGES[selected], info[selected], d));

    // Progressive reveal: one orchestrated entrance the first time the journey scrolls into view.
    if (!revealed && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      wrap.classList.add('can-reveal');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { wrap.classList.add('is-revealed'); revealed = true; io.disconnect(); } });
      }, { threshold: 0.2 });
      io.observe(wrap);
    }
  }

  YLP.views = YLP.views || [];
  YLP.views.push({ name: 'journey', render: render });
})(window.YLP);
