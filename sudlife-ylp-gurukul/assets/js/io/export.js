/* ==========================================================================
   Exports through Blob downloads (spec 70). Files are created in the
   browser and saved by the browser; nothing is uploaded.
   ========================================================================== */
(function (YLP) {
  'use strict';

  function download(filename, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.hidden = true;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 2000);
  }

  function stamp() { return YLP.dates.todayIso(); }

  function exportDatabase(db) {
    download('ylp-gurukul-database-' + stamp() + '.json', JSON.stringify(db, null, 2), 'application/json');
  }

  // Email fields are never exported to CSV (spec 40, 48).
  var EMAIL_FIELDS = ['Manager', 'HRBP'];

  function participantRows(views) {
    return views.map(function (v) {
      var p = v.p;
      return {
        EmployeeID: p.EmployeeID, EmployeeName: p.EmployeeName, RecordType: p.IsSample ? 'SAMPLE' : 'ACTUAL', Status: p.Status, Cohort: p.Cohort,
        DateOfJoining: p.DateOfJoining, JobLevel: p.JobLevel, Designation: p.Designation, BusinessUnit: p.BusinessUnit, Department: p.Department,
        JourneyStage: v.stage, LeadershipPathway: v.pathway, ProvisionalProgress: v.progress.provisional, ProgressLabel: v.progress.label,
        DataCompleteness: v.progress.completeness, CompetencyScore: v.competency.score, CompetencyStatus: v.competency.status,
        ReadinessCategory: v.readiness.category, ProjectID: v.project ? v.project.id : '', ProjectTitle: v.project ? v.project.title : YLP.model.copy.mandatoryPending,
        ProjectStatus: v.project ? v.project.status : '', MentorStatus: v.mentorStatus, IDPStatus: v.idp.status, SourceFile: p.SourceFile, SourceSheet: p.SourceSheet
      };
    });
  }

  function exportParticipantsCsv(views, suffix) {
    var rows = participantRows(views);
    var cols = rows.length ? Object.keys(rows[0]) : ['EmployeeID'];
    download('ylp-gurukul-participants' + (suffix ? '-' + suffix : '') + '-' + stamp() + '.csv', YLP.csv.stringify(rows, cols), 'text/csv;charset=utf-8');
  }

  function exportDashboard(d, store) {
    var out = {
      exportedAt: YLP.dates.nowStamp(), environment: d.env, dataAsOf: store.db.meta.dataAsOf, metricsScope: d.scoped ? 'Actual records only' : 'All records',
      disclaimer: YLP.model.copy.disclaimer, kpis: d.kpis,
      participants: participantRows(d.metric),
      projects: d.metricProjects.map(function (p) {
        return { ProjectID: p.id, Title: p.title, Theme: p.theme, Status: p.status, Completion: p.completion, Validation: p.validation, Functions: p.functions, Participants: p.size, AtRisk: p.atRisk, RiskReasons: p.riskReasons, EvaluationScore: p.evaluation.score, EvaluationSource: p.evaluation.source };
      }),
      competencyByDomain: d.fw.domains.map(function (dom, i) {
        var scores = d.metric.map(function (v) { return v.competency.domains[i].score; }).filter(function (x) { return x !== null; });
        return { domain: dom.name, participantsWithEvidence: scores.length, averageScore: scores.length ? YLP.util.round(YLP.util.mean(scores), 2) : null };
      }),
      dataQualityIssues: d.issues
    };
    download('ylp-gurukul-dashboard-data-' + stamp() + '.json', JSON.stringify(out, null, 2), 'application/json');
  }

  function exportTemplate(name, headers) {
    download('ylp-template-' + name + '.csv', YLP.csv.stringify([], headers), 'text/csv;charset=utf-8');
  }

  // Complete-workbook template: one sheet per table (needs SheetJS).
  function exportWorkbookTemplate() {
    if (!YLP.libs.state.excel.available) return false;
    var X = window.XLSX, wb = X.utils.book_new();
    YLP.schema.ORDER.forEach(function (t) {
      var headers = YLP.importers.fieldsOf(t).filter(function (f) { return f !== 'SourceSheet'; });
      X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([headers]), t);
    });
    var data = X.write(wb, { bookType: 'xlsx', type: 'array' });
    download('ylp-template-complete-workbook.xlsx', new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    return true;
  }

  YLP.exporter = { download: download, exportDatabase: exportDatabase, exportParticipantsCsv: exportParticipantsCsv, exportDashboard: exportDashboard, exportTemplate: exportTemplate, exportWorkbookTemplate: exportWorkbookTemplate, EMAIL_FIELDS: EMAIL_FIELDS, participantRows: participantRows };
})(window.YLP);
