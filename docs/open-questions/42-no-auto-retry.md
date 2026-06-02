# No automatic retry of a failed cloud save

> **Open question** · priority #42 · Tier 5 – Data integrity & collaboration · Source spec: `specs/003-cloud-sync-persistence/spec.md`

## Question
A failed cloud save is not retried automatically beyond the single browser-kept copy. Confirm no automatic retry is expected.

<details>
<summary>🇫🇷 Version française</summary>

Une sauvegarde cloud échouée n'est pas réessayée automatiquement au-delà de la copie unique conservée dans le navigateur. Confirmer qu'aucune reprise automatique n'est attendue.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (the code is unambiguous; only the product owner can confirm the behaviour is acceptable).

The code is clear and consistent: a failed cloud write is recorded as an error and surfaced in the indicator, but it is never retried automatically. The save path is `flushToFirestore` in `js/lib/valobois-firestore-sync.js`. It issues a single `evalRef(...).set(payload, { merge: true })` (lines 480-481). On rejection, the `.catch` handler at lines 485-488 only stores the error (`lastSyncError = e || ...`) and logs it — there is no re-queue, no exponential backoff, no timer, and no flag that would cause a later automatic re-attempt. The `.finally` at lines 489-492 simply decrements `inFlightWrites` and re-emits the sync state, which the indicator renders as the `error` state. Confirmed: there is no retry code anywhere in the sync module (or elsewhere in `js/`); a repo-wide grep for `retry`, `setInterval`, `navigator.onLine`, an `online` event listener, `beforeunload`, or a save queue found nothing related to cloud sync — the only matches are unrelated UI patch timers and a graph-traversal queue in `valobois-app.js`.

The only safety net is the local "browser-kept copy" the spec refers to. Before every write, `flushToFirestore` calls `trySaveCloudDraft(appInstance, evalId, ownerUid)` (line 470), which writes `localStorage[valobois_cloud_draft_v1:<owner>:<evalId>] = JSON.stringify(appInstance.data)` (lines 328-337). Crucially this local draft is written **before** the network call and unconditionally — it is not contingent on the cloud write succeeding, and it is never re-pushed to the cloud after a failure. It is read back only on the **next page load** during hydration: if the cloud `get()` fails, the `.catch` at lines 640-647 falls back to `tryLoadCloudDraft`. So the local copy protects against data loss on reload, but it does not turn a failed save into a successful one — the cloud document simply stays stale until the next successful save triggered by a future edit.

A subsequent edit *would* eventually overwrite the stale cloud copy, because each edit calls `scheduleCloudSave` → `flushToFirestore` afresh and `lastSyncError` is reset to `null` on the next success (line 483). But if the user makes no further edits after a failed save (e.g. they finish editing, the last save fails, and they close the tab), that last change is never persisted to the cloud — it survives only in this browser's localStorage. There is no flush-on-unload and no background reconciliation. This is the concrete risk the question targets.

The spec already documents this as intended-by-omission: spec.md line 74 ("There is no automatic retry of a failed save beyond the single browser-kept copy") and the indicator requirement FR-011 / SC-004 describe a terminal "save failed" state with no recovery action. So the implementation matches the written spec. What remains genuinely open is the **product decision**: is "show 'Échec sauvegarde' and rely on the user to make another edit (or reload) " acceptable, or should a transient failure (offline, token expiry, brief Firestore outage) trigger an automatic retry so the cloud copy converges without user action? That is a UX/data-durability call, not a code question.

## Evidence in the code
- `js/lib/valobois-firestore-sync.js:480-492` — single `.set(payload, { merge: true })`; the `.catch` only stores `lastSyncError` and logs; `.finally` just decrements `inFlightWrites` and re-renders. No retry.
- `js/lib/valobois-firestore-sync.js:470` + `:328-337` — `trySaveCloudDraft` writes the local safety copy to `localStorage` *before* the network call, unconditionally; never re-pushed after a failure.
- `js/lib/valobois-firestore-sync.js:339-351` + `:640-647` — `tryLoadCloudDraft` is consulted only during hydration when the cloud `get()` fails; it recovers data on reload, it does not complete a pending save.
- `js/lib/valobois-firestore-sync.js:483` — `lastSyncError = null` on the next successful write, so the error clears only when a *future* edit produces a successful save.
- `js/lib/valobois-firestore-sync.js:391-417` — `emitCloudSyncState` maps `lastSyncError` to the terminal `'error'` state; nothing schedules a re-attempt from this state.
- `js/app/auth-header.js:22-55` — the indicator renders `error` as a static "!" badge with the `auth-banner-sync--error` class; no retry button or affordance.
- `js/i18n/valobois-locales.js:22` — `cloudError: 'Échec sauvegarde'` is the only failure-related string; no "retrying…" copy exists.
- `specs/003-cloud-sync-persistence/spec.md:74` — the spec explicitly states "There is no automatic retry of a failed save beyond the single browser-kept copy", confirming the behaviour is as-built and matches the documented intent.
- Repo-wide grep over `js/` for `retry`/`setInterval`/`navigator.onLine`/`online` listener/`beforeunload`/save queue — no cloud-sync retry mechanism found.

## What would resolve it
- Product owner confirms the as-built behaviour is acceptable: a failed save shows "Échec sauvegarde", the change survives locally in this browser, and recovery relies on the user making another edit or reloading on the same browser — with the known gap that the last change is **not** pushed to the cloud if the user stops editing and closes the tab after a failure.
- If automatic retry is desired, decide the policy (retry on transient errors only vs. all errors; bounded backoff; flush-on-`beforeunload`; re-push the local draft when connectivity returns via an `online` listener) and the indicator copy for a "retrying" state, then implement around `flushToFirestore` / `lastSyncError`.
