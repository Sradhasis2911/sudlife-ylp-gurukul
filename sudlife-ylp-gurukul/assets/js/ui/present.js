/* ==========================================================================
   HOD Presentation Mode (spec 69). Nine slides built from the current data.
   Upload, administration, technical validation and email fields are hidden.
   Keyboard: arrows / Page Up / Page Down / Home / End, Escape to exit.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var h = YLP.dom.h, byId = YLP.dom.byId, clear = YLP.dom.clear, fmt = YLP.dom.fmt, chip = YLP.dom.chip, D = YLP.dates, M = YLP.model, F = YLP.framework, U = YLP.util;
  var TITLES = ['Program purpose', 'Cohort overview', 'Gurukul journey', '70-20-10 model', 'Leadership competency framework', 'Cross-functional projects', 'Participant journey example', 'Governance', 'Approval requested'];
  var st = { i: 0, el: null, opener: null, release: null };

  function stat(v, l) { return h('div', { 'class': 'big-stat' }, [h('div', { 'class': 'v', text: v }), h('div', { 'class': 'l', text: l })]); }
  function tile(title, text, extra) { return h('div', { 'class': 'tile' }, [h('h3', { text: title }), text ? h('p', { text: text }) : null, extra || null]); }

  function example(d) {
    var order = ['Ready for Broader Exposure', 'Demonstrating Level 3', 'Developing Toward Level 3', 'Foundation Building', 'Insufficient Evidence'];
    return d.metric.slice().sort(function (a, b) {
      return order.indexOf(a.readiness.category) - order.indexOf(b.readiness.category) || (b.progress.completeness - a.progress.completeness) || (b.progress.provisional || 0) - (a.progress.provisional || 0);
    })[0];
  }

  var SLIDES = [
    function (d) {
      return [h('p', { 'class': 'kicker', text: M.copy.name }), h('h2', { text: M.copy.tagline }), h('p', { text: M.copy.subtitle }), h('p', { text: M.copy.statement }),
        h('div', { 'class': 'tiles' }, [
          tile('Functional leadership', 'Leading a function’s work with depth and judgement.'),
          tile('Specialist leadership', 'Becoming the expert others rely on.'),
          tile('Project leadership', 'Delivering cross-functional change.'),
          tile('People leadership', 'Developing and leading teams.'),
          tile('Who joins', 'SUD Life Corporate employees with 0 to 1 year of organisational tenure.'),
          tile('How it works', 'Experience, guidance, reflection and evidence-based capability development.')
        ])];
    },
    function (d) {
      var k = d.kpis;
      return [h('h2', { text: 'Cohort overview' }), h('p', { text: M.copy.overview }),
        h('div', { 'class': 'big-stats' }, [
          stat(fmt.num(k.total), 'Participants'), stat(fmt.num(k.fy2025), 'FY2025 cohort'), stat(fmt.num(k.fy2026), 'FY2026 cohort'), stat(fmt.num(k.functions), 'Functions represented'),
          stat(fmt.num(k.projectsActive), 'Active projects'), stat(fmt.num(k.level3), 'Demonstrating Level 3'), stat(k.mentoringCoverage === null ? '—' : k.mentoringCoverage + '%', 'Mentoring coverage'), stat(k.completeness === null ? '—' : k.completeness + '%', 'Data completeness')
        ]),
        h('p', { 'class': 'note', text: (d.scoped ? 'Actual records only; sample records excluded. ' : d.env === 'SAMPLE' ? 'Fictional sample data. ' : '') + M.copy.disclaimer })];
    },
    function (d) {
      var n = d.metric.length || 1;
      return [h('h2', { text: 'The Gurukul journey' }), h('p', { text: 'Six stages from entering the Gurukul to emerging into broader responsibility.' }),
        h('div', { 'class': 'tiles' }, F.STAGES.map(function (s, i) {
          var here = d.metric.filter(function (v) { return v.stageIndex === i; }).length, reached = d.metric.filter(function (v) { return v.stageIndex >= i; }).length;
          return tile((i + 1) + '. ' + s.name, s.subtitle, h('p', null, [h('strong', { text: here + ' here' }), ', ' + Math.round(reached / n * 100) + '% reached']));
        }))];
    },
    function (d) {
      var P = YLP.charts.PAL;
      var donut = YLP.charts.donut([{ label: '70% Experience', value: 70, color: P.c1, colorHex: P.c1 }, { label: '20% Developmental Relationships', value: 20, color: P.c2, colorHex: P.c2 }, { label: '10% Structured Learning', value: 10, color: P.c3, colorHex: P.c3 }], { title: '70-20-10 model', suffix: '%', centre: ['100', 'points'] });
      return [h('h2', { text: 'The 70-20-10 development model' }),
        h('div', { 'class': 'tiles' }, [
          h('div', { 'class': 'light' }, donut),
          h('div', { 'class': 'light' }, [h('h3', { text: '70 experience points' }), h('ul', null, M.experience70.map(function (c) { return h('li', { text: c.points + ': ' + c.name }); })), h('p', { text: 'The cross-functional project is the largest single part of the model.' })]),
          h('div', { 'class': 'light' }, [h('h3', { text: '20 and 10' }), h('p', { text: 'Twenty points from mentors, managers, sponsors, peers and experts. Ten from structured learning that is applied at work.' }), h('p', { text: d.metric.filter(function (v) { return v.experience.projectPending; }).length + ' participant(s) with ' + M.copy.mandatoryPending + '.' })])
        ])];
    },
    function (d) {
      var svg = YLP.mandala.build(YLP.mandala.cohortDomains(d), { label: 'Cohort competency mandala' });
      return [h('h2', { text: 'Leadership competency framework' }), h('p', { text: 'Five domains with a common behavioural target of Level 3: Proficient. Only validated evidence counts. The mandala shows the cohort average.' }),
        h('div', { 'class': 'split' }, [h('div', { 'class': 'light' }, [svg, YLP.mandala.legend()]), h('div', { 'class': 'stack' }, F.DOMAINS.map(function (dm) { return tile(dm.name, dm.level3); }))])];
    },
    function (d) {
      var ps = d.metricProjects, k = d.kpis;
      return [h('h2', { text: 'Cross-functional projects' }),
        h('div', { 'class': 'big-stats' }, [stat(fmt.num(ps.length), 'Projects'), stat(fmt.num(k.projectsActive), 'Active'), stat(fmt.num(k.projectsCompleted), 'Completed'), stat(fmt.num(k.projectsAtRisk), 'At risk')]),
        h('div', { 'class': 'tiles' }, ps.map(function (p) {
          return tile(p.title, p.functions.join(', ') + '. ' + (p.completion === null ? '' : p.completion + '% complete. ') + (U.text(p.project.ActualImpact) || U.text(p.project.TargetImpact)), h('p', null, [chip(p.completed ? 'ok' : p.atRisk ? 'warn' : 'info', p.atRisk ? 'At risk' : p.status)]));
        }))];
    },
    function (d) {
      var v = example(d);
      if (!v) return [h('h2', { text: 'Participant journey example' }), h('p', { text: 'No participants loaded.' })];
      var svg = YLP.mandala.build(YLP.mandala.personDomains(v), { label: 'Competency mandala for ' + v.name });
      var ev = v.competencyRecords.filter(function (c) { return U.has(c.Evidence) && /^validated$/i.test(U.text(c.ValidationStatus)); }).slice(0, 3).map(function (c) { return c.BehaviouralAnchor + ': ' + c.Evidence; });
      return [h('h2', { text: v.name + (v.isSample ? ' (sample)' : '') }), h('p', { text: v.p.Designation + ', ' + v.p.Department + '. ' + v.p.Cohort + ' cohort, stage ' + v.stage + ', ' + v.pathway + ' pathway.' }),
        h('div', { 'class': 'big-stats' }, [stat(v.progress.insufficient ? '—' : v.progress.provisional + '%', v.progress.label), stat(v.progress.completeness + '%', 'Data completeness'), stat(v.competency.score === null ? '—' : v.competency.score.toFixed(2), 'Competency (validated)'), stat(v.experience.earned + '/70', 'Experience points')]),
        h('div', { 'class': 'split' }, [
          h('div', { 'class': 'light' }, [svg, YLP.mandala.legend()]),
          h('div', { 'class': 'stack' }, [
            tile('Readiness', v.readiness.category + '. ' + v.readiness.reason + '.'),
            tile('Project', v.project ? v.project.title + ' (' + v.project.status + '). ' + U.text(v.mapping.IndividualContribution) : M.copy.mandatoryPending),
            tile('Evidence', ev.slice(0, 2).join(' ') || 'Validated evidence is still being gathered.')
          ])
        ]),
        h('p', { 'class': 'note', text: M.copy.disclaimer })];
    },
    function () {
      return [h('h2', { text: 'Governance' }),
        h('div', { 'class': 'tiles' }, M.governanceRoles.map(function (r) { return tile(r.role, r.does.join('. ') + '.'); })),
        h('p', { text: 'Quarterly: ' + M.quarterlyReviews.map(function (q) { return q.name.toLowerCase(); }).join(', ') + '.' })];
    },
    function () {
      var saved = YLP.storage.getApproval();
      return [h('h2', { text: 'Approval requested' }),
        h('ol', null, M.approvalItems.map(function (it) { var s = saved.items[it] || 'Not Yet Approved'; return h('li', null, [it + ' ', chip(s === 'Approved' ? 'ok' : s === 'Approved with Modifications' ? 'gold' : s === 'Review Required' ? 'warn' : 'na', s)]); })),
        h('p', { 'class': 'kicker', text: M.copy.closing })];
    }
  ];

  function show(i) {
    st.i = Math.max(0, Math.min(SLIDES.length - 1, i));
    var d = YLP.store.derived();
    var stage = clear(byId('present-stage'));
    var slide = h('section', { 'class': 'slide', 'aria-roledescription': 'slide', 'aria-label': (st.i + 1) + ' of ' + SLIDES.length + ': ' + TITLES[st.i] });
    SLIDES[st.i](d).forEach(function (n) { if (n) slide.appendChild(n); });
    stage.appendChild(slide);
    YLP.charts.paintSwatches(stage);
    byId('present-count').textContent = (st.i + 1) + ' of ' + SLIDES.length + ': ' + TITLES[st.i];
    YLP.dom.qsa('#present-dots button').forEach(function (b, j) { if (j === st.i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    byId('present-prev').disabled = st.i === 0;
    byId('present-next').disabled = st.i === SLIDES.length - 1;
    stage.scrollTop = 0;
    var hd = slide.querySelector('h2');
    if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus(); }
  }

  function onKey(e) {
    var k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); show(st.i + 1); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); show(st.i - 1); }
    else if (k === 'Home') { e.preventDefault(); show(0); }
    else if (k === 'End') { e.preventDefault(); show(SLIDES.length - 1); }
  }

  function open() {
    if (st.el) return;
    var d = YLP.store.derived();
    st.opener = document.activeElement;
    var exit = h('button', { type: 'button', 'class': 'btn btn-small btn-ghost', id: 'present-exit', text: 'Exit presentation' });
    var full = h('button', { type: 'button', 'class': 'btn btn-small btn-ghost', id: 'present-full', text: 'Full screen' });
    var prev = h('button', { type: 'button', 'class': 'btn btn-ghost', id: 'present-prev' }, [YLP.dom.icon('prev'), 'Previous']);
    var next = h('button', { type: 'button', 'class': 'btn btn-ivory', id: 'present-next' }, ['Next', YLP.dom.icon('next')]);
    var dots = h('div', { 'class': 'present-dots', id: 'present-dots' }, TITLES.map(function (t, i) { var b = h('button', { type: 'button', 'aria-label': 'Slide ' + (i + 1) + ': ' + t }); b.addEventListener('click', function () { show(i); }); return b; }));
    var badge = h('span', { 'class': 'env-badge', 'data-env': d.env, text: YLP.shell.ENV_LABEL[d.env] });
    st.el = h('div', { 'class': 'present', id: 'present', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'HOD presentation' }, [
      h('div', { 'class': 'present-top' }, [h('span', { 'class': 'present-title', text: M.copy.name }), badge, h('span', { 'class': 'small', text: 'Data as of ' + (D.display(YLP.store.db.meta.dataAsOf) || 'not recorded') }), full, exit]),
      h('div', { 'class': 'present-stage', id: 'present-stage', tabindex: '-1' }),
      h('div', { 'class': 'present-bottom' }, [prev, h('div', null, [dots, h('p', { 'class': 'small', id: 'present-count', 'aria-live': 'polite' })]), next])
    ]);
    exit.addEventListener('click', close);
    prev.addEventListener('click', function () { show(st.i - 1); });
    next.addEventListener('click', function () { show(st.i + 1); });
    full.addEventListener('click', function () {
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (st.el.requestFullscreen) st.el.requestFullscreen();
      } catch (err) { YLP.shell.announce('Full screen is not available in this browser.'); }
    });
    st.el.addEventListener('keydown', onKey);
    document.body.appendChild(st.el);
    document.body.classList.add('is-presenting');
    YLP.dom.qsa('body > *:not(#present)').forEach(function (n) { if (n.tagName !== 'SCRIPT') n.setAttribute('aria-hidden', 'true'); });
    st.release = YLP.dom.trapFocus(st.el, close);
    show(0);
  }

  function close() {
    if (!st.el) return;
    if (st.release) st.release();
    if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) { /* ignore */ } }
    st.el.parentNode.removeChild(st.el);
    st.el = null;
    document.body.classList.remove('is-presenting');
    YLP.dom.qsa('body > [aria-hidden="true"]').forEach(function (n) { if (n.id !== 'profile-print') n.removeAttribute('aria-hidden'); });
    if (st.opener && document.contains(st.opener)) st.opener.focus();
  }

  function refresh() { if (st.el) show(st.i); }

  YLP.present = { open: open, close: close, refresh: refresh, show: show, TITLES: TITLES };
})(window.YLP);
