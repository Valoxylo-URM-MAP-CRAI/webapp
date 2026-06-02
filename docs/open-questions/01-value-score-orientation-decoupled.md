# Value score and orientation are decoupled — should the editable thresholds drive routing?

> **Open question** · priority #1 · Tier 1 – Decision engine · Source spec: `docs/methodologie-evaluation.md`

## Question
A lot's orientation (réemploi → réutilisation → recyclage → combustion) is decided by the matrix's driver/disqualifier cascade and the critical gates — not by the radar/seuils value totals, and not by the editable 70/50/30% (9/15/21-of-30) thresholds, which appear to be visual guides only. So a lot can score well yet be routed to combustion. Is this decoupling intended, or should those thresholds influence the recommendation?

<details>
<summary>🇫🇷 Version française</summary>

L'orientation d'un lot (réemploi → réutilisation → recyclage → combustion) est décidée par la cascade vecteurs/rejets et les verrous, pas par les totaux radar/seuils ni par les anneaux éditables 70/50/30 % (9/15/21-sur-30), qui semblent purement visuels. Un lot peut donc bien noter et finir en combustion. Découplage voulu, ou ces seuils devraient-ils influencer la recommandation ?

</details>

## Why this is open
**Classification:** Product-intent ambiguity (the code is unambiguous; what is unclear is whether the as-built behaviour is the desired one). A secondary **legacy / dead-code** signal reinforces it.

The code resolves the *factual* part of the question with no ambiguity: the orientation is computed exclusively from drivers/disqualifiers, and the editable thresholds never enter that computation. `computeOrientationFromMatrix(lot, mode)` (`js/app/valobois-app.js:34354`) builds the recommendation from `collectValoboisMatrixActiveFlows` only — it reads `activeRejets` and `activeVectors` and steps down the cascade (`reemploi` → `reutilisation` → `recyclage` → `combustion`, lines 34370–34384). No value total, no per-axis score, and no threshold value appears anywhere in that function. So a lot whose five value axes are all strong will still be routed to `combustion` the moment `activeRejets.recyclage` is non-empty. The decoupling described in the question is real and confirmed.

The 9/15/21-of-30 thresholds are a separate, display-only data path. Their defaults are `recyclage: 9, reutilisation: 15, reemploi: 21` per slider level (`js/app/valobois-app.js:7080-7082`), which `getOrientationThresholdConfig()` converts to percentages — `Math.round((value / 30) * 100)` → 30% / 50% / 70% (`js/app/valobois-app.js:33425`). That config is consumed in exactly one place, `renderSeuils()` at `js/app/valobois-app.js:37127-37128`, where the returned `thresholdConfig`/`defaultThreshold` are assigned and then **never read again** in the function body — they only feed the radar/seuils reference rings indirectly through the descriptor labels. The one helper that would actually map a value percentage onto an orientation, `getOrientationThresholdForPercent(percent)` (`js/app/valobois-app.js:33455`), has **no callers anywhere** in `js/` — it is effectively dead. This is strong evidence that the thresholds were once intended (or are still expected by users) to be decisional, but no decision path was ever wired to them.

The most telling detail: editing a threshold in the Matrice tab *looks* decisional but is not. `setValoboisMatrixThresholdValue()` validates the new value, persists it, and then calls `this.computeOrientation(this.getCurrentLot())` (`js/app/valobois-app.js:36105`). Because `computeOrientation` → `computeOrientationFromMatrix` ignores thresholds entirely, that recompute is guaranteed to return the *same* orientation it had before the edit. The UI even shows a live percentage next to each input (`js/app/valobois-app.js:36327`), so a user changing "70%" reasonably expects the routing to shift — and it never does. This is precisely the "high score → réemploi" expectation the methodology guide flags (`docs/methodologie-evaluation.md:189-191` and "Points to confirm" item 1, lines 241-244).

What I **confirmed**: (a) orientation is purely cascade-driven; (b) the thresholds drive only the Analyse-tab visuals; (c) the threshold-edit handler runs a recompute that cannot change the result; (d) `getOrientationThresholdForPercent` is unreferenced. What remains **uncertain** is purely a product decision: whether this decoupling is the intended methodology (orientation = circularity/safety cascade, value = descriptive) or whether the thresholds were meant to gate the recommendation and the wiring was never completed. Only the product owner can settle that.

## Evidence in the code
- `js/app/valobois-app.js:34354-34396` — `computeOrientationFromMatrix` derives the orientation solely from `activeRejets`/`activeVectors`; no score total or threshold is referenced.
- `js/app/valobois-app.js:34370-34384` — the literal cascade (`reemploi` default, stepping down on each non-empty `activeRejets.<level>`); this is the only thing that sets the orientation.
- `js/app/valobois-app.js:39844-39863` — `computeOrientation` wraps the matrix result; the only override is the manual `alterationForcedOrientation` lock, never a score/threshold.
- `js/app/valobois-app.js:7080-7082` — default thresholds `9 / 15 / 21` (of 30) per level.
- `js/app/valobois-app.js:33419-33453` — `getOrientationThresholdConfig` converts those to `minPercent`/`radarValue` (30/50/70%) for the descriptors `VALOBOIS_ORIENTATION_THRESHOLD_DESCRIPTORS` (`js/app/valobois-constants.js:180-202`).
- `js/app/valobois-app.js:37127-37128` — the only consumer of `getOrientationThresholdConfig`; `thresholdConfig` and `defaultThreshold` are assigned in `renderSeuils` but not used decisionally.
- `js/app/valobois-app.js:33455-33467` — `getOrientationThresholdForPercent` (maps a percent to an orientation) has zero callers in `js/` (grep-confirmed).
- `js/app/valobois-app.js:36085-36107` — `setValoboisMatrixThresholdValue` persists the edit and calls `computeOrientation`, which cannot change the routing because the cascade ignores thresholds.
- `js/app/valobois-app.js:36324-36328` — the editable `<input type="number">` per mode/orientation with a live `(xx%)` label, signalling decisional intent to the user.
- `docs/methodologie-evaluation.md:22-26, 187-191, 241-244` — the spec itself states the orientation is "not decided by adding up the value score" and flags the 70/50/30% rings as "visual guides only" pending confirmation.

## What would resolve it
- **Product owner decision (primary):** confirm whether orientation is meant to stay purely cascade-driven (value profile = descriptive) or whether the 9/15/21-of-30 thresholds should gate/override the recommendation. This is the load-bearing question.
- If decoupling is intended: make the thresholds visibly non-decisional — relabel the Matrice inputs as "radar reference rings" and drop the misleading `computeOrientation` call in `setValoboisMatrixThresholdValue` (`js/app/valobois-app.js:36105`), or remove the dead `getOrientationThresholdForPercent`.
- If thresholds should be decisional: wire a value-score gate into `computeOrientationFromMatrix` (`js/app/valobois-app.js:34354`) — e.g. cap the cascade result at the highest orientation whose `minPercent` the lot's value score meets — and add a regression test asserting that lowering the réemploi threshold below a high-scoring lot's value promotes it.
- Quick confirmation test (no decision needed): in the Matrice tab edit mode, change the réemploi threshold and verify the lot's orientation badge does **not** change — confirms the dead path empirically.
