# Undifferentiated custom criterion: Fort/Moyen/Faible collapse to the same recorded value

> **Open question** · priority #9 · Tier 1 – Decision engine · Source spec: `specs/007-editor-notation-scoring/spec.md`

## Question
When a custom criterion's three levels keep the same default rating, the tool cannot tell Fort/Moyen/Faible apart and silently falls back to the active mode. Confirm whether a custom criterion should be usable before its levels are differentiated.

<details>
<summary>🇫🇷 Version française</summary>

Quand les trois niveaux d'un critère libre gardent la même note par défaut, l'outil ne distingue pas Fort/Moyen/Faible et retombe silencieusement sur le mode actif. Confirmer si un critère libre doit être utilisable avant différenciation de ses niveaux.

</details>

## Why this is open
**Classification:** Suspected bug / correctness risk (with a layer of product-intent ambiguity).

The behaviour is confirmed in code and it is real. A custom criterion ("critère personnalisé") stores **only a single numeric score** on the lot — `lot.customScores[criterionId]` (`getValoboisLotCustomScoreValue` / `setValoboisLotCustomScoreValue`, `js/app/valobois-app.js:31935-31954`). There is **no** separate field recording which of the three buttons (Fort / Moyen / Faible) the diagnostician actually pressed. The chosen level is always *reverse-derived* from that one number by matching it back against the criterion's three configured level values.

That reverse mapping lives in `getValoboisCustomFreeLevelKeyForScore` (`js/app/valobois-app.js:33797-33807`). It tests the recorded score against `scores.fort.value`, then `scores.moyen.value`, then `scores.faible.value`, and returns the **first** value that matches. A freshly created custom criterion has all three set to the same default: `buildValoboisDefaultCustomFreeCriterion` (`js/app/valobois-app.js:7294-7330`) sets `fort.value = moyen.value = faible.value = 1`. So for any default criterion the recorded score is `1`, which matches `scores.fort` first and the function unconditionally returns `'fort'` — regardless of which button the user pressed. The slider's `oninput` handler confirms this is not a UI-only artifact: it writes `scoreMap[levelKey]` to the lot (`js/app/editor-tab-notation.js:397-405`), and since `scoreMap.fort === scoreMap.moyen === scoreMap.faible === 1` (built at `js/app/editor-tab-notation.js:201-205`), pressing Fort, Moyen or Faible all persist the identical value `1`. The information is destroyed at write time, not just at read time.

The "falls back to the active mode" branch the question refers to is line `js/app/valobois-app.js:33805` (`if (mode === 'fort' || mode === 'moyen' || mode === 'faible') return mode;`). Note a subtlety I confirmed: for the *default* case this branch is **never reached**, because score `1` already matches `scores.fort` and returns early at line 33802. The fallback only fires for criteria whose three values are all *non-default and still equal to each other but different from the stored number* — a narrower, edge configuration. So the practical default-criterion outcome is "everything reads as Fort", and the active-mode fallback is a secondary, rarer manifestation of the same root cause (level cannot be recovered from a single number when values collide).

This matters because the collapsed level feeds the decision engine in three places, all keyed on the derived `levelKey`: the orientation vectors/rejects aggregation (`js/app/valobois-app.js:34312-34331`), the per-criterion rendering / slider initial position (`js/app/editor-tab-notation.js:213-218`, same first-match-wins logic), and custom-alert condition matching, where a condition referencing `custom:<id>` reads the criterion's level via `getValoboisLevelKeyForAlertConditionRef` → `getValoboisCustomFreeLevelKeyForScore` (`js/app/valobois-app.js:33836-33843`). A custom criterion left at defaults therefore always contributes as "Fort" to orientation and always reports "Fort" to any alert condition pointing at it, even though the diagnostician may have deliberately set it to Faible.

What I confirmed: the data model stores one number, the level is derived by first-match, defaults collide at `1`, and three consumers depend on the derived level. What remains a product decision: whether a custom criterion *should* be scorable at all before its three values are differentiated on the Matrice tab — i.e. whether this is a bug to fix (block/warn until differentiated, or persist the level key explicitly) or an accepted limitation of authoring a criterion with undifferentiated levels.

## Evidence in the code
- `js/app/valobois-app.js:7294-7330` — `buildValoboisDefaultCustomFreeCriterion`: default `scores.fort/moyen/faible` all `{ value: 1, ... }`, so a new criterion's three levels are identical.
- `js/app/valobois-app.js:31935-31954` — lot stores only a single number per custom criterion (`lot.customScores[criterionId]`); no level key is persisted.
- `js/app/valobois-app.js:33797-33807` — `getValoboisCustomFreeLevelKeyForScore`: first-match against fort→moyen→faible; line 33805 is the "active mode" fallback when no value matches.
- `js/app/editor-tab-notation.js:201-205` — `scoreMap` built from the criterion's three values; all default to `1`.
- `js/app/editor-tab-notation.js:397-405` — slider `oninput` writes `scoreMap[levelKey]`; with colliding values, Fort/Moyen/Faible all persist the same number, destroying the choice at write time.
- `js/app/editor-tab-notation.js:213-218` — initial slider position is reverse-derived with the same first-match logic, so the UI re-renders a defaulted criterion as Fort.
- `js/app/valobois-app.js:34312-34331` — orientation vectors/rejects aggregation keys off the derived `levelKey` for custom criteria.
- `js/app/valobois-app.js:33836-33843` — custom-alert conditions referencing `custom:<id>` read the level via the same collapsing function.
- `specs/007-editor-notation-scoring/spec.md:74` — the spec already documents this as the "Ambiguous level when ratings are not differentiated" edge case, framed as expected behaviour pending confirmation.

## What would resolve it
- Product owner decides intent: is a custom criterion meant to be usable before its three level values are differentiated (accepted limitation), or not (bug)?
- If it must be usable: change the model to persist the chosen level key (e.g. store `{ level, score }` instead of a bare number in `lot.customScores`) so Fort/Moyen/Faible survive a value collision, instead of reverse-deriving the level.
- If it must not be usable: have the Notation tab (or the Matrice authoring step) block/disable scoring — or surface a clear "levels not differentiated" warning — until `scores.fort.value`, `scores.moyen.value`, `scores.faible.value` are distinct.
- Add a test: create a default custom criterion, press Faible, reload, and assert the line reads Faible and contributes as Faible to orientation and alert conditions (today it reads Fort).
