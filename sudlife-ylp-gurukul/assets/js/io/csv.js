/* ==========================================================================
   Native CSV reader and writer — the guaranteed upload path that needs no
   library. Handles quoted fields, embedded commas and line breaks, doubled
   quotes, a UTF-8 byte-order mark, and comma / semicolon / tab delimiters.
   ========================================================================== */
(function (YLP) {
  'use strict';

  function detectDelimiter(text) {
    var line = '', inQ = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === '"') inQ = !inQ;
      if (!inQ && (ch === '\n' || ch === '\r')) break;
      line += inQ ? '' : ch;
    }
    var counts = { ',': 0, ';': 0, '\t': 0 };
    for (var j = 0; j < line.length; j++) if (counts.hasOwnProperty(line[j])) counts[line[j]]++;
    var best = ',';
    Object.keys(counts).forEach(function (d) { if (counts[d] > counts[best]) best = d; });
    return best;
  }

  /* Returns { rows: string[][], delimiter, error } */
  function parse(text) {
    if (typeof text !== 'string') return { rows: [], delimiter: ',', error: 'File is not text' };
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var d = detectDelimiter(text);
    var rows = [], row = [], field = '', inQ = false, i = 0, ch;
    while (i < text.length) {
      ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === '"' && field === '') { inQ = true; i++; continue; }
      if (ch === d) { row.push(field); field = ''; i++; continue; }
      if (ch === '\r') { if (text[i + 1] !== '\n') { row.push(field); rows.push(row); row = []; field = ''; } i++; continue; }
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += ch; i++;
    }
    var error = inQ ? 'The file ends inside a quoted value. Check for a missing closing quote.' : null;
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    rows = rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
    return { rows: rows, delimiter: d, error: error };
  }

  function quote(value) {
    if (value === null || value === undefined) return '';
    var str = YLP.sanitize.formulaGuard(typeof value === 'object' ? JSON.stringify(value) : String(value));
    return /[",\n\r]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
  }

  /* records: array of objects; columns: array of keys (also used as headers) */
  function stringify(records, columns) {
    var lines = [columns.map(quote).join(',')];
    records.forEach(function (rec) {
      lines.push(columns.map(function (c) { return quote(rec[c]); }).join(','));
    });
    // BOM so Excel opens the UTF-8 file with the right encoding.
    return '﻿' + lines.join('\r\n') + '\r\n';
  }

  YLP.csv = { parse: parse, stringify: stringify };
})(window.YLP);
