# Inherited custom alert can look active while having no backing blocking rule

> **Open question** · priority #8 · Tier 1 – Decision engine · Source spec: `specs/007-editor-notation-scoring/spec.md`

## Question
A custom alert can visually inherit a parent criterion's badge even when no matching blocking rule is configured, so it may look active yet have no effect. Confirm whether this is intended.

<details>
<summary>🇫🇷 Version française</summary>

Une alerte personnalisée peut hériter visuellement du badge d'un critère parent sans qu'aucune règle de blocage correspondante soit configurée ; elle paraît active mais sans effet. Confirmer si c'est voulu.

</details>

## Why this is open
**Classification:** Cross-file inconsistency (with a derived correctness / UX risk)

The behaviour is real and reproducible by static reading. A custom criterion in **inherited** alert mode (`alertConfig.mode === 'inherited'`) borrows its alert from the built-in criterion it was duplicated from, identified by `sourceRank`. There are two independent pieces of logic that decide what the inherited badge *looks like* and what it *means*, and they draw on two different, largely **disjoint** rank tables.

1. **Visual inheritance** (Notation tab). When the row renders an inherited alert button, it unconditionally calls `applyInheritedAlertVisualState(alertBtn, crit.sourceRank)` (`editor-tab-notation.js:292-293`). That helper finds the *parent* criterion's live alert button via `inheritedAlertSelectorByRank` (`editor-tab-notation.js:27-57`) and copies its computed `color`, `opacity` and forces `pointerEvents = 'auto'` (`editor-tab-notation.js:71-80`). The selector table covers ~21 scoring ranks plus 8 confidence ranks (1,2,3,4,5,6,8,10,12,13,14,19,24,25,29,30,31,32,33,40,42 and 43–50). So the borrowed badge can pick up the parent's strong/orange/red colour and look fully lit.

2. **State / blocking resolution** (`resolveValoboisCustomFreeAlertState`, `valobois-app.js:33943-33975`). For inherited mode it does **not** consult the visual selector table; instead it looks the `inheritedRank` up in `getValoboisDefaultGateDefinitions()`, which recognises only **six** ranks: contamination (1), expansion (2), biological integrity (3), mechanical integrity (4), alteration (5), and dismountability (16) (`valobois-app.js:33534-33543`). If the inherited rank is not one of those gates it returns `{ state: 'missing-config', reason: 'inherited-not-supported', triggered: false }` (`valobois-app.js:33949-33958`).

The two tables overlap only on ranks 1–5. Rank 16 (dismountability) is a gate but is absent from the visual selector table; and the many ranks present in the visual table (6, 8, 10, 12, 13, 14, 19, 24, 25, 29, 30, 31, 32, 33, 40, 42) are **not** gates. The practical consequence: a custom criterion inheriting from, say, amortissement (rank 13) or humidity (rank 10) gets a coloured, clickable badge copied from its lit parent (step 1), but its resolved state is `missing-config` → the Notation tab labels it "A configurer" (`editor-tab-notation.js:273-275`) and, crucially, `triggered` stays `false`, so it is excluded from the blocking aggregation in `customTriggered` (`valobois-app.js:36048-36050`). It therefore looks active/coloured but contributes nothing to the lot's blocking gates — exactly the divergence the question describes. This matches spec edge case "Inherited alert pointing at an unsupported criterion" (spec.md:73) and FR-023 (spec.md:147), which say such a case "shows as 'À configurer'" — confirming the *label* is intended, but the spec is silent on whether the *coloured visual* should also be inherited in that state.

A second, reinforcing inconsistency: the **Matrice** tab renders the same inherited alert as a flat label "Héritée" for any criterion with a valid `sourceRank ≥ 1` (`valobois-app.js:36672-36686`), without ever applying the gate-support check that the Notation tab's resolver applies. So the same criterion can read "Héritée" on the Matrice tab and "A configurer" (with a borrowed colour) on the Notation tab.

What I **confirmed**: the visual colour copy is unconditional, the gate table is the only thing that makes an inherited alert "active"/blocking, the two tables are disjoint except ranks 1–5, and an unsupported inherited alert never blocks. What remains a **product decision**: whether a badge that resolves to "A configurer" should be allowed to display its parent's lit colour at all, or whether unsupported inherited alerts should be greyed out / disabled to avoid implying effect.

## Evidence in the code
- `js/app/editor-tab-notation.js:27-57` — `inheritedAlertSelectorByRank`: ~29 ranks whose parent alert button can be visually copied.
- `js/app/editor-tab-notation.js:71-80` — `applyInheritedAlertVisualState` copies parent button `color`/`opacity` and sets `pointerEvents='auto'`, with no gate-support guard.
- `js/app/editor-tab-notation.js:292-293` — visual state applied unconditionally for any inherited row (regardless of `isAlertMissingConfig`).
- `js/app/editor-tab-notation.js:272-275` — unsupported inherited alert is labelled "A configurer" (state `missing-config`).
- `js/app/valobois-app.js:33534-33543` — `getValoboisDefaultGateDefinitions`: only ranks 1,2,3,4,5,16 have a blocking rule.
- `js/app/valobois-app.js:33948-33958` — inherited rank not in the gate list → `state: 'missing-config'`, `reason: 'inherited-not-supported'`, `triggered: false`.
- `js/app/valobois-app.js:33963-33975` — only supported ranks compute a real threshold/`triggered` and can resolve to `state: 'active'`.
- `js/app/valobois-app.js:36048-36050` — blocking aggregation skips any custom alert with `triggered === false`, so a `missing-config` inherited alert never contributes (FR-031, spec.md:155).
- `js/app/valobois-app.js:36672-36686` — Matrice tab labels any valid-sourceRank inherited alert "Héritée", bypassing the gate-support check used by the Notation resolver (cross-tab inconsistency).
- `specs/007-editor-notation-scoring/spec.md:73, 147` — edge case + FR-023 state the "À configurer" outcome but do not address the inherited colour.

## What would resolve it
- Product owner decides the intended UX for an inherited alert whose parent rank is **not** a recognised gate (1,2,3,4,5,16): should the badge be greyed/disabled, or is borrowing the parent's lit colour acceptable as a "visual mirror" even though it never blocks?
- If "do not imply effect": guard `applyInheritedAlertVisualState` (or the call at `editor-tab-notation.js:292-293`) on `!isAlertMissingConfig`, so an unsupported inherited badge renders in the neutral/"A configurer" style instead of copying the parent colour.
- Reconcile the two tables: either extend `getValoboisDefaultGateDefinitions` to cover the inheritable ranks the visual selector exposes, or restrict `inheritedAlertSelectorByRank` (and the Matrice "Héritée" label at `valobois-app.js:36680-36681`) to the six gate ranks, so visual inheritance and effective behaviour agree.
- Confirm the Matrice vs Notation label divergence ("Héritée" vs "A configurer" for the same criterion) is acceptable, or align both tabs on the gate-support check.
