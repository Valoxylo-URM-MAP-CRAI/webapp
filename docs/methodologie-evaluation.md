# VALOBOIS — How the assessment works (evaluation methodology)

*A guide for diagnosticians (diagnostiqueurs). It explains, in plain language, how VALOBOIS turns
your observations of a wood lot into a value profile and a recommended **orientation** (what to do
with the wood). It describes the tool as it behaves today.*

> New to the vocabulary? Keep the [Glossary](glossaire.md) open alongside this guide.

---

## 1. The big picture — two different results

When you score a lot, VALOBOIS produces **two things that are easy to confuse**. They use the same
ratings you enter, but they answer different questions:

| | **The value profile** | **The orientation** |
|---|---|---|
| Answers | *"How good/valuable is this wood, axis by axis?"* | *"What should be done with it?"* |
| Looks like | The radar chart and the five "seuils" gauges (A–E grades) | A single recommendation: **Réemploi → Réutilisation → Recyclage → Combustion** |
| Where you see it | **Analyse** tab | **Synthèse** tab (and the lot header) |

**The single most important thing to understand:** the orientation is **not** decided by adding up
the value score. A lot can score well on the radar and still be sent down to *Combustion* because one
critical problem (say, active contamination) **disqualifies** the better options. Conversely, the
value profile is descriptive — it paints a picture of the wood, but it does not, on its own, choose
the orientation.

Think of it as two layers:

- **A value picture** — five axes (économique, écologique, mécanique, historique, esthétique) plus a
  confidence meter. This *describes* the wood.
- **A routing decision** — a cascade of "drivers" and "disqualifiers" that *decides* the orientation.

The rest of this guide explains each layer.

---

## 2. Scoring a criterion (Notation tab)

Every criterion is rated with the same simple **three-position slider**:

- **Fort / Forte** (strong)
- **Moyen / Moyenne** (medium)
- **Faible** (weak)

Behind each position the tool records a grade on an **A–E letter scale**, where **A is best and E is
disqualifying**:

| Grade | Meaning |
|:---:|---|
| **A** | Strongly favourable |
| **B** | Favourable |
| **C** | Acceptable / neutral |
| **D** | Unfavourable |
| **E** | Disqualifying (a blocking-grade problem) |

### Watch out: "Fort" is not always good

What a slider position *means* depends on the criterion. For a **quality** (e.g. *Aspect*,
*Régularité*), **Forte = A** (good). For a **hazard or defect** (e.g. *Contamination*, *Expansion*,
*Altération*), **Forte = E** (bad) — strong contamination is the worst case, not the best. A few
criteria are even non-linear: for *Humidité* (moisture), **"Moyenne" is the best answer** — both too
dry and too wet are penalised.

So always read the criterion's question, not just the slider. The tool's per-criterion help text
("fiche") explains what each level means for that specific criterion.

### The criteria, by family

A diagnostician fills in **ten families** of criteria (plus a contextual *Inspection* card). Each
family looks at the wood from one angle:

| Family (French) | What you are assessing |
|---|---|
| **Inspection** | The quality of your inspection itself: visibility, access, instruments used, overall integrity. Sets the context; it is not one of the scored "value" criteria. |
| **Dégradation biologique** | Damage from fungi and insects — is it spreading (*Expansion*), how much sound wood remains (*Intégrité*), exposure and what must be cut away (*Purge*). |
| **Dégradation mécanique** | Physical damage — breakage, fire behaviour, remaining sound section, mechanical exposure. |
| **Usage** | Fitness for a use class — natural durability of the species, estimated structural grade, moisture, appearance. |
| **Dénaturation** | How far the wood was altered from its natural state — contamination, treatments, decontamination effort, naturalness. |
| **Débit** (sawing) | The cut itself — regularity, per-piece volume, dimensional stability, craft/rustic character. |
| **Géométrie** | Shape and form — adaptability for re-machining, massiveness, deformation, industrial character, fit with the lot's typical piece. |
| **Essence** (species) | The species — ecological rarity, density, commercial/historical rarity, singularity. |
| **Ancienneté** (age) | Age and history — patina/ageing, carbon amortisation, micro-history, demountability. |
| **Traces** | Marks and documentation — labelling, alteration of the wood's identity, available documentation, singular marks. |
| **Provenance** | Where it comes from — transport impact, reputation of the source, regional anchoring, larger history. |

### "Alerte" helper buttons

Several criteria carry an **alert/assistant button** that *suggests* a level by looking at related
data you already entered (for example, *Feu* is suggested from volume, moisture, massiveness and
density). The suggestion is advisory — **it never fills in the score for you**; you stay in control.

---

## 3. Confidence (Confiance)

Eight of the families (biologique, mécanique, usage, dénaturation, essence, ancienneté, traces,
provenance) include a dedicated **Confiance** rating where you record **how sure you are** of that
family's assessment.

- Each is rated Forte / Moyenne / Faible.
- The **Analyse** tab shows an overall confidence meter out of **24** (eight families, up to 3 points
  each). Roughly: **17+ = high confidence, 8–16 = medium, below 8 = low.**

**Confidence gets stricter as the study advances.** The colour of each confidence indicator depends on
the **study status**:

- **Pré-diagnostic / En cours** — partial confidence is tolerated (Forte is green, Moyenne is orange).
- **Finalisé / Révision / Clôturé** — only **Forte** stays green; anything less is flagged red.

In other words, a finalised study is expected to rest on fully-confident assessments.

---

## 4. How the orientation is decided

This is the routing layer. The four orientations, from highest to lowest value, are:

**Réemploi** (reuse as-is) → **Réutilisation** (reuse for a new purpose) → **Recyclage** (material
recovery) → **Combustion** (energy recovery / burning).

### Drivers and disqualifiers (vecteurs & rejets)

For each orientation, a criterion at a given level can act as:

- a **vecteur** (driver) — *this rating pushes the lot towards this orientation*, or
- a **facteur de rejet** (disqualifier) — *this rating rules this orientation out.*

These relationships are defined in the **Matrice** (see §6).

### The cascade

The tool starts at the top (**Réemploi**) and **steps down one rung each time the current rung is
disqualified**:

1. No disqualifier → **Réemploi.**
2. Réemploi disqualified → **Réutilisation.**
3. Réutilisation also disqualified → **Recyclage.**
4. Recyclage also disqualified → **Combustion.**

So the orientation is set by the **best option that nothing disqualifies**, not by a points total.

**Worked example:** a lot with weak biological integrity *and* weak mechanical integrity is
disqualified from réemploi, réutilisation **and** recyclage — so it lands on **Combustion**. The tool
states this reasoning in the lot's orientation panel.

### Critical criteria (verrous / gates)

A few criteria are powerful enough to act as **gates** that force a downgrade on their own. By default
these are: **Contamination, Expansion, Intégrité biologique, Intégrité mécanique, Altération** (and
*Démontabilité*, which ships **switched off** by default).

Two of them also **lock the whole lot**: if **Expansion** is *Forte* (the damage is still spreading)
or **Contamination** is *Forte*, the lot is locked and most other ratings are greyed out — there is no
point scoring aesthetics on wood that is actively contaminated. You can **"Ignorer"** (override) a
lock if you judge it doesn't apply, which re-enables editing.

When **Altération** is *Forte*, the lot is flagged and, once you acknowledge it, you may **manually
force** the orientation — the tool then shows "Orientation forcée".

### Provisional and unconfirmed results

- **Provisional:** while some active criteria are still unrated, the orientation is computed from what
  you've entered so far and shown as in-progress.
- **"Combustion à confirmer":** if a lot reaches Combustion purely *by elimination* (everything else
  was disqualified, but nothing positively pointed to combustion), the tool flags it as deduced and
  not yet confirmed — a prompt to double-check.
- A lot with **no ratings at all** has no orientation (shown as "…").

---

## 5. The value profile (Analyse tab)

The radar and the five gauges summarise the wood across five **value axes**:

- **Économique** (economic)
- **Écologique** (ecological)
- **Mécanique** (mechanical)
- **Historique** (historical)
- **Esthétique** (aesthetic)

Each of the ten families contributes one criterion to each axis, so every axis is a blend of
biological, mechanical, species, provenance, etc. signals. Each axis gauge shows a **distribution of
A–E grades** (green for A/B/C, orange/red for D/E) and a points level. A small "missing" marker
appears when some criteria on that axis are still unrated.

**Remember (from §1):** these gauges *describe* the wood. The orientation decision in §4 is made by the
drivers/disqualifiers, not by these gauge totals. The faint reference rings on the radar (at roughly
70% / 50% / 30%, corresponding to the réemploi / réutilisation / recyclage levels) are **visual guides
only** — they help you read the chart but do not, by themselves, set the orientation. *(See "Points to
confirm" below.)*

---

## 6. The Matrice tab — the rule book

The **Matrice** ("Matrice vecteurs / rejets") is the rule book behind the orientation decision. It
lists the ~50 criteria (ranked 1 = most decisive) and, for each, shows:

- its family and value axis,
- its A–E grades for Fort / Moyen / Faible,
- which orientations it **drives** (vecteurs) and which it **disqualifies** (rejets), and at which
  levels,
- whether it is **critical** (can act as a gate) and whether it can raise an **alerte**.

You can **filter and search** it, show/hide the drivers and disqualifiers columns, and — in
**Personnalisation** mode — adjust the rules: turn gates on/off, change a criterion's grades, edit
which levels drive or disqualify each orientation, add your own custom criteria, and **import/export**
the whole configuration as a file to reuse on other studies. Because the matrix *is* the rule book,
editing it changes how future orientations are computed.

### Custom criteria and custom alerts

Beyond the standard 50, you can add your **own criteria** (assigned to a value axis, with their own
Fort/Moyen/Faible grades, and optionally their own drivers/disqualifiers). You can also attach a
**custom alert**: define, for each level (red/orange/green with a message), a set of **conditions** on
other criteria; when all the conditions of a level are met, that alert becomes active. An alert shown
as **"À configurer"** means it is switched on but not yet usable (no conditions defined, or it inherits
from a criterion that doesn't support it).

---

## 7. From lots to the whole operation (Synthèse tab)

Once lots are oriented, the **Synthèse** tab rolls them up for the whole operation:

- **Volumes and value per orientation** — how much wood (m³) and value (€) falls into Réemploi,
  Réutilisation, Recyclage and Combustion, with each orientation's **share** of the total.
- **Circularité** — the share of volume kept in circulation, defined as **Réemploi + Réutilisation**
  (recyclage and combustion are excluded).
- **Bilan** (monetary balance) — the recoverable value of réemploi, réutilisation and recyclage
  **minus** the cost of combustion. Combustion is **subtracted** because it is a disposal cost (a gate
  fee), not a revenue — its default prices are negative.

---

## Points to confirm (for the product owner)

These are deliberate flags where the tool's behaviour is subtle or where intent should be confirmed:

1. **Value score vs. orientation are decoupled.** The orientation is decided by the
   drivers/disqualifiers cascade and the gates — **not** by the radar/seuils totals, and **not** by the
   editable 70/50/30% reference rings (those appear to be visual guides only). Please confirm this is
   intended, since users naturally expect "high score → réemploi".
2. **"Démontabilité" gate is off by default**, and at its weak level it is deliberately not counted for
   réemploi/réutilisation — so it can look like it "does nothing". Confirm this is intended.
3. **Editable orientation thresholds** (the 9/15/21-of-30 values) can be changed in the matrix
   configuration but do not appear to change the computed orientation. Confirm whether they are meant
   to be decisional.

---

*Related: the per-feature specifications in [`../specs/`](../specs/README.md) describe each tab in
detail. This methodology guide is cross-cutting and focuses on the evaluation logic itself.*
