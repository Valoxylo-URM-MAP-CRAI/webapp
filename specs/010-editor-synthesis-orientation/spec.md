# Feature Specification: Onglet « Synthèse » (orientation des lots & évaluation de l'opération)

**Feature Branch**: `010-editor-synthesis-orientation`
**Created**: 2026-06-01
**Status**: Draft (description du comportement existant)
**Input**: Description de l'onglet « Synthèse » de l'éditeur — orientation par lot, barre de position des lots, évaluation de l'opération et bilan économique (monetary balance)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consulter l'orientation calculée de chaque lot (Priority: P1)

Dans l'onglet « Synthèse », le diagnostiqueur voit une carte « Orientation » contenant une bande de cartes, une par lot. Chaque carte indique l'orientation (orientation) recommandée du lot — Réemploi, Réutilisation, Recyclage ou Combustion — avec un code couleur dédié, ainsi que des informations d'allotissement et l'état de la décision (confirmée, provisoire, forcée, ou combustion à confirmer).

**Why this priority**: L'orientation par lot est le résultat central de l'évaluation ; elle conditionne toute la valorisation.

**Independent Test**: Évaluer un lot, ouvrir l'onglet « Synthèse » et vérifier que sa carte affiche le bon libellé d'orientation et la couleur correspondante.

**Acceptance Scenarios**:
1. **Given** un lot orienté « Réemploi », **When** la carte s'affiche, **Then** elle prend la couleur du Réemploi.
2. **Given** un lot non encore noté, **When** la carte s'affiche, **Then** le libellé affiché est « … » et la carte reste en couleur neutre.
3. **Given** le lot en cours d'édition, **When** les cartes s'affichent, **Then** la carte de ce lot est mise en avant comme active.

### User Story 2 - Comparer la position des lots sur l'échelle d'orientation (Priority: P2)

Le diagnostiqueur consulte la carte « Positions des lots » : une barre à quatre couloirs (Réemploi, Réutilisation, Recyclage, Combustion) où chaque lot évalué apparaît comme une pastille numérotée, placée selon son score net. Au survol, un encart détaille le score net, les parts positive et négative, la répartition des lettres (A à E plus les critères non notés), la répartition des verrous par orientation, le nombre de pièces, le volume, le prix et les types de pièces.

**Why this priority**: Vue comparative entre lots, utile à l'arbitrage, mais secondaire par rapport à l'orientation individuelle.

**Independent Test**: Avec au moins deux lots notés, vérifier que la barre montre les quatre couloirs et une pastille par lot, et que le survol ouvre un encart.

**Acceptance Scenarios**:
1. **Given** aucun lot, **When** la barre s'affiche, **Then** elle indique « Aucun lot disponible. ».
2. **Given** des lots sans score exploitable, **When** la barre s'affiche, **Then** elle indique « Aucun score exploitable pour positionner les lots. ».
3. **Given** un lot orienté Recyclage, **When** la barre s'affiche, **Then** sa pastille apparaît dans le couloir « Recyclage », à la position de son score.

### User Story 3 - Lire l'évaluation et le bilan économique de l'opération (Priority: P1)

Le diagnostiqueur consulte la carte « Évaluation de l'opération » qui agrège tous les lots en cinq colonnes : volume réemployable, réutilisable, recyclable, incinérable, et Circularité (circularity). Chaque colonne affiche le volume (m³), le prix (€), la part (%) et la liste des lots concernés. La colonne Circularité affiche le volume circulaire, le bilan économique (monetary balance) et le taux de circularité (%). Une jauge montre la répartition des orientations par volume.

**Why this priority**: Synthèse économique et environnementale de l'opération entière ; livrable clé de l'étude.

**Independent Test**: Renseigner volume et prix d'allotissement sur des lots orientés et vérifier les volumes, prix, parts, le bilan économique et la circularité.

**Acceptance Scenarios**:
1. **Given** un lot « Réemploi » de volume V et de prix P, **When** l'évaluation se calcule, **Then** V s'ajoute au volume réemployable, P au prix réemployable et P au bilan économique.
2. **Given** un lot « Combustion » de prix P, **When** l'évaluation se calcule, **Then** le prix P est **soustrait** du bilan économique et le volume du lot est compté en incinérable.
3. **Given** des lots évalués, **When** l'évaluation s'affiche, **Then** le taux de circularité vaut (volume réemployable + volume réutilisable) rapporté au volume total, et la colonne Circularité agrège le réemploi et la réutilisation.

### Edge Cases

- **Aucun lot** : la carte « Orientation » est masquée ; l'évaluation ne calcule rien ; la barre de positions affiche « Aucun lot disponible. ».
- **Lots sans volume ni prix** : les valeurs manquantes comptent comme zéro ; les parts et la circularité sont nulles si le volume total est nul.
- **Orientation par libellé** : l'évaluation classe les lots selon le libellé d'orientation exact (« Réemploi », « Réutilisation », « Recyclage », « Combustion ») ; un lot dont le libellé n'est pas reconnu n'entre dans aucune colonne, mais son volume compte tout de même dans le volume total.
- **Combustion = orientation pénalisante** : c'est la seule orientation qui diminue le bilan économique et qui n'entre pas dans la circularité.
- **Onglet sans rendu propre** : l'onglet « Synthèse » ne déclenche pas lui-même son affichage ; celui-ci est piloté par le rendu général de l'éditeur — voir Open Questions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: L'onglet « Synthèse » DOIT contenir trois sections : « Orientation », « Positions des lots » et « Évaluation de l'opération ».
- **FR-002**: Le système DOIT afficher une carte par lot dans la section « Orientation », chacune colorée selon son orientation (Réemploi, Réutilisation, Recyclage, Combustion, ou neutre).
- **FR-003**: La carte du lot en cours d'édition DOIT être mise en avant comme active.
- **FR-004**: La barre de positions DOIT présenter quatre couloirs ordonnés Réemploi, Réutilisation, Recyclage, Combustion, chacun avec sa couleur dédiée.
- **FR-005**: La barre DOIT placer chaque lot exploitable à la position de son score (net si une part négative existe, sinon positif), dans le couloir de son orientation.
- **FR-006**: Chaque pastille de lot DOIT proposer un encart détaillant : score net, parts positive et négative, répartition des lettres (A à E et critères non notés), répartition des verrous par orientation, nombre de pièces, volume, prix et types de pièces.
- **FR-007**: La barre DOIT afficher des repères d'échelle : minimum, seuil de verrou (gate), zéro et maximum, recalculés selon le mode de notation.
- **FR-008**: L'évaluation DOIT agréger tous les lots en cinq groupes : réemployable, réutilisable, recyclable, incinérable, et Circularité.
- **FR-009**: Pour chaque lot, l'évaluation DOIT lire le volume et le prix d'allotissement (zéro à défaut) et les router selon le libellé d'orientation du lot.
- **FR-010**: Le bilan économique DOIT additionner les prix des lots non-Combustion et **soustraire** les prix des lots Combustion.
- **FR-011**: La circularité DOIT valoir (volume réemployable + volume réutilisable) rapporté au volume total, soit zéro si le volume total est nul.
- **FR-012**: Chaque colonne DOIT afficher volume (m³), prix (€), part (% du volume total) et la liste des lots concernés.
- **FR-013**: Les montants DOIVENT être formatés en euros et les volumes en m³, selon la locale de l'application.
- **FR-014**: La carte d'évaluation DOIT afficher une jauge « Répartition de l'orientation en volume » avec sa légende.
- **FR-015**: L'affichage de la synthèse (orientation, évaluation, barre de positions) DOIT être déclenché par le rendu général de l'éditeur, et non par l'onglet « Synthèse » lui-même.

### Key Entities *(include if data)*

- **Lot (orientation)**: libellé d'orientation (Réemploi / Réutilisation / Recyclage / Combustion), code d'orientation, volume et prix d'allotissement, types de pièces.
- **Résultat d'orientation**: orientation, libellé, état (confirmée, combustion à confirmer) et état d'affichage (forcée, en cours, combustion à confirmer).
- **Données de position**: présence d'un score, décomposition (part positive, part négative, score net), orientation courante, décompte des lettres, critères non notés, répartition des rejets par orientation.
- **Évaluation de l'opération (agrégats)**: volumes et prix par orientation, volume total, bilan économique, taux de circularité, volume circulaire, et listes de lots par orientation.
- **Bornes d'orientation**: bornes basse et haute de l'échelle, seuil minimal du Réemploi, seuil de verrou.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Chaque lot apparaît comme une carte d'orientation colorée correspondant à son orientation.
- **SC-002**: La barre « Positions des lots » place une pastille numérotée par lot exploitable dans le bon couloir, avec encart au survol.
- **SC-003**: Le bilan économique reflète la somme des prix des lots valorisables, diminuée des prix des lots Combustion.
- **SC-004**: Le taux de circularité et les parts par orientation se mettent à jour quand le volume, le prix ou l'orientation changent.
- **SC-005**: Les états vides (aucun lot, aucun score) affichent les messages dédiés sans erreur.

## Assumptions

- Le classement des lots repose sur des libellés d'orientation français exacts (« Réemploi », etc.), renseignés en amont par le calcul d'orientation.
- Les données de position, les bornes d'orientation, la quantité par lot, les pièces par défaut et la locale sont disponibles dans l'application.
- Les quatre orientations métier sont Réemploi, Réutilisation, Recyclage et Combustion (= incinération) ; la Circularité est un agrégat (réemploi + réutilisation), pas une orientation.

## Source Files

- `js/app/editor-tab-synthese.js`
- `js/app/valobois-app.js`
- `index.html`
- `js/app/valobois-constants.js`

## Open Questions

- L'onglet « Synthèse » ne déclenche pas lui-même son affichage ; celui-ci est piloté ailleurs par le rendu de l'éditeur. La frontière exacte « qui rafraîchit la synthèse à l'ouverture de l'onglet » reste à confirmer.
- Le classement repose sur une comparaison exacte du libellé d'orientation ; un lot dont le libellé diffère (casse ou accents) serait omis des colonnes. Robustesse à confirmer.
- Le détail de la jauge de répartition par volume reste à confirmer au-delà des chiffres affichés.
- Le bilan compte le prix d'un lot Combustion comme un coût (valeur négative) ; la signification métier exacte (coût d'élimination ou valeur) n'est pas documentée.
