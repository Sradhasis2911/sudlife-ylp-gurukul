/* ==========================================================================
   Import pipeline (spec 45–50, 56–62).

   read file locally -> choose dataset -> find header row -> map columns
   (auto, overridable) -> convert & validate each row -> match employees ->
   preview (records, errors, warnings, unmatched) -> plan merge -> confirm.

   Blocking errors stop the whole import (D-60). Row-level problems reject
   only that row and are counted as "rejected". Records whose employee is not
   in the participant master go to the Unmatched queue (D-63).
   ========================================================================== */
(function (YLP) {
  'use strict';

  var S = YLP.sanitize, D = YLP.dates, K = YLP.kra, U = YLP.util, SC = YLP.schema, M = YLP.model;
  var MAX_FILE_BYTES = 25 * 1024 * 1024;
  var SYSTEM_FIELDS = ['IsSample', 'LastUpdated', 'SourceFile', 'SourceSheet', 'OriginalDateOfJoining', 'WeightageSource', 'SourceTargetLevel', 'SuggestedClassification'];

  function norm(h) {
    return String(h === null || h === undefined ? '' : h).toLowerCase().replace(/\+/g, 'plus').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
  }
  function nonEmpty(v) { return !(v === null || v === undefined || String(v).trim() === ''); }
  function idText(v) {
    if (!nonEmpty(v)) return '';
    if (typeof v === 'number') return String(v);
    return S.text(v).replace(/\.0+$/, '');
  }
  function nameKey(s) { return String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim(); }

  /* ---------------- Dataset types (spec 56) ---------------- */
  var SPEC_KRA_HEADERS = ['Employee ID', 'Employee Name', 'Business Unit', 'Department', 'Goals / Key Result Areas KRA', 'Goals / Key Result Areas Description', 'Goals / Key Result Areas Weightage Percentage'];
  var DATASETS = {
    completeWorkbook: { label: 'Complete Workbook', multi: true, excelOnly: true },
    participantMaster: { label: 'Participant Master', table: 'Participants', sheetHints: ['Participants', 'Participant Master', 'Participant_Master', 'Master'], template: ['Employee ID', 'Status', 'Employee Name', 'Date Of Joining', 'Job Level', 'Designation', 'Department', 'Business Unit', 'Direct Manager Email Id', 'HRBP Email Id', 'YLP Batch', 'JourneyStage', 'LeadershipPathway', 'MentorStatus', 'CareerAspiration'] },
    currentFyKra: { label: 'Current FY KRA Workbook', table: 'KRAs', sheetHints: ['Employee_KRAs', 'KRAs'], template: SPEC_KRA_HEADERS, defaults: { FinancialYear: M.currentFY, KRADataType: 'Current FY' } },
    previousFyKra: { label: 'Previous FY KRA Workbook', table: 'KRAs', sheetHints: ['Employee_KRAs', 'KRAs'], template: SPEC_KRA_HEADERS, defaults: { FinancialYear: M.previousFY, KRADataType: 'Previous FY' } },
    goalSheet: { label: 'Individual KRA Goal Sheet', special: 'goal', excelOnly: true },
    kraRatingScales: { label: 'KRA Rating Scales', table: 'KRARatingScales', sheetHints: ['Submitted Metric Scales', 'KRARatingScales'] },
    roleDescriptors: { label: 'Role Descriptor Workbook', table: 'RoleDescriptors', sheetHints: ['RoleDescriptors', 'Role Descriptors'], template: ['Business Unit (as per HRMS)', 'Department (as per HRMS)', 'Work Role', 'Key descriptors or deliverables', 'Distributed / COE', 'WTW Title', 'WTW Job Role', 'Unique Role Name', 'Special Skills / Qualifications', 'Role (IC/TM)'] },
    competencyWorkbook: { label: 'Leadership Competency Workbook', special: 'framework', template: ['Competency', 'Behavioral Anchors', 'Definitions of the behavioral anchors', 'Level 1: Basic', 'Level 2: Developing', 'Level 3: Proficient', 'Level 4: Advanced', 'Level 5: Expert'] },
    competencyAssessments: { label: 'Competency Assessments', table: 'Competencies' },
    projects: { label: 'Projects', table: 'Projects' },
    projectParticipants: { label: 'Project Participants', table: 'ProjectParticipants' },
    developmentActions: { label: 'Development Actions', table: 'DevelopmentActions' },
    learning: { label: 'Learning Records', table: 'Learning' },
    mentoring: { label: 'Mentoring Records', table: 'Mentoring' },
    stakeholderFeedback: { label: 'Stakeholder Feedback', table: 'StakeholderFeedback' },
    journeyActivities: { label: 'Journey Activities', table: 'JourneyActivities' },
    genericCsv: { label: 'Generic CSV', generic: true },
    genericJson: { label: 'Generic JSON', generic: true }
  };
  var DATASET_ORDER = Object.keys(DATASETS);

  function templateFor(key) {
    var d = DATASETS[key];
    if (!d) return null;
    if (d.template) return d.template;
    if (d.table) return SC.TABLES[d.table].fields.filter(function (f) { return SYSTEM_FIELDS.indexOf(f) === -1; });
    return null;
  }

  /* ---------------- Reading files ---------------- */
  function readAs(file, method) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error || new Error('The file could not be read')); };
      fr[method](file);
    });
  }

  function readFile(file) {
    var name = S.text(file.name, 260);
    var ext = (name.split('.').pop() || '').toLowerCase();
    if (file.size > MAX_FILE_BYTES) return Promise.reject(new Error('This file is larger than 25 MB. Split it into smaller files.'));
    if (ext === 'xlsx' || ext === 'xlsm' || ext === 'xls') {
      if (!YLP.libs.state.excel.available) return Promise.reject(new Error(YLP.libs.EXCEL_UNAVAILABLE));
      return readAs(file, 'readAsArrayBuffer').then(function (buf) {
        var wb = window.XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: false, cellFormula: false, cellHTML: false });
        var date1904 = !!(wb.Workbook && wb.Workbook.WBProps && wb.Workbook.WBProps.date1904);
        // Only parsed rows are kept; the workbook binary is discarded here (spec 3, 63).
        var sheets = {};
        wb.SheetNames.forEach(function (sn) { sheets[sn] = window.XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: null, blankrows: true }); });
        return { kind: 'xlsx', fileName: name, sheetNames: wb.SheetNames.slice(), sheets: sheets, date1904: date1904 };
      });
    }
    if (ext === 'csv' || ext === 'txt') {
      return readAs(file, 'readAsText').then(function (text) {
        var parsed = YLP.csv.parse(text);
        return { kind: 'csv', fileName: name, sheetNames: ['CSV'], sheets: { CSV: parsed.rows }, csvError: parsed.error };
      });
    }
    if (ext === 'json') {
      return readAs(file, 'readAsText').then(function (text) {
        var data;
        try { data = JSON.parse(text); } catch (e) { throw new Error('The JSON file is not valid: ' + e.message); }
        return { kind: 'json', fileName: name, data: S.cleanJson(data) };
      });
    }
    return Promise.reject(new Error('Unsupported file type ".' + ext + '". Upload CSV, JSON or Excel (.xlsx).'));
  }

  /* ---------------- Header detection & column mapping ---------------- */
  function fieldsOf(table) { return SC.TABLES[table].fields.filter(function (f) { return SYSTEM_FIELDS.indexOf(f) === -1 || f === 'SourceSheet'; }); }

  function matchCount(row, table) {
    var normed = (row || []).map(norm), n = 0;
    fieldsOf(table).forEach(function (f) {
      if (SC.aliasesFor(table, f).some(function (a) { return normed.indexOf(norm(a)) !== -1; })) n++;
    });
    return n;
  }

  function findHeaderRow(aoa, table, maxScan) {
    var best = -1, bestN = 1;
    for (var r = 0; r < Math.min(aoa.length, maxScan || 30); r++) {
      var n = matchCount(aoa[r], table);
      if (n > bestN) { best = r; bestN = n; }
    }
    return best;
  }

  function autoMap(header, table) {
    var normed = header.map(norm), map = {}, used = {};
    fieldsOf(table).forEach(function (field) {
      var aliases = SC.aliasesFor(table, field);
      for (var i = 0; i < aliases.length; i++) {
        var idx = normed.indexOf(norm(aliases[i]));
        if (idx !== -1 && !used.hasOwnProperty(idx)) { map[field] = idx; used[idx] = field; break; }
      }
    });
    return map;
  }

  function describeColumns(header, map, table) {
    var t = SC.TABLES[table], used = {};
    Object.keys(map).forEach(function (f) { if (map[f] >= 0) used[map[f]] = f; });
    var ignoredNorm = (t.ignored || []).map(norm), confusionNorm = (t.confusion || []).map(norm);
    var out = { ignored: [], unrecognised: [], confusion: [] };
    header.forEach(function (h, idx) {
      var n = norm(h);
      if (!n || used.hasOwnProperty(idx)) return;
      var label = S.text(h);
      var mergeDup = /_[xy]$/i.test(label) && header.map(norm).indexOf(norm(label.slice(0, -2))) !== -1;
      if (confusionNorm.indexOf(n) !== -1) out.confusion.push(label);
      else if (ignoredNorm.indexOf(n) !== -1 || mergeDup) out.ignored.push(label);
      else out.unrecognised.push(label);
    });
    return out;
  }

  /* ---------------- Value conversion ---------------- */
  function mapCohort(raw) {
    var t = S.text(raw);
    if (!t) return { value: '', issue: 'missing' };
    // D-12: a year range such as "FY 2025-26" maps to its starting year (FY2025).
    var range = /(20\d{2})\s*[-–\/]\s*(\d{2,4})/.exec(t);
    if (range) return { value: 'FY' + range[1], issue: 'range', raw: t };
    var m = /(?:^|[^0-9])(20\d{2})(?![0-9])/.exec(t) || /\bfy\s*'?(\d{2})(?![0-9])/i.exec(t);
    if (m) {
      var y = m[1].length === 2 ? '20' + m[1] : m[1];
      return { value: 'FY' + y, issue: y === '2025' || y === '2026' ? null : 'other-year' };
    }
    return { value: t, issue: 'unrecognised' };
  }

  function normFY(raw) {
    var t = S.text(raw);
    var m = /(?:20)?(\d{2})\s*[-–\/]\s*(?:20)?(\d{2})/.exec(t);
    return m ? 'FY 20' + m[1] + '-' + m[2] : t;
  }
  function dataTypeForFY(fy) { return fy === M.currentFY ? 'Current FY' : fy === M.previousFY ? 'Previous FY' : 'Unclassified FY'; }

  function convertDate(raw, ctx, part, row, field) {
    if (!nonEmpty(raw)) return { iso: null, original: '' };
    if (typeof raw === 'number') {
      var c = D.fromExcelSerial(raw, ctx.date1904);
      if (!c.iso) part.warnings.push({ row: row, msg: 'Invalid date in ' + field + ': ' + (c.issue || raw) });
      return { iso: c.iso, original: c.iso ? D.display(c.iso) : String(raw) };
    }
    var p = D.parseText(raw, ctx.dateFormat || null);
    if (p.ambiguous) ctx.ambiguous.push({ table: part.table, row: row, field: field, value: S.text(raw) });
    else if (!p.iso) part.warnings.push({ row: row, msg: 'Invalid date in ' + field + ': "' + S.text(raw) + '"' });
    return { iso: p.iso, original: S.text(raw) };
  }

  /* ---------------- Parse one table from rows ---------------- */
  function newPart(table, sheetName) {
    return { table: table, sheetName: sheetName, headerRow: null, header: [], map: {}, columns: null, records: [], rejected: [], warnings: [], notes: [], errors: [] };
  }

  function parseTable(aoa, table, ctx, sheetName, overrideMap, defaults) {
    var t = SC.TABLES[table], part = newPart(table, sheetName);
    var hIdx = findHeaderRow(aoa, table, 30);
    if (hIdx < 0 && overrideMap) hIdx = 0;
    if (hIdx < 0) { part.errors.push({ msg: 'No recognised header row found for ' + t.label + (sheetName && sheetName !== 'CSV' ? ' on sheet "' + sheetName + '"' : '') + '. Check the dataset type, map the columns, or download the CSV template.' }); return part; }
    var header = (aoa[hIdx] || []).map(function (h) { return h === null || h === undefined ? '' : String(h); });
    var map = autoMap(header, table);
    if (overrideMap) Object.keys(overrideMap).forEach(function (f) { if (overrideMap[f] === -1) delete map[f]; else map[f] = overrideMap[f]; });
    part.headerRow = hIdx + 1; part.header = header; part.map = map;
    part.columns = describeColumns(header, map, table);
    if (part.columns.ignored.length) part.notes.push('Recognised but not stored: ' + part.columns.ignored.join(', '));
    if (part.columns.unrecognised.length) part.warnings.push({ row: null, msg: 'Unrecognised columns not imported: ' + part.columns.unrecognised.join(', ') });
    if (part.columns.confusion.length) part.warnings.push({ row: null, msg: 'Behavioural score confused with KRA rating? Column(s) ' + part.columns.confusion.join(', ') + ' were not imported. ' + (table === 'KRAs' ? 'Behavioural levels belong in Competency Assessments.' : 'Behavioural levels are read only from CurrentLevel; KRA ratings belong in the KRA workbook.') });

    var allowName = t.fields.indexOf('EmployeeName') !== -1;
    (t.required || []).forEach(function (f) {
      if (!map.hasOwnProperty(f) && !(f === 'EmployeeID' && allowName && map.hasOwnProperty('EmployeeName'))) part.errors.push({ msg: f + ' column not found' + (sheetName && sheetName !== 'CSV' ? ' on sheet "' + sheetName + '"' : '') });
    });
    if (part.errors.length) return part;

    var carry = {}, today = D.todayIso(), weightNotes = {};
    for (var r = hIdx + 1; r < aoa.length; r++) {
      var row = aoa[r] || [];
      if (!row.some(nonEmpty)) continue;
      var rowNo = r + 1, rec = {}, reject = null;
      Object.keys(map).forEach(function (f) { rec[f] = row[map[f]]; });
      (t.fillDown || []).forEach(function (f) { if (nonEmpty(rec[f])) carry[f] = rec[f]; else if (carry[f] !== undefined) rec[f] = carry[f]; });

      Object.keys(rec).forEach(function (f) {
        var v = rec[f];
        if ((t.dates || []).indexOf(f) !== -1) {
          var dv = convertDate(v, ctx, part, rowNo, f);
          rec[f] = dv.iso;
          if (f === 'DateOfJoining') rec.OriginalDateOfJoining = dv.original;
        } else if ((t.weights || []).indexOf(f) !== -1) {
          var w = K.normalizeWeight(v);
          weightNotes[w.note] = (weightNotes[w.note] || 0) + 1;
          if (w.note === 'not-a-number' || w.note === 'negative') reject = reject || 'Weightage "' + S.text(v) + '" is not a valid number';
          if (w.note === 'ambiguous-one') part.warnings.push({ row: rowNo, msg: 'Weightage 1 treated as 100 (decimal rule). Confirm it is not 1%.' });
          if (f === 'Weightage') rec.WeightageSource = nonEmpty(v) ? S.text(v) : '';
          rec[f] = w.value;
        } else if ((t.percents || []).indexOf(f) !== -1) {
          var pv = U.num(v);
          if (nonEmpty(v) && pv === null) part.warnings.push({ row: rowNo, msg: f + ' "' + S.text(v) + '" is not a number; left empty' });
          if (pv !== null && (pv < 0 || pv > 100)) reject = reject || 'Completion below 0 or above 100 (' + pv + ')';
          rec[f] = pv;
        } else if ((t.levels || []).indexOf(f) !== -1) {
          var lv = U.num(v);
          if (nonEmpty(v) && f !== 'TargetLevel' && (lv === null || lv < 1 || lv > 5)) {
            reject = reject || (/meet|exceed|expect|below|outstanding/i.test(S.text(v)) ? 'Behavioural score confused with KRA rating: "' + S.text(v) + '" is a KRA rating label, not a behavioural level' : 'Invalid competency score "' + S.text(v) + '" (must be 1 to 5)');
          }
          rec[f] = lv;
        } else if ((t.numbers || []).indexOf(f) !== -1) {
          var nv = U.num(v);
          if (nonEmpty(v) && nv === null) part.warnings.push({ row: rowNo, msg: f + ' "' + S.text(v) + '" is not a number; left empty' });
          rec[f] = nv;
        } else if (/ID$/.test(f)) {
          rec[f] = idText(v);
        } else {
          rec[f] = S.text(v);
        }
      });
      (t.required || []).forEach(function (f) {
        if (!nonEmpty(rec[f]) && !(f === 'EmployeeID' && allowName && nonEmpty(rec.EmployeeName))) reject = reject || 'Missing ' + f;
      });
      if (defaults) Object.keys(defaults).forEach(function (f) { if (!nonEmpty(rec[f])) rec[f] = defaults[f]; });
      finishRecord(table, rec, part, rowNo, ctx);
      if (rec._reject) { reject = reject || rec._reject; delete rec._reject; }
      if (reject) { part.rejected.push({ row: rowNo, msg: reject }); continue; }
      rec._row = rowNo;
      rec.IsSample = false;
      if (t.fields.indexOf('LastUpdated') !== -1) rec.LastUpdated = today;
      if (t.fields.indexOf('SourceFile') !== -1) { rec.SourceFile = ctx.fileName; rec.SourceSheet = sheetName === 'CSV' || sheetName === 'JSON' ? sheetName : (sheetName || ''); }
      part.records.push(rec);
    }
    if (weightNotes.decimal) part.notes.push(weightNotes.decimal + ' decimal KRA weights normalised (for example 0.2 → 20)');
    if (weightNotes['percent-text']) part.notes.push(weightNotes['percent-text'] + ' percentage-text weights converted (for example "20%" → 20)');
    finishPart(table, part, ctx);
    return part;
  }

  /* Per-table rules applied to each converted record. */
  function finishRecord(table, rec, part, rowNo, ctx) {
    if (table === 'Participants') {
      var c = mapCohort(rec.Cohort);
      if (c.issue === 'missing') part.warnings.push({ row: rowNo, msg: 'Missing cohort (YLP Batch)' });
      else if (c.issue === 'range') part.notes.push('Row ' + rowNo + ': cohort "' + c.raw + '" mapped to ' + c.value + ' (start year of the range)');
      else if (c.issue) part.warnings.push({ row: rowNo, msg: 'Cohort "' + c.value + '" is not FY2025 or FY2026' });
      rec.Cohort = c.value;
      if (!nonEmpty(rec.JobLevel)) part.warnings.push({ row: rowNo, msg: 'Job level not available' });
      else if (rec.JobLevel.length > 40 || !/[a-z0-9]/i.test(rec.JobLevel)) part.warnings.push({ row: rowNo, msg: 'Invalid job level "' + rec.JobLevel + '"' });
      if (!nonEmpty(rec.DateOfJoining) && !nonEmpty(rec.OriginalDateOfJoining)) part.warnings.push({ row: rowNo, msg: 'Joining date not available' });
      if (!nonEmpty(rec.Status)) rec.Status = 'Active';
      // Photos: only relative paths inside the project are allowed (spec 3).
      if (nonEmpty(rec.ProfilePhotoURL) && /^[a-z]+:|^\/\//i.test(rec.ProfilePhotoURL)) { part.warnings.push({ row: rowNo, msg: 'External photo URL ignored; initials are shown instead' }); rec.ProfilePhotoURL = ''; }
    }
    if (table === 'KRAs') {
      if (nonEmpty(rec.FinancialYear)) rec.FinancialYear = normFY(rec.FinancialYear);
      else rec._reject = 'Missing KRA financial year';
      rec.KRADataType = dataTypeForFY(rec.FinancialYear);
      ['Target', 'Achievement', 'CurrentProgress', 'Rating', 'ManagerObservation'].forEach(function (f) { if (!nonEmpty(rec[f])) rec[f] = null; });
    }
    if (table === 'KRARatingScales') {
      if (nonEmpty(rec.FinancialYear)) rec.FinancialYear = normFY(rec.FinancialYear);
    }
    if (table === 'Competencies') {
      var fw = ctx.fw;
      var found = null;
      fw.domains.forEach(function (d) { d.anchors.forEach(function (a) { if (U.normKey(a.name) === U.normKey(rec.BehaviouralAnchor)) found = { domain: d.name, anchor: a.name }; }); });
      if (!found) { rec._reject = 'Unknown competency anchor "' + rec.BehaviouralAnchor + '" (not in the competency framework)'; return; }
      if (nonEmpty(rec.CompetencyDomain) && U.normKey(YLP.framework.domainByName(rec.CompetencyDomain) ? YLP.framework.domainByName(rec.CompetencyDomain).name : rec.CompetencyDomain) !== U.normKey(found.domain)) {
        part.warnings.push({ row: rowNo, msg: 'Anchor "' + found.anchor + '" belongs to ' + found.domain + '; domain corrected' });
      }
      rec.CompetencyDomain = found.domain; rec.BehaviouralAnchor = found.anchor;
      if (rec.TargetLevel !== null && rec.TargetLevel !== undefined && rec.TargetLevel !== M.behaviouralTargetLevel) {
        part.warnings.push({ row: rowNo, msg: 'Target proficiency not equal to 3 (' + rec.TargetLevel + '); target fixed at Level 3' });
        rec.SourceTargetLevel = rec.TargetLevel;
      }
      rec.TargetLevel = M.behaviouralTargetLevel;
      if (!nonEmpty(rec.AssessmentDate)) part.warnings.push({ row: rowNo, msg: 'Missing assessment date (cannot count as current evidence)' });
      if (!nonEmpty(rec.Assessor)) part.warnings.push({ row: rowNo, msg: 'Missing assessor' });
      if (!nonEmpty(rec.Evidence) && !/^self/i.test(rec.AssessmentType)) part.warnings.push({ row: rowNo, msg: 'Missing competency evidence' });
      if (!nonEmpty(rec.AssessmentType)) part.warnings.push({ row: rowNo, msg: 'Assessment type missing (Self, Manager, Sponsor, Assessor, Panel or Baseline)' });
    }
    if (table === 'Projects') {
      if (!nonEmpty(rec.ProjectSponsor)) part.warnings.push({ row: rowNo, msg: 'Project without sponsor' });
      if (!nonEmpty(rec.YLPAdviser)) part.warnings.push({ row: rowNo, msg: 'Project without YLP adviser' });
      if (!nonEmpty(rec.Status)) rec.Status = 'Planned';
    }
    if (table === 'DevelopmentActions' && !nonEmpty(rec.TargetDate)) part.warnings.push({ row: rowNo, msg: 'Development action without target date' });
    if (table === 'JourneyActivities') {
      if (!nonEmpty(rec.JourneyStage)) part.warnings.push({ row: rowNo, msg: 'Missing journey stage' });
      if (nonEmpty(rec.ActivityType) && !YLP.progress.typeKey(rec)) part.warnings.push({ row: rowNo, msg: 'Activity type "' + rec.ActivityType + '" is not mapped to the 70-20-10 model' });
    }
    if (table === 'Mentoring' && !nonEmpty(rec.InteractionType)) rec.InteractionType = 'Mentoring';
    if (table === 'RoleDescriptors' && !nonEmpty(rec.RoleDescriptorID)) rec.RoleDescriptorID = YLP.roles.roleKey(rec);
  }

  function finishPart(table, part) {
    if (table === 'Participants') {
      var seen = {}, names = {};
      part.records = part.records.filter(function (r) {
        if (seen[r.EmployeeID]) { part.rejected.push({ row: r._row, msg: 'Duplicate Employee ID ' + r.EmployeeID + ' (first seen on row ' + seen[r.EmployeeID] + ')' }); return false; }
        seen[r.EmployeeID] = r._row;
        var nk = nameKey(r.EmployeeName);
        if (nk) (names[nk] = names[nk] || []).push(r.EmployeeID);
        return true;
      });
      Object.keys(names).forEach(function (n) { if (names[n].length > 1) part.warnings.push({ row: null, msg: 'Duplicate employee names with different IDs: ' + names[n].join(', ') + ' — name matching will require Employee ID selection' }); });
    }
    if (table === 'KRAs') {
      K.validateGroups(part.records).forEach(function (g) {
        var who = (g.employeeID || g.employeeName || '(no ID)') + ', ' + g.financialYear;
        if (g.status === 'Warning') part.warnings.push({ row: null, msg: 'KRA weights for ' + who + ' total ' + g.total + ' (within the 99–101 rounding range)' });
        if (g.status === 'Error') part.warnings.push({ row: null, msg: 'KRA weights for ' + who + ' total ' + g.total + (g.missingWeights ? ' with ' + g.missingWeights + ' missing weight(s)' : '') + ' — Error: must total 100' });
        if (g.repeatedTitles.length) part.warnings.push({ row: null, msg: K.repeatedTitleMessage + ' (' + who + ': "' + g.repeatedTitles.join('", "') + '")' });
      });
    }
  }

  /* ---------------- Employee matching (spec 46, 61) ---------------- */
  function levenshtein(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length, prev = [], cur, i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function similar(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    var ta = a.split(' ').sort().join(' '), tb = b.split(' ').sort().join(' ');
    return ta === tb || levenshtein(a, b) <= 2;
  }

  function knownPeople(db, res) {
    var byId = {}, list = [];
    (db.Participants || []).forEach(function (p) { if (!p.IsSample) { byId[p.EmployeeID] = p; list.push(p); } });
    res.parts.forEach(function (pt) { if (pt.table === 'Participants') pt.records.forEach(function (p) { if (!byId[p.EmployeeID]) { byId[p.EmployeeID] = p; list.push(p); } }); });
    return { byId: byId, list: list };
  }

  function matchEmployees(res, db) {
    var people = knownPeople(db, res), meta = db.meta || {};
    var projIds = {};
    (db.Projects || []).forEach(function (p) { projIds[U.text(p.ProjectID)] = true; });
    res.parts.forEach(function (pt) { if (pt.table === 'Projects') pt.records.forEach(function (p) { projIds[p.ProjectID] = true; }); });
    var groups = {};
    res.parts.forEach(function (pt) {
      var t = SC.TABLES[pt.table];
      if (!t.employeeLinked) return;
      pt.records.forEach(function (rec) {
        var id = U.text(rec.EmployeeID), key = null, g;
        if (id && meta.idMappings && meta.idMappings[id]) { rec._sourceID = id; rec.EmployeeID = id = meta.idMappings[id]; rec._remembered = true; }
        if (pt.table === 'ProjectParticipants' && !projIds[U.text(rec.ProjectID)]) {
          key = 'proj:' + rec.ProjectID + '|' + id;
          g = groups[key] = groups[key] || { key: key, kind: 'project', label: 'Project ' + rec.ProjectID + ' / employee ' + id, reason: 'Invalid employee-project mapping: project ' + rec.ProjectID + ' does not exist', records: [], candidates: [] };
        } else if (id) {
          if (people.byId[id]) return;
          key = 'id:' + id;
          g = groups[key] = groups[key] || { key: key, kind: 'id', label: (U.text(rec.EmployeeName) ? rec.EmployeeName + ' ' : '') + '(' + id + ')', reason: 'Employee ID not in the participant master', records: [], candidates: [] };
        } else {
          var nk = nameKey(rec.EmployeeName);
          if (meta.nameMappings && meta.nameMappings[nk] && people.byId[meta.nameMappings[nk]]) { rec.EmployeeID = meta.nameMappings[nk]; rec._remembered = true; return; }
          key = 'name:' + nk;
          g = groups[key];
          if (!g) {
            var exact = people.list.filter(function (p) { return nameKey(p.EmployeeName) === nk; });
            var near = people.list.filter(function (p) { return nameKey(p.EmployeeName) !== nk && similar(nameKey(p.EmployeeName), nk); });
            g = groups[key] = {
              key: key, kind: 'name', label: U.text(rec.EmployeeName) + ' (no Employee ID)', records: [], nameKey: nk,
              candidates: exact.concat(near),
              proposedID: exact.length === 1 && near.length === 0 ? exact[0].EmployeeID : null,
              reason: exact.length === 1 && near.length === 0 ? 'No Employee ID: one participant has this exact name — confirm the match' : exact.length + near.length > 0 ? 'No Employee ID: several participants have the same or a similar name — select the Employee ID' : 'No Employee ID and no participant with this name'
            };
          }
        }
        rec._unmatched = key;
        g.records.push({ table: pt.table, rec: rec });
      });
    });
    res.unmatched = Object.keys(groups).map(function (k) { var g = groups[k]; g.count = g.records.length; g.tables = U.uniq(g.records.map(function (x) { return x.table; })); return g; });
  }

  /* ---------------- Individual goal sheet (spec 47) ---------------- */
  var GOAL_DASH = {
    KRASequence: ['KRA No', 'KRA No.', 'KRA Number', 'S No', 'Sr No', 'Sl No', '#'], KRAName: ['KRA Name', 'KRA', 'Key Result Area'],
    Weightage: ['Weightage', 'Weight', 'Weightage %', 'Weight %'], SMARTGoal: ['SMART Goal Statement', 'SMART Goal', 'Goal Statement'],
    KeyParameters: ['Key Parameters', 'Parameters', 'Key Parameter'], KRAType: ['KRA Type', 'Type']
  };
  var META_LABELS = [
    { re: /^(employee\s*name|name\s*of\s*(the\s*)?employee|name)$/i, field: 'EmployeeName' },
    { re: /^(employee\s*id|emp\.?\s*id|employee\s*code)$/i, field: 'EmployeeID' },
    { re: /^designation$/i, field: 'Designation' },
    { re: /^(financial\s*year|fy|performance\s*year)$/i, field: 'FinancialYear' }
  ];
  function headerIn(row, fields) {
    var normed = (row || []).map(norm), n = 0;
    Object.keys(fields).forEach(function (f) { if (fields[f].some(function (a) { return normed.indexOf(norm(a)) !== -1; })) n++; });
    return n;
  }
  function extractMeta(aoa, upto) {
    var meta = {};
    for (var r = 0; r < Math.min(upto, aoa.length); r++) {
      var row = aoa[r] || [];
      for (var c = 0; c < row.length; c++) {
        if (typeof row[c] !== 'string') continue;
        var cell = row[c].trim(), label = cell, inline = '', colon = cell.indexOf(':');
        if (colon !== -1) { label = cell.slice(0, colon).trim(); inline = cell.slice(colon + 1).trim(); }
        META_LABELS.forEach(function (ml) {
          if (!ml.re.test(label) || meta[ml.field]) return;
          var val = inline;
          if (!val) { for (var n = c + 1; n < row.length; n++) if (nonEmpty(row[n])) { val = row[n]; break; } }
          if (nonEmpty(val)) meta[ml.field] = S.text(val);
        });
      }
    }
    return meta;
  }

  function parseGoalSheet(res, source, opts) {
    var names = source.sheetNames;
    var dash = names.filter(function (n) { return /kra\s*dashboard/i.test(n); })[0];
    var scale = names.filter(function (n) { return /metric\s*scale/i.test(n); })[0];
    if (!dash) { res.errors.push({ msg: 'Sheet "KRA Dashboard" was not found in this workbook' }); return; }
    var aoa = source.sheets[dash];
    var hIdx = -1, bestN = 2;
    for (var r = 0; r < Math.min(40, aoa.length); r++) { var n = headerIn(aoa[r], GOAL_DASH); if (n > bestN) { bestN = n; hIdx = r; } }
    if (hIdx < 0) { res.errors.push({ msg: 'KRA table header not found on "' + dash + '"' }); return; }
    var meta = extractMeta(aoa, hIdx);
    var fy = meta.FinancialYear ? normFY(meta.FinancialYear) : '';
    if (!fy) res.errors.push({ msg: 'Missing KRA financial year on the goal sheet' });
    res.goalMeta = meta;
    var header = aoa[hIdx].map(norm), map = {};
    Object.keys(GOAL_DASH).forEach(function (f) { for (var i = 0; i < GOAL_DASH[f].length; i++) { var ix = header.indexOf(norm(GOAL_DASH[f][i])); if (ix !== -1) { map[f] = ix; break; } } });
    var kpart = newPart('KRAs', dash); kpart.headerRow = hIdx + 1;
    var notes = {}, today = D.todayIso();
    for (var i = hIdx + 1; i < aoa.length; i++) {
      var row = aoa[i] || [];
      if (!row.some(nonEmpty)) { if (kpart.records.length) break; continue; }
      var first = row.filter(nonEmpty)[0];
      if (typeof first === 'string' && /^\s*total/i.test(first)) break;
      if (!nonEmpty(row[map.KRAName])) continue;
      var w = K.normalizeWeight(row[map.Weightage]);
      notes[w.note] = (notes[w.note] || 0) + 1;
      if (w.note === 'not-a-number' || w.note === 'negative') { kpart.rejected.push({ row: i + 1, msg: 'Weightage "' + S.text(row[map.Weightage]) + '" is not a valid number' }); continue; }
      kpart.records.push({
        EmployeeID: meta.EmployeeID || '', EmployeeName: meta.EmployeeName || '', Designation: meta.Designation || '',
        FinancialYear: fy, KRADataType: dataTypeForFY(fy), KRASequence: nonEmpty(row[map.KRASequence]) ? S.text(row[map.KRASequence]) : null,
        KRAName: S.text(row[map.KRAName]), KRADescription: S.text(row[map.SMARTGoal]), SMARTGoal: S.text(row[map.SMARTGoal]),
        KeyParameters: S.text(row[map.KeyParameters]), KRAType: S.text(row[map.KRAType]),
        Weightage: w.value, WeightageSource: S.text(row[map.Weightage]),
        Target: null, Achievement: null, CurrentProgress: null, Rating: null, ManagerObservation: null,
        IsSample: false, LastUpdated: today, SourceFile: res.fileName, SourceSheet: dash, _row: i + 1
      });
    }
    if (notes.decimal) kpart.notes.push(notes.decimal + ' decimal KRA weights normalised (for example 0.2 → 20)');
    if (notes['percent-text']) kpart.notes.push(notes['percent-text'] + ' percentage-text weights converted');
    finishPart('KRAs', kpart);
    res.parts.push(kpart);

    if (scale) {
      var sp = parseTable(source.sheets[scale], 'KRARatingScales', opts.ctx, scale, null, { FinancialYear: fy });
      sp.records.forEach(function (rec) { rec.EmployeeID = meta.EmployeeID || ''; rec.EmployeeName = meta.EmployeeName || ''; rec.FinancialYear = fy; });
      var kraNames = kpart.records.map(function (k) { return norm(k.KRAName); }), seen = {};
      sp.records.forEach(function (rec) {
        if (kraNames.indexOf(norm(rec.KRAName)) === -1 && !seen[rec.KRAName]) { seen[rec.KRAName] = true; sp.warnings.push({ row: null, msg: 'Metric scale without matching KRA: "' + rec.KRAName + '"' }); }
      });
      sp.notes.push(M.copy.thresholds);
      res.parts.push(sp);
    } else {
      res.warnings.push({ row: null, msg: 'Sheet "Submitted Metric Scales" not found; only KRAs were read' });
    }

    // Spec 47 matching: Employee ID, else exact unique name with confirmation.
    var people = knownPeople(opts.db, res), match = { status: 'unmatched', candidates: [] };
    var nk = nameKey(meta.EmployeeName);
    if (meta.EmployeeID && people.byId[meta.EmployeeID]) match = { status: 'id', employeeID: meta.EmployeeID, candidates: [people.byId[meta.EmployeeID]] };
    else if (nk) {
      var stored = opts.db.meta && opts.db.meta.nameMappings && opts.db.meta.nameMappings[nk];
      var exact = people.list.filter(function (p) { return nameKey(p.EmployeeName) === nk; });
      var near = people.list.filter(function (p) { return nameKey(p.EmployeeName) !== nk && similar(nameKey(p.EmployeeName), nk); });
      if (stored && people.byId[stored]) match = { status: 'remembered', employeeID: stored, candidates: [people.byId[stored]] };
      else if (exact.length === 1 && !near.length) match = { status: 'proposed', employeeID: exact[0].EmployeeID, candidates: exact };
      else if (exact.length + near.length > 0) match = { status: 'multiple', candidates: exact.concat(near) };
    }
    match.nameKey = nk;
    res.goalMatch = match;
    if (match.status === 'proposed') res.errors.push({ msg: 'Goal sheet has no Employee ID. Confirm the proposed match to ' + match.candidates[0].EmployeeName + ' (' + match.employeeID + ').', code: 'confirm-match' });
    if (match.status === 'multiple') res.errors.push({ msg: 'Several participants have the same or a similar name to "' + meta.EmployeeName + '". Select the Employee ID.', code: 'confirm-match' });
    if (match.status === 'unmatched') res.errors.push({ msg: 'Individual goal sheet without participant match. Import the Participant Master first or map it manually.', code: 'confirm-match' });
  }

  /* ---------------- Leadership competency workbook (spec 50) ---------------- */
  function parseFramework(res, source, opts) {
    var candidates = [];
    source.sheetNames.forEach(function (sn) {
      var aoa = source.sheets[sn];
      if (findHeaderRow(aoa, 'CompetencyFramework', 20) >= 0 && matchCount(aoa[findHeaderRow(aoa, 'CompetencyFramework', 20)], 'CompetencyFramework') >= 4) {
        var part = parseTable(aoa, 'CompetencyFramework', opts.ctx, sn, null, null);
        var len = U.mean(part.records.map(function (r) { return (r.Level3Definition || '').length + (r.Definition || '').length; })) || 0;
        candidates.push({ sheet: sn, part: part, len: len });
      }
    });
    if (!candidates.length) { res.errors.push({ msg: 'No sheet with the competency headers (Competency, Behavioral Anchors, Level 1: Basic … Level 5: Expert) was found' }); return; }
    candidates.sort(function (a, b) { return b.len - a.len; });
    var master = candidates[0].part;
    master.notes.push('Controlling framework: sheet "' + candidates[0].sheet + '" (most detailed definitions)');
    candidates.slice(1).forEach(function (c) {
      var added = 0;
      c.part.records.forEach(function (r) {
        var m = master.records.filter(function (x) { return U.normKey(x.BehaviouralAnchor) === U.normKey(r.BehaviouralAnchor); })[0];
        if (m) { m.Summary = r.Level3Definition || r.Definition; added++; }
      });
      master.notes.push('Concise sheet "' + c.sheet + '" used for dashboard summaries (' + added + ' anchors); anchors not duplicated');
    });
    master.records.forEach(function (r) {
      var dom = YLP.framework.domainByName(r.CompetencyDomain);
      if (dom) r.CompetencyDomain = dom.name;
      else master.warnings.push({ row: r._row, msg: 'Domain "' + r.CompetencyDomain + '" is not one of the five framework domains' });
      var std = YLP.framework.anchorByName(r.BehaviouralAnchor);
      if (std) r.BehaviouralAnchor = std.anchor;
      else master.warnings.push({ row: r._row, msg: 'Anchor "' + r.BehaviouralAnchor + '" is not in the standard framework; kept as given' });
      r.FrameworkVersion = r.FrameworkVersion || ('Imported ' + D.todayIso());
    });
    var seen = {};
    master.records = master.records.filter(function (r) { var k = U.normKey(r.CompetencyDomain) + '|' + U.normKey(r.BehaviouralAnchor); if (seen[k]) return false; seen[k] = true; return true; });
    master.notes.push('Framework definitions are stored separately from employee assessments. Target level remains 3.');
    res.parts.push(master);
  }

  /* ---------------- JSON ---------------- */
  function isDatabaseExport(data) { return data && !Array.isArray(data) && data.meta && Array.isArray(data.Participants); }

  function jsonToRows(data) {
    var arr = Array.isArray(data) ? data : (data && Array.isArray(data.records) ? data.records : null);
    if (!arr) return null;
    var cols = [];
    arr.forEach(function (o) { if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { if (cols.indexOf(k) === -1) cols.push(k); }); });
    return [cols].concat(arr.map(function (o) { return cols.map(function (c) { return o ? o[c] : null; }); }));
  }

  /* ---------------- Guessing ---------------- */
  function bestTable(aoa) {
    var best = null, bestN = 2;
    SC.ORDER.forEach(function (t) {
      var r = findHeaderRow(aoa, t, 30);
      if (r < 0) return;
      var n = matchCount(aoa[r], t) / Math.sqrt(SC.TABLES[t].fields.length) * 3;
      if (matchCount(aoa[r], t) >= 2 && n > bestN) { best = t; bestN = n; }
    });
    return best;
  }
  var TABLE_TO_DATASET = { Participants: 'participantMaster', KRARatingScales: 'kraRatingScales', RoleDescriptors: 'roleDescriptors', CompetencyFramework: 'competencyWorkbook', Competencies: 'competencyAssessments', Projects: 'projects', ProjectParticipants: 'projectParticipants', DevelopmentActions: 'developmentActions', Learning: 'learning', Mentoring: 'mentoring', StakeholderFeedback: 'stakeholderFeedback', JourneyActivities: 'journeyActivities', KRAs: 'currentFyKra' };

  function guessDataset(source) {
    var f = source.fileName || '';
    if (source.kind === 'json') return 'genericJson';
    var sheets = source.sheetNames || [];
    if (/goal\s*_?sheet/i.test(f) || sheets.some(function (s) { return /kra\s*dashboard/i.test(s); })) return 'goalSheet';
    if (/KRA_Collated_FY25_26/i.test(f) || /FY\s*_?25[-_ ]?26/i.test(f)) return 'previousFyKra';
    if (/FY\s*_?26[-_ ]?27|FY2026-27/i.test(f) && /kra/i.test(f)) return 'currentFyKra';
    if (source.kind === 'xlsx' && sheets.filter(function (s) { return SC.tableForSheet(s); }).length >= 3) return 'completeWorkbook';
    var first = source.sheets[sheets[0]] || [];
    var t = bestTable(first);
    if (t === 'CompetencyFramework') return 'competencyWorkbook';
    if (t === 'RoleDescriptors') return 'roleDescriptors';
    if (/participant.?master|master/i.test(f)) return 'participantMaster';
    if (/rating.?scale|metric.?scale/i.test(f)) return 'kraRatingScales';
    if (t && TABLE_TO_DATASET[t]) return TABLE_TO_DATASET[t];
    if (/participant/i.test(f)) return 'participantMaster';
    return 'genericCsv';
  }

  /* ---------------- Entry point ---------------- */
  /* opts: { dataset, sheetName, dateFormat, db, mapping: {partKey: {field: index}},
             sheetTables: {sheet: table|'ignore'}, targetTable } */
  function parse(source, opts) {
    opts = opts || {};
    var db = opts.db || { meta: {} };
    var key = opts.dataset || guessDataset(source);
    var def = DATASETS[key] || DATASETS.genericCsv;
    var res = {
      dataset: key, label: def.label, fileName: source.fileName, kind: source.kind, sheetNames: source.sheetNames || [],
      parts: [], errors: [], warnings: [], notes: [], ambiguous: [], needsDateChoice: false, unmatched: [],
      unrecognizedSheets: [], goalMatch: null, restore: null, targetTable: null
    };
    var ctx = { fileName: source.fileName, date1904: source.date1904, dateFormat: opts.dateFormat || null, ambiguous: res.ambiguous, fw: YLP.competency.buildFramework(db.CompetencyFramework) };
    opts.ctx = ctx;
    var mapFor = function (k) { return opts.mapping && opts.mapping[k] ? opts.mapping[k] : null; };

    if (source.csvError) res.errors.push({ msg: source.csvError });

    if (source.kind === 'json') {
      if (isDatabaseExport(source.data)) {
        res.dataset = 'databaseRestore'; res.label = 'Full database restore (exported from this application)';
        res.restore = source.data;
        res.notes.push('This file restores a complete database exported from the YLP Gurukul: ' + source.data.Participants.length + ' participants. It replaces all current data after a snapshot is taken.');
        return res;
      }
      var rows = jsonToRows(source.data);
      if (!rows) { res.errors.push({ msg: 'JSON must be an array of records, or a database exported from this application' }); return res; }
      source = { kind: 'csv', fileName: source.fileName, sheetNames: ['JSON'], sheets: { JSON: rows } };
      if (def.generic) def = { generic: true, label: 'Generic JSON' };
    }

    if (def.excelOnly && source.kind !== 'xlsx') { res.errors.push({ msg: def.label + ' needs the Excel workbook (it has several sheets). Choose a CSV dataset type for single-sheet CSV files.' }); return res; }

    if (def.special === 'goal') parseGoalSheet(res, source, opts);
    else if (def.special === 'framework') parseFramework(res, source, opts);
    else if (def.multi) {
      source.sheetNames.forEach(function (sn) {
        var aoa = source.sheets[sn] || [];
        var choice = opts.sheetTables && opts.sheetTables[sn];
        var table = choice || SC.tableForSheet(sn);
        if (table === 'ignore') { res.notes.push('Sheet "' + sn + '" ignored as chosen'); return; }
        var hasData = aoa.filter(function (r) { return (r || []).some(nonEmpty); }).length > 1;
        if (!table) {
          if (hasData) res.unrecognizedSheets.push({ name: sn, rows: aoa.length, suggested: bestTable(aoa) });
          return;
        }
        if (table === 'CompetencyFramework') {
          var one = {};
          one[sn] = aoa;
          parseFramework(res, { kind: 'xlsx', sheetNames: [sn], sheets: one }, opts);
          return;
        }
        res.parts.push(parseTable(aoa, table, ctx, sn, mapFor(sn), null));
      });
      res.unrecognizedSheets.forEach(function (u) { res.errors.push({ msg: 'Sheet "' + u.name + '" is not recognised. Choose which table it holds, or ignore it.', code: 'sheet-choice' }); });
      if (!res.parts.length && !res.unrecognizedSheets.length) res.errors.push({ msg: 'No recognised sheets found. Sheet names should match the table names (Participants, KRAs, Competencies, Projects …).' });
    } else {
      var table = def.generic ? (opts.targetTable || bestTable(source.sheets[source.sheetNames[0]] || [])) : def.table;
      res.targetTable = table;
      if (!table) { res.errors.push({ msg: 'Choose the table these records belong to.', code: 'target-table' }); return res; }
      var sheet = opts.sheetName && source.sheets[opts.sheetName] ? opts.sheetName : pickSheet(source, def);
      var p = parseTable(source.sheets[sheet] || [], table, ctx, source.kind === 'xlsx' ? sheet : source.sheetNames[0], mapFor(source.kind === 'xlsx' ? sheet : source.sheetNames[0]), def.defaults || null);
      res.parts.push(p);
      res.sheetName = source.kind === 'xlsx' ? sheet : null;
      if (table === 'KRARatingScales' && !p.map.hasOwnProperty('FinancialYear')) {
        p.records.forEach(function (r) { if (!nonEmpty(r.FinancialYear)) r.FinancialYear = M.currentFY; });
        p.warnings.push({ row: null, msg: 'No financial-year column: ' + M.currentFY + ' assumed' });
      }
      if (table === 'KRARatingScales') p.notes.push(M.copy.thresholds);
    }

    // Blocking errors from parts are lifted to the file level.
    res.parts.forEach(function (pt) { pt.errors.forEach(function (e) { res.errors.push(e); }); });

    if (res.ambiguous.length && !opts.dateFormat) {
      res.needsDateChoice = true;
      res.errors.push({ msg: res.ambiguous.length + ' date(s) could be read as DD/MM/YYYY or MM/DD/YYYY (for example ' + res.ambiguous.slice(0, 3).map(function (a) { return a.value; }).join(', ') + '). Choose the date format before importing.', code: 'date-format' });
    }
    if (res.dataset !== 'goalSheet') matchEmployees(res, db);
    return res;
  }

  function pickSheet(source, def) {
    var names = source.sheetNames || [];
    var hints = (def && def.sheetHints) || [];
    for (var i = 0; i < hints.length; i++) for (var j = 0; j < names.length; j++) if (norm(names[j]) === norm(hints[i])) return names[j];
    if (def && def.table) {
      var best = names[0], bestN = -1;
      names.forEach(function (n) { var r = findHeaderRow(source.sheets[n] || [], def.table, 30); var c = r >= 0 ? matchCount(source.sheets[n][r], def.table) : 0; if (c > bestN) { bestN = c; best = n; } });
      return best;
    }
    return names[0];
  }

  /* ---------------- Merge planning (spec 58) ---------------- */
  var META_FIELDS = ['LastUpdated', 'SourceFile', 'SourceSheet', 'IsSample'];
  function keyed(list, table) {
    var counts = {}, keyFn = SC.TABLES[table].key;
    return list.map(function (r) {
      var k = keyFn(r);
      counts[k] = (counts[k] || 0) + 1;
      // Repeated titles with equal weight would share a key; the occurrence
      // counter keeps both records instead of collapsing them (D-62).
      return { key: k + '#' + counts[k], rec: r };
    });
  }

  function planMerge(existing, incoming, table, mode, overwrite, scope) {
    var counts = { inserted: 0, updated: 0, unchanged: 0, rejected: 0, conflicting: 0 };
    existing = existing || [];
    if (mode === 'replace') {
      var kept = scope ? existing.filter(function (r) { return !scope(r); }) : [];
      counts.inserted = incoming.length;
      return { result: kept.concat(incoming), counts: counts, removed: existing.length - kept.length };
    }
    var index = {}, result = existing.slice();
    keyed(result, table).forEach(function (x, i) { index[x.key] = i; });
    keyed(incoming, table).forEach(function (x) {
      var at = index[x.key];
      if (at === undefined) {
        counts.inserted++;
        if (mode !== 'preview') { index[x.key] = result.length; result.push(x.rec); }
        return;
      }
      if (mode === 'append') { counts.rejected++; return; }
      var cur = result[at], diffs = [], conflicts = [];
      Object.keys(x.rec).forEach(function (f) {
        if (META_FIELDS.indexOf(f) !== -1) return;
        var a = cur[f], b = x.rec[f];
        if (String(a === null || a === undefined ? '' : a) === String(b === null || b === undefined ? '' : b)) return;
        diffs.push(f);
        if (nonEmpty(a) && nonEmpty(b)) conflicts.push(f);
      });
      if (!diffs.length) { counts.unchanged++; return; }
      if (conflicts.length && !overwrite) {
        counts.conflicting++;
        if (mode !== 'preview') {
          var filled = Object.assign({}, cur);
          diffs.forEach(function (f) { if (!nonEmpty(cur[f])) filled[f] = x.rec[f]; });
          result[at] = filled;
        }
        return;
      }
      counts.updated++;
      if (mode !== 'preview') result[at] = Object.assign({}, cur, x.rec);
    });
    return { result: mode === 'preview' ? existing : result, counts: counts, removed: 0 };
  }

  function stripInternal(list) {
    return list.map(function (r) {
      var o = {};
      Object.keys(r).forEach(function (k) { if (k.charAt(0) !== '_') o[k] = r[k]; });
      return o;
    });
  }

  YLP.importers = {
    DATASETS: DATASETS, DATASET_ORDER: DATASET_ORDER, readFile: readFile, parse: parse, guessDataset: guessDataset,
    planMerge: planMerge, stripInternal: stripInternal, norm: norm, templateFor: templateFor, fieldsOf: fieldsOf,
    isDatabaseExport: isDatabaseExport, nameKey: nameKey
  };
})(window.YLP);
