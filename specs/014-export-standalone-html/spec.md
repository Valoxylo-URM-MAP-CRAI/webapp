# Feature Specification: Self-contained HTML Copy (HTML autonome / « Sauvegarder »)

**Feature Branch**: `014-export-standalone-html`
**Created**: 2026-06-01
**Status**: Draft (as-built documentation)
**Input**: As-built documentation of the self-contained HTML copy — both the in-app save and the command-line build

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Produce a one-file copy from the command line (Priority: P1)

A developer or integrator runs the project's build command to obtain a single HTML file that bundles the app's own styles and scripts into one document, so the VALOBOIS interface can be copied around as a single file instead of a folder full of files.

**Why this priority**: This is the fully working, reproducible path in the shipped code, and the one the README documents step by step.

**Independent Test**: Run the build command, confirm a single HTML file is written, and confirm that opening it (served over a web address) shows the app with its own styles and scripts built in, while the online libraries still load from the network.

**Acceptance Scenarios**:
1. **Given** the project files, **When** the build runs, **Then** a single self-contained HTML file is written and its location is reported.
2. **Given** the app uses its own local stylesheet, **When** the build runs, **Then** that stylesheet is pulled into the file directly.
3. **Given** the app uses its own local scripts, **When** the build runs, **Then** those scripts are pulled into the file directly.
4. **Given** the app refers to an online resource, **When** the build runs, **Then** that reference is left as-is and still loads from the network.
5. **Given** the command-line build is run normally (without supplying an evaluation), **When** it runs, **Then** no evaluation data is embedded in the file.

### User Story 2 - Save the current evaluation as a one-file copy from the app (Priority: P2)

A user working in the live app wants to download a one-file HTML snapshot that also carries the current évaluation (evaluation) inside it, so the file reopens already loaded with that work.

**Why this priority**: The in-app builder exists, is loaded by the app, and the reopening side knows how to read embedded data — but no visible button in this version actually triggers it (see Open Questions). The README describes this as « Sauvegarder » (Save), yet no control is wired to it here.

**Independent Test**: Serve the app over a web address, trigger the in-app save with an evaluation, save the result as an HTML file, reopen it (again over a web address), and confirm the app starts with that evaluation restored.

**Acceptance Scenarios**:
1. **Given** the app is served over a web address and the save is triggered, **When** it finishes, **Then** the file built carries the app's own styles and scripts inside it, with online resources left external — the same result as the command-line build.
2. **Given** an evaluation is supplied, **When** the file is built, **Then** that evaluation is embedded inside the file.
3. **Given** the file is reopened, **When** the app starts, **Then** it finds the embedded evaluation, saves it locally, and uses it as the working evaluation.
4. **Given** the source app has any open dialog overlays, **When** the file is built, **Then** they are hidden so the saved file does not open with a dialog showing.
5. **Given** one of the app's own files cannot be loaded while building, **When** building from the app, **Then** the save fails with a clear "loading failed" message naming the file.

### Edge Cases

- **Opened directly as a local file (not over a web address)**: the in-app save needs to read the app's files, which browsers block when the page is opened directly from disk. The README states the app must be served over a web address (not opened directly as a local file) for the « Sauvegarder » path, and that on failure it should point the user to the command-line build instead. (No safeguard for this ships in the code — see Open Questions.)
- **No internet**: both the one-file copy and the live app still load their charts and PDF/label tools from online libraries. Those are NOT built into the file, so charts and PDF/label export need internet even from the one-file copy. The README warns about this explicitly.
- **Barcode/QR tools**: these come from the app's own local files, so they ARE built into the one-file copy and work offline — unlike the online libraries.
- **Very large evaluations**: an embedded evaluation is stored inside the file with no size limit, so a big evaluation makes a big file, but nothing is cut.
- **Scripts that contain text resembling a script end-tag**: handled so they do not break the file.
- **Several stylesheets/scripts**: all of the app's own stylesheets and scripts are pulled in.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide a command-line build that reads the source page and writes a single self-contained HTML file, creating the output folder if needed.
- **FR-002**: The command-line build MUST locate the project's files correctly relative to itself.
- **FR-003**: Both the command-line build and the in-app save MUST pull every one of the app's own stylesheets directly into the file.
- **FR-004**: Both MUST pull every one of the app's own scripts directly into the file, safely.
- **FR-005**: Both MUST leave online resources as external references, unchanged.
- **FR-006**: When an evaluation is supplied, both MUST embed it inside the file so it can be restored on reopening.
- **FR-007**: When no evaluation is supplied, both MUST leave any evaluation data out (the normal command-line build supplies none).
- **FR-008**: Both MUST hide any open dialog overlays so the saved file does not open showing a dialog.
- **FR-009**: The in-app save MUST be available from the running app and resolve the app's own files relative to the current page.
- **FR-010**: The in-app save MUST fail with a clear "loading failed" message naming the file when one of the app's own files cannot be loaded.
- **FR-011**: On reopening, the app MUST detect the embedded evaluation, save it locally (primary and backup copies), and use it as the working evaluation.
- **FR-012**: The online libraries (charts, PDF tools) MUST stay as external references in both the source and the one-file copy — they are not built in.

### Key Entities *(include if data)*

- **Self-contained HTML document**: the full app page with its own styles and scripts built in, an optional embedded evaluation, and open dialog overlays hidden.
- **Embedded evaluation**: a snapshot of the évaluation (evaluation) stored inside the file and read once when the file is reopened.
- **One-file output**: the single HTML file produced by the command-line build (its output folder is regenerated after each clone, per the README).
- **Builder inputs**: an optional evaluation (in-app); the project location and an optional evaluation (command line).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the command-line build, exactly one self-contained HTML file exists, with none of the app's own styles/scripts left as separate references (all built in).
- **SC-002**: The one-file copy still references the online libraries (charts, PDF tools) externally.
- **SC-003**: Opening the one-file copy with no internet shows the layout and styling (own styles/scripts built in, including barcode/QR tools) but cannot render charts or PDF/label exports (those need the online libraries).
- **SC-004**: A one-file copy built with an evaluation reopens with that évaluation restored (visible in the editor and saved locally).
- **SC-005**: No dialog is visible when a one-file copy is first opened.

## Assumptions

- The in-app save and the command-line build deliberately mirror each other and run the same steps in the same order (built-in styles, built-in scripts, embedded evaluation, hidden dialogs).
- "The app's own files" means files served from the app itself, as opposed to online resources.
- The README's « Sauvegarder » section describes the intended in-app save even though no control triggers it in this version.

## Source Files

- `scripts/build-standalone.mjs`
- `scripts/lib/build-standalone-html.mjs`
- `js/lib/build-standalone-html.js`
- `index.html`
- `js/app/valobois-app.js`
- `package.json`
- `README.md`

## Open Questions

- **No visible button for the in-app save**: the in-app builder is present and loaded, and reopening with an embedded evaluation works, but there is no committed button or control that actually triggers the save (no download wiring, no "Save HTML" control). The README describes a « Sauvegarder » action — and a fallback message pointing to the command-line build on failure — but neither the trigger nor that fallback message is present in this version. This looks like partly-finished functionality.
- **Fallback message not implemented**: the README's stated failure message (pointing the user to the command-line build) has no implementation in the shipped code; the in-app save only reports the "loading failed" message. The user-facing fallback wording is unconfirmed.
- **Opened-as-local-file behaviour**: not enforced in code — the "serve over a web address" requirement is documentation only; the actual failure simply shows up as a loading failure in the browser.
- **Restoring embedded data on older browsers**: the embedded evaluation relies on an older text-encoding approach; it works in current browsers but is the only path provided.
