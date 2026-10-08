/* ==========================================================================
   Leadership competency engine (spec 35–37).

   Anchor level  -> governing record = latest non-self assessment with a level (D-21)
   Validation    -> sign-off by manager / sponsor / assessor / panel (D-22);
                    Level 3+ additionally needs two situations, a non-routine
                    situation, observable evidence and a current date (D-23)
   Domain        -> average of validated anchors; < 50% validated = Insufficient Evidence
   Overall       -> equal-weight average of domains, with the Level 3 blockers
   ========================================================================== */
(function (YLP) {
  'use strict';

  var U = YLP.util, M = YLP.model, D = YLP.dates, F = YLP.framework;
  var C = M.competency;

  /* ---------------- Framework (imported wins over default) ---------------- */

  function buildFramework(records) {
    var source = records && records.length ? records : F.defaultRecords();
    var imported = !!(records && records.length);
    var domains = F.DOMAINS.map(function (d) {
      return { key: d.key, name: d.name, short: d.short, level3: d.level3, anchors: [] };
    });
    var extra = [];
    source.forEach(function (r) {
      var dom = F.domainByName(r.CompetencyDomain);
      var target = dom ? domains.filter(function (x) { return x.key === dom.key; })[0] : null;
      if (!target) { extra.push(r); return; }
      if (target.anchors.some(function (a) { return U.normKey(a.name) === U.normKey(r.BehaviouralAnchor); })) return;
      var std = F.anchorByName(r.BehaviouralAnchor);
      target.anchors.push({
        name: std ? std.anchor : U.text(r.BehaviouralAnchor),
        definition: U.text(r.Definition) || (std ? std.definition : ''),
        levels: { 1: U.text(r.Level1Definition) || F.LEVELS[1], 2: U.text(r.Level2Definition) || F.LEVELS[2], 3: U.text(r.Level3Definition) || F.LEVELS[3], 4: U.text(r.Level4Definition) || F.LEVELS[4], 5: U.text(r.Level5Definition) || F.LEVELS[5] },
        summary: U.text(r.Summary), standard: !!std
      });
    });
    // A domain with no imported anchors falls back to the default anchors.
    domains.forEach(function (d) {
      if (d.anchors.length) return;
      var def = F.DOMAINS.filter(function (x) { return x.key === d.key; })[0];
      d.anchors = def.anchors.map(function (a) { return { name: a[0], definition: a[1], levels: F.LEVELS, summary: '', standard: true }; });
    });
    return {
      domains: domains, imported: imported, unknown: extra,
      version: imported ? (U.text(source[0].FrameworkVersion) || 'Imported') : 'Default (built in)',
      anchorCount: domains.reduce(function (n, d) { return n + d.anchors.length; }, 0)
    };
  }

  /* ---------------- Anchor ---------------- */

  function isSelf(rec) { return C.selfTypes.test(U.text(rec.AssessmentType)); }
  function isBaseline(rec) { return /^baseline/i.test(U.text(rec.AssessmentType)); }

  function level3Checks(rec, today) {
    var date = U.text(rec.AssessmentDate);
    var age = D.isIso(date) ? D.daysBetween(date, today) : null;
    return [
      { rule: 'Current level of at least 3', ok: U.num(rec.CurrentLevel) >= 3 },
      { rule: 'Evidence from at least two situations', ok: (U.num(rec.EvidenceCount) || 0) >= C.minEvidenceForLevel3 },
      { rule: 'At least one non-routine situation', ok: U.truthy(rec.NonRoutineEvidence) },
      { rule: 'Validated by a manager, sponsor or authorised assessor', ok: /^validated$/i.test(U.text(rec.ValidationStatus)) && C.validatorRoles.test(U.text(rec.ValidatorRole)) },
      { rule: 'Observable output or impact recorded', ok: U.has(rec.Evidence) },
      { rule: 'Current assessment date (within ' + C.currentWindowDays + ' days)', ok: age !== null && age >= 0 && age <= C.currentWindowDays },
      { rule: 'Consistent behavioural demonstration (confirmed by the validator’s sign-off)', ok: /^validated$/i.test(U.text(rec.ValidationStatus)) }
    ];
  }

  function assessAnchor(domainName, anchorName, recs, today) {
    var sorted = recs.slice().sort(U.byDate('AssessmentDate'));
    var withLevel = sorted.filter(function (r) { return U.num(r.CurrentLevel) !== null; });
    // The baseline is a starting point, not a current assessment.
    var nonSelf = withLevel.filter(function (r) { return !isSelf(r) && !isBaseline(r); });
    var self = withLevel.filter(isSelf);
    var gov = nonSelf.length ? nonSelf[nonSelf.length - 1] : null;
    var latest = sorted.length ? sorted[sorted.length - 1] : null;

    // D-27: baseline = BaselineLevel on the earliest record that has one,
    // otherwise the level of the earliest Baseline-type assessment.
    var baseline = null, baselineDate = null;
    for (var i = 0; i < sorted.length && baseline === null; i++) {
      if (U.num(sorted[i].BaselineLevel) !== null) { baseline = U.num(sorted[i].BaselineLevel); baselineDate = sorted[i].AssessmentDate; }
    }
    if (baseline === null) {
      var b = sorted.filter(function (r) { return /baseline/i.test(U.text(r.AssessmentType)) && U.num(r.CurrentLevel) !== null; })[0];
      if (b) { baseline = U.num(b.CurrentLevel); baselineDate = b.AssessmentDate; }
    }

    var res = {
      domain: domainName, anchor: anchorName, records: sorted, recordCount: sorted.length,
      baseline: baseline, baselineDate: baselineDate,
      selfLevel: self.length ? U.num(self[self.length - 1].CurrentLevel) : null,
      current: gov ? U.num(gov.CurrentLevel) : null,
      governing: gov, validated: false, countedLevel: null, checks: [], status: 'No Evidence',
      evidenceCount: sorted.reduce(function (n, r) { return n + (U.num(r.EvidenceCount) || 0); }, 0),
      lastAssessmentDate: latest ? latest.AssessmentDate : null,
      assessor: gov ? U.text(gov.Assessor) : (latest ? U.text(latest.Assessor) : ''),
      developmentAction: latest ? U.text(latest.DevelopmentAction) : '',
      nextReviewDate: null, validationStatus: gov ? (U.text(gov.ValidationStatus) || 'Not recorded') : 'Not recorded',
      assessmentStatus: latest ? (U.text(latest.AssessmentStatus) || 'Recorded') : 'Not assessed',
      overdue: false, pending: false
    };
    var withReview = sorted.filter(function (r) { return D.isIso(U.text(r.NextReviewDate)); });
    if (withReview.length) res.nextReviewDate = withReview[withReview.length - 1].NextReviewDate;

    if (gov) {
      var lvl = res.current;
      var signedOff = /^validated$/i.test(U.text(gov.ValidationStatus)) && C.validatorRoles.test(U.text(gov.ValidatorRole)) && D.isIso(U.text(gov.AssessmentDate));
      if (lvl < 1 || lvl > 5) {
        res.status = 'Invalid score';
      } else if (lvl >= 3) {
        res.checks = level3Checks(gov, today);
        var allOk = res.checks.every(function (c) { return c.ok; });
        if (allOk) { res.validated = true; res.status = 'Validated'; }
        else { res.status = M.copy.level3Pending; res.pending = true; }
      } else if (signedOff) {
        res.validated = true; res.status = 'Validated';
      } else {
        res.status = 'Validation pending';
      }
      if (res.validated) res.countedLevel = lvl;
    } else if (self.length) {
      res.status = 'Self-assessment only';
    } else if (baseline !== null) {
      res.status = 'Baseline only';
    }
    res.gap = res.countedLevel !== null ? M.behaviouralTargetLevel - res.countedLevel : null;
    res.gapCategory = M.gapCategory(res.countedLevel);

    // Spec 62: overdue when the review date has passed and no later validated assessment exists.
    if (res.nextReviewDate && D.isPast(res.nextReviewDate)) {
      var later = sorted.some(function (r) { return D.isBefore(res.nextReviewDate, U.text(r.AssessmentDate)) && /^validated$/i.test(U.text(r.ValidationStatus)) && !isSelf(r); });
      res.overdue = !later;
      if (res.overdue) res.assessmentStatus = 'Assessment Overdue';
    }
    return res;
  }

  /* ---------------- Domain ---------------- */

  function assessDomain(dom, byAnchor, today) {
    var anchors = dom.anchors.map(function (a) { return assessAnchor(dom.name, a.name, byAnchor[U.normKey(a.name)] || [], today); });
    var validated = anchors.filter(function (a) { return a.validated; });
    var share = anchors.length ? validated.length / anchors.length : 0;
    var insufficient = share < C.domainMinValidatedShare;
    var score = insufficient ? null : U.round(U.mean(validated.map(function (a) { return a.countedLevel; })), 2);
    var band = M.bandFor(score);
    var baselines = anchors.map(function (a) { return a.baseline; }).filter(function (x) { return x !== null; });
    var dates = anchors.map(function (a) { return a.lastAssessmentDate; }).filter(D.isIso).sort();
    var reviews = anchors.map(function (a) { return a.nextReviewDate; }).filter(D.isIso).sort();
    var upcoming = reviews.filter(function (d) { return !D.isPast(d); });
    var assessed = anchors.filter(function (a) { return a.recordCount > 0; }).length;
    var overdue = anchors.filter(function (a) { return a.overdue; }).length;
    return {
      key: dom.key, name: dom.name, short: dom.short, level3: dom.level3,
      anchors: anchors, anchorsTotal: anchors.length, validatedCount: validated.length, share: share,
      insufficient: insufficient, score: score, band: band,
      gap: score !== null ? U.round(M.behaviouralTargetLevel - score, 2) : null,
      gapCategory: insufficient ? 'Insufficient Evidence' : M.gapCategory(band),
      baseline: baselines.length ? U.round(U.mean(baselines), 2) : null,
      baselineCoverage: baselines.length,
      evidenceCount: anchors.reduce(function (n, a) { return n + a.evidenceCount; }, 0),
      lastAssessmentDate: dates.length ? dates[dates.length - 1] : null,
      nextReviewDate: upcoming.length ? upcoming[0] : (reviews.length ? reviews[reviews.length - 1] : null),
      assessors: U.uniq(anchors.map(function (a) { return a.assessor; })),
      developmentActions: U.uniq(anchors.map(function (a) { return a.developmentAction; })),
      validationSummary: validated.length + ' of ' + anchors.length + ' anchors validated',
      pendingCount: anchors.filter(function (a) { return a.pending; }).length,
      overdueCount: overdue,
      assessmentStatus: overdue ? 'Assessment Overdue' : assessed === 0 ? 'Not assessed' : assessed < anchors.length ? 'Partially assessed' : 'Assessed',
      colour: insufficient ? 'none' : band >= 4 ? 'gold' : band === 3 ? 'green' : band === 2 ? 'amber' : 'red',
      statusLabel: insufficient ? (assessed ? 'Insufficient Evidence' : 'No Evidence') : 'Level ' + band
    };
  }

  /* ---------------- Participant ---------------- */

  function assessParticipant(records, fw, today) {
    var byAnchor = U.groupBy(records, function (r) {
      var std = F.anchorByName(r.BehaviouralAnchor);
      return U.normKey(std ? std.anchor : r.BehaviouralAnchor);
    });
    var domains = fw.domains.map(function (d) { return assessDomain(d, byAnchor, today); });
    var available = domains.filter(function (d) { return !d.insufficient; });
    var insufficientCount = domains.length - available.length;
    var score = insufficientCount > C.maxInsufficientDomains || !available.length ? null : U.round(U.mean(available.map(function (d) { return d.score; })), 2);
    var band = M.bandFor(score);

    var anchorsFlat = [];
    domains.forEach(function (d) { anchorsFlat = anchorsFlat.concat(d.anchors); });
    var findAnchor = function (name) { return anchorsFlat.filter(function (a) { return U.normKey(a.anchor) === U.normKey(name); })[0]; };

    var blockers = [];
    if (insufficientCount > C.maxInsufficientDomains) blockers.push('More than one domain has Insufficient Evidence');
    domains.forEach(function (d) { if (d.score !== null && d.score < C.mandatoryDomainFloor) blockers.push(d.name + ' is below ' + C.mandatoryDomainFloor + ' (' + d.score.toFixed(2) + ')'); });
    C.criticalAnchors.forEach(function (n) {
      var a = findAnchor(n);
      if (!a || !a.validated) blockers.push(n + ' lacks validated evidence');
    });

    var status;
    if (score === null) status = 'Insufficient Evidence';
    else if (band >= 3 && blockers.length) status = 'Progressing Toward Level 3';
    else if (band >= 4) status = 'Demonstrating Above Target';
    else if (band === 3) status = 'Demonstrating Level 3';
    else if (band === 2) status = 'Progressing Toward Level 3';
    else status = 'Priority Development Need';

    var selfLevels = anchorsFlat.map(function (a) { return a.selfLevel; }).filter(function (x) { return x !== null; });
    var baselineScores = domains.map(function (d) { return d.baseline; }).filter(function (x) { return x !== null; });
    var componentAvailable = insufficientCount <= C.componentMaxInsufficientDomains && available.length > 0;

    return {
      domains: domains, anchors: anchorsFlat, score: score, band: band, status: status,
      confirmedLevel3: status === 'Demonstrating Level 3' || status === 'Demonstrating Above Target',
      level3Blocked: band !== null && band >= 3 && blockers.length > 0,
      blockers: band !== null && band >= 3 ? blockers : blockers.filter(function (b) { return /More than one/.test(b); }),
      insufficientDomains: insufficientCount,
      validatedAnchors: anchorsFlat.filter(function (a) { return a.validated; }).length,
      pendingAnchors: anchorsFlat.filter(function (a) { return a.pending; }).length,
      overdueAnchors: anchorsFlat.filter(function (a) { return a.overdue; }).length,
      assessedAnchors: anchorsFlat.filter(function (a) { return a.recordCount > 0; }).length,
      totalAnchors: anchorsFlat.length,
      selfAverage: selfLevels.length ? U.round(U.mean(selfLevels), 2) : null,
      baseline: baselineScores.length ? U.round(U.mean(baselineScores), 2) : null,
      hasManagerAssessment: records.some(function (r) { return /manager/i.test(U.text(r.AssessmentType)); }),
      managerCoverage: anchorsFlat.filter(function (a) { return a.records.some(function (r) { return /manager/i.test(U.text(r.AssessmentType)); }); }).length,
      // D-28: component score = attainment toward Level 3 across domains with evidence.
      component: componentAvailable ? {
        available: true,
        score: U.round(U.mean(available.map(function (d) { return Math.min(d.score, M.behaviouralTargetLevel) / M.behaviouralTargetLevel * 100; })), 1),
        reason: available.length + ' of 5 domains with validated evidence'
      } : { available: false, score: null, reason: insufficientCount + ' domains lack validated evidence' }
    };
  }

  YLP.competency = { buildFramework: buildFramework, assessParticipant: assessParticipant, assessAnchor: assessAnchor, level3Checks: level3Checks };
})(window.YLP);
