# Feature Specification: French / English bilingual interface

**Feature Branch**: `016-internationalization`
**Created**: 2026-06-01
**Status**: Draft (as-built documentation)
**Input**: As-built documentation of the VALOBOIS bilingual (French / English) interface

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch the interface language (Priority: P1)

A diagnostician (*diagnostiqueur*) opens VALOBOIS in French — the default language. A language selector in the top banner lets them switch the interface to English and back. The change happens immediately on screen, with no page reload. The next time they open the app, their chosen language is remembered.

**Why this priority**: Bilingual support is the headline cross-cutting feature; without the selector nothing else in this spec is observable.

**Independent Test**: Open the app, switch the language selector from French to English, confirm the on-screen labels, buttons and field prompts change to English in place, then close and reopen the app and confirm it starts in English.

**Acceptance Scenarios**:

1. **Given** a first-ever visit with no remembered choice, **When** the app opens, **Then** the interface is in French.
2. **Given** the app is open in French, **When** the user picks English in the selector, **Then** the interface labels, buttons and field prompts switch to English and the browser tab title changes to "VALOBOIS – Timber assessment".
3. **Given** the user has switched to English, **When** they reload the page or move to the sign-in page or the *Mes évaluations* (My assessments) page, **Then** the app reopens in English without re-selecting.
4. **Given** a remembered choice that is missing or unreadable, **When** the app starts, **Then** it falls back to French.

### User Story 2 - Numbers and dates in the chosen language (Priority: P2)

When the language is English, numeric values (scores, volumes in m³, densities, prices in €, percentages) and dates are shown in English (US) style; in French they follow French style. This keeps the assessment output readable and credible in either language.

**Why this priority**: Consistent number and date formatting matters for the credibility of the assessment output, but is secondary to having the text translated at all.

**Independent Test**: Switch to English and confirm a grouped number and a date in *Mes évaluations* appear in English (US) style (dot decimal separator, comma thousands separator); switch to French and confirm French style.

**Acceptance Scenarios**:

1. **Given** the language is English, **When** any number is shown, **Then** it uses English (US) formatting conventions.
2. **Given** the language is French, **When** any number is shown, **Then** it uses French formatting conventions.
3. **Given** the language is changed while the app is open, **Then** views already on screen (the dimensions scatter chart, the operation-summary totals, the *Mes évaluations* list) re-display their numbers and dates in the newly chosen language.

### User Story 3 - Translating on-the-fly messages (Priority: P2)

Text the app produces while the user works — pop-up titles, alert messages, scoring-criterion labels, chart axis names, threshold labels — also follows the chosen language wherever it has been translated.

**Why this priority**: Much of the assessment screen is built on the fly; this is the mechanism that keeps that content bilingual.

**Independent Test**: In English, open a scoring pop-up whose label has an English translation and confirm the English wording; for a label that has no English translation, confirm the French wording is shown rather than a blank or a placeholder.

**Acceptance Scenarios**:

1. **Given** a label that has an English translation, **When** it is shown in English, **Then** the English wording appears.
2. **Given** a label that has no English translation but exists in French, **When** the interface is in English, **Then** the French wording is shown (French fallback).
3. **Given** a label that exists in neither language, **When** it is shown, **Then** a harmless placeholder text appears rather than an error.

### Edge Cases

- **Missing translation**: if a piece of text has no English translation, the French wording is shown; if it exists in neither language, an internal placeholder may surface visibly on screen.
- **Tab title guard**: the browser tab title is only changed to the English title on screens that have a translated title; other screens (sign-in, *Mes évaluations*) keep their own title.
- **Brief flash on slow loads**: on a slow load in English mode, default French text can flash briefly before the English wording is applied.
- **Storage unavailable**: if the browser cannot remember the language choice, the app silently stays in French each time, with no error to the user.
- **Newly added on-screen content**: content the app injects after the page loads can also be translated, provided the part of the app that injects it asks for translation.
- **Partial English coverage**: large parts of the working interface use French wording that is not translated and therefore stay French even when English is selected (see Open Questions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST remember the chosen language, accept only French or English, and default to French whenever no valid remembered choice exists.
- **FR-002**: The app MUST look up each piece of translatable text in the chosen language, fall back to French when no translation exists, and otherwise show a harmless placeholder rather than failing.
- **FR-003**: The app MUST translate on-screen labels, button text, field prompts, tooltips and accessibility descriptions according to the chosen language.
- **FR-004**: The app MUST set the page's language and the browser tab title to match the chosen language (the tab title only where a translated title exists).
- **FR-005**: The app MUST provide a language selector (in the top banner of the assessment page and of the sign-in page) that, when changed, immediately switches the interface and remembers the new choice.
- **FR-006**: The app MUST tell every open view about a language change so each can re-display itself in the new language.
- **FR-007**: The app MUST format all numbers and dates — across the assessment screen, the *Mes évaluations* page, and domain calculations — in English (US) style when English is chosen and French style otherwise.
- **FR-008**: The app MUST apply the chosen language as soon as a page finishes loading.
- **FR-009**: French MUST be both the default and the fallback language; English wording is used only where a translation exists.

### Key Entities *(include if data)*

- **Language choice**: a single remembered value, either French or English.
- **Translation dictionary**: paired French and English wording for the banner, language selector, sign-in header, *Mes évaluations* page, account/sign-in page, sign-in error messages, and the assessment screen (tabs, common labels, chart axes and scales, sections, "About", matrix, lot and piece panels, each scoring family, thresholds, radar, scatter dimensions, orientation, operation summary, allocation, alerts, measurements and units). French coverage is complete; English coverage is partial.
- **Reusable message wording**: some messages contain a slot for a name or number (for example a lot number or a criterion name) that is filled in when the message is shown.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Selecting English then reloading any of the three pages (assessment, sign-in, *Mes évaluations*) shows the interface in English without re-selecting.
- **SC-002**: Every translatable on-screen label, button, field prompt, tooltip and accessibility description updates on a language change without a full page reload. (On the assessment page roughly 674 labels, 23 field prompts, 5 accessibility descriptions and 4 rich-text labels are translatable; the sign-in page has about 28 such items and the *Mes évaluations* page about 11.)
- **SC-003**: With English chosen, numbers and dates appear in English (US) style; with French chosen, in French style.
- **SC-004**: A label with no English translation but with French wording shows the French wording (never a blank or an error); a label with neither shows a harmless placeholder.

## Assumptions

- Only two languages are supported: French and English.
- French is both the default and the fallback; all domain/reference content (species names, normative labels) is authored in French regardless of interface language (see spec 017).
- Reusable message wording with name/number slots is filled in by the part of the app that shows the message.

## Source Files

- `js/i18n/valobois-i18n.js`
- `js/i18n/valobois-locales.js`
- `js/i18n/valobois-locales-editor.js`
- `index.html`, `auth.html`, `mes-evaluations.html`
- `js/app/valobois-app.js`
- `js/app/auth-header.js`, `js/app/auth-page.js`, `js/app/mes-evaluations-page.js`
- `js/lib/valobois-formatters.js`
- `js/app/valobois-domain-helpers.js`

## Open Questions

- **English translation is incomplete (primary gap)**: switching to English changes the page title to "VALOBOIS – Timber assessment" and translates the tabs (General, Lots, Scoring, Analysis, Summary, Matrix) and the top-level field labels, but roughly 270 on-screen texts stay in French. Confirmed French-only areas include the entire geographic-context block (département, canton, climate, termite and *mérule*/dry-rot context) and the lot detail panel — for example "Pièce dans cette combinaison" and "Type de pièce" — as well as several pop-up messages (such as the "Open the Tropix datasheet" confirmation) and all reference data (species/*essence* names, normative labels). One English export label is itself still French and contains an apparent typo ("Rhinon" for Rhino). Whether full-UI English is intended needs confirmation.
- The *Mes évaluations* page has no language selector of its own; it follows the language chosen elsewhere. Whether it should carry its own selector is unconfirmed.
- All reference datasets (species names, normative labels, field suggestions — see spec 017) are French-only, with no English equivalents. Whether the product intends to translate this content is open.
- On a slow load in English mode, a brief flash of default French text is possible but has not been measured.
