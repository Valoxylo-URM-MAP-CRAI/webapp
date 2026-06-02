# SketchUp component naming: do the derived names survive a real import?

> **Open question** · priority #33 · Tier 4 – Exports · Source spec: `specs/013-export-glb-dae-3d/spec.md`

## Question
Past notes describe tuning how SketchUp derives component names; confirm the names survive a current SketchUp import cleanly.

<details>
<summary>🇫🇷 Version française</summary>

Des notes passées décrivent des réglages sur la façon dont SketchUp dérive les noms de composants ; confirmer que les noms survivent proprement à un import SketchUp actuel.

</details>

## Why this is open
**Classification:** Could not be fully traced (runtime confirmation needed) — with a secondary **Cross-file inconsistency** between the code and its own explanatory comments.

The DAE writer in `js/lib/build-dae.js` derives a per-piece name (`uniqueLabel`) from the piece metadata and writes it into three places: the `<geometry name>`, the `<node>` in `<library_nodes>` (`compId`/`name`), and the instancing `<node>` in `<visual_scene>` (`instId`/`name`). The naming itself is deterministic and traceable: `toSafeId` strips accents (NFD + diacritic removal), replaces non-alphanumerics with `_`, collapses/trims underscores, prefixes a leading digit with `p_`, and falls back to `'piece'` when empty; the final label is `essence_typePiece_<index>` (with empty parts dropped, falling back to `piece_<index>`). That part matches spec FR-012 and is confirmed by reading the code. **What cannot be confirmed from the source alone is the actual question being asked**: whether SketchUp, on import, surfaces these names as the component-definition names rather than overriding them with its own auto-generated labels (`Composant#1`, `Component#1`, …). This depends entirely on SketchUp's COLLADA importer behaviour and can only be settled by importing a generated `.dae` into a current SketchUp version and inspecting the Components/Outliner panels.

The reason this is genuinely unresolved (and not just an untested feature) is that the file's own comments document a history of trial-and-error and contain hedged, unverified assumptions that contradict the code as written. Lines 74–79 assert the strategy is to have **no** `<library_nodes>` and to place `<instance_geometry>` directly in the visual scene "because SketchUp ignores the `name` of `<library_nodes>` nodes → always `Composant#N`". But the code immediately below does the opposite: it emits a full `<library_nodes>` block (lines 149–153, 177–179) and the visual-scene nodes use `<instance_node url="#compId"/>` (lines 156–160), i.e. exactly the indirection the comment says to avoid. So the comment block describing the chosen fix and the actual emitted XML disagree.

The naming reliance is further flagged as guesswork inside the code itself: line 108 says `// Option A : ... hypothèse que SketchUp lit l'id comme nom de définition` and line 148 says `// id = uniqueLabel ... → SketchUp devrait l'utiliser comme nom de définition`. Words like *hypothèse* ("hypothesis") and *devrait* ("should") signal the author never confirmed the outcome. There are now competing name carriers in the file — `geometry@name`, `library_nodes` `node@id` and `node@name`, and `visual_scene` `node@id`/`node@name` — all set to `uniqueLabel`, which reads as "set the name everywhere and hope SketchUp picks one of them up." This is a belt-and-braces workaround, not a verified contract.

What I confirmed: the names are computed correctly and are import-safe as XML identifiers (ASCII-only, no spaces, no leading digit), uniqueness is guaranteed because each geometry's positions are baked with a distinct offset (lines 113–120, so two dimensionally-identical pieces still produce distinct geometry and cannot be merged), and the values fed in come from `buildMetadata` in `valobois-app.js` (lines 47594–47601, using `essence`/`typePiece`). What remains uncertain: whether SketchUp's importer actually displays `uniqueLabel` as the component name, given the comment/code contradiction and the explicitly hypothetical reasoning. One minor secondary nuance worth noting for the product owner: `metadata.essence` is only the common name (`essenceNomCommun`), never the scientific name, so the names are common-name-based.

## Evidence in the code
- `js/lib/build-dae.js:82-89` — `toSafeId`: NFD accent stripping, non-alphanumerics → `_`, collapse/trim `_`, `p_` prefix for leading digit, `'piece'` fallback. Confirms FR-012 sanitisation.
- `js/lib/build-dae.js:102-110` — builds `uniqueLabel = essence_typePiece_<i+1>` (fallback `piece_<i>`); `compId = uniqueLabel` with the comment "Option A : ... hypothèse que SketchUp lit l'id comme nom de définition".
- `js/lib/build-dae.js:124` — `uniqueLabel` written to `<geometry name="...">`.
- `js/lib/build-dae.js:147-153` — `uniqueLabel` written to `<library_nodes>` `node@id` and `node@name`, with comment "SketchUp devrait l'utiliser comme nom de définition" (unverified).
- `js/lib/build-dae.js:156-160` — visual-scene node uses `<instance_node url="#compId"/>`, carrying `uniqueLabel` again as `node@name`.
- `js/lib/build-dae.js:74-79` — comment claims the fix is **no** `<library_nodes>` and `<instance_geometry>` directly in the scene — contradicted by the emitted XML at lines 149-160 and 177-179.
- `js/lib/build-dae.js:113-120, 51-53` — positions baked with per-piece offset to force unique geometry so "les noms fournis dans `name` sont préservés (pas de 'Composant1')" — the stated rationale for the naming workaround.
- `js/app/valobois-app.js:47594-47601` — `buildMetadata` supplies `essence: piece.essenceNomCommun || lot...essenceNomCommun` (common name only) and `typePiece`, the inputs to the name.
- `js/app/valobois-app.js:47607-47613` — `piecesData` (each `{ piece, metadata }`) is passed to `window.buildMultiDAE`.

## What would resolve it
- Generate a `.dae` from a lot containing at least two pieces (ideally two with identical dimensions and distinct essence/type) and import it into a current SketchUp version; inspect the Components browser and Outliner to confirm each component's name equals the expected `essence_typePiece_N` rather than `Composant#N` / `Component#N`.
- If the import shows generic names, settle which COLLADA carrier SketchUp actually reads (`geometry@name`, `library_nodes` `node@id`/`@name`, or `visual_scene` `node@name`), then reconcile `build-dae.js` to that single carrier and delete the contradictory comment block at lines 74-79.
- Product owner confirms the intended name basis is the common essence name + piece type + sequence number (FR-012), and that the scientific name is intentionally excluded.
</content>
</invoke>
