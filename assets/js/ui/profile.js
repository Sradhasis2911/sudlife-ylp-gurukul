/* ==========================================================================
   Participant Profile (spec 39–44). Accessible side-panel dialog with nine
   tabs, focus trapping, Escape to close, arrow-key tab navigation and a
   printable version. Email fields are hidden by default (spec 40).
   ========================================================================== */
(function (YLP) {
  'use strict';

  var h = YLP.dom.h, byId = YLP.dom.byId, clear = YLP.dom.clear, fmt = YLP.dom.fmt, chip = YLP.dom.chip, icon = YLP.dom.icon, alertBox = YLP.dom.alertBox;
  var D = YLP.dates, M = YLP.model, U = YLP.util;
  var TABS = ['Overview', 'KRAs', 'KRA Comparison', 'Competencies', '70-20-10', 'Cross-Functional Project', 'IDP', 'Evidence', 'Timeline'];
  var state = { id: null, tab: 0, opener: null, release: null, showContacts: false };

  /* ---------------- Small builders ---------------- */
  function cell(v) {
    if (v === null || v === undefined || v === '') return h('td', { 'class': 'na', text: '—' });
    if (typeof Node !== 'undefined' && v instanceof Node) return h('td', null, v);
    return h('td', { text: String(v) });
  }
  function table(caption, headers, rows, numericCols) {
    numericCols = numericCols || [];
    return h('div', { 'class': 'table-wrap' }, h('table', null, [
      h('caption', { text: caption }),
      h('thead', null, h('tr', null, headers.map(function (x, i) { return h('th', { scope: 'col', 'class': numericCols.indexOf(i) !== -1 ? 'num' : null, text: x }); }))),
      h('tbody', null, rows.length ? rows.map(function (r) {
        return h('tr', null, r.map(function (c, i) { var td = cell(c); if (numericCols.indexOf(i) !== -1) td.className = (td.className ? td.className + ' ' : '') + 'num'; return td; }));
      }) : [h('tr', null, h('td', { colspan: headers.length, 'class': 'na', text: 'No records.' }))])
    ]));
  }
  function na(label) { return h('span', { 'class': 'na', text: label }); }
  function missing(field, v) { return v === null || v === undefined || v === '' ? na(M.missingLabels[field] || 'Not available') : String(v); }
  function kv(pairs) { return h('dl', { 'class': 'field-grid' }, pairs.map(function (p) { return h('div', null, [h('dt', { text: p[0] }), h('dd', null, p[1] === null || p[1] === undefined || p[1] === '' ? na('Not recorded') : p[1])]); })); }
  function section(title, nodes) { return [h('h3', { text: title })].concat(nodes); }
  // Long text values get a smaller size than numbers.
  function sv(text) { return h('div', { 'class': 'v' + (/^[\d.,%\s→\/—-]+$/.test(String(text)) ? '' : ' is-text'), text: text }); }

  function anchorChip(a) {
    var st = a.status;
    if (st === 'Validated') return chip(a.countedLevel >= 4 ? 'gold' : a.countedLevel === 3 ? 'ok' : 'info', 'Validated, Level ' + a.countedLevel);
    if (st === M.copy.level3Pending) return chip('warn', 'Level ' + a.current + ' indicated, validation pending');
    if (st === 'Validation pending') return chip('warn', 'Level ' + a.current + ', validation pending');
    if (st === 'Self-assessment only') return chip('na', 'Self-assessment only (' + a.selfLevel + '), not counted');
    if (st === 'Baseline only') return chip('na', 'Baseline only');
    if (st === 'Invalid score') return chip('error', 'Invalid score');
    return chip('na', 'No Evidence');
  }
  function availIcon(s) {
    var letter = { 'Available': '✓', 'Partially Available': '◐', 'Not Available': '–', 'Validation Required': '!', 'Not Applicable': 'n/a' }[s] || '?';
    return h('span', { 'class': 'avail-ico', 'data-s': s, 'aria-hidden': 'true', text: letter });
  }

  /* ---------------- Tabs ---------------- */
  function tabOverview(v, d, opts) {
    var p = v.p, prog = v.progress;
    var hidden = state.showContacts && !opts.print && !document.body.classList.contains('is-presenting');
    var out = [];
    out.push(h('div', { 'class': 'score-pair' }, [
      h('div', { 'class': 'score-box' }, [sv(prog.insufficient ? 'Insufficient Evidence' : prog.provisional + '%'), h('div', { 'class': 'l', text: prog.label === 'YLP Progress' ? 'YLP progress (data completeness 80% or more)' : prog.insufficient ? 'Progress withheld: data completeness below 50%' : 'Provisional YLP progress (completeness below 80%)' })]),
      h('div', { 'class': 'score-box' }, [sv(prog.completeness + '%'), h('div', { 'class': 'l', text: 'Data completeness (available evidence weight)' })]),
      h('div', { 'class': 'score-box' }, [sv(v.readiness.category), h('div', { 'class': 'l', text: v.readiness.reason })])
    ]));
    out.push(kv([
      ['Employee name', v.name], ['Employee ID', v.id], ['Batch', p.Cohort], ['Business unit', p.BusinessUnit], ['Department', p.Department],
      ['Designation', p.Designation], ['Job level', p.JobLevel], ['Joining date', D.display(p.DateOfJoining) || (p.OriginalDateOfJoining ? 'Unresolved: ' + p.OriginalDateOfJoining : '')],
      ['Manager', hidden ? U.text(p.Manager) : (U.has(p.Manager) ? na('Hidden (email)') : '')], ['HRBP', hidden ? U.text(p.HRBP) : (U.has(p.HRBP) ? na('Hidden (email)') : '')],
      ['Journey stage', v.stage + (v.stageDerived ? ' (derived from activities)' : '')], ['Leadership pathway', v.pathway],
      ['Provisional progress', prog.insufficient ? 'Insufficient Evidence' : prog.provisional + '%'], ['Data completeness', prog.completeness + '%'], ['Readiness category', v.readiness.category],
      ['Last updated', D.display(p.LastUpdated)], ['Dataset source', [U.text(p.SourceFile), U.text(p.SourceSheet)].filter(Boolean).join(' / ')], ['Sample or actual', v.isSample ? 'SAMPLE record (fictional)' : 'ACTUAL imported record'],
      ['Career aspiration', U.text(p.CareerAspiration)]
    ]));
    if (!opts.print) {
      var toggle = h('input', { type: 'checkbox', id: 'pf-contacts', checked: state.showContacts ? true : null });
      toggle.addEventListener('change', function () { state.showContacts = toggle.checked; renderBody(); });
      out.push(h('div', { 'class': 'check admin-only' }, [toggle, h('label', { 'for': 'pf-contacts', text: 'Show manager and HRBP email fields (hidden by default; never shown in presentation mode)' })]));
    }
    out = out.concat(section('How progress is calculated', [
      table('Progress components', ['Component', 'Weight', 'Evidence', 'Score', 'Basis'], v.components.map(function (c) {
        return [c.name, c.weight + '%', c.available ? chip('ok', 'Sufficient') : chip('na', 'Not available'), c.available ? fmt.num(c.score, 1) : na('Excluded'), c.reason];
      }), [1, 3]),
      h('p', { 'class': 'small', text: 'Available weight ' + prog.availableWeight + ' of 100. Provisional progress = weighted evidence score ÷ available weight = ' + prog.weightedScore + ' ÷ ' + prog.availableWeight + ' = ' + (prog.provisional === null ? '—' : prog.provisional + '%') + '. Missing components are excluded, never counted as zero. KRA progress is not included.' }),
      h('p', { 'class': 'disclaimer', text: M.copy.disclaimer })
    ]));
    if (v.alerts.length) out = out.concat(section('Development alerts', [h('ul', { 'class': 'issue-list' }, v.alerts.map(function (a) { return h('li', null, [chip(a.kind, a.kind === 'error' ? 'Priority' : 'Attention'), h('span', { text: a.text })]); }))]));
    out = out.concat(section('Data availability', [
      table('Data availability for ' + v.name, ['Item', 'Status', 'Note'], v.availability.items.map(function (i) { return [i.name, h('span', null, [availIcon(i.status), ' ' + i.status]), i.note]; })),
      h('p', { 'class': 'small muted', text: v.availability.available + ' of ' + v.availability.applicable + ' applicable items available. Missing information is labelled, never converted to zero.' })
    ]));
    out = out.concat(section('Role alignment', roleBlock(v, d, opts)));
    return out;
  }

  function roleBlock(v, d, opts) {
    var r = v.role, out = [];
    var kind = r.status === 'Confirmed' ? 'ok' : r.status === 'High Confidence' ? 'info' : r.status === 'Review Required' ? 'warn' : 'na';
    out.push(h('p', null, [chip(kind, r.status), ' ', r.role ? h('strong', { text: U.text(r.role.UniqueRoleName) || U.text(r.role.WorkRole) }) : na('No suggested role'), r.role ? ' (' + U.text(r.role.BusinessUnit) + ' / ' + U.text(r.role.Department) + ')' : '']));
    out.push(kv([['Match confidence', r.confidence + '%'], ['Matching fields', r.matching.join(', ')], ['Unmatched fields', r.unmatched.join(', ')], ['Confirmation status', r.status === 'Confirmed' ? 'Confirmed by HR' : 'Not confirmed'], ['Key deliverables', r.role ? U.text(r.role.RoleDescriptors) : '']]));
    out.push(h('p', { 'class': 'small muted', text: M.copy.roleAlignment + (r.note ? ' ' + r.note + '.' : '') }));
    if (!opts.print && (d.views.length && (YLP.store.db.RoleDescriptors || []).length)) {
      var roles = YLP.store.db.RoleDescriptors;
      var sel = h('select', { id: 'pf-role' }, [h('option', { value: '', text: 'Choose the confirmed role…' })].concat(roles.map(function (x) { var k = U.text(x.RoleDescriptorID) || YLP.roles.roleKey(x); return h('option', { value: k, selected: r.status === 'Confirmed' && r.role === x ? true : null, text: U.text(x.UniqueRoleName) + ' — ' + U.text(x.BusinessUnit) + ' / ' + U.text(x.Department) }); })));
      var save = h('button', { type: 'button', 'class': 'btn btn-small', text: 'Confirm role mapping' });
      save.addEventListener('click', function () {
        if (!sel.value) return;
        YLP.store.updateMeta(function (meta) { meta.roleMappings = meta.roleMappings || {}; meta.roleMappings[v.id] = sel.value; }, 'Role mapping confirmed for ' + v.name);
      });
      var clearBtn = h('button', { type: 'button', 'class': 'btn btn-small', text: 'Remove confirmation' });
      clearBtn.addEventListener('click', function () { YLP.store.updateMeta(function (meta) { if (meta.roleMappings) delete meta.roleMappings[v.id]; }, 'Role mapping confirmation removed'); });
      out.push(h('div', { 'class': 'filter-row admin-only' }, [h('div', { 'class': 'field' }, [h('label', { 'for': 'pf-role', text: 'HR confirmation' }), sel]), save, r.status === 'Confirmed' ? clearBtn : null]));
    }
    return out;
  }

  function kraTable(list, fy, v) {
    var groups = YLP.kra.validateGroups(list);
    var g = groups[0];
    var head = [];
    if (!list.length) return [h('h3', { text: fy }), h('p', { 'class': 'na', text: 'No KRAs recorded for ' + fy + '.' })];
    head.push(h('div', { 'class': 'court-title' }, [h('h3', { text: fy + (list[0].KRADataType ? ' (' + list[0].KRADataType + ')' : '') }), chip(g.status === 'Valid' ? 'ok' : g.status === 'Warning' ? 'warn' : 'error', 'Weights total ' + g.total + ': ' + g.status)]));
    if (g.repeatedTitles.length) head.push(alertBox('warn', YLP.kra.repeatedTitleMessage + ' (' + g.repeatedTitles.join(', ') + ')'));
    var cls = v.kraCompare.classification;
    head.push(table(fy + ' KRAs for ' + v.name, ['No.', 'KRA', 'Description', 'Weight', 'Target', 'Achievement', 'Current progress', 'Rating', 'Manager observation', 'Status', 'Evidence', 'Role alignment', 'Progression classification', 'Source file', 'Source sheet', 'Last updated'], list.map(function (k) {
      return [k.KRASequence, k.KRAName, k.KRADescription, (k.Weightage === null ? 'Not available' : k.Weightage) + (k.WeightageSource && k.WeightageSource !== String(k.Weightage) ? ' (source ' + k.WeightageSource + ')' : ''),
        missing('Target', k.Target), missing('Achievement', k.Achievement), missing('CurrentProgress', k.CurrentProgress), missing('Rating', k.Rating), missing('ManagerObservation', k.ManagerObservation),
        'Assigned (role expectation)', k.Evidence, U.text(k.RoleAlignment) || v.role.status, cls + (v.kraCompare.source === M.copy.systemSuggestion ? ' (system suggestion)' : ''), k.SourceFile, k.SourceSheet, D.display(k.LastUpdated)];
    }), [0]));
    return head;
  }

  function tabKRAs(v) {
    var out = [alertBox('info', 'Assigned KRAs describe role expectations. They are not achieved performance, and they are never used in the YLP progress score. Missing achievement, progress, rating or manager observation is shown as not available, never as zero.')];
    out = out.concat(kraTable(v.krasPrevious, M.previousFY, v));
    out.push(h('p', { 'class': 'small muted', text: 'Previous FY KRAs contain assigned responsibilities rather than confirmed achievement. They are used only for role scope and year-on-year comparison.' }));
    out = out.concat(kraTable(v.krasCurrent, M.currentFY, v));
    if (v.krasCurrent.length && !v.krasCurrent.some(function (k) { return U.num(k.CurrentProgress) !== null; })) out.push(alertBox('warn', 'Current FY Progress Not Available. It is not used as zero and not used in the YLP score; current KRAs are shown as role-expectation context only.'));
    var others = v.kras.filter(function (k) { return k.FinancialYear !== M.currentFY && k.FinancialYear !== M.previousFY; });
    if (others.length) out = out.concat(kraTable(others, others[0].FinancialYear || 'Other financial year', v));
    if (v.ratingScales.length) {
      out.push(h('h3', { text: 'KRA rating scales' }));
      out.push(alertBox('info', M.copy.thresholds + ' KRA Rating Level 3 means ' + M.kraRatingLevel3Label + '; it is a different scale from Behavioural Competency Level 3: ' + M.behaviouralLevel3Label + '.'));
      out.push(table('Submitted metric scales', ['KRA', 'Weight', 'Parameter', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 5+', 'Rationale'], v.ratingScales.map(function (s) { return [s.KRAName, s.KRAWeight, s.Parameter, s.Level1Threshold, s.Level2Threshold, s.Level3Threshold, s.Level4Threshold, s.Level5Threshold, s.Level5PlusThreshold, s.Rationale]; }), [1]));
    }
    return out;
  }

  function tabCompare(v, d, opts) {
    var c = v.kraCompare, out = [];
    out.push(h('div', { 'class': 'score-pair' }, [
      h('div', { 'class': 'score-box' }, [sv(c.classification), h('div', { 'class': 'l', text: c.source })]),
      h('div', { 'class': 'score-box' }, [sv(String(v.krasPrevious.length) + ' → ' + v.krasCurrent.length), h('div', { 'class': 'l', text: 'KRAs, previous FY to current FY' })]),
      h('div', { 'class': 'score-box' }, [sv(v.transactional.flag ? 'Yes' : 'No'), h('div', { 'class': 'l', text: 'Predominantly transactional current KRAs (' + (v.transactional.share === null ? 'no KRAs' : v.transactional.share + '% of weight') + ')' })])
    ]));
    if (c.source === M.copy.systemSuggestion) out.push(alertBox('warn', M.copy.systemSuggestion + '. ' + c.rationale));
    else out.push(h('p', null, [h('strong', { text: 'Rationale: ' }), c.rationale || na('Not recorded'), c.confirmedBy ? ' Confirmed by ' + c.confirmedBy + (c.confirmationDate ? ' on ' + D.display(c.confirmationDate) : '') + '.' : '']));
    if (c.suggestion && c.source !== M.copy.systemSuggestion && c.suggestion.classification !== 'Insufficient Data') out.push(h('p', { 'class': 'small muted', text: 'System suggestion for reference: ' + c.suggestion.classification + '. ' + c.suggestion.rationale }));
    out.push(table('Year-on-year KRA comparison', ['Dimension', M.previousFY, M.currentFY, 'Change'], c.dimensions.map(function (r) {
      var f = function (x) { return x === null ? na('Insufficient Data') : x + (r.unit === '%' ? '%' : r.unit ? '%' : ''); };
      return [r.name, f(r.prev), f(r.curr), r.change];
    })));
    out.push(h('p', { 'class': 'small muted', text: 'Keyword shares are the percentage of KRA weight whose title or description contains the dimension’s keywords. Classification order: imported confirmed classification, then HR-confirmed classification, then the transparent keyword suggestion, then Insufficient Data.' }));
    out.push(h('p', { 'class': 'disclaimer', text: M.copy.kraComparison }));
    if (!opts.print) {
      var cur = (YLP.store.db.meta.classificationOverrides || {})[v.id] || {};
      var sel = h('select', { id: 'pf-cls' }, [h('option', { value: '', text: 'Choose…' })].concat(M.kraClasses.map(function (k) { return h('option', { value: k, selected: cur.ConfirmedClassification === k ? true : null, text: k }); })));
      var by = h('input', { type: 'text', id: 'pf-cls-by', value: cur.ConfirmedBy || '' });
      var why = h('input', { type: 'text', id: 'pf-cls-why', value: cur.ClassificationRationale || '' });
      var save = h('button', { type: 'button', 'class': 'btn btn-small btn-primary', text: 'Save HR classification' });
      var msg = h('p', { 'class': 'small', role: 'status' });
      save.addEventListener('click', function () {
        if (!sel.value || !by.value.trim()) { msg.textContent = 'Choose a classification and enter who confirmed it.'; return; }
        YLP.store.updateMeta(function (meta) {
          meta.classificationOverrides = meta.classificationOverrides || {};
          meta.classificationOverrides[v.id] = { SuggestedClassification: c.suggestion.classification, ConfirmedClassification: sel.value, ConfirmedBy: YLP.sanitize.text(by.value, 120), ConfirmationDate: D.todayIso(), ClassificationRationale: YLP.sanitize.text(why.value, 600) };
        }, 'HR classification saved for ' + v.name);
      });
      var clr = h('button', { type: 'button', 'class': 'btn btn-small', text: 'Remove HR classification' });
      clr.addEventListener('click', function () { YLP.store.updateMeta(function (meta) { if (meta.classificationOverrides) delete meta.classificationOverrides[v.id]; }, 'HR classification removed'); });
      out.push(h('div', { 'class': 'court admin-only' }, [
        h('h3', { text: 'HR override' }),
        h('div', { 'class': 'filter-row' }, [
          h('div', { 'class': 'field' }, [h('label', { 'for': 'pf-cls', text: 'Confirmed classification' }), sel]),
          h('div', { 'class': 'field' }, [h('label', { 'for': 'pf-cls-by', text: 'Confirmed by' }), by]),
          h('div', { 'class': 'field' }, [h('label', { 'for': 'pf-cls-why', text: 'Classification rationale' }), why])
        ]),
        h('div', { 'class': 'btn-row' }, [save, cur.ConfirmedClassification ? clr : null]), msg
      ]));
    }
    return out;
  }

  function tabCompetencies(v) {
    var c = v.competency, out = [];
    out.push(h('div', { 'class': 'score-pair' }, [
      h('div', { 'class': 'score-box' }, [sv(c.score === null ? 'Insufficient Evidence' : c.score.toFixed(2)), h('div', { 'class': 'l', text: c.score === null ? 'Overall result withheld' : 'Overall (equal weight across five domains), Level ' + c.band })]),
      h('div', { 'class': 'score-box' }, [sv(c.status), h('div', { 'class': 'l', text: c.validatedAnchors + ' of ' + c.totalAnchors + ' anchors validated' })]),
      h('div', { 'class': 'score-box' }, [sv(c.selfAverage === null ? '—' : c.selfAverage.toFixed(2)), h('div', { 'class': 'l', text: 'Self-assessment average (shown for reference; never counted)' })])
    ]));
    if (c.level3Blocked) out.push(alertBox('warn', 'Level 3 overall is not confirmed: ' + c.blockers.join('; ') + '.'));
    if (c.pendingAnchors) out.push(alertBox('info', c.pendingAnchors + ' anchor(s): ' + M.copy.level3Pending));
    out.push(h('div', { 'class': 'mandala' }, [YLP.mandala.build(YLP.mandala.personDomains(v), { label: 'Competency mandala for ' + v.name }), YLP.mandala.legend()]));
    out.push(table('Competency domains', ['Domain', 'Baseline', 'Current', 'Target', 'Gap', 'Status', 'Evidence count', 'Last assessment', 'Assessor', 'Development action', 'Next review', 'Validation', 'Assessment status'], c.domains.map(function (dm) {
      return [dm.name, dm.baseline === null ? '—' : dm.baseline.toFixed(2), dm.score === null ? na('Insufficient Evidence') : dm.score.toFixed(2) + ' (L' + dm.band + ')', '3', dm.gap === null ? '—' : dm.gap.toFixed(2), dm.gapCategory, dm.evidenceCount, D.display(dm.lastAssessmentDate), dm.assessors.join(', '), dm.developmentActions.join('; '), D.display(dm.nextReviewDate), dm.validationSummary, dm.assessmentStatus];
    }), [1, 3, 4, 6]));
    out.push(h('h3', { text: 'Behavioural anchors' }));
    out.push(table('Anchor-level evidence', ['Domain', 'Anchor', 'Baseline', 'Self', 'Current (non-self)', 'Status', 'Evidence count', 'Last assessment', 'Validator', 'Next review'], c.anchors.map(function (a) {
      var gov = a.governing || {};
      return [a.domain, a.anchor, a.baseline, a.selfLevel, a.current, anchorChip(a), a.evidenceCount, D.display(a.lastAssessmentDate), U.text(gov.ValidatorRole) ? gov.ValidatorRole + ' (' + U.text(gov.Assessor) + ')' : '', a.overdue ? chip('error', 'Overdue: ' + D.display(a.nextReviewDate)) : D.display(a.nextReviewDate)];
    }), [2, 3, 4, 6]));
    var pend = c.anchors.filter(function (a) { return a.pending; });
    pend.forEach(function (a) {
      out.push(h('details', null, [h('summary', { text: a.anchor + ': Level 3 validation checks' }), h('ul', { 'class': 'issue-list' }, a.checks.map(function (ch) { return h('li', null, [chip(ch.ok ? 'ok' : 'error', ch.ok ? 'Met' : 'Missing'), h('span', { text: ch.rule })]); }))]));
    });
    out.push(h('p', { 'class': 'small muted', text: 'Level 3 is validated only with a current level of 3 or more, evidence from at least two situations including one non-routine situation, observable output, a current assessment date and sign-off by a manager, sponsor or authorised assessor. Self-assessment alone never establishes a level.' }));
    return out;
  }

  function tabModel(v) {
    var e = v.experience, out = [];
    out.push(h('div', { 'class': 'score-pair' }, [
      h('div', { 'class': 'score-box' }, [sv(e.earned + ' / 70'), h('div', { 'class': 'l', text: e.complete ? '70% experience complete' : 'Experience points (complete needs project, stretch and broader exposure with evidence)' })]),
      h('div', { 'class': 'score-box' }, [sv(v.relationships.earned + ' / 20'), h('div', { 'class': 'l', text: 'Developmental relationships' })]),
      h('div', { 'class': 'score-box' }, [sv(v.learning.earned + ' / 10'), h('div', { 'class': 'l', text: 'Structured learning' })])
    ]));
    if (e.projectPending) out.push(alertBox('error', M.copy.mandatoryPending + ': no cross-functional project is assigned.'));
    out.push(table('70% experience components', ['Component', 'Points', 'Earned', 'Status'], e.components.map(function (c) { return [c.name, c.points, fmt.num(c.earned, 1), c.status + (c.evidenceMissing ? ' (evidence required)' : '')]; }), [1, 2]));
    var acts = [];
    e.components.forEach(function (c) { c.items.forEach(function (a) { acts.push([U.text(a.ActivityName), c.name, 'Assigned', D.display(a.StartDate), D.display(a.TargetDate), a.CompletionPercentage === null || a.CompletionPercentage === undefined ? '—' : a.CompletionPercentage + '%', U.text(a.Status), U.text(a.Owner), U.text(a.Sponsor), U.text(a.Evidence) || na('Evidence not recorded'), U.text(a.ValidationStatus), U.text(a.DevelopmentOutcome)]); }); });
    out.push(table('Experiential activities', ['Activity', 'Component', 'Assigned status', 'Start', 'Target', 'Completion', 'Current status', 'Owner', 'Sponsor', 'Evidence', 'Validation', 'Development outcome'], acts, [5]));
    out.push(table('20% developmental relationships', ['Track', 'Planned', 'Completed', 'Last interaction', 'Key action', 'Action status', 'Next review', 'Development theme', 'Evidence'], v.relationships.tracks.map(function (t) {
      return [t.name, t.planned, t.completed + (t.logged > t.completed ? ' (' + (t.logged - t.completed) + ' logged without evidence)' : ''), D.display(t.lastDate), t.keyAction, t.actionStatus, D.display(t.nextReview), t.theme, t.evidence];
    }), [1, 2]));
    out.push(table('10% structured learning', ['Category', 'Assigned', 'Completed', 'Hours', 'Average score', 'With application evidence', 'Last completion', 'Validated'], v.learning.rows.map(function (r) {
      return [r.name, r.assigned, r.completed, r.hours, r.avgScore, r.withApplication, D.display(r.lastCompletion), r.validated];
    }), [1, 2, 3, 4, 5, 7]));
    return out;
  }

  function tabProject(v, d) {
    var pv = v.project, m = v.mapping, out = [];
    if (!pv) return [alertBox('error', M.copy.mandatoryPending), h('p', { text: 'Every participant should join one cross-functional action-learning project with participants from at least two other functions, a business sponsor and a YLP adviser.' })];
    var p = pv.project;
    out.push(h('div', { 'class': 'project' }, [
      h('h3', { text: pv.title }),
      h('div', { 'class': 'person-chips' }, [chip(pv.completed ? 'ok' : pv.atRisk ? 'warn' : 'info', pv.status), chip(pv.validation === 'Valid' ? 'ok' : pv.validation === 'Provisional' ? 'warn' : 'error', 'Validation: ' + pv.validation), h('span', { 'class': 'tag', text: pv.theme })]),
      YLP.charts.meter('Project completion', pv.completion || 0, 100, { suffix: '%' }),
      kv([['Business problem', U.text(p.BusinessProblem)], ['Business sponsor', U.text(p.ProjectSponsor)], ['YLP adviser', U.text(p.YLPAdviser)], ['Functions', pv.functions.join(', ') + ' (' + pv.functionSource + ')'], ['Baseline', U.text(p.BaselineMeasure)], ['Target impact', U.text(p.TargetImpact)], ['Actual impact', U.text(p.ActualImpact) || na('Not yet measured')], ['Dates', D.display(p.StartDate) + ' to ' + D.display(p.TargetDate)]])
    ]));
    out.push(h('h3', { text: 'This participant’s contribution' }));
    out.push(kv([['Participant role', U.text(m.ParticipantRole)], ['Individual contribution', U.text(m.IndividualContribution) || na('Not recorded: allocation alone is not proof of contribution')], ['Stakeholder feedback', U.text(m.StakeholderFeedback)], ['Sponsor feedback', U.text(m.SponsorFeedback)], ['Contribution rating', U.text(m.ContributionRating)], ['Evidence', U.text(m.Evidence)]]));
    out.push(h('h3', { text: 'Team' }));
    var chips = h('div', { 'class': 'person-chips' });
    pv.members.forEach(function (mm) {
      var b = h('button', { type: 'button', 'class': 'person-chip', text: (mm.participant ? mm.participant.EmployeeName + ' (' + (mm.participant.BusinessUnit || mm.participant.Department) + ')' : mm.mapping.EmployeeID + ' (not in master)') });
      if (mm.participant && d.byId[mm.mapping.EmployeeID]) b.addEventListener('click', function () { open(mm.mapping.EmployeeID); });
      chips.appendChild(b);
    });
    out.push(chips);
    out.push(h('h3', { text: 'Project validation' }));
    out.push(h('ul', { 'class': 'issue-list' }, pv.checks.concat(pv.quality).map(function (c) { return h('li', null, [chip(c.ok ? 'ok' : 'error', c.ok ? 'Met' : 'Not met'), h('span', { text: c.rule + (c.detail ? ': ' + c.detail : '') })]); })));
    out.push(h('h3', { text: 'Project evaluation' }));
    out.push(table('Seven evaluation dimensions (weights total 100%)', ['Dimension', 'Weight', 'Panel score (1–5)'], pv.evaluation.dims.map(function (x) { return [x.name, x.weight + '%', x.score === null ? na('Not scored') : x.score]; }), [1, 2]));
    out.push(h('p', null, [h('strong', { text: 'Final project score: ' }), pv.evaluation.score === null ? na('Not yet evaluated') : pv.evaluation.score + ' of 100', ' (' + pv.evaluation.source + '). Project progress (completion percentage) and the final project score are kept separate.']));
    return out;
  }

  function tabIDP(v) {
    var i = v.idp, out = [];
    out.push(h('div', { 'class': 'score-pair' }, [
      h('div', { 'class': 'score-box' }, [sv(i.status), h('div', { 'class': 'l', text: 'IDP status' })]),
      h('div', { 'class': 'score-box' }, [sv(i.completion === null ? '—' : i.completion + '%'), h('div', { 'class': 'l', text: i.due.length ? 'Completion of ' + i.due.length + ' action(s) due by today' : 'No actions due yet; future actions are not counted' })]),
      h('div', { 'class': 'score-box' }, [sv(String(i.overdue.length)), h('div', { 'class': 'l', text: 'Overdue actions (target date passed, not completed or cancelled)' })])
    ]));
    if (i.noTargetDate) out.push(alertBox('warn', i.noTargetDate + ' development action(s) without target date.'));
    out.push(table('Individual Development Plan', ['Action ID', 'Category', 'Action', 'Competency', 'Owner', 'Start', 'Target', 'Status', 'Completion', 'Evidence', 'Manager comment', 'Next review'], i.actions.map(function (a) {
      var over = i.overdue.indexOf(a) !== -1;
      return [a.ActionID, a.DevelopmentCategory, a.DevelopmentAction, a.CompetencyLinked, a.Owner, D.display(a.StartDate), D.display(a.TargetDate) || na('No target date'), over ? chip('error', 'Overdue: ' + a.Status) : U.text(a.Status), a.CompletionPercentage === null ? '—' : a.CompletionPercentage + '%', a.Evidence, a.ManagerComment, D.display(a.NextReviewDate)];
    }), [8]));
    return out;
  }

  function tabEvidence(v) {
    var groups = [
      ['Competency evidence', v.competencyRecords.filter(function (c) { return U.has(c.Evidence) && !/^baseline/i.test(U.text(c.AssessmentType)); }).map(function (c) { return [D.display(c.AssessmentDate), c.BehaviouralAnchor + ' (' + c.AssessmentType + ', ' + (c.ValidationStatus || 'not validated') + ')', c.Evidence]; })],
      ['Project evidence', v.mapping ? [[v.project ? D.display(v.project.project.TargetDate) : '', 'Project contribution', [U.text(v.mapping.IndividualContribution), U.text(v.mapping.Evidence)].filter(Boolean).join(' — ')]].filter(function (r) { return r[2]; }) : []],
      ['Journey activity evidence', v.activities.filter(function (a) { return U.has(a.Evidence); }).map(function (a) { return [D.display(a.CompletionDate || a.StartDate), a.ActivityName, a.Evidence]; })],
      ['Mentoring and feedback', v.mentoring.filter(function (m) { return U.has(m.Evidence); }).map(function (m) { return [D.display(m.MeetingDate), YLP.progress.interactionType(m) + ': ' + U.text(m.DiscussionTheme), m.Evidence]; }).concat(v.feedback.map(function (f) { return [D.display(f.FeedbackDate), 'Feedback from ' + f.FeedbackProvider + ' (' + f.ProviderRole + ')', f.FeedbackSummary]; }))],
      ['Learning application', v.learningRecords.filter(function (l) { return U.has(l.ApplicationEvidence); }).map(function (l) { return [D.display(l.CompletionDate), l.LearningTitle, l.ApplicationEvidence]; })],
      ['IDP evidence', v.actions.filter(function (a) { return U.has(a.Evidence); }).map(function (a) { return [D.display(a.TargetDate), a.DevelopmentAction, a.Evidence]; })]
    ];
    var total = groups.reduce(function (n, g) { return n + g[1].length; }, 0);
    var out = [h('p', { text: fmt.plural(total, 'evidence item') + ' recorded across competencies, project, activities, relationships, learning and the IDP.' })];
    groups.forEach(function (g) {
      out.push(h('h3', { text: g[0] + ' (' + g[1].length + ')' }));
      out.push(g[1].length ? table(g[0], ['Date', 'Source', 'Evidence'], g[1]) : h('p', { 'class': 'na', text: 'No evidence recorded.' }));
    });
    var completedNoEvidence = v.activities.filter(function (a) { return U.isCompleted(a.Status) && !U.has(a.Evidence); });
    if (completedNoEvidence.length) out.push(alertBox('warn', 'Completed without evidence (credited at most 90%): ' + completedNoEvidence.map(function (a) { return a.ActivityName; }).join('; ')));
    return out;
  }

  function tabTimeline(v) {
    if (!v.timeline.length) return [h('p', { 'class': 'na', text: 'No dated events recorded.' })];
    var future = v.timeline.filter(function (e) { return !D.isPast(e.date) && e.date !== D.todayIso(); });
    var past = v.timeline.filter(function (e) { return future.indexOf(e) === -1; });
    var list = function (evs) { return h('ol', { 'class': 'timeline' }, evs.map(function (e) { return h('li', null, [h('div', { 'class': 'date', text: D.display(e.date) }), h('strong', { text: e.title }), e.detail ? h('div', { 'class': 'small muted', text: e.detail }) : null]); })); };
    var out = [];
    if (future.length) out.push(h('h3', { text: 'Coming up' }), list(future.slice().reverse()));
    out.push(h('h3', { text: 'History (newest first)' }), list(past));
    return out;
  }

  var RENDER = [tabOverview, tabKRAs, tabCompare, tabCompetencies, tabModel, tabProject, tabIDP, tabEvidence, tabTimeline];

  /* ---------------- Dialog ---------------- */
  function head(v) {
    var tools = h('div', { 'class': 'tools' });
    var printBtn = h('button', { type: 'button', 'class': 'btn btn-small btn-ghost', text: 'Print Participant Profile' });
    printBtn.addEventListener('click', function () { printProfile(v.id); });
    var closeBtn = h('button', { type: 'button', 'class': 'icon-btn', 'aria-label': 'Close profile' }, icon('close'));
    closeBtn.addEventListener('click', close);
    tools.appendChild(printBtn); tools.appendChild(closeBtn);
    var tabs = h('div', { 'class': 'tabs', role: 'tablist', 'aria-label': 'Profile sections' });
    TABS.forEach(function (t, i) {
      var b = h('button', { type: 'button', role: 'tab', 'class': 'tab', id: 'pt-' + i, 'aria-selected': state.tab === i ? 'true' : 'false', 'aria-controls': 'profile-panel', tabindex: state.tab === i ? '0' : '-1', text: t });
      b.addEventListener('click', function () { selectTab(i); });
      b.addEventListener('keydown', function (e) {
        var k = e.key, n = TABS.length, to = null;
        if (k === 'ArrowRight') to = (state.tab + 1) % n; else if (k === 'ArrowLeft') to = (state.tab + n - 1) % n; else if (k === 'Home') to = 0; else if (k === 'End') to = n - 1;
        if (to !== null) { e.preventDefault(); selectTab(to); byId('pt-' + to).focus(); }
      });
      tabs.appendChild(b);
    });
    return h('div', { 'class': 'profile-head' }, [
      h('div', { 'class': 'row' }, [YLP.gallery.medallion(v), h('div', null, [h('h2', { id: 'profile-name', text: v.name }), h('div', { 'class': 'meta', text: [v.id, U.text(v.p.Cohort) + ' batch', U.text(v.p.BusinessUnit), U.text(v.p.Department)].filter(Boolean).join(', ') }), h('div', { 'class': 'person-chips' }, [v.isSample ? h('span', { 'class': 'chip chip-sample', text: 'SAMPLE' }) : chip('ok', 'ACTUAL'), chip('info', 'Stage: ' + v.stage), chip('info', v.readiness.category)])]), tools]),
      tabs
    ]);
  }

  function selectTab(i) {
    state.tab = i;
    YLP.dom.qsa('#profile-dialog [role="tab"]').forEach(function (b, j) { b.setAttribute('aria-selected', j === i ? 'true' : 'false'); b.setAttribute('tabindex', j === i ? '0' : '-1'); });
    renderBody();
  }

  function renderBody() {
    var d = YLP.store.derived(), v = d.byId[state.id];
    var panel = byId('profile-panel');
    if (!v || !panel) return;
    clear(panel);
    panel.setAttribute('aria-labelledby', 'pt-' + state.tab);
    RENDER[state.tab](v, d, { print: false }).forEach(function (n) { if (n) panel.appendChild(n); });
    YLP.charts.paintSwatches(panel);
  }

  function open(id) {
    var d = YLP.store.derived(), v = d.byId[id];
    if (!v) return;
    var dlg = byId('profile-dialog');
    if (!dlg.open) { state.opener = document.activeElement; state.tab = 0; }
    state.id = id;
    clear(dlg);
    dlg.appendChild(head(v));
    dlg.appendChild(h('div', { 'class': 'profile-body tabpanel', id: 'profile-panel', role: 'tabpanel', tabindex: '0' }));
    renderBody();
    if (!dlg.open) {
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      if (state.release) state.release();
      state.release = YLP.dom.trapFocus(dlg, close);
      dlg.addEventListener('cancel', onCancel);
    }
    byId('pt-' + state.tab).focus();
  }
  function onCancel(e) { e.preventDefault(); close(); }

  function close() {
    var dlg = byId('profile-dialog');
    if (state.release) { state.release(); state.release = null; }
    dlg.removeEventListener('cancel', onCancel);
    if (dlg.open) { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); }
    state.id = null;
    if (state.opener && document.contains(state.opener)) state.opener.focus();
  }

  function refresh() { if (state.id && byId('profile-dialog').open) { if (YLP.store.derived().byId[state.id]) open(state.id); else close(); } }

  function printView(id) {
    var d = YLP.store.derived(), v = d.byId[id];
    var wrap = h('div', { 'class': 'profile-print' }, [
      h('h1', { text: v.name }),
      h('p', { text: v.id + ', ' + (U.text(v.p.Cohort) || '') + ' batch. ' + (v.isSample ? 'SAMPLE record (fictional).' : 'ACTUAL record.') + ' Data as of ' + (D.display(YLP.store.db.meta.dataAsOf) || 'not recorded') + '. ' + YLP.shell.ENV_LABEL[d.env] + '.' })
    ]);
    RENDER.forEach(function (fn, i) {
      wrap.appendChild(h('h2', { text: TABS[i] }));
      var panel = h('div', { 'class': 'tabpanel' });
      fn(v, d, { print: true }).forEach(function (n) { if (n) panel.appendChild(n); });
      wrap.appendChild(panel);
    });
    YLP.charts.paintSwatches(wrap);
    return wrap;
  }
  function printProfile(id) { YLP.shell.printProfile(printView(id)); }

  YLP.profile = { open: open, close: close, refresh: refresh, anchorChip: anchorChip, availIcon: availIcon, printView: printView, TABS: TABS, state: state };
})(window.YLP);
