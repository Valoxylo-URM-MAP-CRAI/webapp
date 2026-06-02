# Two overlapping species lists: lighter list drives suggestions, heavier list drives auto-fill

> **Open question** · priority #19 · Tier 3 – Reference data · Source spec: `specs/017-reference-data-catalog/spec.md`

## Question
A 111-species list and a 121-species list coexist with overlapping but not identical naming. Confirm whether the lighter list is meant to be a strict subset used only for field suggestions.

<details>
<summary>🇫🇷 Version française</summary>

Une liste de 111 essences et une de 121 coexistent, au nommage proche mais non identique. Confirmer si la liste plus légère est censée être un sous-ensemble strict réservé aux suggestions de champs.

</details>

## Why this is open
**Classification:** Cross-file inconsistency (with a downstream suspected-bug / correctness risk)

The two lists are real, distinct, and play different roles. `ESSENCES_BOIS` (the lighter list) holds exactly **111** entries, each carrying only `nomUsuel`, `nomScientifique`, `type`, `origine` — no physical properties (`js/data/essences-bois.js:1`, 111 entries confirmed by load). `ESSENCES_VALOBOIS` (the heavier list) holds exactly **121** entries with the full scoring-relevant payload: `massevolumique`, durability classes, EN 350 hazard resistances, EN 13556 code, etc. (`js/data/essences-valobois.js:3`). So the lighter list is *not* a literal subset of the heavier one in either direction: 64 of the 111 lighter common names have no exactly-matching heavier common name, and 74 of the 121 heavier common names have no match in the lighter list.

The roles are split by file. The two suggestion datalists the user actually types against — `liste-essences-communes` and `liste-essences-scientifiques`, bound on the piece inputs in `js/app/valobois-app.js:25845-25846` and `:26231-26232` — are populated **only** from `ESSENCES_BOIS` (`js/app/valobois-app.js:728`). But every property auto-fill resolves against `ESSENCES_VALOBOIS` first (`findEssenceByCommonName`/`findEssenceByScientificName`, `js/app/valobois-app.js:2364`, `:2372`), only falling back to `ESSENCES_BOIS` (`:2366`, `:2374`) — and an `ESSENCES_BOIS` hit carries no `massevolumique`, so it cannot auto-fill density. This is the as-built design: lighter list = suggestions, heavier list = auto-fill. To that extent the question's hypothesis is **confirmed**.

The genuinely open / risky part is that the two lists do not name the same species the same way, so the suggestion list routinely offers labels that the auto-fill cannot resolve. The lookup key normalises case, accents, apostrophes and whitespace (`normalizeEssenceLookupKey`, `js/data/essences-valobois.js:1472`) but is otherwise an exact-string match, so divergent groupings break it. Example: the lighter list offers two separate options **"Sapin blanc (Sapin pectiné)"** [`Abies alba`] and **"Sapin de Vancouver (Grand sapin)"** [`Abies grandis`], whereas the heavier list merges them into one entry **"Sapin blanc / Sapin de Vancouver"** with scientific name **"Abies alba / A. grandis"** — so neither common name nor scientific name matches, and density falls back to the default. There is a partial mitigation: picking a common name back-fills the scientific name (`js/app/valobois-app.js:3733-3735`), and density then retries by scientific name (`getSuggestedMasseVolumique`, `:2463-2467`); this rescues most entries. But it still leaves **20 of the 111 suggested species** with no detailed match at all — including very common French timbers: *Chêne pédonculé, Chêne sessile (Rouvre), Mélèze d'Europe, Mélèze du Japon, Sapin blanc, Iroko, Platane, Bouleau, Padouk, Wengé* — which therefore silently receive `DEFAULT_MASSE_VOLUMIQUE = 510` (`js/data/essences-valobois.js:1`) instead of a species-specific density, feeding the density/durability scoring with a generic value.

What I **confirmed**: the counts (111 vs 121), the file-level role split, the fallback chain, and the concrete set of 20 suggested labels that fail to resolve. What remains **uncertain** is intent: whether the product owner wants the lighter list to be exactly the species the diagnostician may pick (in which case its labels should be reconciled with the heavier list so auto-fill always succeeds), or whether the divergence is an accepted, known limitation. That is a product decision, not something the code can settle.

## Evidence in the code
- `js/data/essences-bois.js:1` — `ESSENCES_BOIS`, the lighter list; 111 entries, fields limited to `nomUsuel`, `nomScientifique`, `type`, `origine` (no density/durability).
- `js/data/essences-valobois.js:3` — `ESSENCES_VALOBOIS`, the heavier list; 121 entries with `massevolumique`, durability and EN 350/13556 data.
- `js/data/essences-valobois.js:1` — `DEFAULT_MASSE_VOLUMIQUE = 510`, the fallback density used when no detailed match is found.
- `js/app/valobois-app.js:728` — `ensureEssencesBoisDatalist` fills both suggestion datalists from `ESSENCES_BOIS` only.
- `js/app/valobois-app.js:25845-25846`, `:26231-26232` — the piece common/scientific inputs bind to `list="liste-essences-communes"` / `liste-essences-scientifiques` (the lighter-list-backed datalists).
- `js/app/valobois-app.js:2361-2375` — `findEssenceByCommonName` / `findEssenceByScientificName` resolve against `ESSENCES_VALOBOIS_BY_COMMON/SCIENTIFIC` first, then fall back to `ESSENCES_BOIS` (which has no density).
- `js/app/valobois-app.js:2455-2467` — `getSuggestedMasseVolumique` retries by scientific name when the common-name match has no `massevolumique`.
- `js/app/valobois-app.js:3733-3741` — picking a common name back-fills the scientific name (the bridge that partially mitigates label divergence).
- `js/data/essences-valobois.js:1472` — `normalizeEssenceLookupKey`: case/accent/apostrophe/whitespace normalisation only — still an exact-string match, so divergent groupings (e.g. "Sapin blanc" vs "Sapin blanc / Sapin de Vancouver") do not match.
- Static load of both files: 64/111 lighter common names absent from the heavier list; 23/111 lighter scientific names absent from the heavier list; **20/111** suggested species resolve to no detailed entry by either name and so default to 510 kg/m³ (notably Chêne pédonculé, Mélèze d'Europe/du Japon, Sapin blanc, Iroko, Platane, Bouleau, Padouk, Wengé).

## What would resolve it
- Product owner confirms the intended relationship: should the lighter suggestion list be a strict, name-aligned subset of the heavier list (so every offered label auto-fills), or is partial coverage acceptable?
- If alignment is intended: reconcile the 20 mismatching labels (decide split-vs-merged grouping, e.g. Sapin blanc / Sapin de Vancouver, Mélèze d'Europe vs Mélèze du Japon, Chêne pédonculé/sessile) so each suggested common *or* scientific name maps to one `ESSENCES_VALOBOIS` entry.
- Add a build-time/runtime consistency check (analogous to the canton-name bridge check noted in the spec) that flags any `ESSENCES_BOIS` entry whose common and scientific names both fail to resolve in `ESSENCES_VALOBOIS`, so future drift is caught.
- Verify in-app: type each of the 20 listed common names into a piece's species field and confirm whether density stays at 510 (no species-specific value) — confirms the user-visible impact of the divergence.
