# Canton-name climate matching falls back to bidirectional prefix matching

> **Open question** · priority #23 · Tier 3 – Reference data · Source spec: `specs/006-geo-france-context/spec.md`

## Question
Canton-name matching accepts a name that is the start of another, so short names could match unrelated cantons. Confirm this is acceptable rather than requiring an exact match.

<details>
<summary>🇫🇷 Version française</summary>

La correspondance des noms de canton accepte qu'un nom soit le début d'un autre, si bien que des noms courts pourraient correspondre à des cantons sans lien. Confirmer que c'est acceptable plutôt qu'exiger une correspondance exacte.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (with a contained, currently-latent correctness risk)

The behaviour is real and exactly as described. `_isGeoFranceClimateCantonMatch(currentCantonName, exceptionCantonName)` normalizes both names (strip accents, uppercase, drop every non-alphanumeric character) and then returns `true` not only on equality but on `currentKey.startsWith(exceptionKey) || exceptionKey.startsWith(currentKey)` (valobois-app.js:1015-1021). So `SEYNE` matches `SEYNESURMER1`, `MONTBELIARD` matches `MONTBELIARDEST`, etc., in **both** directions. This is confirmed, not inferred.

The reason this matters less than it first appears is that prefix matching is only the **last-resort fallback**, not the primary resolver. `getGeoFranceClimateCondition` resolves a canton in three tiers (valobois-app.js:1349-1361): (1) the pre-2015→post-2015 **alias table** (`_findGeoFranceClimateAliasNormativeKeysByTarget`), which is the authoritative crosswalk built from INSEE COG 2015→2023; (2) an **exact** normalized-key hit in `depData.exceptions[cantonKey]`; and only then (3) the bidirectional prefix match via `_isGeoFranceClimateCantonMatch`. The prefix tier exists to catch post-2015 cantons that were merely *renumbered* and are not in the alias file — e.g. the FD P 20-651 exception `BESANCON` resolving to the current `Besançon-1 … Besançon-6` (this is precisely spec SC-002). I confirmed by replaying the real data that 17 distinct exceptions resolve *only* through prefixing (Ajaccio-1..5, Briançon-1/2, Valence-1..4, Épinal-1/2, Montélimar-1/2, Nyons→"Nyons et Baronnies", Mortain→"Mortainais", Hendaye→"Hendaye-Côte Basque-Sud", etc.). Removing prefix matching outright would silently drop these exceptions — so the behaviour is load-bearing, not gratuitous.

What I confirmed is benign **today**: scanning every department where the climate exceptions and the canton geometry can both be keyed (climate is keyed by department *name*, cantons by *code*; I joined them through `france-departements.js`), exactly three real cantons match more than one exception name — `Montbéliard` (matches `MONTBELIARD`/`MONTBELIARD EST`/`MONTBELIARD OUEST`), `Montélimar-1`, `Montélimar-2` — and in all three cases every matched exception carries the **same** climate level, so the resolved value is correct regardless of which entry `Array.prototype.find` returns. I found **no** case in the current data where a short exception name leaks an exception level onto an unrelated canton that should have taken the department default.

What remains genuinely open is the **product decision and the durability of that safety**. The match is gated only by department, so the safety relies entirely on no two cantons within a single department having a confusable prefix relationship with a different climate level. That invariant is not enforced anywhere — it happens to hold for this snapshot. A future canton rename, a new FD P 20-651 transcription, or an alias-table gap could introduce a short normative name (the data already contains 3-letter names such as `GEX`) that prefixes an unrelated longer canton with a different default and silently mis-assigns its climate class. The validator at valobois-app.js:1247-1256 already surfaces the >1-match condition into `report.ambiguousCantons`, but it is a diagnostic report, not a guard, and `getGeoFranceClimateCondition` ignores ambiguity entirely (it just takes the first `find`). So the question for the product owner is whether bidirectional prefix matching as the fallback is intentional and acceptable, or whether it should be tightened (e.g. exact match only, prefix only at hyphen/word boundaries, or "match must be unique or all-same-level").

## Evidence in the code
- `js/app/valobois-app.js:1015-1021` — `_isGeoFranceClimateCantonMatch`: returns true on equality OR `currentKey.startsWith(exceptionKey) || exceptionKey.startsWith(currentKey)` (bidirectional prefix).
- `js/app/valobois-app.js:1006-1013` — `_normalizeGeoFranceClimateKey`: NFD-strips accents, uppercases, removes all non-`[A-Z0-9]`, so `Seyne-sur-Mer-1` → `SEYNESURMER1` and exception `Seyne` → `SEYNE`.
- `js/app/valobois-app.js:1349-1363` — resolution order in `getGeoFranceClimateCondition`: alias table → exact `exceptions[cantonKey]` → prefix-match fallback over `exceptionEntries`; `level`/`source` taken from the first match found.
- `js/app/valobois-app.js:1350-1354`, `:970-989`, `:936-968` — the alias crosswalk (`_findGeoFranceClimateAliasNormativeKeysByTarget`, `_resolveGeoFranceClimateAliasByNormative`, `_getGeoFranceClimateAliasIndex`) is the primary, authoritative path that runs *before* prefix matching.
- `js/app/valobois-app.js:1247-1256` — validator computes `matchCount` and pushes >1 hits to `report.ambiguousCantons`; this is diagnostic only and does not affect `getGeoFranceClimateCondition`.
- `js/data/climate-humidification-fd-p20-651.js:8,11` — real short exception names, e.g. `"GEX"` (3 chars) and `"SEYNE"` in `ALPES-DE-HAUTE-PROVENCE`, that are short enough to prefix longer canton names.
- `js/data/france-cantons.js` — current numbered cantons (`Besançon-1..6`, `Ajaccio-1..5`, `Valence-1..4`, `Seyne-sur-Mer-1/2`, `Montélimar-1/2`) that only resolve to their FD P 20-651 exception via the prefix fallback; this is what spec SC-002 / FR-007 depend on.
- `specs/006-geo-france-context/spec.md:67`, `:85` (FR-007) — spec explicitly documents accent/space/hyphen-insensitive matching plus prefix acceptance, and prioritising the alias crosswalk over approximate matching.

## What would resolve it
- Product owner / domain expert confirms that bidirectional prefix matching as the fallback (after alias + exact) is acceptable, OR specifies a stricter rule (exact-only; prefix only at a word/hyphen boundary; or require a unique match, else fall back to the department default).
- Add a build/test assertion over the shipped data that no real canton matches two exception entries with *different* levels within the same department — i.e. promote the existing `report.ambiguousCantons` diagnostic into a CI guard so the currently-latent risk cannot regress when canton or climate data is regenerated.
- If exactness is desired, verify that the 17 currently-prefix-only exceptions (Besançon-*, Ajaccio-*, Valence-*, Épinal-*, Montélimar-*, Nyons, Mortain, Hendaye, …) are all added to `climate-humidification-fd-p20-651-aliases.js` first, so tightening the matcher does not silently drop those climate exceptions (regression-test against spec SC-002/SC-003).
