/* ==========================================================================
   Default content: competency framework (spec 29–35) and the six Gurukul
   stages (spec 19–24).

   D-20: the brief gives domain names, anchor names and Level 3 domain
   summaries. Anchor definitions and the five level descriptors below are
   written defaults. Importing the Leadership Competency Workbook replaces
   them (the imported framework always wins).
   ========================================================================== */
(function (YLP) {
  'use strict';

  var LEVELS = {
    1: 'Understands what is expected and applies it with guidance in routine situations.',
    2: 'Applies it independently in routine situations; needs support when situations are new or complex.',
    3: 'Applies it independently and consistently, including in non-routine situations, with observable results.',
    4: 'Applies it in complex, ambiguous situations and helps others build the capability.',
    5: 'Shapes practice across the organisation and is sought out as a role model.'
  };

  var DOMAINS = [
    {
      key: 'D1', name: 'Customer and Stakeholder Management', short: 'Customer & Stakeholder',
      level3: 'Understands diverse stakeholder needs, builds trust-based relationships, independently influences mutually beneficial outcomes, delivers reliable customer experiences, and collaborates across functions.',
      anchors: [
        ['Communication and Networking', 'Shares information clearly and builds working relationships across teams and levels.'],
        ['Influencing and Negotiation', 'Builds support for ideas and reaches agreements that work for SUD Life and its stakeholders.'],
        ['Customer Engagement and Service Orientation', 'Understands customer and partner needs and acts to deliver a reliable, fair experience.'],
        ['Emotional Intelligence', 'Recognises own and others’ emotions and uses that awareness to respond constructively.'],
        ['Collaboration', 'Works across functions toward shared goals, sharing information, effort and credit.']
      ]
    },
    {
      key: 'D2', name: 'Performance and Result Orientation', short: 'Performance & Results',
      level3: 'Consistently delivers quality outcomes independently, takes accountability, applies feedback, improves processes, and contributes to team capability.',
      anchors: [
        ['Achievement Orientation and Ownership of Outcomes', 'Sets high standards, takes accountability for results and follows through.'],
        ['Continuous Improvement', 'Looks for better ways of working and acts on feedback and data to improve processes.'],
        ['Creating High-Performance Teams and Talent Development', 'Helps others perform and grow through support, knowledge sharing and constructive feedback.']
      ]
    },
    {
      key: 'D3', name: 'Strategy and Innovation', short: 'Strategy & Innovation',
      level3: 'Understands market dynamics, assesses business opportunities, introduces customer-focused improvements, and makes informed decisions in complex situations.',
      anchors: [
        ['Business Acumen and Strategic Planning', 'Understands how the insurance business creates value and plans work in line with business priorities.'],
        ['Customer-Centric Innovation', 'Generates and tests new ideas that improve outcomes for customers and partners.'],
        ['Problem Solving and Decision Making', 'Analyses problems, weighs options and makes sound, timely decisions.']
      ]
    },
    {
      key: 'D4', name: 'Risk Management', short: 'Risk Management',
      level3: 'Evaluates and mitigates risks, plans structured change, aligns people and processes, maintains governance standards, and demonstrates integrity and fairness.',
      anchors: [
        ['Risk Assessment and Compliance', 'Identifies risks in own work and follows regulatory and policy requirements.'],
        ['Change Planning and Implementation', 'Plans and carries out change in a structured way, bringing people and processes along.'],
        ['Governance and Monitoring', 'Tracks work against agreed controls and standards and escalates issues early.'],
        ['Ethics', 'Acts with integrity and fairness, and speaks up when something is not right.']
      ]
    },
    {
      key: 'D5', name: 'Digital Mindset and Agility', short: 'Digital & Agility',
      level3: 'Uses digital tools, interprets data, applies insights, adapts to changing priorities, and collaborates across teams to deliver timely results.',
      anchors: [
        ['Digital Mindset', 'Embraces digital tools and looks for ways technology can improve work.'],
        ['Data Analytics Proficiency', 'Reads, interprets and uses data to inform decisions.'],
        ['Agile Working', 'Adapts to changing priorities and works iteratively with others to deliver on time.']
      ]
    }
  ];

  function defaultRecords() {
    var out = [];
    DOMAINS.forEach(function (d) {
      d.anchors.forEach(function (a) {
        out.push({
          CompetencyDomain: d.name, BehaviouralAnchor: a[0], Definition: a[1],
          Level1Definition: LEVELS[1], Level2Definition: LEVELS[2], Level3Definition: LEVELS[3],
          Level4Definition: LEVELS[4], Level5Definition: LEVELS[5], Summary: '',
          FrameworkVersion: 'Default (built in)', SourceFile: 'Built-in default framework', SourceSheet: ''
        });
      });
    });
    return out;
  }

  var STAGES = [
    {
      name: 'Pravesh', subtitle: 'Entering the Leadership Journey', icon: 'gate',
      includes: ['Participant profile creation', 'Role mapping', 'Role-descriptor mapping', 'Previous FY KRA mapping', 'Current FY KRA mapping', 'Historical KRA import', 'Employee-ID-based reconciliation', 'KRA-weight validation', 'KRA-format normalization', 'Data-availability review', 'Self-assessment', 'Manager assessment', 'Career aspiration', 'Initial development conversation', 'IDP initiation'],
      evidence: ['Participant profile completed', 'Baseline assessment completed', 'Previous FY KRA mapped where applicable', 'Current FY KRA mapped', 'KRA weightage validated', 'Role descriptor confirmed', 'Leadership pathway identified', 'IDP initiated', 'Data gaps recorded without converting them to zero']
    },
    {
      name: 'Bodh', subtitle: 'Building Business Understanding', icon: 'lamp',
      includes: ['SUD Life business model', 'Insurance value chain', 'Customer lifecycle', 'Distribution ecosystem', 'Product understanding', 'Financial acumen', 'Risk and regulatory context', 'Digital and data foundations'],
      evidence: ['Business-acumen assessment', 'Insurance-value-chain analysis', 'Customer or partner journey reflection', 'Functional presentation', 'Application reflection']
    },
    {
      name: 'Abhyas', subtitle: 'Learning Through Application', icon: 'path',
      includes: ['Mandatory cross-functional action-learning project', 'Current-role stretch assignment', 'Lead-without-authority assignment', 'Business or functional immersion', 'Leadership shadowing', 'Process-improvement assignment'],
      evidence: ['Project charter', 'Stakeholder map', 'Participant-role definition', 'Milestone completion', 'Stretch-assignment output', 'Sponsor feedback', 'Individual-contribution evidence', 'Reflection note']
    },
    {
      name: 'Margdarshan', subtitle: 'Learning Through Guidance', icon: 'guide',
      includes: ['Mentor conversations', 'Manager development reviews', 'Project-sponsor feedback', 'Peer-learning circles', 'Functional-leader interactions', 'Stakeholder feedback', 'Development coaching'],
      evidence: ['Mentoring log', 'Quarterly development conversation', 'Feedback received', 'Feedback applied', 'Development action completed']
    },
    {
      name: 'Manthan', subtitle: 'Testing and Strengthening Leadership Capability', icon: 'churn',
      includes: ['Business simulation', 'Problem-solving case', 'Leadership interview', 'Cross-functional project presentation', 'Stakeholder panel', 'Competency reassessment', 'IDP-progress review'],
      evidence: ['Assessment scores', 'Behavioural examples', 'Panel feedback', 'Competency-gap movement', 'Project outcome', 'Leadership reflection']
    },
    {
      name: 'Uday', subtitle: 'Emerging Into Broader Leadership Responsibility', icon: 'sun',
      includes: ['Foundation Building', 'Developing Toward Level 3', 'Demonstrating Level 3', 'Ready for Broader Exposure', 'Specialist Leadership Pathway', 'Project Leadership Pathway', 'People Leadership Pathway', 'Insufficient Evidence'],
      includesLabel: 'Possible development outcomes',
      evidence: ['Final leadership profile', 'Updated competency assessment', 'Updated IDP', 'Next-experience recommendation', 'Manager review', 'Sponsor review', 'Development-deployment recommendation']
    }
  ];

  var MODEL = {
    experience: {
      title: '70% Experience',
      intro: 'Learning on the job. The cross-functional action-learning project is the largest single part of the whole model.',
      expectations: ['Join one cross-functional action-learning project', 'Work with participants from at least two other functions', 'Address a real SUD Life business problem', 'Work under a business sponsor', 'Work with a YLP adviser', 'Participate in root-cause analysis', 'Contribute to solution design', 'Participate in a pilot or proof of concept', 'Present outcomes to a leadership panel', 'Record individual contribution and evidence'],
      tracked: ['Activity name', 'Assigned status', 'Start date', 'Target date', 'Completion percentage', 'Current status', 'Owner', 'Sponsor', 'Evidence', 'Validation', 'Development outcome']
    },
    relationships: {
      title: '20% Developmental Relationships',
      intro: 'Learning through other people: mentors, managers, sponsors, peers and experts.',
      tracked: ['Number planned', 'Number completed', 'Last interaction date', 'Key action', 'Action status', 'Next review date', 'Development theme', 'Evidence']
    },
    learning: {
      title: '10% Structured Learning',
      intro: 'Formal learning, counted only when it is applied back at work.',
      tracked: ['Status', 'Completion date', 'Learning hours', 'Assessment score', 'Application evidence', 'Validation status']
    }
  };

  function norm(s) { return String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ''); }

  YLP.framework = {
    DOMAINS: DOMAINS, LEVELS: LEVELS, STAGES: STAGES, MODEL: MODEL, defaultRecords: defaultRecords, norm: norm,
    domainByName: function (name) {
      var n = norm(name);
      for (var i = 0; i < DOMAINS.length; i++) {
        if (norm(DOMAINS[i].name) === n || norm(DOMAINS[i].short) === n || norm(DOMAINS[i].key) === n) return DOMAINS[i];
      }
      return null;
    },
    anchorByName: function (name) {
      var n = norm(name);
      for (var i = 0; i < DOMAINS.length; i++) {
        for (var j = 0; j < DOMAINS[i].anchors.length; j++) {
          if (norm(DOMAINS[i].anchors[j][0]) === n) return { domain: DOMAINS[i], anchor: DOMAINS[i].anchors[j][0], definition: DOMAINS[i].anchors[j][1] };
        }
      }
      return null;
    }
  };
})(window.YLP);
