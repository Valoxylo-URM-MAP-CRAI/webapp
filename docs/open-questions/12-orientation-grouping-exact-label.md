# Operation-level grouping keys lots on exact orientation labels

> **Open question** · priority #12 · Tier 2 – Quantitative outputs · Source spec: `specs/010-editor-synthesis-orientation/spec.md`

## Question
The operation-level grouping compares the orientation label exactly; a lot whose label differs (case or accents) would be left out of the per-orientation columns and totals. Confirm robustness.

<details>
<summary>🇫🇷 Version française</summary>

Le regroupement au niveau opération compare le libellé d'orientation à l'identique ; un lot au libellé différent (casse ou accents) serait omis des colonnes et totaux par orientation. Confirmer la robustesse.

</details>

## Why this is open
**Classification:** Suspected bug / correctness risk (defensive-coding gap) + Cross-file inconsistency — but with low live exploitability given the current single writer of the label.

The behaviour described in the question is real and confirmed in the code. The operation evaluation (`renderEvalOp`, `js/app/valobois-app.js:39917`) routes each lot into the réemploi/réutilisation/recyclage/incinérable buckets and into the monetary balance using strict equality against hard-coded accented French string literals: `lot.orientationLabel === "Combustion"`, `=== "Réemploi"`, `=== "Réutilisation"`, `=== "Recyclage"` (lines 39936–39948 for the volume/price/balance, and again 39963–39972 for the per-orientation lot lists). Any `orientationLabel` that is not byte-for-byte identical to one of those four literals falls through every branch: it is **not** added to a `bilanMonetaireGlobal` adjustment, contributes to **no** orientation column, and appears in **no** lot list — yet its volume is still added to `totalVolGlobal` at line 39934, so it silently dilutes every `part%` and the circularity ratio. So the failure mode in the question is exactly as feared: a divergent label produces under-counted columns plus a still-inflated denominator. This matches the spec's own Edge Case ("un lot dont le libellé n'est pas reconnu n'entre dans aucune colonne, mais son volume compte tout de même dans le volume total", spec.md:53), so the spec author already flagged this as the documented-but-fragile behaviour.

What makes this *not currently exploitable* is that I traced the only writer of `lot.orientationLabel`. It is assigned in exactly one place, `computeOrientation()` at `js/app/valobois-app.js:39854`, and its value is `getValoboisOrientationLabel(code)` (line 34224) or the `label` returned by `computeOrientationFromMatrix()` (line 34354), which itself calls `getValoboisOrientationLabel(orientation)` at line 34390. That helper reads from the single frozen canonical map `VALOBOIS_ORIENTATION_LABELS` (`js/app/valobois-constants.js:349`, `{ reemploi:'Réemploi', reutilisation:'Réutilisation', recyclage:'Recyclage', combustion:'Combustion', none:'…' }`), with an identical inline fallback at lines 34225–34231. I grepped every `.orientationLabel =` assignment in the app: line 39854 is the sole producer; no import/load/persistence path writes a free-text label into a lot. So in practice the only values `orientationLabel` can ever hold are the four exact literals (plus `'…'` for unscored lots), which means today the strict `===` always matches and the bug cannot fire.

The reason this is still worth keeping open is twofold. First, **the robust comparator already exists but is not used here.** `getLotOrientationFamilyLabel()` (`js/app/valobois-app.js:6055`) normalizes case and strips accents (`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')`) and even falls back to substring matching on the raw label — exactly the resilient logic the grouping lacks. The grouping in `renderEvalOp` ignores this helper and re-hard-codes literals, so the codebase is internally inconsistent about how rigorously orientation is matched. Second, **the brittle pattern is duplicated.** The PDF/operation export computes the same aggregates independently in `getPdfOperationSummary()` (line 44085), where it compares `getPdfOrientationSummary(lot).label === 'Combustion' / 'Réemploi' / …` (lines 44118–44134) — another exact-literal match. Two separate code paths each re-encode the four accented strings; a future change that introduces a new label source (e.g. a persisted/imported label, a localized English label, or a new orientation) would have to be remembered in both places, and either would silently miscount rather than error.

Confirmed: the comparison is exact and a divergent label would be dropped from columns/lists/balance while still counting in the total volume. Confirmed: today no code path can produce a divergent label, so the risk is latent, not active. Uncertain only at the product level: whether this "silently drop unknown label, keep its volume in the denominator" behaviour is the intended, acceptable contract, or whether the grouping should be hardened to key on `orientationCode` (which is also set at line 39855 and is the accent-free machine value) or via `getLotOrientationFamilyLabel()`.

## Evidence in the code
- `js/app/valobois-app.js:39936-39948` — `renderEvalOp` routes volume/price/`bilanMonetaireGlobal` via `lot.orientationLabel === "Combustion" / "Réemploi" / "Réutilisation" / "Recyclage"` (strict, accented literals).
- `js/app/valobois-app.js:39963-39972` — same `renderEvalOp`, the per-orientation lot lists and `lotsCirculaires` use the same exact-literal `===` branches.
- `js/app/valobois-app.js:39934` — `totalVolGlobal += v` runs before the orientation branches, so an unrecognized label still inflates the denominator (parts %, circularity).
- `js/app/valobois-app.js:39854-39856` — the **only** writer of `lot.orientationLabel` (and `orientationCode`/`orientation`), set from `computeOrientation`.
- `js/app/valobois-app.js:34224-34233` — `getValoboisOrientationLabel(code)` returns the canonical label from `VALOBOIS_ORIENTATION_LABELS` (or `'…'`).
- `js/app/valobois-app.js:34390` / `34354-34393` — `computeOrientationFromMatrix` returns `label: this.getValoboisOrientationLabel(orientation)`, i.e. always a canonical value.
- `js/app/valobois-constants.js:349-355` — the frozen canonical map; the four labels exist in exactly one authoritative place.
- `js/app/valobois-app.js:6055-6077` — `getLotOrientationFamilyLabel()`: the accent/case-insensitive, substring-tolerant comparator that the grouping does *not* use.
- `js/app/valobois-app.js:44118-44134` — `getPdfOperationSummary` duplicates the same exact-literal grouping for the PDF export (`=== 'Combustion' / 'Réemploi' / 'Réutilisation'`).
- `specs/010-editor-synthesis-orientation/spec.md:53` — spec Edge Case documenting the "unrecognized label → no column but counts in total volume" behaviour, and `:97` Assumption that classification relies on exact French labels.

## What would resolve it
- Product/maintainer decision: confirm that keying the operation aggregates on the exact label (vs. on `orientationCode` or `getLotOrientationFamilyLabel()`) is acceptable, given that today the label has a single canonical writer. If yes, document the invariant "`orientationLabel` is only ever a `VALOBOIS_ORIENTATION_LABELS` value" next to `renderEvalOp` and close.
- Otherwise (hardening): switch both grouping sites (`renderEvalOp` ~39936 and `getPdfOperationSummary` ~44118) to compare on `lot.orientationCode` / the result `code`, or route through `getLotOrientationFamilyLabel()`, and consider adding the lot's volume to the denominator only when it lands in a known bucket — eliminating both the brittleness and the duplicated literals.
- Verification check that would close the latent-risk concern: grep/confirm no code path other than line 39854 writes `lot.orientationLabel`, and that no project import or saved-state load injects a pre-set label (initial grep found none); a quick runtime assertion that every lot's `orientationLabel` ∈ the canonical map would make the invariant enforceable.
