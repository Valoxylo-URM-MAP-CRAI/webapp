# Sharing-dialog hint diverges between French and English

> **Open question** · priority #63 · Tier 7 – Wording, i18n & UX · Source spec: `specs/002-evaluation-library/spec.md`

## Question
The French sharing hint mentions "comptes Valoxylo" and that no e-mail is sent; the English hint says invitees must sign in with the same e-mail. Confirm which wording is authoritative.

<details>
<summary>🇫🇷 Version française</summary>

L'aide au partage en français mentionne « comptes Valoxylo » et qu'aucun e-mail n'est envoyé ; l'aide en anglais indique que les invités doivent se connecter avec le même e-mail. Confirmer quelle formulation fait foi.

</details>

## Why this is open
**Classification:** Product-intent ambiguity (wording / i18n), with a secondary cross-file inconsistency between the two locale strings.

The two hint strings are not translations of each other — they describe the same feature but surface different subsets of true facts, so neither is "wrong" against the code, but they cannot both be the canonical user-facing message. The French `mesEval.shareModalHint` (`js/i18n/valobois-locales.js:44-48`) is four sentences: it tells the user to enter the e-mail of the "comptes Valoxylo" to share with, gives the formatting rules (one per line / commas / spaces), states that shared evaluations are editable by third parties but not deletable, and explicitly reassures that "aucun e-mail ne sera envoyé" (no e-mail is sent). The English `mesEval.shareModalHint` (`js/i18n/valobois-locales.js:148-149`) is a single sentence that keeps the formatting rule and the edit-but-not-delete rule, drops both the "Valoxylo accounts" framing and the "no e-mail is sent" reassurance, and adds a fact the French omits: "They must sign in with the same email."

I confirmed that the *added* English fact is accurate. Sharing is implemented purely as an e-mail-match access model with no notification side effect. The Share button writes the tidied address list to the Firestore field `sharedEmails` (`js/app/mes-evaluations-page.js:485-492`), and the list of "shared-with-me" evaluations is found by querying `collectionGroup(COL_EVAL).where('sharedEmails', 'array-contains', emailForQuery)` (`js/app/mes-evaluations-page.js:294-297`), where `emailForQuery` is the *signed-in user's own* token e-mail, lower-cased (`js/app/mes-evaluations-page.js:548-555`). So an invitee genuinely only sees the evaluation once they sign in under an account whose token e-mail equals one of the stored addresses — the English "must sign in with the same email" is literally how access is granted. I also confirmed the French reassurance is accurate: there is no `sendEmail` / `mailto` / invitation / notification code anywhere in the sharing path (grep over `mes-evaluations-page.js` returned nothing), and the spec describes the access model as e-mail-match only, with no notification step.

So this is not a bug — both strings are factually correct about the as-built behaviour. The openness is a product/wording decision: (1) should the English hint be brought in line with the fuller French one (add the "no e-mail is sent" reassurance and the Valoxylo-accounts framing), or should the French be trimmed toward the English? (2) The term "comptes Valoxylo" appears only in this French string; the product/brand name used elsewhere in the UI is **VALOBOIS** (e.g. the auth-page title `authPage.title: 'VALOBOIS account'`, `js/i18n/valobois-locales.js:163`), while "Valoxylo" is used for the logo and the scoring matrix (`index.html:333`, `js/i18n/valobois-locales-editor.js:285`). Whether "comptes Valoxylo" is the intended account brand here, or a leftover that should read "comptes VALOBOIS", is itself a product call. The spec's own open-questions section (`specs/002-evaluation-library/spec.md:132`) records exactly this FR-vs-EN divergence and asks "Which wording is authoritative?", so it has not been resolved at the spec level either.

What remains uncertain is purely intent: which message the product owner wants invitees/owners to see, and the correct account brand name ("Valoxylo" vs "VALOBOIS"). The mechanics are fully confirmed; only the canonical copy is undecided.

## Evidence in the code
- `js/i18n/valobois-locales.js:44-48` — French `shareModalHint`: 4 facts incl. "comptes Valoxylo" and "aucun e-mail ne sera envoyé".
- `js/i18n/valobois-locales.js:148-149` — English `shareModalHint`: single sentence, omits the "no e-mail" reassurance and the Valoxylo framing, adds "They must sign in with the same email."
- `js/app/mes-evaluations-page.js:204` — hint is rendered as raw HTML (`m.hint.innerHTML = t('mesEval.shareModalHint')`), so the FR `<br>` markup is intentional and EN/FR length differs in the same dialog.
- `js/app/mes-evaluations-page.js:485-492` — Share saves the tidied address list into the `sharedEmails` field; no notification is sent.
- `js/app/mes-evaluations-page.js:294-297` — shared evaluations are discovered via `where('sharedEmails', 'array-contains', emailForQuery)`.
- `js/app/mes-evaluations-page.js:548-555` — `emailForQuery` is the signed-in user's own ID-token e-mail (lower-cased), confirming the EN "same email" claim.
- `js/i18n/valobois-locales.js:163` — `authPage.title: 'VALOBOIS account'` — elsewhere the account brand is "VALOBOIS", not "Valoxylo".
- `index.html:333`, `js/i18n/valobois-locales-editor.js:285` — "Valoxylo" is otherwise used for the logo and the scoring matrix, not for accounts.
- `specs/002-evaluation-library/spec.md:35-47, 99-101, 132` — spec confirms e-mail-match access with no notification, and explicitly logs this FR/EN wording divergence as unresolved.

## What would resolve it
- Product owner decides the canonical hint copy and language parity: confirm whether the English string should gain the "no e-mail is sent" reassurance and the account framing (or the French should be shortened to match), then align both `shareModalHint` strings.
- Product owner confirms the correct account brand name in the hint — "comptes Valoxylo" vs "comptes VALOBOIS" — and the string is corrected to match the rest of the UI.
- No code change is needed to make either statement true; the access mechanism (e-mail match, no notification) is already as both strings (partially) describe it.
