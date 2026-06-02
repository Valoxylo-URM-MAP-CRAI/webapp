# The "Seuils" and "Confiance" rows of the matrix dataset are dropped at parse time and never used

> **Open question** · priority #6 · Tier 1 – Decision engine · Source spec: `specs/011-editor-rejection-matrix/spec.md`

## Question
The dataset carries per-orientation "Seuils" and "Confiance" bounds that are not surfaced in the displayed criteria list and look documentary. Confirm their real use (this ties into whether the point-thresholds matter at all).

<details>
<summary>🇫🇷 Version française</summary>

Le jeu de données porte des bornes « Seuils » et « Confiance » par orientation, absentes de la liste des critères affichés et apparemment documentaires. Confirmer leur usage réel (lié au fait de savoir si les seuils chiffrés comptent).

</details>

## Why this is open
**Classification:** Legacy / dead code (with a cross-file inconsistency element).

The "Seuils" and "Confiance" rows are **not merely hidden from the criteria list — they are discarded before any JavaScript object is built**, so they cannot influence anything. The matrix dataset is a single CSV string `RAW_CSV` embedded in `js/data/valobois-matrice-vecteurs-rejets.js`. After the 50 numbered criteria rows, the CSV appends four trailing rows whose first column (the rank) is empty: `;Seuils;…`, `;Confiance;;…`, `;Correspondance;…`, and the five letter→score legend rows (`;3;A;…` etc.). These carry the per-orientation numbers the question asks about — e.g. the `Seuils` row holds `122;53;-10` under Réutilisation, `126;31;14` under Réemploi, etc., and the `Confiance` row holds `24;16;8` under Réutilisation and Réemploi.

The parser at `js/data/valobois-matrice-vecteurs-rejets.js:37` builds `entries` with `lines.slice(3).map(line => line.split(";")).filter(cols => Number.isFinite(toNumber(cols[0])))`. Because all four trailing rows begin with `;`, their `cols[0]` is the empty string; `toNumber("")` returns `null` (`js/data/valobois-matrice-vecteurs-rejets.js:8`), and `Number.isFinite(null)` is `false`, so **every one of these rows is filtered out**. The exported `window.VALOBOIS_MATRICE_VECTEURS_REJETS.entries` (line 71) therefore contains only the 50 ranked criteria. I confirmed by grep that no code reads `RAW_CSV`, `"Seuils"`, `"Confiance"`, or `"Correspondance"` from this dataset, and that the distinctive threshold magnitudes (122, 126, -68, -33, -29) appear nowhere else in `js/` except as unrelated SVG/GeoJSON coordinate noise. So the rows are genuinely dead documentary data.

This matters for the second half of the question — "whether the point-thresholds matter at all" — and here is the cross-file inconsistency. The orientation thresholds the engine actually uses are a **completely separate, hardcoded structure**: `VALOBOIS_DEFAULT_NOTATION_MODE_ORIENTATION_THRESHOLDS` in `js/app/valobois-constants.js:258-262`, with values `recyclage 9 / reutilisation 15 / reemploi 21` on the 0–30 scale described in FR-012. These are surfaced and edited through the "Seuils" bar (`renderSeuils`, referenced at `js/app/valobois-app.js:8052` and elsewhere) and the editor tabs (`js/app/editor-tab-notation.js:415`). They bear **no numerical relationship** to the CSV `Seuils` row (9/15/21 vs 122/53/-10/126/31/14…), which means the CSV bounds are not even a stale copy of the live thresholds — they are a different quantity (raw cumulative score bounds from the original Valoxylo spreadsheet) that the current decision engine does not consume.

What I confirmed: the CSV `Seuils`/`Confiance`/`Correspondance` rows are parsed out and read by nothing; the live thresholds come from a hardcoded constant; the two sets of numbers are unrelated. What remains a product decision rather than a code fact: whether these bounds *should* drive the engine (i.e. the CSV is the authoritative source and the code drifted), or whether they are intentionally retained only as provenance from the source spreadsheet and the hardcoded constants are authoritative. The code cannot answer that; spec 011 itself flags it (`specs/011-editor-rejection-matrix/spec.md:87` and Open Questions line 119) by listing "Seuils de référence" as "présentes dans le fichier source mais non reprises".

(Note: criteria #43–50 are *named* "Confiance" in their critère column and ARE parsed normally as real ranked criteria — they are unrelated to the trailing `;Confiance;;…` summary row this question concerns. Do not conflate them.)

## Evidence in the code
- `js/data/valobois-matrice-vecteurs-rejets.js:37` — `entries` filters rows to `Number.isFinite(toNumber(cols[0]))`; the trailing summary rows start with `;` (empty rank) and are dropped here.
- `js/data/valobois-matrice-vecteurs-rejets.js:8` — `toNumber("")` returns `null`, so `Number.isFinite(null) === false` excludes the empty-rank rows.
- `js/data/valobois-matrice-vecteurs-rejets.js` (RAW_CSV, the `;Seuils;…` and `;Confiance;;…` lines) — the actual bound values (e.g. Réutilisation `122;53;-10`, Réemploi `126;31;14`; Confiance `24;16;8`) live only in this string.
- `js/data/valobois-matrice-vecteurs-rejets.js:71` — only `entries` (the 50 ranked criteria) is exported on `window.VALOBOIS_MATRICE_VECTEURS_REJETS`; the summary rows are not exported.
- `js/app/valobois-app.js:8189-8192` — the sole consumer maps `payload.entries`; there is no access to any "Seuils"/"Confiance" summary structure.
- `js/app/valobois-constants.js:258-262` — `VALOBOIS_DEFAULT_NOTATION_MODE_ORIENTATION_THRESHOLDS` = `{recyclage:9, reutilisation:15, reemploi:21}` on the 0–30 scale is the live threshold source; numerically unrelated to the CSV `Seuils` row.
- `specs/011-editor-rejection-matrix/spec.md:87` and `:119` — the spec already lists the "Seuils de référence" rows as present in the source file but "non reprises dans la liste des critères affichés".

## What would resolve it
- Product owner / methodology owner confirms intent: are the CSV `Seuils`/`Confiance` bounds (a) obsolete provenance to be deleted, or (b) the authoritative figures the engine *should* use, meaning the hardcoded `VALOBOIS_DEFAULT_NOTATION_MODE_ORIENTATION_THRESHOLDS` (9/15/21) has drifted from them and must be reconciled.
- If (a): remove the trailing `Seuils`/`Confiance`/`Correspondance`/legend rows from `RAW_CSV` (or document them as inert) — verified safe since the parse filter already discards them and grep confirms no reader.
- If (b): trace the original Valoxylo spreadsheet to learn what scale `122/53/-10`, `126/31/14`, `24/16/8` are expressed on, and decide how (if at all) they map onto the live 0–30 threshold inputs before wiring them into the engine.
