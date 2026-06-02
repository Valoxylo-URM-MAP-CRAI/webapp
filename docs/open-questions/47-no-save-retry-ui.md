# Cloud-save failure shows no explicit "retry" action

> **Open question** · priority #47 · Tier 5 – Data integrity & collaboration · Source spec: `specs/001-authentication/spec.md`

## Question
The save indicator shows a failure state but offers no "retry" action from the header. Confirm none is expected.

<details>
<summary>🇫🇷 Version française</summary>

L'indicateur de sauvegarde affiche un état d'échec mais ne propose aucune action « réessayer » depuis l'en-tête. Confirmer qu'aucune n'est attendue.

</details>

## Why this is open
**Classification:** Product-intent ambiguity

The code is unambiguous about what it does; the open part is whether the absence of an explicit retry control is the intended UX. Confirmed behaviour: the top-of-page cloud-save indicator renders three states — `saving` (spinner), `saved` (green ✓), `error` (red `!`) — and the `error` state is a purely informational, non-interactive element. In `js/app/auth-header.js` the error branch builds a `<span class="auth-banner-sync auth-banner-sync--error">` containing a `!` glyph and the label text `t('auth.header.cloudError')` ("Échec sauvegarde" / "Save failed"), then appends it to the container (lines 50–66). No `<button>`, `href`, or `addEventListener('click', …)` is attached to that span — contrast the sign-out control just below it, which is a real `<button>` with a click handler (lines 74–92). The matching CSS (`css/main.css:695`, `:730`) only colours the error red and bolds it; it adds no affordance suggesting it is clickable. So I confirm there is no manual retry trigger anywhere in the header.

What replaces an explicit retry is an *implicit* retry on the next edit. The save lifecycle in `js/lib/valobois-firestore-sync.js` works as follows: `flushToFirestore` performs the Firestore `.set(...)`; on rejection it stores the error in `lastSyncError` and logs it (lines 485–488), and `emitCloudSyncState` then derives `state = 'error'` from `lastSyncError` being truthy (lines 403–404). Crucially, `lastSyncError` is only cleared back to `null` on a *successful* write (line 483). The next time the user edits anything, `__valoboisScheduleCloudSave` → `scheduleCloudSave` re-arms the debounce timer and calls `flushToFirestore` again (lines 679–687, 495–508); during that window `state` flips to `saving` (timer/in-flight check at lines 401–402) and then to `saved` if the write succeeds. So a failed save is effectively re-attempted whenever the user makes another change — there is no standalone "try again now" path that re-fires the *last* failed payload without a fresh edit.

This leaves a genuine product gap rather than a bug: if a save fails and the user makes no further edits (e.g. they finished and walked away, or the failure is a transient network blip), the red "Échec sauvegarde" simply persists with no user-initiated way to re-attempt from the header. The `error` state is also only meaningful on the editor page while in cloud mode (`emitCloudSyncState` gates everything on `auth.currentUser && isIndexEditorPage() && app.persistenceMode === 'cloud'`, lines 394–408), so the question is scoped to that context. The spec itself (FR-014, line 79) only requires that the indicator *show* "saving / saved / save failed" — it does not require a retry control, which is consistent with the as-built code and is why this is filed as an intent question, not a defect.

I confirmed the absence of a retry control and the presence of the implicit edit-triggered retry by static reading. What I could not confirm statically is the product expectation: whether relying on "edit again to retry" is acceptable, or whether a maintainer should add an explicit "Réessayer" button to the error span. That decision belongs to the product owner.

## Evidence in the code
- `js/app/auth-header.js:50-56` — `error` state builds a `<span>` with a `!` glyph and `aria-hidden`; no interactivity.
- `js/app/auth-header.js:57-66` — appends the `auth.header.cloudError` label; the whole `syncWrap` is a plain `<span>`, never a button/link.
- `js/app/auth-header.js:74-92` — the only interactive header control is the sign-out `<button>`, showing the file does add click handlers when a control is intended — so the error span's non-interactivity is deliberate, not an oversight in this function.
- `js/lib/valobois-firestore-sync.js:391-408` — `emitCloudSyncState` derives `'error'` solely from `lastSyncError` being set, only on the editor page in cloud mode.
- `js/lib/valobois-firestore-sync.js:483-492` — `lastSyncError` is cleared only on a successful write; a failure leaves it set until the next successful save.
- `js/lib/valobois-firestore-sync.js:495-508`, `679-687` — `scheduleCloudSave` / `__valoboisScheduleCloudSave` re-fire `flushToFirestore` on the next edit, the only path that retries a failed save.
- `js/i18n/valobois-locales.js:22,126` — `cloudError` is `'Échec sauvegarde'` / `'Save failed'`, a status label with no action verb.
- `css/main.css:695-698,730-734` — `.auth-banner-sync--error` only restyles colour/weight; no cursor or button styling implying clickability.
- `specs/001-authentication/spec.md:79` (FR-014) — spec requires showing the failure state but does not mandate a retry control.

## What would resolve it
- Product owner confirms whether "edit again to retry" is the intended recovery model, or whether an explicit "Réessayer" action is required on save failure.
- If a retry is wanted, decide its placement (in the header error span vs. a toast/banner) and whether it should re-fire the *last failed payload* directly (currently impossible without a new edit) — this would need a new exported trigger alongside `__valoboisScheduleCloudSave`.
- Optionally confirm the persistent-error UX is acceptable: a save that fails with no subsequent edit leaves "Échec sauvegarde" shown indefinitely with no user-actionable recovery.
