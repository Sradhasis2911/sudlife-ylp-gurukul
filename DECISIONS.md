# Decision log

The brief left these points open or conflicting. Each entry gives the default chosen and where to change it. IDs (D-xx) also appear as comments in the code next to the setting.

Most rules live in `assets/js/core/model.js`; it is shortened to **model.js** below. Files are under `assets/js/` unless a full path is given.

---

## A. Architecture and hosting

**D-01 File structure.** A multi-file static site with no build step. Plain scripts share one `window.YLP` namespace and load in a fixed order (see the end of `index.html`). Browsers refuse ES modules and `fetch()` from `file://`, so this is what lets one folder run from a double-click and from GitHub Pages. The sample data is a `.js` file for the same reason.

**D-02 No network.** A Content-Security-Policy in `index.html` allows only the site's own files: `connect-src 'none'`, no external scripts, fonts, styles or images. There is no telemetry, analytics or CDN. Inline scripts and inline style attributes are also blocked, so all behaviour is in `.js` files. *Change:* the `<meta http-equiv="Content-Security-Policy">` tag, but loosening it removes the guarantee that data cannot leave the page.

**D-03 Excel library.** SheetJS Community Edition 0.20.3 is bundled at `vendor/xlsx.full.min.js`. It comes from the `@e965/xlsx` mirror of the official build, because the npm `xlsx` 0.18.5 has known vulnerabilities. `core/libs.js` loads it only when an Excel file is used. If it is missing, Excel import is disabled with the brief's fallback message, and CSV and JSON still work. *Before production:* replace the file with the download from cdn.sheetjs.com.

**D-04 Charts.** Chart.js is not used. `ui/charts.js` draws native SVG bar, stacked-bar, donut, ring and meter charts. Each one has numeric labels, a written summary, a data table, and tooltips on hover and keyboard focus.

**D-05 Fonts.** The fonts are self-hosted: Cormorant Garamond (500/600/700) for headings and Source Sans 3 (400/600/700) for text, both under the SIL OFL with licences included. They fall back to system fonts if blocked. *Change:* `assets/css/fonts.css`, plus `--serif` and `--sans` in `app.css`.

**D-06 Storage.**
- The database is saved to `localStorage` (key `ylpGurukul.v1.db`) while it is under 4.5 MB. Above that it moves automatically to IndexedDB (database `ylpGurukul.v1`).
- A warning appears at 70 % of the limit.
- A snapshot is taken in IndexedDB before every import, rollback, restore or reset. The newest 10 are kept.
- Preferences (gallery filters, the include-sample toggle) and approval statuses use `localStorage` keys starting `ylpGurukul.v1.`.
- Only parsed records are stored, never the workbook files.
- *Change:* `YLP.config` in `core/namespace.js` (`safeLocalStorageBytes`, `warnRatio`, `maxSnapshots`, `storagePrefix`).

**D-07 Evaluation date.** Rules that depend on "today" use the browser's date. Examples are overdue actions, project schedule risk and the 365-day currency window. Adding `?asof=YYYY-MM-DD` to the address fixes the date for demonstrations and tests. The **Data as of** date shown on screen is separate: it is stored in the database and edited under Upload Data → Data, history and exports.

**D-08 Theme.** Light theme only. The brand palette and print output were the priority, so there is no dark mode.

**D-09 Page model.** Everything is on one scrolling page with sticky navigation. The participant profile opens as a modal dialog (full screen on phones), and presentation mode is a full-screen overlay. Upload Data and administration sit in one section that is hidden in presentation mode and in print.

## B. Data model and schema

**D-10 Schema extensions.** These fields were added to the brief's tables, either because a rule needed them or because the brief's sample files contain them:
- **Participants:** `CareerAspiration`.
- **KRAs:** `WeightageSource` (the original text, such as "0.2" or "20%"), `SMARTGoal`, `KeyParameters` and `Designation`. These come from the goal sheet.
- **Competencies:** `SourceTargetLevel`, which keeps an imported target other than 3; see D-29.
- **Projects:** `EvalBusinessRelevance`, `EvalProblemDiagnosis`, `EvalCollaboration`, `EvalSolutionQuality`, `EvalPilot`, `EvalImpact` and `EvalPresentation`. Each is scored 1–5, as in D-40.
- **Learning:** `ValidationStatus`.
- **Mentoring:** `InteractionType` (`Mentoring`, `Manager Conversation`, `Peer Circle`, `SME Interaction`). Blank counts as `Mentoring`.
- **JourneyActivities:** `Sponsor`, `ValidationStatus`, `DevelopmentOutcome` and `ProjectID`. `ProjectID` links an activity to a project as a milestone.
- **CompetencyFramework:** `Summary`.
- Role descriptors get an automatic `RoleDescriptorID` when the file has none.
- An imported `OverallProgress` is stored but never shown; progress is always recalculated from evidence (D-30).
- *Change:* `io/schema.js`.

**D-11 Email addresses.**
- An official email column is recognised and dropped at import ("Recognised but not stored").
- Manager and HRBP emails are kept because they identify the relationship. They are hidden by default; the profile has a "Show manager and HRBP email fields" toggle. They are never shown in previews, presentation mode or print.
- They are never written to the CSV or dashboard exports. The full JSON database export is a backup for restoring, so it does contain them.
- *Change:* `EMAIL_FIELDS` in `io/export.js`, and the `ignored` list in `io/schema.js`.

**D-12 Cohorts.** A year range such as "FY 2025-26" or "2025-26" maps to its start year (`FY2025`), and the preview notes it. *Change:* `mapCohort` in `io/importers.js`.

**D-13 Financial years.** The current FY is `FY 2026-27`, the previous FY is `FY 2025-26`, and the current FY starts on 1 April 2026. KRA workbooks are labelled with these years unless the file names its own. *Change:* `M.currentFY`, `M.previousFY` and `M.currentFYStart` in model.js, every April.

**D-14 Data-availability statuses.** The brief's four statuses are used, plus **Not Applicable**. It is shown, for example, for previous-FY KRAs and previous-FY rating when the participant joined after the previous FY started, so a recent joiner does not show a gap. *Change:* `engine/availability.js`.

**D-15 KRA weights.**
- A weight above 0 and up to 1 is treated as a decimal and multiplied by 100 (0.2 becomes 20).
- "20%" becomes 20.
- A weight of exactly 1 becomes 100 but is flagged for review, because it could mean 1 % or 100 %.
- An employee's weights for one financial year are Valid when they total exactly 100, a Warning between 99 and 101, and an Error otherwise.
- *Change:* `core/kra.js`.

**D-16 Repeated KRA titles.** Two KRAs with the same title for the same employee and year are both kept and flagged; they are never merged. *Change:* `core/kra.js` and `planMerge` in `io/importers.js`.

**D-17 Missing values.** A missing achievement, progress, rating, target or manager observation is stored empty and shown with a label such as "Achievement Not Available". It is never shown as 0. *Change:* `M.missingLabels` in model.js.

**D-18 Sample data.**
- There are 12 fictional participants (SMP-0101 to SMP-0208) with their full programme records, all marked `IsSample: true`.
- The environment badge reads SAMPLE, ACTUAL or MIXED.
- When actual records exist, HOD metrics leave sample records out, unless "Include sample records in HOD metrics" is ticked (the option appears only in MIXED).
- When you import over pure sample data, "Remove all sample records on import" is ticked by default.
- **Known conflict:** 12 participants cannot fill four projects of four to six people, so the sample projects are deliberately incomplete. One is at risk, one has only three members and one has no team. This shows the validity rules at work.

**D-19 Profile photos.** `ProfilePhotoURL` is used only when it is a relative path to an image inside the site folder, because the policy in D-02 blocks external images. Otherwise an initials medallion is shown.

## C. Leadership competency

**D-20 Framework text.** The brief gives domain names, anchor names and a Level 3 summary for each domain, but no anchor definitions or level descriptors. I wrote a one-line definition for each of the 18 anchors and used generic Level 1–5 descriptors. Importing the Leadership Competency Workbook replaces the built-in text for each domain it contains. When a workbook has both a detailed and a concise sheet, the one with longer definitions wins. *Change:* `core/framework.js`.

**D-21 Current level.** An anchor's current level comes from its latest assessment with a level that is not a self-assessment or a baseline. Self-assessments are shown beside it but never set the level. *Change:* `assessAnchor` in `engine/competency.js`.

**D-22 Who can validate.** An assessment is validated when `ValidationStatus` is "Validated" and `ValidatorRole` contains manager, sponsor, assessor or panel. *Change:* `M.competency.validatorRoles` in model.js.

**D-23 Seven checks for Level 3 or above.** A level of 3 or more counts only when all of these hold:
1. The current level is at least 3.
2. There is evidence from at least two situations.
3. At least one situation was non-routine.
4. A validator from D-22 signed it off.
5. An observable output or impact is recorded.
6. The assessment is dated within the last 365 days.
7. The behaviour was consistent. The validator's sign-off stands for this, because there is no separate data field.

Otherwise the anchor shows "Level 3 indicated, validation pending." Levels 1–2 need only a validator's sign-off. *Change:* `M.competency.currentWindowDays`, `minEvidenceForLevel3` in model.js, and `level3Checks` in `engine/competency.js`.

**D-24 Domain score.** A domain's score is the mean of its validated anchors. It shows Insufficient Evidence when fewer than 50 % of its anchors are validated. *Change:* `M.competency.domainMinValidatedShare`.

**D-25 Overall level and Level 3 blockers.**
- The overall score is the equal-weight mean of the domains that have evidence. It is not calculated when more than one domain is insufficient.
- Overall Level 3 is confirmed only when none of these blockers apply:
  - any domain is below 2.5;
  - Ethics, Risk Assessment and Compliance, or Collaboration lacks a validated assessment;
  - more than one domain is insufficient.
- A participant who is in the Level 3 band but blocked is shown as Progressing Toward Level 3, with the reason.
- *Change:* `M.competency.criticalAnchors`, `mandatoryDomainFloor` and `maxInsufficientDomains`.

**D-26 Bands and gaps.**
- Bands: below 1.5 is Level 1; 1.5 to under 2.5 is Level 2; 2.5 to under 3.5 is Level 3; 3.5 to under 4.5 is Level 4; 4.5 and above is Level 5.
- Gap categories use the band:
  - two or more levels below target is Priority Development Need;
  - one below is Progressing Toward Level 3;
  - at target is Demonstrating Level 3;
  - above target is Demonstrating Above Target.
- *Change:* `M.bands` and `M.gapCategory`.

**D-27 Baseline.** The baseline is `BaselineLevel` on the earliest record that has one. Failing that, it is the level of the earliest Baseline-type assessment. A baseline never counts as the current level; an anchor with only a baseline shows "Baseline only".

**D-28 Competency progress.** The competency progress component is the mean, across domains with evidence, of each domain's score capped at 3, as a percentage of 3. Exceeding Level 3 does not add progress. It is available when at most one domain is insufficient. *Change:* `componentMaxInsufficientDomains`, and the `component` calculation in `engine/competency.js`.

**D-29 Import checks for competency files.**
- A target other than 3 is reset to 3 with a warning; the original is kept in `SourceTargetLevel`.
- Scores outside 1–5 are rejected.
- KRA-rating words such as "Meets Expectations" in a level column are flagged as scale confusion.
- Anchors not in the framework are rejected.
- An assessment is overdue when its next review date has passed with no later validated assessment.

## D. Development progress

**D-30 Overall YLP progress.** The six components are weighted: competency 30, project 25, 70-20-10 model 20, IDP 10, business and insurance learning 10, programme discipline 5.
- Provisional progress = the sum of (score × weight) for available components ÷ the available weight.
- Data completeness = the available weight, out of 100.
- A component without enough evidence is left out, never scored 0.
- KRA progress is never part of YLP progress.
- *Change:* `M.overallProgress`.

**D-31 Activity types.** `JourneyActivities.ActivityType` values map to the 70 % components. For example, "Stretch Assignment" maps to the stretch component, "Business Immersion" to immersion, and "Project Milestone" to a project milestone. Assessment and review types are tracked but earn no points. *Change:* `M.activityTypeMap`.

**D-32 Evidence cap.** An item marked Completed, or at 100 %, with no evidence earns at most 90 % credit and is flagged "evidence required". Cancelled items are left out. *Change:* `M.evidenceCap`.

**D-33 Relationship tracks (the 20).** Six tracks have planned numbers per programme year: mentoring 6, manager conversations 4, sponsor feedback 2, peer circles 4, stakeholder feedback 2, subject-matter experts 2. An interaction counts once its date has arrived and it has evidence or a committed action. Sponsor feedback recorded on the project mapping also counts. Points = 20 × the average completion of the six tracks. *Change:* `M.relationshipTracks`.

**D-34 Learning categories (the 10).** `LearningType` is matched to nine categories, falling back to the title. Four of them count as business and insurance learning: SUD Life business, insurance value chain, business simulations and functional academies. *Change:* `M.learningCategories`.

**D-35 Learning credit.** A completed item with application evidence earns full credit. One without application evidence, or with an assessment score below 60, earns half credit. An item that is not completed earns none. *Change:* `M.learningPassScore` and `M.learningNoApplicationCredit`.

**D-36 Project component.** The project component is available only when the participant is allocated, the project's completion percentage is known, and the participant's individual contribution is recorded. Its score is the project's completion. With no project, the component is left out and "Mandatory Experience Pending" is shown everywhere. *Change:* `engine/derive.js`.

**D-37 IDP.** Only actions whose target date has arrived count toward completion, credited as in D-32. The status works like this:
- **Not Started:** there are no actions, unless an imported status says otherwise.
- **Initiated:** there are actions but none is due yet.
- **On Track:** actions are due and none is overdue.
- **Overdue:** at least one action is past its target date and still open.
- **Completed:** every action is completed.

*Change:* `idp` in `engine/progress.js`.

**D-38 Completeness labels.** Below 50 % completeness shows "Insufficient Evidence" with no progress figure; 50–79 % shows "Provisional YLP Progress"; 80 % and above shows "YLP Progress". *Change:* `M.completeness`.

**D-39 70-20-10 and discipline.**
- **70-20-10 component:** total model points out of 100 (experience 70, relationships 20, learning 10). It is available once any 70-20-10 record exists.
- **The 70 % part is "complete"** when the project, the stretch assignment and at least one broader exposure are all completed with evidence. A broader exposure is lead-without-authority, immersion or shadowing.
- **Discipline:** up to four measures:
  - timely submissions;
  - review participation (one manager conversation expected per 91 days since joining, up to 4);
  - evidence completeness;
  - closure of mentoring actions.
- Discipline is scored only when at least two measures are available. Documentation quality has no data field, so it is listed as reviewed by the programme owner rather than scored.
- *Change:* `experience` and `discipline` in `engine/progress.js`.

## E. Projects

**D-40 Project evaluation.** The seven dimensions are scored 1–5 and converted to 0–100. The weights are business relevance 15, problem diagnosis 15, cross-functional collaboration 20, solution quality 15, pilot or implementation 15, measurable impact 10 and leadership presentation 10. Partly scored projects are re-weighted over the dimensions that are present. If none are present, an imported `PanelScore` is used. *Change:* `M.projectEvaluation`.

**D-41 What counts as a function.** A function is the member's Business Unit, or their Department if the Business Unit is blank, taken from the participant master. The imported `FunctionsRepresented` is used only when no member's function is known, and the project's validation is then Provisional.

**D-42 Project validity.** A project needs at least 3 functions, 4 to 6 participants (unless `ExceptionApproved` is yes), a business sponsor and a YLP adviser. The result is Valid, Not Valid or Provisional. A measurable problem, a baseline, a target impact and a planned pilot are shown as quality checks that do not affect validity. *Change:* `M.projectRules`.

**D-43 Projects at risk.** A project is at risk when it meets any of these conditions:
- Its status says At Risk.
- Its target date has passed and it is not closed.
- Its completion is more than 25 points behind the share of time elapsed.

Milestones are journey activities that carry its `ProjectID`. *Change:* `M.projectRules.atRiskScheduleGap`.

## F. Readiness, stages and statuses

**D-44 Readiness categories.**
- **Insufficient Evidence:** completeness is below 50 %, or competency evidence is insufficient.
- **Ready for Broader Exposure:** Level 3 is confirmed and the mandatory project is completed with evidence.
- **Demonstrating Level 3:** Level 3 is confirmed but the project is not yet complete.
- **Developing Toward Level 3:** the participant is in the Level 2 band, or blocked at Level 3.
- **Foundation Building:** everyone else.

*Change:* `readiness` in `engine/progress.js`.

**D-45 Pathways.** The participant master's `LeadershipPathway` text maps to Functional, Specialist, Project or People Leadership; anything else is Not Yet Identified. The dashboard pipeline shows the Specialist, Project and People pathways.

**D-46 Restricted labels.** "High Potential", "Promotion Ready" and "Successor Ready" are never shown, because no calibrated, authorised evidence can be imported in this version. The disclaimer appears on the overview, the gallery, print and presentation. *Change:* `M.restrictedLabels`; removing the restriction would need a new data source.

**D-47 Journey stage.** The stage is the participant master's `JourneyStage` when it names a stage. Otherwise it is the furthest stage with a completed or in-progress activity, and failing that Pravesh. Each stage card's ring shows the share of participants who have reached that stage or gone beyond it, and its count is the number currently at the stage. *Change:* `journeyStage` in `engine/progress.js`.

**D-48 Mentor status.** It is read from `MentorStatus` text (Allocated, Pending or Not Allocated). When that is blank, it is Allocated if any mentoring record exists.

**D-49 Exposure equity.** The dashboard groups participants under nine flags:
- no project
- no mentor
- no immersion
- no sponsor feedback
- mostly transactional KRAs (D-52)
- limited cross-functional exposure (fewer than 2 of 5 signals)
- an overdue assessment
- insufficient evidence
- an IDP not started or overdue

*Change:* `exposure` in `engine/derive.js`.

## G. KRAs and role descriptors

**D-50 KRA comparison.** Previous-FY and current-FY KRAs are compared by Employee ID: KRA count, total weight and 11 scope dimensions found by keywords. The brief's wording is shown with every comparison: "KRA comparison reflects changes in assigned scope…".

**D-51 Classification.** The classification comes from the first of these that applies:
1. An imported confirmed classification.
2. An HR override saved in the profile, with name, date and rationale, stored in `db.meta.classificationOverrides`.
3. The system's suggestion:
   - **Role Transition** when the Business Unit or Department changed between the years.
   - Otherwise, the keyword group (Leading, Transforming, Broadening or Deepening) whose share of KRA weight grew most, if it grew by 10 percentage points or more. Ties go to Transforming, then Leading, Broadening and Deepening.
   - Otherwise **Static**.
4. Insufficient Data when either year is missing.

Suggestions are always labelled "System Suggestion, HR Validation Required". *Change:* `M.kraKeywords`, `M.kraSuggestionPriority` and `M.kraSuggestionMinShift`.

**D-52 Mostly transactional KRAs.** A current-FY KRA set is flagged mostly transactional when at least 60 % of its weight matches routine words (report, maintain, coordinate, reconcile and so on) and none of it matches Leading or Transforming. *Change:* `M.transactionalWords` and `M.transactionalShare`.

**D-53 KRA rating scales.** Rating scales are shown as "goal-rating thresholds, not achieved ratings". They are never combined with behavioural levels. A file without a financial year is taken as the current FY.

**D-55 Role matching.** Matches are tried in this order:
1. **Confirmed (100):** a mapping HR confirmed.
2. **High Confidence (90):** an exact Business Unit, Department and Designation match.
3. **Review Required (50–80):** same Business Unit and Department, with KRA keywords overlapping the role's text by at least 12 %.
4. **Review Required (30 or 40):** Business Unit and Department only.
5. **Unmatched:** nothing else applies.

The wording "Role alignment is a development reference, not a performance score" is always shown. *Change:* `M.roleMatch.keywordOverlapMin` and `engine/roles.js`.

## H. Importing

**D-60 Blocking errors and rejected rows.** Blocking errors stop the whole import until they are fixed, for example an unreadable file, a required column with no mapping, or ambiguous dates. A problem in a single row rejects only that row, and the reason is listed under Errors.

**D-61 Header row.** The importer scans the first 30 rows and uses the row that matches the most known column names, then maps the columns automatically. The mapping table can be changed by hand. The preview reports the row it found.

**D-62 Keys and replace scope.**
- Every table has a key; for KRAs it is employee + FY + title + an occurrence counter, so repeated titles survive (D-16).
- **Replace** removes only the matching scope:
  - KRAs and rating scales: the same FY;
  - an individual goal sheet: that employee and FY;
  - every other table: the whole table.

**D-63 Unmatched records.** Records whose employee is not in the participant master go to the Unmatched queue. They are excluded by default. Each one can be included as-is, mapped to an existing Employee ID, or confirmed. The queue is kept, and can be finished later in Upload Data.

**D-64 Name matching.** For files with names but no Employee IDs (such as rating scales):
- An exact, unique name is proposed but still needs confirmation.
- "Similar" means at most two letters different, or the same words in a different order.
- Confirmed name and ID mappings are remembered for later imports.

**D-65 Dates.** Excel date numbers, ISO dates and text dates are all read. A text date that could be either day-first or month-first, such as 03/04/2026, blocks the import until DD/MM or MM/DD is chosen for that file. Dates are shown as DD MMM YYYY.

**D-66 Import modes.**
- **Replace:** see D-62 for its scope.
- **Merge and update:** by key. Existing values are kept unless "Overwrite" is ticked.
- **Append only:** records whose key already exists are rejected.
- **Preview only:** nothing is saved.

Every save takes a snapshot first (D-06), and "Roll back last import" restores it.

**D-67 Complete workbook.** Sheets are recognised by name, using the aliases in `io/schema.js`. An unrecognised sheet must be assigned to a table or set to Ignore before the import can go ahead.

**D-68 Files allowed.** The importer reads `.xlsx`, `.xls`, `.csv` and `.json`, up to 25 MB each. A JSON file exported from this app is recognised as a database restore.

**D-69 Safety.**
- Cell contents are always shown as text, never run as code.
- Keys such as `__proto__` are dropped.
- CSV exports put a quote mark in front of values that start with `=`, `+`, `-` or `@`, so spreadsheet programs do not run them as formulas.
- *Change:* `core/sanitize.js`.

## I. Interface and outputs

**D-70 Visual identity.**
- **Palette:** maroon (#5B1D22), terracotta, gold (#C89B3C), sandstone and ivory, on a warm page colour.
- **Type:** Cormorant Garamond headings with Source Sans 3 text.
- **Signature elements:** section headers drawn as arched gateways, the journey drawn as pavilions along a path, and six lamps that light in the hero.
- *Change:* the tokens at the top of `assets/css/app.css`.

**D-71 Chart colours.** Categorical series use three validated hues in fixed order: #9B3440, #B5832A and #2A8259. Status colours (red, amber, green, gold, grey) are kept for levels and statuses only, and always have a text label. *Change:* `PAL` in `ui/charts.js`.

**D-72 Which records the metrics use.** See D-18. The overview, dashboard, projects and presentation use the same set of records, so their numbers always agree.

**D-73 Presentation mode.**
- **Nine slides:** purpose, cohort overview, journey, 70-20-10, competency framework, projects, a participant example, governance and approval requested.
- **The participant example** is the participant furthest along in readiness, with the highest completeness.
- **Navigation:** arrow keys, Page Up and Page Down, Home and End; Escape exits.
- **Hidden:** upload and administration. The SAMPLE, ACTUAL or MIXED status and the data-as-of date are always shown.
- *Change:* `ui/present.js`.

**D-74 Print HOD Summary.**
- **Included:** hero, executive overview, journey, 70-20-10, the mandala and framework (showing each anchor's Level 3 descriptor), the project summary (metrics, charts and the impact table), governance, approval and the closing statement. This comes to about 23 A4 pages with the sample data.
- **Left out:** the participant gallery, the full dashboard, individual project cards and chart data tables.
- A normal browser print (Ctrl+P) prints everything except Upload Data.
- Closed sections are opened for printing and closed again afterwards.
- "Save HOD Summary as PDF" uses the browser's print dialog.
- *Change:* the `hod-skip` class in `index.html` and the `ui/*.js` files, and `@media print` in `app.css`.

**D-75 Print Participant Profile.** It prints all nine profile sections for one person, one after another, with the timeline in two columns.

**D-76 Exports.**
- **Database:** full JSON for backup and restore.
- **Dashboard Data:** JSON with the KPIs, participant summaries and projects, without emails.
- **Participants:** CSV of the current gallery filter, or of the metric set from Upload Data, without emails and protected against formula injection.
- **Templates:** a blank CSV or Excel template for each dataset type.

There is no image-snapshot button, as the brief asks.

**D-77 HOD approval panel.** There are 11 items, each with four statuses, a reviewer name and a date. The statuses are saved only in this browser. They are labelled as a demonstration, not an approval record, and they are not in the database export.

**D-78 Small screens.**
- **Below 1180 px:** the navigation collapses to a menu button.
- **Below 1000 px:** the journey becomes a vertical path.
- **Below 760 px:** the profile is full screen and its header wraps.
- **Below 640 px:** the mandala switches to a compact layout with larger labels that wrap.
- **Below 440 px:** the brand shortens to "YLP Gurukul".
- There is no horizontal page scroll at 375 px.

**D-79 Accessibility.**
- Navigation: a skip link, landmarks and headings in order.
- Labels: every control is labelled, and every chart has a name, a written summary and a table.
- Keyboard: profile tabs use arrow keys, the dialog traps focus and Escape closes it, and the drop zone, journey stages and mandala petals all work with the keyboard.
- Visibility: focus outlines are visible, reduced-motion preferences are respected, and status is never shown by colour alone.

## J. Known limitations

- Tested only in Chromium, the engine in Edge and Chrome. Firefox and Safari should work but were not tested.
- The importers were built and tested against fictional files that follow the brief's column names and layouts. Real exports may use other headers. Map them in the preview, or add them to the `aliases` in `io/schema.js`.
- The approval panel and HR overrides are not an audit trail. There is no sign-in, so the app cannot know who made a change.
- Data lives in one browser on one device. Move it with the JSON export and import.
- GitHub Pages limits are listed in the README: public by default, shared storage between sites on one account, and code control through the repository.
