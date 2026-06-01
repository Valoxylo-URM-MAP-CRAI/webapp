# Feature Specification: Evaluation Library ("Mes évaluations" list page)

**Feature Branch**: `002-evaluation-library`
**Created**: 2026-06-01
**Status**: Draft (as-built documentation)
**Input**: As-built documentation of the "Mes évaluations" (My evaluations) page: listing the évaluations a diagnostician owns and those shared with them, opening one, creating a new one, deleting one, and sharing one by e-mail.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and open my evaluations (Priority: P1)

A signed-in diagnostician opens the "Mes évaluations" (My evaluations) page. It lists their évaluations (evaluations) saved in the cloud, most-recently-changed first, alongside any évaluations other people have shared with them. Each entry shows a name, when it was last changed, the study status (statut), the version, the location, the total volume in cubic metres, and the economic balance in euros when those are available. Choosing an entry opens it in the editor.

**Why this priority**: This page is the diagnostician's home for their saved work; without it they cannot find or reopen any cloud-saved évaluation.

**Independent Test**: Sign in, create at least one évaluation in the editor, open the "Mes évaluations" page, confirm the entry appears with its name, date and details, and that choosing it opens that évaluation in the editor.

**Acceptance Scenarios**:
1. **Given** a signed-in diagnostician with one or more owned évaluations, **When** the page loads, **Then** their évaluations are listed most-recently-changed first, the loading message disappears, and the toolbar appears.
2. **Given** an évaluation, **When** it is shown, **Then** its name is the operation name the diagnostician entered, or — failing that — the localized default "Évaluation".
3. **Given** an évaluation whose study status is one of the five stages, **When** it is shown, **Then** the matching French label appears: pré-diagnostic ("Pré-diagnostic"), en cours ("En cours"), finalisé ("Finalisé"), révision ("Révision"), clôturé ("Cloturé"); in English: Pre-diagnostic / In progress / Finalised / Under revision / Closed.
4. **Given** an entry is chosen, **When** it opens, **Then** the editor opens the correct évaluation, including the case where it belongs to another diagnostician who shared it, and the tool remembers which évaluation was intended so it opens even if the link is shortened.

### User Story 2 - Create a new evaluation (Priority: P1)

The diagnostician chooses "Nouvelle évaluation" (New evaluation) in the toolbar. This starts a fresh, empty évaluation and opens it in the editor.

**Why this priority**: Creating évaluations is the main productive action this page leads diagnosticians toward.

**Independent Test**: From the list page, choose "Nouvelle évaluation" and confirm a fresh, empty évaluation opens in the editor.

**Acceptance Scenarios**:
1. **Given** the toolbar is visible, **When** the diagnostician chooses "Nouvelle évaluation", **Then** the tool starts a fresh évaluation and opens the empty editor.

### User Story 3 - Share an evaluation by e-mail (Priority: P2)

For an évaluation they own, the diagnostician chooses "Partager" (Share), enters one or more e-mail addresses (one per line or separated by spaces or commas), and saves. People who sign in with one of those e-mail addresses can then open and edit the évaluation, but cannot delete it.

**Why this priority**: Collaboration is valuable but comes after creating and viewing one's own work; only the owner can share.

**Independent Test**: As the owner, open Share on an entry, enter an e-mail, save; reload and confirm the e-mail is remembered; sign in as that e-mail on another account and confirm the évaluation appears with a "Partagée" badge.

**Acceptance Scenarios**:
1. **Given** an owned entry, **When** the diagnostician chooses "Partager", **Then** a dialog opens pre-filled with the addresses it is already shared with, one per line.
2. **Given** the dialog with addresses entered, **When** the diagnostician saves, **Then** the addresses are tidied up (split apart, lower-cased, duplicates and blanks removed) and saved, and the list refreshes.
3. **Given** the share save fails, **When** it does, **Then** an error message is shown in the dialog and the Share button becomes usable again.
4. **Given** an évaluation shared with the current diagnostician (not owned by them), **When** the list is shown, **Then** it appears with a "Partagée" (Shared) badge and without Share or Delete buttons.

### User Story 4 - Delete an owned evaluation (Priority: P2)

For an évaluation they own, the diagnostician chooses "Supprimer" (Delete), confirms the irreversible action, and the évaluation is removed from the cloud and from the list.

**Why this priority**: Cleanup is needed but lower-risk to defer than viewing and creating; only the owner can delete.

**Independent Test**: As the owner, choose Delete on an entry, confirm the warning, and verify the entry disappears and stays gone after reload.

**Acceptance Scenarios**:
1. **Given** an owned entry, **When** the diagnostician chooses "Supprimer" and confirms the warning, **Then** the évaluation is deleted and the list refreshes.
2. **Given** the confirmation is dismissed, **When** the diagnostician cancels, **Then** nothing is deleted.
3. **Given** the delete fails, **When** it does, **Then** an error message is shown and the Delete button becomes usable again.

### Edge Cases

- **Not signed in**: A visitor who is not signed in is sent to the account page, set to return here after signing in.
- **Online account service unavailable**: If the cloud cannot be reached or is not set up, a setup hint and a "not configured" message are shown, and no list is attempted.
- **Empty library**: When there are no owned or shared évaluations, the message "Aucune évaluation enregistrée dans le nuage pour ce compte." is shown.
- **Shared list unavailable**: If the search for shared évaluations is refused, the page quietly falls back to showing only the diagnostician's own évaluations; any other failure of that search shows a "could not load the list" message.
- **Owned list fails to load**: If the diagnostician's own évaluations cannot be loaded, a "could not load the list" message is shown.
- **No duplicates**: An évaluation the diagnostician owns is never also shown as shared with them.
- **Owner's e-mail unknown**: If the signed-in diagnostician's e-mail cannot be determined, only their owned évaluations are listed (no shared search is run).
- **Detail gating**: Total volume is shown only when it is greater than zero (to three decimals, in cubic metres); economic balance only when greater than zero (rounded, in euros); status only for the five known stages; version and location only when present.
- **Date display**: The last-changed date and time are shown in the active language's format; if no valid date is recorded, no date line is shown.
- **Language change**: Changing the interface language re-loads and re-displays the list, and re-labels the share dialog if it is open.
- **Not handled**: There is no search, filter, paging or sort control — the order is always most-recently-changed first; people an évaluation is shared with cannot delete it or re-share it; renaming happens in the editor, not here.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tool MUST require a signed-in diagnostician to view this page; a visitor who is not signed in MUST be sent to the account page, set to return here afterwards.
- **FR-002**: The tool MUST list the diagnostician's own évaluations, most-recently-changed first.
- **FR-003**: The tool MUST also find évaluations shared with the diagnostician by matching their e-mail address; if their e-mail cannot be determined, the shared search MUST be skipped.
- **FR-004**: The tool MUST combine owned and shared évaluations into one list, removing duplicates, excluding the diagnostician's own évaluations from the shared set, and ordering everything most-recently-changed first.
- **FR-005**: The tool MUST name each entry by the operation name the diagnostician entered, or the localized default name when none is set.
- **FR-006**: The tool MUST show, when available, the last-changed date and time, the study-status label, the version, the location, the total volume (in cubic metres, when greater than zero), and the economic balance (in euros, when greater than zero).
- **FR-007**: The tool MUST mark shared (not owned) entries with a "Partagée" badge and MUST NOT offer Share or Delete on them.
- **FR-008**: The tool MUST open the correct évaluation in the editor when an entry is chosen, including évaluations owned by someone else, and MUST remember which évaluation was intended so it still opens if the link is shortened.
- **FR-009**: The tool MUST provide a "Nouvelle évaluation" toolbar action that starts a fresh, empty évaluation in the editor.
- **FR-010**: The tool MUST let an owner share an évaluation through a dialog that tidies the entered e-mail addresses (splitting them apart, lower-casing, removing duplicates and blanks) and saves them, refreshing the list on success.
- **FR-011**: The tool MUST let an owner delete one of their own évaluations after a confirmation, refreshing the list on success.
- **FR-012**: The tool MUST show clear French messages for failures: when the list cannot load, when a share cannot be saved, when a delete fails, and when the online account service is unavailable.
- **FR-013**: The tool MUST quietly fall back to showing only owned évaluations when the search for shared évaluations is refused.
- **FR-014**: The tool MUST show the top-of-page status (My-evaluations link, sign-out, and the cloud-save indicator) on this page.
- **FR-015**: The tool MUST show an empty-state message when there are no évaluations, and a loading indicator until the list is ready.
- **FR-016**: The tool MUST refresh the list and re-label any open share dialog when the interface language changes, with no page reload.

### Key Entities *(include if feature involves data)*

- **Évaluation**: A saved study belonging to a diagnostician. The fields shown on this page are its name, when it was last changed, its study status (one of the five stages), its version, its location, its total volume, its economic balance, and the list of e-mail addresses it is shared with.
- **List entry**: One row in the list, marked as either owned or shared-with-me; whether it is owned decides whether Share/Delete and the "Partagée" badge appear.
- **Access model**: An owner can view, edit, share and delete their own évaluations. People an évaluation is shared with (matched by e-mail) can view and edit it, but cannot delete it or change who it is shared with. Guest (not-signed-in) work is not in the cloud at all.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in diagnostician with N owned évaluations sees all N listed, most-recently-changed first, once loading finishes.
- **SC-002**: Évaluations shared with the diagnostician's e-mail appear in the same list with a "Partagée" badge and without Share/Delete controls.
- **SC-003**: Choosing any entry opens the correct évaluation in the editor, including when it belongs to another diagnostician.
- **SC-004**: An owner can add or remove share addresses and the change is remembered across reloads; a removed address loses access.
- **SC-005**: An owner can delete an évaluation; after confirming, it disappears from the list and does not return on reload.
- **SC-006**: When the shared search is refused, the page still lists owned évaluations rather than showing a hard error.
- **SC-007**: A not-signed-in visit never shows list content — it sends the visitor to the account page, set to return here.

## Assumptions

- The cloud access rules (owner has full access; people it is shared with may edit but not delete or re-share) are the deployed rules.
- The editor consumes the "open this évaluation" intent produced here; this spec covers only how the list page produces it.

## Source Files

- `mes-evaluations.html` — The list page: toolbar (New evaluation), the list itself, the loading/empty/error/setup-hint areas, and the top-of-page status.
- `js/app/mes-evaluations-page.js` — Drives the page: requires sign-in, loads owned and shared évaluations, combines and orders them, shows each entry's details, the share dialog, deletion with confirmation, and language re-display.
- `js/lib/firebase-app-auth.js` — Connects to the online account and cloud services used by the page.
- `js/lib/valobois-firestore-sync.js` — The editor-side counterpart that saves évaluation details and the shared-with list, and documents the cloud access rules.
- `js/i18n/valobois-locales.js` — French and English text for status labels, share/delete actions, and error messages.
- `js/app/auth-header.js` — Draws the top-of-page status on this page.

## Open Questions

- **Created date not shown**: The list shows only when an évaluation was last changed; a "created" date exists on évaluations but is not displayed — confirm no "created" column is wanted.
- **Sharing hint differs FR vs EN**: The French sharing hint mentions "comptes Valoxylo" and that no e-mail is sent; the English hint is shorter and says invitees must sign in with the same e-mail. Which wording is authoritative?
- **No way to leave a shared évaluation**: A person an évaluation is shared with has no way to hide or remove it from their own list; confirm this is intended.
- **Status stages**: The status is shown only for the five known stages; an unexpected value shows no status, silently. Confirm the editor only ever records one of the five stages.
- **Concurrent edits**: Sharing and deleting simply refresh the whole list; there is no special handling when an owner and a shared editor change the same évaluation at once (last change wins). Confirm this is acceptable.
