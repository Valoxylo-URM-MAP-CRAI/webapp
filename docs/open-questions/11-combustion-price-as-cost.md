# Combustion lot price subtracted from the operation monetary balance — cost, value, or double-negated?

> **Open question** · priority #11 · Tier 2 – Quantitative outputs · Source spec: `specs/010-editor-synthesis-orientation/spec.md`

## Question
In the operation monetary balance, a Combustion lot's price is subtracted (treated as a disposal cost) while the other orientations are added. Document the exact business meaning (cost vs value).

<details>
<summary>🇫🇷 Version française</summary>

Dans le bilan monétaire de l'opération, le prix d'un lot Combustion est soustrait (traité comme un coût d'élimination) alors que les autres orientations sont ajoutées. Documenter la signification métier exacte (coût vs valeur).

</details>

## Why this is open
**Classification:** Product-intent ambiguity — with an associated suspected sign / double-negation correctness risk.

The behaviour the spec describes is real and is implemented identically in two places. In `renderEvalOp()` (on-screen synthesis) and in `getPdfOperationSummary()` (PDF export), every lot's allotment price `prixLot` is added to the running balance **except** Combustion, which is subtracted: `bilanMonetaireGlobal -= p` for `orientationLabel === "Combustion"`, and `bilanMonetaireGlobal += p` for every other orientation. So as written, the code unconditionally flips the sign of a Combustion lot's `prixLot` before accumulating it. That part is confirmed and consistent across both functions (no cross-file logic divergence).

What is genuinely unresolved is the **sign convention of `prixLot` itself**, which determines whether that subtraction is correct. `prixLot` is computed as `pricingBase × prixMarche` (`js/app/valobois-app.js:18545`, and the direct-price branch `:18714`). `prixMarche` is populated from the selected price preset (`entity.prixMarche = this.normalizeAllotissementNumericInput(preset.value)` at `:6572`), and the built-in Combustion presets carry **negative** default values: `-30`, `-60`, `-90`, `-400 €/t` (`:342`–`:345`). The normalization helper preserves the leading minus sign (`js/lib/valobois-formatters.js:82`–`:98`), so a Combustion lot priced from a preset ends up with a **negative `prixLot`**.

This creates a likely double-negation. With `prixLot ≈ -400` (a gate fee, already encoded as negative because the holder pays to dispose), the balance line `bilanMonetaireGlobal -= p` evaluates to `-= (-400)`, i.e. it **adds +400** to the balance — making the most penalising orientation *improve* the economic result, the opposite of the spec's stated intent (FR-010 "soustraire les prix des lots Combustion"; Edge Case "Combustion = orientation pénalisante"; SC-003). Note the negative-preset convention is not unique to Combustion: Recyclage and even one Réutilisation preset are also negative (`-15` to `-150`, `:335`–`:341`), and those flow through the `+= p` branch — there a negative `prixLot` correctly lowers the balance. The Combustion branch is the only one that re-inverts the sign.

The acceptance scenario in the spec ("un lot Combustion de prix P … le prix P est soustrait", US3 / FR-010) implicitly assumes `P` is a **positive magnitude** (a cost entered as a positive number). The code only behaves that way if the user types a positive price for the Combustion lot rather than selecting a negative Combustion preset. Which of these the product owner intends — store the disposal fee as a positive number and subtract it, or store it negative (consistent with the presets) and add it like every other orientation — is a decision that cannot be read off the code. Both the intended convention and the correctness of the current `-= p` on a preset-priced Combustion lot remain open.

What is CONFIRMED: the subtraction is real, deliberate (only Combustion), and duplicated in both the screen and PDF paths; `prixLot` is `pricingBase × prixMarche` with the sign preserved end-to-end; the seeded Combustion presets are negative. What is UNCERTAIN: the intended sign convention for a Combustion lot's stored price, and therefore whether a preset-priced Combustion lot currently produces a correctly-penalising balance — this needs runtime confirmation with a real Combustion preset selected.

## Evidence in the code
- `js/app/valobois-app.js:39936`–`39941` — `renderEvalOp()`: `if (lot.orientationLabel === "Combustion") bilanMonetaireGlobal -= p;` else `+= p` (on-screen synthesis).
- `js/app/valobois-app.js:44118`–`44124` — `getPdfOperationSummary()`: identical logic (`orientation === 'Combustion'` → `bilanMonetaireGlobal -= price;` else `+= price`), feeding the PDF "Bilan monétaire" at `:45652`.
- `js/app/valobois-app.js:18545` — `prixLot = Number.isFinite(lotPremiumPrice) ? lotPremiumPrice : (pricingBase * pm)`, where `pm = parseFloat(lot.allotissement.prixMarche)` (`:18501`); direct-price branch at `:18714` (`directPricingBase * pm`).
- `js/app/valobois-app.js:342`–`345` — seeded Combustion presets are negative: `-30`, `-60`, `-90`, `-400 €/t`. Recyclage/Réutilisation presets are also negative (`:335`–`341`) but go through the `+= p` branch.
- `js/app/valobois-app.js:6572` — selecting a preset sets `entity.prixMarche = this.normalizeAllotissementNumericInput(preset.value)`, propagating the negative value into `prixMarche`.
- `js/lib/valobois-formatters.js:82`–`98` — `valoboisNormalizeAllotissementNumericInput` keeps the leading `-` (regex `cleaned.replace(/(?!^)-/g, '')` strips only non-leading minuses), so the negative preset value survives.
- `specs/010-editor-synthesis-orientation/spec.md:46`,`70`,`91` — FR-010 / SC-003 / US3 acceptance: Combustion price is "soustrait" and the orientation is "pénalisante", assuming a positive `P`.

## What would resolve it
- Product owner confirms the intended convention for a Combustion lot's stored `prixLot`: positive magnitude (disposal fee entered as a positive number, then subtracted) vs. negative (consistent with the seeded presets).
- Runtime check: create a Combustion lot, apply a built-in Combustion preset (e.g. `-400 €/t`), and read the displayed "Bilan monétaire" — confirm whether the lot lowers the balance (intended) or raises it (double-negation bug).
- If the negative-preset convention is intended, decide whether the Combustion branch should drop the `-= p` and use `+= p` like the other negatively-priced orientations (Recyclage, Réutilisation), and apply the same fix in both `renderEvalOp()` (`:39937`) and `getPdfOperationSummary()` (`:44119`).
