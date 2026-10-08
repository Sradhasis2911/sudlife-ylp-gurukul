/* ==========================================================================
   Programme model — every rule, weight, threshold and label the application
   uses, defined once. Decision IDs (D-xx) match the decision log in
   DECISIONS.md. To change a default, change it here.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var M = {};

  /* ---------------- Fixed targets (spec 29, 36, 47) ---------------- */
  M.behaviouralTargetLevel = 3;
  M.behaviouralLevel3Label = 'Proficient';
  M.kraRatingLevel3Label = 'Meets Expectations';
  M.levelNames = { 1: 'Basic', 2: 'Developing', 3: 'Proficient', 4: 'Advanced', 5: 'Expert' };

  /* ---------------- Financial years (spec 45–46, D-13) ---------------- */
  M.currentFY = 'FY 2026-27';
  M.previousFY = 'FY 2025-26';
  M.currentFYStart = '2026-04-01';

  /* ---------------- 70-20-10 (spec 25–28) ---------------- */
  M.experience70 = [
    { key: 'project', name: 'Cross-Functional Action-Learning Project', points: 30 },
    { key: 'stretch', name: 'Current-Role Stretch Assignment', points: 15 },
    { key: 'lwa', name: 'Lead-Without-Authority Assignment', points: 10 },
    { key: 'immersion', name: 'Business or Functional Immersion', points: 10 },
    { key: 'shadowing', name: 'Leadership Shadowing or Business-Review Exposure', points: 5 }
  ];
  // D-31: JourneyActivities.ActivityType values that map to each 70% component.
  M.activityTypeMap = {
    'cross-functional project': 'project', 'project': 'project', 'project milestone': 'projectMilestone',
    'stretch assignment': 'stretch', 'current-role stretch assignment': 'stretch', 'stretch': 'stretch',
    'lead-without-authority assignment': 'lwa', 'lead without authority': 'lwa', 'lwa': 'lwa',
    'business immersion': 'immersion', 'functional immersion': 'immersion', 'business or functional immersion': 'immersion', 'immersion': 'immersion',
    'leadership shadowing': 'shadowing', 'business-review exposure': 'shadowing', 'shadowing': 'shadowing',
    'business simulation': 'assessment', 'problem-solving case': 'assessment', 'leadership interview': 'assessment',
    'stakeholder panel': 'assessment', 'project presentation': 'assessment', 'competency reassessment': 'assessment',
    'idp review': 'review', 'development conversation': 'review', 'profile': 'onboarding', 'onboarding': 'onboarding',
    'reflection': 'reflection'
  };
  M.broaderExposureKeys = ['lwa', 'immersion', 'shadowing'];

  // D-33: the six developmental-relationship tracks and the number planned per programme year.
  M.relationshipTracks = [
    { key: 'mentoring', name: 'Senior or functional-leader mentoring', planned: 6, source: 'Mentoring', interactionType: 'Mentoring' },
    { key: 'manager', name: 'Manager development conversations', planned: 4, source: 'Mentoring', interactionType: 'Manager Conversation' },
    { key: 'sponsor', name: 'Project-sponsor feedback', planned: 2, source: 'StakeholderFeedback', providerRole: /sponsor/i },
    { key: 'peer', name: 'Peer-learning circles', planned: 4, source: 'Mentoring', interactionType: 'Peer Circle' },
    { key: 'stakeholder', name: 'Stakeholder feedback', planned: 2, source: 'StakeholderFeedback', providerRole: /^(?!.*sponsor).*/i },
    { key: 'sme', name: 'Subject-matter-expert interactions', planned: 2, source: 'Mentoring', interactionType: 'SME Interaction' }
  ];

  // D-34: Learning.LearningType -> the nine structured-learning categories.
  M.learningCategories = [
    { key: 'workshop', name: 'Leadership workshops', match: /workshop|leadership/i },
    { key: 'business', name: 'SUD Life business learning', match: /sud life|business learning|business model/i, business: true },
    { key: 'valuechain', name: 'Insurance-value-chain learning', match: /value.?chain|insurance/i, business: true },
    { key: 'digital', name: 'Digital modules', match: /digital/i },
    { key: 'analytics', name: 'Data-analytics modules', match: /analytic|data/i },
    { key: 'simulation', name: 'Business simulations', match: /simulation/i, business: true },
    { key: 'academy', name: 'Functional academies', match: /academy/i, business: true },
    { key: 'certification', name: 'Certifications', match: /certif/i },
    { key: 'reflection', name: 'Reflection and application assignments', match: /reflection|application/i }
  ];
  M.learningPassScore = 60;               // D-35: assessment score below this earns half credit
  M.learningNoApplicationCredit = 0.5;    // D-35: completed without application evidence
  M.evidenceCap = 0.9;                    // D-32: completed without evidence is credited at most 90%

  /* ---------------- Project evaluation (spec 51) ---------------- */
  M.projectEvaluation = [
    { key: 'EvalBusinessRelevance', name: 'Business relevance', weight: 15 },
    { key: 'EvalProblemDiagnosis', name: 'Problem diagnosis', weight: 15 },
    { key: 'EvalCollaboration', name: 'Cross-functional collaboration', weight: 20 },
    { key: 'EvalSolutionQuality', name: 'Solution quality', weight: 15 },
    { key: 'EvalPilot', name: 'Pilot or implementation', weight: 15 },
    { key: 'EvalImpact', name: 'Measurable impact', weight: 10 },
    { key: 'EvalPresentation', name: 'Leadership presentation', weight: 10 }
  ];
  M.projectRules = { minParticipants: 4, maxParticipants: 6, minFunctions: 3, atRiskScheduleGap: 25 };  // D-42, D-43

  /* ---------------- Overall YLP progress (spec 64–66) ---------------- */
  M.overallProgress = [
    { key: 'competency', name: 'Leadership competency progress', weight: 30 },
    { key: 'project', name: 'Cross-functional project', weight: 25 },
    { key: 'model', name: '70-20-10 development completion', weight: 20 },
    { key: 'idp', name: 'IDP completion', weight: 10 },
    { key: 'learning', name: 'Business and insurance learning', weight: 10 },
    { key: 'discipline', name: 'Program discipline and evidence', weight: 5 }
  ];
  M.completeness = { insufficientBelow: 50, provisionalBelow: 80 };  // D-38

  /* ---------------- Competency rules (spec 36–37) ---------------- */
  M.competency = {
    validatorRoles: /manager|sponsor|assessor|panel/i,     // D-22
    selfTypes: /^self/i,
    currentWindowDays: 365,                                // D-23
    minEvidenceForLevel3: 2,
    domainMinValidatedShare: 0.5,                          // spec 37
    criticalAnchors: ['Ethics', 'Risk Assessment and Compliance', 'Collaboration'],
    maxInsufficientDomains: 1,
    mandatoryDomainFloor: 2.5,
    // D-28: competency component is scored when at most this many domains lack evidence.
    componentMaxInsufficientDomains: 1
  };
  M.bands = [
    { level: 1, min: -Infinity, max: 1.5 },
    { level: 2, min: 1.5, max: 2.5 },
    { level: 3, min: 2.5, max: 3.5 },
    { level: 4, min: 3.5, max: 4.5 },
    { level: 5, min: 4.5, max: Infinity }
  ];
  M.bandFor = function (score) {
    if (score === null || score === undefined || !isFinite(score)) return null;
    for (var i = 0; i < M.bands.length; i++) if (score >= M.bands[i].min && score < M.bands[i].max) return M.bands[i].level;
    return null;
  };
  // Gap categories (spec 36) — applied to the banded level (D-26).
  M.gapCategory = function (level) {
    if (level === null || level === undefined) return 'Insufficient Evidence';
    var gap = M.behaviouralTargetLevel - level;
    if (gap >= 2) return 'Priority Development Need';
    if (gap === 1) return 'Progressing Toward Level 3';
    if (gap === 0) return 'Demonstrating Level 3';
    return 'Demonstrating Above Target';
  };

  /* ---------------- Status vocabularies ---------------- */
  M.stages = ['Pravesh', 'Bodh', 'Abhyas', 'Margdarshan', 'Manthan', 'Uday'];
  M.pathways = ['Functional Leadership', 'Specialist Leadership', 'Project Leadership', 'People Leadership', 'Not Yet Identified'];
  M.readiness = ['Insufficient Evidence', 'Foundation Building', 'Developing Toward Level 3', 'Demonstrating Level 3', 'Ready for Broader Exposure'];
  M.pipelinePathways = { 'Specialist Leadership': 'Specialist Leadership Pathway', 'Project Leadership': 'Project Leadership Pathway', 'People Leadership': 'People Leadership Pathway' };
  // D-46: never shown — no calibrated, authorised evidence can be imported in this version.
  M.restrictedLabels = ['High Potential', 'Promotion Ready', 'Successor Ready'];
  M.competencyStatuses = ['Demonstrating Above Target', 'Demonstrating Level 3', 'Progressing Toward Level 3', 'Priority Development Need', 'Insufficient Evidence'];
  M.idpStatuses = ['Not Started', 'Initiated', 'On Track', 'Overdue', 'Completed'];
  M.mentorStatuses = ['Allocated', 'Pending', 'Not Allocated'];
  M.projectStatuses = ['Planned', 'In Progress', 'At Risk', 'Completed', 'On Hold', 'Cancelled'];
  M.availabilityStatuses = ['Available', 'Partially Available', 'Not Available', 'Validation Required', 'Not Applicable'];
  M.closedStatuses = /^(completed|cancelled|closed|done)$/i;

  M.missingLabels = {
    Target: 'Target Not Directly Available',
    Achievement: 'Achievement Not Available',
    CurrentProgress: 'Progress Not Available',
    Rating: 'Rating Not Available',
    ManagerObservation: 'Manager Observation Not Available'
  };

  /* ---------------- KRA comparison (spec 43–44) ---------------- */
  M.kraClasses = ['Deepening', 'Broadening', 'Leading', 'Transforming', 'Static', 'Role Transition', 'Insufficient Data'];
  M.kraKeywords = {
    Leading: ['lead', 'own', 'govern', 'manage', 'sponsor', 'drive', 'oversee'],
    Transforming: ['automate', 'digitize', 'digitise', 'innovate', 'redesign', 'implement', 'transform', 'optimize', 'optimise'],
    Broadening: ['cross-functional', 'additional', 'multiple departments', 'enterprise', 'partner', 'stakeholder', 'expanded'],
    Deepening: ['advanced', 'enhance', 'strengthen', 'improve accuracy', 'improve quality', 'expertise', 'certification']
  };
  M.kraSuggestionPriority = ['Transforming', 'Leading', 'Broadening', 'Deepening'];
  M.kraSuggestionMinShift = 10;   // D-51: weighted-share increase (percentage points) needed for a suggestion
  M.kraDimensions = [
    { key: 'functional', name: 'Functional scope', words: ['process', 'operations', 'function', 'department', 'end-to-end', 'workflow'] },
    { key: 'stakeholder', name: 'Stakeholder scope', words: ['stakeholder', 'partner', 'customer', 'vendor', 'regulator', 'leadership', 'management', 'business teams'] },
    { key: 'decision', name: 'Decision-making responsibility', words: ['decide', 'decision', 'approve', 'own', 'accountable', 'prioritise', 'prioritize'] },
    { key: 'project', name: 'Project ownership', words: ['project', 'programme', 'program', 'initiative', 'rollout', 'implementation', 'launch'] },
    { key: 'digital', name: 'Digital or automation responsibility', words: ['digital', 'automate', 'automation', 'dashboard', 'analytics', 'system', 'platform', 'rpa', 'data'] },
    { key: 'customer', name: 'Customer or partner orientation', words: ['customer', 'policyholder', 'partner', 'distributor', 'channel', 'bancassurance', 'service', 'claims'] },
    { key: 'risk', name: 'Risk and governance responsibility', words: ['risk', 'compliance', 'audit', 'governance', 'regulatory', 'irdai', 'control', 'policy'] },
    { key: 'learning', name: 'Learning responsibility', words: ['learn', 'training', 'certification', 'capability', 'develop', 'upskill'] },
    { key: 'crossfunctional', name: 'Cross-functional exposure', words: ['cross-functional', 'inter-department', 'collaborat', 'multiple departments', 'enterprise'] },
    { key: 'measurable', name: 'Goal measurability', words: [], measurable: true },
    { key: 'outcome', name: 'Outcome orientation', words: ['outcome', 'impact', 'reduce', 'increase', 'improve', 'achieve', 'deliver', 'revenue', 'cost', 'growth'] }
  ];
  // D-52: an assigned KRA set is "predominantly transactional" when at least this share of
  // its weight matches these words and none of it matches Leading or Transforming.
  M.transactionalWords = ['report', 'reporting', 'maintain', 'coordinate', 'ensure', 'timely', 'mis', 'data entry', 'reconcil', 'documentation', 'administ', 'tracking', 'processing'];
  M.transactionalShare = 60;

  /* ---------------- Role descriptor matching (spec 49) ---------------- */
  M.roleMatch = { keywordOverlapMin: 0.12 };  // D-55

  /* ---------------- Governance (spec 73–74) ---------------- */
  M.governanceRoles = [
    { role: 'Executive sponsor', does: ['Sets the programme purpose and priorities', 'Champions the Gurukul with the leadership team', 'Approves the framework and any major change'] },
    { role: 'Program owner', does: ['Runs the programme calendar and cohorts', 'Owns data quality and quarterly reporting', 'Escalates exceptions to the YLP Council'] },
    { role: 'YLP Council', does: ['Reviews cohort progress every quarter', 'Approves projects, sponsors and exceptions', 'Keeps development readiness separate from promotion decisions'] },
    { role: 'HR or Talent Management', does: ['Holds participant data and the competency framework', 'Coordinates assessments and evidence validation', 'Protects confidentiality and access to records'] },
    { role: 'Business sponsors', does: ['Frame a real, measurable SUD Life business problem', 'Guide the project team and remove blockers', 'Give sponsor feedback and sit on the leadership panel'] },
    { role: 'Managers', does: ['Agree KRAs and a current-role stretch assignment', 'Hold quarterly development conversations', 'Validate behavioural evidence they have observed'] },
    { role: 'Mentors', does: ['Meet the participant on an agreed rhythm', 'Help them reflect on and apply feedback', 'Record the actions agreed at each meeting'] },
    { role: 'Participants', does: ['Own their Individual Development Plan', 'Record evidence of contribution and learning', 'Seek feedback and act on it'] }
  ];
  M.quarterlyReviews = [
    { name: 'Data-quality review', owner: 'HR or Talent Management', looks: 'Data completeness, validation errors and unmatched records' },
    { name: 'Participant-development review', owner: 'Program owner with managers', looks: 'Each participant’s stage, progress and next experience' },
    { name: 'Project review', owner: 'YLP Council with business sponsors', looks: 'Milestones, risks, team composition and expected impact' },
    { name: 'Competency-evidence review', owner: 'HR with authorised assessors', looks: 'Validated evidence, Level 3 claims pending validation, overdue assessments' },
    { name: 'IDP review', owner: 'Managers', looks: 'Actions due, actions overdue and actions closed with evidence' },
    { name: 'Exposure-gap review', owner: 'Program owner', looks: 'Participants without projects, mentors, immersion or sponsor feedback' },
    { name: 'Sponsor review', owner: 'Business sponsors', looks: 'Sponsor feedback given and project outcomes against baseline' },
    { name: 'Action closure', owner: 'Program owner', looks: 'Every action from the previous quarter closed or carried forward with a reason' }
  ];
  M.approvalItems = [
    'YLP Gurukul purpose',
    'Level 3 behavioural proficiency target',
    'Mandatory cross-functional action-learning projects',
    '70-20-10 development architecture',
    'Six Gurukul journey stages',
    'Business-sponsor participation',
    'Mentor participation',
    'Quarterly evidence reviews',
    'Participant-data governance',
    'Leadership-development pathways',
    'Separation of development readiness from promotion readiness'
  ];
  M.approvalStatuses = ['Approved', 'Approved with Modifications', 'Review Required', 'Not Yet Approved'];

  /* ---------------- Fixed copy from the brief ---------------- */
  M.copy = {
    name: 'SUD Life YLP Gurukul',
    tagline: 'Where Future Leaders Learn, Contribute and Emerge',
    subtitle: 'From Role Excellence to Enterprise Leadership',
    statement: 'A structured leadership journey that prepares emerging talent to lead themselves, influence others, solve enterprise challenges, and create sustainable value for SUD Life.',
    overview: 'The YLP Gurukul builds future functional, specialist, project, and people leaders through role excellence, enterprise exposure, cross-functional contribution, guidance, and evidence-based capability development.',
    disclaimer: 'YLP progress and leadership readiness are developmental indicators. They do not independently constitute a promotion, succession, performance, or potential decision.',
    privacy: 'Privacy Notice: Files uploaded here are processed locally within this browser. The application does not send participant information to an external server. Data saved in this application may remain in browser storage until it is cleared.',
    closing: 'The SUD Life YLP Gurukul enables participants to progress from role mastery to enterprise contribution through experience, cross-functional collaboration, reflection, guidance, and measurable leadership application.',
    kraComparison: 'KRA comparison reflects changes in assigned scope and role expectations. It does not establish actual performance without achievement, rating, or manager evidence.',
    systemSuggestion: 'System Suggestion, HR Validation Required',
    thresholds: 'These are goal-rating thresholds, not achieved ratings.',
    level3Pending: 'Level 3 indicated, validation pending.',
    mandatoryPending: 'Mandatory Experience Pending',
    roleAlignment: 'Role alignment is a development reference, not a performance score.'
  };

  /* ---------------- Helpers ---------------- */
  M.sum = function (list, key) { return list.reduce(function (acc, item) { return acc + item[key]; }, 0); };
  M.goalSheetExpected = [
    { name: 'Learning Platforms Management', weight: 20 },
    { name: 'Learning Operations and Administration', weight: 20 },
    { name: 'Department-Wise Learning Accountability', weight: 20 },
    { name: 'Learning Content, Instructional Design and Communication', weight: 20 },
    { name: 'Compliance Training Calendar', weight: 15 },
    { name: 'Personal Development and Capability Building', weight: 5 }
  ];

  YLP.model = M;
})(window.YLP);
