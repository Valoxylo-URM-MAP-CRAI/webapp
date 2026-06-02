# Dead English-named meta fields duplicating the active French CERFA/PEMD fields

> **Open question** · priority #58 · Tier 7 – Wording, i18n & UX · Source spec: `specs/005-editor-general-info/spec.md`

## Question
Several inputs appear to duplicate already-active French fields under different labels (insurance, validity dates, past operations, documents, visit) and look unused. Confirm no export or translation still reads them.

<details>
<summary>🇫🇷 Version française</summary>

Plusieurs champs semblent dupliquer, sous d'autres libellés, des champs français déjà actifs (assurance, dates de validité, opérations passées, documents, visite) et paraissent inutilisés. Confirmer qu'aucun export ni traduction ne s'en sert encore.

</details>

## Why this is open
**Classification:** Legacy / dead code (with a secondary cross-file naming clash that makes it look intentional).

The behaviour is confirmed and the question resolves cleanly: there really is a block of duplicate, never-read fields, and they are safe to consider dead **data**. `getDefaultMeta()` in `js/app/valobois-app.js` seeds every evaluation's `meta` object. After the genuine, French-named CERFA/PEMD fields (`diagPEMDAssuranceCompagnie`, `historiqueRenovationImportante`, `documentDOE`, `dateVisite`, `partiesVisitees`, etc.), it appends a block explicitly commented `// Champs d'extension ou migration future` (valobois-app.js:6913) that re-declares the *same* concepts under English camelCase names: `insuranceCompany`/`insurancePolicy`/`validFrom`/`validTo`, `pastMajorRenovation`/`pastDecontamination`/`pastOtherIntervention`, `documentDoe`/`documentPlansToggle`, `lastVisitDate`/`visitedParts`/`unvisitedParts`/`unvisitedReasons`/`apparentDefects`, plus `siretSiren`, `skillsOnRequest`, `buildingPermitDate`, `diagTermites`, `precautionsLabel` (valobois-app.js:6914–6934). Each is initialised to `''` and nothing else ever touches them.

I confirmed these are write-only-to-default dead fields. The DOM binding that actually persists user input iterates `document.querySelectorAll('[data-meta-field]')` and keys off the `data-meta-field` attribute (valobois-app.js:20025–20030 and 25582–25583). Every `data-meta-field` / `data-meta-toggle-field` in `index.html` uses the French names only (e.g. `diagPEMDAssuranceCompagnie`, `documentDOE`, `dateVisite`); none of the English duplicates appears as a binding attribute. So the English fields are never written from the UI — they remain `''` for the life of the evaluation, get carried through `getDefaultMeta()` into every save/export (valobois-app.js:4089, 4111, 6980), and are read by nothing.

I also confirmed no exporter consumes them. A grep across all of `js/lib/` (the CERFA/PDF tabular export at valobois-app.js:47072–47107, the human-readable list at 47212–47249, the standalone-HTML / IFC / DAE / GLB builders) returns the **French** field names exclusively; the English duplicates produce zero hits in `js/lib/` and zero non-definition hits anywhere in `js/` or `index.html`.

The one subtlety — and the reason this looked ambiguous rather than obviously dead — is a name clash with i18n. The identical English identifiers (`insuranceCompany`, `documentDoe`, `lastVisitDate`, `apparentDefects`, …) *are* live, but as **translation keys** under `editor.meta` in `js/i18n/valobois-locales-editor.js` (fr at lines 53–110, en at 512–569), referenced from `index.html` via `data-i18n="editor.meta.insuranceCompany"` etc. (index.html:677, 682, 687, 692). So the strings are not dead — only the same-named *data* properties on the `meta` object are. The likely history: someone scaffolded a future English/migration field set by copying the i18n key list into `getDefaultMeta`, but the actual wiring was done against the pre-existing French field names, leaving the English copies orphaned. Hence "duplicate fields under different labels": same concept, French name = real data, English name = dead default. What remains a *product/owner* decision (not a code fact) is whether to delete the orphaned defaults now or keep them as a deliberate placeholder for a future English data migration, as the comment suggests.

## Evidence in the code
- `js/app/valobois-app.js:6913` — comment `// Champs d'extension ou migration future` marking the start of the duplicate block.
- `js/app/valobois-app.js:6914–6934` — the orphaned English defaults: `siretSiren`, `insuranceCompany`, `insurancePolicy`, `validFrom`, `validTo`, `skillsOnRequest`, `buildingPermitDate`, `pastMajorRenovation`, `pastDecontamination`, `pastOtherIntervention`, `diagTermites`, `documentDoe`, `documentPlansToggle`, `lastVisitDate`, `visitedParts`, `unvisitedParts`, `unvisitedReasons`, `apparentDefects`, `precautionsLabel`, all `: ''`.
- `js/app/valobois-app.js:6899–6910` and `6881–6891` — the active French equivalents these duplicate: `diagPEMDAssuranceCompagnie/Police/Debut/Fin`, `historiqueRenovationImportante/Decontamination/AutreIntervention`, `documentDOE/documentPlans`, `dateVisite/partiesVisitees/partiesNonVisitees/raisonsNonVisite/vicesApparents/precautionsDemolition`.
- `js/app/valobois-app.js:20025–20030`, `25582–25583` — UI persistence loops only over `[data-meta-field]`; the English names have no such attribute, so they are never written.
- `index.html:677,682,687,692` (and the `documentDOE`, `dateVisite`, `partiesVisitees` blocks) — every `data-meta-field` uses the French names; English names appear only as `data-i18n` label keys.
- `js/app/valobois-app.js:47097–47107` and `47239–47249` — the CERFA/PDF exporters read `meta.diagPEMDAssurance*`, `meta.dateVisite`, `meta.partiesVisitees`, etc. (French names); none reads the English duplicates.
- `js/i18n/valobois-locales-editor.js:53–110` (fr) and `512–569` (en) — the English identifiers are legitimately defined here as `editor.meta.*` translation keys, which is why the names are not dead while the same-named data fields are.
- grep of `js/lib/` for any of the 19 English field names — zero matches (confirmed no IFC/DAE/GLB/standalone/PDF exporter consumes them).
- `js/app/valobois-constants.js:30–86` — the canonical per-section field lists (`diagnostiqueurPemd`, `diagnosticPemdVisite`, `contexteTechnique`) enumerate only the French names, confirming the English set was never adopted as the schema.

## What would resolve it
- Product/owner decision: delete the `// Champs d'extension ou migration future` block (valobois-app.js:6914–6934), or keep it as a deliberate placeholder for a planned English-name data migration. The grep evidence above is sufficient to delete safely — no read path depends on them.
- If keeping them: add a short comment distinguishing them from the live i18n keys of the same name to prevent future confusion, since the shared identifiers are what made this look ambiguous.
- Regression check after removal: load an existing saved evaluation, re-save, and re-run a CERFA/PDF export to confirm output is unchanged (it should be, since exporters read only the French fields).
