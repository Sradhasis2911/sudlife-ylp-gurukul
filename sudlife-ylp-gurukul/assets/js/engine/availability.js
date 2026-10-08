/* ==========================================================================
   Data availability panel (spec 17). Fourteen items per participant, each
   Available / Partially Available / Not Available / Validation Required.
   D-14: "Not Applicable" is added for Previous FY KRAs of participants who
   joined in the current financial year, so they are not shown as gaps.
   Missing information is labelled, never converted to zero.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var U = YLP.util, M = YLP.model, D = YLP.dates;
  var A = 'Available', P = 'Partially Available', N = 'Not Available', V = 'Validation Required', NA = 'Not Applicable';

  function item(name, status, note) { return { name: name, status: status, note: note || '' }; }

  function kraStatus(groups, kras, label) {
    if (!kras.length) return item(label, N);
    var g = groups[0];
    if (g && g.status !== 'Valid') return item(label, V, 'Weights total ' + g.total + ' (' + g.status + ')');
    if (g && g.repeatedTitles.length) return item(label, V, 'Repeated KRA title');
    return item(label, A, kras.length + ' KRAs, weights total 100');
  }

  function build(v) {
    var p = v.p, comp = v.competency, today = D.todayIso();
    var out = [];

    var core = ['EmployeeID', 'EmployeeName', 'Department', 'BusinessUnit', 'DateOfJoining', 'Cohort', 'JobLevel', 'Designation'];
    var missing = core.filter(function (f) { return !U.has(p[f]); });
    out.push(missing.length === 0 ? item('Participant master', A) : missing.length < 3 ? item('Participant master', P, 'Missing: ' + missing.join(', ')) : item('Participant master', V, 'Missing: ' + missing.join(', ')));

    out.push(kraStatus(v.kraGroupsCurrent, v.krasCurrent, 'Current FY KRA'));
    var joinedThisFY = D.isIso(p.DateOfJoining) && p.DateOfJoining >= M.currentFYStart;
    out.push(joinedThisFY && !v.krasPrevious.length ? item('Previous FY KRA', NA, 'Joined in ' + M.currentFY) : kraStatus(v.kraGroupsPrevious, v.krasPrevious, 'Previous FY KRA'));

    var rm = v.role;
    out.push(rm.status === 'Confirmed' || rm.status === 'High Confidence' ? item('Role descriptor', A, rm.status) : rm.status === 'Review Required' ? item('Role descriptor', V, 'Suggested match, ' + rm.confidence + '% confidence') : item('Role descriptor', N));

    var withBaseline = comp.anchors.filter(function (a) { return a.baseline !== null; }).length;
    out.push(withBaseline === 0 ? item('Competency baseline', N) : withBaseline >= comp.totalAnchors * 0.5 ? item('Competency baseline', A, withBaseline + ' of ' + comp.totalAnchors + ' anchors') : item('Competency baseline', P, withBaseline + ' of ' + comp.totalAnchors + ' anchors'));

    var withCurrent = comp.domains.filter(function (d) { return !d.insufficient; }).length;
    if (comp.assessedAnchors === 0) out.push(item('Current competency assessment', N));
    else if (comp.pendingAnchors > 0 && withCurrent < 5) out.push(item('Current competency assessment', V, comp.pendingAnchors + ' anchor(s): ' + M.copy.level3Pending));
    else out.push(withCurrent === 5 ? item('Current competency assessment', A, 'All five domains') : item('Current competency assessment', P, withCurrent + ' of 5 domains with validated evidence'));

    out.push(comp.managerCoverage === 0 ? item('Manager assessment', N, M.missingLabels.ManagerObservation) : comp.managerCoverage >= comp.totalAnchors * 0.5 ? item('Manager assessment', A) : item('Manager assessment', P, comp.managerCoverage + ' of ' + comp.totalAnchors + ' anchors'));

    var m = v.mapping;
    out.push(!m ? item('Project evidence', N, M.copy.mandatoryPending) : U.has(m.IndividualContribution) && U.has(m.Evidence) ? item('Project evidence', A) : U.has(m.IndividualContribution) || U.has(m.Evidence) ? item('Project evidence', P) : item('Project evidence', P, 'Allocated; contribution evidence not recorded'));

    var withProgress = v.krasCurrent.filter(function (k) { return U.num(k.CurrentProgress) !== null; }).length;
    out.push(!v.krasCurrent.length || withProgress === 0 ? item('Current FY progress', N, 'Current FY ' + M.missingLabels.CurrentProgress) : withProgress === v.krasCurrent.length ? item('Current FY progress', A) : item('Current FY progress', P, withProgress + ' of ' + v.krasCurrent.length + ' KRAs'));

    var rated = v.krasPrevious.filter(function (k) { return U.has(k.Rating); }).length;
    out.push(joinedThisFY && !v.krasPrevious.length ? item('Previous FY rating', NA, 'Joined in ' + M.currentFY) : rated ? item('Previous FY rating', A) : item('Previous FY rating', N, M.missingLabels.Rating));

    out.push(U.has(p.CareerAspiration) ? item('Career aspiration', A) : item('Career aspiration', N));
    out.push(v.mentorStatus === 'Allocated' ? item('Mentor allocated', A) : v.mentorStatus === 'Pending' ? item('Mentor allocated', P, 'Pending') : item('Mentor allocated', N));
    out.push(!v.idp.actions.length ? item('IDP available', N) : v.idp.noTargetDate ? item('IDP available', V, v.idp.noTargetDate + ' action(s) without target date') : item('IDP available', A, v.idp.actions.length + ' actions'));
    out.push(v.feedback.length ? item('Stakeholder feedback available', A, v.feedback.length + ' record(s)') : item('Stakeholder feedback available', N));

    var score = out.filter(function (i) { return i.status !== NA; });
    return {
      items: out,
      available: out.filter(function (i) { return i.status === A; }).length,
      applicable: score.length,
      share: score.length ? Math.round(out.filter(function (i) { return i.status === A; }).length / score.length * 100) : 0
    };
  }

  YLP.availability = { build: build };
})(window.YLP);
