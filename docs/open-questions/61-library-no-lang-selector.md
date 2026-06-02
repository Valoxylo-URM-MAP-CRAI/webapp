# Does the *Mes évaluations* page need its own language selector?

> **Open question** · priority #61 · Tier 7 – Wording, i18n & UX · Source spec: `specs/016-internationalization/spec.md`

## Question
The library page has no language selector of its own; it follows the language chosen elsewhere. Confirm whether it should carry its own selector.

<details>
<summary>🇫🇷 Version française</summary>

La page « Mes évaluations » n'a pas de sélecteur de langue propre ; elle suit la langue choisie ailleurs. Confirmer si elle devrait en avoir un.

</details>

## Why this is open
**Classification:** Cross-file inconsistency (the premise is contradicted by the as-built code; the residual decision is a minor Product-intent ambiguity).

The question's premise — that the *Mes évaluations* page "has no language selector of its own" — is **false in the as-built code**. `mes-evaluations.html` carries exactly the same selector markup as the assessment page (`index.html`) and the sign-in page (`auth.html`): a `<label id="valobois-lang-label">` plus a `<select id="valobois-lang-select">` with `fr`/`en` options, sitting in the top banner (`mes-evaluations.html:27-31`). This is not a "follows the choice made elsewhere with no control" situation — the page exposes a real, working dropdown.

That selector is fully functional on this page because the i18n layer is page-agnostic. `js/i18n/valobois-i18n.js` registers a single `DOMContentLoaded` boot (`initValoboisI18nBoot`, line 146-149) that calls `bindValoboisLangSelect()`; that function simply looks up `document.getElementById('valobois-lang-select')` and attaches a `change` handler that calls `setValoboisLang(sel.value)` (lines 137-144). Both scripts are loaded by `mes-evaluations.html` (`valobois-locales.js` then `valobois-i18n.js`, lines 56-57), so the binding runs on the library page identically to the other two. Changing the value persists to `localStorage` under `valobois_lang`, re-applies all `data-i18n*` attributes, and dispatches the `valobois:langchange` event (`setValoboisLang`, lines 122-131). The library page's own script listens for that event and re-renders the list/date/number formatting in the new language (`js/app/mes-evaluations-page.js:566-571`), so a same-page switch updates the list live.

What IS true — and is probably what the underlying question was reaching for — is that the *spec text* under-describes the selector's reach. FR-005 in `specs/016-internationalization/spec.md` says the app provides a language selector "in the top banner of the assessment page and of the sign-in page" and does not mention the *Mes évaluations* page, even though the markup clearly puts one there too. So the inconsistency is between the spec/open-question wording (selector only on two pages, library "follows" the choice) and the code (selector on all three pages). The selector was added to `mes-evaluations.html` in commit `b74fc16` ("add l18n", 2026-03-25), well before the spec was drafted (2026-06-01), so this is a documentation lag, not a missing feature.

The only genuinely open residue is a small product question: the library page selector is wired but **the page is sparsely translated** — its visible strings (`mesEval.*` keys) do have English entries in the locales, so the selector does meaningfully change this page; there is no "dead" selector concern here. I confirmed the markup, the generic binding, and the live re-render. What I did NOT verify at runtime is whether every `mesEval.*` key has a complete English value (that is the separate "English coverage is partial" open question), but that does not affect whether the selector should exist.

## Evidence in the code
- `mes-evaluations.html:27-31` — the *Mes évaluations* page DOES contain `#valobois-lang-label` + `#valobois-lang-select` with `fr`/`en` options, identical to the other pages. Contradicts the question's premise.
- `index.html:50-51` and `auth.html:26-27` — the same selector markup, confirming all three pages share one pattern.
- `js/i18n/valobois-i18n.js:137-144` — `bindValoboisLangSelect()` binds any `#valobois-lang-select` by id, page-agnostic; guards against double-binding via `dataset.valoboisLangBound`.
- `js/i18n/valobois-i18n.js:146-149,158` — `initValoboisI18nBoot` runs on `DOMContentLoaded` on every page that loads the script, calling the bind + apply.
- `js/i18n/valobois-i18n.js:122-131` — `setValoboisLang` persists to `localStorage` (`valobois_lang`), re-applies translations, and notifies listeners.
- `mes-evaluations.html:56-57` — the library page loads `valobois-locales.js` + `valobois-i18n.js`, so the boot/binding actually runs here.
- `js/app/mes-evaluations-page.js:566-571` — the page's own `valobois:langchange` listener re-fetches/re-renders the list and re-applies the share-modal i18n, so an in-page language switch updates content live.
- `mes-evaluations.html:16-22` — an inline boot reads `valobois_lang` and sets `<html lang>` before scripts load, so the page also honours a choice made on another page (the "follows the language chosen elsewhere" behaviour, which coexists with its own selector).
- `specs/016-internationalization/spec.md` FR-005 (line 70) — names the selector only on the assessment and sign-in pages, omitting *Mes évaluations*; this is the documentation gap, not a code gap.

## What would resolve it
- Confirm the premise is stale: the code already gives *Mes évaluations* its own working selector (`mes-evaluations.html:28`), so the question can be closed as "already implemented".
- Update FR-005 in `specs/016-internationalization/spec.md` to list all three pages (assessment, sign-in, *Mes évaluations*) as carrying the selector, removing the cross-file inconsistency.
- If the product owner instead intended the library page to be locked to the global choice (no per-page control), that would be a deliberate removal — but the current as-built and the bilingual UX goal both argue for keeping it.
- (Separately, tracked by the "English coverage is partial" question) verify each `mesEval.*` key has an English value so the selector's effect on this page is visibly complete.
