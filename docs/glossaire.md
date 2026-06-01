# VALOBOIS — Glossary (glossaire)

Plain-language definitions of the domain terms used in VALOBOIS, for diagnosticians and anyone reading
the documentation. French term, English gloss, and a one-line meaning. See the
[methodology guide](methodologie-evaluation.md) for how these fit together.

## Orientations & the decision

| French | English | Meaning |
|---|---|---|
| Orientation | Routing / end-of-life destination | The recommended fate of a lot, chosen among the four below. |
| Réemploi | Reuse (as-is) | Wood reused for the **same** function — the highest-value orientation. |
| Réutilisation | Repurposing | Wood reused for a **new/different** function. |
| Recyclage | Recycling | Material recovery (e.g. panels, fibre); the wood is broken down, not kept whole. |
| Combustion | Energy recovery (burning) | Lowest orientation: burned for energy. "Combustion à confirmer" = reached by elimination, not positively confirmed. |
| Vecteur (d'orientation) | Orientation driver | A rating that **pushes a lot toward** an orientation. |
| Rejet / Facteur de rejet | Disqualifier | A rating that **rules an orientation out**. |
| Verrou | Gate / lock | A critical criterion that can force a downgrade on its own; some also lock the whole lot. |
| Criticité | Criticality | Flag marking a criterion as eligible to act as a gate. |
| Circularité | Circularity | Share of volume kept in use = Réemploi + Réutilisation (as % of total). |
| Bilan | Monetary balance | Recoverable value (réemploi + réutilisation + recyclage) minus the cost of combustion. |

## Scoring

| French | English | Meaning |
|---|---|---|
| Notation / Note | Scoring / Score | Rating a criterion and the resulting grade. |
| Critère | Criterion | One scored item (~50 standard ones, plus any you add). |
| Famille de critères | Criterion family | A group of related criteria (e.g. Dégradation biologique, Essence). |
| Rang / Classement | Rank | A criterion's impact order (1 = most decisive). |
| Fort / Moyen / Faible | Strong / Medium / Weak | The three slider positions for every criterion. |
| Échelle lettrée (A–E) | Letter scale | A = best … E = disqualifying. The grade behind each slider position. |
| Seuil | Threshold | A reference level on a gauge (and the editable orientation reference values). |
| Confiance | Confidence | How sure you are of a family's assessment; the overall meter runs to 24. |
| Alerte | Alert | An advisory message/suggestion triggered by certain ratings. |
| Verrou global | Global lock | Triggered by *Expansion* or *Contamination* at *Forte*; greys out most other ratings. |

## Value axes

| French | English | Meaning |
|---|---|---|
| Économique | Economic | Value axis: economic worth. |
| Écologique | Ecological | Value axis: environmental contribution. |
| Mécanique | Mechanical | Value axis: structural/mechanical quality. |
| Historique | Historical | Value axis: heritage/age value. |
| Esthétique | Aesthetic | Value axis: appearance/character. |

## Lots, pieces & inventory

| French | English | Meaning |
|---|---|---|
| Évaluation | Evaluation / assessment | A complete study of reclaimed wood, saved as one document. |
| Lot | Lot | A batch of wood pieces assessed together. |
| Pièce | Piece | One individual element of wood in a lot. |
| Allotissement | Batching / lotting | Organising pieces into coherent lots; also the lot's buyer/destination summary. |
| Médoïde | Medoid | The most representative "type piece" of a lot (needs at least two pieces). |
| Mesures multiples | Variable cross-sections | A piece whose cross-section changes along its length. |
| Masse volumique | Density | Mass per unit volume. |
| Conditionnement | Packaging | How the wood is bundled (loose/vrac, pallet, big bag, skip, racks…). |
| Protection | Protection | Protective measures for storage/transport. |
| Débit | Sawing / conversion | How the wood is cut and dimensioned. |
| Statut de l'étude | Study status | Pré-diagnostic → En cours → Finalisé → Révision → Clôturé. |

## Wood quality grades

| French | English | Meaning |
|---|---|---|
| Bois A | Class A wood | Untreated/clean reclaimed wood — highest recovery grade. |
| Bois BR1 | BR1 wood | Lightly treated/coated reclaimed wood. |
| Bois BR2 | BR2 wood | More heavily treated reclaimed wood. |
| Bois C | Class C wood | Hazardous/heavily treated wood — lowest grade, combustion only. |

*(The A / BR1 / BR2 / C labels follow common French reclaimed-wood conventions; the tool uses them in
its price presets.)*

## Species, durability & risks

| French | English | Meaning |
|---|---|---|
| Essence | Species | The botanical kind of wood. |
| Durabilité naturelle | Natural durability | Innate resistance of the species to decay and insects. |
| Durabilité conférée | Conferred durability | Durability added by treatment (e.g. creosote, CCA) — affects recycling acceptance. |
| Classe de durabilité (1–5) | Durability class | 1 = very durable … 5 = not durable. |
| Aubier / Duramen | Sapwood / Heartwood | Outer (less durable) vs inner (durable) wood. |
| Imprégnabilité | Treatability | How readily the wood absorbs preservative. |
| Rareté écologique / historique | Ecological / commercial rarity | How scarce the species is — environmentally vs on the market. Values: Commune, Peu commune, Rare. |
| Provenance | Provenance | Geographic/source origin of the wood. |
| Termite | Termite | Wood-eating insect; the tool flags departments under a termite decree. |
| Mérule | Dry rot (*Serpula lacrymans*) | Aggressive decay fungus; the tool flags departments with a mérule decree. |
| Amortissement | Amortisation | Ecological "payback" of the wood's embodied value over its age/service life. |
| Vieillissement | Ageing / patina | Condition changes due to age. |
| Démontabilité | Demountability | How easily a piece can be dismantled for reuse. |
| Zone climatique / humidification | Climate / humidity-exposure zone | The building's exposure class, used in durability reasoning. |

## Reference standards

| Term | Meaning |
|---|---|
| EN 350 | European standard for the natural durability of wood. |
| EN 13556 | European standard giving each species a 4-letter code. |
| FD P 20-651 | French guidance on durability and use classes (longevity/climate classes used in the data). |
| Cerema (termite / mérule maps) | French public body whose hazard maps flag termite and dry-rot zones by department. |
| CIRAD Tropix | Tropical-species database behind the tool's tropical-wood reference data. |

---

*See also: the [methodology guide](methodologie-evaluation.md) and the per-feature specs in
[`../specs/`](../specs/README.md).*
