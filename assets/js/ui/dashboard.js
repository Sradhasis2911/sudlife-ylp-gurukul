/* ==========================================================================
   Leadership Dashboard (spec 53–55, 17). One filter row scopes every chart
   below it. Uses the metrics set (sample records excluded when actual data
   exists).
   ========================================================================== */
(function (YLP) {
  'use strict';

  var h = YLP.dom.h, byId = YLP.dom.byId, clear = YLP.dom.clear, fmt = YLP.dom.fmt, chip = YLP.dom.chip, D = YLP.dates, M = YLP.model, U = YLP.util;
  var state = { cohort: '', bu: '', drill: null };
  var STATUS_COLOUR = function (s) {
    var P = YLP.charts.PAL;
    return { 'Demonstrating Above Target': P.l4, 'Demonstrating Level 3': P.l3, 'Progressing Toward Level 3': P.l2, 'Priority Development Need': P.l1, 'Insufficient Evidence': P.noev }[s] || P.na;
  };
  var AVAIL_SHORT = ['Master', 'Current KRA', 'Prev. KRA', 'Role', 'Baseline', 'Current comp.', 'Manager', 'Project ev.', 'Current prog.', 'Prev. rating', 'Aspiration', 'Mentor', 'IDP', 'Feedback'];

  function card(title, lead, body, cls) {
    return h('div', { 'class': 'dash-card' + (cls ? ' ' + cls : '') }, [h('h3', { text: title }), lead ? h('p', { 'class': 'lead', text: lead }) : null].concat(body));
  }
  function countBy(vs, fn, order) {
    var g = U.groupBy(vs, fn);
    var keys = Object.keys(g);
    if (order) keys.sort(function (a, b) { var ia = order.indexOf(a), ib = order.indexOf(b); return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b); });
    else keys.sort(function (a, b) { return g[b].length - g[a].length || a.localeCompare(b); });
    return keys.map(function (k) { return { label: k, value: g[k].length }; });
  }
  function topN(rows, n) {
    if (rows.length <= n) return rows;
    var head = rows.slice(0, n - 1), rest = rows.slice(n - 1);
    return head.concat([{ label: 'Other (' + rest.length + ' departments)', value: rest.reduce(function (t, r) { return t + r.value; }, 0) }]);
  }

  function heatColour(dom) {
    var P = YLP.charts.PAL;
    if (dom.insufficient || dom.band === null) return P.noev;
    return dom.band >= 4 ? P.l4 : dom.band === 3 ? P.l3 : dom.band === 2 ? P.l2 : P.l1;
  }

  function heatmap(vs, d) {
    var doms = d.fw.domains;
    var head = h('tr', null, [h('th', { scope: 'col', text: 'Participant' })].concat(doms.map(function (x) { return h('th', { scope: 'col', text: x.short }); })).concat([h('th', { scope: 'col', text: 'Overall' })]));
    var body = h('tbody');
    vs.forEach(function (v) {
      var row = h('tr', null, [h('th', { scope: 'row' }, (function () { var b = h('button', { type: 'button', 'class': 'linklike', text: v.name }); b.addEventListener('click', function () { YLP.profile.open(v.id); }); return b; })())]);
      v.competency.domains.forEach(function (dm, i) {
        var col = heatColour(dm), ink = YLP.dom.inkOn(col);
        var label = dm.insufficient ? (dm.assessmentStatus === 'Not assessed' ? 'No Evidence' : 'Insufficient') : 'Level ' + dm.band;
        var btn = h('button', { type: 'button', 'class': 'cellbtn', 'aria-expanded': state.drill && state.drill.id === v.id && state.drill.i === i ? 'true' : 'false', 'aria-label': v.name + ', ' + dm.name + ': ' + (dm.score === null ? label : dm.score.toFixed(2) + ', ' + label) + (dm.overdueCount ? ', assessment overdue' : '') + '. Show anchors.' }, [
          h('span', { text: dm.score === null ? '—' : dm.score.toFixed(2) }), h('small', { text: label }), dm.overdueCount ? h('small', { text: 'Assessment Overdue' }) : null
        ]);
        btn.style.background = col; btn.style.color = ink;
        btn.addEventListener('click', function () {
          state.drill = state.drill && state.drill.id === v.id && state.drill.i === i ? null : { id: v.id, i: i };
          render(d);
          var again = YLP.dom.qs('#heat-' + v.id.replace(/[^A-Za-z0-9_-]/g, '') + '-' + i);
          if (again) again.focus();
        });
        btn.id = 'heat-' + v.id.replace(/[^A-Za-z0-9_-]/g, '') + '-' + i;
        row.appendChild(h('td', { 'class': 'cell' }, btn));
      });
      row.appendChild(h('td', { 'class': 'cell' }, [h('strong', { text: v.competency.score === null ? '—' : v.competency.score.toFixed(2) }), h('div', { 'class': 'small', text: v.competency.status })]));
      body.appendChild(row);
      if (state.drill && state.drill.id === v.id) {
        var dm = v.competency.domains[state.drill.i];
        body.appendChild(h('tr', { 'class': 'drill' }, h('td', { colspan: doms.length + 2 }, [
          h('strong', { text: dm.name + ' anchors for ' + v.name + ': ' }),
          h('ul', { 'class': 'issue-list' }, dm.anchors.map(function (a) { return h('li', null, [YLP.profile.anchorChip(a), h('span', { text: a.anchor + (a.overdue ? ' (assessment overdue since ' + D.display(a.nextReviewDate) + ')' : '') })]); }))
        ])));
      }
    });
    return h('div', { 'class': 'table-wrap heat' }, h('table', null, [h('caption', { text: 'Competency heat map: participants by domain. Select a cell for anchor-level detail.' }), h('thead', null, head), body]));
  }

  function heatLegend() {
    var P = YLP.charts.PAL;
    var items = [[P.noev, 'No Evidence / Insufficient'], [P.l1, 'Level 1'], [P.l2, 'Level 2'], [P.l3, 'Level 3'], [P.l4, 'Level 4'], [P.l4, 'Level 5']];
    var ul = h('ul', { 'class': 'legend' }, items.map(function (x) { return h('li', null, [h('span', { 'class': 'swatch', 'data-color': x[0] }), x[1]]); }));
    ul.appendChild(h('li', { text: '"Assessment Overdue" is shown in the cell when a review date has passed without a later validated assessment.' }));
    return ul;
  }

  function equity(vs) {
    var defs = [
      ['noProject', 'Without a cross-functional project', M.copy.mandatoryPending],
      ['noMentor', 'Without a mentor', 'Mentor status is not Allocated'],
      ['noImmersion', 'Without business immersion', 'No business or functional immersion assigned'],
      ['noSponsorFeedback', 'Without sponsor feedback', 'No sponsor feedback recorded'],
      ['transactional', 'Predominantly transactional KRAs', M.copy.systemSuggestion],
      ['limitedCrossFunctional', 'Limited cross-functional exposure', 'Fewer than two exposure signals'],
      ['overdueAssessment', 'Overdue assessments', 'Review date passed without a later validated assessment'],
      ['insufficientEvidence', 'Insufficient evidence', 'Readiness category is Insufficient Evidence'],
      ['incompleteIDP', 'Incomplete IDPs', 'IDP not started or overdue']
    ];
    return h('div', { 'class': 'equity-grid' }, defs.map(function (df) {
      var who = vs.filter(function (v) { return v.exposure[df[0]]; });
      var chips = h('div', { 'class': 'person-chips' });
      who.forEach(function (v) { var b = h('button', { type: 'button', 'class': 'person-chip', text: v.name }); b.addEventListener('click', function () { YLP.profile.open(v.id); }); chips.appendChild(b); });
      return h('div', { 'class': 'equity' }, [h('div', { 'class': 'count', text: String(who.length) }), h('h4', { text: df[1] }), h('p', { 'class': 'small muted', text: df[2] }), who.length ? chips : h('p', { 'class': 'small', text: 'None.' })]);
    }));
  }

  function alerts(vs) {
    var rows = [];
    vs.forEach(function (v) { v.alerts.forEach(function (a) { rows.push({ v: v, a: a }); }); });
    rows.sort(function (x, y) { return (x.a.kind === 'error' ? 0 : 1) - (y.a.kind === 'error' ? 0 : 1) || x.v.name.localeCompare(y.v.name); });
    if (!rows.length) return h('p', { text: 'No development-risk alerts.' });
    return h('ul', { 'class': 'issue-list' }, rows.map(function (r) {
      var b = h('button', { type: 'button', 'class': 'linklike', text: r.v.name });
      b.addEventListener('click', function () { YLP.profile.open(r.v.id); });
      return h('li', null, [chip(r.a.kind, r.a.kind === 'error' ? 'Priority' : 'Attention'), h('span', null, [b, ': ' + r.a.text])]);
    }));
  }

  function pipeline(vs) {
    var rows = M.readiness.map(function (r) { return { label: r, value: vs.filter(function (v) { return v.readiness.category === r; }).length }; });
    var advanced = vs.filter(function (v) { return v.readiness.category === 'Demonstrating Level 3' || v.readiness.category === 'Ready for Broader Exposure'; });
    var pathRows = Object.keys(M.pipelinePathways).map(function (k) {
      var list = advanced.filter(function (v) { return v.pathway === k; });
      return [M.pipelinePathways[k], String(list.length), list.map(function (v) { return v.name; }).join(', ') || '—'];
    });
    return [
      YLP.charts.bars(rows, { title: 'Leadership pipeline by readiness category', unit: 'participants', labelHeader: 'Readiness category', valueHeader: 'Participants', summary: rows.map(function (r) { return r.label + ' ' + r.value; }).join('; ') + '.' }),
      YLP.charts.dataTable('Pathways of participants demonstrating Level 3 or ready for broader exposure', ['Pathway', 'Participants', 'Names'], pathRows),
      h('p', { 'class': 'small muted', text: 'High Potential, Promotion Ready and Successor Ready are not used: no formally calibrated, authorised evidence has been uploaded. ' + M.copy.disclaimer })
    ];
  }

  function availabilityMatrix(vs) {
    var head = h('tr', null, [h('th', { scope: 'col', text: 'Participant' })].concat(AVAIL_SHORT.map(function (x, i) { return h('th', { scope: 'col', title: vs[0] ? vs[0].availability.items[i].name : x, text: x }); })).concat([h('th', { scope: 'col', 'class': 'num', text: 'Available' })]));
    var body = h('tbody', null, vs.map(function (v) {
      return h('tr', null, [h('th', { scope: 'row', text: v.name })].concat(v.availability.items.map(function (it) {
        return h('td', { title: it.name + ': ' + it.status + (it.note ? ' (' + it.note + ')' : '') }, [YLP.profile.availIcon(it.status), h('span', { 'class': 'visually-hidden', text: it.name + ': ' + it.status })]);
      })).concat([h('td', { 'class': 'num', text: v.availability.available + '/' + v.availability.applicable })]));
    }));
    var legend = h('ul', { 'class': 'legend' }, M.availabilityStatuses.map(function (s) { return h('li', null, [YLP.profile.availIcon(s), s]); }));
    return [h('div', { 'class': 'table-wrap avail' }, h('table', null, [h('caption', { text: 'Data availability by participant (14 items)' }), h('thead', null, head), body])), legend];
  }

  function render(d) {
    var root = clear(byId('dashboard-root'));
    var cohorts = U.uniq(d.metric.map(function (v) { return U.text(v.p.Cohort); })).sort();
    var bus = U.uniq(d.metric.map(function (v) { return U.text(v.p.BusinessUnit); })).sort();
    if (cohorts.indexOf(state.cohort) === -1) state.cohort = '';
    if (bus.indexOf(state.bu) === -1) state.bu = '';
    var vs = d.metric.filter(function (v) { return (!state.cohort || v.p.Cohort === state.cohort) && (!state.bu || v.p.BusinessUnit === state.bu); });

    var fc = h('select', { id: 'db-cohort' }, [h('option', { value: '', text: 'All cohorts' })].concat(cohorts.map(function (c) { return h('option', { value: c, selected: state.cohort === c ? true : null, text: c }); })));
    var fb = h('select', { id: 'db-bu' }, [h('option', { value: '', text: 'All business units' })].concat(bus.map(function (c) { return h('option', { value: c, selected: state.bu === c ? true : null, text: c }); })));
    fc.addEventListener('change', function () { state.cohort = fc.value; render(d); byId('db-cohort').focus(); });
    fb.addEventListener('change', function () { state.bu = fb.value; render(d); byId('db-bu').focus(); });
    var exp = h('button', { type: 'button', 'class': 'btn btn-small', id: 'db-export', text: 'Export Dashboard Data' });
    exp.addEventListener('click', function () { YLP.exporter.exportDashboard(d, YLP.store); });
    root.appendChild(h('div', { 'class': 'filter-row' }, [
      h('div', { 'class': 'field' }, [h('label', { 'for': 'db-cohort', text: 'Cohort' }), fc]),
      h('div', { 'class': 'field' }, [h('label', { 'for': 'db-bu', text: 'Business unit' }), fb]),
      h('p', { 'class': 'muted', role: 'status', text: fmt.plural(vs.length, 'participant') + ' in view.' }), exp
    ]));
    if (!vs.length) { root.appendChild(YLP.dom.alertBox('info', 'No participants match these filters.')); return; }

    var n = vs.length;
    var anchorsTotal = vs.reduce(function (t, v) { return t + v.competency.totalAnchors; }, 0);
    var anchorsValidated = vs.reduce(function (t, v) { return t + v.competency.validatedAnchors; }, 0);
    var assessedAll = vs.filter(function (v) { return v.competency.domains.every(function (x) { return !x.insufficient; }); }).length;
    var completedItems = 0, withEvidence = 0;
    vs.forEach(function (v) {
      var items = v.activities.filter(function (a) { return U.isCompleted(a.Status); }).concat(v.actions.filter(function (a) { return U.isCompleted(a.Status); }));
      completedItems += items.length; withEvidence += items.filter(function (a) { return U.has(a.Evidence); }).length;
    });
    var avg = function (fn) { return U.mean(vs.map(fn)) || 0; };
    var compBands = [['Below 50%', 0, 50], ['50% to 79%', 50, 80], ['80% and above', 80, 101]].map(function (b) { return { label: b[0], value: vs.filter(function (v) { return v.progress.completeness >= b[1] && v.progress.completeness < b[2]; }).length }; });

    var grid = h('div', { 'class': 'dash-grid' }, [
      card('Cohort distribution', null, [YLP.charts.bars(countBy(vs, function (v) { return U.text(v.p.Cohort) || 'Not recorded'; }, ['FY2025', 'FY2026']), { title: 'Participants by cohort', unit: 'participants', labelHeader: 'Cohort', valueHeader: 'Participants' })]),
      card('Business-unit distribution', null, [YLP.charts.bars(countBy(vs, function (v) { return U.text(v.p.BusinessUnit) || 'Not recorded'; }), { title: 'Participants by business unit', unit: 'participants', labelHeader: 'Business unit', valueHeader: 'Participants' })]),
      card('Department distribution', null, [YLP.charts.bars(topN(countBy(vs, function (v) { return U.text(v.p.Department) || 'Not recorded'; }), 10), { title: 'Participants by department', unit: 'participants', labelHeader: 'Department', valueHeader: 'Participants' })]),
      card('Journey-stage distribution', 'Where participants are now.', [YLP.charts.bars(M.stages.map(function (s) { return { label: s, value: vs.filter(function (v) { return v.stage === s; }).length }; }), { title: 'Participants by journey stage', unit: 'participants', labelHeader: 'Stage', valueHeader: 'Participants' })]),
      card('Competency status', 'Overall status after the Level 3 rules.', [YLP.charts.bars(M.competencyStatuses.map(function (s) { return { label: s, value: vs.filter(function (v) { return v.competency.status === s; }).length, color: STATUS_COLOUR(s) }; }), { title: 'Participants by competency status', unit: 'participants', labelHeader: 'Status', valueHeader: 'Participants' })]),
      card('70-20-10 completion', 'Average points earned per participant.', [
        YLP.charts.meter('Experience', U.round(avg(function (v) { return v.experience.earned; }), 1), 70, { text: fmt.num(avg(function (v) { return v.experience.earned; }), 1) + ' of 70' }),
        YLP.charts.meter('Developmental relationships', U.round(avg(function (v) { return v.relationships.earned; }), 1), 20, { text: fmt.num(avg(function (v) { return v.relationships.earned; }), 1) + ' of 20' }),
        YLP.charts.meter('Structured learning', U.round(avg(function (v) { return v.learning.earned; }), 1), 10, { text: fmt.num(avg(function (v) { return v.learning.earned; }), 1) + ' of 10' }),
        h('p', { 'class': 'small', text: vs.filter(function (v) { return v.experience.complete; }).length + ' of ' + n + ' have completed the 70% experience component.' })
      ]),
      card('Project allocation', null, [
        YLP.charts.meter('Allocated to a cross-functional project', vs.filter(function (v) { return !!v.mapping; }).length, n, { of: n, tone: vs.some(function (v) { return !v.mapping; }) ? 'warn' : 'ok' }),
        YLP.charts.meter('With recorded individual contribution', vs.filter(function (v) { return v.mapping && U.has(v.mapping.IndividualContribution); }).length, n, { of: n }),
        h('p', { 'class': 'small muted', text: 'Allocation alone is not proof of contribution.' })
      ]),
      card('Project status', 'Participants by the status of their project.', [YLP.charts.bars(countBy(vs, function (v) { return v.project ? (v.project.atRisk ? 'At Risk' : v.project.status) : 'No project'; }, M.projectStatuses.concat(['No project'])), { title: 'Participants by project status', unit: 'participants', labelHeader: 'Project status', valueHeader: 'Participants' })]),
      card('IDP completion', null, [YLP.charts.bars(M.idpStatuses.map(function (s) { return { label: s, value: vs.filter(function (v) { return v.idp.status === s; }).length }; }), { title: 'Participants by IDP status', unit: 'participants', labelHeader: 'IDP status', valueHeader: 'Participants' })]),
      card('Mentoring coverage', null, [
        YLP.charts.meter('Mentor allocated', vs.filter(function (v) { return v.mentorStatus === 'Allocated'; }).length, n, { of: n }),
        YLP.charts.bars(M.mentorStatuses.map(function (s) { return { label: s, value: vs.filter(function (v) { return v.mentorStatus === s; }).length }; }), { title: 'Participants by mentor status', unit: 'participants', labelHeader: 'Mentor status', valueHeader: 'Participants' })
      ]),
      card('Assessment completion', 'Validated, non-self evidence only.', [
        YLP.charts.meter('Anchors with validated evidence', anchorsValidated, anchorsTotal, { of: anchorsTotal }),
        YLP.charts.meter('Participants validated in all five domains', assessedAll, n, { of: n })
      ]),
      card('Evidence completeness', 'Completed activities and IDP actions with evidence attached.', [
        YLP.charts.meter('Completed items with evidence', withEvidence, completedItems || 1, { text: withEvidence + ' of ' + completedItems, tone: completedItems && withEvidence / completedItems < 0.8 ? 'warn' : 'ok' })
      ]),
      card('Data completeness', 'Available evidence weight per participant.', [
        YLP.charts.bars(compBands, { title: 'Participants by data completeness', unit: 'participants', labelHeader: 'Data completeness', valueHeader: 'Participants' }),
        h('p', { 'class': 'small', text: 'Below 50% shows Insufficient Evidence; below 80% is labelled provisional.' })
      ]),
      card('Development-risk alerts', null, [alerts(vs)], 'span-2')
    ]);
    root.appendChild(grid);

    root.appendChild(h('div', { 'class': 'court' }, [h('div', { 'class': 'court-title' }, [h('h3', { text: 'Competency heat map' })]), heatmap(vs, d), heatLegend()]));
    root.appendChild(h('div', { 'class': 'court' }, [h('div', { 'class': 'court-title' }, [h('h3', { text: 'Exposure equity' }), h('span', { 'class': 'muted', text: 'Who is missing the experiences the programme promises' })]), equity(vs)]));
    root.appendChild(h('div', { 'class': 'court' }, [h('div', { 'class': 'court-title' }, [h('h3', { text: 'Leadership pipeline' })])].concat(pipeline(vs))));
    root.appendChild(h('div', { 'class': 'court' }, [h('div', { 'class': 'court-title' }, [h('h3', { text: 'Data availability' }), h('span', { 'class': 'muted', text: 'Missing information is labelled, never converted to zero' })])].concat(availabilityMatrix(vs))));
    if (d.issues.length) {
      root.appendChild(h('p', { 'class': 'small muted admin-only', text: d.issues.length + ' data-quality item(s) are listed in Upload Data, Data quality.' }));
    }
    YLP.charts.paintSwatches(root);
  }

  YLP.views = YLP.views || [];
  YLP.views.push({ name: 'dashboard', render: render });
})(window.YLP);
