# Feature Specification: Authentication (online account & guest use)

**Feature Branch**: `001-authentication`
**Created**: 2026-06-01
**Status**: Draft (as-built documentation)
**Input**: As-built documentation of the VALOBOIS account feature: creating an account, signing in, resetting a forgotten password, signing out, the sign-in status shown at the top of pages, and the "guest" way of using the tool when nobody is signed in.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create an account and sign in (Priority: P1)

A wood-reclamation diagnostician opens the VALOBOIS account page ("Compte VALOBOIS"). They see two choices: "Connexion" (Sign in) and "Créer un compte" (Create account). To create an account they enter an e-mail address and a password (at least 6 characters), confirm, and — on success — are taken straight to their library of évaluations (evaluations). On a later visit they sign in with the same e-mail and password and are taken to the same place.

**Why this priority**: Without an account, work cannot be saved to the cloud or accessed across devices, and évaluations shared by other people cannot be opened. Creating an account or signing in is the gateway to everything that requires being identified.

**Independent Test**: Open the account page, create an account with a new e-mail and a password of at least 6 characters, confirm you land on the évaluation library; sign out; sign back in with the same e-mail and password and confirm you land in the library again.

**Acceptance Scenarios**:
1. **Given** the Create-account choice is selected, **When** the diagnostician enters a valid new e-mail and a password of at least 6 characters and confirms, **Then** the account is created and the tool opens the évaluation library.
2. **Given** the Sign-in choice is selected, **When** the diagnostician enters a correct existing e-mail and password, **Then** they are signed in and taken to the library.
3. **Given** a sign-in attempt with a wrong password or an unknown e-mail, **When** the attempt fails, **Then** a clear message in French ("E-mail ou mot de passe incorrect.") is shown and the diagnostician stays on the page.
4. **Given** a new-account password shorter than 6 characters, **When** it is rejected, **Then** the message "Le mot de passe est trop faible (minimum 6 caractères)." is shown.

### User Story 2 - Reset a forgotten password (Priority: P2)

A diagnostician who has forgotten their password chooses "Mot de passe oublié" (Forgot password) on the sign-in screen. A reset e-mail is sent to the address they typed. Later they follow the link in that e-mail, which brings them back to the account page in reset mode; they enter and confirm a new password and are told they can sign in again.

**Why this priority**: Account recovery matters, but it is only needed when someone is locked out; the everyday sign-in and account-creation flow comes first.

**Independent Test**: On the sign-in screen, type an e-mail, choose "Mot de passe oublié", confirm the success message appears; then open the reset link, set two matching passwords, and confirm the success message and the "Aller à la connexion" (Go to sign in) link appear.

**Acceptance Scenarios**:
1. **Given** the sign-in screen with an e-mail typed in, **When** the diagnostician chooses "Mot de passe oublié", **Then** a reset e-mail is requested and a neutral success message is shown — the same message whether or not that e-mail has an account.
2. **Given** the e-mail field is empty, **When** the diagnostician chooses "Mot de passe oublié", **Then** "Saisissez votre adresse e-mail." is shown and no reset e-mail is sent.
3. **Given** the account page is opened in reset mode from a valid reset link, **When** the diagnostician enters two matching passwords, **Then** the new password is saved and a success message plus a "Aller à la connexion" link are shown.
4. **Given** a reset link that is incomplete or invalid, **When** the page opens, **Then** the reset form is hidden and the message "Ce lien de réinitialisation est invalide ou incomplet." is shown.
5. **Given** the reset form with two passwords that do not match, **When** the diagnostician confirms, **Then** "Les mots de passe ne correspondent pas." is shown and nothing is changed.

### User Story 3 - See whether I'm signed in, and sign out (Priority: P2)

A signed-in diagnostician can see their status. On the account page, a "Connecté en tant que <email>" (Signed in as) panel replaces the forms, with buttons to "Ouvrir l'outil" (Open the tool) and "Se déconnecter" (Sign out). At the top of the working pages (such as the évaluation library), a status area shows a link to "Mes évaluations" (My evaluations) and a "Se déconnecter" button, plus an indicator of whether work is being saved to the cloud. A signed-out diagnostician instead sees "Non connecté" (Not signed in) and a "Connexion" link.

**Why this priority**: Seeing one's status and being able to sign out builds trust and keeps accounts tidy, but the underlying sign-in is what actually controls access to saved work.

**Independent Test**: Sign in, open the account page and confirm the signed-in panel shows the e-mail; open the évaluation library and confirm the top of the page shows the My-evaluations link and a Sign-out button; sign out and confirm the page returns to the signed-out state.

**Acceptance Scenarios**:
1. **Given** a signed-in diagnostician on the account page (not in reset mode), **When** the page recognises them, **Then** the signed-in panel with their e-mail is shown and the forms are hidden.
2. **Given** a signed-in diagnostician on a working page, **When** the top-of-page status renders, **Then** it shows a "Mes évaluations" link and a "Se déconnecter" button.
3. **Given** the diagnostician chooses "Se déconnecter" (on the account page or at the top of a working page), **When** sign-out completes, **Then** the tool no longer remembers which cloud évaluation was last open.

### Edge Cases

- **Online account not available**: If the online account service has not been set up for this deployment, the account page shows a setup hint, displays a message that the account feature is not configured, and hides both the forms and the signed-in panel. The top-of-page status then offers only a "Connexion" link.
- **Where sign-in can send you next**: After signing in or creating an account, the tool only ever sends the diagnostician to the évaluation library or the editor — never to an arbitrary outside address — even if a link tried to specify somewhere else.
- **Switching language while a message is shown**: Changing the interface language (FR/EN) re-displays any current error or success message, and the not-configured notice, in the new language without losing it.
- **Reset link takes priority**: When the page is opened in reset mode, the reset form is shown even if someone is already signed in, so resetting a password always wins.
- **Unexpected errors**: Any failure that doesn't map to a known cause is shown as a generic "Une erreur est survenue. Réessayez."; the diagnostician never sees a blank or raw technical error.
- **Guest use (no account)**: There is no anonymous sign-in. "Guest" is simply the state when nobody is signed in; in that state the editor keeps work only in this browser and nothing is saved to the cloud.
- **Not handled**: E-mail format is only loosely checked, and the only password rule is the 6-character minimum — there is no strength meter. There is no e-mail-verification step: a newly created account can be used immediately.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tool MUST connect to the online account service when it is properly set up, and MUST behave as "not configured" (offering guest use only) when it is missing or not set up.
- **FR-002**: The tool MUST provide an account page with two choices, "Connexion" (Sign in) and "Créer un compte" (Create account), starting on Sign in unless the page was opened to reset a password.
- **FR-003**: The tool MUST sign a diagnostician in from their e-mail and password and, on success, take them onward to the library or editor.
- **FR-004**: The tool MUST create a new account from an e-mail and a password of at least 6 characters and, on success, take the diagnostician onward.
- **FR-005**: After a successful sign-in or account creation, the tool MUST send the diagnostician to the évaluation library by default, and only ever to the library or the editor — never anywhere else.
- **FR-006**: The tool MUST show clear French messages for known sign-in problems (wrong credentials, weak password, and so on) and a generic fallback message for anything unexpected.
- **FR-007**: The tool MUST send a password-reset e-mail to the address typed on the sign-in screen, with the reset link returning to the account page; if no e-mail was entered it MUST ask for one and send nothing.
- **FR-008**: After a reset request, the tool MUST show a neutral confirmation that does not reveal whether the address has an account.
- **FR-009**: The tool MUST recognise when it has been opened from a reset link and show the reset form when the link is valid, or an "invalid link" message when it is not.
- **FR-010**: The tool MUST require the two new-password fields to match before saving a reset password; on success it MUST hide the form and show a success message.
- **FR-011**: On the account page, the tool MUST show the signed-in panel with the diagnostician's e-mail when they are signed in (and not resetting a password), and the forms otherwise.
- **FR-012**: The tool MUST offer sign-out from both the account page and the top-of-page status, and on sign-out MUST forget which cloud évaluation was last open.
- **FR-013**: The tool MUST show a status at the top of working pages: signed-in shows a "Mes évaluations" link plus a sign-out button; signed-out shows "Non connecté" plus a "Connexion" link; when the account service is unavailable, only a "Connexion" link.
- **FR-014**: While signed in, the tool MUST show a cloud-save indicator at the top of the page (saving / saved / save failed).
- **FR-015**: The tool MUST re-display every visible account and status label, including any current message, when the interface language changes, with no page reload.
- **FR-016**: When the online account service is not set up, the tool MUST show a setup hint and hide the account forms.

### Key Entities *(include if feature involves data)*

- **Online account**: A diagnostician's identity, recognised by e-mail. Used to display who is signed in, to decide which évaluations they own, and to match évaluations that have been shared with their e-mail address.
- **Reset-link state**: Whether the page was opened from a password-reset e-mail, and the one-time reset code carried by that link.
- **What's kept in this browser vs. the cloud**: The identity of the last-opened cloud évaluation is remembered locally and cleared on sign-out; guest work is kept only in this browser; évaluations made while signed in are saved to the user's online account in the cloud.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A diagnostician with valid credentials can sign in or create an account and reach the évaluation library in a single confirmation, with no extra navigation.
- **SC-002**: Every recognised sign-in problem produces a specific French message, and anything unrecognised produces the generic fallback — never a blank or raw technical error.
- **SC-003**: After signing in, a diagnostician always lands on the évaluation library or the editor, never on an outside address.
- **SC-004**: After signing out from either place, the tool no longer remembers the last-open cloud évaluation and shows the signed-out state.
- **SC-005**: A password-reset request shows the same neutral confirmation whether or not the address has an account.
- **SC-006**: Switching language (FR/EN) updates every visible account and status label, including any current message, without a page reload.

## Assumptions

- E-mail and password is the only way to sign in (no Google or other external sign-in, and no anonymous accounts).
- "Guest use" is documented here because the account feature is what unlocks the cloud path; the actual guest-saving behaviour lives in the cloud-sync feature (spec 003).

## Source Files

- `auth.html` — The account page: sign-in, create-account and reset forms, the signed-in panel, and the setup hint.
- `js/app/auth-page.js` — Drives the account page: switching between sign-in and create-account, forgot/reset password, sign-out, messages, and where to go next.
- `js/app/auth-header.js` — Draws the signed-in/out status and the cloud-save indicator shown at the top of working pages.
- `js/lib/firebase-app-auth.js` — Connects to the online account service and reports when it is not set up.
- `js/config/firebase-config.js` — Settings for the online account service.
- `js/i18n/valobois-locales.js` — French and English text for the account page, the top-of-page status, and the messages.
- `mes-evaluations.html` — A working page that shows the top-of-page status.
- `js/lib/valobois-firestore-sync.js` — Switches to guest use when nobody is signed in (referenced here for guest context only).

## Open Questions

- **No e-mail verification**: A newly created account is usable immediately, with no e-mail-verification step. Confirm leaving accounts unverified is intended.
- **Signed-out wording**: When the account service is unavailable, the status shows only a bare "Connexion" link rather than the usual "Non connecté · Connexion"; confirm this difference is intended.
- **Password rule**: The only password rule is the 6-character minimum, with no strength guidance. Confirm this is acceptable.
- **Cloud-save failure**: The save indicator shows a failure state but offers no "retry" action from the top of the page; confirm none is expected.
- **Brand wording**: Some screens say "VALOBOIS" while a sharing hint says "comptes Valoxylo"; a vocabulary inconsistency to confirm, not a behaviour bug.
