/* ==========================================================================
   Data Upload and Administration (spec 56–63, 3, 6).
   ========================================================================== */
(function (YLP) {
  'use strict';

  var h = YLP.dom.h, byId = YLP.dom.byId, clear = YLP.dom.clear, fmt = YLP.dom.fmt, chip = YLP.dom.chip, alertBox = YLP.dom.alertBox, D = YLP.dates, M = YLP.model, U = YLP.util;
  var I = YLP.importers, SC = YLP.schema;

  var DESCRIPTIONS = {
    auto: 'The dataset type is suggested from the file name, sheet names and headers. You can change it after choosing the file.',
    completeWorkbook: 'One Excel workbook with a sheet per table: Participants, KRAs, KRARatingScales, Competencies, Projects, ProjectParticipants, DevelopmentActions, Learning, Mentoring, StakeholderFeedback, JourneyActivities, RoleDescriptors, CompetencyFramework.',
    participantMaster: 'Employee ID, status, name, date of joining, job level, designation, department, business unit, manager and HRBP email, YLP batch. Official email is recognised and not stored.',
    currentFyKra: 'Collated KRAs for ' + M.currentFY + '. Employee ID, name, business unit (or Business Unit_x), department and the three "Goals / Key Result Areas" columns.',
    previousFyKra: 'Collated KRAs for ' + M.previousFY + ', for example YLP_KRA_Collated_FY25_26.xlsx, sheet Employee_KRAs.',
    goalSheet: 'One employee’s goal sheet workbook with the sheets "KRA Dashboard" and "Submitted Metric Scales".',
    kraRatingScales: 'KRA goal-rating thresholds (Level 1 to Level 5+). These are thresholds, not achieved ratings.',
    roleDescriptors: 'Business unit and department (as per HRMS), work role, key descriptors, WTW title and job role, unique role name, special skills and role type.',
    competencyWorkbook: 'The leadership competency framework: competency, behavioural anchors, definitions and the five level descriptors. Replaces the built-in default framework.',
    competencyAssessments: 'One row per participant, anchor and assessment: date, type (Self, Manager, Sponsor, Assessor, Panel, Baseline), levels, assessor, evidence, validation.',
    projects: 'Project ID, title, theme, problem, sponsor, adviser, dates, status, completion, baseline and impact, optional seven evaluation scores (1–5).',
    projectParticipants: 'Project ID and Employee ID, role, individual contribution, stakeholder and sponsor feedback, contribution rating, evidence.',
    developmentActions: 'IDP actions: Action ID, Employee ID, category, action, competency, owner, dates, status, completion, evidence.',
    learning: 'Learning records: Employee ID, title, type, completion date, hours, status, assessment score, application evidence.',
    mentoring: 'Mentoring and other developmental conversations: Employee ID, interaction type, mentor, meeting date, theme, actions.',
    stakeholderFeedback: 'Feedback ID, Employee ID, date, provider and role, context, competency, summary, rating, evidence.',
    journeyActivities: 'Activity ID, Employee ID, journey stage, activity name and type, dates, status, completion, evidence, owner.',
    genericCsv: 'Any CSV. Choose the table it belongs to and map its columns.',
    genericJson: 'An array of records, or a full database exported from this application (restores everything).'
  };

  var st = { source: null, res: null, dataset: 'auto', sheetName: null, dateFormat: null, mapping: {}, sheetTables: {}, targetTable: null, decisions: {}, goalChoice: null, mode: '', removeSample: true, overwrite: false, tab: 'preview', error: null };
  var dq = { area: '', severity: '' };
  var queueDecisions = {};

  function resetImport() {
    st = { source: null, res: null, dataset: st.dataset, sheetName: null, dateFormat: null, mapping: {}, sheetTables: {}, targetTable: null, decisions: {}, goalChoice: null, mode: '', removeSample: true, overwrite: false, tab: 'preview', error: null };
  }

  /* ---------------- Parsing ---------------- */
  function reparse() {
    if (!st.source) return;
    var ds = st.dataset === 'auto' ? I.guessDataset(st.source) : st.dataset;
    st.res = I.parse(st.source, { dataset: ds, sheetName: st.sheetName, dateFormat: st.dateFormat, db: YLP.store.db, mapping: st.mapping, sheetTables: st.sheetTables, targetTable: st.targetTable });
    var gm = st.res.goalMatch;
    if (gm && (gm.status === 'id' || gm.status === 'remembered')) st.goalChoice = gm.employeeID;
    st.res.unmatched.forEach(function (g) { if (!st.decisions[g.key]) st.decisions[g.key] = 'exclude'; });
  }

  function blocking() {
    if (!st.res) return [];
    return st.res.errors.filter(function (e) { return !(e.code === 'confirm-match' && st.goalChoice); });
  }

  /* ---------------- Merge planning ---------------- */
  function scopeFor(table, incoming) {
    var fys = {}, ids = {};
    incoming.forEach(function (r) { fys[U.text(r.FinancialYear)] = true; ids[U.text(r.EmployeeID)] = true; });
    if (st.res.dataset === 'goalSheet' && (table === 'KRAs' || table === 'KRARatingScales')) return function (r) { return fys[U.text(r.FinancialYear)] && ids[U.text(r.EmployeeID)]; };
    if (table === 'KRAs' || table === 'KRARatingScales') return function (r) { return !!fys[U.text(r.FinancialYear)]; };
    return function () { return true; };
  }

  function applyDecisions(records) {
    var keep = [], queue = [], maps = { id: {}, name: {} };
    var groups = {};
    st.res.unmatched.forEach(function (g) { groups[g.key] = g; });
    records.forEach(function (r) {
      var rec = Object.assign({}, r);
      if (st.res.dataset === 'goalSheet' && st.goalChoice) {
        var person = YLP.store.db.Participants.filter(function (p) { return p.EmployeeID === st.goalChoice; })[0];
        rec.EmployeeID = st.goalChoice;
        if (person) rec.EmployeeName = person.EmployeeName;
      }
      if (!rec._unmatched) { keep.push(rec); return; }
      var g = groups[rec._unmatched], dec = st.decisions[rec._unmatched] || 'exclude';
      if (dec === 'include') keep.push(rec);
      else if (dec === 'confirm' && g && g.proposedID) { rec.EmployeeID = g.proposedID; maps.name[g.nameKey] = g.proposedID; keep.push(rec); }
      else if (dec.indexOf('map:') === 0) {
        var to = dec.slice(4);
        if (g && g.kind === 'id') maps.id[U.text(rec.EmployeeID)] = to;
        if (g && g.kind === 'name') maps.name[g.nameKey] = to;
        rec.EmployeeID = to; keep.push(rec);
      } else queue.push(rec);
    });
    return { keep: keep, queue: queue, maps: maps };
  }

  function workingDb() {
    var db = JSON.parse(JSON.stringify(YLP.store.db));
    if (st.removeSample) SC.ORDER.forEach(function (t) { db[t] = (db[t] || []).filter(function (r) { return !r.IsSample; }); });
    return db;
  }

  function plan() {
    if (!st.res || !st.mode || st.res.dataset === 'databaseRestore') return null;
    var db = workingDb(), mode = st.mode === 'preview' ? 'merge' : st.mode;
    var maps = { id: {}, name: {} };
    var parts = st.res.parts.map(function (pt) {
      var dec = applyDecisions(pt.records);
      Object.keys(dec.maps.id).forEach(function (k) { maps.id[k] = dec.maps.id[k]; });
      Object.keys(dec.maps.name).forEach(function (k) { maps.name[k] = dec.maps.name[k]; });
      var incoming = I.stripInternal(dec.keep);
      var m = I.planMerge(db[pt.table], incoming, pt.table, mode, st.overwrite, scopeFor(pt.table, incoming));
      return { part: pt, merge: m, queued: dec.queue, incoming: incoming };
    });
    return { db: db, parts: parts, maps: maps };
  }

  /* ---------------- Confirm / cancel ---------------- */
  function confirmImport() {
    var res = st.res;
    if (!res || blocking().length) return;
    var before = JSON.parse(JSON.stringify(YLP.store.db));
    var label = 'Before import of ' + res.fileName;
    var snap = YLP.storage.idbAvailable() ? YLP.storage.addSnapshot(before, label).catch(function () { return null; }) : Promise.resolve(null);
    var go = res.dataset === 'databaseRestore'
      ? YLP.shell.confirm({ title: 'Restore this database?', body: ['This replaces every table with the contents of ' + res.fileName + ' (' + res.restore.Participants.length + ' participants). A snapshot of the current data is taken first so you can roll back.'], actions: [{ label: 'Restore database', value: 'yes', kind: 'primary' }, { label: 'Cancel', value: null }] })
      : Promise.resolve('yes');
    go.then(function (ok) {
      if (ok !== 'yes') return;
      return snap.then(function (snapId) {
        var db, tables = [];
        if (res.dataset === 'databaseRestore') {
          db = YLP.sanitize.cleanJson(res.restore);
          tables.push({ table: 'All tables', inserted: (db.Participants || []).length, updated: 0, unchanged: 0, rejected: 0, conflicting: 0, removed: 0, queued: 0 });
        } else {
          var p = plan();
          db = p.db;
          p.parts.forEach(function (x) {
            db[x.part.table] = x.merge.result;
            var queued = x.queued.map(function (r) {
              return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), table: x.part.table, groupKey: r._unmatched, record: I.stripInternal([r])[0], reason: (res.unmatched.filter(function (g) { return g.key === r._unmatched; })[0] || {}).reason || 'Unmatched', sourceFile: res.fileName, addedAt: D.nowStamp() };
            });
            db.unmatched = (db.unmatched || []).concat(queued);
            var c = x.merge.counts;
            tables.push({ table: x.part.table, inserted: c.inserted, updated: c.updated, unchanged: c.unchanged, rejected: c.rejected + x.part.rejected.length, conflicting: c.conflicting, removed: x.merge.removed, queued: queued.length });
          });
          db.meta = db.meta || {};
          db.meta.idMappings = Object.assign({}, db.meta.idMappings || {}, p.maps.id);
          db.meta.nameMappings = Object.assign({}, db.meta.nameMappings || {}, p.maps.name);
          if (res.goalMatch && st.goalChoice && res.goalMatch.nameKey) db.meta.nameMappings[res.goalMatch.nameKey] = st.goalChoice;
        }
        db.meta.lastUpload = D.nowStamp();
        db.meta.dataAsOf = D.todayIso();
        db.meta.sourceFile = res.fileName + (res.sheetName ? ' / ' + res.sheetName : '');
        db.uploadHistory = [{ at: D.nowStamp(), file: res.fileName, sheet: res.sheetName || res.parts.map(function (x) { return x.sheetName; }).filter(Boolean).join(', '), dataset: res.label, mode: res.dataset === 'databaseRestore' ? 'restore' : st.mode, tables: tables, snapshotId: snapId }].concat(db.uploadHistory || []).slice(0, 50);
        return YLP.store.commit(db, 'Imported ' + res.fileName).then(function () {
          var sum = tables.map(function (t) { return t.table + ': ' + t.inserted + ' inserted, ' + t.updated + ' updated, ' + t.unchanged + ' unchanged, ' + t.rejected + ' rejected, ' + t.conflicting + ' conflicting' + (t.queued ? ', ' + t.queued + ' to the Unmatched queue' : ''); }).join('. ');
          resetImport();
          st.flash = { kind: 'ok', text: 'Imported ' + res.fileName + '. ' + sum + '.' };
          render(YLP.store.derived());
          YLP.shell.announce('Import complete. ' + sum);
          var f = byId('imp-flash'); if (f) f.focus();
        });
      });
    }).catch(YLP.reportError);
  }

  function cancelImport() {
    resetImport();
    st.flash = { kind: 'info', text: 'Import cancelled. Nothing was saved.' };
    render(YLP.store.derived());
  }

  /* ---------------- File handling ---------------- */
  function handleFile(file) {
    if (!file) return;
    resetImport();
    // Spec 15: offer to remove sample records; default on only while every record is sample.
    st.removeSample = YLP.store.derived().env === 'SAMPLE';
    st.reading = file.name;
    renderPreview();
    I.readFile(file).then(function (source) {
      st.source = source; st.reading = null;
      reparse();
      renderPreview();
      var hd = byId('imp-preview-title'); if (hd) hd.focus();
    }).catch(function (err) {
      st.reading = null; st.error = { file: file.name, msg: err.message };
      renderPreview();
    });
  }

  /* ---------------- Preview rendering ---------------- */
  function steps() {
    var res = st.res, b = blocking();
    var s = function (label, state) { return h('li', { 'data-state': state, text: label + (state === 'done' ? ' ✓' : state === 'blocked' ? ' — action needed' : '') }); };
    var partErr = res && res.parts.some(function (p) { return p.errors.length; });
    return h('ol', { 'class': 'steps', 'aria-label': 'Validation progress' }, [
      s('Read file', st.source ? 'done' : st.reading ? 'active' : 'todo'),
      s('Detect dataset', res ? 'done' : 'todo'),
      s('Map columns', !res ? 'todo' : partErr || res.unrecognizedSheets.length ? 'blocked' : 'done'),
      s('Validate rows', !res ? 'todo' : b.length ? 'blocked' : 'done'),
      s('Match employees', !res ? 'todo' : (res.goalMatch && !st.goalChoice) ? 'blocked' : 'done'),
      s('Choose import mode', !res ? 'todo' : st.mode ? 'done' : 'active'),
      s('Ready to import', !res ? 'todo' : !b.length && st.mode && st.mode !== 'preview' ? 'active' : 'todo')
    ]);
  }

  function field(id, label, control) { return h('div', { 'class': 'field' }, [h('label', { 'for': id, text: label }), control]); }
  function select(id, options, value, onChange) {
    var sel = h('select', { id: id }, options.map(function (o) { return h('option', { value: o[0], selected: o[0] === value ? true : null, disabled: o[2] ? true : null, text: o[1] }); }));
    sel.addEventListener('change', function () { onChange(sel.value); renderPreview(); var again = byId(id); if (again) again.focus(); });
    return sel;
  }
  function checkbox(id, label, key, after) {
    var cb = h('input', { type: 'checkbox', id: id, checked: st[key] ? true : null });
    cb.addEventListener('change', function () { st[key] = cb.checked; if (after) after(); renderPreview(); byId(id).focus(); });
    return h('div', { 'class': 'check' }, [cb, h('label', { 'for': id, text: label })]);
  }

  function previewTable(pt) {
    var fields = SC.TABLES[pt.table].fields.filter(function (f) { return pt.records.some(function (r) { return r[f] !== undefined && r[f] !== null && r[f] !== ''; }); });
    var rows = pt.records.slice(0, YLP.config.previewRows);
    var hasUnmatched = pt.records.some(function (r) { return r._unmatched; });
    return h('div', { 'class': 'table-wrap' }, h('table', null, [
      h('caption', { text: SC.TABLES[pt.table].label + (pt.sheetName ? ' from "' + pt.sheetName + '"' : '') + ': ' + fmt.plural(pt.records.length, 'record') + (pt.records.length > rows.length ? ' (first ' + rows.length + ' shown)' : '') }),
      h('thead', null, h('tr', null, fields.map(function (f) { return h('th', { scope: 'col', text: f }); }).concat(hasUnmatched ? [h('th', { scope: 'col', text: 'Match' })] : []))),
      h('tbody', null, rows.map(function (r) {
        return h('tr', null, fields.map(function (f) {
          var val = r[f];
          if (YLP.exporter.EMAIL_FIELDS.indexOf(f) !== -1 || /email/i.test(f)) return h('td', { 'class': 'na', text: val ? 'Hidden (email)' : '' });
          if (f === 'DateOfJoining' || /Date$/.test(f)) return h('td', { text: val ? D.display(val) : (r.OriginalDateOfJoining && f === 'DateOfJoining' ? 'Unresolved: ' + r.OriginalDateOfJoining : '') });
          if (f === 'Weightage') return h('td', { text: val === null ? 'Not available' : val + (r.WeightageSource && r.WeightageSource !== String(val) ? ' (source ' + r.WeightageSource + ')' : '') });
          if (M.missingLabels[f] && (val === null || val === '')) return h('td', { 'class': 'na', text: M.missingLabels[f] });
          return h('td', { text: val === null || val === undefined ? '' : String(val) });
        }).concat(hasUnmatched ? [h('td', null, r._unmatched ? chip('warn', 'Unmatched') : chip('ok', 'Matched'))] : []));
      }))
    ]));
  }

  function mappingControl(pt) {
    var key = pt.sheetName || 'CSV';
    var fields = I.fieldsOf(pt.table).filter(function (f) { return f !== 'SourceSheet'; });
    var options = [['-1', '— not mapped —']].concat(pt.header.map(function (hd, i) { return [String(i), hd || '(column ' + (i + 1) + ')']; }));
    var rows = fields.map(function (f) {
      var id = 'map-' + key.replace(/[^A-Za-z0-9]/g, '') + '-' + f;
      var cur = pt.map.hasOwnProperty(f) ? String(pt.map[f]) : '-1';
      var sel = h('select', { id: id, 'aria-label': 'Source column for ' + f }, options.map(function (o) { return h('option', { value: o[0], selected: o[0] === cur ? true : null, text: o[1] }); }));
      sel.addEventListener('change', function () {
        st.mapping[key] = st.mapping[key] || {};
        st.mapping[key][f] = parseInt(sel.value, 10);
        reparse(); renderPreview(); var again = byId(id); if (again) again.focus();
      });
      return h('tr', null, [h('th', { scope: 'row', text: f + ((SC.TABLES[pt.table].required || []).indexOf(f) !== -1 ? ' (required)' : '') }), h('td', null, sel)]);
    });
    return h('details', { 'class': 'mapping-table' }, [
      h('summary', { text: 'Column mapping for ' + SC.TABLES[pt.table].label + (pt.sheetName && pt.sheetName !== 'CSV' ? ' (' + pt.sheetName + ')' : '') + ': ' + Object.keys(pt.map).length + ' columns mapped' + (pt.headerRow ? '. Header row found on row ' + pt.headerRow : '') }),
      h('div', { 'class': 'table-wrap' }, h('table', null, [h('caption', { text: 'Choose the source column for each field. Header row found on row ' + pt.headerRow + '.' }), h('thead', null, h('tr', null, [h('th', { scope: 'col', text: 'Field' }), h('th', { scope: 'col', text: 'Source column' })])), h('tbody', null, rows)]))
    ]);
  }

  function unmatchedPanel(res) {
    if (!res.unmatched.length) return h('p', { 'class': 'muted', text: 'Every record matches a participant in the participant master.' });
    var people = YLP.store.db.Participants.filter(function (p) { return !p.IsSample; }).concat(res.parts.filter(function (p) { return p.table === 'Participants'; }).reduce(function (a, p) { return a.concat(p.records); }, []));
    var list = h('ul', { 'class': 'issue-list' });
    res.unmatched.forEach(function (g, i) {
      var id = 'um-' + i;
      var opts = [['exclude', 'Exclude (keep in the Unmatched queue)'], ['include', 'Include anyway (not linked to a participant)']];
      if (g.proposedID) opts.unshift(['confirm', 'Confirm proposed match: ' + g.candidates[0].EmployeeName + ' (' + g.proposedID + ')']);
      (g.candidates.length ? g.candidates : people).forEach(function (p) { opts.push(['map:' + p.EmployeeID, 'Map to ' + p.EmployeeName + ' (' + p.EmployeeID + ')']); });
      var sel = select(id, opts, st.decisions[g.key], function (v) { st.decisions[g.key] = v; });
      list.appendChild(h('li', null, [chip('warn', g.count + ' record' + (g.count === 1 ? '' : 's')), h('div', null, [h('strong', { text: g.label }), h('p', { 'class': 'small', text: g.reason + '. Tables: ' + g.tables.join(', ') + '.' }), field(id, 'Decision', sel)])]));
    });
    return h('div', null, [h('p', { 'class': 'small', text: 'Employees absent from the participant master are not included automatically. Excluded records wait in the Unmatched Records queue below, where they can be resolved later. Mapping decisions are remembered for future imports.' }), list]);
  }

  function renderPreview() {
    var box = byId('imp-preview');
    if (!box) return;
    clear(box);
    if (st.flash) { box.appendChild(h('div', { id: 'imp-flash', tabindex: '-1' }, alertBox(st.flash.kind, st.flash.text))); st.flash = null; }
    if (st.reading) { box.appendChild(steps()); box.appendChild(h('p', { role: 'status', text: 'Reading ' + st.reading + ' in this browser…' })); return; }
    if (st.error) { box.appendChild(alertBox('error', st.error.file + ': ' + st.error.msg)); return; }
    var res = st.res;
    if (!res) return;
    byId('imp-file-name').textContent = 'Selected file: ' + res.fileName;
    box.appendChild(steps());
    box.appendChild(h('h3', { id: 'imp-preview-title', tabindex: '-1', text: 'Preview: ' + res.label }));
    box.appendChild(h('p', { 'class': 'muted', text: res.fileName + (res.parts.length ? '. Sheets: ' + res.parts.map(function (p) { return p.sheetName; }).filter(Boolean).join(', ') : '') }));

    var controls = h('div', { 'class': 'filter-row' });
    if (st.dataset === 'auto' && res.dataset !== 'databaseRestore') controls.appendChild(h('p', { 'class': 'small', text: 'Detected as ' + res.label + '. Change the dataset type above if this is wrong.' }));
    if (st.source.kind === 'xlsx' && res.parts.length === 1 && !I.DATASETS[res.dataset].multi && !I.DATASETS[res.dataset].special && st.source.sheetNames.length > 1) {
      controls.appendChild(field('imp-sheet', 'Sheet', select('imp-sheet', st.source.sheetNames.map(function (n) { return [n, n]; }), res.parts[0].sheetName, function (v) { st.sheetName = v; st.mapping = {}; reparse(); })));
    }
    if (I.DATASETS[res.dataset] && I.DATASETS[res.dataset].generic) {
      controls.appendChild(field('imp-target', 'Table these records belong to', select('imp-target', [['', 'Choose a table…']].concat(SC.ORDER.map(function (t) { return [t, SC.TABLES[t].label]; })), res.targetTable || '', function (v) { st.targetTable = v || null; st.mapping = {}; reparse(); })));
    }
    if (res.ambiguous.length || st.dateFormat) {
      controls.appendChild(field('imp-datefmt', 'Date format (' + res.ambiguous.length + ' ambiguous, e.g. ' + res.ambiguous.slice(0, 3).map(function (a) { return a.value; }).join(', ') + ')', select('imp-datefmt', [['', 'Choose how to read these dates…'], ['DMY', 'DD/MM/YYYY (day first)'], ['MDY', 'MM/DD/YYYY (month first)']], st.dateFormat || '', function (v) { st.dateFormat = v || null; reparse(); })));
    }
    res.unrecognizedSheets.forEach(function (u, i) {
      var id = 'imp-sheetmap-' + i;
      controls.appendChild(field(id, 'Sheet "' + u.name + '" holds', select(id, [['', 'Choose…'], ['ignore', 'Ignore this sheet']].concat(SC.ORDER.map(function (t) { return [t, SC.TABLES[t].label + (u.suggested === t ? ' (suggested)' : '')]; })), st.sheetTables[u.name] || '', function (v) { if (v) st.sheetTables[u.name] = v; else delete st.sheetTables[u.name]; reparse(); })));
    });
    if (res.goalMatch && res.goalMatch.status !== 'id' && res.goalMatch.status !== 'remembered') {
      var gm = res.goalMatch;
      if (gm.status === 'proposed') {
        var cb = h('input', { type: 'checkbox', id: 'imp-goal-ok', checked: st.goalChoice ? true : null });
        cb.addEventListener('change', function () { st.goalChoice = cb.checked ? gm.employeeID : null; renderPreview(); byId('imp-goal-ok').focus(); });
        controls.appendChild(h('div', { 'class': 'check' }, [cb, h('label', { 'for': 'imp-goal-ok', text: 'Confirm: this goal sheet belongs to ' + gm.candidates[0].EmployeeName + ' (' + gm.employeeID + '). The decision is remembered for future imports.' })]));
      } else {
        var pool = gm.candidates.length ? gm.candidates : YLP.store.db.Participants.filter(function (p) { return !p.IsSample; });
        if (pool.length) controls.appendChild(field('imp-goal-map', 'Goal sheet belongs to', select('imp-goal-map', [['', 'Select the Employee ID…']].concat(pool.map(function (p) { return [p.EmployeeID, p.EmployeeID + ' — ' + p.EmployeeName + ' (' + (p.Department || 'department not recorded') + ')']; })), st.goalChoice || '', function (v) { st.goalChoice = v || null; })));
      }
    }
    if (controls.childNodes.length) box.appendChild(controls);
    res.notes.forEach(function (n) { box.appendChild(alertBox('info', n)); });

    if (res.dataset !== 'databaseRestore') res.parts.forEach(function (pt) { if (pt.header.length) box.appendChild(mappingControl(pt)); });

    var b = blocking();
    var rejected = [], warnings = res.warnings.slice(), notes = [];
    res.parts.forEach(function (pt) {
      pt.rejected.forEach(function (r) { rejected.push({ row: r.row, msg: r.msg, where: SC.TABLES[pt.table].label }); });
      pt.warnings.forEach(function (w) { warnings.push({ row: w.row, msg: w.msg, where: SC.TABLES[pt.table].label }); });
      notes = notes.concat(pt.notes);
    });
    var unmatchedCount = res.unmatched.reduce(function (n, g) { return n + g.count; }, 0);
    var total = res.parts.reduce(function (n, p) { return n + p.records.length; }, 0);
    box.appendChild(h('div', { 'class': 'summary-grid' }, [
      [res.dataset === 'databaseRestore' ? res.restore.Participants.length : total, res.dataset === 'databaseRestore' ? 'participants in file' : 'records read'],
      [rejected.length, 'rows rejected'], [b.length, 'blocking errors'], [warnings.length, 'warnings'], [unmatchedCount, 'unmatched records']
    ].map(function (m) { return h('div', { 'class': 'metric' }, [h('div', { 'class': 'value', text: String(m[0]) }), h('div', { 'class': 'label', text: m[1] })]); })));
    notes.forEach(function (n) { box.appendChild(alertBox('info', n)); });

    var TABS = [['preview', 'Preview'], ['errors', 'Errors (' + (b.length + rejected.length) + ')'], ['warnings', 'Warnings (' + warnings.length + ')'], ['unmatched', 'Unmatched (' + unmatchedCount + ')']];
    var tablist = h('div', { 'class': 'tabs', role: 'tablist', 'aria-label': 'Import preview' });
    TABS.forEach(function (t, i) {
      var tb = h('button', { type: 'button', role: 'tab', 'class': 'tab', id: 'it-' + t[0], 'aria-selected': st.tab === t[0] ? 'true' : 'false', 'aria-controls': 'imp-panel', tabindex: st.tab === t[0] ? '0' : '-1', text: t[1] });
      tb.addEventListener('click', function () { st.tab = t[0]; renderPreview(); byId('it-' + t[0]).focus(); });
      tb.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var j = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
        st.tab = TABS[j][0]; renderPreview(); byId('it-' + st.tab).focus();
      });
      tablist.appendChild(tb);
    });
    var panel = h('div', { 'class': 'tabpanel', role: 'tabpanel', id: 'imp-panel', 'aria-labelledby': 'it-' + st.tab, tabindex: '0' });
    if (st.tab === 'preview') {
      if (res.dataset === 'databaseRestore') panel.appendChild(h('p', { text: 'Tables in the file: ' + SC.ORDER.filter(function (t) { return Array.isArray(res.restore[t]); }).map(function (t) { return SC.TABLES[t].label + ' (' + res.restore[t].length + ')'; }).join(', ') + '.' }));
      res.parts.forEach(function (pt) { panel.appendChild(pt.records.length ? previewTable(pt) : h('p', { 'class': 'muted', text: SC.TABLES[pt.table].label + ': no records read.' })); });
    } else if (st.tab === 'errors') {
      var all = b.map(function (e) { return { kind: 'error', text: 'Blocking: ' + e.msg }; }).concat(rejected.map(function (r) { return { kind: 'error', text: r.where + (r.row ? ', row ' + r.row : '') + ': ' + r.msg + ' (row rejected)' }; }));
      panel.appendChild(all.length ? h('ul', { 'class': 'issue-list' }, all.map(function (x) { return h('li', null, [chip('error', 'Error'), h('span', { text: x.text })]); })) : h('p', { 'class': 'muted', text: 'No errors.' }));
    } else if (st.tab === 'warnings') {
      panel.appendChild(warnings.length ? h('ul', { 'class': 'issue-list' }, warnings.map(function (w) { return h('li', null, [chip('warn', 'Warning'), h('span', { text: (w.where ? w.where + ', ' : '') + (w.row ? 'row ' + w.row + ': ' : '') + w.msg })]); })) : h('p', { 'class': 'muted', text: 'No warnings.' }));
    } else {
      panel.appendChild(unmatchedPanel(res));
    }
    box.appendChild(tablist);
    box.appendChild(panel);

    // Import summary and mode
    var actions = h('div', { 'class': 'court' }, [h('h3', { text: 'Import summary' })]);
    if (res.dataset !== 'databaseRestore') {
      actions.appendChild(field('imp-mode', 'Import mode (required)', select('imp-mode', [['', 'Choose an import mode…'], ['replace', 'Replace dataset'], ['merge', 'Merge and update'], ['append', 'Append only'], ['preview', 'Preview only (nothing is saved)']], st.mode, function (v) { st.mode = v; })));
      actions.appendChild(h('p', { 'class': 'small muted', text: 'Replace removes the existing records of this dataset (for KRA workbooks, only the same financial year). Merge updates matching records by key and adds new ones. Append adds new records and rejects existing keys. Preview shows the result without saving.' }));
      if (SC.ORDER.some(function (t) { return (YLP.store.db[t] || []).some(function (r) { return r.IsSample; }); })) actions.appendChild(checkbox('imp-remove-sample', 'Remove all sample records on import (untick to keep them for testing; the data will show as MIXED)', 'removeSample'));
      actions.appendChild(checkbox('imp-overwrite', 'Overwrite existing values that conflict (otherwise existing values are kept and only blanks are filled)', 'overwrite'));
      var p = plan();
      if (p) {
        actions.appendChild(YLP.charts.dataTable('What will change', ['Table', 'Inserted', 'Updated', 'Unchanged', 'Rejected', 'Conflicting', 'Removed by replace', 'To Unmatched queue'], p.parts.map(function (x) {
          var c = x.merge.counts;
          return [SC.TABLES[x.part.table].label, String(c.inserted), String(c.updated), String(c.unchanged), String(c.rejected + x.part.rejected.length), String(c.conflicting), String(x.merge.removed), String(x.queued.length)];
        })));
      }
    }
    if (b.length) actions.appendChild(alertBox('error', 'Import is blocked until the blocking errors are resolved: ' + b.map(function (e) { return e.msg; }).join(' ')));
    var needMode = res.dataset !== 'databaseRestore' && (!st.mode || st.mode === 'preview');
    var confirm = h('button', { type: 'button', id: 'imp-confirm', 'class': 'btn btn-primary', disabled: b.length || needMode ? true : null, text: st.mode === 'preview' ? 'Preview only: nothing will be saved' : res.dataset === 'databaseRestore' ? 'Restore this database' : 'Confirm import' });
    var cancel = h('button', { type: 'button', id: 'imp-cancel', 'class': 'btn', text: 'Cancel import' });
    confirm.addEventListener('click', confirmImport);
    cancel.addEventListener('click', cancelImport);
    actions.appendChild(h('div', { 'class': 'btn-row' }, [confirm, cancel]));
    box.appendChild(actions);
  }

  /* ---------------- Other admin panels ---------------- */
  function historyPanel(db) {
    if (!db.uploadHistory.length) return h('p', { 'class': 'muted', text: 'No imports yet.' });
    return h('ul', { 'class': 'issue-list' }, db.uploadHistory.slice(0, 15).map(function (u) {
      var t = (u.tables || []).map(function (x) { return x.table + ' ' + x.inserted + '/' + x.updated + '/' + x.unchanged + '/' + x.rejected + '/' + x.conflicting; }).join('; ');
      return h('li', null, [chip('info', u.mode), h('span', { text: D.displayTime(u.at) + ': ' + u.dataset + ', ' + u.file + (u.sheet ? ' (' + u.sheet + ')' : '') + '. Inserted/updated/unchanged/rejected/conflicting: ' + t })]);
    }));
  }

  function snapshotsPanel() {
    var list = h('ul', { 'class': 'issue-list', id: 'adm-snapshots' }, h('li', { 'class': 'muted', text: 'Loading snapshots…' }));
    if (!YLP.storage.idbAvailable()) { clear(list).appendChild(h('li', { 'class': 'muted', text: 'Snapshots need IndexedDB, which this browser does not provide. Export JSON before importing.' })); return list; }
    YLP.storage.listSnapshots().then(function (snaps) {
      clear(list);
      if (!snaps.length) { list.appendChild(h('li', { 'class': 'muted', text: 'No snapshots yet. One is taken before every confirmed import.' })); return; }
      snaps.forEach(function (sn) {
        var b = h('button', { type: 'button', 'class': 'btn btn-small', text: 'Restore' });
        b.addEventListener('click', function () { YLP.store.restoreSnapshot(sn.id, sn.label); });
        list.appendChild(h('li', null, [h('span', { text: D.displayTime(sn.createdAt.slice(0, 16)) + ': ' + sn.label + ' (' + (sn.bytes / 1024).toFixed(0) + ' KB)' }), b]));
      });
    }).catch(function (e) { clear(list).appendChild(h('li', { 'class': 'muted', text: 'Snapshots unavailable: ' + e.message })); });
    return list;
  }

  function storagePanel(store) {
    var bytes = YLP.storage.byteSize(JSON.stringify(store.db)), limit = YLP.config.safeLocalStorageBytes;
    var pct = Math.round(bytes / limit * 100);
    var where = store.where === 'local' ? 'Saved in localStorage.' : store.where === 'idb' ? 'Saved in IndexedDB (the dataset is larger than the localStorage limit).' : 'Not saved yet: built-in sample data.';
    var out = [YLP.charts.meter('Estimated size against the localStorage safe limit', Math.min(pct, 100), 100, { text: (bytes / 1048576).toFixed(2) + ' MB (' + pct + '%)', tone: pct >= 70 ? 'warn' : null }), h('p', { 'class': 'small', text: where })];
    if (pct >= 70) out.push(alertBox('warn', 'Storage use is above 70% of the safe localStorage limit. Larger datasets move to IndexedDB automatically. Export a JSON copy regularly.'));
    if (store.lastSave && !store.lastSave.ok) out.push(alertBox('error', 'The data could not be saved in this browser (' + store.lastSave.error + '). Nothing has been discarded: this session keeps working. Export the database as JSON now.'));
    var quota = h('p', { 'class': 'small muted' });
    YLP.storage.estimate().then(function (est) { if (est && est.quota) quota.textContent = 'Browser storage available to this site: ' + Math.round(est.quota / 1048576) + ' MB; used ' + (est.usage / 1048576).toFixed(2) + ' MB.'; });
    out.push(quota);
    return out;
  }

  function compatPanel() {
    var c = YLP.compat.run();
    return [
      c.degraded ? alertBox('warn', YLP.compat.degradedMessage) : alertBox('ok', 'All required browser features are supported. ' + c.context.mode + (c.context.secure ? ', secure context.' : '.')),
      YLP.charts.dataTable('Browser features required by the application', ['Feature', 'Status', 'Note'], c.results.map(function (r) { return [r.name + (r.required ? '' : ' (optional)'), r.status, r.note || '—']; }))
    ];
  }

  function qualityPanel(d) {
    var areas = U.uniq(d.issues.map(function (i) { return i.area; })).sort();
    var list = d.issues.filter(function (i) { return (!dq.area || i.area === dq.area) && (!dq.severity || i.severity === dq.severity); });
    var fa = h('select', { id: 'dq-area' }, [h('option', { value: '', text: 'All areas' })].concat(areas.map(function (a) { return h('option', { value: a, selected: dq.area === a ? true : null, text: a }); })));
    var fs = h('select', { id: 'dq-sev' }, [['', 'Errors and warnings'], ['error', 'Errors only'], ['warning', 'Warnings only']].map(function (o) { return h('option', { value: o[0], selected: dq.severity === o[0] ? true : null, text: o[1] }); }));
    fa.addEventListener('change', function () { dq.area = fa.value; render(d); byId('dq-area').focus(); });
    fs.addEventListener('change', function () { dq.severity = fs.value; render(d); byId('dq-sev').focus(); });
    return [
      h('div', { 'class': 'filter-row' }, [field('dq-area', 'Area', fa), field('dq-sev', 'Severity', fs), h('p', { 'class': 'muted', text: list.length + ' of ' + d.issues.length + ' items' })]),
      list.length ? h('ul', { 'class': 'issue-list' }, list.slice(0, 200).map(function (i) { return h('li', null, [chip(i.severity === 'error' ? 'error' : 'warn', i.area), h('span', { text: i.message + (i.ref ? ' — ' + i.ref : '') })]); })) : h('p', { 'class': 'muted', text: 'No data-quality issues.' })
    ];
  }

  function queuePanel(store) {
    var q = store.db.unmatched || [];
    if (!q.length) return [h('p', { 'class': 'muted', text: 'The Unmatched Records queue is empty.' })];
    var groups = U.groupBy(q, function (e) { return e.groupKey || e.id; });
    var people = store.db.Participants.filter(function (p) { return !p.IsSample; });
    var list = h('ul', { 'class': 'issue-list' });
    Object.keys(groups).forEach(function (k, i) {
      var g = groups[k], first = g[0];
      var id = 'q-' + i;
      var opts = [['', 'Keep in queue'], ['include', 'Include anyway'], ['discard', 'Discard these records']].concat(people.map(function (p) { return ['map:' + p.EmployeeID, 'Map to ' + p.EmployeeName + ' (' + p.EmployeeID + ')']; }));
      var sel = h('select', { id: id }, opts.map(function (o) { return h('option', { value: o[0], selected: queueDecisions[k] === o[0] ? true : null, text: o[1] }); }));
      sel.addEventListener('change', function () { queueDecisions[k] = sel.value; });
      var who = U.text(first.record.EmployeeName) || U.text(first.record.EmployeeID) || '(no employee)';
      list.appendChild(h('li', null, [chip('warn', g.length + ' record' + (g.length === 1 ? '' : 's')), h('div', null, [h('strong', { text: who + (first.record.EmployeeID ? ' (' + first.record.EmployeeID + ')' : '') }), h('p', { 'class': 'small', text: first.reason + '. ' + U.uniq(g.map(function (e) { return SC.TABLES[e.table] ? SC.TABLES[e.table].label : e.table; })).join(', ') + ' from ' + first.sourceFile + '.' }), field(id, 'Decision', sel)])]));
    });
    var apply = h('button', { type: 'button', 'class': 'btn btn-primary btn-small', id: 'q-apply', text: 'Apply queue decisions' });
    apply.addEventListener('click', function () { applyQueue(groups); });
    return [h('p', { 'class': 'small', text: q.length + ' record(s) are waiting. Include, map or discard them; mapped Employee IDs are remembered for future imports.' }), list, apply];
  }

  function applyQueue(groups) {
    var db = JSON.parse(JSON.stringify(YLP.store.db));
    var remaining = [], moved = 0, discarded = 0;
    db.meta.idMappings = db.meta.idMappings || {};
    (db.unmatched || []).forEach(function (e) {
      var k = e.groupKey || e.id, dec = queueDecisions[k] || '';
      if (!dec) { remaining.push(e); return; }
      if (dec === 'discard') { discarded++; return; }
      var rec = Object.assign({}, e.record);
      if (dec.indexOf('map:') === 0) { var to = dec.slice(4); if (U.has(rec.EmployeeID)) db.meta.idMappings[rec.EmployeeID] = to; rec.EmployeeID = to; }
      var r = I.planMerge(db[e.table] || [], [rec], e.table, 'merge', false, null);
      db[e.table] = r.result; moved++;
    });
    db.unmatched = remaining;
    queueDecisions = {};
    YLP.store.commit(db, 'Unmatched queue: ' + moved + ' record(s) added, ' + discarded + ' discarded').then(function () { YLP.shell.announce(moved + ' records added from the queue, ' + discarded + ' discarded.'); });
  }

  /* ---------------- Section ---------------- */
  function render(d) {
    var store = YLP.store, db = store.db, root = clear(byId('admin-root'));
    root.appendChild(h('div', { 'class': 'notice', role: 'note' }, [YLP.dom.icon('lock'), h('p', null, [h('strong', { text: 'Privacy Notice: ' }), M.copy.privacy.replace('Privacy Notice: ', '')])]));

    // Upload
    var up = h('div', { 'class': 'court', id: 'adm-upload' }, [h('div', { 'class': 'court-title' }, [h('h3', { text: 'Upload data' }), h('span', { 'class': 'muted', text: 'CSV and JSON always work. Excel works when the bundled SheetJS library is present.' })])]);
    var ex = YLP.libs.state.excel;
    up.appendChild(ex.available ? alertBox('ok', ex.message) : alertBox('warn', ex.message, h('p', { 'class': 'small', text: 'Each Excel sheet can be saved as CSV (File, Save As, CSV UTF-8) and uploaded separately. Use the CSV templates for the expected columns.' })));
    var types = [['auto', 'Detect from the file']].concat(I.DATASET_ORDER.map(function (k, i) { var dd = I.DATASETS[k]; return [k, (i + 1) + '. ' + dd.label + (dd.excelOnly && !ex.available ? ' (Excel unavailable)' : ''), dd.excelOnly && !ex.available]; }));
    var dsSel = h('select', { id: 'imp-dataset' }, types.map(function (o) { return h('option', { value: o[0], selected: st.dataset === o[0] ? true : null, disabled: o[2] ? true : null, text: o[1] }); }));
    var desc = h('p', { 'class': 'small muted', id: 'imp-desc', text: DESCRIPTIONS[st.dataset] || '' });
    dsSel.addEventListener('change', function () { st.dataset = dsSel.value; desc.textContent = DESCRIPTIONS[st.dataset] || ''; st.mapping = {}; st.sheetName = null; st.targetTable = null; if (st.source) { reparse(); renderPreview(); } });
    var tpl = h('button', { type: 'button', 'class': 'btn btn-small', id: 'imp-template', text: 'Download CSV template' });
    tpl.addEventListener('click', function () {
      var key = st.dataset === 'auto' ? 'participantMaster' : st.dataset;
      var headers = I.templateFor(key);
      if (!headers) { st.flash = { kind: 'info', text: key === 'goalSheet' ? 'The goal sheet is read from its own Excel workbook, so it has no CSV template.' : key === 'completeWorkbook' ? 'Use "Download workbook template" for the complete workbook.' : 'Generic files have no template: map their columns after upload.' }; renderPreview(); return; }
      YLP.exporter.exportTemplate(key, headers);
    });
    var wbt = h('button', { type: 'button', 'class': 'btn btn-small', id: 'imp-wb-template', disabled: ex.available ? null : true, text: 'Download workbook template (.xlsx)' });
    wbt.addEventListener('click', function () { YLP.exporter.exportWorkbookTemplate(); });
    var input = h('input', { type: 'file', id: 'imp-file', accept: ex.available ? '.csv,.json,.xlsx,.xlsm,.xls,text/csv,application/json' : '.csv,.json,text/csv,application/json' });
    input.addEventListener('change', function () { handleFile(input.files && input.files[0]); input.value = ''; });
    up.appendChild(h('div', { 'class': 'upload-grid' }, [h('div', null, [field('imp-dataset', 'Dataset type', dsSel), desc]), h('div', null, [field('imp-file', 'Browse for a file', input)])]));
    up.appendChild(h('div', { 'class': 'btn-row' }, [tpl, wbt]));
    var dz = h('div', { 'class': 'dropzone', id: 'imp-drop', tabindex: '0', role: 'button', 'aria-describedby': 'imp-drop-help' }, [h('strong', { text: 'Drop a file here' }), h('span', { id: 'imp-drop-help', text: 'CSV, JSON' + (ex.available ? ' or Excel' : '') + '. Press Enter to browse.' })]);
    dz.addEventListener('click', function () { input.click(); });
    dz.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('is-over'); });
    dz.addEventListener('dragleave', function () { dz.classList.remove('is-over'); });
    dz.addEventListener('drop', function (e) { e.preventDefault(); dz.classList.remove('is-over'); handleFile(e.dataTransfer.files && e.dataTransfer.files[0]); });
    up.appendChild(dz);
    up.appendChild(h('p', { 'class': 'file-name', id: 'imp-file-name', 'aria-live': 'polite', text: st.res ? 'Selected file: ' + st.res.fileName : '' }));
    up.appendChild(h('div', { id: 'imp-preview' }));
    root.appendChild(up);

    // Data controls
    var asof = h('input', { type: 'date', id: 'adm-asof', value: db.meta.dataAsOf || '' });
    var asofBtn = h('button', { type: 'button', 'class': 'btn btn-small', id: 'adm-asof-save', text: 'Save date' });
    asofBtn.addEventListener('click', function () { if (D.isIso(asof.value)) store.updateMeta(function (m) { m.dataAsOf = asof.value; }, 'Data as of date saved'); });
    var scope = null;
    if (d.env === 'MIXED') {
      var sc = h('input', { type: 'checkbox', id: 'adm-include-sample', checked: !d.scoped ? true : null });
      sc.addEventListener('change', function () { store.setIncludeSample(sc.checked); });
      scope = h('div', { 'class': 'check' }, [sc, h('label', { 'for': 'adm-include-sample', text: 'Include sample records in HOD metrics (off by default when actual data exists)' })]);
    }
    var btn = function (id, label, fn, cls) { var b = h('button', { type: 'button', 'class': 'btn btn-small ' + (cls || ''), id: id, text: label }); b.addEventListener('click', fn); return b; };
    root.appendChild(h('div', { 'class': 'court' }, [
      h('div', { 'class': 'court-title' }, [h('h3', { text: 'Data, history and exports' })]),
      h('div', { 'class': 'filter-row' }, [field('adm-asof', 'Data as of date', asof), asofBtn]),
      scope,
      h('div', { 'class': 'btn-row' }, [
        btn('adm-rollback', 'Roll back last import', function () { store.rollback(); }),
        btn('adm-export-json', 'Export current database (JSON)', function () { YLP.exporter.exportDatabase(store.db); }, 'btn-primary'),
        btn('adm-export-dash', 'Export Dashboard Data', function () { YLP.exporter.exportDashboard(store.derived(), store); }),
        btn('adm-export-csv', 'Export participants (CSV)', function () { YLP.exporter.exportParticipantsCsv(store.derived().metric, 'metrics-set'); }),
        btn('adm-reset', 'Reset sample data', function () { store.resetSample(); }),
        btn('adm-clear', 'Clear local data', function () { store.clearLocal(); }, 'btn-danger')
      ]),
      h('div', { 'class': 'grid grid-2' }, [
        h('div', null, [h('h4', { text: 'Upload history' }), historyPanel(db)]),
        h('div', null, [h('h4', { text: 'Snapshots (newest ' + YLP.config.maxSnapshots + ' kept)' }), snapshotsPanel()])
      ])
    ]));

    root.appendChild(h('div', { 'class': 'court', id: 'adm-queue' }, [h('div', { 'class': 'court-title' }, [h('h3', { text: 'Unmatched Records queue' })])].concat(queuePanel(store))));
    root.appendChild(h('div', { 'class': 'court', id: 'adm-quality' }, [h('div', { 'class': 'court-title' }, [h('h3', { text: 'Data quality' }), h('span', { 'class': 'muted', text: 'Checks on the saved data after every change' })])].concat(qualityPanel(d))));
    root.appendChild(h('div', { 'class': 'grid grid-2' }, [
      h('div', { 'class': 'court' }, [h('h3', { text: 'Browser storage' })].concat(storagePanel(store))),
      h('div', { 'class': 'court', id: 'adm-compat' }, [h('h3', { text: 'Runtime compatibility' })].concat(compatPanel()))
    ]));
    renderPreview();
  }

  YLP.views = YLP.views || [];
  YLP.views.push({ name: 'admin', render: render });
  YLP.admin = { state: function () { return st; }, handleFile: handleFile };
})(window.YLP);
