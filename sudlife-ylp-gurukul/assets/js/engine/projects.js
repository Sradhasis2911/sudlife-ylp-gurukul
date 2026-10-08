/* ==========================================================================
   Cross-functional projects (spec 51–52).
   Functions are derived from the participant master via ProjectParticipants
   (D-41: a "function" is the participant's Business Unit, falling back to
   Department). Imported FunctionsRepresented is used only when no member's
   function is known, and the validation is then marked Provisional.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var U = YLP.util, M = YLP.model, D = YLP.dates;

  function splitList(v) { return U.uniq(U.text(v).split(/[,;\/|]+/).map(function (x) { return x.trim(); })); }

  function evaluation(p) {
    var dims = M.projectEvaluation.map(function (d) {
      var v = U.num(p[d.key]);
      return { key: d.key, name: d.name, weight: d.weight, score: v !== null && v >= 1 && v <= 5 ? v : null };
    });
    var scored = dims.filter(function (d) { return d.score !== null; });
    if (scored.length) {
      var w = scored.reduce(function (n, d) { return n + d.weight; }, 0);
      var total = scored.reduce(function (n, d) { return n + d.weight * (d.score / 5 * 100); }, 0) / w;
      return { dims: dims, score: U.round(total, 1), complete: scored.length === dims.length, source: scored.length === dims.length ? 'Seven-dimension panel evaluation' : 'Partial panel evaluation (' + scored.length + ' of 7 dimensions)' };
    }
    var ps = U.num(p.PanelScore);
    return { dims: dims, score: ps !== null ? U.round(ps, 1) : null, complete: false, source: ps !== null ? 'Imported panel score' : 'Not yet evaluated' };
  }

  function view(p, db, people) {
    var members = (db.ProjectParticipants || []).filter(function (m) { return U.text(m.ProjectID) === U.text(p.ProjectID); }).map(function (m) {
      return { mapping: m, participant: people[U.text(m.EmployeeID)] || null };
    });
    var known = members.filter(function (m) { return m.participant && (U.has(m.participant.BusinessUnit) || U.has(m.participant.Department)); });
    var derived = U.uniq(known.map(function (m) { return U.text(m.participant.BusinessUnit) || U.text(m.participant.Department); }));
    var imported = splitList(p.FunctionsRepresented);
    var provisional = known.length === 0;
    var functions = provisional ? imported : derived;
    var exception = U.truthy(p.ExceptionApproved);
    var R = M.projectRules;
    var size = members.length;

    var checks = [
      { rule: 'At least ' + R.minFunctions + ' distinct functions or business units', ok: functions.length >= R.minFunctions, detail: functions.length + ' (' + (provisional ? 'from imported FunctionsRepresented' : 'derived from participant master') + ')' },
      { rule: R.minParticipants + ' to ' + R.maxParticipants + ' participants' + (exception ? ' (exception approved)' : ''), ok: exception || (size >= R.minParticipants && size <= R.maxParticipants), detail: size + ' assigned' },
      { rule: 'Business sponsor present', ok: U.has(p.ProjectSponsor), detail: U.text(p.ProjectSponsor) || 'Not recorded' },
      { rule: 'YLP adviser present', ok: U.has(p.YLPAdviser), detail: U.text(p.YLPAdviser) || 'Not recorded' }
    ];
    var quality = [
      { rule: 'Measurable business problem', ok: U.has(p.BusinessProblem) },
      { rule: 'Defined baseline', ok: U.has(p.BaselineMeasure) },
      { rule: 'Target impact', ok: U.has(p.TargetImpact) }
    ];
    var invalid = checks.filter(function (c) { return !c.ok; });
    // Spec 52: without participant-function data the validation is Provisional.
    var validation = provisional ? 'Provisional' : invalid.length ? 'Not Valid' : 'Valid';

    var status = U.text(p.Status) || 'Planned';
    var pct = U.num(p.CompletionPercentage);
    var closed = U.isClosed(status);
    var risk = [];
    if (/at risk/i.test(status)) risk.push('Status marked At Risk');
    if (!closed && D.isPast(U.text(p.TargetDate))) risk.push('Target date has passed');
    if (!closed && D.isIso(p.StartDate) && D.isIso(p.TargetDate) && pct !== null) {
      var total = D.daysBetween(p.StartDate, p.TargetDate), elapsed = D.daysBetween(p.StartDate, D.todayIso());
      if (total > 0 && elapsed > 0) {
        var expected = U.clamp(elapsed / total * 100, 0, 100);
        if (pct < expected - R.atRiskScheduleGap) risk.push('Completion ' + pct + '% against ' + Math.round(expected) + '% of time elapsed');
      }
    }
    var milestones = (db.JourneyActivities || []).filter(function (a) { return U.text(a.ProjectID) === U.text(p.ProjectID); });
    var overdueMilestones = milestones.filter(function (a) { return D.isPast(U.text(a.TargetDate)) && !U.isClosed(a.Status); });
    var pilot = milestones.some(function (a) { return /pilot|proof of concept|poc/i.test(U.text(a.ActivityName)); });
    quality.push({ rule: 'Pilot or proof of concept planned', ok: pilot });

    return {
      project: p, id: U.text(p.ProjectID), title: U.text(p.ProjectTitle) || U.text(p.ProjectID), theme: U.text(p.ProjectTheme) || 'Theme not recorded',
      status: status, closed: closed, completed: U.isCompleted(status), completion: pct,
      members: members, size: size, functions: functions, functionSource: provisional ? 'Imported FunctionsRepresented (provisional)' : 'Participant master',
      checks: checks, quality: quality, validation: validation, exception: exception,
      atRisk: risk.length > 0 && !closed, riskReasons: risk,
      milestones: milestones, overdueMilestones: overdueMilestones,
      evaluation: evaluation(p)
    };
  }

  function all(db, people) {
    return (db.Projects || []).map(function (p) { return view(p, db, people); });
  }

  YLP.projects = { view: view, all: all, evaluation: evaluation };
})(window.YLP);
