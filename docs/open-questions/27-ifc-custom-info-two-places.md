# Which definition of the IFC custom-info group is the source of truth?

> **Open question** · priority #27 · Tier 4 – Exports · Source spec: `specs/012-export-ifc-bim/spec.md`

## Question
The IFC custom-info group is part of both the standard configuration and an automatic add-on; confirm which is the source of truth.

<details>
<summary>🇫🇷 Version française</summary>

Le groupe « infos personnalisées » de l'IFC fait partie à la fois de la configuration standard et d'un ajout automatique ; confirmer lequel fait foi.

</details>

## Why this is open
**Classification:** Legacy / dead code (with a secondary Cross-file inconsistency: two near-identical definitions exist, but only one is wired in).

There are genuinely **two** places that define a `Pset_Valobois_CustomInfos` group for the IFC export:

1. **The standard configuration.** `DEFAULT_PSET_CONFIG.customInfos` in `js/app/valobois-app.js:287-327` declares the group inline, alongside all the other psets (Identification, Dimensions, Destination, Carbone, Evaluation…). It has `enabled: true` and two properties (`informationsPersonnalisees` and `nombreInformationsPersonnalisees`) whose `getValue` functions read `piece.customInfos`. This is the config that the export window clones into `activePsetConfig` (`js/app/valobois-app.js:21501`, via `deepCopyPsetConfig` at 21489) and passes to `exportToIFC` (`js/app/valobois-app.js:21701`). `deepCopyPsetConfig` deliberately copies the `getValue` function references (line 21496), so the group works end-to-end through `exportToIFC` → `window.buildIFC` (`js/app/valobois-app.js:47629`, `47666`).

2. **The automatic add-on.** `injectIfcCustomInfosConfig(psetConfig)` in `js/app/custom-infos-export-barcode-ifc-patch.js:127-177` builds an essentially **identical** `customInfos` block and splices it into the pset config by wrapping `app.exportToIFC` (lines 310-316). It even guards against double-insertion: lines 129-131 return the config unchanged if `psetConfig.customInfos.psetName === 'Pset_Valobois_CustomInfos'` already — which, given definition #1, is always the case.

So which one "wins"? The decisive fact is that **the patch file is never loaded**. `grep` across the whole tree finds `custom-infos-export-barcode-ifc-patch.js` referenced only inside two spec documents (`specs/012-export-ifc-bim/spec.md:119` and `specs/015-barcode-qr-labels/spec.md:103`) — never in `index.html`. `index.html` loads `js/app/valobois-app.js` (line 5674) and `js/lib/build-ifc.js` (line 5685), and the only patch script it pulls in is `barcode-composer-availability-patch.js` (line 5675), **not** the custom-infos/ifc patch. There is no dynamic `createElement('script')`, `loadScript`, or `import()` that brings it in either (confirmed by grep). The patch is a self-invoking IIFE that polls for `window.__valoboisApp` to monkey-patch it, but since the file is never included in the page, `patchApp` never runs.

Therefore, **as-built, the source of truth is unambiguous: `DEFAULT_PSET_CONFIG.customInfos` in `valobois-app.js`.** The "automatic add-on" path is dead code in the shipped app — its IFC behaviour (`injectIfcCustomInfosConfig` + the `exportToIFC` wrapper) never executes. Even if the patch *were* loaded, its self-guard (lines 129-131) would make the injection a no-op for IFC, because the standard config already supplies a `customInfos` group with the matching `psetName`. The patch's CSV and barcode-composer helpers (the rest of `patchApp`) are likewise inert while the file is unloaded.

What is CONFIRMED: only one code path reaches the IFC writer, and it is the inline `DEFAULT_PSET_CONFIG` definition. What remains UNCERTAIN / a product decision: whether the duplicated patch definition is intended to be reactivated (the spec's FR-015 says custom info "MUST be added… automatically, even if it was not already part of the chosen configuration", which reads like the patch's intent), or whether it is leftover scaffolding that should be deleted. The two definitions are also a maintenance trap: they have diverged subtly (the app version uses `String(value || '')` at line 302/319 while the patch uses `String(value == null ? '' : value)` at lines 149/166), so editing one will not update the other.

## Evidence in the code
- `js/app/valobois-app.js:287-327` — `DEFAULT_PSET_CONFIG.customInfos`: the inline "standard configuration" definition of the group, `enabled: true`, `psetName: 'Pset_Valobois_CustomInfos'`.
- `js/app/valobois-app.js:21489-21501` — `deepCopyPsetConfig` clones the whole `DEFAULT_PSET_CONFIG` (preserving `getValue` at line 21496) into `activePsetConfig`.
- `js/app/valobois-app.js:21701` — the export button calls `this.exportToIFC(selectedLotIndices, activePsetConfig, ifcMode)`.
- `js/app/valobois-app.js:47629-47666` — `exportToIFC` forwards `psetConfig` (falling back to `DEFAULT_PSET_CONFIG`, line 47646) into `window.buildIFC`.
- `js/lib/build-ifc.js:359-377` — `buildIFCMember` iterates `psetConfig` keys and emits a Pset per enabled group; this is the single consumer of the config.
- `js/app/custom-infos-export-barcode-ifc-patch.js:127-177` — `injectIfcCustomInfosConfig`: the second, near-identical definition (the "automatic add-on").
- `js/app/custom-infos-export-barcode-ifc-patch.js:129-131` — self-guard that returns the config untouched when a `Pset_Valobois_CustomInfos` group already exists (always true given the inline definition).
- `js/app/custom-infos-export-barcode-ifc-patch.js:310-316` — the `exportToIFC` monkey-patch that would inject the add-on.
- `js/app/custom-infos-export-barcode-ifc-patch.js:319-335` — the IIFE polls for `window.__valoboisApp`; it only runs if the file is loaded.
- `index.html:5674-5685` — script tags: `valobois-app.js`, `barcode-composer-availability-patch.js`, `build-ifc.js` are loaded; `custom-infos-export-barcode-ifc-patch.js` is absent.
- grep result — `custom-infos-export-barcode-ifc-patch.js` appears only in `specs/012-export-ifc-bim/spec.md:119` and `specs/015-barcode-qr-labels/spec.md:103`, never in any loaded HTML/JS, and there is no dynamic loader for it.

## What would resolve it
- Product/owner decision: is the patch file meant to be loaded? If yes, add the missing `<script>` tag to `index.html` and re-verify IFC (and CSV/barcode) custom-info behaviour; if no, delete `js/app/custom-infos-export-barcode-ifc-patch.js` and remove it from the two specs' "Source Files" lists.
- Confirm by grep (done here) that no `<script src=…custom-infos-export-barcode-ifc-patch.js>` and no dynamic loader exists — establishing that the inline `DEFAULT_PSET_CONFIG.customInfos` is the only live definition.
- If the duplicate is kept intentionally, de-duplicate: have the patch reuse the app's definition (or vice-versa) so the two `getValue` implementations cannot drift further (they already differ at `valobois-app.js:302/319` vs patch `:149/166`).
- Runtime check: export a lot with filled custom info, open the `.ifc`, and confirm exactly one `Pset_Valobois_CustomInfos` is emitted per piece (no duplicate group), validating that the single active path behaves as the spec's FR-015 / User Story 3 expects.
