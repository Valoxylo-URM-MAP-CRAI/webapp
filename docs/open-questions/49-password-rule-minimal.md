# Password rule is only a 6-character minimum, with no strength guidance

> **Open question** · priority #49 · Tier 6 – Accounts & access · Source spec: `specs/001-authentication/spec.md`

## Question
The only password rule is a 6-character minimum, with no strength guidance. Confirm this is acceptable.

<details>
<summary>🇫🇷 Version française</summary>

La seule règle de mot de passe est un minimum de 6 caractères, sans indication de robustesse. Confirmer que c'est acceptable.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (the code is unambiguous; whether the policy is strong enough is a product/security decision).

The code is clear and consistent, so this is not a bug or a cross-file conflict — it is a question about whether the as-built policy is what the product owner wants. There is **no application-level password validation at all**. The account-creation handler reads the password straight from the field and passes it to Firebase without any local check (`js/app/auth-page.js:250-254`): it calls `auth.createUserWithEmailAndPassword(em, pw)` with no length, character-class, or strength test. The same is true for the reset flow, which only verifies that the two new-password fields match before calling `confirmPasswordReset` (`js/app/auth-page.js:184-191`).

The "6-character minimum" therefore comes from two places, neither of which is a real strength policy. First, the HTML inputs carry a cosmetic `minlength="6"` attribute on the sign-up field (`auth.html:114`) and on both reset fields (`auth.html:57`, `auth.html:61`) — this only triggers the browser's native form-validation tooltip and is trivially bypassable (it is not enforced in JS, and is absent from the sign-in field at `auth.html:96`, correctly). Second, and authoritatively, the **6-character rule is Firebase Authentication's own built-in default**: when a too-short password is submitted, Firebase rejects it with the `auth/weak-password` error code, which the page maps to a localized message via `AUTH_ERR_TO_KEY` (`js/app/auth-page.js:13`) and `showError` (`js/app/auth-page.js:259`). That message is "Le mot de passe est trop faible (minimum 6 caractères)." / "Password is too weak (minimum 6 characters)." (`js/i18n/valobois-locales.js:100` and `:200`).

I confirmed there is **no strength meter, no complexity/regex check, and no client-side length check** anywhere in `js/` — a repository-wide search for strength/complexity/`password.*length` logic returned only unrelated wood-evaluation domain helpers (the many `'strong'` hits in `js/app/valobois-domain-helpers.js` are alert-level classifications, not password code). So the entire policy is exactly: whatever Firebase enforces by default (currently a 6-character minimum, no composition rules). The spec already documents this explicitly as intended-but-to-confirm (`specs/001-authentication/spec.md:60` "the only password rule is the 6-character minimum — there is no strength meter" and the matching open question at `:120`).

What remains genuinely open is the **product decision**, not the code reading: is a bare 6-character minimum with no strength guidance acceptable for diagnosticians' accounts, given that these accounts gate cloud-stored évaluations? Firebase Auth does support configuring a stricter password policy (minimum length up to 30, required character classes) at the project level, so tightening it would not necessarily require app-code changes — but nothing in this repo configures or hints at such a policy today.

## Evidence in the code
- `js/app/auth-page.js:250-254` — sign-up handler passes the raw password directly to `auth.createUserWithEmailAndPassword(em, pw)` with no local validation.
- `js/app/auth-page.js:184-191` — reset handler checks only that the two fields match, then calls `confirmPasswordReset`; no length/strength check.
- `js/app/auth-page.js:13` — `'auth/weak-password': 'authErrors.weakPassword'` maps Firebase's weak-password rejection to a UI message; this is the only "rule" enforcement.
- `js/app/auth-page.js:258-259` — sign-up errors (including weak-password) are surfaced via `showError(errEl, err)`, i.e. the rule is enforced server-side by Firebase, not by the app.
- `js/i18n/valobois-locales.js:100` / `:200` — the weak-password message hard-codes "(minimum 6 caractères)" / "(minimum 6 characters)", documenting the threshold in UI text.
- `auth.html:114`, `auth.html:57`, `auth.html:61` — cosmetic `minlength="6"` on the sign-up and reset inputs (browser-only, bypassable).
- `auth.html:96` — the sign-in password input has no `minlength` (correct: sign-in should accept any existing password).
- `specs/001-authentication/spec.md:60`, `:69` (FR-004), `:120` — spec records the 6-character minimum as the only rule and flags it as an open question.

## What would resolve it
- Product/security owner confirms a 6-character minimum with no strength guidance is acceptable for this tool's accounts; if not, decide the target policy (minimum length, required character classes, optional strength meter).
- If a stricter policy is wanted, decide where it should live: tightening the **Firebase Authentication password policy** at the project level (likely no app-code change), versus adding **client-side validation + a strength indicator** in `auth-page.js` / `auth.html` (better UX, but must not weaken the server-side rule).
- Note for whoever implements: the displayed threshold is hard-coded as "minimum 6 caractères" in `js/i18n/valobois-locales.js:100`/`:200`, so any policy change must update those strings (and the cosmetic `minlength` attributes) to stay consistent.
