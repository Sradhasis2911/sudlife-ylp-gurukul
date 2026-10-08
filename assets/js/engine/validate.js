/* ==========================================================================
   Dataset-wide data-quality checks (spec 60), run on the saved database
   after every change. Import-time checks live in the importers; this report
   catches what only shows up once tables are combined.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var U = YLP.util, D = YLP.dates, M = YLP.model, F = YLP.framework;

  function issue(severity, area, message, ref) { return { severity: severity, area: area, message: message, ref: ref || '' }; }

  function run(db, derived) {
    var out = [];
    var ids = {};
    (db.Participants || []).forEach(function (p) { ids[U.text(p.EmployeeID)] = p; });

    // Participants
    var names = U.groupBy(db.Participants, function (p) { return U.text(p.EmployeeName).toLowerCase().replace(/\s+/g, ' '); });
    Object.keys(names).forEach(function (n) {
      var list = U.uniq(names[n].map(function (p) { return U.text(p.EmployeeID); }));
      if (list.length > 1) out.push(issue('warning', 'Participants', 'Duplicate employee names with different IDs: ' + names[n][0].EmployeeName + ' (' + list.join(', ') + ')'));
    });
    (db.Participants || []).forEach(function (p) {
      var who = U.text(p.EmployeeName) + ' (' + U.text(p.EmployeeID) + ')';
      if (!U.has(p.Cohort)) out.push(issue('warning', 'Participants', 'Missing cohort', who));
      if (!D.isIso(U.text(p.DateOfJoining))) out.push(issue('warning', 'Participants', U.has(p.OriginalDateOfJoining) ? 'Invalid or unresolved joining date "' + p.OriginalDateOfJoining + '"' : 'Joining date not available', who));
      if (!U.has(p.JobLevel)) out.push(issue('warning', 'Participants', 'Job level not available', who));
      if (!U.has(p.JourneyStage)) out.push(issue('warning', 'Participants', 'Missing journey stage (derived from activities)', who));
    });

    // KRAs
    YLP.kra.validateGroups(db.KRAs || []).forEach(function (g) {
      var who = (g.employeeName || '') + ' (' + (g.employeeID || 'no ID') + '), ' + (g.financialYear || 'no FY');
      if (g.status !== 'Valid') out.push(issue(g.status === 'Error' ? 'error' : 'warning', 'KRAs', 'KRA weights total ' + g.total + ' (' + g.status + ')', who));
      if (g.repeatedTitles.length) out.push(issue('warning', 'KRAs', YLP.kra.repeatedTitleMessage + ' "' + g.repeatedTitles.join('", "') + '"', who));
    });
    (db.KRAs || []).forEach(function (k) {
      if (!U.has(k.FinancialYear)) out.push(issue('error', 'KRAs', 'Missing KRA financial year', U.text(k.EmployeeID) + ' ' + U.text(k.KRAName)));
      if (/\.xls[xm]?$/i.test(U.text(k.SourceFile)) && !U.has(k.SourceSheet)) out.push(issue('warning', 'KRAs', 'Missing source sheet', U.text(k.EmployeeID) + ' ' + U.text(k.KRAName)));
      if (U.has(k.EmployeeID) && !ids[U.text(k.EmployeeID)]) out.push(issue('warning', 'KRAs', 'Unmatched KRA record (employee not in the participant master)', U.text(k.EmployeeID) + ' ' + U.text(k.KRAName)));
    });
    var kraNames = {};
    (db.KRAs || []).forEach(function (k) { kraNames[U.text(k.EmployeeID) + '|' + U.normKey(k.KRAName)] = true; });
    var seenScale = {};
    (db.KRARatingScales || []).forEach(function (s) {
      var key = U.text(s.EmployeeID) + '|' + U.normKey(s.KRAName);
      if (!kraNames[key] && !seenScale[key]) { seenScale[key] = true; out.push(issue('warning', 'KRA rating scales', 'Metric scale without matching KRA: "' + U.text(s.KRAName) + '"', U.text(s.EmployeeID))); }
    });

    // Competencies
    (db.Competencies || []).forEach(function (c) {
      var who = U.text(c.EmployeeID) + ' · ' + U.text(c.BehaviouralAnchor);
      var lvl = U.num(c.CurrentLevel);
      if (U.has(c.CurrentLevel) && (lvl === null || lvl < 1 || lvl > 5)) out.push(issue('error', 'Competencies', 'Invalid competency score "' + c.CurrentLevel + '" (must be 1 to 5)', who));
      if (U.has(c.SourceTargetLevel) && U.num(c.SourceTargetLevel) !== M.behaviouralTargetLevel) out.push(issue('warning', 'Competencies', 'Target proficiency in source was ' + c.SourceTargetLevel + '; fixed at 3', who));
      if (!D.isIso(U.text(c.AssessmentDate))) out.push(issue('warning', 'Competencies', 'Missing assessment date', who));
      if (!U.has(c.Assessor)) out.push(issue('warning', 'Competencies', 'Missing assessor', who));
      if (!U.has(c.Evidence) && !/^self/i.test(U.text(c.AssessmentType))) out.push(issue('warning', 'Competencies', 'Missing competency evidence', who));
      if (!F.anchorByName(c.BehaviouralAnchor) && !(db.CompetencyFramework || []).some(function (f) { return U.normKey(f.BehaviouralAnchor) === U.normKey(c.BehaviouralAnchor); })) out.push(issue('warning', 'Competencies', 'Anchor not in the competency framework', who));
      if (U.has(c.EmployeeID) && !ids[U.text(c.EmployeeID)]) out.push(issue('warning', 'Competencies', 'Unmatched participant', who));
    });

    // Projects
    (derived ? derived.projects : []).forEach(function (pv) {
      var who = pv.id + ' ' + pv.title;
      pv.checks.forEach(function (c) { if (!c.ok) out.push(issue('warning', 'Projects', c.rule + ' — ' + c.detail, who)); });
      if (!pv.milestones.length) out.push(issue('warning', 'Projects', 'Missing milestone (no project milestones recorded)', who));
    });
    var projIds = {};
    (db.Projects || []).forEach(function (p) { projIds[U.text(p.ProjectID)] = true; });
    var perEmp = {};
    (db.ProjectParticipants || []).forEach(function (m) {
      var who = U.text(m.ProjectID) + ' / ' + U.text(m.EmployeeID);
      if (!projIds[U.text(m.ProjectID)] || !ids[U.text(m.EmployeeID)]) out.push(issue('error', 'Project participants', 'Invalid employee-project mapping', who));
      perEmp[U.text(m.EmployeeID)] = (perEmp[U.text(m.EmployeeID)] || 0) + 1;
    });
    Object.keys(perEmp).forEach(function (e) { if (perEmp[e] > 1) out.push(issue('warning', 'Project participants', 'Participant mapped to more than one cross-functional project', e)); });
    (db.Participants || []).forEach(function (p) { if (!perEmp[U.text(p.EmployeeID)]) out.push(issue('warning', 'Projects', 'Participant without project (' + M.copy.mandatoryPending + ')', U.text(p.EmployeeName) + ' (' + U.text(p.EmployeeID) + ')')); });

    // Development, learning, journey
    (db.DevelopmentActions || []).forEach(function (a) {
      if (!D.isIso(U.text(a.TargetDate))) out.push(issue('warning', 'Development actions', 'Development action without target date', U.text(a.ActionID)));
      var pct = U.num(a.CompletionPercentage);
      if (pct !== null && (pct < 0 || pct > 100)) out.push(issue('error', 'Development actions', 'Completion below 0 or above 100', U.text(a.ActionID)));
    });
    (db.JourneyActivities || []).forEach(function (a) {
      var pct = U.num(a.CompletionPercentage);
      if (pct !== null && (pct < 0 || pct > 100)) out.push(issue('error', 'Journey activities', 'Completion below 0 or above 100', U.text(a.ActivityID)));
      if (!U.has(a.JourneyStage)) out.push(issue('warning', 'Journey activities', 'Missing journey stage', U.text(a.ActivityID)));
    });
    (db.RoleDescriptors || []).forEach(function (r) {
      if (!U.has(r.UniqueRoleName)) out.push(issue('warning', 'Role descriptors', 'Role descriptor without unique role', U.text(r.BusinessUnit) + ' / ' + U.text(r.Department)));
    });
    if ((db.unmatched || []).length) out.push(issue('warning', 'Unmatched records', db.unmatched.length + ' record(s) waiting in the Unmatched Records queue'));
    return out;
  }

  YLP.validate = { run: run };
})(window.YLP);
