/* ==========================================================================
   Participant Gallery (spec 38). Filter, search and sort choices are kept
   for this viewer (localStorage) and re-applied after every data change.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var h = YLP.dom.h, byId = YLP.dom.byId, clear = YLP.dom.clear, fmt = YLP.dom.fmt, chip = YLP.dom.chip, D = YLP.dates, M = YLP.model, U = YLP.util;
  var FILTERS = [
    ['batch', 'Batch', function (v) { return U.text(v.p.Cohort) || 'Not recorded'; }],
    ['bu', 'Business unit', function (v) { return U.text(v.p.BusinessUnit) || 'Not recorded'; }],
    ['dept', 'Department', function (v) { return U.text(v.p.Department) || 'Not recorded'; }],
    ['level', 'Job level', function (v) { return U.text(v.p.JobLevel) || 'Not recorded'; }],
    ['stage', 'Journey stage', function (v) { return v.stage; }],
    ['comp', 'Competency status', function (v) { return v.competency.status; }],
    ['project', 'Project status', function (v) { return v.project ? v.project.status : 'No project'; }],
    ['mentor', 'Mentor status', function (v) { return v.mentorStatus; }],
    ['idp', 'IDP status', function (v) { return v.idp.status; }],
    ['pathway', 'Leadership pathway', function (v) { return v.pathway; }],
    ['completeness', 'Data completeness', function (v) { var c = v.progress.completeness; return c < 50 ? 'Below 50%' : c < 80 ? '50% to 79%' : '80% and above'; }],
    ['record', 'Sample or actual', function (v) { return v.isSample ? 'Sample records' : 'Actual records'; }]
  ];
  var SORTS = [
    ['name', 'Employee name'], ['progress', 'Progress (highest first)'], ['completeness', 'Data completeness (highest first)'],
    ['gap', 'Competency gap (largest first)'], ['joining', 'Joining date (newest first)'], ['stage', 'Journey stage (furthest first)']
  ];
  var ORDERED = { stage: M.stages, comp: M.competencyStatuses, idp: M.idpStatuses, mentor: M.mentorStatuses, pathway: M.pathways, completeness: ['Below 50%', '50% to 79%', '80% and above'] };
  var state = null;

  function loadState() {
    if (state) return state;
    state = YLP.storage.getPref('gallery', null) || {};
    state.filters = state.filters || {};
    state.q = state.q || '';
    state.sort = state.sort || 'name';
    return state;
  }
  function saveState() { YLP.storage.setPref('gallery', state); }

  function filtered(d) {
    var st = loadState(), q = st.q.trim().toLowerCase();
    var out = d.views.filter(function (v) {
      for (var i = 0; i < FILTERS.length; i++) {
        var f = FILTERS[i], want = st.filters[f[0]];
        if (want && f[2](v) !== want) return false;
      }
      if (!q) return true;
      return [v.name, v.id, v.p.Department, v.project ? v.project.title : ''].some(function (x) { return String(x || '').toLowerCase().indexOf(q) !== -1; });
    });
    var key = st.sort;
    out.sort(function (a, b) {
      var val = function (v) {
        if (key === 'progress') return v.progress.insufficient ? -1 : v.progress.provisional;
        if (key === 'completeness') return v.progress.completeness;
        if (key === 'gap') return v.competency.score === null ? -99 : 3 - v.competency.score;
        if (key === 'joining') return v.p.DateOfJoining || '';
        if (key === 'stage') return v.stageIndex;
        return null;
      };
      if (key === 'name') return a.name.localeCompare(b.name);
      var x = val(a), y = val(b);
      if (x === y) return a.name.localeCompare(b.name);
      return x > y ? -1 : 1;
    });
    return out;
  }

  function compChip(v) {
    var s = v.competency.status;
    var kind = /Above/.test(s) ? 'gold' : /Demonstrating/.test(s) ? 'ok' : /Progressing/.test(s) ? 'warn' : /Priority/.test(s) ? 'error' : 'na';
    return chip(kind, s);
  }
  function idpChip(v) { var s = v.idp.status; return chip(s === 'Completed' ? 'ok' : s === 'Overdue' ? 'error' : s === 'Not Started' ? 'na' : 'info', 'IDP: ' + s); }
  function mentorChip(v) { var s = v.mentorStatus; return chip(s === 'Allocated' ? 'ok' : s === 'Pending' ? 'warn' : 'na', 'Mentor: ' + s); }
  function projectChip(v) {
    if (!v.project) return chip('error', M.copy.mandatoryPending);
    var s = v.project.status;
    return chip(v.project.atRisk ? 'warn' : v.project.completed ? 'ok' : 'info', s + ': ' + v.project.title);
  }

  function medallion(v) {
    var url = U.text(v.p.ProfilePhotoURL);
    var m = h('div', { 'class': 'medallion', 'aria-hidden': 'true' });
    if (url && !/^[a-z]+:|^\/\//i.test(url)) m.appendChild(h('img', { src: url, alt: '' }));
    else m.textContent = fmt.initials(v.name);
    return m;
  }

  function card(v) {
    var open = function () { YLP.profile.open(v.id); };
    var nameBtn = h('button', { type: 'button', 'class': 'linklike pcard-name', text: v.name });
    nameBtn.addEventListener('click', open);
    var prog = v.progress;
    var progText = prog.insufficient ? 'Insufficient Evidence' : prog.provisional + '%';
    var dl = h('dl', null, [
      ['Business unit', v.p.BusinessUnit], ['Department', v.p.Department], ['Designation', v.p.Designation], ['Job level', v.p.JobLevel],
      ['Joined', D.display(v.p.DateOfJoining) || 'Not recorded'], ['Journey stage', v.stage + (v.stageDerived ? ' (derived)' : '')], ['Pathway', v.pathway]
    ].reduce(function (acc, r) { return acc.concat([h('dt', { text: r[0] }), h('dd', { text: U.text(r[1]) || 'Not recorded' })]); }, []));
    var viewBtn = h('button', { type: 'button', 'class': 'btn btn-small', text: 'View profile' });
    viewBtn.addEventListener('click', open);
    return h('li', { 'class': 'pcard' }, [
      h('div', { 'class': 'pcard-head' }, [medallion(v), h('div', null, [nameBtn, h('div', { 'class': 'pcard-meta', text: v.id + ', ' + (U.text(v.p.Cohort) || 'batch not recorded') + ' batch' }), v.isSample ? h('span', { 'class': 'chip chip-sample', text: 'SAMPLE' }) : null])]),
      dl,
      h('div', { 'class': 'progress-line' }, [
        h('div', null, [h('div', { 'class': 'v' + (prog.insufficient ? ' is-text' : ''), text: progText }), h('div', { 'class': 'l', text: prog.label === 'YLP Progress' ? 'YLP progress' : 'Provisional progress' })]),
        h('div', null, [h('div', { 'class': 'v', text: prog.completeness + '%' }), h('div', { 'class': 'l', text: 'Data completeness' })])
      ]),
      h('div', { 'class': 'person-chips' }, [compChip(v), projectChip(v), mentorChip(v), idpChip(v)]),
      viewBtn
    ]);
  }

  function options(d, f) {
    var vals = U.uniq(d.views.map(f[2]));
    var order = ORDERED[f[0]];
    vals.sort(function (a, b) {
      if (order) { var ia = order.indexOf(a), ib = order.indexOf(b); if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib); }
      return String(a).localeCompare(String(b));
    });
    return vals;
  }

  function render(d) {
    var st = loadState(), root = clear(byId('gallery-root'));
    var tools = h('div', { 'class': 'gallery-tools', role: 'search' });
    var search = h('input', { type: 'search', id: 'g-search', value: st.q, placeholder: 'Name, ID, department or project' });
    search.addEventListener('input', function () { st.q = search.value; saveState(); renderList(d); });
    tools.appendChild(h('div', { 'class': 'field search' }, [h('label', { 'for': 'g-search', text: 'Search' }), search]));
    var sort = h('select', { id: 'g-sort' }, SORTS.map(function (s) { return h('option', { value: s[0], selected: st.sort === s[0] ? true : null, text: s[1] }); }));
    sort.addEventListener('change', function () { st.sort = sort.value; saveState(); renderList(d); });
    tools.appendChild(h('div', { 'class': 'field' }, [h('label', { 'for': 'g-sort', text: 'Sort by' }), sort]));
    FILTERS.forEach(function (f) {
      var opts = options(d, f);
      if (st.filters[f[0]] && opts.indexOf(st.filters[f[0]]) === -1) delete st.filters[f[0]];
      var sel = h('select', { id: 'g-f-' + f[0] }, [h('option', { value: '', text: 'All' })].concat(opts.map(function (o) { return h('option', { value: o, selected: st.filters[f[0]] === o ? true : null, text: o }); })));
      sel.addEventListener('change', function () { if (sel.value) st.filters[f[0]] = sel.value; else delete st.filters[f[0]]; saveState(); renderList(d); });
      tools.appendChild(h('div', { 'class': 'field' }, [h('label', { 'for': 'g-f-' + f[0], text: f[1] }), sel]));
    });
    root.appendChild(tools);
    var reset = h('button', { type: 'button', 'class': 'btn btn-small', id: 'g-reset', text: 'Reset filters' });
    reset.addEventListener('click', function () { state = { filters: {}, q: '', sort: 'name' }; saveState(); render(d); byId('g-reset').focus(); });
    var exp = h('button', { type: 'button', 'class': 'btn btn-small', id: 'g-export', text: 'Export filtered participants (CSV)' });
    exp.addEventListener('click', function () { YLP.exporter.exportParticipantsCsv(filtered(d), 'filtered'); });
    root.appendChild(h('div', { 'class': 'gallery-bar' }, [h('p', { id: 'g-count', 'class': 'muted', 'aria-live': 'polite', role: 'status' }), h('div', { 'class': 'btn-row' }, [reset, exp])]));
    root.appendChild(h('ul', { 'class': 'cards', id: 'g-cards' }));
    renderList(d);
  }

  function renderList(d) {
    var list = clear(byId('g-cards'));
    var rows = filtered(d);
    byId('g-count').textContent = 'Showing ' + rows.length + ' of ' + fmt.plural(d.views.length, 'participant') + '.';
    if (!rows.length) list.appendChild(h('li', { 'class': 'pcard' }, [h('p', { text: 'No participants match these filters.' }), h('p', { 'class': 'muted', text: 'Change a filter or use Reset filters.' })]));
    rows.forEach(function (v) { list.appendChild(card(v)); });
  }

  YLP.views = YLP.views || [];
  YLP.views.push({ name: 'gallery', render: render });
  YLP.gallery = { filtered: filtered, compChip: compChip, idpChip: idpChip, mentorChip: mentorChip, projectChip: projectChip, medallion: medallion };
})(window.YLP);
