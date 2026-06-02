# Feature Specification: Onglet « Analyse » (jauges de seuils, radar, dimensions)

**Feature Branch**: `009-editor-analysis-charts`
**Created**: 2026-06-01
**Status**: Draft (description du comportement existant)
**Input**: Description de l'onglet « Analyse » de l'éditeur — jauges de seuils (thresholds), graphique radar et nuage des dimensions des pièces

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lire le profil de valeur d'un lot via les jauges « Seuils » (Priority: P1)

Un diagnostiqueur ouvre l'onglet « Analyse ». Pour le lot en cours, il consulte cinq jauges « Seuils » (thresholds), une par axe de valeur — Économique (economic), Écologique (ecological), Mécanique (mechanical), Historique (historical), Esthétique (aesthetic). Chaque jauge montre le score de l'axe, son étendue (du plus faible au plus élevé) et la répartition des notes par lettre A à E. Une jauge supplémentaire « Confiance » (confidence) résume la fiabilité globale de la notation.

**Why this priority**: C'est la lecture principale de l'analyse ; les jauges traduisent les notes saisies en un profil chiffré, immédiatement lisible axe par axe.

**Independent Test**: Saisir des notes sur un lot, ouvrir l'onglet « Analyse » et vérifier que chaque jauge affiche le score de l'axe, ses bornes basse et haute, et le décompte des notes par lettre.

**Acceptance Scenarios**:
1. **Given** un lot avec des notes saisies sur l'axe Mécanique, **When** l'onglet « Analyse » s'affiche, **Then** la jauge Mécanique pointe sur le score de l'axe et indique le nombre de notes par lettre (combien de A, de B, etc.).
2. **Given** un axe sans aucune note, **When** la jauge s'affiche, **Then** elle montre un repère vide (« … ») au lieu d'un chiffre.
3. **Given** un axe dont certains critères actifs ne sont pas encore notés, **When** la jauge s'affiche, **Then** elle signale le nombre de critères manquants.
4. **Given** plusieurs lots, **When** le diagnostiqueur choisit un autre lot dans le sélecteur, **Then** les jauges se recalculent pour le lot choisi.

### User Story 2 - Visualiser le radar des cinq axes de valeur (Priority: P1)

Le diagnostiqueur consulte un graphique radar à cinq branches, une par axe de valeur. Le radar superpose trois tracés : le score net du lot, la part positive et la part négative de la notation. Le tracé du score net prend la couleur de l'orientation calculée du lot. Des repères délimitent la zone neutre (le « zéro ») et la valeur maximale. Au survol d'une branche, un encart détaille le score net, les parts positive et négative, la répartition des lettres et les éventuels verrous (gates) actifs sur cet axe.

**Why this priority**: Le radar est la vue d'ensemble du profil multi-axes ; il porte la couleur d'orientation et relie ainsi l'analyse à la décision de valorisation.

**Independent Test**: Sur un lot noté, vérifier que le radar affiche cinq branches et trois tracés, que la couleur du tracé net correspond à l'orientation du lot, et que le survol d'une branche ouvre l'encart de détail.

**Acceptance Scenarios**:
1. **Given** un lot orienté « Réemploi » (réemploi/réutilisation/recyclage/combustion), **When** le radar s'affiche, **Then** le tracé « Score net » est vert et rempli en transparence.
2. **Given** un axe portant un critère verrou noté au minimum, **When** le diagnostiqueur survole la branche de cet axe, **Then** l'encart affiche un bloc « Verrou(s) actif(s) » listant les critères concernés.
3. **Given** aucun critère renseigné, **When** le radar s'affiche, **Then** un texte de synthèse indique « Aucun critère renseigné. ».

### User Story 3 - Inspecter la distribution des dimensions des pièces (Priority: P2)

Le diagnostiqueur consulte un nuage de points où chaque point regroupe les pièces du lot qui partagent les mêmes dimensions : la position horizontale donne la longueur (mm), la position verticale donne la section (mm²). La forme du marqueur reflète la section (rectangulaire ou circulaire) et sa taille la grandeur de la section. Au survol, un encart détaille le type de pièce, l'essence, les dimensions, le volume unitaire, la masse et le prix. Le clic sur un point met en avant le groupe voisin ; un bouton réinitialise la vue.

**Why this priority**: Aide à percevoir l'hétérogénéité dimensionnelle d'un lot ; vue secondaire par rapport à la décision d'orientation.

**Independent Test**: Saisir longueur et section pour des pièces, ouvrir l'onglet et vérifier que les points se placent selon longueur (horizontal) et section (vertical) ; sans dimensions, vérifier l'affichage du message d'invitation à les renseigner.

**Acceptance Scenarios**:
1. **Given** des pièces avec longueur et section renseignées, **When** le nuage s'affiche, **Then** chaque groupe de dimensions identiques apparaît comme un point unique, dont la taille dépend de la section.
2. **Given** aucune dimension renseignée (longueur ou section nulle), **When** l'onglet s'affiche, **Then** le nuage est masqué et un message invite à renseigner les dimensions.
3. **Given** une pièce à section circulaire, **When** le point s'affiche, **Then** son marqueur a la forme d'un disque.

### Edge Cases

- **Aucun lot en cours** : les trois vues (jauges, radar, nuage) ne s'affichent pas ; le nuage masque en plus sa section.
- **Charts indisponibles hors connexion** : le radar et le nuage s'appuient sur une bibliothèque de graphiques chargée en ligne. Sans connexion internet, les graphiques ne se dessinent pas ; l'onglet reste néanmoins consultable (le reste de l'analyse demeure visible).
- **Notation partielle** : si moins de 40 % des critères sont notés, le radar signale « Notation partielle. Profil provisoire. ».
- **Axe en alerte** : un axe noté dont le score reste à zéro ou en dessous est signalé comme étant en alerte.
- **Section équivalente (mesures multiples)** : pour une pièce dont les dimensions varient sur sa longueur, la section retenue est une section équivalente, calculée à partir du volume réel de la pièce.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: À l'ouverture de l'onglet « Analyse », le système DOIT afficher successivement les jauges de seuils, le radar puis le nuage des dimensions, sans interrompre l'onglet si l'un d'eux ne peut s'afficher.
- **FR-002**: Le système DOIT afficher cinq jauges « Seuils », une par axe de valeur : Économique, Écologique, Mécanique, Historique, Esthétique.
- **FR-003**: Les cinq jauges DOIVENT partager une même échelle, alignée sur l'axe le plus étendu, avec un repère « zéro » commun.
- **FR-004**: Chaque jauge DOIT colorer les notes par lettre selon leur poids : les lettres positives (A à C) à droite du zéro en teintes vertes, les lettres négatives (D, E) à gauche en orange et rouge.
- **FR-005**: Chaque jauge DOIT afficher le décompte des notes par lettre (combien de A, de B, etc.) et, si des critères actifs de l'axe ne sont pas notés, le nombre de critères manquants.
- **FR-006**: Le repère de la jauge DOIT se placer sur le score net de l'axe et afficher ce score signé si l'axe est noté, sinon « … ».
- **FR-007**: En tête de section, le système DOIT afficher un résumé de « Confiance » : une jauge de fiabilité avec son score, son pourcentage, son niveau et un détail dépliable par rubrique.
- **FR-008**: Le radar DOIT comporter cinq branches (les cinq axes de valeur) et trois tracés : la part négative, la part positive et le score net.
- **FR-009**: Les valeurs du radar DOIVENT utiliser la même échelle unifiée que les jauges de seuils (centre = minimum commun, bord = maximum commun).
- **FR-010**: La couleur du tracé du score net DOIT correspondre à l'orientation du lot : Réemploi en vert, Réutilisation en bleu, Recyclage en orange, Combustion en rouge, et gris si aucune orientation.
- **FR-011**: Le radar DOIT matérialiser le contour de la valeur maximale, la zone négative (entre le centre et le zéro) et l'anneau du zéro.
- **FR-012**: Au survol d'une branche, le radar DOIT afficher un encart détaillant : le score net signé, la part positive, la part négative, le décompte des lettres avec leurs points, et les verrous actifs (critères au score minimal) avec leur libellé.
- **FR-013**: Le radar DOIT afficher une synthèse textuelle adaptée au cas : aucune notation, notation partielle, verrou actif, ou profil faible / moyen / élevé selon la moyenne.
- **FR-014**: Sous le radar, le système DOIT afficher une barre situant le lot sur l'échelle d'orientation.
- **FR-015**: Le nuage des dimensions DOIT regrouper toutes les pièces (y compris les pièces par défaut) partageant les mêmes dimensions, et placer un point par groupe selon la longueur (horizontal) et la section (vertical).
- **FR-016**: Les axes du nuage DOIVENT être libellés « Longueur (mm) » (horizontal) et « Section (mm²) » (vertical), avec une marge au-delà des valeurs maximales rencontrées.
- **FR-017**: Le nuage NE DOIT afficher de données que si au moins une longueur et une section non nulles existent ; sinon il masque le graphique et affiche un message invitant à renseigner les dimensions.
- **FR-018**: Le marqueur d'un point DOIT refléter la forme de la section (disque pour une section circulaire, rectangle pour une section rectangulaire), dimensionné selon la grandeur de la section.
- **FR-019**: Le clic sur un point DOIT mettre en avant le groupe voisin et écarter visuellement ses membres ; l'état de la vue (zoom et mise en avant) DOIT être mémorisé par lot ; un bouton réinitialise la vue.
- **FR-020**: Chacune des trois vues (jauges, radar, nuage) DOIT proposer son propre sélecteur de lot d'analyse.

### Key Entities *(include if data)*

- **Axe de valeur**: l'un des cinq axes — Économique, Écologique, Mécanique, Historique, Esthétique.
- **Score d'axe**: score net, score affiché, étendue (borne basse / borne haute) et répartition des notes par lettre (décompte et points par lettre A à E).
- **Résultat d'orientation**: orientation du lot, son libellé et son état (confirmée, combustion à confirmer, rejets et vecteurs actifs) ; sert à colorer le tracé du radar.
- **Groupe de dimensions (point du nuage)**: longueur, section, largeur, épaisseur, diamètre, forme de section, nombre de pièces, types de pièces, essences, masses et prix.
- **Confiance**: score de fiabilité de la notation, son maximum et son niveau.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pour un lot noté, les cinq jauges « Seuils » et le résumé « Confiance » s'affichent avec un score chiffré sur chaque axe noté.
- **SC-002**: Le radar affiche exactement cinq branches et trois tracés, le tracé net reprenant la couleur d'orientation du lot.
- **SC-003**: L'encart de détail du radar apparaît au survol d'une branche et disparaît en dehors.
- **SC-004**: Le nuage affiche un point par combinaison de dimensions distinctes ; sans dimensions, le message d'invitation remplace le graphique.
- **SC-005**: Le changement de lot via les sélecteurs d'analyse recalcule les trois vues.

## Assumptions

- Les graphiques radar et nuage s'appuient sur une bibliothèque de graphiques chargée en ligne ; ils nécessitent donc une connexion internet pour s'afficher.
- Les notes, étendues, répartitions de lettres, critères actifs et dimensions des pièces sont disponibles pour le lot en cours.
- Les libellés et couleurs des axes sont fixés dans l'application.

## Source Files

- `js/app/editor-tab-analyse.js`
- `js/app/valobois-app.js`
- `index.html`
- `js/app/valobois-constants.js`

## Open Questions

- Les graphiques radar et nuage nécessitent une connexion internet pour s'afficher ; hors connexion, ils restent vides. Comportement à confirmer comme acceptable pour un usage terrain.
- Le titre interne de la section « Seuils » évoque encore « Synthèse » alors que la section vit dans l'onglet « Analyse » ; vraisemblablement un reste d'une organisation antérieure.
- Le comportement exact de l'échelle latérale du nuage (légende d'épaisseur) reste à confirmer.
- Les libellés des axes (jauges et radar) sont en français et figés ; la cohérence voulue avec le reste de l'application n'est pas confirmée.
