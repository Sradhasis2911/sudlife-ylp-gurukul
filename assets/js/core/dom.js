/* ==========================================================================
   DOM helpers. Every piece of uploaded text reaches the page through
   textContent or setAttribute — never innerHTML — so markup or script inside
   a spreadsheet cell is displayed as plain text and never executed.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  // Inline event handlers and style attributes are refused outright; the
  // Content-Security-Policy would block them anyway.
  var BLOCKED_ATTR = /^(on.*|style)$/i;

  function setAttrs(el, attrs) {
    if (!attrs) return el;
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (BLOCKED_ATTR.test(k)) throw new Error('Blocked attribute: ' + k);
      if (k === 'text') { el.textContent = String(v); return; }
      el.setAttribute(k, v === true ? '' : String(v));
    });
    return el;
  }

  function append(el, children) {
    if (children === null || children === undefined || children === false) return;
    if (Array.isArray(children)) { children.forEach(function (c) { append(el, c); }); return; }
    if (typeof Node !== 'undefined' && children instanceof Node) { el.appendChild(children); return; }
    el.appendChild(document.createTextNode(String(children)));
  }

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    setAttrs(el, attrs);
    append(el, children);
    return el;
  }

  function s(tag, attrs, children) {
    var el = document.createElementNS(SVG_NS, tag);
    setAttrs(el, attrs);
    append(el, children);
    return el;
  }

  function clear(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  function byId(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------------- Icons: inline SVG, the primary icon system ---------------- */
  var ICONS = {
    ok: 'M7 12.5l3.2 3.2L17 9',
    warn: 'M12 7.5v5.5m0 3v.01',
    error: 'M8.5 8.5l7 7m0-7l-7 7',
    info: 'M12 11v5m0-8v.01',
    na: 'M8 12h8',
    pending: 'M12 7v5l3 2',
    lock: 'M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z',
    upload: 'M12 16V4m0 0l-4 4m4-4l4 4M5 20h14',
    download: 'M12 4v12m0 0l-4-4m4 4l4-4M5 20h14',
    print: 'M7 9V4h10v5M7 17H5v-6h14v6h-2M8 14h8v6H8z',
    trash: 'M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13',
    undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
    close: 'M6 6l12 12M18 6L6 18',
    menu: 'M4 7h16M4 12h16M4 17h16',
    search: 'M11 18a7 7 0 110-14 7 7 0 010 14zm5-2l4 4',
    present: 'M4 5h16v11H4zM12 16v4M8 20h8',
    prev: 'M15 6l-6 6 6 6',
    next: 'M9 6l6 6-6 6',
    user: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0',
    project: 'M4 7h16v12H4zM9 7V5h6v2',
    mentor: 'M8 11a3 3 0 100-6 3 3 0 000 6zm8 0a3 3 0 100-6 3 3 0 000 6zM3 19a5 5 0 0110 0m-2 0a5 5 0 0110 0',
    idp: 'M7 4h10v16H7zM10 9h4m-4 4h4m-4 4h2',
    flag: 'M6 21V4m0 0h11l-2 4 2 4H6',
    gate: 'M5 21V11a7 7 0 0114 0v10M9 21v-8a3 3 0 016 0v8',
    lamp: 'M12 3c2 3 3 4.5 3 6.5a3 3 0 01-6 0C9 7.5 10 6 12 3zM7 15h10l-2 4H9z',
    path: 'M5 20c3-4 11-2 11-7S8 9 9 4',
    guide: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
    churn: 'M12 4v16M6 8c4 2 8 2 12 0M6 16c4-2 8-2 12 0',
    sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zm0-12V2m0 20v-2m8-8h2M2 12h2m13.7-5.7l1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2l-1.4-1.4'
  };
  var CIRCLED = { ok: 1, error: 1, info: 1, na: 1, warn: 1, pending: 1 };

  function icon(name, label) {
    return s('svg', { viewBox: '0 0 24 24', 'aria-hidden': label ? null : 'true', role: label ? 'img' : null, 'aria-label': label || null, focusable: 'false', 'class': 'icon' }, [
      CIRCLED[name] ? s('circle', { cx: 12, cy: 12, r: 9.5, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6 }) : null,
      s('path', { d: ICONS[name] || ICONS.info, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
    ]);
  }

  /* Status chip = icon + text + colour. Colour is never the only signal. */
  var KIND_CLASS = { ok: 'chip-ok', warn: 'chip-warn', error: 'chip-error', info: 'chip-info', na: 'chip-na', gold: 'chip-gold', pending: 'chip-warn' };
  function chip(kind, text, title) {
    return h('span', { 'class': 'chip ' + (KIND_CLASS[kind] || 'chip-na'), title: title || null }, [icon(kind === 'gold' ? 'ok' : (kind || 'na')), h('span', { text: text })]);
  }

  function alertBox(kind, text, extra) {
    var iconName = kind === 'ok' ? 'ok' : kind === 'error' ? 'error' : kind === 'warn' ? 'warn' : 'info';
    return h('div', { 'class': 'alert alert-' + kind, role: kind === 'error' ? 'alert' : 'status' }, [icon(iconName), h('div', null, [h('p', null, text), extra || null])]);
  }

  /* ---------------- Formatting ---------------- */
  var fmt = {
    num: function (v, dp) {
      if (v === null || v === undefined || !isFinite(v)) return '—';
      return Number(v).toLocaleString('en-IN', { maximumFractionDigits: dp === undefined ? 0 : dp, minimumFractionDigits: dp || 0 });
    },
    pct: function (v, dp) { return v === null || v === undefined || !isFinite(v) ? '—' : fmt.num(v, dp || 0) + '%'; },
    dec: function (v) { return v === null || v === undefined || !isFinite(v) ? '—' : Number(v).toFixed(2); },
    initials: function (name) {
      var parts = String(name || '?').replace(/[^A-Za-zÀ-ɏ\s'-]/g, ' ').trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return '?';
      return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    },
    plural: function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  };

  /* ---------------- One shared tooltip (enhances, never gates) ---------------- */
  var tip = null;
  function tooltipEl() {
    if (!tip) {
      tip = h('div', { 'class': 'tooltip', role: 'tooltip', id: 'ylp-tooltip', hidden: true });
      document.body.appendChild(tip);
    }
    return tip;
  }
  function showTip(target, value, label) {
    var t = clear(tooltipEl());
    t.appendChild(h('strong', { text: value }));
    if (label) t.appendChild(h('span', { text: label }));
    t.hidden = false;
    var r = target.getBoundingClientRect();
    var tw = t.offsetWidth, th = t.offsetHeight;
    var x = Math.min(window.innerWidth - tw - 8, Math.max(8, r.left + r.width / 2 - tw / 2));
    var y = r.top - th - 8;
    if (y < 8) y = r.bottom + 8;
    t.style.left = Math.round(x + window.scrollX) + 'px';
    t.style.top = Math.round(y + window.scrollY) + 'px';
  }
  function hideTip() { if (tip) tip.hidden = true; }
  // Attach hover + keyboard-focus tooltip to a mark.
  function tooltip(el, value, label) {
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', label ? label + ': ' + value : value);
    el.addEventListener('pointerenter', function () { showTip(el, value, label); });
    el.addEventListener('pointerleave', hideTip);
    el.addEventListener('focus', function () { showTip(el, value, label); });
    el.addEventListener('blur', hideTip);
    return el;
  }

  /* ---------------- Focus trap for dialogs ---------------- */
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function trapFocus(container, onEscape) {
    function handler(e) {
      if (e.key === 'Escape') { e.preventDefault(); if (onEscape) onEscape(); return; }
      if (e.key !== 'Tab') return;
      var items = qsa(FOCUSABLE, container).filter(function (n) { return n.offsetParent !== null || n === document.activeElement; });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    container.addEventListener('keydown', handler);
    return function release() { container.removeEventListener('keydown', handler); };
  }

  /* ---------------- Text colour on a filled mark ---------------- */
  function luminance(hex) {
    var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function inkOn(hex) {
    var l = luminance(hex);
    var white = 1.05 / (l + 0.05), dark = (l + 0.05) / (luminance('#292723') + 0.05);
    return white >= dark ? '#FFFFFF' : '#292723';
  }

  YLP.dom = {
    h: h, s: s, clear: clear, byId: byId, qs: qs, qsa: qsa, icon: icon, chip: chip, alertBox: alertBox,
    fmt: fmt, tooltip: tooltip, hideTip: hideTip, trapFocus: trapFocus, inkOn: inkOn, luminance: luminance
  };
})(window.YLP);
