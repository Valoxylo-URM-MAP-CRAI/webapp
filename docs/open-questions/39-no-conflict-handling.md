# Concurrent edits to a shared evaluation: last write wins, with no conflict detection

> **Open question** · priority #39 · Tier 5 – Data integrity & collaboration · Source spec: `specs/003-cloud-sync-persistence/spec.md`

## Question
If the owner and a shared editor change the same evaluation at the same time, the last save wins; there is no conflict handling. Confirm this is acceptable.

<details>
<summary>🇫🇷 Version française</summary>

Si le propriétaire et un éditeur partagé modifient la même évaluation en même temps, la dernière sauvegarde l'emporte ; il n'y a aucune gestion de conflit. Confirmer que c'est acceptable.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (the code is unambiguous; whether the resulting behaviour is acceptable is a product decision).

The code is clear and consistent: there is genuinely no conflict handling, and the "last write wins" description is exactly what the implementation does. Every cloud save flows through `flushToFirestore` in `js/lib/valobois-firestore-sync.js`, which calls `evalRef(db, ownerUid, evalId).set(payload, { merge: true })` (line 480-481). This is an unconditional write of the whole évaluation into the single document `users/{ownerUid}/evaluations/{evalId}`. Both the owner and any shared editor write to the **same** document path (the owner UID comes from `?owner=` for a shared editor, see `getEvalOwnerUid`, lines 122-127), so whoever's debounced save lands last in Firestore overwrites the other's `payloadJson` wholesale. There is no merge of fields, no diff, no per-lot reconciliation — `payloadJson` is a single serialized blob (`buildPayloadJsonForCloud`, lines 75-100) and `{ merge: true }` only merges at the top-level document-field granularity, not inside that blob.

I confirmed there is **no concurrency control of any kind** in the sync layer: a grep for `runTransaction`, `transaction`, `.update(`, and `onSnapshot` in `valobois-firestore-sync.js` and `firebase-app-auth.js` returns nothing. The document is read exactly once, on entry to cloud mode (`enterCloudModeOnIndex` → `.get()`, line 603-604); there is no live listener, so during an editing session neither party ever sees the other's changes arrive. A user would only discover a clobbered change on the next full page load / reopen.

There **is** a `revision` counter, which initially looks like it might be optimistic-locking machinery — but it is not used as such. `saveData()` increments it locally on every save (`this.data.meta.revision = (Number(...) || 0) + 1`, `js/app/valobois-app.js:8831`) and `flushToFirestore` writes it to the doc (`revision: rev`, line 471-474). However, the write never reads the remote `revision` back to compare, and the Firestore security rules (the reference block at the top of the file, lines 25-31, `sharedEditorPayloadOnlyUpdate`) only check that a shared editor touches an allowed key set — they do **not** enforce a monotonic or matching `revision`. So `revision` is effectively a write-counter / informational field (also surfaced in the UI at `valobois-app.js:47175`), not a guard against lost updates. This is worth flagging because it could mislead a maintainer into thinking conflict protection exists.

The spec itself already documents this as intended-but-unconfirmed: the "Not handled" edge case (`spec.md:74`) and Assumption that "editing the same évaluation in two tabs at once is not coordinated" (`spec.md:121`) both state last-write-wins explicitly. So this is not a suspected bug — the behaviour matches the design. What remains open is purely the product judgement: given that spec 004 lets an owner share an évaluation with other editors by e-mail, simultaneous editing is a realistic scenario, and silently losing one party's work without any warning may or may not be acceptable for a data-integrity-sensitive diagnostic tool. That call belongs to the product owner.

## Evidence in the code
- `js/lib/valobois-firestore-sync.js:480-481` — `set(payload, { merge: true })` is an unconditional write; no precondition on remote state. This is the literal "last write wins".
- `js/lib/valobois-firestore-sync.js:122-127` — `getEvalOwnerUid` resolves a shared editor's writes to the **owner's** document path (via `?owner=`), so owner and shared editor target the identical doc.
- `js/lib/valobois-firestore-sync.js:603-650` — the doc is read once via `.get()` on load; there is no `onSnapshot`/live subscription, so concurrent remote changes are never observed mid-session.
- `js/app/valobois-app.js:8831` and `js/lib/valobois-firestore-sync.js:471-474` — `revision` is incremented locally and written, but it is never compared against the stored value before writing (no optimistic locking).
- `js/lib/valobois-firestore-sync.js:25-31` — the Firestore rules' `sharedEditorPayloadOnlyUpdate` only restricts which keys a shared editor may change; it imposes no `revision` check, so the rules layer does not prevent overwrites either.
- grep for `runTransaction|transaction|.update(|onSnapshot` across the sync and auth libs returns nothing — confirms no transactional compare-and-swap and no live merge.
- `specs/003-cloud-sync-persistence/spec.md:74` and `:121` — the spec already states last-write-wins / uncoordinated concurrent editing as the intended ("Not handled") behaviour and an assumption.

## What would resolve it
- Product owner confirms that "last write wins, no warning, no merge" is acceptable for shared évaluations, OR decides a guard is needed (e.g. surface a "this évaluation changed elsewhere" notice).
- If a guard is wanted, the cheapest correctness fix is to make `revision` a real precondition: read-then-write inside a `runTransaction`, or enforce `request.resource.data.revision == resource.data.revision + 1` in the `sharedEditorPayloadOnlyUpdate` rule — both are currently absent.
- Optionally, add an `onSnapshot` listener so a second editor at least sees changes arrive instead of silently clobbering on the next save; confirm with product whether live co-editing is in scope or out of scope.
