# VALOBOIS — Feature Specifications (as-built documentation)

VALOBOIS is a web tool for **evaluating reclaimed / second-hand wood** ("bois d'occasion"). A
diagnostician (*diagnostiqueur*) creates an **évaluation** (evaluation), describes the wood as a set
of **lots** and **pièces** (pieces), scores each lot, and produces professional deliverables that say
what the wood is worth and how it should be reused, recycled, or burned.

These specs document **what the application does today** (not what it might do). They are written for a
domain audience — diagnosticians and product owners — in plain language; implementation detail is kept
to the "Source files" footer of each spec. The project principles are in
[`.specify/memory/constitution.md`](../.specify/memory/constitution.md).

> **The evaluation method itself** (how ratings become a value profile and an orientation
> recommendation) is described in the cross-cutting guide
> [`../docs/methodologie-evaluation.md`](../docs/methodologie-evaluation.md), with a shared
> [glossary](../docs/glossaire.md).

## How a diagnostician uses the tool

1. **Sign in** (optional) — work in the cloud account, or as a guest with everything kept in the
   browser. → [001](001-authentication/spec.md)
2. **Pick or create an evaluation** from the library. → [002](002-evaluation-library/spec.md)
3. **Fill the editor**, tab by tab: general info → lots → scoring → analysis → synthesis → matrix.
   → [005](005-editor-general-info/spec.md) … [011](011-editor-rejection-matrix/spec.md)
4. **Work is saved automatically** (cloud or this device) and can be **shared by email**.
   → [003](003-cloud-sync-persistence/spec.md), [004](004-sharing-collaboration/spec.md)
5. **Export deliverables**: BIM (IFC), 3D models (GLB/DAE), a self-contained HTML copy, and
   barcode/QR labels. → [012](012-export-ifc-bim/spec.md) … [015](015-barcode-qr-labels/spec.md)

The interface is **French by default with partial English**, and is backed by a catalogue of
**reference data** (species, durability, rarity, termite/dry-rot maps, geography).
→ [016](016-internationalization/spec.md), [017](017-reference-data-catalog/spec.md)

## The features

### Identity & data lifecycle
| # | Feature | What it covers |
|---|---------|----------------|
| 001 | [Authentication & guest mode](001-authentication/spec.md) | Sign up / in / out, password reset, working as a guest |
| 002 | [Evaluation library](002-evaluation-library/spec.md) | The "Mes évaluations" list: open, create, delete, status badges |
| 003 | [Saving & cloud sync](003-cloud-sync-persistence/spec.md) | Automatic saving to the cloud or to this device |
| 004 | [Sharing & collaboration](004-sharing-collaboration/spec.md) | Sharing an evaluation by email (view + edit, no delete) |

### The evaluation editor (one feature per tab)
| # | Feature | What it covers |
|---|---------|----------------|
| 005 | [General information](005-editor-general-info/spec.md) | Operation, stakeholders, building context, study status & version |
| 006 | [Geographic context](006-geo-france-context/spec.md) | Department/canton selection → climate, wind, termite & mérule risk |
| 007 | [Scoring (Notation)](007-editor-notation-scoring/spec.md) | The scoring criteria, confidence, and custom alerts |
| 008 | [Lots & pieces (Allotissement)](008-editor-lots-allotissement/spec.md) | Lots, pieces, dimensions, volumes, custom info |
| 009 | [Analysis charts](009-editor-analysis-charts/spec.md) | Threshold gauges, radar chart, dimension scatter |
| 010 | [Synthesis & orientation](010-editor-synthesis-orientation/spec.md) | Per-lot recommendation, operation totals, monetary balance |
| 011 | [Rejection-vector matrix](011-editor-rejection-matrix/spec.md) | The matrice that maps criteria to fit/rejection per orientation |

### Exports & deliverables
| # | Feature | What it covers |
|---|---------|----------------|
| 012 | [IFC export for BIM](012-export-ifc-bim/spec.md) | A reuse catalogue / BIM project for Revit, ArchiCAD, etc. |
| 013 | [3D models (GLB & DAE)](013-export-glb-dae-3d/spec.md) | GLB for 3D viewers, DAE for SketchUp |
| 014 | [Standalone HTML copy](014-export-standalone-html/spec.md) | A self-contained, offline/printable copy of the evaluation |
| 015 | [Barcode & QR labels](015-barcode-qr-labels/spec.md) | Scannable labels for tagging physical pieces |

### Cross-cutting
| # | Feature | What it covers |
|---|---------|----------------|
| 016 | [Bilingual (FR/EN)](016-internationalization/spec.md) | Language switch; English is incomplete |
| 017 | [Reference data catalog](017-reference-data-catalog/spec.md) | Species, durability, rarity, termite/mérule maps, geography |

## The editor at a glance (live screenshots)

Captured from the running app (the app opens with two example lots already filled in):

| Tab | Screenshot |
|-----|-----------|
| Général | [valobois-main-initial.png](_assets/valobois-main-initial.png) |
| Général (English) | [valobois-general-EN.png](_assets/valobois-general-EN.png) |
| Lots | [valobois-tab-lots.png](_assets/valobois-tab-lots.png) |
| Notation | [valobois-tab-notation.png](_assets/valobois-tab-notation.png) |
| Analyse | [valobois-tab-analyse.png](_assets/valobois-tab-analyse.png) |
| Synthèse | [valobois-tab-synthese.png](_assets/valobois-tab-synthese.png) |
| Matrice | [valobois-tab-matrice.png](_assets/valobois-tab-matrice.png) |

## Cross-cutting open questions worth triage

Each spec ends with its own "Open Questions". A few recur across the app and are worth flagging here:

- **English is incomplete.** The tabs and top-level labels translate, but the geographic-context
  section, the lot detail panel, several pop-up messages, and all reference data stay in French
  regardless of language. (See [016](016-internationalization/spec.md).)
- **No conflict handling on shared evaluations.** If the owner and a shared editor change the same
  evaluation at once, the last save wins. (See [003](003-cloud-sync-persistence/spec.md).)
- **Possible size error in one IFC mode.** In library mode the file may state the wrong unit, which
  could make pieces appear 1000× off in some BIM viewers. (See [012](012-export-ifc-bim/spec.md).)
- **Two "orientation" meanings.** A lot's orientation is computed from scoring
  (réemploi/réutilisation/recyclage/combustion), while its "destination" is the buyer company — the
  wording should be aligned. (See [008](008-editor-lots-allotissement/spec.md).)
- **Leftover/unused fields.** The general-information data carries duplicate, seemingly unused fields
  that look like migration leftovers. (See [005](005-editor-general-info/spec.md).)

---

*Documentation produced with GitHub spec-kit. Specs were written from the source code and validated by
driving the running application. They describe the app as observed on 2026-06-01.*
