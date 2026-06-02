# Conditionnement & protection — recorded once at operation level, not per lot

> **Open question** · priority #53 · Tier 7 – Wording, i18n & UX · Source spec: `specs/008-editor-lots-allotissement/spec.md`

## Question
Packaging and storage protection are recorded once at the operation level, not per lot. Confirm the intended scope.

<details>
<summary>🇫🇷 Version française</summary>

Le conditionnement et la protection de stockage sont enregistrés une fois au niveau de l'opération, pas par lot. Confirmer le périmètre voulu.

</details>

## Why this is open
**Classification:** Product-intent ambiguity

The code is unambiguous about *what* it does; the question is whether that scope matches the intended domain model — a decision only the product owner can make. As-built, `conditionnementType` and `protectionType` are two free-text fields (with datalist suggestions) that belong to the **operation meta object**, not to any lot or piece. They are initialised on the meta object at `js/app/valobois-app.js:6870-6871` (`conditionnementType: ''`, `protectionType: ''`) and are declared as members of the `contexteTechnique` field group in `js/app/valobois-constants.js:63-64`. There is exactly one input pair for each, living in the **Général** tab (not the Lots tab) inside a panel titled "Condition de stockage sur site" (`index.html:1126-1146`), bound to the meta via `data-meta-field="conditionnementType"` / `data-meta-field="protectionType"`.

I confirmed there is **no per-lot or per-piece equivalent anywhere**. A repository-wide grep for `conditionnement`/`protection` (excluding unrelated prose hits such as climate "protection architecturale" and the AGEC waste-law text) returns only: the meta init, the constants group, the two index.html inputs, the two datalist data files, the i18n strings, and the two CERFA/PEMD export columns. In particular `js/app/editor-tab-lots.js` — the tab that builds lots and pieces — contains **zero** references to either field. So the allotissement summary record and the piece records carry no packaging/protection attribute at all; the value is genuinely single-per-study.

The only consumers are operation-level exports: a CERFA/PEMD context row (`js/app/valobois-app.js:46844-46845` headers "Conditionnement"/"Protection", values at `47083-47084` read straight off `meta`) and a key/value detail list (`47225-47226`, again `meta.conditionnementType` / `meta.protectionType`). Both treat the values as describing the whole site/operation, consistent with the on-screen panel subtitle "Préciser le type de conditionnement et le type de protection observés sur place" (`js/i18n/valobois-locales-editor.js:74`, EN at `533`).

The tension is purely with the brief, not within the code. The Lots spec's vocabulary section (`specs/008-editor-lots-allotissement/spec.md:22`) flags this directly: the brief lists packaging and storage protection as *lot* properties, but as-built they are operation-level. Spec `005-editor-general-info` and `017-reference-data-catalog` both document them, consistently, as operation-context fields. So the implementation is internally coherent and matches two specs; only the lots brief expects a per-lot scope. This is a scope/intent decision (one site-wide value vs. one value per batch), not a defect — different lots stored in different conditions on the same site could plausibly need different packaging/protection values, which the current model cannot express.

## Evidence in the code
- `js/app/valobois-app.js:6870-6871` — `conditionnementType: ''` and `protectionType: ''` are initialised on the operation **meta** object (alongside `typeBatiment`, `localisation`, etc.), i.e. one per study.
- `js/app/valobois-constants.js:63-64` — both fields are listed under the `contexteTechnique` meta field group, confirming they are operation-context, not lot/piece, attributes.
- `index.html:1126-1146` — the only UI for these is a single "Condition de stockage sur site" panel in the **Général** tab, with `data-meta-field="conditionnementType"` / `data-meta-field="protectionType"` text inputs backed by datalists `liste-conditionnement` / `liste-protection`.
- `js/app/editor-tab-lots.js` — contains **no** match for `conditionnement` or `protection`; the lot/piece editor never reads or writes these fields.
- `js/app/valobois-app.js:46844-46845, 47083-47084, 47225-47226` — the CERFA/PEMD context export and the detail key/value list read the values from `meta`, treating them as operation-wide.
- `js/data/datalist-conditionnement.js:2`, `js/data/datalist-protection.js:2` — the suggestion lists (`DATALIST_CONDITIONNEMENT`, `DATALIST_PROTECTION`) populated via `js/lib/datalist-populate.js:5-6`; a single shared list, not lot-scoped.
- `specs/008-editor-lots-allotissement/spec.md:22` & `specs/005-editor-general-info/spec.md:84` — the brief expects lot-level packaging/protection, while the general-info spec documents them as operation-context; the source of the disagreement.

## What would resolve it
- Product owner decides the intended scope: **(a)** confirm operation-level is correct (current behaviour) — then update the Lots brief wording so it no longer lists packaging/protection as lot properties; or **(b)** packaging/protection should be per-lot (and possibly per-piece) — then they must be added to the allotissement/piece data model, the Lots-tab editor UI, and the exports, and the operation-level fields reconciled (kept as a default, or removed).
- If (a): no code change; the closing action is a one-line correction to `specs/008-editor-lots-allotissement/spec.md` vocabulary note.
- If (b): scope a new feature — new fields on the lot/piece records, lot-card inputs in `editor-tab-lots.js`, and per-lot columns in the CERFA/PEMD and label exports.
