# No way to leave or hide an évaluation shared with you

> **Open question** · priority #45 · Tier 5 – Data integrity & collaboration · Source spec: `specs/002-evaluation-library/spec.md`

## Question
Someone an evaluation is shared with has no way to hide or remove it from their own list. Confirm this is intended.

<details>
<summary>🇫🇷 Version française</summary>

Une personne avec qui une évaluation est partagée n'a aucun moyen de la masquer ou de la retirer de sa propre liste. Confirmer que c'est voulu.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (the code is unambiguous; only the desirability of the behaviour is open).

The code resolves the *mechanical* question completely: there is no leave/hide affordance for a shared évaluation, and this is enforced at two layers, not just omitted from the UI by oversight.

1. **UI layer — no control is rendered for shared entries.** In `js/app/mes-evaluations-page.js`, each row's action buttons are built only when the entry is owned. Both the Share button (`if (isOwner)` at line 472) and the Delete button (`if (isOwner)` at line 509) are gated on `isOwner`. Shared entries are flagged `isOwner: false` (line 370). The *only* thing rendered specifically for a non-owned entry is a read-only "Partagée" badge (`if (!isOwner)` at lines 420–425). So a shared évaluation appears in the viewer's list with a clickable title link and a badge, and nothing else — no "leave", "hide", "remove from my list", or "delete" control of any kind.

2. **Data layer — a shared editor is forbidden from removing themselves or deleting the doc.** The Firestore security rules documented in `js/lib/valobois-firestore-sync.js` (lines 10–40) make the omission deliberate rather than accidental: `allow delete: if isOwner(userId)` (line 36) lets only the owner delete, and `sharedEditorPayloadOnlyUpdate()` (lines 25–31) explicitly *pins* the share list — `request.resource.data.sharedEmails == resource.data.sharedEmails` (line 27) — and restricts a shared editor's writes to a whitelist of content fields (`payloadJson`, `revision`, `updatedAt`, `operationName`, `statutEtude`, `versionEtude`, `localisation`, `volumeTotal`, `bilanEconomique`) via `hasOnly([...])` (lines 28–30). A shared user therefore cannot even rewrite `sharedEmails` to drop their own address; the rules would reject it. So there is no client-side workaround either.

3. **No per-viewer "hidden" state exists in the data model.** Membership in the shared set is derived purely from the owner's `sharedEmails` array (queried by `where('sharedEmails', 'array-contains', emailForQuery)` at `js/app/mes-evaluations-page.js:296`). A repo-wide grep finds no `hiddenBy` / `dismissedBy` / `leaveShare` / per-viewer dismissal field anywhere, and the i18n catalogue (`js/i18n/valobois-locales.js`) contains no `leave`/`hide`/`quitter`/`masquer`/`retirer` strings — only the `sharedBadge` label (lines 53 and 154). There is no latent or half-built mechanism for a viewer to suppress an entry.

The spec already documents this as as-built behaviour and as an open question: `specs/002-evaluation-library/spec.md:74` ("people an évaluation is shared with cannot delete it or re-share it") and `:101` ("People an évaluation is shared with ... cannot delete it or change who it is shared with"), with the matching open question at `:133`. The access-model assumption at `:117` says these are the deployed rules.

**What is confirmed:** A shared viewer has no UI and no data-layer path to remove or hide a shared évaluation; this is enforced by both the page logic and the documented security rules — it is not a UI oversight. **What remains uncertain:** purely a product decision — whether the owner-only access model is intentional, or whether a viewer should be able to decline/hide a share (which would require a new per-viewer field plus rule and UI changes). This is not a bug.

## Evidence in the code
- `js/app/mes-evaluations-page.js:472` — Share button rendered only `if (isOwner)`.
- `js/app/mes-evaluations-page.js:509` — Delete button rendered only `if (isOwner)`.
- `js/app/mes-evaluations-page.js:420-425` — shared entries get only a read-only "Partagée" badge, no action control.
- `js/app/mes-evaluations-page.js:357-373` — shared docs are pushed with `isOwner: false`; the only viewer-specific branch is the badge.
- `js/app/mes-evaluations-page.js:296` — shared list is derived from the owner's `sharedEmails` array (`array-contains` on the viewer's e-mail); membership is owner-controlled.
- `js/lib/valobois-firestore-sync.js:36` — `allow delete: if isOwner(userId)` — only the owner can delete.
- `js/lib/valobois-firestore-sync.js:27` — shared-editor updates must keep `sharedEmails` unchanged, so a viewer cannot drop their own e-mail.
- `js/lib/valobois-firestore-sync.js:28-30` — shared-editor writes restricted to content fields via `hasOnly([...])`, excluding `sharedEmails`.
- `js/i18n/valobois-locales.js:53,154` — only a `sharedBadge` string exists; no leave/hide/remove labels (grep finds none).
- `specs/002-evaluation-library/spec.md:74,101,117,133` — spec documents owner-only delete/re-share, the access model, and this very open question.

## What would resolve it
- Product owner confirms the intended access model: is "owner-only control; a viewer can never remove or hide a shared évaluation" the desired behaviour, or should a viewer be able to decline/hide a share?
- If "decline/hide" is wanted: scope a new per-viewer mechanism (e.g. a `hiddenBy: [uid]` array filtered out at render time, or letting a shared editor remove their own e-mail from `sharedEmails`), which requires changes to (a) the Firestore rules in `js/lib/valobois-firestore-sync.js` to permit that specific write, and (b) the render/actions block in `js/app/mes-evaluations-page.js` to add the control.
- If the current behaviour is confirmed intended: close this question; no code change needed.
