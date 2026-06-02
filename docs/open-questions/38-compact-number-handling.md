# Compact number handling: measure tokens extract numbers, custom-info tokens do not

> **Open question** · priority #38 · Tier 4 – Exports · Source spec: `specs/015-barcode-qr-labels/spec.md`

## Question
A measure-oriented compact helper extracts and joins numbers, but the custom-info compact path does not. Confirm whether custom-info numeric values were meant to get the same treatment.

<details>
<summary>🇫🇷 Version française</summary>

Un assistant compact « orienté mesures » extrait et concatène des nombres, mais pas le chemin compact des infos personnalisées. Confirmer si les valeurs numériques des infos perso devaient recevoir le même traitement.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (with a minor cross-file consistency angle — the two custom-info compact implementations agree with each other, so the ambiguity is genuinely about intent, not a divergence bug).

The codebase has two distinct compact-token strategies, and they treat numbers differently. The **measure-oriented helper** `formatBarcodeComposerDurabiliteNaturelleToken` (`js/app/valobois-app.js:40814`) runs `raw.match(/\d+/g)`, dedupes the integers it finds, and — when two or more distinct numbers are present — joins them with a dash (`unique.join('-')`, line 40825). So an input like `"Classe 1-2"` or `"durabilité 1 à 2"` becomes the readable token `1-2`. Only when no numbers are found does it fall back to `abbreviateCompactToken`.

The **custom-info compact path** does no such extraction. Both implementations of it route the value through `abbreviateCompactToken` (`js/app/valobois-app.js:40405`), which strips every non-alphanumeric character (`replace(/[^A-Za-z0-9]+/g, '')`), upper-cases, and slices to `maxChars` (6 for values). Because the separators are stripped rather than normalized, a value such as `"12 / 24 mm"` collapses to `122 4MM`-style concatenation (`1224MM`, then sliced to 6 chars), and a value like `"1-2"` becomes `12`. The dash-join semantics of the measure helper are absent. This is true in the core method `formatBarcodeComposerCustomInfosCompact` (`js/app/valobois-app.js:40845`, value tokenized via `this.abbreviateCompactToken(values[0], 6)`) and identically in the runtime override installed by the add-on patch (`js/app/custom-infos-export-barcode-ifc-patch.js:101`, value tokenized via `tokenize(values[0], 6)`, where `tokenize` defers to `app.abbreviateCompactToken` at line 81).

I confirmed which path actually runs: the add-on patch reassigns `app.formatBarcodeComposerCustomInfosCompact` at runtime (`custom-infos-export-barcode-ifc-patch.js:239-241`) and feeds the result into the barcode value map (`:254-255`). So custom-info compact values are produced by the patch's `formatCustomInfosCompact`, which uses the same accent-strip/alphanumeric-strip/slice logic and never calls `match(/\d+/g)`. The spec itself flags this divergence as deliberate-looking but unconfirmed: edge case "Several numbers in one value" (`spec.md:52`) and the "Number handling differs" open question (`spec.md:114`) both describe exactly this — the measure helper joins numbers with dashes while "the general custom-info compact path just shortens the value directly."

What I could NOT determine from static reading is **intent**: whether custom-info numeric values (e.g. a user-entered "réf 12-34", "humidité 12 %", "section 45 x 90") were meant to be rendered with the same number-extracting/dash-joining treatment as `durabiliteNaturelle`, or whether the simpler strip-and-slice was a deliberate choice for the free-form custom-info field. `durabiliteNaturelle` is a domain field with a known numeric-class shape (Classe 1–5), so dash-joining is meaningful there; custom-info values are arbitrary user text where extracting numbers could just as easily harm readability. The code is unambiguous about what it does; only the product owner can say which behaviour is wanted.

## Evidence in the code
- `js/app/valobois-app.js:40814-40830` — `formatBarcodeComposerDurabiliteNaturelleToken`: `raw.match(/\d+/g)`, dedupe, `unique.join('-')` for 2+ numbers; this is the measure-oriented helper that "extracts and joins numbers."
- `js/app/valobois-app.js:40405-40414` — `abbreviateCompactToken`: NFD-normalize, strip diacritics, `replace(/[^A-Za-z0-9]+/g, '')`, upper-case, `slice(0, maxChars)`. No number grouping; separators between digits are deleted.
- `js/app/valobois-app.js:40832-40852` — core `formatBarcodeComposerCustomInfosCompact`: value token is `this.abbreviateCompactToken(values[0], 6)` (line 40845) — no `match(/\d+/g)`.
- `js/app/custom-infos-export-barcode-ifc-patch.js:74-107` — patch `formatCustomInfosCompact`: `tokenize(values[0], 6)` (line 101); `tokenize` delegates to `app.abbreviateCompactToken` (line 81) or replicates the same strip/slice inline (lines 84-89). No number extraction.
- `js/app/custom-infos-export-barcode-ifc-patch.js:239-257` — the patch overrides `app.formatBarcodeComposerCustomInfosCompact` at runtime and wires it into `buildBarcodeComposerValueMap` → `map.customInfos`, confirming the patch's number-agnostic path is the one used for labels.
- `specs/015-barcode-qr-labels/spec.md:52` and `:114` — the as-built spec documents the divergence ("Several numbers in one value" edge case; "Number handling differs" open question) as observed-but-unconfirmed intent.

## What would resolve it
- Product owner confirms the intended rendering for a custom-info value containing multiple numbers (e.g. `"45 x 90"`, `"réf 12-34"`): is the current strip-and-concatenate output (`4590`, `1234`) acceptable, or should custom-info values get the same `match(/\d+/g)` + dash-join treatment as `durabiliteNaturelle`?
- If parity is desired, factor the number-extraction step out of `formatBarcodeComposerDurabiliteNaturelleToken` into a shared tokenizer and have both the core `formatBarcodeComposerCustomInfosCompact` and the patch's `formatCustomInfosCompact` call it (note: BOTH must change, since the patch overrides the core at runtime — `custom-infos-export-barcode-ifc-patch.js:239`).
- Quick runtime check: build a compact label for a piece whose custom info value is `"12 / 24 mm"` and inspect the encoded token to confirm the as-built output (`1224MM`) matches expectations.
