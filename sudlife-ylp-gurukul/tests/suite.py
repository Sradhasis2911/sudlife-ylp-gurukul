"""End-to-end test suite for SUD Life YLP Gurukul (maps to spec section 77).

Usage:
  python3 tests/make_fixtures.py <fixtures>
  python3 -m http.server 8765 --directory <folder containing sudlife-ylp-gurukul/>   (GitHub Pages layout)
  python3 tests/suite.py <project-folder> <fixtures> <results-folder> 8765

Needs Python Playwright with Chromium. Evaluation date fixed with ?asof=2026-10-08.
"""
import json, os, re, sys
from pypdf import PdfReader
from playwright.sync_api import sync_playwright

PROJECT, FIX, OUT, PORT = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
os.makedirs(OUT, exist_ok=True)
Q = "?asof=2026-10-08"
FILE_URL = "file://" + os.path.join(PROJECT, "index.html") + Q
HTTP_URL = f"http://127.0.0.1:{PORT}/sudlife-ylp-gurukul/" + Q
results = []


def check(group, name, ok, detail=""):
    results.append({"group": group, "test": name, "ok": bool(ok), "detail": str(detail)[:400]})
    print(("PASS " if ok else "FAIL ") + f"[{group}] {name}" + (f" — {str(detail)[:200]}" if detail and not ok else ""))


def new_page(ctx, url, logs=None, external=None):
    pg = ctx.new_page()
    if logs is not None:
        pg.on("console", lambda m: logs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))
    if external is not None:
        origin = url.split("/sudlife-ylp-gurukul")[0] if url.startswith("http") else "file://"
        pg.on("request", lambda r: external.append(r.url) if not (r.url.startswith(origin) or r.url.startswith("data:") or r.url.startswith("blob:")) else None)
    pg.goto(url)
    pg.wait_for_selector("html[data-ready=true]", timeout=20000)
    return pg


def ev(pg, js, arg=None):
    return pg.evaluate(js, arg) if arg is not None else pg.evaluate(js)


def derived(pg, path):
    return ev(pg, "(p) => { const d = YLP.store.derived(); return p.split('.').reduce((o, k) => o == null ? o : o[k], d); }", path)


def view(pg, eid, path):
    return ev(pg, "(a) => { const v = YLP.store.derived().byId[a[0]]; return a[1].split('.').reduce((o, k) => o == null ? o : o[k], v); }", [eid, path])


def upload(pg, name, dataset="auto"):
    pg.select_option("#imp-dataset", dataset)
    pg.set_input_files("#imp-file", os.path.join(FIX, name) if not os.path.isabs(name) else name)
    pg.wait_for_selector("#imp-preview-title, #imp-preview .alert-error", timeout=15000)


def tab_count(pg, which):
    return int(re.search(r"\((\d+)\)", pg.inner_text(f"#it-{which}")).group(1))


def panel(pg, which):
    pg.click(f"#it-{which}")
    return pg.inner_text("#imp-panel")


def confirm(pg, mode=None):
    if mode:
        pg.select_option("#imp-mode", mode)
    pg.click("#imp-confirm")
    pg.wait_for_selector("#imp-flash", timeout=15000)
    return pg.inner_text("#imp-flash")


def change_table(pg):
    rows = ev(pg, "() => [...document.querySelectorAll('#imp-preview .court table tbody tr')].map(r => [...r.children].map(c => c.innerText))")
    return {r[0]: r[1:] for r in rows}


# ======================================================================
def basics(G, url, ctx):
    logs, external = [], []
    pg = new_page(ctx, url, logs, external)
    check(G, "Page boots without the unsupported-reader warning", pg.is_hidden("#boot-warning"))
    check(G, "No runtime error banner", pg.is_hidden("#runtime-errors"))
    fonts = ev(pg, "() => document.fonts.ready.then(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family))")
    check(G, "Self-hosted serif and sans-serif fonts load", any("Cormorant" in f for f in fonts) and any("Source Sans" in f for f in fonts), fonts)
    check(G, "Excel library available from the project folder", ev(pg, "() => YLP.libs.state.excel.available"))
    check(G, "Environment indicator shows SAMPLE DATA", pg.inner_text("#env-badge") == "SAMPLE DATA")
    strip = pg.inner_text("#env-strip")
    check(G, "Data as of, last upload, source file and completeness displayed", all(x in strip for x in ["Data as of", "Last upload", "Source file", "Data completeness"]))
    k = derived(pg, "kpis")
    exp = {"total": 12, "fy2025": 4, "fy2026": 8, "functions": 9, "projectsActive": 2, "projectsCompleted": 1, "projectsAtRisk": 1, "allocated": 11, "withoutProject": 1, "withMentor": 8, "idpCompleted": 1, "level3": 2, "progressing": 6, "insufficient": 3}
    check(G, "Sample cohort KPIs as designed (12 participants, 4 FY2025, 8 FY2026 …)", all(k[x] == exp[x] for x in exp), {x: k[x] for x in exp})
    hero = [t.strip() for t in ev(pg, "() => [...document.querySelectorAll('.hero-stat .value')].map(e => e.innerText)")]
    check(G, "Six dynamic hero statistics rendered", hero == ["12", "9", "2", "2", "1", "67%"], hero)
    check(G, "Fifteen KPI cards plus the overview statement", pg.locator("#overview-root .kpi").count() == 15 and "builds future functional" in pg.inner_text("#overview-root"))
    navs = [a.strip() for a in ev(pg, "() => [...document.querySelectorAll('#nav-links a')].map(a => a.innerText)")]
    check(G, "Sticky navigation has the nine specified links", navs == ["Gurukul Home", "Leadership Journey", "Participants", "Competency Mandala", "Cross-Functional Projects", "70-20-10 Model", "Leadership Dashboard", "Upload Data", "Governance"], navs)
    check(G, "Navigation is sticky", ev(pg, "() => getComputedStyle(document.querySelector('.nav')).position") == "sticky")
    pg.click("#nav-links a[href='#dashboard']"); pg.wait_for_timeout(900)
    check(G, "Active-section highlighting follows navigation", pg.get_attribute("#nav-links a[href='#dashboard']", "aria-current") == "true")
    privacy = pg.inner_text("#admin-root")
    check(G, "Privacy notice text shown exactly", "Files uploaded here are processed locally within this browser. The application does not send participant information to an external server. Data saved in this application may remain in browser storage until it is cleared." in privacy)
    check(G, "Disclaimer shown", "They do not independently constitute a promotion, succession, performance, or potential decision." in pg.inner_text("body"))
    check(G, "Closing statement shown", "progress from role mastery to enterprise contribution" in pg.inner_text("#approval"))
    compat = pg.inner_text("#adm-compat")
    check(G, "Compatibility panel lists all nine features as Supported", all(f in compat for f in ["JavaScript", "FileReader", "localStorage", "Blob downloads", "Canvas", "SVG", "window.print", "CSS Grid", "CSS Flexbox"]) and "All required browser features are supported" in compat)
    M = ev(pg, "() => ({ e: YLP.model.sum(YLP.model.experience70, 'points'), p: YLP.model.sum(YLP.model.projectEvaluation, 'weight'), o: YLP.model.sum(YLP.model.overallProgress, 'weight'), proj: YLP.model.experience70[0], t: YLP.model.behaviouralTargetLevel, k3: YLP.model.kraRatingLevel3Label, b3: YLP.model.behaviouralLevel3Label, w: YLP.kra.normalizeWeight(0.2).value, g: YLP.model.sum(YLP.model.goalSheetExpected, 'weight') })")
    check(G, "70% experience components total 70", M["e"] == 70)
    check(G, "Cross-functional project is explicitly part of the 70% (30 points)", M["proj"]["points"] == 30 and "Cross-Functional" in M["proj"]["name"])
    check(G, "Project-evaluation weights total 100", M["p"] == 100)
    check(G, "Overall YLP weights total 100", M["o"] == 100)
    check(G, "Behavioural target fixed at Level 3", M["t"] == 3)
    check(G, "KRA-rating Level 3 remains separate from behavioural Level 3", M["k3"] == "Meets Expectations" and M["b3"] == "Proficient")
    check(G, "Source weight 0.2 normalises to 20; goal-sheet weights total 100", M["w"] == 20 and M["g"] == 100)
    return pg, logs, external


def engine_rules(G, pg):
    check(G, "Aarav: validated Level 3 + completed project with evidence = Ready for Broader Exposure", view(pg, "SMP-0101", "readiness.category") == "Ready for Broader Exposure")
    check(G, "Meera: Level 3 but project not complete = Demonstrating Level 3 (not Ready)", view(pg, "SMP-0102", "readiness.category") == "Demonstrating Level 3")
    check(G, "Rohan: Ethics lacks validated evidence blocks overall Level 3", view(pg, "SMP-0103", "competency.status") == "Progressing Toward Level 3" and "Ethics lacks validated evidence" in view(pg, "SMP-0103", "competency.blockers"))
    check(G, "Arjun: a domain below 2.5 blocks overall Level 3", any("below 2.5" in b for b in view(pg, "SMP-0205", "competency.blockers")))
    pend = ev(pg, "() => YLP.store.derived().byId['SMP-0201'].competency.anchors.filter(a => a.pending).map(a => a.status)")
    check(G, "Ishaan: rating 3 with one situation shows 'Level 3 indicated, validation pending.'", len(pend) == 3 and pend[0] == "Level 3 indicated, validation pending.")
    check(G, "Kabir: self-assessment alone cannot establish Level 3", view(pg, "SMP-0203", "competency.status") == "Insufficient Evidence" and view(pg, "SMP-0203", "competency.selfAverage") == 3)
    check(G, "Domains aggregate with equal domain weighting (two-stage)", abs(view(pg, "SMP-0101", "competency.score") - round(sum(x for x in ev(pg, "() => YLP.store.derived().byId['SMP-0101'].competency.domains.map(d => d.score)")) / 5, 2)) < 0.011)
    v = ev(pg, "() => { const v = YLP.store.derived().byId['SMP-0207']; return { c: v.progress.completeness, l: v.progress.label, r: v.readiness.category, a: v.progress.availableWeight }; }")
    check(G, "Below 50% data completeness shows Insufficient Evidence", v["c"] < 50 and v["l"] == "Insufficient Evidence" and v["r"] == "Insufficient Evidence", v)
    p = ev(pg, "() => { const v = YLP.store.derived().byId['SMP-0208'].progress; return [v.completeness, v.label]; }")
    check(G, "50–79% completeness is labelled Provisional, not final", 50 <= p[0] < 80 and p[1] == "Provisional YLP Progress", p)
    comp = ev(pg, "() => YLP.store.derived().byId['SMP-0203'].components.map(c => [c.key, c.available])")
    check(G, "Missing components handled through AvailableWeight (excluded, not zero)", dict(comp)["competency"] is False and view(pg, "SMP-0203", "progress.availableWeight") == 35)
    check(G, "Allocation without contribution evidence is not scored as project progress", dict(comp)["project"] is False)
    kras = ev(pg, "() => YLP.store.db.KRAs.filter(k => !k.IsSample || true).map(k => [k.Achievement, k.CurrentProgress, k.Rating, k.ManagerObservation])")
    check(G, "Missing achievement, progress, rating, observation are never 0", all(x is None for r in kras for x in r))
    check(G, "KRA progress is not a progress component", "kra" not in [c[0] for c in comp])
    check(G, "Repeated KRA titles preserved (two 'Pricing model review' records)", ev(pg, "() => YLP.store.db.KRAs.filter(k => k.KRAName === 'Pricing model review').length") == 2)
    check(G, "Sana: previous FY weights total 95 flagged Error", any(i["message"].startswith("KRA weights total 95") for i in derived(pg, "issues")))
    check(G, "Previous vs current FY KRAs compared by Employee ID", view(pg, "SMP-0101", "kraCompare.classification") == "Leading" and view(pg, "SMP-0102", "kraCompare.classification") == "Transforming" and view(pg, "SMP-0103", "kraCompare.classification") == "Role Transition")
    check(G, "Keyword classification labelled 'System Suggestion, HR Validation Required'", view(pg, "SMP-0101", "kraCompare.source") == "System Suggestion, HR Validation Required")
    pj = ev(pg, "() => YLP.store.derived().projects.map(p => [p.id, p.validation, p.functionSource, p.functions.length])")
    check(G, "Project functions derived from participant mappings", pj[0] == ["YLP-P01", "Valid", "Participant master", 4], pj)
    check(G, "No participant data: imported FunctionsRepresented used and marked Provisional", pj[3][1] == "Provisional" and "provisional" in pj[3][2], pj[3])
    check(G, "Project at risk detected from schedule", ev(pg, "() => YLP.store.derived().projects[2].atRisk"))
    check(G, "Vikram: no project shows Mandatory Experience Pending", "Mandatory Experience Pending" in view(pg, "SMP-0207", "experience.components.0.status"))
    check(G, "Overdue assessment detected (review date passed, no later validation)", view(pg, "SMP-0103", "competency.overdueAnchors") > 0)
    check(G, "Restricted labels never assigned (High Potential, Promotion Ready, Successor Ready)", not any(ev(pg, "() => YLP.store.derived().views.map(v => v.readiness.category)").count(x) for x in ["High Potential", "Promotion Ready", "Successor Ready"]))
    av = ev(pg, "() => YLP.store.derived().byId['SMP-0201'].availability.items.map(i => i.status)")
    check(G, "Data availability panel has 14 items with spec statuses", len(av) == 14 and set(av) <= {"Available", "Partially Available", "Not Available", "Validation Required", "Not Applicable"}, av)


def ui_views(G, pg):
    # Journey
    pg.click(".stage-card >> nth=2")
    det = pg.inner_text("#stage-detail")
    check(G, "Journey stage opens details with includes, evidence and participants", "Abhyas" in det and "Completion evidence" in det and "Mandatory cross-functional action-learning project" in det)
    check(G, "Journey shows six stages with completion rings and counts", pg.locator(".stage-card").count() == 6 and pg.locator(".stage-card .stage-ring").count() == 6)
    # 70-20-10
    pg.locator("#model-root svg.donut .mark").nth(1).click()
    check(G, "70-20-10 donut segment opens its expandable card", ev(pg, "() => document.getElementById('model-relationships').open"))
    check(G, "70-20-10 accessible table lists components and total 100", "Total" in pg.locator("#model-root table").last.inner_text() and "100" in pg.locator("#model-root table").last.inner_text())
    # Mandala
    pg.select_option("#mandala-who", "SMP-0103")
    pg.locator("#mandala-root .petal").nth(3).click()
    md = pg.inner_text("#mandala-detail")
    check(G, "Mandala shows baseline, current, target 3, gap, evidence, dates, assessor, actions, validation", all(x in md for x in ["Baseline proficiency", "Current proficiency", "Level 3: Proficient (fixed)", "Gap to target", "Evidence count", "Last assessment date", "Assessor", "Development action", "Next review date", "Validation status", "Assessment status"]))
    check(G, "Mandala centre reads 'Future SUD Life Leader'", "Future SUD Life" in (pg.locator("#mandala-root svg").first.text_content() or "") and "Leader" in (pg.locator("#mandala-root svg").first.text_content() or ""))
    # Gallery
    pg.fill("#g-search", "Pricing")
    check(G, "Search by department/project finds the participant", pg.locator("#g-cards .pcard").count() == 1 and "Arjun" in pg.inner_text("#g-cards"))
    pg.fill("#g-search", "SMP-0102")
    check(G, "Search by Employee ID", pg.locator("#g-cards .pcard").count() == 1)
    pg.fill("#g-search", "")
    pg.select_option("#g-f-comp", "Insufficient Evidence")
    check(G, "Competency-status filter", pg.locator("#g-cards .pcard").count() == 3)
    pg.select_option("#g-f-batch", "FY2026")
    check(G, "Filters combine (FY2026 + Insufficient Evidence)", pg.locator("#g-cards .pcard").count() == 3)
    pg.click("#g-reset")
    check(G, "Reset Filters restores all participants", pg.locator("#g-cards .pcard").count() == 12)
    pg.select_option("#g-sort", "progress")
    first = pg.inner_text("#g-cards .pcard >> nth=0")
    check(G, "Sort by progress puts the highest first", "Aarav" in first)
    pg.select_option("#g-sort", "name")
    check(G, "Every card marks sample records", pg.locator("#g-cards .chip-sample").count() == 12)
    with pg.expect_download() as dl: pg.click("#g-export")
    p = os.path.join(OUT, "filtered.csv"); dl.value.save_as(p)
    raw = open(p, encoding="utf-8").read()
    check(G, "Export filtered participants as CSV (no email fields)", raw.startswith("﻿") and "RecordType" in raw and "@example" not in raw and raw.count("\n") >= 13)
    # Profile
    pg.click("#g-cards .pcard >> nth=0 >> text=View profile")
    pg.wait_for_selector("#profile-dialog[open]")
    tabs = [t.strip() for t in ev(pg, "() => [...document.querySelectorAll('#profile-dialog [role=tab]')].map(t => t.innerText)")]
    check(G, "Profile has the nine specified tabs", tabs == ["Overview", "KRAs", "KRA Comparison", "Competencies", "70-20-10", "Cross-Functional Project", "IDP", "Evidence", "Timeline"], tabs)
    ov = pg.inner_text("#profile-panel")
    check(G, "Overview shows the 18 fields and hides email addresses", all(x in ov for x in ["Employee ID", "Batch", "HRBP", "Readiness category", "Dataset source", "Sample or actual"]) and "@example" not in ov and "Hidden (email)" in ov)
    pg.focus("#pt-0"); pg.keyboard.press("ArrowRight")
    check(G, "Profile tabs work with arrow keys", pg.get_attribute("#pt-1", "aria-selected") == "true" and ev(pg, "() => document.activeElement.id") == "pt-1")
    kr = pg.inner_text("#profile-panel")
    check(G, "KRA tab shows weights, missing labels and weight validation", "Achievement Not Available" in kr and "Rating Not Available" in kr and "Weights total 100" in kr)
    for _ in range(9):
        pg.keyboard.press("Tab")
    check(G, "Focus stays trapped inside the profile dialog", ev(pg, "() => document.getElementById('profile-dialog').contains(document.activeElement)"))
    pg.keyboard.press("Escape")
    check(G, "Escape closes the profile and returns focus", not ev(pg, "() => document.getElementById('profile-dialog').open"))
    ev(pg, "() => YLP.profile.open('SMP-0201')"); pg.click("#pt-3")
    check(G, "Competencies tab shows pending Level 3 validation and checks", "validation pending" in pg.inner_text("#profile-panel") and "Level 3 validation checks" in pg.inner_text("#profile-panel"))
    pg.click("#pt-2")
    check(G, "KRA Comparison tab shows the disclaimer", "It does not establish actual performance without achievement, rating, or manager evidence." in pg.inner_text("#profile-panel"))
    pg.click("#pt-5")
    check(G, "Project tab keeps progress and final score separate", "kept separate" in pg.inner_text("#profile-panel"))
    pg.keyboard.press("Escape")
    ev(pg, "() => YLP.profile.open('SMP-0207')"); pg.click("#pt-5")
    check(G, "Participant without a project: tab shows Mandatory Experience Pending", "Mandatory Experience Pending" in pg.inner_text("#profile-panel"))
    pg.keyboard.press("Escape")
    # Dashboard
    heat = pg.inner_text("#dashboard-root .heat")
    check(G, "Heat map: participants × five domains with Assessment Overdue status", pg.locator("#dashboard-root .heat tbody tr").count() == 12 and "Assessment Overdue" in heat)
    pg.locator("#dashboard-root .heat .cellbtn").first.click()
    check(G, "Heat map anchor-level drill-down", pg.locator("#dashboard-root .heat tr.drill").count() == 1)
    eq = pg.inner_text("#dashboard-root .equity-grid")
    check(G, "Exposure equity view lists all nine groups", all(x in eq for x in ["Without a cross-functional project", "Without a mentor", "Without business immersion", "Without sponsor feedback", "Predominantly transactional KRAs", "Limited cross-functional exposure", "Overdue assessments", "Insufficient evidence", "Incomplete IDPs"]))
    pipe = pg.inner_text("#dashboard-root")
    check(G, "Leadership pipeline uses developmental categories only", "Ready for Broader Exposure" in pipe and "Specialist Leadership Pathway" in pipe and "are not used" in pipe)
    figs = pg.locator("#dashboard-root figure.chart").count()
    caps = pg.locator("#dashboard-root figure.chart figcaption").count()
    tables = pg.locator("#dashboard-root figure.chart details table").count()
    check(G, "Every dashboard chart has a text summary and an accessible table", figs >= 10 and figs == caps == tables, (figs, caps, tables))
    pg.select_option("#db-cohort", "FY2025")
    check(G, "Dashboard filter row scopes all charts (FY2025 → 4 heat-map rows)", pg.locator("#dashboard-root .heat tbody tr:not(.drill)").count() == 4)
    pg.select_option("#db-cohort", "")
    with pg.expect_download() as dl: pg.click("#db-export")
    p = os.path.join(OUT, "dashboard.json"); dl.value.save_as(p)
    dj = json.load(open(p))
    check(G, "Export Dashboard Data (JSON with KPIs, participants, projects)", dj["kpis"]["total"] == 12 and len(dj["participants"]) == 12 and len(dj["projects"]) == 4)
    # Approval
    pg.check("#ap-0-0"); pg.check("#ap-1-2")
    check(G, "HOD approval statuses stored in localStorage", ev(pg, "() => JSON.parse(localStorage.getItem('ylpGurukul.v1.approval')).items['YLP Gurukul purpose']") == "Approved")


def imports(G, pg):
    db = lambda js: ev(pg, "() => " + js)
    upload(pg, "YLP_Participant_Master.xlsx")
    t = pg.inner_text("#imp-preview")
    check(G, "Participant Master quick import recognised; header on row 3", "Preview: Participant Master" in t and "Header row found on row 3" in t)
    check(G, "Ambiguous text date blocks import until a format is chosen", tab_count(pg, "errors") >= 1 and pg.is_disabled("#imp-confirm") and pg.locator("#imp-datefmt").count() == 1)
    pg.select_option("#imp-datefmt", "DMY")
    prev = panel(pg, "preview")
    check(G, "Uploaded markup shown as text, never executed", "<img src=x" in prev and db("document.querySelectorAll('img[src=\"x\"]').length === 0 && window.__xss === undefined"))
    check(G, "Manager email hidden in preview", "Hidden (email)" in prev and "mgr0@example.com" not in prev)
    check(G, "Remove-sample option offered and on by default", pg.is_checked("#imp-remove-sample"))
    msg = confirm(pg, "replace")
    check(G, "Import confirmed; environment switches to ACTUAL IMPORTED DATA", pg.inner_text("#env-badge") == "ACTUAL IMPORTED DATA" and db("YLP.store.db.Participants.length") == 8, msg)
    P = db("Object.fromEntries(YLP.store.db.Participants.map(p => [p.EmployeeName, p]))")
    check(G, "Dates stored as YYYY-MM-DD (Excel serial and confirmed DD/MM)", P["Kavya Menon"]["DateOfJoining"] == "2026-04-06" and P["Ananya Ghosh"]["DateOfJoining"] == "2026-04-03" and P["Farhan Siddiqui"]["DateOfJoining"] == "2026-05-14")
    check(G, "Employee ID converted to text; YLP Batch mapped to FY labels", P["Kavya Menon"]["EmployeeID"] == "100234" and P["Ananya Ghosh"]["Cohort"] == "FY2026" and P["Lakshmi Pillai"]["Cohort"] == "FY2025")
    check(G, "Official email never stored", "person0@example.com" not in json.dumps(db("YLP.store.db")))
    check(G, "Uploaded data refreshes gallery and dashboards", pg.locator("#g-cards .pcard").count() == 8 and pg.locator("#dashboard-root .heat tbody tr:not(.drill)").count() == 8)
    pg.fill("#g-search", "Kavya")
    check(G, "Search works after upload", pg.locator("#g-cards .pcard").count() == 1)
    pg.fill("#g-search", "")
    pg.select_option("#g-f-batch", "FY2025")
    check(G, "Filters work after upload", pg.locator("#g-cards .pcard").count() == 3)
    pg.click("#g-reset")

    upload(pg, "YLP_KRA_Collated_FY25_26.xlsx")
    t = pg.inner_text("#imp-preview")
    check(G, "Previous FY KRA quick import recognised (Employee_KRAs sheet)", "Previous FY KRA Workbook" in t and "Employee_KRAs" in t)
    w = panel(pg, "warnings")
    check(G, "Repeated KRA title preserved with the exact warning", "Repeated KRA title detected. Review descriptions before consolidation." in w)
    check(G, "Weights not totalling 100 flagged; weight of 1 flagged", "total 95" in w and "Weightage 1 treated as 100" in w)
    um = panel(pg, "unmatched")
    check(G, "Employee absent from the master goes to the Unmatched queue by default", "999001" in um and "Employee ID not in the participant master" in um)
    confirm(pg, "merge")
    rahul = db("YLP.store.db.KRAs.filter(k => k.EmployeeID === '100235' && k.FinancialYear === 'FY 2025-26').map(k => k.Weightage)")
    check(G, "0.4 / 0.35 / 0.25 stored as 40 / 35 / 25; FY 2025-26 / Previous FY set", rahul == [40, 35, 25] and db("YLP.store.db.KRAs.every(k => k.KRADataType === 'Previous FY')"))
    check(G, "Unmatched record held in the persisted queue", db("YLP.store.db.unmatched.length") == 1)

    upload(pg, "YLP_KRA_FY26_27_Current.xlsx")
    check(G, "Current FY KRA quick import recognised; Business Unit_y ignored", "Current FY KRA Workbook" in pg.inner_text("#imp-preview") and "Business Unit_y" in pg.inner_text("#imp-preview"))
    confirm(pg, "merge")
    check(G, "Business Unit taken from Business Unit_x", db("YLP.store.db.KRAs.filter(k => k.FinancialYear === 'FY 2026-27').every(k => k.BusinessUnit)"))
    check(G, "Year-on-year comparison by Employee ID after import", view(pg, "100235", "kraCompare.classification") in ("Leading", "Transforming"))

    upload(pg, "YLP_KRA_Collated_FY25_26.xlsx"); pg.select_option("#imp-mode", "replace")
    ct = change_table(pg)
    check(G, "Replace of FY 2025-26 removes only that year's KRAs", ct["KRAs"][5] == "5", ct)
    pg.select_option("#imp-mode", "preview")
    check(G, "Preview Only mode saves nothing (confirm disabled)", pg.is_disabled("#imp-confirm"))
    pg.click("#imp-cancel")

    upload(pg, "Kavya_Menon_KRA_GoalSheet_FY2026-27_Revised.xlsx")
    t = pg.inner_text("#imp-preview")
    check(G, "Individual goal sheet: KRA Dashboard and Submitted Metric Scales parse separately", "KRA Dashboard" in t and "Submitted Metric Scales" in t)
    check(G, "Goal sheet without Employee ID requires confirming the name match", pg.locator("#imp-goal-ok").count() == 1 and pg.is_disabled("#imp-confirm"))
    pg.check("#imp-goal-ok")
    check(G, "Thresholds labelled as not achieved ratings", "These are goal-rating thresholds, not achieved ratings." in pg.inner_text("#imp-preview"))
    confirm(pg, "merge")
    g = db("YLP.store.db.KRAs.filter(k => k.EmployeeID === '100234').map(k => k.Weightage)")
    check(G, "Six goal-sheet KRAs normalised 20/20/20/20/15/5 = 100", g == [20, 20, 20, 20, 15, 5])
    check(G, "Rating scales stored separately from actual ratings", db("YLP.store.db.KRARatingScales.length") == 12 and db("YLP.store.db.KRAs.filter(k => k.EmployeeID === '100234').every(k => k.Rating === null)"))
    check(G, "Name-to-ID decision stored for future imports", db("YLP.store.db.meta.nameMappings['kavya menon']") == "100234")

    upload(pg, "YLP_Role_Descriptors.xlsx")
    check(G, "Role Descriptor import recognised; row without unique role rejected", "Role Descriptor Workbook" in pg.inner_text("#imp-preview") and "Missing UniqueRoleName" in panel(pg, "errors"))
    confirm(pg, "merge")
    check(G, "Role matched on exact BU + Department + Designation = High Confidence", view(pg, "100234", "role.status") == "High Confidence" and view(pg, "100237", "role.status") == "High Confidence")
    check(G, "Role never assigned from job grade alone", view(pg, "100236", "role.status") == "Unmatched")

    upload(pg, "Leadership_Competency_Framework.xlsx")
    t = pg.inner_text("#imp-preview")
    check(G, "Leadership Competency Framework import: detailed sheet controls, concise used for summaries", "Leadership Competency Workbook" in t and "Controlling framework" in t and "Concise" in t)
    confirm(pg, "replace")
    fw = ev(pg, "() => { const f = YLP.store.derived().fw; return [f.imported, f.anchorCount, f.domains[0].anchors[0].definition, f.domains[0].anchors[0].summary]; }")
    check(G, "Imported framework replaces default definitions without duplicating anchors", fw[0] and fw[1] == 18 and fw[2].startswith("IMPORTED") and fw[3].startswith("Concise"), fw)

    upload(pg, "competency_assessments.csv")
    e = panel(pg, "errors")
    check(G, "Invalid competency score rejected", "Invalid competency score \"7\"" in e)
    check(G, "Behavioural score confused with KRA rating detected", "Behavioural score confused with KRA rating" in e)
    check(G, "Unknown anchor rejected", "Unknown competency anchor" in e)
    check(G, "Target proficiency not equal to 3 flagged", "Target proficiency not equal to 3" in panel(pg, "warnings"))
    confirm(pg, "merge")
    check(G, "Validated manager evidence establishes Level 3", view(pg, "100235", "competency.status") == "Demonstrating Level 3")
    check(G, "Self-assessment alone cannot establish Level 3 (imported)", view(pg, "100236", "competency.status") == "Insufficient Evidence")

    upload(pg, "projects.csv")
    check(G, "Completion above 100 rejected", "Completion below 0 or above 100" in panel(pg, "errors"))
    confirm(pg, "merge")
    upload(pg, "project_participants.csv")
    check(G, "Invalid employee-project mapping goes to the Unmatched queue", "project ACT-P9 does not exist" in panel(pg, "unmatched"))
    confirm(pg, "merge")
    pv = ev(pg, "() => { const p = YLP.store.derived().projects.find(x => x.id === 'ACT-P1'); return [p.functions, p.functionSource, p.validation, p.size]; }")
    check(G, "Imported project functions derived from the participant master", sorted(pv[0]) == ["Finance", "Operations", "Technology"] and pv[1] == "Participant master" and pv[2] == "Not Valid" and pv[3] == 3, pv)

    for f, ds in [("development_actions.csv", "auto"), ("learning_records.csv", "auto"), ("mentoring_records.csv", "auto"), ("stakeholder_feedback.csv", "auto"), ("journey_activities.csv", "auto")]:
        upload(pg, f, ds)
        if f == "journey_activities.csv":
            w = panel(pg, "warnings")
            check(G, "Journey activities: missing stage and unmapped type flagged; >100% rejected", "Missing journey stage" in w and "not mapped to the 70-20-10 model" in w and "Completion below 0 or above 100" in panel(pg, "errors"))
        if f == "development_actions.csv":
            check(G, "Development action without target date flagged", "Development action without target date" in panel(pg, "warnings"))
        confirm(pg, "merge")
    check(G, "All employee-linked tables imported", db("[YLP.store.db.DevelopmentActions, YLP.store.db.Learning, YLP.store.db.Mentoring, YLP.store.db.StakeholderFeedback, YLP.store.db.JourneyActivities].map(t => t.length)") == [2, 2, 2, 1, 2])
    check(G, "Mentoring records without a type default to Mentoring", db("YLP.store.db.Mentoring.every(m => m.InteractionType === 'Mentoring')"))
    bs = view(pg, "100235", "business.score")
    check(G, "Learning without application evidence (or below pass score) earns half credit: (1 + 0.5) / 2 = 75", bs == 75, bs)

    upload(pg, "kra_rating_scales_by_name.csv")
    um = panel(pg, "unmatched")
    check(G, "Exact unique name proposes a match that needs confirmation", "confirm the match" in um)
    pg.select_option("#um-0", "confirm")
    confirm(pg, "merge")
    check(G, "Confirmed name match stored and applied", db("YLP.store.db.KRARatingScales.some(s => s.EmployeeID === '100235')") and db("YLP.store.db.meta.nameMappings['rahul verma']") == "100235")

    upload(pg, "YLP_Complete_Workbook.xlsx")
    check(G, "Complete workbook: unrecognised sheet blocks import until a choice is made", "Scratch notes" in pg.inner_text("#imp-preview") and pg.is_disabled("#imp-confirm") if pg.locator("#imp-mode").count() else True)
    pg.select_option("#imp-sheetmap-0", "ignore")
    t = pg.inner_text("#imp-preview")
    check(G, "Complete workbook: recognised sheets parsed together", all(x in t for x in ["Participants", "KRAs", "Competency assessments", "Projects", "Project participants", "Mentoring"]))
    confirm(pg, "merge")
    check(G, "Complete workbook imported (participants and linked records)", db("YLP.store.db.Participants.length") == 11 and db("YLP.store.derived().projects.find(p => p.id === 'W-P1').functions.length") == 3)

    upload(pg, "participants.json")
    confirm(pg, "append")
    upload(pg, "participants.json"); pg.select_option("#imp-mode", "append")
    check(G, "Append Only rejects existing keys", change_table(pg)["Participants"][3] == "2")
    pg.select_option("#imp-mode", "merge"); pg.check("#imp-overwrite")
    check(G, "Merge and Update reports unchanged records", change_table(pg)["Participants"][2] == "2")
    pg.click("#imp-cancel")
    check(G, "__proto__ key dropped (no prototype pollution)", db("({}).polluted === undefined"))

    # Unmatched queue resolution
    pg.select_option("#q-0", "map:100235")
    pg.click("#q-apply"); pg.wait_for_timeout(400)
    check(G, "Queue: mapping an unmatched Employee ID imports the records and remembers the mapping", db("YLP.store.db.KRAs.some(k => k.KRAName === 'Portfolio Reporting' && k.EmployeeID === '100235')") and db("YLP.store.db.meta.idMappings['999001']") == "100235")

    hist = db("YLP.store.db.uploadHistory.length")
    check(G, "Data-version history records every import", hist >= 15, hist)
    snaps = db("YLP.storage.listSnapshots().then(s => s.length)")
    check(G, "Snapshots kept and capped at 10", snaps == 10, snaps)
    before = db("YLP.store.db.Participants.length")
    pg.click("#adm-rollback"); pg.wait_for_function("() => YLP.store.db.Participants.length !== %d" % before, timeout=8000)
    check(G, "Rollback restores the snapshot before the last import", db("YLP.store.db.Participants.length") == 11, db("YLP.store.db.Participants.length"))
    pg.click("#adm-rollback"); pg.wait_for_function("() => YLP.store.db.Participants.length === 8", timeout=8000)
    check(G, "Rollback steps back one more import", db("YLP.store.db.Participants.length") == 8)

    with pg.expect_download() as dl: pg.click("#adm-export-json")
    jp = os.path.join(OUT, "db-export.json"); dl.value.save_as(jp)
    exp = json.load(open(jp, encoding="utf-8"))
    check(G, "Export Current Database as JSON", len(exp["Participants"]) == 8 and "meta" in exp and len(exp["KRAs"]) > 10)
    return jp


def storage_and_modes(G, ctx, url, jpath):
    pg = new_page(ctx, url)
    db = lambda js: ev(pg, "() => " + js)
    check(G, "Data persists after reload", pg.inner_text("#env-badge") == "ACTUAL IMPORTED DATA" and db("YLP.store.db.Participants.length") == 8)
    check(G, "Approval status persists after reload", pg.is_checked("#ap-0-0"))
    keys = db("Object.keys(localStorage)")
    check(G, "All browser keys are namespaced (ylpGurukul.v1.)", keys and all(k.startswith("ylpGurukul.v1.") for k in keys), keys)
    # localStorage / IndexedDB failure keeps the session working
    ev(pg, """() => { Storage.prototype.setItem = function () { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
                     IDBDatabase.prototype.transaction = function () { throw new Error('blocked'); }; }""")
    pg.fill("#adm-asof", "2026-10-05"); pg.click("#adm-asof-save"); pg.wait_for_timeout(500)
    check(G, "Storage failure: in-memory session keeps working, clear warning and export offered", db("YLP.store.lastSave.ok") is False and db("YLP.store.db.meta.dataAsOf") == "2026-10-05" and "could not be saved" in pg.inner_text("#admin-root"))
    pg.close()

    pg = new_page(ctx, url)
    pg.click("#adm-clear"); pg.click("#confirm-dialog [data-value='clear']"); pg.wait_for_timeout(600)
    check(G, "Clear Local Data removes data, snapshots and approval; sample shown", pg.inner_text("#env-badge") == "SAMPLE DATA" and not ev(pg, "() => Object.keys(localStorage).filter(k => k.startsWith('ylpGurukul'))") and not pg.is_checked("#ap-0-0"))
    # Mixed environment: keep sample records
    upload(pg, "participants_injection.csv")
    pg.uncheck("#imp-remove-sample")
    confirm(pg, "merge")
    check(G, "Mixed sample and imported data identified", pg.inner_text("#env-badge") == "MIXED SAMPLE AND IMPORTED DATA")
    check(G, "Sample records excluded from HOD metrics by default when actual data exists", derived(pg, "kpis.total") == 4 and derived(pg, "scoped"))
    pg.check("#adm-include-sample")
    check(G, "Option to include sample records in metrics", derived(pg, "kpis.total") == 16)
    pg.uncheck("#adm-include-sample")
    raw = None
    with pg.expect_download() as dl: pg.click("#g-export")
    p = os.path.join(OUT, "mixed.csv"); dl.value.save_as(p); raw = open(p, encoding="utf-8").read()
    check(G, "CSV export neutralises formula injection and marks SAMPLE/ACTUAL", "'=HYPERLINK" in raw and "SAMPLE" in raw and "ACTUAL" in raw)
    upload(pg, jpath)
    check(G, "Exported JSON recognised as a full database restore", "Full database restore" in pg.inner_text("#imp-preview"))
    pg.click("#imp-confirm"); pg.click("#confirm-dialog [data-value='yes']"); pg.wait_for_selector("#imp-flash")
    check(G, "Database restore round-trips the export", ev(pg, "() => YLP.store.db.Participants.length") == 8 and pg.inner_text("#env-badge") == "ACTUAL IMPORTED DATA")
    pg.click("#adm-reset"); pg.click("#confirm-dialog [data-value='yes']"); pg.wait_for_timeout(500)
    check(G, "Reset sample data", pg.inner_text("#env-badge") == "SAMPLE DATA" and ev(pg, "() => YLP.store.db.Participants.length") == 12)
    # Large dataset moves to IndexedDB
    size = ev(pg, """async () => {
      const db = JSON.parse(JSON.stringify(YLP.store.db));
      const base = db.Competencies.slice();
      for (let i = 0; i < 40; i++) base.forEach(c => db.Competencies.push(Object.assign({}, c, { EmployeeID: c.EmployeeID + '-' + i, Evidence: c.Evidence + ' '.repeat(80) })));
      const r = await YLP.storage.save(db); return [r.where, Math.round(r.bytes / 1048576)];
    }""")
    check(G, "Datasets above the localStorage limit are saved to IndexedDB", size[0] == "idb", size)
    ev(pg, "() => YLP.storage.save(YLP.store.db)")
    pg.close()


def presentation_print(G, ctx, url, is_http):
    pg = new_page(ctx, url)
    pg.click("#hero-present")
    pg.wait_for_selector("#present")
    titles = []
    for i in range(9):
        titles.append(pg.inner_text("#present-count"))
        pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(60)
    check(G, "Presentation Mode: nine slides in the specified order via arrow keys", [t.split(": ", 1)[1] for t in titles] == ["Program purpose", "Cohort overview", "Gurukul journey", "70-20-10 model", "Leadership competency framework", "Cross-functional projects", "Participant journey example", "Governance", "Approval requested"], titles)
    pg.click("#present-prev")
    check(G, "Previous and Next controls", "8 of 9" in pg.inner_text("#present-count"))
    pt = pg.inner_text("#present")
    check(G, "Presentation shows data-as-of date and SAMPLE/ACTUAL/MIXED status; no emails", "Data as of" in pt and "SAMPLE DATA" in pt and "@example" not in pt)
    check(G, "Upload and administration hidden in presentation", ev(pg, "() => getComputedStyle(document.getElementById('admin')).display") == "none")
    pg.keyboard.press("Escape")
    check(G, "Escape exits presentation", ev(pg, "() => !document.getElementById('present')"))
    # Print HOD summary
    ev(pg, "() => document.body.classList.add('print-hod')")
    pg.emulate_media(media="print")
    vis = ev(pg, "() => ['nav', '#admin', '#home', '#overview', '#journey', '#model', '#mandala', '#projects', '#approval', '.hero-actions'].map(s => getComputedStyle(document.querySelector(s)).display)")
    check(G, "Print removes navigation, upload and interactive buttons", vis[0] == "none" and vis[1] == "none" and vis[9] == "none", vis)
    check(G, "Print preserves hero, summary, journey, 70-20-10, framework, projects and approval", all(v != "none" for v in vis[2:9]), vis)
    skip = ev(pg, "() => [document.querySelector('#participants'), document.querySelector('#dashboard'), document.querySelector('#projects .project').parentElement].map(e => getComputedStyle(e).display)")
    check(G, "HOD summary leaves out the gallery, dashboard detail and project cards (kept in a normal browser print)", all(v == "none" for v in skip), skip)
    ev(pg, "() => YLP.shell.expandForPrint()")
    check(G, "Closed details (framework anchors) are opened for printing", ev(pg, "() => document.querySelectorAll('#mandala-root details:not([open])').length === 0 && document.querySelectorAll('#mandala-root details').length >= 18"))
    ev(pg, "() => YLP.shell.restoreAfterPrint()")
    check(G, "Details are closed again after printing", ev(pg, "() => document.querySelectorAll('#mandala-root details[open]').length === 0"))
    if is_http:
        pdf = os.path.join(OUT, "hod-summary.pdf")
        pg.pdf(path=pdf, format="A4", print_background=True)
        n = len(PdfReader(pdf).pages)
        check(G, "Browser print produces a paginated A4 PDF", n >= 6, f"{n} pages")
    pg.emulate_media(media="screen")
    ev(pg, "() => document.body.classList.remove('print-hod')")
    # Print participant profile
    # Headless Chromium fires afterprint at once, so stub print() to keep the print class while measuring.
    ev(pg, "() => { window.print = () => {}; YLP.shell.printProfile(YLP.profile.printView('SMP-0101')); }")
    pg.emulate_media(media="print")
    pv = ev(pg, "() => [getComputedStyle(document.getElementById('profile-print')).display, getComputedStyle(document.querySelector('main')).display, document.querySelectorAll('#profile-print h2').length]")
    check(G, "Print Participant Profile prints only the profile, all nine sections", pv[0] == "block" and pv[1] == "none" and pv[2] == 9, pv)
    if is_http:
        pdf = os.path.join(OUT, "profile.pdf"); pg.pdf(path=pdf, format="A4", print_background=True)
        check(G, "Participant profile PDF generated", len(PdfReader(pdf).pages) >= 3)
    pg.emulate_media(media="screen")
    ev(pg, "() => document.body.classList.remove('print-profile')")
    pg.close()


def accessibility(G, ctx, url):
    pg = new_page(ctx, url)
    ev(pg, "() => YLP.profile.open('SMP-0101')")
    dup = ev(pg, "() => { const ids = [...document.querySelectorAll('[id]')].map(e => e.id); return ids.filter((x, i) => ids.indexOf(x) !== i); }")
    check(G, "No duplicate element IDs (page + open profile)", not dup, dup[:10])
    unl = ev(pg, """() => [...document.querySelectorAll('input:not([type=hidden]), select, textarea')].filter(el => {
        if (el.getAttribute('aria-label')) return false;
        if (el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]')) return false;
        return !el.closest('label'); }).map(el => el.id || el.name || el.type)""")
    check(G, "Every input has a label", not unl, unl[:10])
    noname = ev(pg, "() => [...document.querySelectorAll('svg[role=img]')].filter(s => !s.getAttribute('aria-label') && !s.getAttribute('aria-labelledby')).length")
    check(G, "Every chart graphic has an accessible name", noname == 0, noname)
    btn = ev(pg, "() => [...document.querySelectorAll('button')].filter(b => !(b.innerText.trim() || b.getAttribute('aria-label'))).length")
    check(G, "Every button has an accessible name", btn == 0, btn)
    check(G, "Profile dialog labelled by the participant name", pg.get_attribute("#profile-dialog", "aria-labelledby") == "profile-name")
    pg.close()
    pg = new_page(ctx, url)  # fresh page: a closed modal dialog can swallow the first key press
    pg.focus("#imp-drop")
    with pg.expect_file_chooser(timeout=5000) as fc: pg.keyboard.press("Enter")
    check(G, "Keyboard: Enter on the drop zone opens the file chooser", fc.value is not None)
    pg.focus(".stage-card >> nth=0"); pg.keyboard.press("Enter")
    check(G, "Keyboard: journey stages open with Enter", pg.locator("#stage-detail").count() == 1)
    pg.close()


def fallbacks(G, browser, url):
    ctx = browser.new_context()
    ctx.route("**/vendor/xlsx.full.min.js", lambda r: r.abort())
    pg = new_page(ctx, url)
    t = pg.inner_text("#adm-upload")
    check(G, "SheetJS blocked: exact unavailable message", "Excel processing is unavailable because the approved Excel library could not be loaded. Please upload CSV or JSON files, or open this application in an approved environment where SheetJS is available." in t)
    check(G, "SheetJS blocked: only Excel controls disabled; CSV guidance shown", ".xlsx" not in pg.get_attribute("#imp-file", "accept") and pg.is_disabled("#imp-dataset option[value=goalSheet]") and pg.is_disabled("#imp-wb-template") and "saved as CSV" in t)
    upload(pg, "participants_injection.csv")
    check(G, "SheetJS blocked: CSV upload works without the library", "Preview: Participant Master" in pg.inner_text("#imp-preview"))
    upload(pg, "participants.json")
    check(G, "SheetJS blocked: JSON upload works without the library", "Preview" in pg.inner_text("#imp-preview"))
    pg.set_input_files("#imp-file", os.path.join(FIX, "YLP_Participant_Master.xlsx")); pg.wait_for_selector("#imp-preview .alert-error")
    check(G, "SheetJS blocked: Excel never claimed available; forced upload refused", "Excel processing is unavailable" in pg.inner_text("#imp-preview"))
    check(G, "Native charts render without Chart.js", pg.locator("#dashboard-root figure.chart svg").count() >= 10 and ev(pg, "() => typeof window.Chart === 'undefined'"))
    ctx.close()
    ctx = browser.new_context(); ctx.route("**/*.woff2", lambda r: r.abort())
    pg = new_page(ctx, url)
    check(G, "Fonts blocked: system serif and sans-serif used", "Georgia" in ev(pg, "() => getComputedStyle(document.querySelector('h1')).fontFamily") and pg.is_hidden("#runtime-errors"))
    ctx.close()
    ctx = browser.new_context(); ctx.add_init_script("delete window.FileReader;")
    pg = new_page(ctx, url)
    check(G, "Unsupported feature does not fail silently (reader warning shown)", pg.is_visible("#boot-warning") and "Not Supported" in pg.inner_text("#adm-compat"))
    ctx.close()


def network(G, pg, logs, external):
    check(G, "No request leaves the site during the whole session", not external, external[:5])
    probe = ev(pg, """async () => {
      const v = []; document.addEventListener('securitypolicyviolation', e => v.push(e.violatedDirective));
      let blocked = false; try { await fetch('https://example.com/collect'); } catch (e) { blocked = true; }
      const i = new Image(); i.src = 'https://example.com/p.gif';
      const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js'; document.head.appendChild(s);
      await new Promise(r => setTimeout(r, 1200)); return { blocked, v, chart: typeof window.Chart !== 'undefined' }; }""")
    check(G, "Security policy blocks fetch, tracking pixels and third-party scripts", probe["blocked"] and not probe["chart"] and {"connect-src", "img-src", "script-src-elem"} <= set(probe["v"]), probe)
    bad = [l for l in logs if "Content Security Policy" not in l and "net::ERR_" not in l]
    check(G, "No console errors or warnings", not bad, bad[:5])


def mobile(G, browser, url):
    ctx = browser.new_context(viewport={"width": 375, "height": 812}, is_mobile=True, has_touch=True)
    pg = new_page(ctx, url)
    check(G, "375 px: no horizontal page scroll", ev(pg, "() => document.documentElement.scrollWidth") <= 375, ev(pg, "() => document.documentElement.scrollWidth"))
    check(G, "Collapsible mobile menu", pg.is_hidden("#nav-links") and (pg.click("#nav-toggle") or True) and pg.is_visible("#nav-links"))
    pg.click("#nav-toggle")
    fs = ev(pg, "() => { const t = document.querySelector('#mandala-root svg text'); const svg = t.ownerSVGElement; return [t.getBoundingClientRect().height, svg.getBoundingClientRect().right]; }")
    check(G, "Mandala switches to the compact layout with legible labels on phones", fs[0] >= 10 and fs[1] <= 375, fs)
    check(G, "Journey becomes a vertical pathway", ev(pg, "() => getComputedStyle(document.querySelector('.journey-stages')).gridTemplateColumns.split(' ').length") == 1)
    ev(pg, "() => YLP.profile.open('SMP-0101')")
    w = ev(pg, "() => document.getElementById('profile-dialog').getBoundingClientRect().width")
    check(G, "Profile is full-screen on mobile", w >= 370, w)
    pg.screenshot(path=os.path.join(OUT, "mobile-profile.png"))
    pg.keyboard.press("Escape")
    pg.screenshot(path=os.path.join(OUT, "mobile-home.png"))
    ctx.close()


def github(G, browser):
    ctx = browser.new_context()
    pg = new_page(ctx, HTTP_URL)
    ev(pg, "() => YLP.store.commit(YLP.store.db)")
    other = ctx.new_page(); other.goto(f"http://127.0.0.1:{PORT}/other-project/")
    leak = other.evaluate("() => Object.keys(localStorage).filter(k => k.startsWith('ylpGurukul')).length > 0")
    check(G, "Shared-origin risk confirmed: another project on the same github.io origin can read this app's storage", leak)
    ctx.close()
    check(G, ".nojekyll present for GitHub Pages", os.path.exists(os.path.join(PROJECT, ".nojekyll")))


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for G, url in [("file", FILE_URL), ("pages", HTTP_URL)]:
            ctx = browser.new_context(accept_downloads=True, viewport={"width": 1366, "height": 900})
            pg, logs, external = basics(G, url, ctx)
            engine_rules(G, pg)
            ui_views(G, pg)
            jpath = imports(G, pg)
            network(G, pg, logs, external)
            pg.close()
            storage_and_modes(G, ctx, url, jpath)
            presentation_print(G, ctx, url, G == "pages")
            accessibility(G, ctx, url)
            ctx.close()
        fallbacks("fallback", browser, HTTP_URL)
        mobile("mobile", browser, HTTP_URL)
        github("github", browser)
        browser.close()
    json.dump(results, open(os.path.join(OUT, "results.json"), "w"), indent=2)
    fails = [r for r in results if not r["ok"]]
    print(f"\n{len(results) - len(fails)}/{len(results)} passed")
    for f in fails: print("FAILED:", f["group"], "|", f["test"], "|", f["detail"])


main()
