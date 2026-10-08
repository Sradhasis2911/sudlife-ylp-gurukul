/* ==========================================================================
   Governance (spec 73) and HOD Approval Panel (spec 74). The approval status
   is a demonstration stored in this browser's localStorage only.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var h = YLP.dom.h, byId = YLP.dom.byId, clear = YLP.dom.clear, chip = YLP.dom.chip, D = YLP.dates, M = YLP.model;

  var PRINCIPLES = [
    ['Local processing', 'Uploaded files are read inside the browser. The page has no network access, so participant data cannot be transmitted.'],
    ['Data minimisation', 'Only parsed records are stored, never workbook files. Official email addresses are not stored; manager and HRBP emails are hidden by default and never exported to CSV.'],
    ['Sample data identified', 'Fictional records carry IsSample = true, are labelled SAMPLE everywhere and are excluded from HOD metrics when actual data exists.'],
    ['Evidence before levels', 'Behavioural levels count only when validated by a manager, sponsor or authorised assessor. Self-assessment alone never establishes Level 3.'],
    ['Missing is not zero', 'Missing information is labelled and excluded from scores. Data completeness is always shown beside progress.'],
    ['Development, not promotion', 'Progress and readiness are developmental indicators. Promotion, succession, performance and potential decisions are made elsewhere.']
  ];

  function governance() {
    var root = clear(byId('governance-root'));
    root.appendChild(h('div', { 'class': 'roles' }, M.governanceRoles.map(function (r) {
      return h('div', { 'class': 'role' }, [h('h3', { text: r.role }), h('ul', null, r.does.map(function (x) { return h('li', { text: x }); }))]);
    })));
    root.appendChild(h('div', { 'class': 'court' }, [
      h('h3', { text: 'Quarterly reviews' }),
      YLP.charts.dataTable('Quarterly review cycle', ['Review', 'Led by', 'Looks at'], M.quarterlyReviews.map(function (q) { return [q.name, q.owner, q.looks]; }))
    ]));
    root.appendChild(h('div', { 'class': 'court' }, [
      h('h3', { text: 'Data and evidence principles' }),
      h('div', { 'class': 'grid grid-3' }, PRINCIPLES.map(function (p) { return h('div', null, [h('h4', { text: p[0] }), h('p', { 'class': 'small', text: p[1] })]); })),
      h('p', { 'class': 'disclaimer', text: M.copy.disclaimer })
    ]));
  }

  function approval() {
    var root = clear(byId('approval-root'));
    var saved = YLP.storage.getApproval();
    var counts = {};
    M.approvalStatuses.forEach(function (s) { counts[s] = 0; });
    M.approvalItems.forEach(function (it) { counts[saved.items[it] || 'Not Yet Approved']++; });
    var summary = h('p', { id: 'approval-summary', role: 'status', text: M.approvalStatuses.map(function (s) { return s + ': ' + counts[s]; }).join('; ') + '.' });
    var list = h('ol', { 'class': 'approval-list' });
    M.approvalItems.forEach(function (it, i) {
      var cur = saved.items[it] || 'Not Yet Approved';
      var fs = h('fieldset', null, [h('legend', { text: it })]);
      M.approvalStatuses.forEach(function (s, j) {
        var id = 'ap-' + i + '-' + j;
        var input = h('input', { type: 'radio', name: 'ap-' + i, id: id, value: s, checked: cur === s ? true : null });
        input.addEventListener('change', function () {
          var data = YLP.storage.getApproval();
          data.items[it] = s;
          if (!YLP.storage.setApproval(data)) YLP.shell.announce('The approval status could not be saved in this browser.');
          approval();
          var again = byId(id); if (again) again.focus();
        });
        fs.appendChild(h('span', { 'class': 'radio' }, [input, h('label', { 'for': id, text: s })]));
      });
      var kind = cur === 'Approved' ? 'ok' : cur === 'Approved with Modifications' ? 'gold' : cur === 'Review Required' ? 'warn' : 'na';
      list.appendChild(h('li', { 'class': 'approval-item' }, [fs, chip(kind, cur)]));
    });
    var reviewer = h('input', { type: 'text', id: 'ap-reviewer', value: saved.reviewer || '' });
    var date = h('input', { type: 'date', id: 'ap-date', value: saved.date || '' });
    var save = h('button', { type: 'button', 'class': 'btn btn-small', text: 'Save reviewer and date' });
    save.addEventListener('click', function () {
      var data = YLP.storage.getApproval();
      data.reviewer = YLP.sanitize.text(reviewer.value, 120); data.date = D.isIso(date.value) ? date.value : '';
      YLP.storage.setApproval(data); approval(); YLP.shell.announce('Reviewer and date saved.');
    });
    var reset = h('button', { type: 'button', 'class': 'btn btn-small', text: 'Reset approval statuses' });
    reset.addEventListener('click', function () { YLP.storage.setApproval({ items: {}, reviewer: '', date: '' }); approval(); });
    var printBtn = h('button', { type: 'button', 'class': 'btn btn-small btn-primary', text: 'Print HOD Summary' });
    printBtn.addEventListener('click', YLP.shell.printHOD);
    var pdfBtn = h('button', { type: 'button', 'class': 'btn btn-small', text: 'Save HOD Summary as PDF' });
    pdfBtn.addEventListener('click', function () {
      YLP.shell.confirm({ title: 'Save as PDF', body: ['The print dialog opens next. Choose "Save as PDF" (or "Microsoft Print to PDF") as the printer.'], actions: [{ label: 'Open print dialog', value: 'go', kind: 'primary' }, { label: 'Cancel', value: null }] }).then(function (v) { if (v === 'go') YLP.shell.printHOD(); });
    });
    root.appendChild(h('div', { 'class': 'court' }, [
      summary,
      list,
      h('div', { 'class': 'filter-row admin-only' }, [
        h('div', { 'class': 'field' }, [h('label', { 'for': 'ap-reviewer', text: 'Reviewed by' }), reviewer]),
        h('div', { 'class': 'field' }, [h('label', { 'for': 'ap-date', text: 'Review date' }), date]),
        save, reset
      ]),
      saved.reviewer || saved.date ? h('p', { 'class': 'small', text: 'Reviewed by ' + (saved.reviewer || 'not recorded') + (saved.date ? ' on ' + D.display(saved.date) : '') + '.' }) : null,
      h('p', { 'class': 'small muted', text: 'Demonstration only: this status is stored in this browser and is not a record of approval. It is not shared with other viewers.' }),
      h('div', { 'class': 'btn-row' }, [printBtn, pdfBtn])
    ]));
  }

  function render() { governance(); approval(); }

  YLP.views = YLP.views || [];
  YLP.views.push({ name: 'governance', render: render });
  YLP.governance = { approval: approval };
})(window.YLP);
