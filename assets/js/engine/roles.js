/* ==========================================================================
   Role descriptor matching (spec 49). Never assigns a role from job grade.
   Priority: confirmed manual mapping > exact BU + Department + Designation >
   BU + Department + KRA keyword overlap > BU + Department > Unmatched.
   ========================================================================== */
(function (YLP) {
  'use strict';

  var U = YLP.util, M = YLP.model;
  var STOP = ['and', 'the', 'for', 'with', 'from', 'that', 'this', 'into', 'across', 'within', 'their', 'ensure', 'other', 'all', 'per', 'role', 'work', 'team', 'teams'];

  function tokens(str) {
    return U.uniq(String(str || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (t) { return t.length >= 4 && STOP.indexOf(t) === -1; }));
  }
  function roleKey(r) { return [r.BusinessUnit, r.Department, r.UniqueRoleName].map(U.normKey).join('|'); }
  function roleText(r) { return [r.WorkRole, r.RoleDescriptors, r.UniqueRoleName, r.WTWJobRole, r.SpecialSkills].map(U.text).join(' '); }

  function result(status, role, confidence, matching, unmatched, note) {
    return { status: status, role: role, confidence: confidence, matching: matching, unmatched: unmatched, note: note || '' };
  }

  function match(p, roles, currKras, mappings) {
    roles = roles || [];
    var fixed = mappings && mappings[p.EmployeeID];
    if (fixed) {
      var r0 = roles.filter(function (r) { return roleKey(r) === fixed || U.text(r.RoleDescriptorID) === fixed; })[0];
      if (r0) return result('Confirmed', r0, 100, ['Confirmed manual mapping'], [], 'Confirmed by HR');
    }
    if (!roles.length) return result('Unmatched', null, 0, [], ['No role descriptors loaded'], 'Import the Role Descriptor Workbook');
    var sameBU = roles.filter(function (r) { return U.has(p.BusinessUnit) && U.normKey(r.BusinessUnit) === U.normKey(p.BusinessUnit); });
    var sameBD = sameBU.filter(function (r) { return U.has(p.Department) && U.normKey(r.Department) === U.normKey(p.Department); });
    if (!sameBD.length) return result('Unmatched', null, 0, sameBU.length ? ['Business Unit'] : [], sameBU.length ? ['Department'] : ['Business Unit', 'Department']);

    var desig = U.normKey(p.Designation);
    var exact = sameBD.filter(function (r) { return desig && [r.WorkRole, r.WTWTitle, r.WTWJobRole, r.UniqueRoleName].some(function (x) { return U.normKey(x) === desig; }); });
    if (exact.length === 1) return result('High Confidence', exact[0], 90, ['Business Unit', 'Department', 'Designation'], []);
    if (exact.length > 1) return result('Review Required', exact[0], 70, ['Business Unit', 'Department', 'Designation'], [], exact.length + ' roles share this designation');

    var kt = tokens((currKras || []).map(function (k) { return YLP.kracompare.textOf(k); }).join(' '));
    var best = null;
    if (kt.length) {
      sameBD.forEach(function (r) {
        var rt = tokens(roleText(r));
        if (!rt.length) return;
        var common = rt.filter(function (t) { return kt.indexOf(t) !== -1; });
        var overlap = common.length / Math.min(rt.length, kt.length);
        if (!best || overlap > best.overlap) best = { role: r, overlap: overlap, common: common };
      });
    }
    if (best && best.overlap >= M.roleMatch.keywordOverlapMin) {
      return result('Review Required', best.role, Math.min(80, Math.round(50 + best.overlap * 40)), ['Business Unit', 'Department', 'KRA keywords (' + best.common.slice(0, 4).join(', ') + ')'], ['Designation']);
    }
    return result('Review Required', sameBD[0], sameBD.length === 1 ? 40 : 30, ['Business Unit', 'Department'], ['Designation', 'KRA keywords'], sameBD.length + ' role(s) in this department');
  }

  YLP.roles = { match: match, roleKey: roleKey };
})(window.YLP);
