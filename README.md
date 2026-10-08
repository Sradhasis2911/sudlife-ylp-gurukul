# SUD Life YLP Gurukul

A leadership-programme dashboard for the SUD Life Young Leaders Programme. It is a static website: HTML, CSS and plain JavaScript, with no server, build step, API key, login or external service. It runs by double-clicking `index.html`, and it runs from GitHub Pages.

Uploaded files are read inside the viewer's browser and saved only in that browser's storage. A Content-Security-Policy blocks every network request, so participant data cannot leave the page.

All data in `data/sample-data.js` is fictional and marked `IsSample: true`.

Version 1.0.0, built 8 October 2026. Every default chosen while building is listed in [DECISIONS.md](DECISIONS.md), with the file and setting to change.

## What it does

| Section | What you get |
|---|---|
| Gurukul Home | Hero, programme statement, six headline numbers, Presentation Mode |
| Executive Overview | 15 cohort KPIs, data completeness, the disclaimer |
| Leadership Journey | The six stages (Pravesh to Uday): completion rings, participant counts, details on click |
| 70-20-10 Model | Donut and stacked bars for experience, relationships and learning; expandable cards; model table |
| Competency Mandala | Five domains for the cohort or one person, target ring at Level 3, a detail panel for each domain, the full framework |
| Participant Gallery | Cards with 12 filters, search, sort and CSV export. Each card opens a nine-tab profile: Overview, KRAs, KRA Comparison, Competencies, 70-20-10, Project, IDP, Evidence and Timeline |
| Cross-Functional Projects | Project metrics, validity checks, risk flags, the seven-part evaluation, expected and actual impact |
| Leadership Dashboard | 14 charts, a competency heat map with drill-down, exposure equity, alerts, the pipeline and a data-availability matrix |
| Upload Data | 18 dataset types (xlsx, csv and json), column mapping, preview, errors, warnings and an unmatched queue. Also four import modes, snapshots, rollback, history, data quality, a storage meter and a compatibility check |
| Governance and Approval | Roles, the quarterly reviews, data principles and the HOD approval panel |
| Outputs | Print HOD Summary, Print Participant Profile, Save as PDF, Export Dashboard Data, Export Database (JSON), Export Participants (CSV), Presentation Mode |

## Open it locally

1. Unzip the folder anywhere.
2. Double-click `index.html`. Use a current version of Microsoft Edge or Google Chrome.

No internet connection is needed. The Excel library and the fonts are inside the folder.

## Put it on GitHub Pages

1. Create a repository, for example `ylp-gurukul`.
2. Upload the **contents** of this folder to the repository root. Include the hidden files `.nojekyll` and `.gitignore`.
3. Go to **Settings → Pages → Build and deployment**. Choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After about a minute the site is live at `https://<account>.github.io/ylp-gurukul/`.

Every path in the project is relative and lower-case, so it works under that sub-path. GitHub Pages is case-sensitive, so keep new file names lower-case and reference them exactly.

### Four points to clear with IT and Information Security first

1. **A GitHub Pages site is public on the internet.** That is true even when the repository is private, unless your organisation uses GitHub Enterprise Cloud with private Pages; then only people with read access to the repository can open the site. On GitHub Free, Pages needs a public repository; private repositories need Pro, Team or Enterprise. The code and the fictional sample data are safe to make public. Real participant data must never be committed. The included `.gitignore` blocks `.xlsx`, `.csv` and exported JSON files as a safety net.
2. **Uploaded data stays in each viewer's own browser.** Nothing is stored on GitHub, and each person sees only what they imported on that device. To move data to another machine, such as the HOD's laptop, export the database as JSON and import that file there.
3. **All project sites on one GitHub account share browser storage.** `account.github.io/ylp-gurukul` and `account.github.io/any-other-repo` count as the same website, so another project on that account could read this app's saved data. The test suite confirms this. Use an account or organisation dedicated to this app, or a custom domain.
4. **Anyone who can push to the repository controls the code that runs on participant data.** Turn on branch protection and require a review for changes to `main`.

## Folder layout

```
index.html                  page shell, section skeleton, Content-Security-Policy
DECISIONS.md                every default and where to change it
assets/css/app.css          visual system, responsive rules, print rules
assets/css/fonts.css        self-hosted font faces
assets/fonts/               Cormorant Garamond and Source Sans 3 (SIL OFL 1.1, licences included)
assets/js/core/             namespace and config, DOM helpers, sanitising, dates,
                            model.js (all rules, weights and copy), framework.js (competency text),
                            KRA weight rules, storage, compatibility check, Excel library loader
assets/js/engine/           pure calculations: competency, progress, projects, KRA comparison,
                            role matching, data availability, validation, derive (one view per participant)
assets/js/io/               CSV reader and writer, table schema, importers, exports
assets/js/ui/               one file per section, plus charts, profile dialog and presentation mode
assets/js/app.js            store (save, snapshots, rollback, reset) and boot
data/sample-data.js         fictional sample records, loaded as a script so file:// works
vendor/xlsx.full.min.js     SheetJS Community Edition 0.20.3 (Apache-2.0)
tests/                      fixture generator and browser test suite (not loaded by the app)
```

The scripts are classic scripts on one `window.YLP` namespace, not ES modules. Browsers refuse ES modules and `fetch()` for pages opened from `file://`. This structure lets the same folder run from a double-click and from a web host.

## Changing things

- **Rules, weights, thresholds, labels and fixed wording:** `assets/js/core/model.js`. Each setting is tagged with its decision ID from DECISIONS.md.
- **Competency domains, anchors, definitions and level descriptors:** `assets/js/core/framework.js`. You can also import the Leadership Competency Workbook in Upload Data, which overrides the built-in text for each domain it contains.
- **Financial years:** `M.currentFY`, `M.previousFY` and `M.currentFYStart` in `model.js`. Update them each April.
- **Snapshots kept, storage limits, preview rows:** `YLP.config` in `assets/js/core/namespace.js`.
- **Column names the importer recognises:** the `aliases` for each table in `assets/js/io/schema.js`.
- **Colours and type:** the custom properties at the top of `assets/css/app.css`. Chart colours are in `PAL` in `assets/js/ui/charts.js`, which has to use hex values because SVG attributes cannot read CSS variables.
- **Sample data:** `data/sample-data.js`. Keep `IsSample: true` on every record.

## Libraries

- **SheetJS CE 0.20.3** is bundled in `vendor/`. The package on the public npm registry (`xlsx` 0.18.5) has two published vulnerabilities, CVE-2023-30533 and CVE-2024-22363, that are fixed only in builds from `cdn.sheetjs.com`. The copy here is 0.20.3, taken from the `@e965/xlsx` npm mirror of the official build. Before production, replace `vendor/xlsx.full.min.js` with the file downloaded from https://cdn.sheetjs.com/ (version 0.20.3 or later), so it comes straight from the publisher. If the file is missing or blocked, Excel import turns off with a clear message, and CSV and JSON still work.
- **Chart.js is not used.** Charts are native SVG, each with numeric labels, a written summary, a data table and tooltips on hover and keyboard focus.

## Tests

`tests/suite.py` runs 367 browser checks, mapped to the acceptance list in section 77 of the brief. It runs against the page opened from `file://` and against the page served under a GitHub Pages-style sub-path. It covers:

- **Engine rules:** competency validation, the Level 3 blockers, the progress formula, KRA weights, project validity and risk.
- **Imports:** all 18 dataset types, header detection, ambiguous dates, the unmatched queue, the four import modes, rollback, injection attempts, and email hiding.
- **Interface:** the views, filters, the profile, presentation mode, printing, keyboard use and labels.
- **Robustness and hosting:** fallbacks when the libraries or fonts are blocked, zero outbound requests, phone layout, and the GitHub shared-origin behaviour.

Last run, 8 Oct 2026, in Chromium: **367 of 367 passed**.

Run the tests (needs Python 3 with Playwright, Chromium, openpyxl and pypdf):

```
python3 tests/make_fixtures.py /tmp/ylp-fixtures
mkdir -p /tmp/site && ln -s "$PWD" /tmp/site/sudlife-ylp-gurukul && mkdir -p /tmp/site/other-project && echo '<!doctype html><title>x</title>' > /tmp/site/other-project/index.html
python3 -m http.server 8765 --bind 127.0.0.1 --directory /tmp/site &
python3 tests/suite.py "$PWD" /tmp/ylp-fixtures /tmp/ylp-results 8765
```

Not tested yet:

- Firefox and Safari. The test environment has only Chromium, the engine behind Edge and Chrome.
- Your organisation's real files. The importers were tested against fictional files built from the column names and layouts described in the brief.
