# Feature Specification: Onglet « Matrice vecteurs rejets »

**Feature Branch**: `011-editor-rejection-matrix`
**Created**: 2026-06-01
**Status**: Draft (description du comportement existant)
**Input**: Description de l'onglet « Matrice vecteurs rejets » de l'éditeur — table reliant les critères de notation aux adéquations (vecteurs) et exclusions (rejets) par orientation, seuils et personnalisation

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consulter la matrice des critères, vecteurs et rejets (Priority: P1)

Le diagnostiqueur ouvre l'onglet « Matrice » (la « Matrice Valoxylo »). Un tableau liste les 50 critères de notation de référence, classés par rang. Pour chaque critère, il voit : son axe de valeur (Économique, Écologique, Mécanique, Historique, Esthétique), sa famille, ses notes Fort / Moyen / Faible (score et lettre A à E), s'il porte un verrou (gate) et/ou une alerte, puis, pour chacune des quatre orientations (Réemploi, Réutilisation, Recyclage, Combustion), les niveaux qui agissent comme **vecteurs** (favorisent l'orientation) et comme **rejets** (l'excluent).

**Why this priority**: La matrice est la source de référence reliant chaque critère noté à ses effets sur l'orientation ; c'est la table de fond de tout le calcul.

**Independent Test**: Ouvrir l'onglet et vérifier que le tableau présente les en-têtes « Note forte / moyenne / faible », « Vecteurs » et « Rejets », avec les 50 critères par défaut (compteur « 50 / 50 critères affichés »).

**Acceptance Scenarios**:
1. **Given** le jeu de critères de référence, **When** la matrice s'affiche, **Then** chaque ligne montre le rang, le critère, son axe, sa famille et ses scores Fort / Moyen / Faible (score et lettre).
2. **Given** un critère portant un verrou par défaut, **When** la ligne s'affiche, **Then** la colonne « Verrou » indique « Verrou » (ou « Verrou désactivé »).
3. **Given** un critère avec alerte, **When** la ligne s'affiche, **Then** la colonne « Alerte » propose un bouton « Alerte » ouvrant un détail.
4. **Given** les colonnes Vecteurs et Rejets activées, **When** la ligne s'affiche, **Then** chaque orientation montre des cases Fort / Moyen / Faible reflétant les niveaux concernés (ex. « Forte à faible » coche Fort, Moyen et Faible).

### User Story 2 - Filtrer et rechercher dans la matrice (Priority: P2)

Le diagnostiqueur restreint l'affichage : tri par axe de valeur, tri par famille, recherche sur le nom du critère, et cases « Verrous », « Vecteurs », « Rejets ». Un bouton réinitialise les filtres.

**Why this priority**: Confort de lecture sur une matrice de 50 critères et de nombreuses colonnes, mais non bloquant pour la compréhension.

**Independent Test**: Saisir un terme de recherche et vérifier que le compteur « n / 50 critères affichés » et les lignes se mettent à jour.

**Acceptance Scenarios**:
1. **Given** un filtre sur l'axe « Mécanique », **When** il est appliqué, **Then** seules les lignes de l'axe Mécanique restent affichées.
2. **Given** la case « Verrous » cochée, **When** elle est appliquée, **Then** seules les lignes portant un verrou restent affichées.
3. **Given** la case « Vecteurs » décochée, **When** elle est appliquée, **Then** les quatre colonnes Vecteurs disparaissent du tableau.

### User Story 3 - Personnaliser la matrice (Priority: P3)

En activant « Personnaliser la matrice », le diagnostiqueur peut : modifier des scores, ajuster les niveaux vecteurs et rejets, activer ou désactiver des verrous par défaut, ajouter des critères libres ou dupliquer un critère existant, exporter et importer une configuration, et tout réinitialiser. Un badge « Configuration personnalisée active » signale une configuration non standard.

**Why this priority**: Fonction avancée d'adaptation ; rare et réservée aux utilisateurs experts.

**Independent Test**: Activer « Personnaliser la matrice » et vérifier que les contrôles d'édition (export/import, ajout et duplication de critère, réglage des scores) deviennent actifs.

**Acceptance Scenarios**:
1. **Given** un score de critère modifié, **When** la ligne s'affiche, **Then** un badge « Modifié » apparaît sur le critère.
2. **Given** un critère personnalisé ajouté, **When** la ligne s'affiche, **Then** un badge « Personnalisé » apparaît et le badge global « Configuration personnalisée active » est visible.
3. **Given** le mode personnalisation désactivé, **When** la matrice s'affiche, **Then** les boutons d'export, d'import, d'ajout et de duplication sont inactifs.

### Edge Cases

- **Aucune donnée** : si le jeu de critères est vide, le tableau affiche « Matrice indisponible : aucune donnée embarquée. » et les contrôles et seuils sont vidés.
- **Aucun résultat de filtre** : si aucun critère ne correspond, le tableau affiche « Aucun critère ne correspond aux filtres. ».
- **Aucun critère libre** : l'éditeur de critères libres affiche « Aucun critère libre — créez-en un ci-dessus ».
- **Verrou matériel (critère « Démontabilité »)** : pour ce critère, le niveau « Faible » des vecteurs et rejets de Réemploi et de Réutilisation est forcé décoché et non modifiable.
- **Cases « Rejets »** : les cases « Rejets » cochées sont verrouillées visuellement et n'affichent pas la coche, contrairement aux vecteurs.
- **Critères libres** : les critères ajoutés librement prennent un rang à partir de 51.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: À l'ouverture de l'onglet « Matrice », le système DOIT afficher la matrice.
- **FR-002**: Le système DOIT afficher les contrôles de filtre, la barre de seuils et le tableau, et afficher le badge « Configuration personnalisée active » lorsqu'une configuration non standard est en place.
- **FR-003**: La matrice DOIT être construite à partir du jeu de critères de référence, qui fournit pour chaque critère : son rang, sa famille, son critère, son axe, sa criticité, son alerte, ses scores (Fort / Moyen / Faible avec valeur et lettre), et ses vecteurs et rejets par orientation.
- **FR-004**: Chaque bloc vecteur ou rejet par orientation DOIT exprimer une plage de niveaux (ex. « Forte à faible », plage « A à E »).
- **FR-005**: Le tableau DOIT comporter les colonnes : Classement (rang), Critère, Valeurs (axe), Catégorie (famille), Notation, Verrou, Alerte, scores Fort / Moyen / Faible (score et lettre), puis quatre colonnes Vecteurs (une par orientation) et quatre colonnes Rejets si elles sont activées.
- **FR-006**: Les orientations DOIVENT être Réemploi (vert), Réutilisation (bleu), Recyclage (orange) et Combustion (rouge).
- **FR-007**: Pour chaque orientation, le système DOIT déduire les niveaux Fort / Moyen / Faible concernés à partir des termes de la matrice (« X à Y » = plage inclusive, « ou » ou mention unique = niveaux explicites), modifiables en personnalisation.
- **FR-008**: Les cellules de score DOIVENT être différenciées visuellement selon leur valeur (verrou, négatif, positif, neutre) et selon leur lettre.
- **FR-009**: Les filtres DOIVENT inclure : axe de valeur, famille, recherche sur le nom du critère, verrous uniquement, et bascules d'affichage des colonnes Vecteurs et Rejets.
- **FR-010**: Le tableau DOIT afficher un compteur « <affichés> / <total> critères affichés ».
- **FR-011**: La barre de seuils DOIT proposer un bouton « Personnaliser la matrice » qui active le mode personnalisation ; hors de ce mode, les actions d'édition sont inactives.
- **FR-012**: Les seuils d'orientation DOIVENT être modifiables par mode de notation et par orientation (Recyclage, Réutilisation, Réemploi), sur une échelle de 0 à 30 avec affichage en /30 et en pourcentage, et conservés dans la configuration.
- **FR-013**: Le mode personnalisation DOIT permettre : ajouter un critère personnalisé, dupliquer un critère existant, exporter et importer une configuration (avec une option pour remplacer les critères libres importés), et réinitialiser la configuration.
- **FR-014**: Un critère modifié DOIT afficher un badge « Modifié » ; un critère libre, un badge « Personnalisé ».
- **FR-015**: Le critère « Démontabilité » DOIT forcer décoché et non modifiable le niveau « Faible » de ses vecteurs et rejets de Réemploi et de Réutilisation.
- **FR-016**: Les cellules « Notation » et « Alerte » disposant d'une fiche DOIVENT proposer un bouton ouvrant le détail du critère.

### Key Entities *(include if data)*

- **Critère de matrice**: rang, famille, critère, axe de valeur, criticité, alerte, scores (Fort / Moyen / Faible avec valeur et lettre), et vecteurs et rejets par orientation.
- **Bloc de niveaux (vecteur ou rejet)**: les termes décrits, les niveaux concernés et la plage de lettres (ex. termes « Forte à faible », plage « A à E »).
- **Orientation**: Réemploi, Réutilisation, Recyclage, Combustion (libellés et couleurs ci-dessus).
- **Niveau de notation**: Fort (note la plus haute), Moyen, Faible (note la plus basse), chacun avec sa valeur et sa lettre A à E.
- **Configuration personnalisée**: seuils par mode et par orientation, poids des critères, niveaux vecteurs et rejets modifiés, critères libres, et verrous par défaut désactivés.
- **Seuils de référence**: lignes « Seuils » et « Confiance » du jeu de données, donnant les bornes globales par orientation (présentes dans le fichier source mais non reprises dans la liste des critères affichés).

### Functional decision logic (référence orientation)

- **FR-017** (rappel du calcul d'orientation): l'orientation d'un lot se déduit par cascade de rejets actifs : sans rejet Réemploi et avec un vecteur Recyclage présent, le lot va en Recyclage (ou en Combustion si un rejet Recyclage existe) ; sinon le Réemploi se dégrade en Réutilisation (rejet Réemploi), puis en Recyclage (rejet Réutilisation), puis en Combustion (rejet Recyclage). Un critère noté au minimum agit comme verrou (gate). *(Calcul détaillé documenté en 010.)*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: L'onglet affiche les 50 critères de référence avec leurs scores, verrous, alertes, vecteurs et rejets par orientation.
- **SC-002**: Les filtres (axe, famille, recherche, verrous) et les bascules Vecteurs / Rejets mettent à jour le tableau et le compteur.
- **SC-003**: L'activation de « Personnaliser la matrice » rend les contrôles d'édition actifs ; sa désactivation les rend inactifs.
- **SC-004**: Une modification de score ou un critère libre affiche les badges « Modifié » / « Personnalisé » et le badge global de configuration personnalisée.
- **SC-005**: En l'absence de données, le message « Matrice indisponible : aucune donnée embarquée. » s'affiche.

## Assumptions

- Le jeu de critères provient d'un fichier de référence embarqué dans l'application.
- Les colonnes de score correspondent à : Note Fort = score maximal, Note Moyen = score médian, Note Faible = score minimal ; les lettres valent A = 3, B = 2, C = 1, D = -3, E = -10.
- Les fonctions de support (normalisation de la configuration, niveaux effectifs, détail de critère, import/export, critères libres) sont disponibles dans l'application.

## Source Files

- `js/app/editor-tab-matrice.js`
- `js/data/valobois-matrice-vecteurs-rejets.js`
- `js/app/valobois-app.js`
- `index.html`

## Open Questions

- Le sous-titre annonce « Informations sur les critères… » : la matrice est-elle purement consultative, ou ses modifications influencent-elles directement le calcul d'orientation des lots ? Le couplage exact entre la personnalisation et le calcul reste à confirmer.
- Les bornes « Seuils » et « Confiance » du jeu de données ne sont pas reprises dans la liste des critères affichés ; elles semblent documentaires. Usage réel à confirmer.
- Le verrou matériel du critère « Démontabilité » (niveau Faible) est figé dans le code ; la justification métier n'est pas documentée.
- Les largeurs de colonnes de l'éditeur de critères libres sont des valeurs en pixels inhabituelles, probable reste d'un export de mise en page, à vérifier.
- La distinction visuelle entre vecteurs (avec coche) et rejets (sans coche, verrouillés) suggère que les rejets ne sont que partiellement modifiables ; le périmètre exact d'édition des rejets reste à confirmer.
