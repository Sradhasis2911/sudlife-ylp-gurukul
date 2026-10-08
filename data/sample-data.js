/* ==========================================================================
   FICTIONAL SAMPLE DATA — every record carries IsSample: true.
   No real employee information. Names, IDs, projects and evidence are
   invented to exercise every rule in the application.

   Loaded as a script (not fetched as JSON) because fetch() of local files is
   blocked when the page is opened from file://.

   Reference date for the scenario: early October 2026.
   ========================================================================== */
window.YLP_SAMPLE = (function () {
  'use strict';

  var SRC = { SourceFile: 'Built-in sample data', SourceSheet: 'Sample', IsSample: true };
  function S(o) { var r = {}; Object.keys(o).forEach(function (k) { r[k] = o[k]; }); Object.keys(SRC).forEach(function (k) { r[k] = SRC[k]; }); return r; }

  /* ---------------- Participants ---------------- */
  function person(id, name, cohort, doj, level, desig, bu, dept, stage, pathway, mentor, mgr, aspiration) {
    return S({
      EmployeeID: id, EmployeeName: name, Status: 'Active', Cohort: cohort, DateOfJoining: doj, OriginalDateOfJoining: doj,
      JobLevel: level, Designation: desig, BusinessUnit: bu, Department: dept, Manager: mgr, HRBP: 'hrbp.team@example.invalid',
      JourneyStage: stage, LeadershipPathway: pathway, MentorStatus: mentor, IDPStatus: '', OverallProgress: null,
      CareerAspiration: aspiration, ProfilePhotoURL: '', LastUpdated: '2026-10-01'
    });
  }
  var P = [
    person('SMP-0101', 'Aarav Kulkarni', 'FY2025', '2025-10-13', 'Band A2', 'Executive - Policy Servicing', 'Operations', 'Policy Servicing', 'Manthan', 'Project Leadership', 'Allocated', 'r.shah@example.invalid', 'Lead a service-transformation programme within three years'),
    person('SMP-0102', 'Meera Iyer', 'FY2025', '2025-11-03', 'Band B1', 'Assistant Manager - Financial Planning', 'Finance', 'Financial Planning', 'Manthan', 'Specialist Leadership', 'Allocated', 'a.menon@example.invalid', 'Become the go-to specialist for business performance analytics'),
    person('SMP-0103', 'Rohan Deshmukh', 'FY2025', '2025-12-01', 'Band A2', 'Executive - Partner Relationship', 'Distribution', 'Partner Relationship', 'Margdarshan', 'People Leadership', 'Allocated', 'k.rao@example.invalid', 'Manage a regional partner team'),
    person('SMP-0104', 'Sana Qureshi', 'FY2025', '2026-01-19', 'Band B1', 'Assistant Manager - Compliance', 'Risk & Compliance', 'Compliance', 'Abhyas', 'Functional Leadership', 'Pending', 'p.nair@example.invalid', 'Grow into a compliance lead for distribution'),
    person('SMP-0201', 'Ishaan Bhatt', 'FY2026', '2026-04-06', 'Band A1', 'Officer - Digital Platforms', 'Technology', 'Digital Platforms', 'Abhyas', 'Project Leadership', 'Allocated', 'v.iyer@example.invalid', 'Lead digital delivery for customer journeys'),
    person('SMP-0202', 'Tanvi Rao', 'FY2026', '2026-04-13', 'Band A2', 'Executive - Learning & Development', 'Human Resources', 'Learning & Development', 'Abhyas', 'Specialist Leadership', 'Allocated', 's.gupta@example.invalid', 'Specialise in learning design and capability building'),
    person('SMP-0203', 'Kabir Malhotra', 'FY2026', '2026-05-04', 'Band A1', 'Officer - Underwriting', 'Operations', 'Underwriting', '', 'Not Yet Identified', 'Not Allocated', 'd.paul@example.invalid', 'Explore underwriting and risk roles'),
    person('SMP-0204', 'Nisha Fernandes', 'FY2026', '2026-05-18', 'Band A2', 'Executive - Brand & Communications', 'Marketing', 'Brand & Communications', 'Bodh', 'People Leadership', 'Allocated', 'm.dsouza@example.invalid', 'Lead a communications team'),
    person('SMP-0205', 'Arjun Nair', 'FY2026', '2026-06-01', 'Band B1', 'Assistant Manager - Pricing', 'Actuarial', 'Pricing', 'Abhyas', 'Specialist Leadership', 'Allocated', 't.bose@example.invalid', 'Qualify as an actuary and lead pricing reviews'),
    person('SMP-0206', 'Diya Chatterjee', 'FY2026', '2026-06-15', 'Band A1', 'Officer - Customer Service', 'Customer Experience', 'Customer Service', 'Margdarshan', 'People Leadership', 'Allocated', 'n.khan@example.invalid', 'Lead a customer-service hub'),
    person('SMP-0207', 'Vikram Sethi', 'FY2026', '2026-07-06', 'Band A2', 'Executive - Investments', 'Finance', 'Investments', 'Pravesh', 'Not Yet Identified', 'Not Allocated', 'a.menon@example.invalid', ''),
    person('SMP-0208', 'Pooja Menon', 'FY2026', '2026-08-03', 'Band A1', 'Officer - Data & Analytics', 'Technology', 'Data & Analytics', 'Pravesh', 'Specialist Leadership', 'Pending', 'v.iyer@example.invalid', '')
  ];

  /* ---------------- Competencies ---------------- */
  var ANCHORS = [
    ['Customer and Stakeholder Management', 'Communication and Networking', 'Ran a fortnightly update for branch and head-office teams and built contacts across three functions.'],
    ['Customer and Stakeholder Management', 'Influencing and Negotiation', 'Agreed a revised turnaround standard with a bancassurance partner after two rounds of discussion.'],
    ['Customer and Stakeholder Management', 'Customer Engagement and Service Orientation', 'Called back 40 customers with delayed requests and closed 35 within the week.'],
    ['Customer and Stakeholder Management', 'Emotional Intelligence', 'Handled an escalated complaint calmly and settled a tense team review.'],
    ['Customer and Stakeholder Management', 'Collaboration', 'Co-designed the pilot workflow with Operations, Technology and Distribution colleagues.'],
    ['Performance and Result Orientation', 'Achievement Orientation and Ownership of Outcomes', 'Owned a missed milestone, re-planned and delivered within two weeks.'],
    ['Performance and Result Orientation', 'Continuous Improvement', 'Removed two manual hand-offs from the process after reviewing six months of data.'],
    ['Performance and Result Orientation', 'Creating High-Performance Teams and Talent Development', 'Coached two new joiners on the reconciliation routine; both now work independently.'],
    ['Strategy and Innovation', 'Business Acumen and Strategic Planning', 'Linked the project target to persistency and cost per policy in the sponsor review.'],
    ['Strategy and Innovation', 'Customer-Centric Innovation', 'Proposed and tested a document-reminder message with 200 customers.'],
    ['Strategy and Innovation', 'Problem Solving and Decision Making', 'Used a root-cause tree to isolate the main cause of breaks and chose the fix.'],
    ['Risk Management', 'Risk Assessment and Compliance', 'Flagged a disclosure gap in a draft customer letter before release.'],
    ['Risk Management', 'Change Planning and Implementation', 'Planned the pilot rollout with a communication note and a two-week support desk.'],
    ['Risk Management', 'Governance and Monitoring', 'Set up a weekly control tracker for the pilot and escalated one exception on time.'],
    ['Risk Management', 'Ethics', 'Declined to back-date a document and escalated the request to the manager.'],
    ['Digital Mindset and Agility', 'Digital Mindset', 'Moved the team’s manual tracker to a shared digital workflow.'],
    ['Digital Mindset and Agility', 'Data Analytics Proficiency', 'Built a six-month analysis of requests that set the project baseline.'],
    ['Digital Mindset and Agility', 'Agile Working', 'Re-planned the sprint within a day when a new circular changed priorities.']
  ];
  /* Per participant: baseline levels, manager levels and a validation code per anchor.
     V = validated with full evidence · E = validated but only one situation recorded
     P = manager rating not yet validated · S = self-assessment only · - = no record */
  var PROFILES = {
    'SMP-0101': { manager: 'Rakesh Shah', base: [2, 2, 2, 2, 2, 2, 2, 1, 2, 1, 2, 2, 1, 2, 2, 2, 2, 2], lv: [3, 3, 4, 3, 4, 4, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 4, 3], val: 'VVVVVVVVVVVVVVVVVV', date: '2026-09-10', next: '2026-12-10' },
    'SMP-0102': { manager: 'Anita Menon', base: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2], lv: [3, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 3, 3, 4, 3], val: 'VVVVVVVVVVVVVVVVVV', date: '2026-09-14', next: '2026-12-14' },
    'SMP-0103': { manager: 'Kiran Rao', base: [2, 2, 2, 2, 2, 2, 1, 1, 2, 1, 2, 2, 1, 2, 2, 1, 1, 2], lv: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], val: 'VVVVVVVVVVVVVVSVVV', date: '2026-07-05', next: '2026-09-30' },
    'SMP-0104': { manager: 'Priya Nair', base: [1, 1, 2, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 2, 1, 1, 1], lv: [2, 2, 3, 2, 2, 3, 2, 2, 2, 2, 2, 3, 2, 3, 3, 2, 2, 2], val: 'VVVVVVVVVVVVVVVVVV', date: '2026-09-20', next: '2026-12-20' },
    'SMP-0201': { manager: 'Vivek Iyer', base: [1, 1, 1, 2, 2, 2, 1, 1, 1, 1, 2, 1, 1, 1, 2, 2, 2, 2], lv: [2, 2, 2, 3, 3, 3, 2, 2, 2, 2, 3, 2, 2, 2, 3, 3, 3, 3], val: 'VVVVVVVVVVVVVVVEEE', date: '2026-09-22', next: '2026-12-22' },
    'SMP-0202': { manager: 'Sonal Gupta', base: [2, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2], lv: [3, 2, 2, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 3], val: 'VVVVVVVVVVVVVVVVVV', date: '2026-09-25', next: '2026-12-25' },
    'SMP-0203': { manager: 'Deepa Paul', base: [1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1], self: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], val: 'SSSSSSSSSSSSSSSSSS', date: '2026-09-02', next: '2026-11-30' },
    'SMP-0204': { manager: 'Maria Dsouza', base: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], lv: [2, 1, 2, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 2, 1, 2], val: 'VVVVVVVVVVVVVVVVVV', date: '2026-09-18', next: '2026-12-18' },
    'SMP-0205': { manager: 'Tapan Bose', base: [2, 2, 2, 2, 2, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2], lv: [3, 3, 3, 3, 3, 2, 2, 2, 3, 3, 4, 3, 3, 3, 3, 3, 4, 3], val: 'VVVVVVVVVVVVVVVVVV', date: '2026-09-28', next: '2026-12-28' },
    'SMP-0206': { manager: 'Nadia Khan', base: [2, 1, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1], lv: [3, 2, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2], val: 'VVVVVVVVVVVVVVVVVV', date: '2026-09-26', next: '2026-12-26' },
    'SMP-0207': { manager: 'Anita Menon', base: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], val: '------------------', date: '2026-08-10', next: '2026-11-10' },
    'SMP-0208': { manager: 'Vivek Iyer', base: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1], lv: [0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 2, 2, 2], val: '--------VVV----VVV', date: '2026-09-30', next: '2026-12-30' }
  };

  function baselineDate(doj) { var d = new Date(doj + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 30); return d.toISOString().slice(0, 10); }

  var C = [];
  P.forEach(function (p) {
    var pr = PROFILES[p.EmployeeID];
    var bdate = baselineDate(p.DateOfJoining);
    ANCHORS.forEach(function (a, i) {
      C.push(S({
        EmployeeID: p.EmployeeID, AssessmentDate: bdate, AssessmentType: 'Baseline', CompetencyDomain: a[0], BehaviouralAnchor: a[1],
        BaselineLevel: pr.base[i], CurrentLevel: pr.base[i], TargetLevel: 3, Assessor: 'Talent Management team', Evidence: 'Baseline assessment at programme entry',
        EvidenceCount: 1, NonRoutineEvidence: 'No', ValidatorRole: 'HR', ValidationStatus: 'Recorded', DevelopmentAction: '', NextReviewDate: '', AssessmentStatus: 'Baseline'
      }));
      var code = pr.val.charAt(i);
      if (code === 'S' || (pr.self && code !== '-')) {
        var lvl = pr.self ? pr.self[i] : Math.min(5, (pr.lv ? pr.lv[i] : 2) + 1);
        // One self-assessment is left without an assessor name: a validation-warning example.
        C.push(S({
          EmployeeID: p.EmployeeID, AssessmentDate: pr.date, AssessmentType: 'Self', CompetencyDomain: a[0], BehaviouralAnchor: a[1],
          BaselineLevel: '', CurrentLevel: lvl, TargetLevel: 3, Assessor: p.EmployeeID === 'SMP-0203' && i === 0 ? '' : p.EmployeeName + ' (self)', Evidence: '',
          EvidenceCount: 0, NonRoutineEvidence: 'No', ValidatorRole: '', ValidationStatus: 'Not applicable', DevelopmentAction: '', NextReviewDate: pr.next, AssessmentStatus: 'Self-assessed'
        }));
      }
      if (code === 'V' || code === 'E' || code === 'P') {
        C.push(S({
          EmployeeID: p.EmployeeID, AssessmentDate: pr.date, AssessmentType: 'Manager', CompetencyDomain: a[0], BehaviouralAnchor: a[1],
          BaselineLevel: '', CurrentLevel: pr.lv[i], TargetLevel: 3, Assessor: pr.manager, Evidence: a[2],
          EvidenceCount: code === 'E' ? 1 : 2 + (i % 2), NonRoutineEvidence: code === 'E' ? 'No' : 'Yes', ValidatorRole: 'Manager',
          ValidationStatus: code === 'P' ? 'Pending' : 'Validated',
          DevelopmentAction: pr.lv[i] < 3 ? 'Take one non-routine assignment that needs ' + a[1].toLowerCase() : '',
          NextReviewDate: pr.next, AssessmentStatus: 'Current'
        }));
      }
    });
  });

  /* ---------------- Projects ---------------- */
  function project(o) {
    var base = { ProjectID: '', ProjectTitle: '', ProjectTheme: '', BusinessProblem: '', ProjectSponsor: '', YLPAdviser: '', FunctionsRepresented: '', StartDate: '', TargetDate: '', Status: '', CompletionPercentage: null, BaselineMeasure: '', TargetImpact: '', ActualImpact: '', PanelScore: null, ExceptionApproved: 'No', LastUpdated: '2026-10-01' };
    Object.keys(o).forEach(function (k) { base[k] = o[k]; });
    return S(base);
  }
  var PROJECTS = [
    project({ ProjectID: 'YLP-P01', ProjectTitle: 'Faster claim intimation for bancassurance customers', ProjectTheme: 'Customer experience', BusinessProblem: 'Death-claim intimations through partner branches take too long to reach the claims team.', ProjectSponsor: 'Head of Claims (sample)', YLPAdviser: 'L&D Programme Adviser (sample)', FunctionsRepresented: 'Operations, Distribution, Marketing, Customer Experience', StartDate: '2026-04-20', TargetDate: '2026-09-30', Status: 'Completed', CompletionPercentage: 100, BaselineMeasure: 'Average 6.5 days from intimation to acknowledgement', TargetImpact: 'Reduce to 3 days', ActualImpact: 'Reduced to 3.8 days in the pilot branch cluster', EvalBusinessRelevance: 4, EvalProblemDiagnosis: 4, EvalCollaboration: 5, EvalSolutionQuality: 4, EvalPilot: 4, EvalImpact: 3, EvalPresentation: 4 }),
    project({ ProjectID: 'YLP-P02', ProjectTitle: 'Reduce first-premium reconciliation delays', ProjectTheme: 'Operational efficiency', BusinessProblem: 'First premiums stay unreconciled for days, delaying policy issuance.', ProjectSponsor: 'Chief Financial Controller (sample)', YLPAdviser: 'Finance Business Partner (sample)', FunctionsRepresented: 'Finance, Technology, Operations, Actuarial', StartDate: '2026-06-15', TargetDate: '2026-12-15', Status: 'In Progress', CompletionPercentage: 70, BaselineMeasure: '12% of first premiums unreconciled after 7 days', TargetImpact: 'Below 4% after 7 days', ActualImpact: '' }),
    project({ ProjectID: 'YLP-P03', ProjectTitle: 'Digital nudges for mandatory compliance training', ProjectTheme: 'Risk and governance', BusinessProblem: 'Completion of mandatory compliance modules lags in several departments.', ProjectSponsor: 'Chief Compliance Officer (sample)', YLPAdviser: '', FunctionsRepresented: 'Risk & Compliance, Human Resources, Technology', StartDate: '2026-06-01', TargetDate: '2026-10-31', Status: 'In Progress', CompletionPercentage: 40, BaselineMeasure: '71% on-time completion of mandatory modules', TargetImpact: '95% on-time completion', ActualImpact: '' }),
    project({ ProjectID: 'YLP-P04', ProjectTitle: 'Renewal-reminder journey redesign', ProjectTheme: 'Customer experience', BusinessProblem: 'Renewal reminders reach customers late or through the wrong channel.', ProjectSponsor: 'Head of Customer Experience (sample)', YLPAdviser: 'L&D Programme Adviser (sample)', FunctionsRepresented: 'Customer Experience, Technology, Distribution', StartDate: '2026-11-02', TargetDate: '2027-03-31', Status: 'Planned', CompletionPercentage: 0, BaselineMeasure: 'To be measured in the charter', TargetImpact: 'Higher on-time renewals', ActualImpact: '' })
  ];
  function member(pid, eid, role, contrib, stake, sponsor, rating, evidence) {
    return S({ ProjectID: pid, EmployeeID: eid, ParticipantRole: role, IndividualContribution: contrib, StakeholderFeedback: stake, SponsorFeedback: sponsor, ContributionRating: rating, Evidence: evidence });
  }
  var MEMBERS = [
    member('YLP-P01', 'SMP-0101', 'Project lead', 'Led the root-cause analysis and ran the pilot stand-ups.', 'Clear and well-organised.', 'Drove the team to a measurable result.', 4, 'Pilot report and panel deck'),
    member('YLP-P01', 'SMP-0103', 'Partner liaison', 'Brought three partner branches into the pilot.', 'Good partner engagement.', 'Opened doors with partners.', 4, 'Partner meeting notes'),
    member('YLP-P01', 'SMP-0204', 'Communication design', 'Wrote the customer and branch communication kit.', 'Helpful materials.', '', 3, 'Communication kit'),
    member('YLP-P01', 'SMP-0206', 'Customer research', 'Interviewed 25 claimant families about the intimation journey.', 'Empathetic interviews.', 'Customer voice was central.', 4, 'Interview synthesis'),
    member('YLP-P02', 'SMP-0102', 'Project lead', 'Designed the matching rules and the weekly tracker.', 'Strong analysis.', 'Rigorous and clear.', 4, 'Rules document and tracker'),
    member('YLP-P02', 'SMP-0201', 'Automation', 'Built the proof-of-concept matching script.', 'Responsive to feedback.', '', 3, 'Proof-of-concept demo'),
    member('YLP-P02', 'SMP-0203', 'Process mapping', '', '', '', null, ''),
    member('YLP-P02', 'SMP-0205', 'Data analysis', 'Quantified the delay by channel and premium band.', 'Sharp with numbers.', '', 4, 'Analysis workbook'),
    member('YLP-P03', 'SMP-0104', 'Compliance lead', 'Mapped the mandatory modules and owners.', 'Thorough.', '', 3, 'Module map'),
    member('YLP-P03', 'SMP-0202', 'Project lead', 'Drafted the nudge calendar and pilot plan.', 'Good energy.', '', 3, 'Nudge calendar'),
    member('YLP-P03', 'SMP-0208', 'Data analysis', 'Prepared the completion baseline by department.', '', '', null, 'Baseline sheet')
  ];

  /* ---------------- Journey activities (incl. project milestones) ---------------- */
  var A = [], aid = 0;
  function act(eid, stage, name, type, start, target, done, status, pct, evidence, owner, extra) {
    aid++;
    var r = { ActivityID: 'ACT-' + ('000' + aid).slice(-3), EmployeeID: eid, JourneyStage: stage, ActivityName: name, ActivityType: type, StartDate: start, TargetDate: target, CompletionDate: done, Status: status, CompletionPercentage: pct, Evidence: evidence, Owner: owner, Sponsor: '', ValidationStatus: '', DevelopmentOutcome: '', ProjectID: '' };
    if (extra) Object.keys(extra).forEach(function (k) { r[k] = extra[k]; });
    A.push(S(r));
  }
  P.forEach(function (p) {
    var e = p.EmployeeID, d = p.DateOfJoining;
    act(e, 'Pravesh', 'Profile, baseline and first development conversation', 'Onboarding', d, baselineDate(d), baselineDate(d), 'Completed', 100, 'Profile and baseline recorded', 'Talent Management');
  });
  // Experience assignments
  act('SMP-0101', 'Abhyas', 'Redesign the servicing request triage', 'Stretch Assignment', '2026-03-01', '2026-06-30', '2026-06-20', 'Completed', 100, 'Triage SOP adopted by two hubs', 'Rakesh Shah');
  act('SMP-0101', 'Abhyas', 'Coordinate the branch service council without line authority', 'Lead-Without-Authority Assignment', '2026-05-01', '2026-08-31', '2026-08-28', 'Completed', 100, 'Council minutes and actions', 'Rakesh Shah');
  act('SMP-0101', 'Abhyas', 'Two-week immersion in the claims team', 'Business Immersion', '2026-04-06', '2026-04-17', '2026-04-17', 'Completed', 100, 'Immersion reflection note', 'Claims Head (sample)');
  act('SMP-0101', 'Abhyas', 'Shadow the monthly business review', 'Leadership Shadowing', '2026-07-01', '2026-07-31', '2026-07-31', 'Completed', 100, 'Shadowing reflection', 'COO office (sample)');
  act('SMP-0101', 'Manthan', 'Persistency business simulation', 'Business Simulation', '2026-09-01', '2026-09-15', '2026-09-15', 'Completed', 100, 'Simulation score 82', 'L&D');
  act('SMP-0102', 'Abhyas', 'Own the monthly variance commentary', 'Stretch Assignment', '2026-03-01', '2026-07-31', '2026-07-30', 'Completed', 100, 'Commentary pack', 'Anita Menon');
  act('SMP-0102', 'Abhyas', 'Immersion with the actuarial pricing team', 'Business Immersion', '2026-05-04', '2026-05-15', '2026-05-15', 'Completed', 100, 'Reflection note', 'Actuarial (sample)');
  act('SMP-0102', 'Abhyas', 'Lead the finance analytics community of practice', 'Lead-Without-Authority Assignment', '2026-06-01', '2026-11-30', '', 'In Progress', 60, '', 'Anita Menon');
  act('SMP-0102', 'Manthan', 'Leadership interview', 'Leadership Interview', '2026-09-20', '2026-10-20', '', 'In Progress', 50, '', 'YLP Council');
  act('SMP-0103', 'Abhyas', 'Run the partner onboarding playbook for two new banks', 'Stretch Assignment', '2026-04-01', '2026-09-30', '2026-09-25', 'Completed', 100, '', 'Kiran Rao');
  act('SMP-0103', 'Abhyas', 'Immersion in a partner bank branch', 'Business Immersion', '2026-05-11', '2026-05-22', '2026-05-22', 'Completed', 100, 'Branch immersion note', 'Partner Head (sample)');
  act('SMP-0104', 'Abhyas', 'Review distribution compliance testing approach', 'Stretch Assignment', '2026-06-01', '2026-11-30', '', 'In Progress', 45, '', 'Priya Nair');
  act('SMP-0201', 'Abhyas', 'Deliver the e-KYC screen release', 'Stretch Assignment', '2026-06-15', '2026-10-31', '', 'In Progress', 65, '', 'Vivek Iyer');
  act('SMP-0201', 'Bodh', 'Insurance value-chain presentation', 'Reflection', '2026-05-01', '2026-05-30', '2026-05-28', 'Completed', 100, 'Presentation to department', 'L&D');
  act('SMP-0202', 'Abhyas', 'Build the department-wise learning dashboard', 'Stretch Assignment', '2026-06-01', '2026-10-31', '', 'In Progress', 70, '', 'Sonal Gupta');
  act('SMP-0202', 'Abhyas', 'Shadow the HR leadership review', 'Leadership Shadowing', '2026-08-01', '2026-08-31', '2026-08-30', 'Completed', 100, 'Shadowing reflection', 'CHRO office (sample)');
  act('SMP-0203', 'Bodh', 'Underwriting value-chain walkthrough', 'Reflection', '2026-06-01', '2026-07-15', '', 'In Progress', 50, '', 'Deepa Paul');
  act('SMP-0204', 'Bodh', 'Brand and distribution reflection', 'Reflection', '2026-06-15', '2026-07-31', '2026-07-30', 'Completed', 100, 'Reflection note', 'Maria Dsouza');
  act('SMP-0205', 'Abhyas', 'Prepare the term-plan repricing pack', 'Stretch Assignment', '2026-07-01', '2026-11-30', '', 'In Progress', 40, '', 'Tapan Bose');
  act('SMP-0206', 'Abhyas', 'Lead the hub huddle rota without line authority', 'Lead-Without-Authority Assignment', '2026-07-15', '2026-10-15', '', 'In Progress', 70, '', 'Nadia Khan');
  act('SMP-0206', 'Abhyas', 'Immersion with the claims call centre', 'Business Immersion', '2026-08-03', '2026-08-14', '2026-08-14', 'Completed', 100, 'Immersion note', 'Claims (sample)');
  // Project milestones (owned by the project lead)
  act('SMP-0101', 'Abhyas', 'Project charter and stakeholder map', 'Project Milestone', '2026-04-20', '2026-04-30', '2026-04-29', 'Completed', 100, 'Charter v1', 'Aarav Kulkarni', { ProjectID: 'YLP-P01' });
  act('SMP-0101', 'Abhyas', 'Root-cause analysis', 'Project Milestone', '2026-05-01', '2026-05-31', '2026-05-30', 'Completed', 100, 'RCA tree', 'Aarav Kulkarni', { ProjectID: 'YLP-P01' });
  act('SMP-0101', 'Abhyas', 'Pilot in the Pune partner-branch cluster', 'Project Milestone', '2026-06-15', '2026-08-31', '2026-08-31', 'Completed', 100, 'Pilot report', 'Aarav Kulkarni', { ProjectID: 'YLP-P01' });
  act('SMP-0101', 'Manthan', 'Leadership panel presentation', 'Project Milestone', '2026-09-20', '2026-09-25', '2026-09-25', 'Completed', 100, 'Panel deck', 'Aarav Kulkarni', { ProjectID: 'YLP-P01' });
  act('SMP-0102', 'Abhyas', 'Project charter and baseline', 'Project Milestone', '2026-06-15', '2026-06-30', '2026-06-30', 'Completed', 100, 'Charter v1', 'Meera Iyer', { ProjectID: 'YLP-P02' });
  act('SMP-0102', 'Abhyas', 'Proof of concept: automated matching rules', 'Project Milestone', '2026-08-01', '2026-10-30', '', 'In Progress', 60, '', 'Meera Iyer', { ProjectID: 'YLP-P02' });
  act('SMP-0102', 'Manthan', 'Leadership panel presentation', 'Project Milestone', '2026-12-01', '2026-12-10', '', 'Planned', 0, '', 'Meera Iyer', { ProjectID: 'YLP-P02' });
  act('SMP-0202', 'Abhyas', 'Project charter', 'Project Milestone', '2026-06-01', '2026-06-20', '2026-06-25', 'Completed', 100, 'Charter v1', 'Tanvi Rao', { ProjectID: 'YLP-P03' });
  act('SMP-0202', 'Abhyas', 'Pilot nudges with two departments', 'Project Milestone', '2026-07-01', '2026-09-15', '', 'In Progress', 30, '', 'Tanvi Rao', { ProjectID: 'YLP-P03' });

  /* ---------------- Mentoring and other relationships ---------------- */
  var MENT = [];
  function meet(eid, type, mentor, date, theme, action, done, next, evidence) {
    MENT.push(S({ EmployeeID: eid, InteractionType: type, Mentor: mentor, MeetingDate: date, DiscussionTheme: theme, ActionCommitted: action, ActionCompleted: done, NextReviewDate: next, Evidence: evidence }));
  }
  var mentorPlan = {
    'SMP-0101': ['Senior Mentor A (sample)', 6, 4, 3, 2], 'SMP-0102': ['Senior Mentor B (sample)', 5, 3, 3, 1], 'SMP-0103': ['Senior Mentor C (sample)', 4, 2, 2, 0],
    'SMP-0104': ['', 0, 2, 1, 0], 'SMP-0201': ['Senior Mentor D (sample)', 3, 2, 1, 1], 'SMP-0202': ['Senior Mentor B (sample)', 3, 2, 2, 1],
    'SMP-0203': ['', 0, 1, 0, 0], 'SMP-0204': ['Senior Mentor E (sample)', 2, 1, 1, 0], 'SMP-0205': ['Senior Mentor A (sample)', 2, 1, 1, 1],
    'SMP-0206': ['Senior Mentor C (sample)', 2, 1, 2, 0], 'SMP-0207': ['', 0, 0, 0, 0], 'SMP-0208': ['', 0, 1, 0, 0]
  };
  var THEMES = ['Influencing without authority', 'Prioritising under pressure', 'Reading the business numbers', 'Stakeholder mapping', 'Giving and receiving feedback', 'Presenting to senior leaders'];
  Object.keys(mentorPlan).forEach(function (eid) {
    var m = mentorPlan[eid];
    var person = P.filter(function (x) { return x.EmployeeID === eid; })[0];
    var start = new Date(person.DateOfJoining + 'T00:00:00Z');
    function dateAt(n) { var d = new Date(start); d.setUTCDate(d.getUTCDate() + 45 + n * 30); var s = d.toISOString().slice(0, 10); return s > '2026-10-05' ? '2026-10-05' : s; }
    for (var i = 0; i < m[1]; i++) meet(eid, 'Mentoring', m[0], dateAt(i), THEMES[i % THEMES.length], 'Try one approach discussed and report back', i < m[1] - 1 ? 'Yes' : 'No', '2026-11-15', 'Mentoring log entry ' + (i + 1));
    for (var j = 0; j < m[2]; j++) meet(eid, 'Manager Conversation', PROFILES[eid].manager + ' (manager)', dateAt(j * 3), 'Quarterly development conversation', 'Agree next stretch goal', j < m[2] - 1 ? 'Yes' : 'No', '2026-12-31', 'Conversation note');
    for (var k = 0; k < m[3]; k++) meet(eid, 'Peer Circle', 'YLP peer circle ' + (k + 1), dateAt(k * 2 + 1), 'Peer case clinic', 'Share one learning with the team', 'Yes', '', 'Circle notes');
    for (var l = 0; l < m[4]; l++) meet(eid, 'SME Interaction', 'Subject expert (sample)', dateAt(l + 2), 'Product and regulation briefing', 'Apply the briefing to current work', 'Yes', '', 'Briefing summary');
  });
  // A logged meeting without evidence or action: counts as logged, not completed.
  meet('SMP-0204', 'Mentoring', 'Senior Mentor E (sample)', '2026-09-28', 'Career conversation', '', 'No', '', '');

  var FB = [], fid = 0;
  function fb(eid, date, provider, role, context, comp, summary, rating, evidence) {
    fid++;
    FB.push(S({ FeedbackID: 'FB-' + ('00' + fid).slice(-3), EmployeeID: eid, FeedbackDate: date, FeedbackProvider: provider, ProviderRole: role, Context: context, CompetencyLinked: comp, FeedbackSummary: summary, Rating: rating, Evidence: evidence }));
  }
  fb('SMP-0101', '2026-08-31', 'Head of Claims (sample)', 'Project Sponsor', 'YLP-P01 pilot', 'Collaboration', 'Brought three functions together and kept the pilot on track.', 4, 'Sponsor review note');
  fb('SMP-0101', '2026-09-26', 'Head of Claims (sample)', 'Project Sponsor', 'YLP-P01 panel', 'Business Acumen and Strategic Planning', 'Linked results to business outcomes convincingly.', 4, 'Panel feedback form');
  fb('SMP-0101', '2026-07-15', 'Branch Manager (sample)', 'Stakeholder', 'Service council', 'Influencing and Negotiation', 'Listened well and got agreement on hand-offs.', 4, 'Email');
  fb('SMP-0101', '2026-09-05', 'Partner Relationship Manager (sample)', 'Stakeholder', 'Pilot', 'Customer Engagement and Service Orientation', 'Customer-first in every discussion.', 5, 'Email');
  fb('SMP-0102', '2026-09-10', 'Chief Financial Controller (sample)', 'Project Sponsor', 'YLP-P02 review', 'Problem Solving and Decision Making', 'Clear problem framing and options.', 4, 'Sponsor review note');
  fb('SMP-0102', '2026-08-20', 'Operations Lead (sample)', 'Stakeholder', 'Reconciliation workshop', 'Collaboration', 'Made the workshop practical for operations.', 4, 'Workshop notes');
  fb('SMP-0103', '2026-08-31', 'Head of Claims (sample)', 'Project Sponsor', 'YLP-P01 pilot', 'Communication and Networking', 'Strong partner relationships.', 4, 'Sponsor review note');
  fb('SMP-0206', '2026-09-26', 'Head of Claims (sample)', 'Project Sponsor', 'YLP-P01 panel', 'Customer Engagement and Service Orientation', 'Kept the customer voice central.', 4, 'Panel feedback form');
  fb('SMP-0206', '2026-08-25', 'Hub Supervisor (sample)', 'Stakeholder', 'Huddle rota', 'Collaboration', 'Peers responded well to the rota.', 3, 'Email');
  fb('SMP-0202', '2026-09-12', 'Department Training Coordinator (sample)', 'Stakeholder', 'Learning dashboard', 'Data Analytics Proficiency', 'Useful first version of the dashboard.', 3, 'Email');

  /* ---------------- Learning ---------------- */
  var L = [];
  function learn(eid, title, type, date, hours, status, score, app, val) {
    L.push(S({ EmployeeID: eid, LearningTitle: title, LearningType: type, CompletionDate: date, LearningHours: hours, Status: status, AssessmentScore: score, ApplicationEvidence: app, ValidationStatus: val || '' }));
  }
  var CORE = [
    ['SUD Life business model', 'SUD Life Business Learning', 4],
    ['Insurance value chain foundations', 'Insurance Value Chain', 6],
    ['Digital insurance basics', 'Digital Module', 3],
    ['Spreadsheet and dashboard skills', 'Data Analytics Module', 6],
    ['Leading without authority workshop', 'Leadership Workshop', 8],
    ['Persistency business simulation', 'Business Simulation', 4]
  ];
  var LEARN_STATE = {
    'SMP-0101': ['CA', 'CA', 'CA', 'CA', 'CA', 'CA'], 'SMP-0102': ['CA', 'CA', 'CA', 'CA', 'CA', 'C'], 'SMP-0103': ['CA', 'CA', 'C', 'C', 'CA', 'P'],
    'SMP-0104': ['CA', 'C', 'C', 'P', 'P', 'P'], 'SMP-0201': ['CA', 'CA', 'CA', 'C', 'P', 'P'], 'SMP-0202': ['CA', 'C', 'CA', 'C', 'C', 'P'],
    'SMP-0203': ['C', 'P', 'P', 'P', 'P', 'P'], 'SMP-0204': ['CA', 'CL', 'C', 'P', 'P', 'P'], 'SMP-0205': ['CA', 'CA', 'C', 'CA', 'P', 'P'],
    'SMP-0206': ['CA', 'C', 'C', 'P', 'C', 'P'], 'SMP-0207': ['P', '', '', '', '', ''], 'SMP-0208': ['C', 'P', 'P', '', '', '']
  };
  Object.keys(LEARN_STATE).forEach(function (eid) {
    LEARN_STATE[eid].forEach(function (st, i) {
      if (!st) return;
      var c = CORE[i], done = st.charAt(0) === 'C';
      learn(eid, c[0], c[1], done ? '2026-0' + (6 + (i % 3)) + '-1' + i : '', c[2], done ? 'Completed' : 'In Progress',
        done ? (st === 'CL' ? 52 : 70 + i * 3) : null, st === 'CA' ? 'Applied in current role: ' + c[0].toLowerCase() : '', st === 'CA' ? 'Validated' : '');
    });
  });
  learn('SMP-0102', 'Licentiate (Insurance Institute)', 'Certification', '2026-08-30', 20, 'Completed', 68, 'Certificate on file', 'Validated');

  /* ---------------- Development actions (IDP) ---------------- */
  var DA = [], did = 0;
  function action(eid, cat, text, comp, owner, start, target, status, pct, evidence, comment, next) {
    did++;
    DA.push(S({ ActionID: 'IDP-' + ('000' + did).slice(-3), EmployeeID: eid, DevelopmentCategory: cat, DevelopmentAction: text, CompetencyLinked: comp, Owner: owner, StartDate: start, TargetDate: target, Status: status, CompletionPercentage: pct, Evidence: evidence, ManagerComment: comment, NextReviewDate: next }));
  }
  action('SMP-0101', 'Experience', 'Lead the claims-intimation pilot end to end', 'Collaboration', 'Aarav Kulkarni', '2026-04-20', '2026-09-30', 'Completed', 100, 'Pilot report', 'Delivered well', '');
  action('SMP-0101', 'Relationships', 'Present to the leadership panel', 'Communication and Networking', 'Aarav Kulkarni', '2026-09-01', '2026-09-25', 'Completed', 100, 'Panel deck', 'Confident delivery', '');
  action('SMP-0101', 'Learning', 'Complete the persistency simulation', 'Business Acumen and Strategic Planning', 'Aarav Kulkarni', '2026-09-01', '2026-09-15', 'Completed', 100, 'Score 82', '', '');
  action('SMP-0102', 'Experience', 'Lead the reconciliation proof of concept', 'Problem Solving and Decision Making', 'Meera Iyer', '2026-08-01', '2026-10-30', 'In Progress', 60, '', 'On track', '2026-10-30');
  action('SMP-0102', 'Learning', 'Complete the Licentiate certification', 'Business Acumen and Strategic Planning', 'Meera Iyer', '2026-03-01', '2026-08-31', 'Completed', 100, 'Certificate', '', '');
  action('SMP-0102', 'Relationships', 'Hold two sessions of the analytics community', 'Creating High-Performance Teams and Talent Development', 'Meera Iyer', '2026-06-01', '2026-09-30', 'Completed', 100, 'Session notes', '', '');
  action('SMP-0103', 'Experience', 'Document the partner onboarding playbook', 'Change Planning and Implementation', 'Rohan Deshmukh', '2026-05-01', '2026-08-31', 'In Progress', 70, '', 'Needs to close', '2026-10-15');
  action('SMP-0103', 'Relationships', 'Ask two partners for structured feedback', 'Ethics', 'Rohan Deshmukh', '2026-06-01', '2026-09-15', 'Not Started', 0, '', '', '2026-10-15');
  action('SMP-0104', 'Experience', 'Draft the compliance testing approach note', 'Risk Assessment and Compliance', 'Sana Qureshi', '2026-06-01', '2026-09-30', 'Completed', 100, 'Approach note v1', '', '');
  action('SMP-0104', 'Learning', 'Complete the data-analytics module', 'Data Analytics Proficiency', 'Sana Qureshi', '2026-07-01', '2026-12-15', 'In Progress', 30, '', '', '2026-11-15');
  action('SMP-0201', 'Experience', 'Ship the e-KYC release', 'Agile Working', 'Ishaan Bhatt', '2026-06-15', '2026-10-31', 'In Progress', 65, '', '', '2026-10-31');
  // A development action without a target date: a validation-warning example.
  action('SMP-0201', 'Relationships', 'Find a product-owner mentor', 'Communication and Networking', 'Ishaan Bhatt', '2026-07-01', '', 'Not Started', 0, '', '', '');
  action('SMP-0202', 'Experience', 'Publish the learning dashboard to two departments', 'Data Analytics Proficiency', 'Tanvi Rao', '2026-06-01', '2026-09-30', 'Completed', 100, 'Dashboard link and screenshots', '', '');
  action('SMP-0202', 'Relationships', 'Run a peer circle on learning design', 'Collaboration', 'Tanvi Rao', '2026-08-01', '2026-11-30', 'In Progress', 50, '', '', '2026-11-30');
  action('SMP-0204', 'Learning', 'Retake the insurance value-chain assessment', 'Business Acumen and Strategic Planning', 'Nisha Fernandes', '2026-08-01', '2026-09-30', 'In Progress', 50, '', 'Overdue', '2026-10-15');
  action('SMP-0204', 'Experience', 'Write the pilot communication kit', 'Communication and Networking', 'Nisha Fernandes', '2026-06-01', '2026-07-31', 'Completed', 100, '', '', '');
  action('SMP-0205', 'Experience', 'Lead one team review of the repricing pack', 'Creating High-Performance Teams and Talent Development', 'Arjun Nair', '2026-07-01', '2026-09-30', 'In Progress', 40, '', 'Overdue', '2026-10-15');
  action('SMP-0205', 'Learning', 'Pass the next actuarial paper', 'Achievement Orientation and Ownership of Outcomes', 'Arjun Nair', '2026-06-01', '2026-12-20', 'In Progress', 50, '', '', '2026-12-20');
  action('SMP-0206', 'Experience', 'Run the hub huddle rota for one quarter', 'Collaboration', 'Diya Chatterjee', '2026-07-15', '2026-10-15', 'In Progress', 70, '', '', '2026-10-15');
  action('SMP-0206', 'Learning', 'Complete the leadership workshop', 'Emotional Intelligence', 'Diya Chatterjee', '2026-07-01', '2026-09-30', 'Completed', 100, 'Workshop reflection', '', '');
  action('SMP-0208', 'Experience', 'Agree a stretch assignment with the manager', 'Data Analytics Proficiency', 'Pooja Menon', '2026-09-01', '2026-11-30', 'Not Started', 0, '', '', '2026-11-30');

  /* ---------------- KRAs ---------------- */
  var K = [];
  function kra(eid, name, fy, bu, dept, seq, title, desc, w) {
    K.push(S({ EmployeeID: eid, EmployeeName: name, FinancialYear: fy, KRADataType: fy === 'FY 2026-27' ? 'Current FY' : 'Previous FY', BusinessUnit: bu, Department: dept, KRASequence: String(seq), KRAName: title, KRADescription: desc, Weightage: w, WeightageSource: String(w), Target: null, Achievement: null, CurrentProgress: null, Rating: null, ManagerObservation: null, Evidence: '', KRAType: '', SuggestedClassification: '', ConfirmedClassification: '', ConfirmedBy: '', ConfirmationDate: '', ClassificationRationale: '', RoleAlignment: '', LastUpdated: '2026-10-01' }));
  }
  var PFY = 'FY 2025-26', CFY = 'FY 2026-27';
  [['Process servicing requests within TAT', 'Process policy servicing requests within agreed TAT', 40], ['Maintain servicing MIS reports', 'Maintain daily and weekly MIS reports', 30], ['Ensure documentation accuracy', 'Ensure complete documentation for each request', 30]].forEach(function (k, i) { kra('SMP-0101', 'Aarav Kulkarni', PFY, 'Operations', 'Policy Servicing', i + 1, k[0], k[1], k[2]); });
  [['Lead the cross-functional claims-intimation project', 'Lead and own the YLP project from charter to panel', 35], ['Own service governance for two hubs', 'Govern hub service standards and drive weekly reviews', 30], ['Process servicing requests within TAT', 'Process complex servicing requests within TAT', 20], ['Coach new joiners', 'Coach two new joiners to independence', 15]].forEach(function (k, i) { kra('SMP-0101', 'Aarav Kulkarni', CFY, 'Operations', 'Policy Servicing', i + 1, k[0], k[1], k[2]); });
  [['Prepare monthly variance reports', 'Prepare budget variance reports for business units', 50], ['Reconcile cost allocations', 'Reconcile shared-cost allocations monthly', 50]].forEach(function (k, i) { kra('SMP-0102', 'Meera Iyer', PFY, 'Finance', 'Financial Planning', i + 1, k[0], k[1], k[2]); });
  [['Automate first-premium reconciliation', 'Implement automated matching to reduce delays below 4%', 40], ['Redesign the variance dashboard', 'Redesign and digitize the variance dashboard', 30], ['Prepare monthly variance reports', 'Prepare variance commentary', 30]].forEach(function (k, i) { kra('SMP-0102', 'Meera Iyer', CFY, 'Finance', 'Financial Planning', i + 1, k[0], k[1], k[2]); });
  [['Support partner branch servicing', 'Support bancassurance branch servicing', 60], ['Maintain partner MIS', 'Maintain partner activity MIS', 40]].forEach(function (k, i) { kra('SMP-0103', 'Rohan Deshmukh', PFY, 'Distribution', 'Bancassurance Support', i + 1, k[0], k[1], k[2]); });
  [['Onboard two new partner banks', 'Run onboarding for two partner banks', 50], ['Partner relationship reviews', 'Hold monthly reviews with partner managers', 50]].forEach(function (k, i) { kra('SMP-0103', 'Rohan Deshmukh', CFY, 'Distribution', 'Partner Relationship', i + 1, k[0], k[1], k[2]); });
  // Validation-warning example: previous FY weights total 95.
  [['Compliance testing support', 'Support quarterly compliance testing', 50], ['Regulatory returns tracking', 'Track regulatory returns calendar', 45]].forEach(function (k, i) { kra('SMP-0104', 'Sana Qureshi', PFY, 'Risk & Compliance', 'Compliance', i + 1, k[0], k[1], k[2]); });
  [['Strengthen distribution compliance testing', 'Strengthen testing with advanced sampling and expertise', 50], ['Enhance regulatory returns quality', 'Improve accuracy of returns submissions', 30], ['Regulatory returns tracking', 'Track the returns calendar', 20]].forEach(function (k, i) { kra('SMP-0104', 'Sana Qureshi', CFY, 'Risk & Compliance', 'Compliance', i + 1, k[0], k[1], k[2]); });
  [['Deliver digital platform releases', 'Deliver releases on the agreed sprint plan', 40], ['Automate policy issuance steps', 'Automate two manual issuance steps', 35], ['Production support', 'Resolve production tickets within SLA', 25]].forEach(function (k, i) { kra('SMP-0201', 'Ishaan Bhatt', CFY, 'Technology', 'Digital Platforms', i + 1, k[0], k[1], k[2]); });
  YLP_GOALS().forEach(function (g, i) { kra('SMP-0202', 'Tanvi Rao', CFY, 'Human Resources', 'Learning & Development', i + 1, g[0], g[1], g[2]); });
  [['Underwrite standard proposals within TAT', 'Decide standard proposals within TAT', 60], ['Maintain underwriting MIS', 'Maintain daily decision MIS', 40]].forEach(function (k, i) { kra('SMP-0203', 'Kabir Malhotra', CFY, 'Operations', 'Underwriting', i + 1, k[0], k[1], k[2]); });
  [['Brand campaign coordination', 'Coordinate brand campaigns with agencies', 50], ['Partner communication material', 'Deliver partner communication on time', 50]].forEach(function (k, i) { kra('SMP-0204', 'Nisha Fernandes', CFY, 'Marketing', 'Brand & Communications', i + 1, k[0], k[1], k[2]); });
  // Validation-warning example: repeated KRA title.
  [['Pricing model review', 'Review term-plan pricing models', 40], ['Pricing model review', 'Review savings-plan pricing models', 30], ['Actuarial certification progress', 'Pass the next actuarial paper', 30]].forEach(function (k, i) { kra('SMP-0205', 'Arjun Nair', CFY, 'Actuarial', 'Pricing', i + 1, k[0], k[1], k[2]); });
  [['Resolve customer requests within TAT', 'Resolve service requests within TAT', 60], ['Customer satisfaction on closed cases', 'Improve CSAT on closed cases', 40]].forEach(function (k, i) { kra('SMP-0206', 'Diya Chatterjee', CFY, 'Customer Experience', 'Customer Service', i + 1, k[0], k[1], k[2]); });
  // Predominantly transactional example.
  [['Ensure timely processing of investment confirmations', 'Ensure timely processing', 40], ['Maintain daily MIS reports', 'Maintain MIS reporting', 30], ['Reconcile custodian statements', 'Reconcile statements daily', 30]].forEach(function (k, i) { kra('SMP-0207', 'Vikram Sethi', CFY, 'Finance', 'Investments', i + 1, k[0], k[1], k[2]); });
  [['Build department completion data sets', 'Prepare data sets for analytics requests', 50], ['Dashboard maintenance', 'Maintain two operational dashboards', 50]].forEach(function (k, i) { kra('SMP-0208', 'Pooja Menon', CFY, 'Technology', 'Data & Analytics', i + 1, k[0], k[1], k[2]); });

  function YLP_GOALS() {
    return [
      ['Learning Platforms Management', 'Run the learning platforms with 99% availability', 20],
      ['Learning Operations and Administration', 'Administer nominations and records within 2 days', 20],
      ['Department-Wise Learning Accountability', 'Publish monthly department-wise completion', 20],
      ['Learning Content, Instructional Design and Communication', 'Design four modules and their communication', 20],
      ['Compliance Training Calendar', 'Run the mandatory compliance calendar on time', 15],
      ['Personal Development and Capability Building', 'Complete one certification', 5]
    ];
  }

  var SCALES = YLP_GOALS().map(function (g) {
    return S({ EmployeeID: 'SMP-0202', EmployeeName: 'Tanvi Rao', FinancialYear: CFY, KRAName: g[0], KRAWeight: g[2], Parameter: 'Timeliness', Level1Threshold: '<60%', Level2Threshold: '60-74%', Level3Threshold: '75-89%', Level4Threshold: '90-99%', Level5Threshold: '100%', Level5PlusThreshold: '>100%', Rationale: 'Agreed with the manager at goal setting' });
  });

  /* ---------------- Role descriptors ---------------- */
  function role(id, bu, dept, work, desc, dist, wtw, wtwRole, uniq, skills, type) {
    return S({ RoleDescriptorID: id, BusinessUnit: bu, Department: dept, WorkRole: work, RoleDescriptors: desc, DistributedOrCOE: dist, WTWTitle: wtw, WTWJobRole: wtwRole, UniqueRoleName: uniq, SpecialSkills: skills, RoleType: type });
  }
  var ROLES = [
    role('RD-01', 'Operations', 'Policy Servicing', 'Executive - Policy Servicing', 'Process servicing requests, maintain MIS and service governance for hubs', 'COE', 'Executive - Policy Servicing', 'Operations Executive', 'Policy Servicing Executive', 'Servicing systems', 'IC'),
    role('RD-02', 'Finance', 'Financial Planning', 'Assistant Manager - FP&A', 'Prepare variance reports, reconciliation, dashboards and budget analysis', 'COE', 'Assistant Manager - FP&A', 'Finance Analyst', 'FP&A Assistant Manager', 'Excel, Power BI', 'IC'),
    role('RD-03', 'Human Resources', 'Learning & Development', 'Executive - Learning & Development', 'Learning platforms, learning operations, compliance training calendar and content', 'COE', 'Executive - Learning & Development', 'L&D Executive', 'L&D Executive', 'LMS administration', 'IC'),
    role('RD-04', 'Technology', 'Digital Platforms', 'Engineer - Digital', 'Deliver platform releases and automate policy issuance journeys', 'COE', 'Engineer - Digital', 'Software Engineer', 'Digital Platform Engineer', 'Agile delivery', 'IC'),
    role('RD-05', 'Risk & Compliance', 'Compliance', 'Assistant Manager - Compliance', 'Compliance testing, regulatory returns and distribution compliance', 'COE', 'Assistant Manager - Compliance', 'Compliance Analyst', 'Compliance Assistant Manager', 'Regulatory knowledge', 'IC'),
    role('RD-06', 'Operations', 'Underwriting', 'Underwriter', 'Underwrite proposals and maintain decision MIS', 'COE', 'Underwriter', 'Underwriter', 'Underwriting Officer', 'Underwriting', 'IC'),
    role('RD-07', 'Actuarial', 'Pricing', 'Pricing Analyst', 'Pricing models, product reviews and experience studies', 'COE', 'Pricing Analyst', 'Actuarial Analyst', 'Pricing Analyst', 'Actuarial exams', 'IC'),
    role('RD-08', 'Customer Experience', 'Customer Service', 'Customer Service Officer', 'Resolve customer requests and improve satisfaction', 'Distributed', 'Customer Service Officer', 'Service Officer', 'Customer Service Officer', 'CRM', 'IC')
  ];

  return {
    meta: {
      schema: 2, dataAsOf: '2026-10-01', lastUpload: null, sourceFile: 'Built-in sample data',
      nameMappings: {}, idMappings: {}, roleMappings: { 'SMP-0102': 'RD-02' }, classificationOverrides: {}
    },
    Participants: P, KRAs: K, KRARatingScales: SCALES, Competencies: C, Projects: PROJECTS, ProjectParticipants: MEMBERS,
    DevelopmentActions: DA, Learning: L, Mentoring: MENT, StakeholderFeedback: FB, JourneyActivities: A,
    RoleDescriptors: ROLES, CompetencyFramework: [], unmatched: [], uploadHistory: []
  };
})();
