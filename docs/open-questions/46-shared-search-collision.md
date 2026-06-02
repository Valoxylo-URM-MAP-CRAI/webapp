# Shared-evaluations collectionGroup query could collide with a same-named collection

> **Open question** · priority #46 · Tier 5 – Data integrity & collaboration · Source spec: `specs/004-sharing-collaboration/spec.md`

## Question
The shared-evaluations lookup could be refused if an unrelated collection of the same name exists in the cloud project (the tool falls back to owned-only). Confirm whether such a clash exists.

<details>
<summary>🇫🇷 Version française</summary>

La recherche des évaluations partagées pourrait être refusée si une collection homonyme non liée existe dans le projet cloud (l'outil se replie sur « mes évaluations »). Confirmer si un tel conflit existe.

</details>

## Why this is open
**Classification:** Product-intent / deployment-config ambiguity (cannot be resolved from code alone — needs runtime / Firebase-console confirmation).

The shared-evaluations lookup is a Firestore **collectionGroup** query keyed on the bare collection name `'evaluations'`. In `js/app/mes-evaluations-page.js:294-297` the tool runs `db.collectionGroup(COL_EVAL).where('sharedEmails', 'array-contains', emailForQuery).get()`, where `COL_EVAL = 'evaluations'` (line 5). A collectionGroup query matches **every** subcollection named `evaluations` anywhere in the project tree, not only those at the intended path `users/{uid}/evaluations/{evalId}`. The deployed security rules only authorise reads at that exact path (`match /users/{userId}/evaluations/{evalId}` with `allow read: if canReadEval(userId)`, reproduced as a reference comment in `js/lib/valobois-firestore-sync.js:32-37`). If a document named `evaluations` existed at some *other* path, the collectionGroup query would try to read it, fall outside the authorised match, and Firestore would reject the **whole query** with `permission-denied`.

The code is explicitly aware of this risk: the header comment in `js/lib/valobois-firestore-sync.js:5-6` states "un collectionGroup sur le nom « evaluations » peut être refusé si d'autres collections du même nom existent dans le projet Firebase (voir dégradation silencieuse côté liste « partagées »)." That degradation is implemented at `js/app/mes-evaluations-page.js:323-339`: a `permission-denied` code on the shared promise is swallowed with `console.warn(...)` and `sharedSnap = { docs: [] }`, so the library silently shows owned-only results (matching spec FR-009 / SC-005). Any other error code instead surfaces the "could not load the list" banner.

What I **confirmed** from the code: the only two `evaluations` collection references in the entire `js/` tree are both the intended owner-scoped subcollection — `js/app/mes-evaluations-page.js:278` (`db.collection(COL_USERS).doc(user.uid).collection(COL_EVAL)`) and `js/lib/valobois-firestore-sync.js:177` (same path builder). The only other Firestore collection this app writes is a **top-level** `pieces` collection (`js/app/valobois-app.js:42594`, `db.collection('pieces')`), which has a different name and therefore cannot be swept up by the `evaluations` collectionGroup. So **within this codebase there is no colliding `evaluations` collection**. The question is genuinely open only because of two things outside the code's reach: (a) the Firebase project may be shared with other apps/tools that create their own `evaluations` subcollections, and (b) collectionGroup queries additionally require a **composite index** on `sharedEmails` that must be created in the Firebase console — an absent or mis-scoped index produces a `failed-precondition`, not `permission-denied`, which the current handler treats as a hard error (line 331-335) rather than degrading.

What remains **uncertain**: whether the live Firebase project hosts any other `evaluations` collection, and whether the required collectionGroup index is deployed. Neither can be verified statically — the rules and indexes exist in the repo only as the copy-paste reference comment at `js/lib/valobois-firestore-sync.js:8-39`, with no committed `firestore.rules` or `firestore.indexes.json` file to inspect. This makes it a runtime/deployment-config question, not a code defect: the fallback path is correct and defensive, but whether it ever actually fires depends on data and configuration that live only in the cloud project.

## Evidence in the code
- `js/app/mes-evaluations-page.js:5` — `var COL_EVAL = 'evaluations';` the bare collection name used for both the scoped and the collectionGroup queries.
- `js/app/mes-evaluations-page.js:294-297` — the shared lookup: `db.collectionGroup(COL_EVAL).where('sharedEmails', 'array-contains', emailForQuery).get()` — matches *every* `evaluations` subcollection project-wide.
- `js/app/mes-evaluations-page.js:323-339` — error handling: only `code === 'permission-denied'` degrades to owned-only (`console.warn`, `sharedSnap = { docs: [] }`); any other error code shows `mesEval.loadListFailed`.
- `js/app/mes-evaluations-page.js:278` — the owned query uses the correctly scoped path `users/{uid}/evaluations`, confirming the intended single location.
- `js/lib/valobois-firestore-sync.js:5-6` — explicit code comment documenting the exact collision hazard this question asks about.
- `js/lib/valobois-firestore-sync.js:32-37` — the reference rules authorise reads only at `match /users/{userId}/evaluations/{evalId}`, so any other `evaluations` path would be unauthorised and fail the whole collectionGroup query.
- `js/app/valobois-app.js:42594` — the only other Firestore collection (`pieces`, top-level) has a different name, so it cannot collide.

## What would resolve it
- In the Firebase console, list all collectionGroups in the project and confirm `evaluations` exists **only** under `users/{uid}/` (no other app or tool writes an `evaluations` subcollection elsewhere). If the project is single-tenant for VALOBOIS, the collision cannot occur and the question is closed as "no clash".
- Confirm the composite collectionGroup index on `sharedEmails` (array-contains) is deployed; otherwise the shared search fails with `failed-precondition` and—per `mes-evaluations-page.js:331-335`—shows the hard error banner instead of degrading. Consider committing a `firestore.indexes.json` so this is verifiable from the repo.
- Optionally harden the fallback: treat `failed-precondition` (missing index) the same as `permission-denied` so a config gap degrades gracefully rather than blocking the whole library.
- Product/ops owner confirms whether the Firebase project is intended to ever host unrelated `evaluations` collections; if "never", document that assumption (spec 004 Assumptions already states all évaluations live in one project) and downgrade this question.
