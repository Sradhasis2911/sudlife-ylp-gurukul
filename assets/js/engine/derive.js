/* ==========================================================================
   Derivation: turns the stored tables into one view model per participant
   and the cohort metrics every screen reads. Recomputed after every data
   change, so all dashboards, profiles and filters stay consistent.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var U = YLP.util, M = YLP.model, D = YLP.dates, P = YLP.progress;

  function hasActual(db) {
    return ['Participants', 'KRAs', 'Competencies', 'Projects'].some(function (t) { return (db[t] || []).some(function (r) { return !r.IsSample; }); });
  }

  function environment(db) {
    var sample = 0, actual = 0;
    ['Participants', 'KRAs', 'KRARatingScales', 'Competencies', 'Projects', 'ProjectParticipants', 'DevelopmentActions', 'Learning', 'Mentoring', 'StakeholderFeedback', 'JourneyActivities', 'RoleDescriptors'].forEach(function (t) {
      (db[t] || []).forEach(function (r) { if (r.IsSample) sample++; else actual++; });
    });
    if (!actual) return 'SAMPLE';
    if (!sample) return 'ACTUAL';
    return 'MIXED';
  }

  function participantView(p, idx, fw, roles, db) {
    var id = U.text(p.EmployeeID);
    var kras = idx.kras[id] || [];
    var cur = kras.filter(function (k) { return k.FinancialYear === M.currentFY; });
    var prev = kras.filter(function (k) { return k.FinancialYear === M.previousFY; });
    var mappings = idx.mappings[id] || [];
    var mapping = mappings[0] || null;
    var project = mapping ? idx.projectById[U.text(mapping.ProjectID)] || null : null;
    var activities = idx.activities[id] || [];
    var mentoring = idx.mentoring[id] || [];
    var feedback = idx.feedback[id] || [];
    var learningRecs = idx.learning[id] || [];
    var actions = idx.actions[id] || [];

    var comp = YLP.competency.assessParticipant(idx.competencies[id] || [], fw, D.todayIso());
    var ctx = { p: p, activities: activities, mentoring: mentoring, feedback: feedback, learning: learningRecs, actions: actions, project: project, mapping: mapping };
    var exp = P.experience(ctx), rel = P.relationships(ctx), learn = P.learning(ctx), idp = P.idp(ctx), biz = P.businessLearning(learn), disc = P.discipline(ctx, rel);
    var modelTotal = U.round(exp.earned + rel.earned + learn.earned, 1);
    var hasModelData = activities.length || mapping || mentoring.length || feedback.length || learningRecs.length;
    var projAvailable = !!(project && project.completion !== null && U.has(mapping.IndividualContribution));

    var components = [
      { key: 'competency', available: comp.component.available, score: comp.component.score, reason: comp.component.reason },
      { key: 'project', available: projAvailable, score: projAvailable ? project.completion : null, reason: !mapping ? M.copy.mandatoryPending : !projAvailable ? 'Allocated; individual contribution not yet recorded' : 'Project completion ' + project.completion + '%' },
      { key: 'model', available: !!hasModelData, score: hasModelData ? modelTotal : null, reason: hasModelData ? modelTotal + ' of 100 model points earned' : 'No 70-20-10 activities recorded' },
      { key: 'idp', available: idp.component.available, score: idp.component.score, reason: idp.component.reason },
      { key: 'learning', available: biz.available, score: biz.score, reason: biz.reason },
      { key: 'discipline', available: disc.available, score: disc.score, reason: disc.reason }
    ].map(function (c) {
      var def = M.overallProgress.filter(function (o) { return o.key === c.key; })[0];
      c.name = def.name; c.weight = def.weight;
      return c;
    });
    var prog = P.overall(components);
    var ready = P.readiness(comp, prog, exp, project);
    var stage = P.journeyStage(p, activities);
    var mentor = P.mentorStatus(p, mentoring);
    var role = YLP.roles.match(p, roles, cur, db.meta.roleMappings);
    var compare = YLP.kracompare.compare(prev, cur, id, db.meta.classificationOverrides);
    var trans = YLP.kracompare.transactional(cur);

    var v = {
      p: p, id: id, name: U.text(p.EmployeeName), isSample: !!p.IsSample,
      kras: kras, krasCurrent: cur, krasPrevious: prev,
      kraGroupsCurrent: YLP.kra.validateGroups(cur), kraGroupsPrevious: YLP.kra.validateGroups(prev),
      ratingScales: idx.scales[id] || [], competencyRecords: idx.competencies[id] || [], competency: comp,
      mapping: mapping, mappings: mappings, project: project,
      activities: activities, mentoring: mentoring, feedback: feedback, learningRecords: learningRecs, actions: actions,
      experience: exp, relationships: rel, learning: learn, idp: idp, business: biz, discipline: disc,
      modelTotal: modelTotal, components: components, progress: prog, readiness: ready,
      stage: stage.stage, stageDerived: stage.derived, stageIndex: M.stages.indexOf(stage.stage),
      pathway: P.pathway(p), mentorStatus: mentor, role: role, kraCompare: compare, transactional: trans
    };
    v.availability = YLP.availability.build(v);

    var immersion = exp.components.filter(function (c) { return c.key === 'immersion'; })[0];
    var exposureSignals = [!!mapping, immersion.items.length > 0, exp.components[2].items.length > 0, exp.components[4].items.length > 0, YLP.kracompare.crossFunctional(cur)].filter(Boolean).length;
    v.exposure = {
      noProject: !mapping,
      noMentor: mentor !== 'Allocated',
      noImmersion: immersion.items.length === 0,
      noSponsorFeedback: rel.tracks.filter(function (t) { return t.key === 'sponsor'; })[0].completed === 0,
      transactional: trans.flag,
      limitedCrossFunctional: exposureSignals < 2,
      overdueAssessment: comp.overdueAnchors > 0,
      insufficientEvidence: ready.category === 'Insufficient Evidence',
      incompleteIDP: idp.status === 'Not Started' || idp.status === 'Overdue'
    };
    v.alerts = [];
    if (!mapping) v.alerts.push({ kind: 'error', text: M.copy.mandatoryPending });
    if (project && project.atRisk) v.alerts.push({ kind: 'warn', text: 'Project at risk: ' + project.riskReasons[0] });
    if (idp.overdue.length) v.alerts.push({ kind: 'warn', text: idp.overdue.length + ' IDP action(s) overdue' });
    if (comp.overdueAnchors) v.alerts.push({ kind: 'warn', text: comp.overdueAnchors + ' competency assessment(s) overdue' });
    if (mentor !== 'Allocated') v.alerts.push({ kind: 'warn', text: 'No mentor allocated' });
    if (prog.insufficient) v.alerts.push({ kind: 'warn', text: 'Data completeness below 50%' });
    comp.domains.forEach(function (d) { if (d.gapCategory === 'Priority Development Need') v.alerts.push({ kind: 'error', text: 'Priority development need: ' + d.name }); });
    v.timeline = timeline(v);
    return v;
  }

  function timeline(v) {
    var ev = [];
    function add(date, kind, title, detail) { if (D.isIso(U.text(date))) ev.push({ date: date, kind: kind, title: title, detail: detail || '' }); }
    add(v.p.DateOfJoining, 'join', 'Joined SUD Life', U.text(v.p.Designation));
    v.competencyRecords.forEach(function (c) { add(c.AssessmentDate, 'assessment', U.text(c.AssessmentType) + ' assessment: ' + U.text(c.BehaviouralAnchor), 'Level ' + U.text(c.CurrentLevel) + (U.has(c.ValidationStatus) ? ', ' + c.ValidationStatus : '')); });
    v.activities.forEach(function (a) {
      add(a.StartDate, 'activity', 'Started: ' + U.text(a.ActivityName), U.text(a.JourneyStage));
      add(a.CompletionDate, 'activity', 'Completed: ' + U.text(a.ActivityName), U.has(a.Evidence) ? 'Evidence recorded' : 'Evidence not recorded');
    });
    v.mentoring.forEach(function (m) { add(m.MeetingDate, 'mentoring', P.interactionType(m) + ' with ' + U.text(m.Mentor), U.text(m.DiscussionTheme)); });
    v.feedback.forEach(function (f) { add(f.FeedbackDate, 'feedback', 'Feedback from ' + U.text(f.FeedbackProvider) + ' (' + U.text(f.ProviderRole) + ')', U.text(f.FeedbackSummary)); });
    v.learningRecords.forEach(function (l) { add(l.CompletionDate, 'learning', 'Completed learning: ' + U.text(l.LearningTitle), U.text(l.LearningType)); });
    v.actions.forEach(function (a) { add(a.TargetDate, 'idp', 'IDP action due: ' + U.text(a.DevelopmentAction), U.text(a.Status)); });
    if (v.project) { add(v.project.project.StartDate, 'project', 'Project started: ' + v.project.title, ''); add(v.project.project.TargetDate, 'project', 'Project target date: ' + v.project.title, v.project.status); }
    return ev.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  }

  function index(db) {
    var by = function (t) { return U.groupBy(db[t] || [], function (r) { return U.text(r.EmployeeID); }); };
    return {
      kras: by('KRAs'), scales: by('KRARatingScales'), competencies: by('Competencies'), mappings: by('ProjectParticipants'),
      activities: by('JourneyActivities'), mentoring: by('Mentoring'), feedback: by('StakeholderFeedback'),
      learning: by('Learning'), actions: by('DevelopmentActions'), projectById: {}
    };
  }

  var cache = { db: null, version: -1, includeSample: null, result: null };

  function derive(db, version, includeSample) {
    if (cache.db === db && cache.version === version && cache.includeSample === includeSample && cache.result) return cache.result;
    var fw = YLP.competency.buildFramework(db.CompetencyFramework);
    var people = {};
    (db.Participants || []).forEach(function (p) { people[U.text(p.EmployeeID)] = p; });
    var idx = index(db);
    var projects = YLP.projects.all(db, people);
    projects.forEach(function (pv) { idx.projectById[pv.id] = pv; });
    var views = (db.Participants || []).map(function (p) { return participantView(p, idx, fw, db.RoleDescriptors || [], db); });

    var actual = hasActual(db);
    var scoped = actual && !includeSample;
    var metric = scoped ? views.filter(function (v) { return !v.isSample; }) : views;
    var metricProjects = scoped ? projects.filter(function (pv) { return !pv.project.IsSample; }) : projects;

    var r = {
      fw: fw, views: views, byId: {}, metric: metric, projects: projects, metricProjects: metricProjects,
      env: environment(db), scoped: scoped, hasActual: actual, kpis: kpis(metric, metricProjects)
    };
    views.forEach(function (v) { r.byId[v.id] = v; });
    r.issues = YLP.validate.run(db, r);
    cache = { db: db, version: version, includeSample: includeSample, result: r };
    return r;
  }

  function kpis(vs, ps) {
    var count = function (fn) { return vs.filter(fn).length; };
    var comp = function (s) { return count(function (v) { return v.competency.status === s; }); };
    var avg = U.mean(vs.map(function (v) { return v.progress.completeness; }));
    return {
      total: count(function (v) { return !/inactive|exit|separated|resigned/i.test(U.text(v.p.Status)); }),
      fy2025: count(function (v) { return v.p.Cohort === 'FY2025'; }),
      fy2026: count(function (v) { return v.p.Cohort === 'FY2026'; }),
      functions: U.uniq(vs.map(function (v) { return U.text(v.p.BusinessUnit); })).length,
      projectsTotal: ps.length,
      projectsActive: ps.filter(function (p) { return !p.closed && /progress|risk/i.test(p.status); }).length,
      projectsCompleted: ps.filter(function (p) { return p.completed; }).length,
      projectsAtRisk: ps.filter(function (p) { return p.atRisk; }).length,
      allocated: count(function (v) { return !!v.mapping; }),
      withoutProject: count(function (v) { return !v.mapping; }),
      withMentor: count(function (v) { return v.mentorStatus === 'Allocated'; }),
      idpCompleted: count(function (v) { return v.idp.status === 'Completed'; }),
      level3: comp('Demonstrating Level 3') + comp('Demonstrating Above Target'),
      progressing: comp('Progressing Toward Level 3'),
      priority: comp('Priority Development Need'),
      insufficient: comp('Insufficient Evidence'),
      completeness: avg === null ? null : Math.round(avg),
      mentoringCoverage: vs.length ? Math.round(count(function (v) { return v.mentorStatus === 'Allocated'; }) / vs.length * 100) : null
    };
  }

  YLP.derive = { run: derive, environment: environment, hasActual: hasActual };
})(window.YLP);
