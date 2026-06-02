# "Démontabilité" gate is off by default and its weak level is excluded from réemploi/réutilisation

> **Open question** · priority #4 · Tier 1 – Decision engine · Source spec: `docs/methodologie-evaluation.md`

## Question
The Démontabilité (demountability) gate is disabled by default, and at its weak level it is deliberately not counted for réemploi/réutilisation, so it can appear to do nothing. Confirm the business rationale.

<details>
<summary>🇫🇷 Version française</summary>

Le verrou « Démontabilité » est désactivé par défaut, et son niveau faible n'est délibérément pas compté pour réemploi/réutilisation, si bien qu'il peut sembler ne rien faire. Confirmer la justification métier.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (the code is clear and self-consistent; only the business desirability of two deliberate suppressions is open).

The code is unambiguous on *what* it does — and importantly, the criterion is **not** inert. Démontabilité is the matrix criterion at rank 16 (`demontabiliteAncien`, scale `[3, 2, -3]`, axis Esthétique). It is treated in two distinct mechanisms that must not be conflated:

1. **The "gate" (verrou) mechanism** — the hard, score-threshold lock that fires the verrou banner. Démontabilité is the only one of the six default gate definitions that ships **disabled by default**: `getDefaultValoboisMatrixConfig()` sets `gates.disabled: ['demontabilite']` (valobois-app.js:7148-7150). Its gate definition carries `scoreThreshold: -3` (valobois-app.js:33541), unlike the other five gates which use the implicit `-10`. When disabled, `isValoboisDefaultGateEnabled('demontabilite')` returns `false`, so it is filtered out of both the verrou-trigger scan in `getValoboisGateTriggerInfo()` (valobois-app.js:36036-36037) and the radar display-bound computation `gateThresholds` (valobois-app.js:32426-32430). So the *gate/verrou* truly does nothing by default — this part of the question is confirmed.

2. **The vectors/rejets cascade** — the mechanism that *actually decides the orientation*. This is `collectValoboisMatrixActiveFlows()` → `computeOrientationFromMatrix()` (valobois-app.js:34273-34396). Crucially, this cascade iterates over `getValoboisActiveCriteriaMappings()`, which filters criteria **only** by notation-mode enablement (`isNotationModeCriterionEnabled`, valobois-app.js:33612-33614) — it does **not** consult `isValoboisDefaultGateEnabled`. Therefore rank 16 still contributes its Fort (+3, vecteur réemploi/réutilisation/recyclage/combustion) and Moyen (+2) vectors and rejets to the orientation decision even while the gate is off. What is suppressed here is narrower: the **Faible level only**, and **only** for réemploi/réutilisation, in **both** vectors and rejets. This is forced unconditionally in `getValoboisEffectiveFlowLevels()`: for `Number(rank) === 16`, `flowKind ∈ {vectors, rejects}`, `orientationKey ∈ {reemploi, reutilisation}`, the code overwrites `merged.faible = false` (valobois-app.js:33740-33748, comment "Règle métier demandée: Démontabilité faible ne doit pas être cochée pour Réemploi/Réutilisation"). The same suppression is mirrored in the default config's `flowOverrides.r16` (valobois-app.js:7154-7165).

So the genuinely open part is **the intent behind two deliberate suppressions**, not a behaviour mystery:
- Why does Démontabilité ship as a gate that is *off* by default, when the other five rank-1–5 gates ship on? (And note the inconsistency that it is the only gate with a non-`-10` threshold of `-3`, valobois-app.js:33541.)
- Why is the Faible level of Démontabilité deliberately excluded from the réemploi/réutilisation cascade in both directions (it cannot drive *toward* nor disqualify *from* those two orientations), when the underlying matrix data (rang 16, line 16 of the CSV in valobois-matrice-vecteurs-rejets.js) does mark "Faible / -3 / D" as a réemploi-and-réutilisation **rejet**? The code overrides the data here.

I **confirmed**: the gate is off by default; the verrou/radar paths skip it; the Faible→réemploi/réutilisation flow is force-cleared in both vectors and rejets; yet Fort/Moyen flows for rank 16 still feed the orientation. I did **not** find any product/spec text justifying *why* these two choices were made — the methodology guide only flags it as a point to confirm (methodologie-evaluation.md:151, 245-246). The "deliberate" framing is supported by the explicit `// Règle métier demandée` comment, but the requester and rationale are not recorded in-repo.

## Evidence in the code
- `js/app/valobois-app.js:7148-7150` — default matrix config ships `gates: { disabled: ['demontabilite'] }`, so the verrou is off out of the box.
- `js/app/valobois-app.js:33534-33543` — gate definitions; `demontabilite` is rank 16 with `scoreThreshold: -3` (the only non-`-10` gate).
- `js/app/valobois-app.js:35903-35919` — `isValoboisDefaultGateEnabled` returns false for demontabilite when present in `gates.disabled` (matched via aliases incl. `r16`).
- `js/app/valobois-app.js:36036-36045` — `getValoboisGateTriggerInfo` skips disabled gates, so demontabilite never raises the verrou banner by default.
- `js/app/valobois-app.js:32426-32430` — `gateThresholds` (radar display bounds) only includes enabled gates → demontabilite excluded by default.
- `js/app/valobois-app.js:33740-33748` — unconditional `merged.faible = false` for rank 16 in vectors **and** rejects, for réemploi **and** réutilisation; comment "Règle métier demandée".
- `js/app/valobois-app.js:7154-7165` — same Faible-suppression baked into `flowOverrides.r16` of the default config.
- `js/app/valobois-app.js:33612-33614` / `34273-34310` / `34354-34396` — the orientation cascade is built from `getValoboisActiveCriteriaMappings` (mode-only filter) and `collectValoboisMatrixActiveFlows`; it never checks gate-enabled state, so rank 16 Fort/Moyen flows still drive orientation regardless of the gate.
- `js/data/valobois-matrice-vecteurs-rejets.js:16` (rang 16 row) — the source matrix data does declare "Faible / -3 / D" as a réemploi & réutilisation **rejet**, which the code at 33740 overrides; this is the data-vs-code divergence the question implicitly references.
- `docs/methodologie-evaluation.md:151, 245-246` — the spec itself lists this exact behaviour as a "point to confirm" with the product owner.

## What would resolve it
- Product owner confirms the intended design: (a) Démontabilité should remain a *disabled-by-default* verrou that the evaluator opts into, and (b) its Faible level should be neutral for réemploi/réutilisation (neither driving nor disqualifying), overriding the matrix CSV row.
- Decide whether the `scoreThreshold: -3` for demontabilite (vs `-10` for the other five gates) is intentional, and document it next to `getValoboisDefaultGateDefinitions` (valobois-app.js:33534-33543).
- If confirmed intended, add a short rationale comment at valobois-app.js:33740 referencing the decision (who requested "Règle métier demandée" and why), so the override is not later "fixed" as a data/code inconsistency.
- Optional runtime check to demonstrate it is *not* dead: enable the gate in Personnalisation, rate Démontabilité ≤ -3, and confirm the verrou banner fires; separately, with the gate off, set Démontabilité to Moyen/Fort and confirm the orientation still shifts — proving only the Faible→réemploi/réutilisation path is suppressed.
