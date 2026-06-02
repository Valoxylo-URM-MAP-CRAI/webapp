# Orientation (computed end-of-life route) versus destination (buyer company)

> **Open question** · priority #10 · Tier 2 – Quantitative outputs · Source spec: `specs/008-editor-lots-allotissement/spec.md`

## Question
The lot orientation (réemploi/réutilisation/recyclage/combustion) is computed from scoring — there is no "incinération"/"démolition" route — while the lot "destination" is the buyer company. Confirm which concept the requirement refers to.

<details>
<summary>🇫🇷 Version française</summary>

L'orientation du lot (réemploi/réutilisation/recyclage/combustion) est calculée à partir de la notation — il n'y a pas de route « incinération »/« démolition » — tandis que la « destination » est l'entreprise acheteuse. Confirmer la notion visée par le besoin.

</details>

## Why this is open
**Classification:** Product-intent ambiguity — with a confirmed cross-file inconsistency in the IFC/GLB exporter.

The code unambiguously implements **two distinct concepts** under names that the original brief seems to have conflated:

1. **Orientation** = the computed end-of-life route. It is derived from the lot's scoring matrix by `computeOrientation` / `computeOrientationFromMatrix` (`js/app/valobois-app.js:39844`), which writes `lot.orientationCode`, `lot.orientation` and `lot.orientationLabel`. It is never typed by the diagnostician on the Lots tab; the only manual override is the alteration lock (`lot.locked.alterationForcedOrientation`, line 39849). The closed value set is exactly four codes — `reemploi` / `reutilisation` / `recyclage` / `combustion` — fixed in `VALOBOIS_ORIENTATION_LABELS` (`js/app/valobois-constants.js:349`). There is **no "incinération" and no "démolition" route**: "incinération" is realised as `combustion` (spec `010-editor-synthesis-orientation/spec.md:99` states explicitly "Combustion (= incinération)"), and "démolition" has no orientation code at all. The English UI label for this concept is even "Routing" (`js/i18n/valobois-locales-editor.js:726`), underscoring that it is an end-of-life route, not a recipient.

2. **Destination** = the buyer/recipient company and its contacts. This is a plain editable block on the lot card: `destination`, `destinationAdresse`, `destinationContact`, `destinationMail`, `destinationTelephone`, stored under `lot.allotissement.*` (rendered at `js/app/valobois-app.js:27226-27234`), with an "incomplete fields" alert driven by `hasIncompleteDestinationFields` (`js/app/valobois-app.js:9285`). This is unrelated to the scoring-derived route. (Note: the separately-named `lot.seuilsDestination` / `lot.seuilsDestinationOffset` are a *third*, unrelated use of the word — the dimensional conformity bounds for the lot, lines 3812-3870 — which adds to the terminological overload but is not what the question is about.)

So the ambiguity is purely about **which of these two the requirement author intended**, since the brief's described value list ("réemploi / réutilisation / recyclage / incinération / démolition", spec line 172) matches *neither* cleanly: it overlaps the orientation set (minus "démolition", with "incinération" → "combustion") but uses the *word* "destination" for the buyer block. The product owner must say whether the requirement meant the computed route, the buyer record, or a manual route picker that was never built. I confirmed by reading the code that no manual route picker exists and that "démolition" is not a code anywhere in the orientation domain.

**Confirmed cross-file inconsistency in the exporters.** Independently of the naming question, the IFC/GLB export config wires its IFC property *literally named* "Destination" to the **orientation**, not to the buyer destination: in `Pset_Valobois_Identification`, `destination.getValue = (piece, lot) => piece?.orientation || lot?.orientation || null` (`js/app/valobois-app.js:166`). The very next Pset (`Pset_Valobois_Destination`, line 212) then exposes the same `lot.orientation` again under the property name `orientation` (line 218). Meanwhile the buyer-company string `lot.allotissement.destination` is what every *other* surface uses for "Destination" — the synthesis orientation table cell (line 39808), the public/QR payload (lines 42650-42652), and PDF/CSV exports (lines 47018, 47259). The IFC "Destination" property is therefore the only place where the label "Destination" actually carries the end-of-life route value; this is very likely a mislabel/bug, and resolving the conceptual question above should settle whether line 166 needs to change.

## Evidence in the code
- `js/app/valobois-app.js:39844-39856` — `computeOrientation` derives the route from the scoring matrix and assigns `lot.orientationCode` / `lot.orientation` / `lot.orientationLabel`; not user-editable on the Lots tab (only the alteration-lock override at 39849).
- `js/app/valobois-constants.js:349-355` — `VALOBOIS_ORIENTATION_LABELS` enumerates exactly `reemploi`, `reutilisation`, `recyclage`, `combustion`, `none`; no `incineration`, no `demolition`.
- `specs/010-editor-synthesis-orientation/spec.md:99` — confirms "Combustion (= incinération)" and that the four business orientations are the only ones.
- `js/i18n/valobois-locales-editor.js:726` — orientation's English label is "Routing", distinct from a recipient.
- `js/app/valobois-app.js:27226-27234` — the buyer "Destination du lot" block: `destination`, `destinationAdresse`, `destinationContact`, `destinationMail`, `destinationTelephone` under `lot.allotissement.*`.
- `js/app/valobois-app.js:9285-9295` — `hasIncompleteDestinationFields` lists those five buyer fields and drives the "à renseigner" alert (modal in `index.html:3586-3597`).
- `js/app/valobois-app.js:166` and `:218` — IFC/GLB export: the property labelled **"Destination"** AND the property labelled "Orientation" both return `piece?.orientation || lot?.orientation` — the buyer field `lot.allotissement.destination` is not exported under "Destination" here.
- `js/app/valobois-app.js:39808`, `42650-42652`, `47018`, `47259` — synthesis table, public/QR payload, PDF and CSV exports all read `lot.allotissement.destination` (the buyer) for "Destination", confirming the IFC mapping at line 166 is the odd one out.
- `js/app/valobois-app.js:3812-3870` — `lot.seuilsDestination` / `seuilsDestinationOffset` are dimensional conformity bounds, a third unrelated meaning of "destination".

## What would resolve it
- **Product owner decision:** confirm whether the brief's "destination" requirement (with values réemploi/réutilisation/recyclage/incinération/démolition) refers to (a) the computed **orientation/routing**, (b) the **buyer-company** block, or (c) a manual route picker that should exist but does not. Also confirm whether "démolition" should be a distinct route or is intentionally absent.
- **Bug check (independent of the above):** decide whether the IFC `Pset_Valobois_Identification > Destination` property at `js/app/valobois-app.js:166` should expose `lot.allotissement.destination` (the buyer) instead of `lot.orientation`, so that "Destination" means the same thing in IFC as it does in every other export. If kept as-is, rename the IFC property to avoid the clash with `Pset_Valobois_Destination > Orientation` (line 218).
