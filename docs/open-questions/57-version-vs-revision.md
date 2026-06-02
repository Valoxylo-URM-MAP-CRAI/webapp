# « Version de l'évaluation » (texte libre) vs « Révision » (compteur d'enregistrements)

> **Open question** · priority #57 · Tier 7 – Wording, i18n & UX · Source spec: `specs/005-editor-general-info/spec.md`

## Question
The relationship between the visible free-text "evaluation version" and the hidden auto-incremented "revision" number is not explained in the interface. Confirm the intended distinction (user-facing version vs save counter).

<details>
<summary>🇫🇷 Version française</summary>

Le lien entre la « version de l'évaluation » (texte libre, visible) et le « numéro de révision » interne (auto-incrémenté, masqué) n'est pas explicité dans l'interface. Confirmer la distinction voulue (version pour l'utilisateur vs compteur d'enregistrements).

</details>

## Why this is open
**Classification:** Product-intent ambiguity (the code is unambiguous; the question is whether the lack of UI explanation is acceptable).

The code confirms two completely independent fields exist and behave as the question describes:

- **`meta.versionEtude`** is a free-text field the diagnostician types. It is rendered as a plain `<input type="text">` (`index.html:487`) bound via `data-meta-field="versionEtude"`, with placeholder `« Ex. V1, V2, Pré-diagnostic »`. It is initialised to `''` in the default meta (`valobois-app.js:6840`), is never validated or normalised, and is fully under user control. It is a member of the `operationReference` required-field set (`valobois-constants.js:30`), so an empty value contributes to the "incomplete section" badge — but its format is never checked.

- **`meta.revision`** is an integer auto-incremented on every save. `saveData()` re-normalises meta then does `this.data.meta.revision = (Number(this.data.meta.revision) || 0) + 1;` (`valobois-app.js:8831`). `getDefaultMeta()` seeds it to `0` when absent (`valobois-app.js:6943`). There is **no DOM input** for it — confirmed by grep: there is no `data-meta-field="revision"`, no `inputRevision`, no element id matching `revision` for this field (the only `*Revision*` DOM ids in `index.html:4947+` belong to an unrelated "Révision des notations" / alteration-rescoring modal, `openAlterationRevisionModal`). So the user can neither see nor edit it in the editor.

The two are genuinely orthogonal: `versionEtude` is a human label; `revision` is a monotonic write counter. The counter's real consumer is the cloud sync layer, where it is written to Firestore as a per-document `revision` field on every save (`valobois-firestore-sync.js:301`, `:474`, `:583`, `:621`; documented in the security-rules comment at `:29-30`) — i.e. it functions as a save/version stamp for conflict detection and ordering, not as anything the diagnostician reads.

What this means for the question: the *behaviour* is not in doubt. What is open is purely **product intent / UX wording** — the interface never tells the user that "version" is their own free label while a separate hidden counter tracks saves. One subtlety worth flagging to the product owner: `meta.revision` is **not** fully hidden in outputs. It is emitted in the CSV/data export row (`valobois-app.js:47048`) and shown in the recap field list under the French label **« Révision »** (`valobois-app.js:47175`), sitting right next to **« Version de l'étude »** (`:47166`). So a reader of an export/recap sees both "Version de l'étude" and "Révision" with no explanation of how they differ — which is exactly the confusion this question anticipates. (Note also a minor label inconsistency: the editor label is "Version de l'évaluation" at `index.html:485`, while the recap uses "Version de l'étude" at `:47166`.)

Confirmed: the field separation, the auto-increment, the absence of a revision input, and the dual export. Uncertain (needs product decision): whether the UI should explain the distinction, whether "Révision" should appear in user-facing exports at all, and whether the version/étude vs version/évaluation labels should be harmonised.

## Evidence in the code
- `index.html:485-489` — "Version de l'évaluation" free-text input, `data-meta-field="versionEtude"`, placeholder "Ex. V1, V2, Pré-diagnostic", no format validation.
- `js/app/valobois-app.js:6840` — `versionEtude: ''` default; user-controlled string.
- `js/app/valobois-app.js:6943` — `revision` seeded to `0` in `getDefaultMeta()` when missing.
- `js/app/valobois-app.js:8831` — `saveData()` auto-increments `meta.revision` on every save; no user input path.
- `js/app/valobois-constants.js:30` — `versionEtude` is part of `operationReference` required fields (affects incomplete-section badge); `revision` is absent from any required set.
- `js/lib/valobois-firestore-sync.js:301, 471-474, 580-583, 621` — `revision` written to Firestore on each save as a per-document counter; security-rule comment at `:29-30` lists it as a synced field — its real consumer is sync, not the user.
- `js/app/valobois-app.js:47048` — `meta.revision` emitted in the export row alongside `meta.versionEtude` (`:47039`).
- `js/app/valobois-app.js:47166` & `:47175` — recap field list shows both "Version de l'étude" and "Révision", adjacent, with no clarifying text.
- Grep: no `data-meta-field="revision"` / `inputRevision` / revision input anywhere; the `alterationRevision*` DOM ids (`index.html:4947+`, `valobois-app.js:9912+`) are an unrelated alteration-rescoring feature.

## What would resolve it
- Product owner confirms the intended split: `versionEtude` = user's own free label, `revision` = internal save counter — and decides whether the editor should surface a tooltip/help text explaining it.
- Decide whether the internal `revision` counter should be visible at all in the user-facing recap/export (`valobois-app.js:47175`, `:47048`); if it is a sync/debug artifact, consider hiding it or relabelling it (e.g. "Nº d'enregistrement") to avoid confusion with the user "version".
- Harmonise the label between editor ("Version de l'évaluation", `index.html:485`) and recap ("Version de l'étude", `valobois-app.js:47166`).
