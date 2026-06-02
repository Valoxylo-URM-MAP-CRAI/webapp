# Is the rejection matrix consultative, or the live decision engine?

> **Open question** · priority #2 · Tier 1 – Decision engine · Source spec: `specs/011-editor-rejection-matrix/spec.md`

## Question
Editing the matrix appears to change future orientation results. Confirm whether the matrix is purely consultative or is the live rule book that drives each lot's orientation calculation.

<details>
<summary>🇫🇷 Version française</summary>

Modifier la matrice semble changer les orientations calculées ensuite. Confirmer si la matrice est purement consultative ou si elle constitue le jeu de règles qui pilote le calcul d'orientation de chaque lot.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (the code is unambiguous; the open part is whether one editable input — the thresholds — is *meant* to be inert).

Statically, the code resolves the headline question: **the matrix is the live rule book, not a consultative display.** The orientation of a lot is produced by `computeOrientation(lot)` → `computeOrientationFromMatrix(lot, mode)`, which runs the exact rejection cascade described in FR-017 (no `reemploi` rejection + a `recyclage` vector ⇒ Recyclage, else degrade Réemploi → Réutilisation → Recyclage → Combustion). That cascade operates purely on the `activeRejets` / `activeVectors` sets returned by `collectValoboisMatrixActiveFlows`, and those sets are computed through `getValoboisEffectiveFlowLevels(rank, flowKind, orientationKey, defaultLevels)`, which **overlays the user's custom matrix config (`valoboisMatrixConfig.flowOverrides[r<rank>][vectors|rejects][orientation]`) on top of the embedded default levels**. So a user editing a vector/reject checkbox in the matrix changes which levels count as active, which changes the cascade outcome, which changes `lot.orientationCode` / `lot.orientationLabel`.

Three independent edit paths confirm the coupling is intentional and immediate, not incidental:
1. **Flow level / score / free-criteria edits** — every matrix-config mutator in `valobois-app.js` follows the same pattern: mutate `this.valoboisMatrixConfig`, `saveValoboisMatrixConfig()`, then **`this.computeOrientation(this.getCurrentLot())`** and `renderMatrice()` (e.g. lines 7672-7674, 7912-7915, 8048-8050, 8163-8165, 8182-8184).
2. **Default gate toggles** — `setValoboisDefaultGateEnabled` writes `config.gates.disabled` then calls `this.computeOrientation(...)` (valobois-app.js:35932). Disabled gates are filtered out of the active gate list consumed by the orientation/lock logic via `isValoboisDefaultGateEnabled` (lines 32427, 36037), so disabling a gate changes the result.
3. **Custom free criteria** — `collectValoboisMatrixActiveFlows` (valobois-app.js:34312-34349) folds user-added free criteria into the same `activeRejets`/`activeVectors`, so added criteria participate in the cascade.

What I could **not** confirm to be live is the **threshold editor** (FR-012, the 0-30 per-mode/per-orientation sliders). `applyValoboisMatrixConfigToData()` pushes the matrix thresholds into `this.data.notationModeOrientationThresholds` (valobois-app.js:8735 via `convertMatrixThresholdsToNotationThresholds`), but a full-file search shows `notationModeOrientationThresholds` is only ever *written* and *normalized* — it has **no read site inside `computeOrientationFromMatrix` or `collectValoboisMatrixActiveFlows`**. The cascade decides purely on the presence (`.length`) of active rejets/vectors, never on a numeric threshold comparison. So the *threshold* portion of the matrix may be consultative/feed-forward to other displays only, even though the *flow/gate/criteria* portions are decisive. This is the residual ambiguity: a product owner should confirm whether the editable thresholds are intended to influence orientation (and are therefore a latent bug, since they currently do not) or are intentionally display-only.

The spec's own "Open Questions" section (specs/011-editor-rejection-matrix/spec.md:118) frames this exactly as "consultative vs. drives the calculation", and the subtitle "Informations sur les critères…" is what creates the consultative *impression* — but the as-built behaviour for flows/gates/criteria contradicts that impression.

## Evidence in the code
- `js/app/valobois-app.js:39844-39855` — `computeOrientation` calls `computeOrientationFromMatrix(...)` and writes the result into `lot.orientationCode` / `lot.orientationLabel` / `lot.orientation`.
- `js/app/valobois-app.js:34354-34396` — `computeOrientationFromMatrix` implements the FR-017 rejection cascade purely from `activeRejets` / `activeVectors` `.length`; no threshold value is read here.
- `js/app/valobois-app.js:34273-34352` — `collectValoboisMatrixActiveFlows` builds the active flow sets, using `getValoboisEffectiveFlowLevels(...)` for reference criteria and folding in custom free criteria.
- `js/app/valobois-app.js:33722-33751` — `getValoboisEffectiveFlowLevels` merges `valoboisMatrixConfig.flowOverrides[r<rank>][flowKind][orientationKey]` over the embedded default levels (and hard-codes the Démontabilité r16 "faible" lock).
- `js/app/valobois-app.js:35921-35933` — `setValoboisDefaultGateEnabled` mutates `gates.disabled`, then calls `computeOrientation(...)` directly — a matrix edit re-running the engine.
- `js/app/valobois-app.js:7672-7674, 7912-7915, 8048-8050, 8163-8165, 8182-8184` — matrix-config mutators that all end with `saveValoboisMatrixConfig()` + `computeOrientation(this.getCurrentLot())`.
- `js/app/valobois-app.js:8733-8736` — `applyValoboisMatrixConfigToData` copies matrix thresholds into `data.notationModeOrientationThresholds`; called on load (line 679) and after import/reset (lines 36025, 36102, 36221).
- `js/app/valobois-app.js:8701` / `:6984,7117-7123,4093` — `convertMatrixThresholdsToNotationThresholds` and the normalize/default paths are the *only* touch points of `notationModeOrientationThresholds`; grep finds no read of it inside the orientation cascade.
- `js/data/valobois-matrice-vecteurs-rejets.js:57-68` — the embedded CSV is parsed into per-criterion `vectors`/`rejects` (the defaults `getValoboisEffectiveFlowLevels` overlays config onto); the `Seuils`/`Confiance` rows (lines 65-66 of the CSV block) are not turned into criteria entries.
- `js/app/editor-tab-matrice.js:6-10` — the tab is a thin shim delegating to `app.renderMatrice()`; all logic lives in `valobois-app.js`.

## What would resolve it
- Product owner confirms the intended scope: "matrix flow/gate/criteria edits are meant to drive orientation" (matches code) — then the headline question is answered: **not consultative, it is the live decision engine.**
- Decide the status of the **threshold sliders**: confirm whether `notationModeOrientationThresholds` is supposed to affect orientation. If yes, this is a **bug** (the cascade never reads it); if no, document them as display/consultative-only and consider relabeling the UI subtitle to remove the "Informations sur les critères…" consultative implication.
- Runtime check to close it definitively: open a lot, toggle a reject checkbox (or disable a default gate) in the matrix while in personalization mode, and confirm the lot's orientation badge changes live; then move only a threshold slider and confirm the orientation does **not** change — this validates the static reading above.
