# Signed-out wording differs when the account service is unavailable

> **Open question** · priority #50 · Tier 6 – Accounts & access · source question Q2 · Source spec: `specs/001-authentication/spec.md`

## Question
When the account service is unavailable, the header shows only a bare "Connexion" link instead of the usual "Non connecté · Connexion". Confirm this difference is intended.

<details>
<summary>🇫🇷 Version française</summary>

Quand le service de comptes est indisponible, l'en-tête n'affiche qu'un lien « Connexion » au lieu du « Non connecté · Connexion » habituel. Confirmer que cette différence est voulue.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (the code is unambiguous; only the desirability of the difference is a product decision).

The header status renderer in `js/app/auth-header.js` has two distinct signed-out renderings, selected by whether an auth instance exists, and the code is fully traceable — there is no bug or inconsistency. Inside `bindAuthBanner`, `renderFromState` first branches on `bannerAuth`. When `bannerAuth` is falsy (the "service unavailable / not configured" case) it clears the container and appends a single `<a href="auth.html">` whose text is `t('auth.header.signIn')` ("Connexion") — and nothing else (`auth-header.js:112-119`). When an auth instance does exist but no user is signed in, control falls through to `renderAuthStatus`, whose signed-out tail appends the text node `t('auth.header.notSignedIn') + ' · '` ("Non connecté · ") followed by the same "Connexion" link (`auth-header.js:96-102`). So the "Non connecté" prefix is deliberately omitted in exactly the unavailable case.

The "unavailable" condition is concrete and well-defined. `bannerAuth` is set from `getValoboisAuth()` (`auth-header.js:129-132`), which returns `null` when `window.firebase` is absent, or when `valoboisFirebaseConfig` is missing/has no `apiKey`/has the placeholder `apiKey === 'REPLACE_ME'` (`js/lib/firebase-app-auth.js`, the `getValoboisAuth` guard). In that state `bannerAuth` stays `null` and the bare-link branch is taken. This matches the spec exactly: the Edge Case "Online account not available" says the top-of-page status "then offers only a 'Connexion' link", and FR-013 explicitly distinguishes signed-out ("Non connecté" plus a "Connexion" link) from service-unavailable ("only a 'Connexion' link"). So the behaviour is as-specified, not accidental.

What is genuinely open is therefore not *what* the code does but *whether the distinction is wanted*. Showing "Non connecté" to a guest implies a temporary, fixable state ("you could connect"), whereas a deployment with no configured account service can never connect at all — arguably the bare link (or even no link) is more honest. Equally, a product owner might prefer a *consistent* "Non connecté · Connexion" everywhere for simplicity, or a different label (e.g. "Comptes indisponibles") that does not promise a working sign-in page. The two renderings also produce subtly different DOM/wording that the i18n layer treats identically (both reuse `auth.header.signIn`; only the signed-out branch uses `auth.header.notSignedIn`), so there is no separate string to express "unavailable" should the wording need to diverge.

Confirmed: the code reliably produces a bare "Connexion" link only when auth is unconfigured/unavailable, and "Non connecté · Connexion" only when auth is configured but no user is signed in; the two paths cannot be confused at runtime. Uncertain: solely the product intent — whether this two-tier wording is the desired UX or an artifact of the simplest implementation.

## Evidence in the code
- `js/app/auth-header.js:112-119` — `renderFromState`: when `bannerAuth` is falsy, the container is cleared and a single anchor (text `auth.header.signIn`) is appended, with no "Non connecté" prefix.
- `js/app/auth-header.js:96-102` — `renderAuthStatus` signed-out tail: appends `t('auth.header.notSignedIn') + ' · '` then the "Connexion" anchor — the "usual" two-part wording.
- `js/app/auth-header.js:129-132` — `bannerAuth` is taken from `getValoboisAuth()`; a `null` result keeps `bannerAuth = null`, routing to the bare-link branch.
- `js/lib/firebase-app-auth.js` (`getValoboisAuth`) — returns `null` when `firebase` is absent or `valoboisFirebaseConfig` is missing / `apiKey` is empty or `'REPLACE_ME'`; this is the operative definition of "service unavailable".
- `js/i18n/valobois-locales.js:18-19` — `notSignedIn: 'Non connecté'` and `signIn: 'Connexion'`; only `signIn` is reused by the unavailable branch, so there is no dedicated string for the unavailable state.
- `specs/001-authentication/spec.md` — Edge Case "Online account not available" and FR-013 codify the difference as intended in the as-built spec.

## What would resolve it
- Product owner confirms whether the bare "Connexion" link (vs. "Non connecté · Connexion") is the desired wording for an unconfigured/unavailable account service, or whether the two cases should share identical wording.
- If a distinct message is wanted for the unavailable state, add a dedicated i18n key (e.g. `auth.header.accountsUnavailable`) rather than silently dropping the "Non connecté" prefix, so FR/EN can diverge cleanly.
- No code fix is required to *resolve correctness* — the behaviour already matches FR-013 and the spec's Edge Case; this is a wording/UX confirmation only.
