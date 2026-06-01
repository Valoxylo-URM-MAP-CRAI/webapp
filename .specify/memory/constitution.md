<!--
Sync Impact Report
==================
Version change: (none) → 1.0.0
Bump rationale: Initial ratification of the VALOBOIS constitution. No prior version existed.
Modified principles: n/a (initial adoption)
Added sections:
  - Core Principles I–VII
  - Technology & Compliance Constraints
  - Documentation Workflow
  - Governance
Removed sections: none
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ reviewed — generic Constitution Check gate, compatible
  - .specify/templates/spec-template.md ✅ reviewed — as-built phrasing reinforced by Principle I
  - .specify/templates/tasks-template.md ✅ reviewed — documentation-task orientation compatible
Deferred TODOs: none
-->

# VALOBOIS Constitution

VALOBOIS is a French web tool for evaluating reclaimed / second-hand wood ("bois d'occasion").
This constitution governs a **reverse-engineering and documentation** effort: the codebase already
exists and was built across many undocumented AI sessions. The purpose of the specs produced under
this constitution is to faithfully describe the application **as it behaves today**, not to design
new capabilities.

## Core Principles

### I. As-Built Truth (NON-NEGOTIABLE)
Specifications MUST describe observed, current behavior of the application — never aspirational or
intended behavior. When behavior is ambiguous, partial, or appears inconsistent (e.g., a feature
half-translated, a screen that looks abandoned), the spec MUST record it as an open question rather
than smoothing it over or inventing a resolution. Traceability to the implementation is kept to a
short "Source files" footer for navigation — it MUST NOT leak into the body of the spec.
Rationale: The whole value of this effort is a trustworthy map of what exists; a spec that guesses is
worse than no spec.

### II. Domain-First, Plain Language (NON-NEGOTIABLE)
Specs are written for a domain audience — wood-reclamation diagnosticians and product owners — not for
developers. The body of every spec (user scenarios, functional requirements, success criteria) MUST
describe WHAT the tool does and WHY, in plain language and the product's own French domain vocabulary
(évaluation, lot, essence, orientation, réemploi/réutilisation/recyclage/combustion). It MUST NOT
contain implementation jargon: no function/class names, no internal variable or field names, no
library or file-format identifiers (e.g., property-set codes, axis conventions), no code symbols.
Such detail, when genuinely needed, lives only in the "Source files" footer.
Rationale: The documentation must be readable and verifiable by the people who know the domain; jargon
makes it a developer artifact instead of a functional map.

### II-bis. Feature-Aligned Decomposition
The application is documented as a set of discrete functional features, each owning one
`specs/NNN-feature/` folder. Feature boundaries follow the user-facing surface (auth, the evaluation
library, each editor tab, each export format, sharing, sync, i18n, reference data) rather than the
file layout.
Rationale: Behavior-first boundaries survive refactors better than file-first ones, and match how
users think about the tool.

### III. Source-Anchored, French-First Vocabulary
Specs MUST use the same domain vocabulary the product uses, in French where the UI is French
(évaluation, lot, allotissement, essence, notation, seuils, matrice vecteurs rejets, orientation),
with an English gloss on first use. Status values, field names, and enumerations MUST match the
strings actually present in code/i18n files (e.g., statuses pré-diagnostic → en cours → finalisé →
révision → clôturé).
Rationale: The team and the data are French; mismatched terminology breaks traceability and confuses
search.

### IV. Standards & Data Provenance Are First-Class
Where the app encodes external standards or authoritative datasets — FD P20-651 (durability /
longevity / climate humidification classes), EN 13556 (species codes), Cerema termite & merule
hazard maps, French department/canton geography — the spec MUST name the standard or source and the
data file that carries it. Reference-data behavior (lookups, aliases, fallbacks) MUST be documented
as part of the feature that consumes it.
Rationale: The professional credibility of the tool rests on these sources; a spec that omits
provenance cannot be validated by domain experts.

### V. Export Fidelity
Each export format (IFC4 BIM, GLB / glTF, DAE / Collada, standalone HTML, barcode/QR labels) MUST be
documented in terms of what data it carries, the coordinate/axis conventions it uses, and which
consuming tools it targets. Custom property sets (e.g., Pset_Valobois_*) and any normalization
(accent stripping, truncation) MUST be enumerated.
Rationale: Exports are the deliverables professionals depend on; their structure is a contract with
downstream BIM/CAD tools and must be precisely recorded.

### VI. Persistence & Trust Boundaries
Specs touching data MUST state where it lives (Firestore cloud document vs. browser localStorage
guest mode), what is and is not synced (UI-only fields stripped before upload), the autosave/debounce
behavior, and the access model (owner vs. email-shared read+edit, no-delete). Security rules and
ownership semantics MUST be documented, not assumed.
Rationale: Data loss and access leaks are the highest-severity risks; the boundaries must be explicit
so they can be audited.

### VII. No Build Step, CDN-Dependent Runtime
Documentation MUST reflect the actual runtime: a static HTML/CSS/vanilla-JS app with no bundler,
served over HTTP, depending on CDN-loaded libraries (Chart.js, jsPDF, html2canvas, fonts) plus npm
deps (bwip-js, qrcode) and an optional Node "standalone" build. Specs MUST NOT assume a framework,
transpiler, or module bundler that the project does not use.
Rationale: Misrepresenting the architecture would mislead future contributors into incompatible
changes (e.g., framework-specific patterns) and break the offline/standalone story.

## Technology & Compliance Constraints

- **Frontend**: Static `index.html`, `mes-evaluations.html`, `auth.html`; CSS in `css/`; vanilla ES
  modules under `js/` (app, lib, data, i18n, ui, config). No framework, no bundler.
- **Third-party (CDN)**: Chart.js (radar/scatter), jsPDF + html2canvas (PDF), Google Fonts. These
  require network access even for the "standalone" HTML build.
- **Third-party (npm)**: `bwip-js` (barcodes), `qrcode` (QR). Node script
  `scripts/build-standalone.mjs` inlines local CSS/JS into a single HTML file.
- **Backend / persistence**: Firebase Authentication (email/password) and Cloud Firestore
  (`users/{uid}/evaluations/{evalId}`); guest mode persists to `localStorage` only.
- **Internationalization**: French default, English secondary (may be partial), via `data-i18n*`
  attributes and `js/i18n/` locale tables; language persisted in `localStorage`.
- **Domain standards & data**: FD P20-651, EN 13556, Cerema termite/merule maps, Tropix species data,
  French departments/cantons — all carried in `js/data/`.
- Specs MUST NOT introduce dependencies, frameworks, or build tooling; they document, not redesign.

## Documentation Workflow

- Each feature follows the spec-kit flow: `/speckit.specify` → optional `/speckit.clarify` →
  (optional) `/speckit.plan` / `/speckit.tasks` only if/when remediation work is later authorized.
- Specs are written **as-built** and **domain-first**: requirements describe current behavior in plain
  language; "open questions" capture gaps, inconsistencies, and partial features for later triage,
  phrased in functional terms wherever possible.
- Every spec ends with a short "Source files" footer (file paths only) for navigation; implementation
  detail does not appear in the spec body.
- Verification of a spec is by code/UI inspection (and, where practical, running the app locally via
  `python3 -m http.server`), not by writing new automated tests — this is a documentation effort.
- Changes to a feature's behavior in code SHOULD be accompanied by an update to its spec.

## Governance

This constitution supersedes ad-hoc documentation practices for the VALOBOIS project. All specs and
plans produced under spec-kit MUST comply with the Core Principles; a spec that introduces
aspirational behavior, omits source traceability, or contradicts the documented runtime constraints
MUST be revised before it is considered complete.

Amendments are made by editing this file. Versioning follows semantic versioning:
- **MAJOR**: removal or incompatible redefinition of a principle or governance rule.
- **MINOR**: a new principle/section, or materially expanded guidance.
- **PATCH**: clarifications, wording, and non-semantic refinements.

Compliance is reviewed when each spec is authored: the author confirms the spec is source-anchored,
uses correct vocabulary, and respects the technology constraints. Open questions are tracked within
each spec until resolved.

**Version**: 1.1.0 | **Ratified**: 2026-06-01 | **Last Amended**: 2026-06-01
