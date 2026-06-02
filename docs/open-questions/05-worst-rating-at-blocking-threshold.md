# Worst rating (E) sits exactly at the default blocking threshold

> **Open question** · priority #5 · Tier 1 – Decision engine · Source spec: `specs/007-editor-notation-scoring/spec.md`

## Question
A criterion rated E lands exactly at the default blocking severity. Confirm this is intended so that an E always blocks (rather than sitting just under the threshold).

<details>
<summary>🇫🇷 Version française</summary>

Une note E tombe exactement au seuil de blocage par défaut. Confirmer que c'est voulu pour qu'un E bloque toujours (plutôt que de rester juste sous le seuil).

</details>

## Why this is open
**Classification:** Product-intent ambiguity (the code is unambiguous; whether the boundary choice is the desired one is the open decision).

The A-to-E letter scale is backed by fixed integer scores: `A=3, B=2, C=1, D=-3, E=-10` (`getValoboisFixedScoreForLetter` / `getValoboisFixedLetterForScore`, `js/app/valobois-app.js:7236-7253`). The full set of allowed scores is exactly `[-10, -3, 1, 2, 3]` (`getValoboisFixedScoreValues`, `valobois-app.js:7219-7221`). So `E` is not a range — it is the single value `-10`, the most penalising score the engine can produce. The matrix CSV agrees: its "Correspondance" block maps `-10 → E` (`js/data/valobois-matrice-vecteurs-rejets.js`, last rows).

The blocking gates compare a criterion's effective score against a `scoreThreshold` using a **`<=`** comparison, and the default threshold when none is declared is **`-10`** (`resolveValoboisCustomFreeAlertState`, `valobois-app.js:33964-33965`):

```js
const threshold = Number.isFinite(Number(inheritedGate.scoreThreshold)) ? Number(inheritedGate.scoreThreshold) : -10;
const triggered = Number(score) <= threshold;
```

The five built-in score gates — Contamination, Expansion, Intégrité biologique, Intégrité mécanique, Altération (ranks 1–5) — are declared with **no** explicit `scoreThreshold` (`getValoboisDefaultGateDefinitions`, `valobois-app.js:33534-33543`), so they fall through to the `-10` default. Because the worst attainable score is also `-10`, the boundary case the question raises is real and load-bearing: with `score (-10) <= threshold (-10)` evaluating to `true`, an `E` fires the gate. Had the code used a strict `<` comparison, an `E` would *never* block (no score is below `-10`), which would silently disable these gates. The `<=` is therefore not incidental — it is exactly what makes `E` blocking, and it is the only thing standing between "E blocks" and "E never blocks". The same `-10` default and `Math.min(...)` aggregation drive the gate-threshold marker shown on the orientation bar (`getRadarOrientationPositionData`, `valobois-app.js:32426-32443`), so the two paths agree.

This boundary is reinforced elsewhere: the matrix editor only lets a criterion take the `-10` score if it is one of the default gates (ranks 1–5); every other criterion has `-10` filtered out of its allowed values (`valobois-app.js:8426-8429`). That confirms `-10`/`E` is reserved as the gate-blocking value by design, not an accident of data entry. The sixth gate, Démontabilité, deliberately overrides the default with a softer `scoreThreshold: -3` (= `D`), so it blocks at `D` or worse (`valobois-app.js:33541`) — proof the threshold mechanism is intentional and per-gate tunable.

One nuance worth flagging (confirmed, not a contradiction): the *global hard lock* used during recompute does not go through this score comparison at all. `valoboisGetGlobalLockState` / `valoboisGetAlterationLockState` test the textual level directly (`expansion === 'forte'`, `contamination === 'forte'`, `alteration === 'forte'`) in `js/app/valobois-domain-helpers.js:99-107`. For these gate criteria the "Forte" level maps to score `-10`/`E` anyway (`NOTATION_CRITERION_SCORE_STEPS`, `valobois-app.js:424-467`: `contaminationDenat:[-10,1,3]`, `expansion:[-10,-3,3]`, `integriteBio:[3,1,-10]`, `integriteMech:[3,-3,-10]`, `alterationTraces:[-10,1,3]`), so the two encodings currently coincide on the `E ⇔ Forte/Faible` boundary. They are *separate* implementations of the same intent, which is why the question is worth a product confirmation: the score-threshold path (used by inherited custom alerts and the orientation-bar marker) and the level-string path (used by the live lock) must agree that "E always blocks," and today they do only because the data maps the blocking level to `-10`.

What is confirmed: the code makes an `E` block (inclusive `<=` against a `-10` default). What is a decision, not a fact: whether "exactly at the threshold, inclusive" is the intended product behaviour, or whether the threshold was meant to sit one notch above `E` (e.g. at `D`/`-3`, as Démontabilité does) so that only sub-`E` ratings — which cannot exist on this scale — would block.

## Evidence in the code
- `js/app/valobois-app.js:7245-7253` — `getValoboisFixedScoreForLetter`: `E → -10`, the most penalising score.
- `js/app/valobois-app.js:7219-7221` — `getValoboisFixedScoreValues` returns `[-10, -3, 1, 2, 3]`; `-10` is the floor, so nothing scores below `E`.
- `js/app/valobois-app.js:33964-33965` — gate trigger is `score <= threshold` with a `-10` default threshold; this is what makes `E` (`-10`) fire rather than sit just under.
- `js/app/valobois-app.js:33534-33543` — `getValoboisDefaultGateDefinitions`: gates 1–5 declare no `scoreThreshold` (→ default `-10`); Démontabilité explicitly uses `scoreThreshold: -3` (= `D`).
- `js/app/valobois-app.js:8426-8429` — only default gates (rank 1–5) may use the `-10` score; all other criteria have `-10` filtered out, reserving `E` for blocking.
- `js/app/valobois-app.js:32426-32443` — `getRadarOrientationPositionData` reuses the same `-10` default + `Math.min(...)` for the displayed gate-threshold marker.
- `js/app/valobois-domain-helpers.js:99-107` — the live global/alteration lock keys off the textual level `=== 'forte'`, a parallel code path to the score comparison.
- `js/app/valobois-app.js:424-467` — `NOTATION_CRITERION_SCORE_STEPS`: for the five gate criteria the blocking level (`Forte`/`Faible`) maps to score `-10`/`E`, aligning the two paths.
- `js/data/valobois-matrice-vecteurs-rejets.js` — Correspondance block maps `-10 → E`; gate rows (Contamination, Expansion, …) carry the `-10` score at their blocking level.

## What would resolve it
- Product owner confirms the intended semantics: should the default gate fire *at* `E` (current inclusive `<=` against `-10`) — i.e. "an E always blocks" — or only *below* `E` (which, given `-10` is the score floor, would mean these gates never block)?
- If "E always blocks" is desired, document that the inclusive boundary is intentional and that the `-10` default threshold is deliberately set to the score floor (add a code comment at `valobois-app.js:33964`), so a future refactor to `<` does not silently disable the five default gates.
- If the threshold was meant to be softer (block from `D`/`-3` like Démontabilité), set an explicit `scoreThreshold` on gates 1–5 in `getValoboisDefaultGateDefinitions` rather than relying on the `-10` default.
- Confirm the two parallel implementations stay in sync: any change to which letter blocks must be applied to both the score-threshold path (`valobois-app.js:33964`) and the level-string lock (`valobois-domain-helpers.js:99-107`).
