# Cloud access rules exist only as a reference comment, not a deployable file

> **Open question** · priority #43 · Tier 5 – Data integrity & collaboration · Source spec: `specs/004-sharing-collaboration/spec.md`

## Question
The cloud access rules exist in the repository only as a reference comment, with no deployable rules file, so the actually-deployed rules cannot be verified from the code. Where do the live rules live?

<details>
<summary>🇫🇷 Version française</summary>

Les règles d'accès cloud n'existent dans le dépôt que sous forme de commentaire de référence, sans fichier déployable, si bien que les règles réellement déployées ne peuvent être vérifiées depuis le code. Où vivent les règles en production ?

</details>

## Why this is open
**Classification:** Could not be fully traced (the as-built security boundary lives outside the repo) — with a secondary aspect of cross-file inconsistency (the in-app behaviour mirrors the comment, not a verifiable artifact).

I confirmed the premise of the question exactly. The Firestore security rules are present in the repository **only** as a copy-paste reference inside a JSDoc block comment at the top of `js/lib/valobois-firestore-sync.js` (lines 8–40). The comment is literally introduced as `Règles Firestore à publier dans la console Firebase (copier-coller) :` — i.e. it is documentation telling a human to paste these into the Firebase console, not a file that any tooling deploys.

I searched the whole repository (excluding `node_modules`/`.git`) for any deployable rules artifact and found none: there is no `firestore.rules`, no `storage.rules`, no `firebase.json`, no `firestore.indexes.json`, and no `.firebaserc`. The only place in the entire codebase that contains `rules_version` or `service cloud.firestore` is that one comment block. This means the access model in `FR-011` and the spec's "Assumptions" section ("the cloud access rules documented alongside the sync logic are the rules actually deployed") rests on an unverifiable claim: nothing in the repo proves the deployed rules match the comment, and there is no CI/deploy step that could keep them in sync. If someone edits the comment, the live project does not change; if someone edits the live project, the comment does not change. The two can silently diverge.

What I could confirm is that the **in-app code is written to mirror the commented rules**, which is why the spec treats the comment as the source of truth. The library defensively enforces the same boundary client-side: owner-only Share/Delete buttons and the shared-with query are aligned to the rule predicates. Specifically `mes-evaluations-page.js:296` queries `.where('sharedEmails', 'array-contains', emailForQuery)`, which mirrors the rule's `isSharedEditor()` test (`userEmailLower() in resource.data.sharedEmails`, comment lines 19–23); and `mes-evaluations-page.js:279` carries the explicit note `Aligné sur request.auth.token.email des règles Firestore`. The autosave path for shared editors only writes `payloadJson`/summary fields and never touches `sharedEmails`, matching `sharedEditorPayloadOnlyUpdate()` (comment lines 25–31). So the client *intends* to stay within the documented rules — but client-side checks are cosmetic; the real enforcement is whatever is deployed in the Firebase console, which is not in this repo.

What remains genuinely uncertain (and cannot be resolved by reading code): (1) whether the live Firebase project's rules actually equal the comment, (2) whether they have drifted, and (3) where the canonical copy of the deployed rules lives (Firebase console only, or some out-of-repo deployment artifact). This is the heart of the open question. It is not a manufactured doubt — the deployed security boundary is the single most security-sensitive part of the sharing feature, and it is the one part with **zero** verifiable representation in version control.

## Evidence in the code
- `js/lib/valobois-firestore-sync.js:8` — comment header `Règles Firestore à publier dans la console Firebase (copier-coller) :` confirms the rules are a manual copy-paste reference, not a deployed file.
- `js/lib/valobois-firestore-sync.js:10–40` — the full ruleset (`rules_version = '2'`, `signedIn()`, `isOwner()`, `isSharedEditor()`, `canReadEval()`, `sharedEditorPayloadOnlyUpdate()`, and the `allow read/create/update/delete` block) lives entirely inside the JSDoc comment.
- Repo-wide search: no `firestore.rules`, `storage.rules`, `firebase.json`, `firestore.indexes.json`, or `.firebaserc` exists; the only file containing `rules_version`/`service cloud.firestore` is `js/lib/valobois-firestore-sync.js` — i.e. there is no deployable artifact and nothing to verify against.
- `js/app/mes-evaluations-page.js:296` — `.where('sharedEmails', 'array-contains', emailForQuery)` mirrors the commented `isSharedEditor()` predicate client-side.
- `js/app/mes-evaluations-page.js:279` — comment `Aligné sur request.auth.token.email des règles Firestore` shows the client query is hand-aligned to the (uncommitted) rules, reinforcing that the comment is treated as the spec.
- `js/app/mes-evaluations-page.js:472,509` and `:420` — Share/Delete controls and the "Partagée" badge are gated on `isOwner`, the client-side echo of `allow delete: if isOwner(userId)` (comment line 36).
- `js/i18n/valobois-locales.js:52` — `shareSaveFailed: '... Vérifiez la connexion ou les règles Firestore.'` — the UI itself blames "les règles Firestore" on failure, confirming the deployed rules are the real gatekeeper.
- `specs/004-sharing-collaboration/spec.md:85` (Assumptions) and `:101` (Open Questions) — the spec already flags that it *assumes* the commented rules are the deployed ones and that this cannot be verified from code alone.

## What would resolve it
- Product owner / maintainer confirms where the canonical deployed rules live (Firebase console of the shared project) and exports the current live rules via `firebase deploy`/console to compare them, byte-for-byte, against the comment in `js/lib/valobois-firestore-sync.js:10–40`.
- Add a deployable `firestore.rules` (and `firebase.json`/`.firebaserc`) to the repo containing exactly those rules, so the live boundary is version-controlled and CI-deployable, then delete or down-grade the JSDoc copy to a pointer — this removes the divergence risk entirely.
- If keeping the comment-only approach, document the deployment process (who pastes it, when) and add a periodic check that the live rules still match, since no automated sync exists today.
