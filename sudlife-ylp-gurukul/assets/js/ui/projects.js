/* ==========================================================================
   Cross-Functional Project Dashboard (spec 51–52).
   ========================================================================== */
(function (YLP) {
  'use strict';

  var h = YLP.dom.h, byId = YLP.dom.byId, clear = YLP.dom.clear, fmt = YLP.dom.fmt, chip = YLP.dom.chip, D = YLP.dates, M = YLP.model, U = YLP.util;

  function metric(value, label) { return h('div', { 'class': 'metric' }, [h('div', { 'class': 'value', text: value }), h('div', { 'class': 'label', text: label })]); }

  function projectCard(pv, d) {
    var p = pv.project;
    var team = h('div', { 'class': 'person-chips' });
    pv.members.forEach(function (m) {
      var name = m.participant ? m.participant.EmployeeName : m.mapping.EmployeeID;
      var b = h('button', { type: 'button', 'class': 'person-chip', text: name + ' (' + (m.participant ? (m.participant.BusinessUnit || m.participant.Department) : 'not in master') + ')' });
      if (d.byId[U.text(m.mapping.EmployeeID)]) b.addEventListener('click', function () { YLP.profile.open(U.text(m.mapping.EmployeeID)); });
      team.appendChild(b);
    });
    if (!pv.members.length) team.appendChild(h('span', { 'class': 'na', text: 'No participants mapped yet' }));
    var checks = h('ul', { 'class': 'checks' }, pv.checks.map(function (c) {
      return h('li', null, [YLP.dom.icon(c.ok ? 'ok' : 'error'), h('span', { text: c.rule + ': ' + c.detail })]);
    }).concat(pv.quality.map(function (c) { return h('li', null, [YLP.dom.icon(c.ok ? 'ok' : 'warn'), h('span', { text: c.rule + (c.ok ? '' : ': not recorded') })]); })));
    YLP.dom.qsa('.icon', checks).forEach(function (ic, i) { var all = pv.checks.concat(pv.quality); ic.setAttribute('class', 'icon ' + (all[i].ok ? 'ok-ico' : i < pv.checks.length ? 'bad-ico' : 'warn-ico')); });
    var ms = pv.milestones.length ? h('ul', { 'class': 'small' }, pv.milestones.map(function (a) {
      var over = pv.overdueMilestones.indexOf(a) !== -1;
      return h('li', null, [U.text(a.ActivityName) + ' — ' + U.text(a.Status) + ', target ' + D.display(a.TargetDate), over ? h('span', null, [' ', chip('error', 'Overdue')]) : null]);
    })) : h('p', { 'class': 'na', text: 'No milestones recorded.' });
    return h('article', { 'class': 'project' }, [
      h('div', { 'class': 'person-chips' }, [
        chip(pv.completed ? 'ok' : pv.atRisk ? 'warn' : /plan/i.test(pv.status) ? 'na' : 'info', pv.atRisk ? pv.status + ' (at risk)' : pv.status),
        chip(pv.validation === 'Valid' ? 'ok' : pv.validation === 'Provisional' ? 'warn' : 'error', 'Validation: ' + pv.validation),
        h('span', { 'class': 'tag', text: pv.theme }), p.IsSample ? h('span', { 'class': 'chip chip-sample', text: 'SAMPLE' }) : null
      ]),
      h('h3', { text: pv.title }),
      h('p', { 'class': 'small muted', text: pv.id + '. ' + U.text(p.BusinessProblem) }),
      YLP.charts.meter('Completion', pv.completion || 0, 100, { suffix: '%', tone: pv.atRisk ? 'warn' : pv.completed ? 'ok' : null }),
      pv.atRisk ? YLP.dom.alertBox('warn', 'At risk: ' + pv.riskReasons.join('; ') + '.') : null,
      h('dl', { 'class': 'kv' }, [
        h('dt', { text: 'Sponsor' }), h('dd', { text: U.text(p.ProjectSponsor) || 'Not recorded' }),
        h('dt', { text: 'YLP adviser' }), h('dd', { text: U.text(p.YLPAdviser) || 'Not recorded' }),
        h('dt', { text: 'Functions' }), h('dd', { text: (pv.functions.join(', ') || 'None') + ' (' + pv.functionSource + ')' }),
        h('dt', { text: 'Dates' }), h('dd', { text: (D.display(p.StartDate) || '—') + ' to ' + (D.display(p.TargetDate) || '—') }),
        h('dt', { text: 'Baseline' }), h('dd', { text: U.text(p.BaselineMeasure) || 'Not defined' }),
        h('dt', { text: 'Expected impact' }), h('dd', { text: U.text(p.TargetImpact) || 'Not defined' }),
        h('dt', { text: 'Actual impact' }), h('dd', { text: U.text(p.ActualImpact) || 'Not yet measured' }),
        h('dt', { text: 'Final project score' }), h('dd', { text: pv.evaluation.score === null ? 'Not yet evaluated' : pv.evaluation.score + ' of 100 (' + pv.evaluation.source + ')' })
      ]),
      h('h4', { text: 'Team' }), team,
      h('h4', { text: 'Requirements' }), checks,
      h('h4', { text: 'Milestones' }), ms
    ]);
  }

  function render(d) {
    var root = clear(byId('projects-root'));
    var ps = d.metricProjects, vs = d.metric;
    var fns = U.uniq([].concat.apply([], ps.map(function (p) { return p.functions; })));
    var sponsorCov = ps.length ? Math.round(ps.filter(function (p) { return U.has(p.project.ProjectSponsor); }).length / ps.length * 100) : null;
    var overdue = ps.reduce(function (n, p) { return n + p.overdueMilestones.length + (!p.closed && D.isPast(U.text(p.project.TargetDate)) ? 1 : 0); }, 0);
    var scores = ps.map(function (p) { return p.evaluation.score; }).filter(function (x) { return x !== null; });
    root.appendChild(h('div', { 'class': 'metric-strip' }, [
      metric(fmt.num(ps.length), 'Total projects'),
      metric(fmt.num(d.kpis.projectsActive), 'Active projects'),
      metric(fmt.num(d.kpis.projectsCompleted), 'Completed projects'),
      metric(fmt.num(d.kpis.projectsAtRisk), 'Projects at risk'),
      metric(fmt.num(fns.length), 'Functions represented'),
      metric(fmt.num(d.kpis.withoutProject), 'Participants without projects'),
      metric(sponsorCov === null ? '—' : sponsorCov + '%', 'Sponsor coverage'),
      metric(fmt.num(overdue), 'Overdue milestones'),
      metric(scores.length ? fmt.num(U.mean(scores), 1) : '—', 'Average panel score (of 100)')
    ]));

    var byTheme = U.groupBy(ps, function (p) { return p.theme; });
    var byStatus = U.groupBy(ps, function (p) { return p.atRisk ? 'At Risk' : p.status; });
    var statusOrder = M.projectStatuses;
    root.appendChild(h('div', { 'class': 'dash-grid' }, [
      h('div', { 'class': 'dash-card' }, [h('h3', { text: 'Projects by theme' }), YLP.charts.bars(Object.keys(byTheme).sort().map(function (k) { return { label: k, value: byTheme[k].length }; }), { title: 'Projects by theme', unit: 'projects', labelHeader: 'Theme', valueHeader: 'Projects' })]),
      h('div', { 'class': 'dash-card' }, [h('h3', { text: 'Projects by status' }), YLP.charts.bars(Object.keys(byStatus).sort(function (a, b) { return statusOrder.indexOf(a) - statusOrder.indexOf(b); }).map(function (k) { return { label: k, value: byStatus[k].length }; }), { title: 'Projects by status', unit: 'projects', labelHeader: 'Status', valueHeader: 'Projects' })]),
      h('div', { 'class': 'dash-card' }, [
        h('h3', { text: 'Project evaluation weights' }),
        YLP.charts.bars(M.projectEvaluation.map(function (x) { return { label: x.name, value: x.weight }; }), { title: 'Project evaluation weights', suffix: '%', noTotal: true, summary: 'Seven dimensions totalling ' + M.sum(M.projectEvaluation, 'weight') + '%. Cross-functional collaboration carries the most weight (20%).', labelHeader: 'Dimension', valueHeader: 'Weight' })
      ]),
      h('div', { 'class': 'dash-card span-3' }, [
        h('h3', { text: 'Expected and actual impact' }),
        YLP.charts.dataTable('Impact by project', ['Project', 'Baseline', 'Expected impact', 'Actual impact'], ps.map(function (p) { return [p.title, U.text(p.project.BaselineMeasure) || '—', U.text(p.project.TargetImpact) || '—', U.text(p.project.ActualImpact) || 'Not yet measured']; }))
      ])
    ]));
    var noProj = vs.filter(function (v) { return !v.mapping; });
    if (noProj.length) root.appendChild(YLP.dom.alertBox('error', M.copy.mandatoryPending + ' for ' + noProj.map(function (v) { return v.name; }).join(', ') + '.'));
    var cards = h('div', { 'class': 'project-cards' });
    ps.forEach(function (pv) { cards.appendChild(projectCard(pv, d)); });
    if (!ps.length) cards.appendChild(h('p', { 'class': 'na', text: 'No projects loaded. Import the Projects and Project Participants datasets in Upload Data.' }));
    root.appendChild(h('h3', { 'class': 'hod-skip', text: 'Projects' }));
    cards.classList.add('hod-skip');
    root.appendChild(cards);
    root.appendChild(h('p', { 'class': 'small muted', text: 'Functions are derived from each member’s business unit in the participant master. Imported FunctionsRepresented is used only when no member’s function is known, and the validation is then Provisional. A project is valid with at least three functions, four to six participants (unless an exception is approved), a sponsor and a YLP adviser.' }));
  }

  YLP.views = YLP.views || [];
  YLP.views.push({ name: 'projects', render: render });
})(window.YLP);
