# IFC evaluation/destination scores read from lot fields that are never populated

> **Open question** · priority #26 · Tier 4 – Exports · Source spec: `specs/012-export-ifc-bim/spec.md`

## Question
The per-criterion "evaluation" group and the "destination" group read scores from differently named locations; confirm both exist on the lot so neither comes out empty.

<details>
<summary>🇫🇷 Version française</summary>

Le groupe « évaluation » par critère et le groupe « destination » lisent les notes à des emplacements nommés différemment ; confirmer que les deux existent sur le lot pour qu'aucun ne sorte vide.

</details>

## Why this is open
**Classification:** Suspected bug / correctness risk (dead reads) — with a secondary cross-file inconsistency in the score key names.

The two IFC property groups read their scores from `lot.scores.*` using two completely different sets of keys. The **destination** group (`Pset_Valobois_Destination`) reads `lot.scores.economique`, `lot.scores.ecologique`, `lot.scores.mecanique` (and the piece field `piece.scoreReemploi` as a first choice for the economic score). The **evaluation** group (`Pset_Valobois_Evaluation`, off by default) reads ten short keys: `lot.scores.bio`, `.mech`, `.usage`, `.denat`, `.debit`, `.geo`, `.essence`, `.ancien`, `.traces`, `.provenance`. So the original question is well posed: the two groups genuinely point at differently named slots.

The investigation, however, resolves the question more sharply than "confirm both exist": **neither key set exists on the persisted lot.** A repo-wide search finds that the strings `lot.scores.economique`, `lot.scores.bio`, `lot.scores.mech` (etc.) and `piece.scoreReemploi` appear *only* inside the `getValue` closures in `DEFAULT_PSET_CONFIG` — nothing anywhere in `js/` ever **writes** `scores`, `economique`, `bio`, `mech`, `scoreReemploi`, `circularite`, or `integrity` onto a lot or piece object. The lot model created by `createEmptyLot` (valobois-app.js:3899) has no `scores`, `orientation`, `circularite`, or `integrity` field at all; its evaluation-adjacent data lives under `lot.allotissement` (e.g. `prixMarche`, `prixLot`, `lineaireLot`) and the orientation is stored as `lot.orientationLabel` (see valobois-app.js:6067 and the constants at valobois-constants.js:183-197), not `lot.orientation`. The lot passed to `buildIFC` is just a shallow copy of that model (`Object.assign({}, lot, { pieces: combinedPieces })`, valobois-app.js:47659), so it inherits no `scores` either.

Because every score `getValue` ends with `const v = parseFloat(...); return !isNaN(v) ? v : null;`, an undefined path yields `null`, and the Pset builder drops null/empty/undefined values (build-ifc.js:370) and then skips any group that ends up with zero usable properties (build-ifc.js:376). The net effect I confirmed by static reading: in a normal export the **economic / ecological / mechanical** scores in the destination group are silently omitted (only `orientation` there resolves — and even that reads `lot.orientation`, missing the real `lot.orientationLabel`), and the entire **evaluation** group, even when the user turns it on, comes out empty and is never written. The destination group still emits `prixMarche` and `prixLot` (those read `lot.allotissement.*`, which does exist), so it is not fully empty — but its three scores are not present.

The differently named keys are not arbitrary: the **destination** naming (`economique` / `ecologique` / `mecanique`) matches the Grasshopper JSON export, which builds a fresh `scores: { economique, ecologique, mecanique, historique, esthetique }` object (valobois-app.js:40266) from `computeLotScore(lot)` (valobois-app.js:40201). But that path is itself dead: `computeLotScore` is referenced only there and **is never defined** anywhere in `js/`, so the guarded call returns `null` and those values are null in the GH export too. So one IFC group borrows the GH export's key names, the other invents its own short names, and no producer of either exists in the codebase.

What remains uncertain (needs a product/runtime answer rather than more static reading): whether VALOBOIS is *intended* to compute and persist per-lot scores at all (the matrix/notation machinery operates on per-criterion `criterion.scores.fort/moyen/faible`, valobois-app.js:7309 etc., which is a different shape), or whether these score properties are aspirational scaffolding awaiting a `computeLotScore`/score-persistence implementation. I confirmed the current reads are dead; I cannot confirm the designers' intent for where the canonical lot-level scores should live.

## Evidence in the code
- `js/app/valobois-app.js:219-230` — destination group: `scoreEconomique` reads `piece?.scoreReemploi ?? lot?.scores?.economique`; `scoreEcologique` reads `lot?.scores?.ecologique`; `scoreMecanique` reads `lot?.scores?.mecanique`.
- `js/app/valobois-app.js:269-286` — evaluation group (`enabled: false`): reads `lot?.scores?.bio / .mech / .usage / .denat / .debit / .geo / .essence / .ancien / .traces / .provenance` — a different key set from the destination group.
- `js/app/valobois-app.js:218` — destination `orientation` reads `piece?.orientation || lot?.orientation`, but the persisted field is `lot.orientationLabel` (see below), so this is also a likely miss.
- `js/app/valobois-app.js:6067` — the app's own orientation read uses `lot.orientationLabel || lot.orientation`, showing `orientationLabel` is the real field.
- `js/app/valobois-app.js:3899-3920+` — `createEmptyLot` lot model: has `allotissement{...}` but no `scores`, `orientation`, `circularite`, or `integrity` keys.
- `js/app/valobois-app.js:47659` — the lot handed to `buildIFC` is `Object.assign({}, lot, { pieces: combinedPieces })`, a shallow copy carrying no `scores`.
- `js/lib/build-ifc.js:369-376` — `getValue` results that are `null/undefined/''` are dropped, and a group with no usable properties is skipped entirely.
- `js/app/valobois-app.js:40201-40202` — `this.computeLotScore` is called guarded by `typeof === 'function'`; grep shows `computeLotScore` is **never defined** in `js/`, so it is always skipped.
- `js/app/valobois-app.js:40266-40272` — the Grasshopper JSON export builds `scores: { economique, ecologique, mecanique, historique, esthetique }` from `scores.economic/ecological/mechanical/...`; this is the only place those `economique`-style key names originate, and it sits on a fresh object, not on the persisted lot.
- Repo-wide grep: `lot.scores.economique`, `lot.scores.bio`, `lot.scores.mech`, `piece.scoreReemploi`, `lot.circularite`, `lot.integrity` appear **only** inside the IFC `getValue` closures; no assignment of `lot.scores` / `scoreReemploi` exists anywhere (the `next.scores` / `criterion.scores` writes at valobois-app.js:8015/8245/8390 are on notation-criterion objects, a different shape).

## What would resolve it
- Product owner confirms whether lots are supposed to carry computed per-lot scores at all, and if so under which canonical key names (the GH-style `economique/ecologique/mecanique`, the short `bio/mech/...`, or something else).
- If they are intended: locate or implement the producer (the missing `computeLotScore`, or a step that stamps `lot.scores` / `piece.scoreReemploi` before export) and align the two IFC groups on one key set.
- Runtime check: export a fully evaluated lot in library mode with the **evaluation** group enabled, open the `.ifc`, and confirm whether `Pset_Valobois_Evaluation` and the three destination scores are present or (as static reading predicts) absent.
- Also confirm the destination `orientation` read: decide whether it should read `lot.orientationLabel` rather than `lot.orientation`, since the latter is not the persisted field.
