# Newly created accounts are usable immediately, with no e-mail-verification step

> **Open question** · priority #48 · Tier 6 – Accounts & access · Source spec: `specs/001-authentication/spec.md`

## Question
A newly created account is usable immediately, with no e-mail-verification step. Confirm leaving accounts unverified is intended.

<details>
<summary>🇫🇷 Version française</summary>

Un compte nouvellement créé est utilisable immédiatement, sans étape de vérification d'e-mail. Confirmer que laisser les comptes non vérifiés est voulu.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (the code is unambiguous; only the product owner can say whether the behaviour is desired).

The code path for account creation is clear and self-contained. On submit of the create-account form, `auth-page.js` calls `auth.createUserWithEmailAndPassword(em, pw)` and, on the resolved promise, immediately calls `redirectAfterAuth()` which navigates the browser to `mes-evaluations.html` (the évaluation library). There is no intermediate step: no call to send a verification e-mail, no message telling the user to check their inbox, and no branch that holds the account in a pending state. The diagnostician is signed in and working the instant Firebase resolves the create call.

I confirmed by full-codebase search that **no verification machinery exists anywhere**. Grepping for `emailVerified`, `sendEmailVerification`, and `verification` across `js/`, `auth.html`, `mes-evaluations.html`, and `index.html` returns zero matches (the only `verif`/`papaverifera` hits are botanical species names in `js/data/`). So Firebase's built-in `user.emailVerified` flag is never read, never sent, and never used to gate anything.

I also confirmed that downstream access is never gated on verification. The top-of-page status banner in `auth-header.js` decides "signed in vs. signed out" purely on `if (user && user.email)` — it shows the "Mes évaluations" link, sign-out button, and cloud-save indicator for any user with an e-mail, verified or not. Likewise the account page's `updateLoggedInUI(user)` shows the signed-in panel whenever `user && user.email`. There is no place in the app where an unverified user is treated differently from a verified one.

This is therefore not a bug or an inconsistency — the implementation is coherent and matches its spec. The spec's own Edge Cases section already documents the behaviour as intentional-as-built ("There is no e-mail-verification step: a newly created account can be used immediately", spec line 60), and lists it as an Open Question (spec line 118). The question that remains is purely a product/security decision: is it acceptable that someone can create and immediately use an account under an e-mail address they may not control (enabling typo-squatting of others' addresses, throwaway/spam accounts, and — relevant to this tool — receiving évaluations shared by e-mail to an address one does not actually own, since the spec's Key Entities note that sharing matches évaluations "to their e-mail address"). The code cannot answer this; the owner must.

## Evidence in the code
- `js/app/auth-page.js:254-256` — `createUserWithEmailAndPassword(em, pw).then(function () { redirectAfterAuth(); })`: success goes straight to redirect, with no verification e-mail or pending state.
- `js/app/auth-page.js:37-49` — `redirectAfterAuth()` sends the user to `mes-evaluations.html` (the library) unconditionally on account creation.
- `js/app/auth-page.js:146-160` — `updateLoggedInUI(user)` shows the signed-in panel and hides the forms based solely on `user && user.email`; `emailVerified` is not consulted.
- `js/app/auth-header.js:19-21` — `renderAuthStatus(...)` treats the user as signed in (full banner, My-evaluations link, sign-out) whenever `user && user.email`; no verification gate.
- `js/lib/firebase-app-auth.js:8-23` — `getValoboisAuth()` returns the raw Firebase `auth()` instance; nothing wraps it to enforce verification.
- Codebase-wide grep for `emailVerified` / `sendEmailVerification` / `verification` in `js/`, `auth.html`, `mes-evaluations.html`, `index.html` — **zero matches**, confirming no verification flow exists.
- `specs/001-authentication/spec.md:60` and `:118` — the spec documents this as intentional as-built and flags it as the source open question (Q1).

## What would resolve it
- Product owner confirms whether immediate use of unverified accounts is acceptable for VALOBOIS given the e-mail-based sharing model (an unverified address can be the recipient of shared évaluations).
- If verification is desired, decide the gating point: block redirect after `createUserWithEmailAndPassword` and call `user.sendEmailVerification()`, then gate library/editor access on `user.emailVerified` in both `auth-page.js` (`updateLoggedInUI`) and `auth-header.js` (`renderAuthStatus`).
- If the current behaviour is confirmed acceptable, close this question and leave the spec's Edge Case note as the authoritative record — no code change needed.
