/* ==========================================================================
   Page shell: navigation, data-environment indicator (spec 15), confirm
   dialogs, live announcements and print modes (spec 70).
   ========================================================================== */
(function (YLP) {
  'use strict';

  var h = YLP.dom.h, byId = YLP.dom.byId, clear = YLP.dom.clear, qsa = YLP.dom.qsa, D = YLP.dates, fmt = YLP.dom.fmt;
  var ENV_LABEL = { SAMPLE: 'SAMPLE DATA', ACTUAL: 'ACTUAL IMPORTED DATA', MIXED: 'MIXED SAMPLE AND IMPORTED DATA' };
  var live = null;

  function announce(text) {
    if (!live) { live = h('div', { 'class': 'visually-hidden', 'aria-live': 'polite', role: 'status' }); document.body.appendChild(live); }
    live.textContent = '';
    setTimeout(function () { live.textContent = text; }, 30);
  }

  /* ---------------- Navigation ---------------- */
  function initNav() {
    var nav = byId('nav'), toggle = byId('nav-toggle'), links = qsa('#nav-links a');
    toggle.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); });
    });
    var sections = qsa('main > section');
    function setActive(id) {
      links.forEach(function (a) {
        var on = (a.getAttribute('data-sections') || '').split(' ').indexOf(id) !== -1;
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
    if ('IntersectionObserver' in window) {
      var visible = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
        var best = null, bestTop = Infinity;
        sections.forEach(function (sec) {
          if (!visible[sec.id]) return;
          var top = Math.abs(sec.getBoundingClientRect().top - 80);
          if (top < bestTop) { bestTop = top; best = sec.id; }
        });
        if (best) setActive(best);
      }, { rootMargin: '-70px 0px -45% 0px', threshold: [0, 0.1, 0.4] });
      sections.forEach(function (sec) { io.observe(sec); });
    }
    setActive('home');
  }

  /* ---------------- Environment indicator ---------------- */
  function renderEnv(d, store) {
    var env = d.env, meta = store.db.meta;
    var badge = byId('env-badge');
    badge.setAttribute('data-env', env);
    clear(badge).appendChild(document.createTextNode(ENV_LABEL[env]));
    var strip = clear(byId('env-strip'));
    var items = [
      ['Environment', ENV_LABEL[env]],
      ['Data as of', D.display(meta.dataAsOf) || 'Not recorded'],
      ['Last upload', meta.lastUpload ? D.displayTime(meta.lastUpload) : 'No upload yet'],
      ['Source file', meta.sourceFile || 'Not recorded'],
      ['Data completeness', d.kpis.completeness === null ? 'Not available' : d.kpis.completeness + '% (average)']
    ];
    var dl = h('dl', null, items.map(function (it) { return h('div', null, [h('dt', { text: it[0] + ':' }), h('dd', { text: it[1] })]); }));
    var note = null;
    if (env === 'SAMPLE') note = 'Every record shown is fictional sample data (IsSample = true). Import organisation-approved data in Upload Data to replace it.';
    if (env === 'MIXED') note = d.scoped ? 'Sample records are retained for testing. They are marked SAMPLE and excluded from HOD metrics.' : 'Sample records are retained and currently included in metrics. Turn this off in Upload Data before presenting.';
    strip.appendChild(h('div', { 'class': 'env-strip-inner' }, [dl, note ? h('p', { 'class': 'env-note', text: note }) : null]));
  }

  /* ---------------- Confirm dialog ---------------- */
  function confirmDialog(o) {
    var dlg = byId('confirm-dialog');
    return new Promise(function (resolve) {
      clear(dlg);
      var done = function (v) { if (dlg.open) dlg.close(); resolve(v); };
      dlg.appendChild(h('h2', { id: 'confirm-title', text: o.title }));
      (Array.isArray(o.body) ? o.body : [o.body]).forEach(function (p) { if (p) dlg.appendChild(typeof p === 'string' ? h('p', { text: p }) : p); });
      var row = h('div', { 'class': 'btn-row' });
      o.actions.forEach(function (a) {
        var b = h('button', { type: 'button', 'class': 'btn ' + (a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : ''), text: a.label, 'data-value': a.value });
        b.addEventListener('click', function () { done(a.value); });
        row.appendChild(b);
      });
      dlg.appendChild(row);
      dlg.addEventListener('cancel', function onCancel(e) { e.preventDefault(); dlg.removeEventListener('cancel', onCancel); done(null); });
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else resolve(window.confirm(o.title) ? o.actions[0].value : null);
    });
  }

  /* ---------------- Print ---------------- */
  // Chromium keeps the content of a closed <details> out of the print layout, so
  // every closed one is opened just before printing and closed again afterwards.
  // This also covers Ctrl+P / Cmd+P, which fires the same events.
  var opened = [];
  function expandForPrint() {
    YLP.dom.qsa('details:not([open])').forEach(function (d) { d.open = true; opened.push(d); });
  }
  function restoreAfterPrint() {
    opened.forEach(function (d) { d.open = false; });
    opened = [];
  }
  window.addEventListener('beforeprint', expandForPrint);
  window.addEventListener('afterprint', restoreAfterPrint);

  function printWith(cls) {
    document.body.classList.add(cls);
    var cleanup = function () { document.body.classList.remove(cls); window.removeEventListener('afterprint', cleanup); };
    // The print classes only affect print media, so leaving them set until
    // afterprint fires is harmless on screen.
    window.addEventListener('afterprint', cleanup);
    window.print();
  }
  function printHOD() { printWith('print-hod'); }
  function printProfile(content) {
    var host = clear(byId('profile-print'));
    host.appendChild(content);
    printWith('print-profile');
  }

  YLP.shell = { expandForPrint: expandForPrint, restoreAfterPrint: restoreAfterPrint, initNav: initNav, renderEnv: renderEnv, confirm: confirmDialog, announce: announce, printHOD: printHOD, printProfile: printProfile, ENV_LABEL: ENV_LABEL };
})(window.YLP);
