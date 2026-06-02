# In-app HTML save: README-promised command-line fallback message is not implemented

> **Open question** · priority #36 · Tier 4 – Exports · Source spec: `specs/014-export-standalone-html/spec.md`

## Question
The README's stated failure message (pointing the user to the command-line build) has no implementation in the shipped code. Confirm the intended user-facing fallback wording.

<details>
<summary>🇫🇷 Version française</summary>

Le message d'échec annoncé dans le README (renvoyant l'utilisateur vers le build en ligne de commande) n'a pas d'implémentation dans le code livré. Confirmer la formulation de repli destinée à l'utilisateur.

</details>

## Why this is open
**Classification:** Cross-file inconsistency (README vs. code) — and, downstream, Product-intent ambiguity about the intended wording.

The README, in the « Sauvegarder » section, explicitly promises a user-facing fallback: *« En cas d'échec, le message d'erreur propose d'utiliser `npm run build:standalone` pour obtenir une base autonome. »* (README.md:66). This describes a specific behaviour — when the in-app HTML save fails, the user should be shown an error that *points them to the command-line build* as an alternative. No such message exists anywhere in the shipped JavaScript.

I traced the entire in-app save path. The browser-side builder is `js/lib/build-standalone-html.js`, exposing `buildValoboisStandaloneHtml(options)` (line 75). The ONLY error this code can throw is in `fetchText`: `throw new Error('Échec du chargement : ' + url)` (line 24) — i.e. a bare "loading failed, here is the URL" message. There is no `try/catch` in the builder, no string mentioning `npm run build:standalone`, no mention of the command line, and no fallback-suggestion text. Grepping the whole tree confirms the string `build:standalone` / "ligne de commande" appears in JS only inside the README-loaded comment context, never in a user-facing error (grep over `js/` returns nothing for the fallback phrasing).

More fundamentally, the fallback message can never fire because **the in-app save is never invoked**. `buildValoboisStandaloneHtml` is defined and the file is loaded via `<script defer src="js/lib/build-standalone-html.js">` (index.html:5664), but there is **no caller anywhere** — no button, no menu item, no `.html` download wiring (`link.download` / `a.download` are used only for JSON, CSV, PDF and GLB exports, never for a standalone HTML; see js/app/valobois-app.js:36892, 40160, 40295, 46645, 47518). So the function is loaded-but-orphaned partly-finished code. The reopening half *does* work: `loadGuestDataFromLocalStorage()` reads `window.__VALOBOIS_DATA__` and persists it to localStorage (js/app/valobois-app.js:8783–8790), matching the data the builder would inject (build-standalone-html.js:6–16). The producing trigger and its error UX are what is missing.

What I CONFIRMED: (1) the README promises a command-line-build fallback message; (2) the code contains no such message; (3) the only error string is the generic "Échec du chargement : <url>"; (4) the builder is never called, so even that generic error has no path to reach the user from the UI. What remains UNCERTAIN and needs an owner decision: the exact intended wording of the fallback (the README paraphrases intent, not a final string), and whether this should ship at all in this version given the save trigger itself is absent. This is the same partly-finished feature already flagged under spec 014's "No visible button for the in-app save" open question.

## Evidence in the code
- `README.md:66` — README promises that on failure the in-app save shows an error proposing `npm run build:standalone`.
- `js/lib/build-standalone-html.js:24` — the only error thrown by the builder: `'Échec du chargement : ' + url`; no command-line-build suggestion, no try/catch wrapping it.
- `js/lib/build-standalone-html.js:75-84` — `buildValoboisStandaloneHtml` definition; no error handling that would emit a fallback message.
- `index.html:5664` — `<script defer src="js/lib/build-standalone-html.js">`; the builder is loaded but, per grep, never called from any UI code.
- `js/app/valobois-app.js:8783-8790` — the reopening side reads injected `window.__VALOBOIS_DATA__` and persists primary+backup copies; the consume half is complete.
- `js/app/valobois-app.js:36892, 40160, 40295, 46645, 47518` — every `download`/`a.download` assignment targets JSON/CSV/GLB/PDF, never a standalone `.html`; confirms no save trigger exists.
- Grep over `js/` for `build:standalone`, "ligne de commande", "Sauvegarder"(as a save action), `saveHtml`/`exportHtml` — no user-facing fallback string or save handler found.

## What would resolve it
- Product owner confirms the exact intended fallback wording (e.g. a French string telling the user to serve over HTTP and otherwise run `npm run build:standalone`), so it can be implemented as the catch handler around `buildValoboisStandaloneHtml`.
- Decide whether the in-app save (button + download wiring + this fallback message) is meant to ship in this version at all, or whether the README's « Sauvegarder » section should instead be marked as describing a not-yet-wired feature. This is coupled to spec 014's "No visible button for the in-app save" question.
- Once a trigger exists, wrap the `buildValoboisStandaloneHtml` call in a `try/catch` that, on failure, surfaces the confirmed wording — and verify the generic `'Échec du chargement : <url>'` is either replaced or supplemented by the command-line-build suggestion.
