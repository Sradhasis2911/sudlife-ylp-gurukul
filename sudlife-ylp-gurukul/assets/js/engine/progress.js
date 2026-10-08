/* ==========================================================================
   Development progress (spec 25–28, 64–67).

   Six components, each scored 0–100 only when it has sufficient evidence.
   ProvisionalProgress = sum(score × weight) / AvailableWeight
   DataCompleteness    = AvailableWeight (out of 100)
   Missing components are excluded, never scored as zero. KRA progress is
   never included (spec 64, 67).
   ========================================================================== */
(function (YLP) {
  'use strict';

  var U = YLP.util, M = YLP.model, D = YLP.dates;

  function typeKey(a) { return M.activityTypeMap[U.text(a.ActivityType).toLowerCase()] || null; }
  function evid(rec, fields) { return fields.some(function (f) { return U.has(rec[f]); }); }

  /* ---------------- 70% experience ---------------- */
  function experience(ctx) {
    var acts = ctx.activities.filter(function (a) { return !U.isCancelled(a.Status); });
    var comps = M.experience70.map(function (c) {
      if (c.key === 'project') {
        if (!ctx.project) return { key: c.key, name: c.name, points: c.points, credit: 0, earned: 0, status: M.copy.mandatoryPending, items: [], evidenceMissing: false };
        var m = ctx.mapping || {};
        var cr = U.credit({ Status: ctx.project.status, CompletionPercentage: ctx.project.completion, Evidence: U.text(m.Evidence) || U.text(m.IndividualContribution) });
        return {
          key: c.key, name: c.name, points: c.points, credit: cr.value, earned: c.points * cr.value, evidenceMissing: cr.evidenceMissing,
          status: ctx.project.completed ? (cr.evidenceMissing ? 'Completed, evidence required' : 'Completed') : ctx.project.status,
          items: [{ ActivityName: ctx.project.title, Status: ctx.project.status, CompletionPercentage: ctx.project.completion, StartDate: ctx.project.project.StartDate, TargetDate: ctx.project.project.TargetDate, Owner: U.text(m.ParticipantRole), Sponsor: U.text(ctx.project.project.ProjectSponsor), Evidence: U.text(m.Evidence) || U.text(m.IndividualContribution), ValidationStatus: U.has(m.SponsorFeedback) ? 'Sponsor feedback recorded' : 'Sponsor feedback pending', DevelopmentOutcome: U.text(ctx.project.project.ActualImpact) }]
        };
      }
      var items = acts.filter(function (a) { return typeKey(a) === c.key; });
      if (!items.length) return { key: c.key, name: c.name, points: c.points, credit: 0, earned: 0, status: 'Not assigned', items: [], evidenceMissing: false };
      var credits = items.map(function (a) { return U.credit(a, 'CompletionPercentage', 'Status', ['Evidence']); });
      var value = U.mean(credits.map(function (x) { return x.value; }));
      var done = items.every(function (a, i) { return U.isCompleted(a.Status) && !credits[i].evidenceMissing; });
      return {
        key: c.key, name: c.name, points: c.points, credit: value, earned: c.points * value, items: items,
        evidenceMissing: credits.some(function (x) { return x.evidenceMissing; }),
        status: done ? 'Completed' : items.some(function (a) { return U.isCompleted(a.Status); }) ? 'Completed, evidence required' : (U.text(items[0].Status) || 'Assigned')
      };
    });
    var get = function (k) { return comps.filter(function (c) { return c.key === k; })[0]; };
    var completeWithEvidence = function (c) { return c.status === 'Completed'; };
    var complete = completeWithEvidence(get('project')) && completeWithEvidence(get('stretch')) && M.broaderExposureKeys.some(function (k) { return completeWithEvidence(get(k)); });
    var earned = comps.reduce(function (n, c) { return n + c.earned; }, 0);
    return { components: comps, earned: U.round(earned, 1), max: 70, complete: complete, projectPending: !ctx.project };
  }

  /* ---------------- 20% developmental relationships ---------------- */
  function interactionType(r) { return U.text(r.InteractionType) || 'Mentoring'; }

  function relationships(ctx) {
    var today = D.todayIso();
    var tracks = M.relationshipTracks.map(function (t) {
      var recs, done, dateField, actionField, themeField;
      if (t.source === 'Mentoring') {
        recs = ctx.mentoring.filter(function (r) { return U.normKey(interactionType(r)) === U.normKey(t.interactionType); });
        dateField = 'MeetingDate'; actionField = 'ActionCommitted'; themeField = 'DiscussionTheme';
        done = recs.filter(function (r) { return D.isIso(r.MeetingDate) && !D.isBefore(today, r.MeetingDate) && evid(r, ['Evidence', 'ActionCommitted']); });
      } else {
        var sponsor = t.key === 'sponsor';
        recs = ctx.feedback.filter(function (r) { return /sponsor/i.test(U.text(r.ProviderRole)) === sponsor; });
        dateField = 'FeedbackDate'; actionField = 'FeedbackSummary'; themeField = 'CompetencyLinked';
        done = recs.filter(function (r) { return D.isIso(r.FeedbackDate) && !D.isBefore(today, r.FeedbackDate) && evid(r, ['FeedbackSummary', 'Evidence']); });
        if (sponsor && !done.length && ctx.mapping && U.has(ctx.mapping.SponsorFeedback)) {
          done = [{ FeedbackSummary: ctx.mapping.SponsorFeedback, FeedbackDate: null, Evidence: 'Recorded on project mapping' }];
        }
      }
      var sorted = recs.slice().sort(U.byDate(dateField));
      var last = sorted[sorted.length - 1] || done[done.length - 1] || null;
      var reviews = recs.map(function (r) { return r.NextReviewDate; }).filter(D.isIso).sort();
      return {
        key: t.key, name: t.name, planned: t.planned, completed: done.length, logged: recs.length,
        evidenceMissing: recs.length - done.filter(function (r) { return recs.indexOf(r) !== -1; }).length,
        completion: Math.min(done.length / t.planned, 1),
        lastDate: last ? last[dateField] : null,
        keyAction: last ? U.text(last[actionField]) : '',
        actionStatus: last && t.source === 'Mentoring' ? (U.truthy(last.ActionCompleted) ? 'Completed' : U.has(last.ActionCommitted) ? 'Open' : 'No action recorded') : (last ? 'Received' : 'Not started'),
        nextReview: reviews.length ? reviews[reviews.length - 1] : null,
        theme: last ? U.text(last[themeField]) || U.text(last.Context) : '',
        evidence: last ? U.text(last.Evidence) : ''
      };
    });
    var avg = U.mean(tracks.map(function (t) { return t.completion; })) || 0;
    return { tracks: tracks, earned: U.round(20 * avg, 1), max: 20 };
  }

  /* ---------------- 10% structured learning ---------------- */
  function category(r) {
    var t = U.text(r.LearningType) + ' ' + U.text(r.LearningTitle);
    for (var i = 0; i < M.learningCategories.length; i++) if (M.learningCategories[i].match.test(U.text(r.LearningType))) return M.learningCategories[i];
    for (var j = 0; j < M.learningCategories.length; j++) if (M.learningCategories[j].match.test(t)) return M.learningCategories[j];
    return { key: 'other', name: 'Other learning', business: false };
  }
  function learningCredit(r) {
    if (U.isCancelled(r.Status)) return null;
    if (!U.isCompleted(r.Status)) return 0;
    var c = U.has(r.ApplicationEvidence) ? 1 : M.learningNoApplicationCredit;
    var score = U.num(r.AssessmentScore);
    if (score !== null && score < M.learningPassScore) c = Math.min(c, M.learningNoApplicationCredit);
    return c;
  }
  function learning(ctx) {
    var items = ctx.learning.filter(function (r) { return !U.isCancelled(r.Status); });
    var rows = M.learningCategories.concat([{ key: 'other', name: 'Other learning' }]).map(function (cat) {
      var mine = items.filter(function (r) { return category(r).key === cat.key; });
      var scores = mine.map(function (r) { return U.num(r.AssessmentScore); }).filter(function (x) { return x !== null; });
      var completed = mine.filter(function (r) { return U.isCompleted(r.Status); });
      var dates = completed.map(function (r) { return r.CompletionDate; }).filter(D.isIso).sort();
      return {
        key: cat.key, name: cat.name, items: mine, assigned: mine.length, completed: completed.length,
        hours: U.round(mine.reduce(function (n, r) { return n + (U.num(r.LearningHours) || 0); }, 0), 1),
        avgScore: scores.length ? U.round(U.mean(scores), 0) : null,
        withApplication: completed.filter(function (r) { return U.has(r.ApplicationEvidence); }).length,
        lastCompletion: dates.length ? dates[dates.length - 1] : null,
        validated: mine.filter(function (r) { return /^validated$/i.test(U.text(r.ValidationStatus)); }).length
      };
    }).filter(function (r) { return r.assigned > 0 || r.key !== 'other'; });
    var credits = items.map(learningCredit).filter(function (x) { return x !== null; });
    var avg = credits.length ? U.mean(credits) : 0;
    return { rows: rows, items: items, earned: U.round(10 * avg, 1), max: 10, assigned: items.length };
  }

  /* ---------------- IDP (spec 66) ---------------- */
  function idp(ctx) {
    var today = D.todayIso();
    var actions = ctx.actions.filter(function (a) { return !U.isCancelled(a.Status); });
    var due = actions.filter(function (a) { return D.isIso(a.TargetDate) && !D.isBefore(today, a.TargetDate); });
    var overdue = actions.filter(function (a) { return D.isIso(a.TargetDate) && D.isBefore(a.TargetDate, today) && !U.isClosed(a.Status); });
    var credits = due.map(function (a) { return U.credit(a, 'CompletionPercentage', 'Status', ['Evidence']).value; });
    var completion = due.length ? U.round(U.mean(credits) * 100, 1) : null;
    var allDone = actions.length > 0 && actions.every(function (a) { return U.isCompleted(a.Status); });
    var status;
    if (!actions.length) {
      var imported = U.text(ctx.p.IDPStatus);
      status = imported && M.idpStatuses.indexOf(imported) !== -1 ? imported : 'Not Started';
    } else if (allDone) status = 'Completed';
    else if (overdue.length) status = 'Overdue';
    else if (!due.length) status = 'Initiated';
    else status = 'On Track';
    return {
      actions: actions, due: due, overdue: overdue, status: status, completion: completion,
      noTargetDate: actions.filter(function (a) { return !D.isIso(a.TargetDate); }).length,
      component: due.length ? { available: true, score: completion, reason: due.length + ' action(s) due to date' } : { available: false, score: null, reason: actions.length ? 'No IDP actions due yet' : 'No IDP actions recorded' }
    };
  }

  /* ---------------- Business and insurance learning ---------------- */
  function businessLearning(learn) {
    var items = learn.items.filter(function (r) { return category(r).business; });
    if (!items.length) return { available: false, score: null, reason: 'No business or insurance learning assigned', items: [] };
    var credits = items.map(learningCredit).filter(function (x) { return x !== null; });
    return { available: true, score: U.round(U.mean(credits) * 100, 1), reason: items.filter(function (r) { return U.isCompleted(r.Status); }).length + ' of ' + items.length + ' modules completed', items: items };
  }

  /* ---------------- Program discipline and evidence ---------------- */
  function discipline(ctx, rel) {
    var parts = [];
    var timed = ctx.activities.filter(function (a) { return D.isIso(a.CompletionDate) && D.isIso(a.TargetDate); });
    if (timed.length) parts.push({ name: 'Timely submissions', value: timed.filter(function (a) { return !D.isBefore(a.TargetDate, a.CompletionDate); }).length / timed.length });
    var mgr = rel.tracks.filter(function (t) { return t.key === 'manager'; })[0];
    var expected = M.relationshipTracks.filter(function (t) { return t.key === 'manager'; })[0].planned;
    if (D.isIso(ctx.p.DateOfJoining)) expected = U.clamp(Math.floor(D.daysBetween(ctx.p.DateOfJoining, D.todayIso()) / 91), 1, expected);
    parts.push({ name: 'Review participation', value: Math.min(mgr.completed / expected, 1) });
    var completedItems = ctx.activities.filter(function (a) { return U.isCompleted(a.Status); })
      .concat(ctx.actions.filter(function (a) { return U.isCompleted(a.Status); }))
      .concat(ctx.learning.filter(function (a) { return U.isCompleted(a.Status); }));
    if (completedItems.length) parts.push({ name: 'Evidence completeness', value: completedItems.filter(function (r) { return evid(r, ['Evidence', 'ApplicationEvidence']); }).length / completedItems.length });
    var committed = ctx.mentoring.filter(function (r) { return U.has(r.ActionCommitted); });
    if (committed.length) parts.push({ name: 'Action closure', value: committed.filter(function (r) { return U.truthy(r.ActionCompleted); }).length / committed.length });
    var avail = parts.length >= 2;
    return {
      parts: parts, notScored: ['Quality of documentation (no data field; reviewed by the Program owner)'],
      available: avail, score: avail ? U.round(U.mean(parts.map(function (x) { return x.value; })) * 100, 1) : null,
      reason: avail ? parts.length + ' of 4 measures available' : 'Fewer than two discipline measures available'
    };
  }

  /* ---------------- Stage and status helpers ---------------- */
  function journeyStage(p, activities) {
    var raw = U.text(p.JourneyStage).toLowerCase();
    for (var i = 0; i < M.stages.length; i++) if (raw && raw.indexOf(M.stages[i].toLowerCase()) === 0) return { stage: M.stages[i], derived: false };
    var idx = -1;
    activities.forEach(function (a) {
      var s = M.stages.map(function (x) { return x.toLowerCase(); }).indexOf(U.text(a.JourneyStage).toLowerCase());
      if (s > idx && (U.isCompleted(a.Status) || /progress/i.test(U.text(a.Status)))) idx = s;
    });
    return { stage: M.stages[Math.max(idx, 0)], derived: true };
  }

  function mentorStatus(p, mentoring) {
    var raw = U.text(p.MentorStatus);
    if (/not|^no$|unalloc/i.test(raw)) return 'Not Allocated';
    if (/pending|await/i.test(raw)) return 'Pending';
    if (/alloc|assign|^yes$|active/i.test(raw)) return 'Allocated';
    return mentoring.some(function (r) { return interactionType(r) === 'Mentoring'; }) ? 'Allocated' : 'Not Allocated';
  }

  function pathway(p) {
    var raw = U.text(p.LeadershipPathway).toLowerCase();
    if (/special/.test(raw)) return 'Specialist Leadership';
    if (/project/.test(raw)) return 'Project Leadership';
    if (/people|manag/.test(raw)) return 'People Leadership';
    if (/function/.test(raw)) return 'Functional Leadership';
    return 'Not Yet Identified';
  }

  /* ---------------- Composition ---------------- */
  function overall(components) {
    var avail = components.filter(function (c) { return c.available; });
    var availableWeight = avail.reduce(function (n, c) { return n + c.weight; }, 0);
    var weighted = avail.reduce(function (n, c) { return n + c.score * c.weight; }, 0);
    var provisional = availableWeight ? U.round(weighted / availableWeight, 1) : null;
    var completeness = availableWeight;
    var label = completeness < M.completeness.insufficientBelow ? 'Insufficient Evidence' : completeness < M.completeness.provisionalBelow ? 'Provisional YLP Progress' : 'YLP Progress';
    return { availableWeight: availableWeight, weightedScore: U.round(weighted, 1), provisional: provisional, completeness: completeness, label: label, insufficient: completeness < M.completeness.insufficientBelow };
  }

  // D-44..D-46: readiness is developmental only, never a promotion signal.
  function readiness(comp, prog, exp, project) {
    if (prog.insufficient) return { category: 'Insufficient Evidence', reason: 'Data completeness ' + prog.completeness + '% is below ' + M.completeness.insufficientBelow + '%' };
    if (comp.status === 'Insufficient Evidence') return { category: 'Insufficient Evidence', reason: 'Competency evidence is not yet validated in enough domains' };
    if (comp.confirmedLevel3) {
      var projDone = exp.components[0].status === 'Completed';
      if (projDone) return { category: 'Ready for Broader Exposure', reason: 'Level 3 validated and the mandatory project completed with evidence' };
      return { category: 'Demonstrating Level 3', reason: project ? 'Mandatory project not yet completed with evidence' : 'No cross-functional project yet (' + M.copy.mandatoryPending + ')' };
    }
    if (comp.status === 'Progressing Toward Level 3') return { category: 'Developing Toward Level 3', reason: comp.level3Blocked ? 'Level 3 not confirmed: ' + comp.blockers[0] : 'Overall proficiency in the Level 2 band' };
    return { category: 'Foundation Building', reason: 'Overall proficiency in the Level 1 band' };
  }

  YLP.progress = {
    experience: experience, relationships: relationships, learning: learning, idp: idp, businessLearning: businessLearning,
    discipline: discipline, overall: overall, readiness: readiness, journeyStage: journeyStage, mentorStatus: mentorStatus,
    pathway: pathway, category: category, typeKey: typeKey, interactionType: interactionType
  };
})(window.YLP);
