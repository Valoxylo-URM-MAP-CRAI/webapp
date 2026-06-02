# Moisture and density exported as raw, unit-less numbers in IFC

> **Open question** · priority #28 · Tier 4 – Exports · Source spec: `specs/012-export-ifc-bim/spec.md`

## Question
Moisture and density are exported as raw numbers without unit conversion; confirm the units match what BIM tools expect.

<details>
<summary>🇫🇷 Version française</summary>

L'humidité et la masse volumique sont exportées en nombres bruts sans conversion d'unité ; confirmer que les unités correspondent aux attentes des outils BIM.

</details>

## Why this is open
**Classification:** Suspected bug / correctness risk (with a layer of product-intent ambiguity about how strict to be against the IFC schema).

The export writes moisture and density into two **standard** IFC property sets — `Pset_MaterialWood` (`MoistureContent`) and `Pset_MaterialCommon` (`MassDensity`). Because these are standard psets, BIM tools interpret their properties against the IFC schema's expected measure types and units, not against whatever VALOBOIS happens to put there. This is where the mismatch arises, and it is confirmed by reading the code on both sides.

**What the source value is.** `MoistureContent` is fed from `piece.humidite ?? lot.allotissement.humidite` and `MassDensity` from `piece.masseVolumique ?? lot.allotissement.masseVolumique` (`js/app/valobois-app.js:137-140`, `:150-153`). Both go through a bare `parseFloat`; no scaling, no unit tag. The app treats `humidite` as a **percentage** (the usage-humidity alert in `js/app/valobois-domain-helpers.js:333-337` flags `>= 22` as "strong" and `<= 8` as "low" — i.e. 8–22 is normal *percent*) and `masseVolumique` as **kg/m³** (the density alert at `:340-343` uses 450 / 750 thresholds, and the parallel carbon-group property is explicitly labelled "Masse volumique (kg/m³)" at `js/app/valobois-app.js:263`). So VALOBOIS emits e.g. `MoistureContent = 12` (meaning 12 %) and `MassDensity = 600` (meaning 600 kg/m³).

**What the IFC consumer expects.** In the IFC4 schema, `Pset_MaterialWood.MoistureContent` is defined as an `IfcPositiveRatioMeasure` — a dimensionless *fraction*, where 12 % is normally `0.12`, not `12`. `Pset_MaterialCommon.MassDensity` is an `IfcMassDensityMeasure`, which carries the project's mass-density unit; the value 600 is only correct if a kg/m³ density unit is declared. Neither of those expectations is met:

- **No measure typing.** `buildPsetLines` (`js/lib/build-ifc.js:117-143`) serialises every numeric property generically: integers become `IFCINTEGER(...)`, all other numbers become `IFCREAL(...)` (`:128-133`). It never emits `IFCRATIOMEASURE`, `IFCPOSITIVERATIOMEASURE`, or `IFCMASSDENSITYMEASURE`. So a value-importer keying off the declared measure type sees a plain real.
- **No matching units declared.** The `IfcUnitAssignment` in both modes declares **only** length, area, and volume units (`js/lib/build-ifc.js:419-427` for library mode, `:539-547` for project mode). There is no `MASSUNIT`, no derived mass-density unit, and no ratio/percent unit. A viewer that resolves `IfcMassDensityMeasure` against the project units therefore has nothing to anchor 600 to, and `MoistureContent` is delivered as the literal 12 rather than a 0–1 ratio.

**Confirmed vs uncertain.** Confirmed by static reading: (a) the values are emitted with no conversion and no scaling; (b) they land in standard psets whose schema definitions imply a ratio/fraction and a unit-bearing density; (c) the unit assignment omits mass/density/ratio entirely. What remains uncertain is the *real-world impact* — whether a given target viewer (Revit, ArchiCAD, BIMcollab Zoom, usBIM) reads these standard-pset properties strictly (and so mis-renders or rejects them) or simply shows the raw number as text in a property panel. That can only be settled by opening a real export in the intended viewer(s). There is also a genuine product call here: if the consumer only ever eyeballs the number, "12 %" as `12` may be exactly what's wanted, and switching to a 0–1 ratio would be *more* surprising to a human reader.

## Evidence in the code
- `js/app/valobois-app.js:137-140` — `MoistureContent` getValue: `parseFloat(piece?.humidite ?? lot?.allotissement?.humidite)`, no scaling/conversion.
- `js/app/valobois-app.js:150-153` — `MassDensity` getValue: `parseFloat(piece?.masseVolumique ?? lot?.allotissement?.masseVolumique)`, no scaling/conversion.
- `js/app/valobois-app.js:132-133` — `psetName: 'Pset_MaterialWood'`; `js/app/valobois-app.js:146-147` — `psetName: 'Pset_MaterialCommon'` (both are *standard* IFC psets, so consumers apply schema unit expectations).
- `js/app/valobois-app.js:263` — sibling property explicitly labelled `'Masse volumique (kg/m³)'`, confirming the app's density unit is kg/m³.
- `js/app/valobois-domain-helpers.js:333-337` — humidity treated as a percentage (8–22 "normal", `>=22` strong).
- `js/app/valobois-domain-helpers.js:340-343` — density treated as kg/m³ (450 / 750 thresholds).
- `js/lib/build-ifc.js:128-133` — numbers serialised only as `IFCINTEGER`/`IFCREAL`; no `IFCRATIOMEASURE` / `IFCMASSDENSITYMEASURE` typing for any property.
- `js/lib/build-ifc.js:419-427` — library-mode `IfcUnitAssignment` declares LENGTHUNIT (MILLI METRE), AREAUNIT, VOLUMEUNIT only.
- `js/lib/build-ifc.js:539-547` — project-mode `IfcUnitAssignment` declares LENGTHUNIT (METRE), AREAUNIT, VOLUMEUNIT only — again no mass/density/ratio unit.

## What would resolve it
- Open a representative export (one library-mode and one project-mode `.ifc`) in each intended target viewer (e.g. BIMcollab Zoom, usBIM, Revit, ArchiCAD) and inspect the piece's `Pset_MaterialWood.MoistureContent` and `Pset_MaterialCommon.MassDensity`: does the viewer show `12` / `600` as-is, rescale them, or flag a unit error?
- Product owner decides the intended contract: either (a) "human-readable raw numbers in standard psets are acceptable", or (b) emit schema-correct measures — `MoistureContent` as a 0–1 `IfcPositiveRatioMeasure` (divide by 100) and `MassDensity` as `IfcMassDensityMeasure` with a declared kg/m³ derived unit added to the `IfcUnitAssignment`. A third option is to move these into a VALOBOIS-namespaced pset (like the carbon group at `js/app/valobois-app.js:263`) where no standard unit is implied.
- If strict schema compliance is wanted, confirm `buildPsetLines` (`js/lib/build-ifc.js:117-143`) is extended to carry per-property measure types, and add the missing mass/density (and ratio) units to both `IfcUnitAssignment` blocks.
