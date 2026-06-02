# No "created on" date is recorded or shown for évaluations

> **Open question** · priority #44 · Tier 5 – Data integrity & collaboration · Source spec: `specs/002-evaluation-library/spec.md`

## Question
A creation date is not recorded when saving, nor shown in the library (only the last-changed date is shown). Confirm whether a "created on" column is wanted.

<details>
<summary>🇫🇷 Version française</summary>

Une date de création n'est ni enregistrée à la sauvegarde ni affichée dans la bibliothèque (seule la date de dernière modification l'est). Confirmer si une colonne « créé le » est souhaitée.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (with a factual correction to the original premise).

The behaviour itself is unambiguous in the code and was fully confirmed: **no creation timestamp is ever written or read.** Every Firestore write of an évaluation document goes through `flushToFirestore` / the create paths in `js/lib/valobois-firestore-sync.js`, and the payload object in all three places consists of exactly `payloadJson`, `revision`, `updatedAt` (a `serverTimestamp()`), `operationName`, plus the denormalized fields from `buildDenormalizedFields`. `updatedAt` is the only timestamp; it is overwritten on every save, so it reflects last-changed, never first-created. The listing page (`js/app/mes-evaluations-page.js`) correspondingly orders by `updatedAt` desc and renders only `formatDate(d.updatedAt)` — there is no other date field to display.

I want to flag a factual inaccuracy in the source-spec phrasing that seeds this question. The spec's Open Questions section says "a 'created' date exists on évaluations but is not displayed." That is **not** true in the as-built code. A repo-wide search for `createdAt` / `created_at` / `dateCreation` / `firstSavedAt` returns zero matches in `js/` and the HTML. The évaluation `meta` object built by `getDefaultMeta` (`js/app/valobois-app.js:6833`) does contain a field literally named `date` (`js/app/valobois-app.js:6839`), but that is a free-text, user-entered field (the operation/diagnosis date the diagnostician types in the General tab), defaulting to empty string — it is not an automatically captured record-creation timestamp, and it is not part of the listing's denormalized fields. So the premise should be read as "there is currently no created date at all," not "a created date exists but is hidden."

The canonical field set for an évaluation document is pinned by the Firestore security-rules comment at the top of `js/lib/valobois-firestore-sync.js:28-30`: a shared editor may only touch `payloadJson, revision, updatedAt, operationName, statutEtude, versionEtude, localisation, volumeTotal, bilanEconomique`. `createdAt` is absent from that whitelist too, reinforcing that no creation timestamp was ever designed into the schema.

What remains genuinely open is therefore a pure product decision: does the product owner want évaluations to carry a "created on" timestamp and/or a "created" column in the library? This is not a bug and not dead code — the data model simply never had the concept. Adding it would require (a) writing a `createdAt: serverTimestamp()` on the create-only paths (lines ~587 and ~619, guarding it so subsequent merges don't overwrite it), (b) extending the security-rules whitelist, and (c) a new column in the list renderer. None of that exists today, so the question cannot be answered from the code — only by the product owner.

## Evidence in the code
- `js/lib/valobois-firestore-sync.js:472-477` — `flushToFirestore` save payload: `payloadJson, revision, updatedAt (serverTimestamp), operationName` + denormalized fields. No `createdAt`.
- `js/lib/valobois-firestore-sync.js:581-588` — new-évaluation create payload (the "create" path) also writes only `updatedAt`, never a separate creation timestamp.
- `js/lib/valobois-firestore-sync.js:619-624` — auto-materialize-on-open create path: same field set, again no creation date.
- `js/lib/valobois-firestore-sync.js:28-30` — security-rules whitelist of allowed document keys; `createdAt` is not among them, confirming it is not part of the schema.
- `js/app/mes-evaluations-page.js:284` — owned list query is `.orderBy('updatedAt', 'desc')`: ordering keys off last-changed only.
- `js/app/mes-evaluations-page.js:353,371,376` — list rows carry and sort by `updatedAt` only.
- `js/app/mes-evaluations-page.js:397` — the only date rendered per row is `formatDate(d.updatedAt)`.
- `js/app/valobois-app.js:6833-6839` — `getDefaultMeta` defines a user-entered `date: ''` field; this is operation date input, not a record-creation timestamp, and is not surfaced in the library.
- Repo-wide grep for `createdAt`/`created_at`/`dateCreation`/`firstSavedAt` in `js/` and HTML — zero matches (the spec's claim that a created date "exists" is inaccurate).

## What would resolve it
- Product owner decides whether a "created on" date is wanted in the library; if no, close the question and correct the source spec's wording ("a created date exists") to reflect that none exists today.
- If yes: confirm the desired semantics (true server-side creation timestamp vs. reuse of the user-entered `meta.date`), then implement `createdAt: serverTimestamp()` on the create-only paths only (so merges don't clobber it), add `createdAt` to the security-rules whitelist (`js/lib/valobois-firestore-sync.js:28-30`), and add the column/line to the list renderer in `js/app/mes-evaluations-page.js`.
