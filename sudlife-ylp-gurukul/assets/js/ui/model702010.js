/* ==========================================================================
   Corrected 70-20-10 model (spec 25–28).
   ========================================================================== */
(function (YLP) {
  'use strict';

  var h = YLP.dom.h, byId = YLP.dom.byId, clear = YLP.dom.clear, fmt = YLP.dom.fmt, icon = YLP.dom.icon, M = YLP.model, F = YLP.framework, U = YLP.util;
  var EXP_STEPS = ['#7E2531', '#9B3440', '#B4505B', '#C9737C', '#DB9BA1'];
  var open = { experience: true };

  function avg(list, fn) { var m = U.mean(list.map(fn)); return m === null ? 0 : m; }

  function render(d) {
    var P = YLP.charts.PAL, vs = d.metric;
    var root = clear(byId('model-root'));
    var expAvg = avg(vs, function (v) { return v.experience.earned; });
    var relAvg = avg(vs, function (v) { return v.relationships.earned; });
    var lrnAvg = avg(vs, function (v) { return v.learning.earned; });
    var pending = vs.filter(function (v) { return v.experience.projectPending; });
    var complete70 = vs.filter(function (v) { return v.experience.complete; }).length;

    var segs = [
      { key: 'experience', label: '70% Experience', value: 70, color: P.c1, colorHex: P.c1 },
      { key: 'relationships', label: '20% Developmental Relationships', value: 20, color: P.c2, colorHex: P.c2 },
      { key: 'learning', label: '10% Structured Learning', value: 10, color: P.c3, colorHex: P.c3 }
    ];
    var left = h('div', null, [
      YLP.charts.donut(segs, {
        title: '70-20-10 development model', suffix: '%', centre: ['100', 'development points'],
        summary: 'The model allocates 70 points to experience, 20 to developmental relationships and 10 to structured learning. Select a segment to open its details.',
        onSelect: function (seg) { open = {}; open[seg.key] = true; render(d); var el = byId('model-' + seg.key); if (el) { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); el.querySelector('summary').focus(); } }
      }),
      h('h3', { text: 'The 70 experience points' }),
      YLP.charts.stacked(M.experience70.map(function (c, i) { return { label: c.name, value: c.points, color: EXP_STEPS[i], colorHex: EXP_STEPS[i] }; }), {
        title: 'Breakdown of the 70% experience component', suffix: ' pts',
        summary: 'Cross-functional project 30, current-role stretch 15, lead-without-authority 10, business or functional immersion 10, leadership shadowing or business-review exposure 5. Total 70.'
      })
    ]);

    var cohortRows = [
      ['Experience', expAvg, 70], ['Developmental relationships', relAvg, 20], ['Structured learning', lrnAvg, 10]
    ];
    var right = h('div', null, [
      h('div', { 'class': 'dash-card' }, [
        h('h3', { text: 'Cohort completion' }),
        h('p', { 'class': 'lead', text: 'Average points earned per participant. Completed activities count fully only with evidence.' })
      ].concat(cohortRows.map(function (r) { return YLP.charts.meter(r[0], U.round(r[1], 1), r[2], { text: fmt.num(r[1], 1) + ' of ' + r[2] + ' points' }); })).concat([
        h('p', { 'class': 'small', text: complete70 + ' of ' + vs.length + ' participants have completed the 70% experience component (project, stretch assignment and at least one broader exposure, all with evidence).' }),
        pending.length ? YLP.dom.alertBox('error', M.copy.mandatoryPending + ': ' + pending.map(function (v) { return v.name; }).join(', ') + '.') : YLP.dom.alertBox('ok', 'Every participant has a cross-functional project.')
      ])),
      card('experience', '70', F.MODEL.experience, [
        h('ul', null, M.experience70.map(function (c) { return h('li', null, [h('strong', { text: c.points + ' points — ' }), c.name]); })),
        h('h4', { text: 'Every participant should' }), h('ul', null, F.MODEL.experience.expectations.map(function (x) { return h('li', { text: x }); })),
        h('p', { 'class': 'small', text: 'The 70% experience component is marked complete only when the cross-functional project, a current-role stretch assignment and at least one broader exposure activity are completed with evidence. If no project is assigned the participant shows "' + M.copy.mandatoryPending + '".' }),
        h('h4', { text: 'Tracked for every experiential activity' }), h('p', { 'class': 'small', text: F.MODEL.experience.tracked.join(', ') + '.' })
      ]),
      card('relationships', '20', F.MODEL.relationships, [
        h('ul', null, M.relationshipTracks.map(function (t) { return h('li', null, [t.name + ' — ', h('span', { 'class': 'muted', text: t.planned + ' planned per programme year' })]); })),
        h('h4', { text: 'Tracked for each relationship' }), h('p', { 'class': 'small', text: F.MODEL.relationships.tracked.join(', ') + '.' }),
        h('p', { 'class': 'small', text: 'An interaction counts as completed when it has an evidence note or an agreed action.' })
      ]),
      card('learning', '10', F.MODEL.learning, [
        h('ul', null, M.learningCategories.map(function (c) { return h('li', { text: c.name }); })),
        h('h4', { text: 'Tracked for each learning record' }), h('p', { 'class': 'small', text: F.MODEL.learning.tracked.join(', ') + '.' }),
        h('p', { 'class': 'small', text: 'Completion without application evidence earns half credit; learning hours alone never count.' })
      ])
    ]);

    root.appendChild(h('div', { 'class': 'court' }, h('div', { 'class': 'model-grid' }, [left, right])));
    var rows = M.experience70.map(function (c) {
      var done = vs.filter(function (v) { var comp = v.experience.components.filter(function (x) { return x.key === c.key; })[0]; return comp && comp.status === 'Completed'; }).length;
      return ['70% experience: ' + c.name, c.points, fmt.num(avg(vs, function (v) { return v.experience.components.filter(function (x) { return x.key === c.key; })[0].earned; }), 1), done + ' of ' + vs.length];
    }).concat([
      ['20% Developmental relationships (six tracks)', 20, fmt.num(relAvg, 1), vs.filter(function (v) { return v.relationships.earned >= 20; }).length + ' of ' + vs.length],
      ['10% Structured learning', 10, fmt.num(lrnAvg, 1), vs.filter(function (v) { return v.learning.earned >= 10; }).length + ' of ' + vs.length],
      ['Total', 100, fmt.num(expAvg + relAvg + lrnAvg, 1), '']
    ]);
    var table = h('div', { 'class': 'table-wrap' }, h('table', null, [
      h('caption', { text: '70-20-10 model: points and cohort completion' }),
      h('thead', null, h('tr', null, ['Component', 'Points', 'Cohort average earned', 'Participants complete'].map(function (x, i) { return h('th', { scope: 'col', 'class': i ? 'num' : null, text: x }); }))),
      h('tbody', null, rows.map(function (r) { return h('tr', null, [h('th', { scope: 'row', text: r[0] }), h('td', { 'class': 'num', text: String(r[1]) }), h('td', { 'class': 'num', text: r[2] }), h('td', { 'class': 'num', text: r[3] })]); }))
    ]));
    root.appendChild(h('div', { 'class': 'court' }, [h('h3', { text: 'Model table' }), table]));
    YLP.charts.paintSwatches(root);
  }

  function card(key, big, def, body) {
    var det = h('details', { 'class': 'expand', id: 'model-' + key, open: open[key] ? true : null }, [
      h('summary', null, [h('span', { 'class': 'big', text: big + '%' }), h('div', null, [h('h3', { text: def.title }), h('span', { 'class': 'small muted', text: def.intro })]), icon('next')]),
      h('div', { 'class': 'expand-body' }, body)
    ]);
    det.querySelector('summary .icon').setAttribute('class', 'icon chev');
    det.addEventListener('toggle', function () { open[key] = det.open; });
    return det;
  }

  YLP.views = YLP.views || [];
  YLP.views.push({ name: 'model', render: render });
})(window.YLP);
