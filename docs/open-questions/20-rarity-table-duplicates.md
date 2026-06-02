# Duplicate species rows in the rarity & provenance table

> **Open question** · priority #20 · Tier 3 – Reference data · Source spec: `specs/017-reference-data-catalog/spec.md`

## Question
The rarity table contains duplicate-looking rows (Robinier, Iroko, Abachi/Samba, Courbaril/Jatoba) of which only the first is kept. Confirm whether the later rows were meant to carry different values.

<details>
<summary>🇫🇷 Version française</summary>

La table de rareté contient des lignes en double (Robinier, Iroko, Abachi/Samba, Courbaril/Jatoba) dont seule la première est conservée. Confirmer si les lignes suivantes devaient porter des valeurs différentes.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (with a latent cross-file / data-authoring concern).

The deduplication behaviour itself is **not** ambiguous: the code is explicit and consistent about keeping the *first* row that wins a given lookup key. What is open is whether the duplicate rows are deliberate redundancy (two accepted French names for the same wood, where collapsing them is harmless) or an authoring mistake where a later row was supposed to describe a *different* species and therefore carry different values. Only the dataset author / product owner can settle that intent.

The four flagged pairs collide on the keys the lookup uses — `codeEn13556` (EN 13556 code) and the normalized `nomScientifique` — so the second row of each pair is permanently shadowed. Confirming against the shipped CSV in `js/data/rarete-provenance.js`:

- **Robinier**: `Robinia / Acacia` and `Robinier faux-acacia` both carry code `RBPS`, scientific `Robinia pseudoacacia`, and default rarity `Peu commune`. The two rows are identical except for the French label — they are clearly two names for the *same* species, so collapsing is benign.
- **Iroko**: two rows (one `Famille = Feuillu tempéré`, one `Feuillu tropical`) are byte-for-byte identical apart from the `famille` column (code `MLEX`, `Milicia excelsa / M. regia`, `Rare;Commune;Importante`). The default rarity is the same, so the shadowing has no effect on the scoring output.
- **Abachi / Samba**: `Ayous / Samba` (code `TPSX`, `Rare;Peu commune;Régulière`) shadows the later `Abachi / Samba (bis)` row (same code `TPSX`, same scientific `Triplochiton scleroxylon`, **default rarity also `Rare`**, but Guide-Benoît columns `x;x`). Same default rarity, so the output is unchanged — only the secondary "Guide Benoît" annotation columns differ.
- **Courbaril / Jatoba**: `Jatoba` (code `HYCO`, `Rare;Commune;Importante`) shadows the later `Courbaril` row (same code `HYCO`, same scientific `Hymenaea courbaril`, **default rarity also `Rare`**, but Guide-Benoît columns `x;x`).

What I **confirmed**: in all four pairs the *default rarity* (`rareteParDefaut`) — the only value the scoring actually consumes (see `computeEstimatedRareteProvenance`, valobois-app.js:15392, which reads `entry.rareteParDefaut`) — is identical between the two rows. So today the shadowing is **functionally inert for scoring**: whichever row wins, the suggested rarity is the same. The visible divergence is confined to the secondary "Guide Benoît" columns (`rareteGuideBenoit`, `disponibiliteBruteBenoit`), which are carried on the entry object but are not read by the rarity computation.

What remains **uncertain**: whether the intent was for those later rows to be *distinct species* with their own (possibly different) default rarity. "Courbaril" and "Jatoba" are genuinely two different French/Brazilian trade names that the literature sometimes maps to the *same* botanical species (`Hymenaea courbaril`) and sometimes to different *Hymenaea* species; "Abachi"/"Samba"/"Ayous" are likewise overlapping trade names for `Triplochiton scleroxylon`. The "(bis)" / "Apa / Afrormosia bis" suffixes in the French labels strongly suggest the author knew these were duplicate rows and added them deliberately as alias entries — but that is an inference from a label, not a documented decision. If any of those later rows was meant to carry a *different* code or scientific name (and thus not collide), that would be a genuine data bug currently masked by the matching collision.

## Evidence in the code
- `js/data/rarete-provenance.js:23-24` — the two Robinier rows (`Robinia / Acacia` and `Robinier faux-acacia`), both `RBPS` / `Robinia pseudoacacia` / `Peu commune`.
- `js/data/rarete-provenance.js:65` and `:76` — two `Iroko` rows differing only in `famille` (`MLEX`, identical rarity columns).
- `js/data/rarete-provenance.js:67` and `:91` — `Ayous / Samba` vs `Abachi / Samba (bis)`, both `TPSX` / `Triplochiton scleroxylon`, default rarity `Rare`, differing only in the Guide-Benoît columns.
- `js/data/rarete-provenance.js:100` and `:110` — `Jatoba` vs `Courbaril`, both `HYCO` / `Hymenaea courbaril`, default rarity `Rare`, differing only in the Guide-Benoît columns.
- `js/data/rarete-provenance.js:43-52` — the data file's own index build: `if (codeKey && codeKey !== "X" && !byCode.has(codeKey)) byCode.set(...)`, and the same `!byFrench.has` / `!byScientific.has` "first wins, ignore later duplicates" guard for the French and scientific maps.
- `js/app/valobois-app.js:15276-15298` — the app rebuilds its own indexes (`_rareteEntriesByCode`, `_rareteEntriesByFrench`, `_rareteEntriesByScientific`, plus the two "head" maps) and applies the identical `!map.has(key)` first-wins rule; the code map even splits `A/B` codes into tokens, so any later row sharing a code *token* is shadowed too.
- `js/app/valobois-app.js:15300-15341` — the lookup priority: manual override code → EN 13556 code → exact scientific name → exact French name; the duplicate rows collide at the first three of these, so the later row never wins.
- `js/app/valobois-app.js:15392-15414` — `computeEstimatedRareteProvenance` reads only `entry.rareteParDefaut`; the Guide-Benoît columns that differ between the duplicates are not consumed here.
- `specs/017-reference-data-catalog/spec.md:72` — the spec already documents the edge case ("the first entry is kept ... repeated Robinier / Iroko rows") and lists it as an open question at line 144, so the behaviour is acknowledged as intended de-dup, not an accident.
- `scripts/generate-rarete-provenance-data.mjs:48-60` — the generator that emits `rarete-provenance.js` applies the same first-wins guard, so the duplicates survive regeneration unchanged; fixing them means editing the upstream `tableau_essences_rarete.csv` source, not the JS.

## What would resolve it
- Product owner / dataset author confirms intent for each pair: are `Courbaril`/`Jatoba`, `Abachi`/`Ayous`, the two `Iroko` rows, and the two `Robinier` rows deliberate *alias* entries for the same species (current behaviour is correct, just redundant), or were any meant to be a *distinct* species with its own code/scientific name (in which case the colliding row is a data bug to fix in `tableau_essences_rarete.csv`)?
- Decision on whether the secondary Guide-Benoît columns (`rareteGuideBenoit`, `disponibiliteBruteBenoit`) should ever influence output; if they should, the shadowing becomes user-visible and the duplicate rows would need disambiguation. (Today `grep` confirms these two fields are read by no scorer — only `rareteParDefaut` is consumed.)
- If the duplicates are confirmed intentional, drop the redundant rows (or mark them) in the source CSV and regenerate via `scripts/generate-rarete-provenance-data.mjs` to remove the noise, then update the spec's open-questions list (spec.md:144) to closed.
