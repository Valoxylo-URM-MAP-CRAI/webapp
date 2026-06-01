# Feature Specification: Sharing & Collaboration

**Feature Branch**: `004-sharing-collaboration`
**Created**: 2026-06-01
**Status**: Draft (as-built documentation)
**Input**: As-built documentation of sharing an évaluation by e-mail, giving others the right to view and edit it but not delete it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owner shares an évaluation with other accounts (Priority: P1)

The owner of an évaluation (evaluation), on the "Mes évaluations" (My evaluations) library, chooses "Partager" (Share) on one of their évaluations, enters one or more e-mail addresses of other accounts, and saves. Those accounts then see the évaluation in their own library under a "Partagée" (Shared) badge and can open and edit it.

**Why this priority**: Sharing is the whole feature; collaborating on an évaluation depends on the owner recording who it is shared with.

**Independent Test**: As the owner, open the share dialog, add an e-mail, save, and confirm the shared-with list is updated and the dialog re-shows that e-mail when reopened.

**Acceptance Scenarios**:

1. **Given** the owner viewing their library, **When** they choose "Partager" on an évaluation, **Then** a dialog opens pre-filled with the addresses it is already shared with, one per line.
2. **Given** the dialog open, **When** the owner enters addresses (separated by spaces, commas, semicolons, or new lines) and saves, **Then** the addresses are tidied into a lower-cased, trimmed, duplicate-free list and recorded on the évaluation.
3. **Given** a successful save, **When** it completes, **Then** the dialog closes and the library refreshes.
4. **Given** the save fails, **When** it does, **Then** the Share button becomes usable again and an inline message is shown: "Enregistrement du partage impossible. Vérifiez la connexion ou les règles Firestore."
5. **Given** the owner clears all addresses and saves, **When** the shared-with list becomes empty, **Then** sharing is revoked for everyone.

### User Story 2 - Shared editor opens and edits a shared évaluation (Priority: P1)

A signed-in diagnostician whose e-mail an évaluation is shared with sees it in their library (badged "Partagée"), opens it, and can edit it — their changes are saved back to the owner's évaluation automatically — but cannot delete it.

**Why this priority**: View-and-edit access for the people an évaluation is shared with is the point of sharing; without it, sharing would only be a note of names.

**Independent Test**: As a non-owner whose e-mail is shared, open the library, confirm the "Partagée" badge and the absence of Share/Delete buttons, open the évaluation, edit a field, and confirm the change is saved to the owner's évaluation.

**Acceptance Scenarios**:

1. **Given** a signed-in diagnostician, **When** the library loads, **Then** évaluations shared with their e-mail are found and combined with their own, with no duplicates.
2. **Given** a shared évaluation row, **When** it is shown, **Then** it carries a "Partagée" badge and offers neither a "Partager" nor a "Supprimer" button (both are owner-only).
3. **Given** a shared évaluation, **When** the shared editor opens it, **Then** the editor loads the owner's évaluation and saves edits back to that same owner's évaluation automatically.
4. **Given** a shared editor's automatic save, **When** it writes, **Then** it changes only the évaluation contents and summary details and leaves the shared-with list untouched.

### Edge Cases

- **Shared search refused**: If the search for shared évaluations is refused, the library quietly degrades — a warning is logged and only the diagnostician's own évaluations are shown.
- **Owner's own e-mail in the shared-with list**: If an owner shares an évaluation with their own e-mail, it is still shown only once (not as a duplicate "Partagée" copy).
- **Owner's e-mail unknown**: If the signed-in diagnostician's e-mail cannot be determined, the shared search is skipped and only their own évaluations are listed.
- **Shared editor tries to reset**: A shared editor choosing Reset does nothing to the owner's évaluation — it does not delete it.
- **Case-insensitive matching**: Addresses are matched ignoring upper/lower case (lower-cased both when saved and when searched).
- **By design**: No e-mail is actually sent to the addresses entered (the dialog hint says so); sharing only grants in-app access to people who already have an account. Everyone an évaluation is shared with gets the same view-and-edit rights (no per-person granularity). Shared editors cannot delete. There is no conflict resolution between owner and shared editors — the last change wins (see spec 003).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The "Partager" action MUST be offered only for évaluations the diagnostician owns.
- **FR-002**: The share dialog MUST pre-fill with the addresses the évaluation is already shared with, one per line.
- **FR-003**: The tool MUST tidy entered text into a trimmed, lower-cased, duplicate-free list of e-mail addresses, splitting on spaces, commas, semicolons, and new lines.
- **FR-004**: Saving a share MUST record the list of addresses on the owner's évaluation.
- **FR-005**: On a successful share-save, the tool MUST close the dialog and refresh the library; on failure it MUST re-enable the button and show the inline share error.
- **FR-006**: The library MUST combine the diagnostician's own évaluations (most-recently-changed first) with évaluations shared with their e-mail address, removing duplicates and ordering everything most-recently-changed first.
- **FR-007**: Shared rows MUST show a "Partagée" badge and MUST NOT offer Share or Delete.
- **FR-008**: When an évaluation belongs to someone else, the link that opens it MUST identify the owner so the editor opens the right one; links to one's own évaluations need not.
- **FR-009**: A refused shared search MUST be tolerated (log a warning, fall back to owned-only); any other failure of the shared search, or any failure loading one's own évaluations, MUST show the "could not load the list" error.
- **FR-010**: The tool MUST use the signed-in diagnostician's e-mail address (matched ignoring case) to find shared évaluations, and skip the shared search when no e-mail can be determined.
- **FR-011** (access model, enforced by the deployed cloud rules): a signed-in diagnostician may view an évaluation if they own it or their e-mail is in its shared-with list; may create only their own; may edit if they own it or it is shared with them (and that edit leaves the shared-with list untouched and changes only the évaluation contents and summary details); and may delete only if they own it.

### Key Entities *(include if feature involves data)*

- **Shared-with list**: The trimmed, lower-cased, duplicate-free e-mail addresses an évaluation is shared with, granting view-and-edit access. Set only by the owner through the share dialog, and matched against a viewer's e-mail.
- **Library row**: One entry in the library, marked as owned or shared, showing the évaluation's summary details (name, status, version, location, total volume, economic balance, last-changed time).
- **Access roles**: the owner (full access); a shared editor (their e-mail is in the shared-with list, granting view and edit but not delete or re-share).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After an owner shares an évaluation with e-mail X, an account whose e-mail is X sees that évaluation in their library with a "Partagée" badge.
- **SC-002**: A shared editor can open and save edits to the owner's évaluation, and the shared-with list is unchanged by those edits.
- **SC-003**: A shared editor sees no Share or Delete controls and cannot delete the owner's évaluation.
- **SC-004**: E-mail input in any form (commas, spaces, semicolons, new lines, mixed case, duplicates) collapses to the same tidy, lower-cased list.
- **SC-005**: When the shared search is refused, the library still shows the diagnostician's own évaluations without an error banner.
- **SC-006**: No e-mail is ever sent to the shared addresses — sharing only grants access.

## Assumptions

- The cloud access rules documented alongside the sync logic are the rules actually deployed; the in-app behaviour (hiding Delete for non-owners, leaving the shared-with list untouched on shared edits) mirrors and relies on them.
- Shared addresses correspond to people who already have an account whose e-mail matches; addresses without an account simply never gain access.
- All diagnosticians' évaluations live in one shared cloud project, so an évaluation can be matched to whoever it is shared with.

## Source Files

- `js/app/mes-evaluations-page.js` — The library logic: finding owned and shared évaluations, combining them, the "Partagée" badge, owner-only Share/Delete buttons, the share dialog, saving the shared-with list, and the owner-aware "open this évaluation" link.
- `js/lib/valobois-firestore-sync.js` — The cloud access rules (as a reference comment) defining owner vs. shared-editor access; loading and editing a shared évaluation; and the shared-editor reset doing nothing.
- `js/app/valobois-app.js` — The editor saving that writes a shared editor's changes back to the owner's évaluation (see spec 003 for the autosave detail).
- `js/i18n/valobois-locales.js` — French and English text for the share dialog, the "Partagée" badge, the share error, and the status labels.
- `mes-evaluations.html` — The library page and its "Nouvelle évaluation" link.

## Open Questions

- The share dialog wording uses "Membres" / "comptes Valoxylo" while the tool is branded VALOBOIS elsewhere — a terminology inconsistency, not a behaviour bug.
- The shared search could be refused if another, unrelated collection of the same name exists in the cloud project; whether such a clash exists is unconfirmed (the tool defensively falls back to owned-only).
- The cloud access rules exist in the repository only as a reference comment, with no deployable rules file, so the actually-deployed rules cannot be verified from the code alone.
- There is no way to see or manage who an évaluation is shared *from*: a shared editor cannot view or change the shared-with list. Intended, but there is no read-back for shared editors.
