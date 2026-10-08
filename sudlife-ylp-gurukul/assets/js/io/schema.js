/* ==========================================================================
   Table schema (spec 59) plus the documented extensions (D-10).
   Canonical field names double as CSV template headers. Header matching
   ignores case, spaces and punctuation, so "Employee ID", "EmployeeID" and
   "employee_id" are the same column.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var U = YLP.util;

  // fields: canonical order. ext: fields added beyond spec 59.
  var TABLES = {
    Participants: {
      label: 'Participants', employeeLinked: false,
      fields: ['EmployeeID', 'EmployeeName', 'Status', 'Cohort', 'DateOfJoining', 'OriginalDateOfJoining', 'JobLevel', 'Designation', 'BusinessUnit', 'Department', 'Manager', 'HRBP', 'JourneyStage', 'OverallProgress', 'LeadershipPathway', 'MentorStatus', 'IDPStatus', 'ProfilePhotoURL', 'CareerAspiration', 'IsSample', 'LastUpdated', 'SourceFile', 'SourceSheet'],
      ext: ['CareerAspiration'],
      aliases: {
        EmployeeID: ['Employee Id', 'Emp ID', 'Employee Code', 'Emp Code'],
        EmployeeName: ['Full Name', 'Employee Name', 'Name'],
        DateOfJoining: ['Date Of Joining', 'DOJ', 'Joining Date'],
        JobLevel: ['Job Level', 'Grade', 'Band'],
        Department: ['Current Department', 'Department'],
        Manager: ['Direct Manager Email Id', 'Direct Manager', 'Reporting Manager', 'Manager'],
        HRBP: ['HRBP Email Id', 'HRBP'],
        Cohort: ['YLP Batch', 'Batch', 'Cohort'],
        CareerAspiration: ['Career Aspiration', 'Aspiration']
      },
      ignored: ['Official Email Id', 'Official Email', 'Email', 'Email Id', 'Personal Email'],
      dates: ['DateOfJoining'], numbers: ['OverallProgress'], required: ['EmployeeID'],
      key: function (r) { return U.text(r.EmployeeID); }
    },
    KRAs: {
      label: 'KRAs', employeeLinked: true,
      fields: ['EmployeeID', 'EmployeeName', 'FinancialYear', 'KRADataType', 'BusinessUnit', 'Department', 'KRASequence', 'KRAName', 'KRADescription', 'Weightage', 'Target', 'Achievement', 'CurrentProgress', 'Rating', 'ManagerObservation', 'Evidence', 'KRAType', 'SuggestedClassification', 'ConfirmedClassification', 'ConfirmedBy', 'ConfirmationDate', 'ClassificationRationale', 'RoleAlignment', 'WeightageSource', 'SMARTGoal', 'KeyParameters', 'Designation', 'LastUpdated', 'SourceFile', 'SourceSheet'],
      ext: ['WeightageSource', 'SMARTGoal', 'KeyParameters', 'Designation'],
      aliases: {
        EmployeeID: ['Employee Id', 'Emp ID', 'Employee Code'],
        EmployeeName: ['Employee Name', 'Full Name'],
        BusinessUnit: ['Business Unit', 'Business Unit_x'],
        Department: ['Department', 'Current Department'],
        KRASequence: ['KRA Sequence', 'KRA No', 'KRA Number', 'S No'],
        KRAName: ['Goals / Key Result Areas KRA', 'KRA Name', 'KRA'],
        KRADescription: ['Goals / Key Result Areas Description', 'KRA Description', 'Description'],
        Weightage: ['Goals / Key Result Areas Weightage Percentage', 'Weightage', 'Weightage Percentage', 'Weight'],
        FinancialYear: ['Financial Year', 'FY', 'Performance Year']
      },
      ignored: ['Business Unit_y'],
      // Columns that suggest behavioural scores were mixed into a KRA file (spec 60).
      confusion: ['Proficiency', 'Competency Level', 'Behavioural Level', 'Behavioral Level', 'Current Level'],
      dates: ['ConfirmationDate'], weights: ['Weightage'], required: ['EmployeeID'],
      key: function (r) {
        var tail = U.has(r.KRASequence) ? 'seq:' + r.KRASequence : 'name:' + U.text(r.KRAName).toLowerCase() + '|' + r.Weightage;
        return [U.text(r.EmployeeID), U.text(r.FinancialYear), tail].join('|');
      }
    },
    KRARatingScales: {
      label: 'KRA rating scales', employeeLinked: true,
      fields: ['EmployeeID', 'EmployeeName', 'FinancialYear', 'KRAName', 'KRAWeight', 'Parameter', 'Level1Threshold', 'Level2Threshold', 'Level3Threshold', 'Level4Threshold', 'Level5Threshold', 'Level5PlusThreshold', 'Rationale', 'SourceFile', 'SourceSheet'],
      aliases: {
        KRAName: ['KRA', 'KRA Name'], KRAWeight: ['Weight', 'Weightage', 'KRA Weight'], Parameter: ['Parameter', 'Parameters', 'Metric'],
        Level1Threshold: ['Level 1', 'Level 1 Threshold'], Level2Threshold: ['Level 2', 'Level 2 Threshold'], Level3Threshold: ['Level 3', 'Level 3 Threshold'],
        Level4Threshold: ['Level 4', 'Level 4 Threshold'], Level5Threshold: ['Level 5', 'Level 5 Threshold'], Level5PlusThreshold: ['Level 5+', 'Level 5+ Threshold', 'Level 5 Plus'],
        Rationale: ['Rationale and Justification', 'Rationale', 'Justification'], FinancialYear: ['Financial Year', 'FY']
      },
      weights: ['KRAWeight'], fillDown: ['KRAName', 'KRAWeight'], required: ['KRAName', 'Parameter'],
      key: function (r) { return [U.text(r.EmployeeID), U.text(r.FinancialYear), U.text(r.KRAName).toLowerCase(), U.text(r.Parameter).toLowerCase()].join('|'); }
    },
    Competencies: {
      label: 'Competency assessments', employeeLinked: true,
      fields: ['EmployeeID', 'AssessmentDate', 'AssessmentType', 'CompetencyDomain', 'BehaviouralAnchor', 'BaselineLevel', 'CurrentLevel', 'TargetLevel', 'Assessor', 'Evidence', 'EvidenceCount', 'NonRoutineEvidence', 'ValidatorRole', 'ValidationStatus', 'DevelopmentAction', 'NextReviewDate', 'AssessmentStatus', 'SourceTargetLevel', 'SourceFile', 'SourceSheet'],
      ext: ['SourceTargetLevel'],
      aliases: {
        CompetencyDomain: ['Competency Domain', 'Domain', 'Competency'], BehaviouralAnchor: ['Behavioural Anchor', 'Behavioral Anchor', 'Behavioral Anchors', 'Anchor'],
        CurrentLevel: ['Current Level', 'Current Proficiency', 'Proficiency Level', 'Level'], BaselineLevel: ['Baseline Level', 'Baseline Proficiency'],
        TargetLevel: ['Target Level', 'Target Proficiency'], NonRoutineEvidence: ['Non-Routine Evidence', 'Non Routine'], ValidatorRole: ['Validator Role', 'Validated By Role']
      },
      confusion: ['Rating', 'KRA Rating', 'Performance Rating', 'Appraisal Rating'],
      dates: ['AssessmentDate', 'NextReviewDate'], numbers: ['EvidenceCount'], levels: ['BaselineLevel', 'CurrentLevel', 'TargetLevel'],
      required: ['EmployeeID', 'BehaviouralAnchor'],
      key: function (r) { return [U.text(r.EmployeeID), U.text(r.AssessmentDate), U.normKey(r.CompetencyDomain), U.normKey(r.BehaviouralAnchor), U.normKey(r.AssessmentType)].join('|'); }
    },
    Projects: {
      label: 'Projects', employeeLinked: false,
      fields: ['ProjectID', 'ProjectTitle', 'ProjectTheme', 'BusinessProblem', 'ProjectSponsor', 'YLPAdviser', 'FunctionsRepresented', 'StartDate', 'TargetDate', 'Status', 'CompletionPercentage', 'BaselineMeasure', 'TargetImpact', 'ActualImpact', 'PanelScore', 'ExceptionApproved', 'EvalBusinessRelevance', 'EvalProblemDiagnosis', 'EvalCollaboration', 'EvalSolutionQuality', 'EvalPilot', 'EvalImpact', 'EvalPresentation', 'LastUpdated'],
      ext: ['EvalBusinessRelevance', 'EvalProblemDiagnosis', 'EvalCollaboration', 'EvalSolutionQuality', 'EvalPilot', 'EvalImpact', 'EvalPresentation'],
      aliases: { ProjectTitle: ['Project Title', 'Project Name', 'Title'], YLPAdviser: ['YLP Adviser', 'YLP Advisor', 'Adviser', 'Advisor'], ProjectSponsor: ['Project Sponsor', 'Sponsor', 'Business Sponsor'] },
      dates: ['StartDate', 'TargetDate'], percents: ['CompletionPercentage'], numbers: ['PanelScore', 'EvalBusinessRelevance', 'EvalProblemDiagnosis', 'EvalCollaboration', 'EvalSolutionQuality', 'EvalPilot', 'EvalImpact', 'EvalPresentation'],
      required: ['ProjectID'], key: function (r) { return U.text(r.ProjectID); }
    },
    ProjectParticipants: {
      label: 'Project participants', employeeLinked: true,
      fields: ['ProjectID', 'EmployeeID', 'ParticipantRole', 'IndividualContribution', 'StakeholderFeedback', 'SponsorFeedback', 'ContributionRating', 'Evidence'],
      aliases: {}, numbers: ['ContributionRating'], required: ['ProjectID', 'EmployeeID'],
      key: function (r) { return U.text(r.ProjectID) + '|' + U.text(r.EmployeeID); }
    },
    DevelopmentActions: {
      label: 'Development actions (IDP)', employeeLinked: true,
      fields: ['ActionID', 'EmployeeID', 'DevelopmentCategory', 'DevelopmentAction', 'CompetencyLinked', 'Owner', 'StartDate', 'TargetDate', 'Status', 'CompletionPercentage', 'Evidence', 'ManagerComment', 'NextReviewDate'],
      aliases: {}, dates: ['StartDate', 'TargetDate', 'NextReviewDate'], percents: ['CompletionPercentage'], required: ['ActionID', 'EmployeeID'],
      key: function (r) { return U.text(r.ActionID); }
    },
    Learning: {
      label: 'Learning records', employeeLinked: true,
      fields: ['EmployeeID', 'LearningTitle', 'LearningType', 'CompletionDate', 'LearningHours', 'Status', 'AssessmentScore', 'ApplicationEvidence', 'ValidationStatus'],
      ext: ['ValidationStatus'], aliases: { LearningTitle: ['Learning Title', 'Course', 'Module', 'Programme'] },
      dates: ['CompletionDate'], numbers: ['LearningHours', 'AssessmentScore'], required: ['EmployeeID', 'LearningTitle'],
      key: function (r) { return [U.text(r.EmployeeID), U.text(r.LearningTitle).toLowerCase(), U.text(r.CompletionDate)].join('|'); }
    },
    Mentoring: {
      label: 'Mentoring records', employeeLinked: true,
      fields: ['EmployeeID', 'InteractionType', 'Mentor', 'MeetingDate', 'DiscussionTheme', 'ActionCommitted', 'ActionCompleted', 'NextReviewDate', 'Evidence'],
      ext: ['InteractionType'], aliases: { Mentor: ['Mentor', 'Mentor Name'], InteractionType: ['Interaction Type', 'Type'] },
      dates: ['MeetingDate', 'NextReviewDate'], required: ['EmployeeID'],
      key: function (r) { return [U.text(r.EmployeeID), U.text(r.MeetingDate), U.text(r.Mentor).toLowerCase()].join('|'); }
    },
    StakeholderFeedback: {
      label: 'Stakeholder feedback', employeeLinked: true,
      fields: ['FeedbackID', 'EmployeeID', 'FeedbackDate', 'FeedbackProvider', 'ProviderRole', 'Context', 'CompetencyLinked', 'FeedbackSummary', 'Rating', 'Evidence'],
      aliases: {}, dates: ['FeedbackDate'], numbers: ['Rating'], required: ['FeedbackID', 'EmployeeID'],
      key: function (r) { return U.text(r.FeedbackID); }
    },
    JourneyActivities: {
      label: 'Journey activities', employeeLinked: true,
      fields: ['ActivityID', 'EmployeeID', 'JourneyStage', 'ActivityName', 'ActivityType', 'StartDate', 'TargetDate', 'CompletionDate', 'Status', 'CompletionPercentage', 'Evidence', 'Owner', 'Sponsor', 'ValidationStatus', 'DevelopmentOutcome', 'ProjectID'],
      ext: ['Sponsor', 'ValidationStatus', 'DevelopmentOutcome', 'ProjectID'], aliases: {},
      dates: ['StartDate', 'TargetDate', 'CompletionDate'], percents: ['CompletionPercentage'], required: ['ActivityID', 'EmployeeID'],
      key: function (r) { return U.text(r.ActivityID); }
    },
    RoleDescriptors: {
      label: 'Role descriptors', employeeLinked: false,
      fields: ['RoleDescriptorID', 'BusinessUnit', 'Department', 'WorkRole', 'RoleDescriptors', 'DistributedOrCOE', 'WTWTitle', 'WTWJobRole', 'UniqueRoleName', 'SpecialSkills', 'RoleType', 'SourceFile', 'SourceSheet'],
      aliases: {
        BusinessUnit: ['Business Unit (as per HRMS)', 'Business Unit'], Department: ['Department (as per HRMS)', 'Department'], WorkRole: ['Work Role'],
        RoleDescriptors: ['Key descriptors or deliverables', 'Key Descriptors', 'Deliverables', 'Role Descriptors'], DistributedOrCOE: ['Distributed / COE', 'Distributed or COE'],
        WTWTitle: ['WTW Title'], WTWJobRole: ['WTW Job Role'], UniqueRoleName: ['Unique Role Name'], SpecialSkills: ['Special Skills / Qualifications', 'Special Skills'], RoleType: ['Role (IC/TM)', 'Role Type']
      },
      required: ['UniqueRoleName'],
      key: function (r) { return [U.normKey(r.BusinessUnit), U.normKey(r.Department), U.normKey(r.UniqueRoleName)].join('|'); }
    },
    CompetencyFramework: {
      label: 'Competency framework', employeeLinked: false,
      fields: ['CompetencyDomain', 'BehaviouralAnchor', 'Definition', 'Level1Definition', 'Level2Definition', 'Level3Definition', 'Level4Definition', 'Level5Definition', 'Summary', 'FrameworkVersion', 'SourceFile', 'SourceSheet'],
      ext: ['Summary'],
      aliases: {
        CompetencyDomain: ['Competency', 'Competency Domain', 'Domain'], BehaviouralAnchor: ['Behavioral Anchors', 'Behavioural Anchors', 'Behavioral Anchor', 'Anchor'],
        Definition: ['Definitions of the behavioral anchors', 'Definitions of the behavioural anchors', 'Definition'],
        Level1Definition: ['Level 1: Basic', 'Level 1'], Level2Definition: ['Level 2: Developing', 'Level 2'], Level3Definition: ['Level 3: Proficient', 'Level 3'],
        Level4Definition: ['Level 4: Advanced', 'Level 4'], Level5Definition: ['Level 5: Expert', 'Level 5']
      },
      fillDown: ['CompetencyDomain'], required: ['BehaviouralAnchor'],
      key: function (r) { return U.normKey(r.CompetencyDomain) + '|' + U.normKey(r.BehaviouralAnchor); }
    }
  };

  var ORDER = ['Participants', 'KRAs', 'KRARatingScales', 'Competencies', 'Projects', 'ProjectParticipants', 'DevelopmentActions', 'Learning', 'Mentoring', 'StakeholderFeedback', 'JourneyActivities', 'RoleDescriptors', 'CompetencyFramework'];

  // Sheet names recognised in a complete workbook (spec 57).
  var SHEET_ALIASES = {
    Participants: ['Participants', 'Participant Master', 'Participant_Master'], KRAs: ['KRAs', 'KRA', 'Employee_KRAs'], KRARatingScales: ['KRARatingScales', 'KRA Rating Scales', 'Submitted Metric Scales'],
    Competencies: ['Competencies', 'Competency Assessments'], Projects: ['Projects'], ProjectParticipants: ['ProjectParticipants', 'Project Participants'],
    DevelopmentActions: ['DevelopmentActions', 'Development Actions', 'IDP'], Learning: ['Learning', 'Learning Records'], Mentoring: ['Mentoring', 'Mentoring Records'],
    StakeholderFeedback: ['StakeholderFeedback', 'Stakeholder Feedback'], JourneyActivities: ['JourneyActivities', 'Journey Activities'],
    RoleDescriptors: ['RoleDescriptors', 'Role Descriptors'], CompetencyFramework: ['CompetencyFramework', 'Competency Framework']
  };

  function aliasesFor(table, field) {
    var t = TABLES[table];
    return [field].concat((t.aliases && t.aliases[field]) || []);
  }

  function tableForSheet(name) {
    var n = U.normKey(name);
    for (var i = 0; i < ORDER.length; i++) {
      if (SHEET_ALIASES[ORDER[i]].some(function (a) { return U.normKey(a) === n; })) return ORDER[i];
    }
    return null;
  }

  YLP.schema = { TABLES: TABLES, ORDER: ORDER, SHEET_ALIASES: SHEET_ALIASES, aliasesFor: aliasesFor, tableForSheet: tableForSheet };
})(window.YLP);
