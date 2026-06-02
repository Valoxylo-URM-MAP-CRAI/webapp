# Feature Specification: Cloud Sync & Persistence

**Feature Branch**: `003-cloud-sync-persistence`
**Created**: 2026-06-01
**Status**: Draft (as-built documentation)
**Input**: As-built documentation of how an évaluation is saved automatically to the cloud when signed in, kept only in this browser when used as a guest, how the save status is shown, and how an open évaluation is recovered.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Signed-in autosave to the cloud (Priority: P1)

A signed-in diagnostician opens an évaluation (evaluation) from the library, edits fields in the editor, and every change is saved to the cloud automatically — there is no "save" button to press. The indicator at the top of the page shows the progress: Sauvegarde… (Saving…) / Sauvegardé (Saved) / Échec sauvegarde (Save failed).

**Why this priority**: Durable, multi-device saving of an évaluation is the core value of being signed in. Without it, the tool is only a local-only tool.

**Independent Test**: Sign in, open an évaluation, change the operation name, watch the indicator move from "Sauvegarde…" to "Sauvegardé", reload the page, and confirm the change is still there.

**Acceptance Scenarios**:

1. **Given** a signed-in diagnostician editing a cloud évaluation, **When** any change is made, **Then** a copy is kept in this browser for safety and a save to the cloud is queued automatically.
2. **Given** a queued save, **When** editing pauses briefly, **Then** the évaluation and its summary details (status, version, location, total volume, economic balance) are saved to the cloud, stamped with the current time.
3. **Given** rapid successive changes, **When** they follow one another closely, **Then** only one save to the cloud happens once editing settles, rather than one per keystroke.
4. **Given** a save, **When** it succeeds, **Then** the indicator shows "Sauvegardé"; **When** it fails, **Then** the indicator shows "Échec sauvegarde".

### User Story 2 - Guest use kept only in this browser (Priority: P1)

A diagnostician who is not signed in (or who is using a deployment where the cloud is not set up) uses the editor. Their évaluation is kept only in this browser; nothing is sent to the cloud.

**Why this priority**: The tool must stay fully usable without an account; the cloud is an opt-in upgrade that requires signing in.

**Independent Test**: Without signing in, edit the évaluation, reload the page, and confirm the work is still there from this browser.

**Acceptance Scenarios**:

1. **Given** nobody is signed in (or the cloud is unavailable), **When** the editor starts, **Then** it works in guest mode and loads any work previously kept in this browser.
2. **Given** guest mode, **When** a change is made, **Then** the work is kept in this browser (with a backup copy) and nothing is sent to the cloud.
3. **Given** the primary copy in this browser is missing or unreadable but the backup is good, **When** the editor loads, **Then** it restores from the backup and rewrites the primary copy.
4. **Given** a signed-in diagnostician signs out, **When** they do, **Then** the editor switches to guest mode, stops any pending cloud saves, forgets the last-open cloud évaluation, and reloads the work kept in this browser.

### User Story 3 - Recovering the open évaluation (Priority: P2)

A signed-in diagnostician opens the editor but the link's details about which évaluation to open are lost (for example, the address gets shortened by the server). The tool re-applies which évaluation (and which owner) was intended, or falls back to the browser-kept copy if the cloud cannot be reached.

**Why this priority**: This adds resilience against shortened links and brief cloud hiccups, but the normal flow (with the full link intact) already works without it.

**Independent Test**: From the library, choose an évaluation, simulate the link being shortened, and confirm the editor still opens the correct évaluation from the remembered intent.

**Acceptance Scenarios**:

1. **Given** the link no longer says which évaluation to open and there is no "new évaluation" intent, **When** a remembered intent exists, **Then** the tool re-applies which évaluation and owner to open.
2. **Given** reading an évaluation from the cloud fails, **When** a browser-kept copy exists for it, **Then** the editor loads from that copy instead.
3. **Given** a shared évaluation that cannot be found in the cloud, **When** a browser-kept copy exists, **Then** that copy is used; **otherwise** the diagnostician is sent back to the library.

### User Story 4 - Creating and resetting a cloud évaluation (Priority: P2)

A signed-in diagnostician creates a brand-new évaluation from the library, or resets the current one to blank.

**Why this priority**: These are the entry and exit points for cloud évaluations; secondary to editing existing ones.

**Acceptance Scenarios**:

1. **Given** the diagnostician chooses "Nouvelle évaluation", **When** the editor opens, **Then** it clears any leftover guest work, starts a fresh évaluation in the cloud, and shows it as the open one.
2. **Given** the owner chooses "Réinitialiser" (Reset) on a cloud évaluation, **When** they do, **Then** the évaluation is cleared back to blank in the cloud; for someone editing a shared évaluation (not the owner), Reset does nothing to the owner's évaluation (it only stops any pending saves).
3. **Given** guest mode, **When** "Réinitialiser" is chosen, **Then** the work kept in this browser is cleared and started fresh. The Reset button is shown only in guest mode.

### Edge Cases

- **Cloud not set up / unavailable**: When the cloud cannot be reached, the editor falls back to guest mode and the save indicator is hidden.
- **Signed in but opening the editor with no évaluation and no "new" intent**: The diagnostician is sent to the library.
- **Changes made while the évaluation is still loading**: Those saves are held until loading finishes, then sent as a single save.
- **Already signed in as the same person**: Re-confirming the same identity does not re-load the évaluation needlessly.
- **Unreadable cloud copy**: If a cloud copy cannot be read, the editor keeps its current state rather than wiping it.
- **Display-only settings**: Purely visual settings (such as which panels are expanded) are not saved to the cloud and are removed before saving.
- **Not handled**: There is no conflict resolution — if an owner and a shared editor change the same évaluation at once, the last change wins. There is no automatic retry of a failed save beyond the single browser-kept copy.
- **Study-status value**: The summary "status" saved alongside the évaluation can end up as the first stage (pré-diagnostic) when the underlying value is text rather than a stage number — see Open Questions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tool MUST start in guest mode and load any work previously kept in this browser.
- **FR-002**: The tool MUST switch to cloud saving only when a diagnostician is signed in, they are in the editor, and an évaluation is specified (or a "new évaluation" is being started).
- **FR-003**: In guest mode, the tool MUST keep work in this browser (with a backup copy) and MUST NOT contact the cloud.
- **FR-004**: In cloud mode, each change MUST keep a safety copy in this browser and queue an automatic save to the cloud.
- **FR-005**: Cloud saves MUST be batched so that a burst of rapid changes results in a single save once editing settles.
- **FR-006**: Cloud saves MUST be written to the owning diagnostician's évaluation — the original owner when editing a shared évaluation, otherwise the signed-in diagnostician.
- **FR-007**: Each cloud save MUST store the full évaluation plus its summary details: the operation name, study status, version, location, total volume, economic balance, and the time of the change.
- **FR-008**: Ongoing edits MUST update the existing évaluation; creating a new évaluation MUST create a fresh one.
- **FR-009**: The tool MUST leave purely visual settings (such as expanded/collapsed panels) out of what is saved, both when saving and when loading.
- **FR-010**: When loading an évaluation, the tool MUST apply the saved work only when it looks like a real évaluation (it contains lots), re-tidying it (default fields, per-lot essence and lotting) before showing it.
- **FR-011**: The tool MUST drive the save indicator: "saving" while a save is queued or in progress, "save failed" when the last save failed, "saved" otherwise, and hidden outside cloud mode or while loading.
- **FR-012**: The tool MUST recover which évaluation (and owner) to open from the remembered intent when the link no longer says, unless a "new évaluation" is being started.
- **FR-013**: The tool MUST fall back to the browser-kept copy when a cloud read fails or a shared évaluation cannot be found; if there is no copy for a missing shared évaluation, it MUST send the diagnostician to the library.
- **FR-014**: Changes made while the évaluation is still loading MUST be held and saved once, after loading finishes.
- **FR-015**: On sign-out, the tool MUST stop pending saves, forget the last-open cloud évaluation, switch to guest mode, and reload the work kept in this browser.
- **FR-016**: Entering cloud mode MUST clear any leftover guest work so it does not linger alongside the cloud évaluation.
- **FR-017**: Reset MUST, in guest mode, clear the work kept in this browser; in cloud mode (owner only), clear the cloud évaluation back to blank; for a shared editor it MUST NOT delete the owner's évaluation.

### Key Entities *(include if feature involves data)*

- **Cloud évaluation**: A diagnostician's saved study in the cloud. It holds the full évaluation contents plus summary details used by the library: the time it was last changed (drives ordering and display), the operation name, the study status, the version, the location, the total volume (summed across lots), the economic balance (summed across lots), and the list of e-mail addresses it is shared with (managed by the sharing feature, spec 004).
- **Work kept in this browser (guest)**: A primary copy and a backup copy of the current évaluation, used when nobody is signed in.
- **Browser-kept safety copy (cloud mode)**: A local copy of a cloud évaluation, saved on every cloud save and used to recover if the cloud cannot be read.
- **Remembered "what to open" intent**: Which évaluation (and owner) to open, or whether to start a new one — used to recover after a shortened link.
- **What is and isn't saved to the cloud**: Only the évaluation contents and its summary details are saved; purely visual settings are never sent to the cloud.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in change results in a single cloud save once editing settles, even after a burst of changes.
- **SC-002**: After a reload in cloud mode, the editor shows the last saved évaluation contents.
- **SC-003**: A guest's work survives a reload, and is recoverable from the backup if the primary copy is unreadable.
- **SC-004**: The save indicator moves Sauvegarde… → Sauvegardé on success and shows Échec sauvegarde on a failed save.
- **SC-005**: Purely visual settings never appear in what is saved to the cloud.
- **SC-006**: When the cloud is not set up, the tool stays fully usable in guest mode with the save indicator hidden.

## Assumptions

- The cloud access rules documented alongside the sync logic are the rules actually deployed.
- One editor session edits one évaluation at a time; editing the same évaluation in two tabs at once is not coordinated.
- Browser storage is available; if it ever fails, the failure is ignored rather than crashing the editor.

## Source Files

- `js/lib/valobois-firestore-sync.js` — The cloud-sync logic: choosing guest vs. cloud, batching saves, loading/creating/saving, the browser-kept fallback, recovery, and the save-status updates; also holds the cloud access rules as a reference comment.
- `js/config/firebase-config.js` — Settings for the cloud service.
- `js/lib/firebase-app-auth.js` — Connects to the online account and cloud services.
- `js/app/valobois-app.js` — The évaluation model and saving: loading/reloading guest work, saving, preparing what gets saved, tidying loaded work, creating a fresh évaluation, the persistence UI, and reset.
- `js/app/valobois-constants.js` — Names of the browser-storage entries used for guest work and safety copies.
- `js/app/auth-header.js` — Draws the save-status indicator at the top of the page.
- `js/i18n/valobois-locales.js` — French and English text for the save indicator.
- `index.html` — The editor page, including starting a new évaluation and the Reset button.
- `mes-evaluations.html` — The library page.

## Open Questions

- The "created" date mentioned in the documentation prompt is not actually recorded by the tool when saving; it may come from elsewhere or simply be absent. Unconfirmed.
- The summary study-status saved alongside an évaluation can default to the first stage (pré-diagnostic) when the underlying value is text rather than a stage number, while the library expects a stage number. The intended source of the stage number is unclear (a possibly half-migrated field).
- There is no conflict handling: an owner and a shared editor changing the same évaluation at once means the last change wins. Confirm this is acceptable.
- A failed cloud save is not retried automatically beyond the single browser-kept copy. Confirm no automatic retry is expected.
