# Address auto-detection depends on two external government APIs with no offline handling beyond a generic error

> **Open question** · priority #24 · Tier 3 – Reference data · Source spec: `specs/006-geo-france-context/spec.md`

## Question
Address auto-detection relies on two external services; behaviour offline or on outage, beyond the error message, is unconfirmed. What is expected?

<details>
<summary>🇫🇷 Version française</summary>

La détection automatique d'adresse repose sur deux services externes ; le comportement hors ligne ou en cas de panne, au-delà du message d'erreur, n'est pas confirmé. Qu'attend-on ?

</details>

## Why this is open
**Classification:** Product-intent ambiguity (with a secondary correctness/robustness risk).

The code is unambiguous about *what* it does; the open part is *whether that is the intended behaviour* for an app that is otherwise built to run offline. Auto-detection (User Story 2 / FR-014) calls two hard-coded remote services of the French government:
1. `https://geo.api.gouv.fr/communes?codePostal=…` — the primary commune lookup from the 5-digit postal code (`detectGeoFranceFromLocalisation`, valobois-app.js:1974-1978).
2. `https://api-adresse.data.gouv.fr/search/?…` — the point-geocoding fallback used to find a canton when no commune-name match exists (`geocodeLocalisationPoint`, valobois-app.js:1775-1778).

Both are reached with a bare `await fetch(url)` and **no timeout and no `AbortController`**. There is no `navigator.onLine` check anywhere in the codebase, and the Détecter button's visibility is gated *only* on the presence of a postal code (`_updateGeoFranceDetectButton`, valobois-app.js:1759-1761: `const hasCP = /\b\d{5}\b/.test(localisation); detectBtn.hidden = !hasCP;`). So the button is offered identically whether or not the device has connectivity.

This matters because the application is explicitly packaged for **offline use**: `buildValoboisStandaloneHtml` inlines every local stylesheet and script into one self-contained HTML file (build-standalone-html.js:28-84), and remote `https://` assets are the only ones deliberately *not* inlined (build-standalone-html.js:1-4, 58-59). A diagnostician running that standalone file in the field with no network will see the Détecter button, click it, and the two services are unreachable. The whole detection runs inside one `try/catch`; the two failure surfaces behave differently:

- The **primary** `geo.api.gouv.fr` call: a network failure throws, is caught at valobois-app.js:2094-2098, and the user gets the generic, English-untranslated `'Erreur lors de la détection : ' + err.message` (e.g. "Failed to fetch"). The catch also fires on a genuine outage returning a non-2xx (`if (!response.ok) throw new Error('HTTP ' + response.status)`, valobois-app.js:1977).
- The **fallback** `api-adresse.data.gouv.fr` call: its own network failure is swallowed silently — `geocodeLocalisationPoint` wraps each `fetch` in `try { … } catch (_) { continue; }` (valobois-app.js:1777-1781) and ultimately returns `null` (valobois-app.js:1814). When that happens the flow reports the softer "Département sélectionné. Canton introuvable dans les données locales." (valobois-app.js:2087-2092) even though the real cause is no network, not missing local data — a misleading message.

What I **confirmed**: the two endpoints, the absence of any offline/connectivity gating, the absence of any timeout, the single generic error path for the primary call, and the silent-swallow + misleading-message path for the fallback. What remains **uncertain and is genuinely a product decision**: whether the expected behaviour is (a) leave it as-is (best-effort, generic error), (b) hide/disable Détecter when offline, (c) show a clearer "service indisponible / hors ligne" message distinct from the data-correctness messages, and/or (d) add a request timeout so a hung connection does not leave the button stuck in its `aria-busy`/disabled state (set at valobois-app.js:1963-1966, only cleared in the `finally`). The spec's own Open Questions list flags exactly this (spec.md:144), and the acceptance scenarios (spec.md:43-49) describe only the success/ambiguity/no-match paths — never the offline/outage path — so there is no documented target behaviour to verify against.

## Evidence in the code
- `js/app/valobois-app.js:1974-1978` — primary detection fetch to `https://geo.api.gouv.fr/communes`, bare `await fetch`, throws on non-OK (`if (!response.ok) throw new Error('HTTP ' + response.status)`).
- `js/app/valobois-app.js:1775-1781` — fallback geocode fetch to `https://api-adresse.data.gouv.fr/search/`, each request wrapped in `try { … } catch (_) { continue; }` (network errors silently swallowed).
- `js/app/valobois-app.js:1814` — `geocodeLocalisationPoint` returns `null` when every query fails, indistinguishable from "no result found".
- `js/app/valobois-app.js:2094-2098` — sole catch for the primary path: `'Erreur lors de la détection : ' + (err && err.message …)`, a raw, non-localised message.
- `js/app/valobois-app.js:2087-2092` — when the fallback returns null, the user sees "Canton introuvable dans les données locales", which misattributes a network failure to local data.
- `js/app/valobois-app.js:1754-1762` (`_updateGeoFranceDetectButton`) — Détecter shown/hidden purely on `/\b\d{5}\b/` postal-code presence; no connectivity check.
- `js/app/valobois-app.js:1963-1966` + `:2099-2103` — button set `disabled`/`aria-busy` before the fetch, cleared only in `finally`; with no fetch timeout, a hung request keeps the button busy indefinitely.
- `js/lib/build-standalone-html.js:1-4, 28-84` — standalone export inlines all local assets and deliberately leaves remote `https://` references external, confirming the app is intended to run offline as a single file.
- `specs/006-geo-france-context/spec.md:144` — the spec already records this as an open question; `spec.md:43-49` defines acceptance scenarios that never cover the offline/outage case.
- Codebase-wide: no occurrence of `navigator.onLine`, `AbortController`, or fetch `timeout` (grep over `js/`).

## What would resolve it
- Product owner decides the expected offline/outage behaviour: keep best-effort + generic error, or specify one of — hide/disable Détecter when `navigator.onLine === false`, show a dedicated "service indisponible / pas de connexion" status distinct from data-not-found, and/or fall back gracefully to manual département/canton selection.
- Decide whether the fallback's silent failure (valobois-app.js:1777-1781) should be surfaced so the "Canton introuvable dans les données locales" message is not shown when the real cause is a network failure.
- If robustness is desired, add a request timeout/`AbortController` to both fetches so the Détecter button cannot remain stuck in its busy/disabled state on a hung connection.
- Add an offline/outage acceptance scenario to `specs/006-geo-france-context/spec.md` (currently absent) so future behaviour is testable; verify by loading a standalone export with the network disabled and clicking Détecter.
