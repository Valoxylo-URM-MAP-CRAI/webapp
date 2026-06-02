# Share dialog brand wording: "Membres" / "comptes Valoxylo" vs. the VALOBOIS brand

> **Open question** · priority #62 · Tier 7 – Wording, i18n & UX · Source spec: `specs/004-sharing-collaboration/spec.md`

## Question
Some screens say "VALOBOIS" while sharing uses "Membres" / "comptes Valoxylo". Confirm whether the terminology should be harmonised (wording, not a behaviour bug).

<details>
<summary>🇫🇷 Version française</summary>

Certains écrans indiquent « VALOBOIS » tandis que le partage utilise « Membres » / « comptes Valoxylo ». Confirmer si la terminologie doit être harmonisée (formulation, pas un défaut de comportement).

</details>

## Why this is open
**Classification:** Product-intent ambiguity (with a secondary cross-file / cross-locale inconsistency).

The code unambiguously uses three different brand-facing words for the same product, and there is no behavioural defect — it is purely a wording decision. The application is titled and branded **VALOBOIS** (`index.html:6` page title `VALOBOIS – Évaluation des bois`; the account page title is `Compte VALOBOIS` / `VALOBOIS account` at `js/i18n/valobois-locales.js:62` and `:163`). Yet the share dialog, which is the subject of spec 004, addresses the user with **"Membres (e-mails)"** as its title and tells them to enter the addresses of **"comptes Valoxylo"** (`js/i18n/valobois-locales.js:43` and `:45`). A third spelling, **Valoxylo**, also appears as the product/brand in the editor: the scoring matrix is titled "Matrice Valoxylo" / "Valoxylo Matrix" (`js/i18n/valobois-locales-editor.js:285`, `:740`; `index.html:3525`), the QR/label base URL is `https://valoxylo.app` (`js/app/valobois-constants.js:205`), the label footer placeholder reads `VALOXYLO · …` (`js/i18n/valobois-locales-editor.js:223`, `:680`), and the home logo carries `class="logo-valoxylo"` with `aria-label="VALOBOIS"` on the same element (`index.html:331`) — i.e. the two brand names are literally collapsed onto one DOM node.

I confirmed this is **not a bug**: the share flow works regardless of the label text, and the spec itself already flags it as "a terminology inconsistency, not a behaviour bug" (`specs/004-sharing-collaboration/spec.md:99`). The open part is a product decision — whether VALOBOIS and Valoxylo are meant to be one brand (and which one should win in user-facing copy), or whether "Valoxylo" is a deliberate platform/account-system name distinct from the "VALOBOIS" tool name. Static reading cannot settle that; it is an intent call for the product owner.

A secondary, concrete inconsistency I did confirm while substantiating this: the two locales of the share dialog have **diverged in content**, not just brand spelling. The French `shareModalHint` (`js/i18n/valobois-locales.js:45-48`) explicitly says "comptes Valoxylo" and includes the "aucun e-mail ne sera envoyé" note, whereas the English `shareModalHint` (`js/i18n/valobois-locales.js:149`) is a shorter, differently-worded string that drops the brand word and the no-email note entirely — while the English title still says "Members (email addresses)" (`:147`). So harmonising the brand wording should be coordinated with re-aligning the FR/EN hint copy, which currently is not a 1:1 translation.

## Evidence in the code
- `index.html:6` — page `<title>` is `VALOBOIS – Évaluation des bois` (the primary brand).
- `js/i18n/valobois-locales.js:62` / `:163` — auth page title `Compte VALOBOIS` / `VALOBOIS account`.
- `js/i18n/valobois-locales.js:43` — share dialog title FR: `shareModalTitle: 'Membres (e-mails)'`.
- `js/i18n/valobois-locales.js:45` — share dialog hint FR: "…adresses e-mail des **comptes Valoxylo**…" (the disputed wording).
- `js/i18n/valobois-locales.js:147` / `:149` — EN counterparts: title `Members (email addresses)`, but the hint is a shorter, diverged string with no brand word and no no-email note.
- `js/i18n/valobois-locales-editor.js:285` / `:740` — scoring matrix titled `Matrice Valoxylo` / `Valoxylo Matrix`.
- `js/app/valobois-constants.js:205` — `VALOBOIS_ETIQUETTE_QR_CONFIG.baseUrl: 'https://valoxylo.app'` (label QR links use the Valoxylo domain).
- `js/i18n/valobois-locales-editor.js:223` / `:680` — label footer placeholder `VALOXYLO · Lot 1 · …`.
- `index.html:331` — home logo node `class="accueil-logo-valobois logo-valoxylo" aria-label="VALOBOIS"` — both names on one element.
- `specs/004-sharing-collaboration/spec.md:99` — spec already records this as "a terminology inconsistency, not a behaviour bug."

## What would resolve it
- Product owner confirms the relationship between the two names: is "VALOBOIS" the tool and "Valoxylo" the account/platform brand (so "comptes Valoxylo" is intentional), or should one brand be used everywhere?
- If harmonisation is wanted: decide the canonical user-facing term, then update `shareModalTitle` and `shareModalHint` in both locales (`js/i18n/valobois-locales.js:43,45,147,149`) and, if "Valoxylo" is dropped, the matrix titles, the label-footer placeholders, and the home logo `aria-label`. The QR `baseUrl` (`valoxylo.app`, `js/app/valobois-constants.js:205`) is a real domain and should change only if the domain itself changes — verify before touching it.
- Independently of the brand decision, re-align the FR and EN `shareModalHint` strings so they convey the same information (the EN version currently omits the brand reference and the "no email is sent" note present in FR).
