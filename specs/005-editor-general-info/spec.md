# Feature Specification: Onglet « Général » de l'éditeur

**Feature Branch**: `005-editor-general-info`
**Created**: 2026-06-01
**Status**: Draft (as-built documentation)
**Input**: Description de l'onglet « Informations générales » de l'éditeur : identité de l'opération et des intervenants, contexte du bâtiment, statut et version de l'étude

## User Scenarios & Testing *(mandatory)*

L'onglet « Informations générales » (Général) est le premier onglet de l'éditeur. C'est là que le diagnostiqueur (diagnostician) saisit tout ce qui décrit l'opération (opération) : son nom, sa date, le statut et la version de l'étude, les coordonnées du diagnostiqueur, les intervenants du projet (maîtrise d'ouvrage, maîtrise d'œuvre, entreprise de déconstruction) et le contexte technique du bâtiment (type de bâtiment, période de construction, phase d'intervention, opérations passées, diagnostics disponibles, documents, conditionnement et protection, ainsi que la localisation géographique décrite dans la fiche `006-geo-france-context`).

Toutes les informations saisies sont enregistrées automatiquement au fil de la frappe.

### User Story 1 - Identifier l'opération : nom, version et statut de l'étude (Priority: P1)

Le diagnostiqueur ouvre une nouvelle évaluation et renseigne le nom de l'opération, la date du diagnostic, la version de l'évaluation et le statut de l'étude, afin que l'évaluation soit identifiée et que son avancement soit consigné.

**Why this priority**: Sans nom d'opération ni statut d'étude, l'évaluation ne peut être identifiée ni suivie correctement. Le statut de l'étude conditionne aussi, ailleurs dans l'application, les alertes de fiabilité et les règles de suppression.

**Independent Test**: Ouvrir l'onglet Général, saisir un nom d'opération et choisir une date, puis vérifier que la « Référence gisement » (en lecture seule) se met à jour et que la valeur est conservée après rechargement.

**Acceptance Scenarios**:

1. **Given** une évaluation vide, **When** l'utilisateur saisit « Halle Bois » comme opération et fixe la date au 01/05/2026, **Then** la « Référence gisement » (champ en lecture seule) affiche une référence dérivée du nom et de la date (le nom mis en majuscules et sans accents, la date sans séparateurs).
2. **Given** un nom d'opération vide, **When** la référence est calculée, **Then** elle retombe sur une valeur par défaut signalant l'absence de nom et de date.
3. **Given** le curseur de statut d'étude (un curseur à 5 positions), **When** l'utilisateur le déplace, **Then** le statut enregistré prend l'une des valeurs ordonnées « Pré-diagnostic », « En cours », « Finalisé », « Révision », « Clôturé », la position correspondante du curseur est mise en évidence, et un texte d'aide propre à cette position s'affiche.
4. **Given** le champ libre « Version de l'évaluation » (exemple proposé : « V1, V2, Pré-diagnostic »), **When** l'utilisateur saisit un libellé, **Then** il est conservé tel quel, sans contrôle de format (texte libre).

### User Story 2 - Renseigner le diagnostiqueur et le bloc PEMD (Priority: P1)

Le diagnostiqueur renseigne son identité et ses coordonnées, ainsi que le bloc « diagnostiqueur PEMD » du CERFA (SIRET, compagnie et numéro de police d'assurance, dates de validité de l'assurance, compétences justifiables) et le bloc « visite PEMD ».

**Why this priority**: Ces informations alimentent les exports réglementaires CERFA PEMD et le récapitulatif PDF ; un bloc incomplet déclenche un badge d'alerte.

**Independent Test**: Renseigner le nom, le contact, le courriel, le téléphone et l'adresse du diagnostiqueur, puis vérifier que le badge d'alerte « incomplet » disparaît.

**Acceptance Scenarios**:

1. **Given** le bloc diagnostiqueur, **When** le nom, le contact, le courriel, le téléphone et l'adresse sont renseignés, **Then** les valeurs sont conservées et le badge d'alerte « incomplet » du bloc s'efface.
2. **Given** une ancienne évaluation où le contact était stocké sous un autre nom (« opérateur »), **When** elle est rouverte, **Then** le contact du diagnostiqueur est repris automatiquement à partir de cette ancienne valeur.
3. **Given** les champs du bloc PEMD (identité, coordonnées, SIRET, assurance, dates de validité, compétences justifiables), **When** ils sont renseignés, **Then** ils sont conservés et alimentent les exports CERFA et PDF.

### User Story 3 - Renseigner les intervenants et le contexte technique (Priority: P2)

Le diagnostiqueur renseigne les coordonnées de la maîtrise d'ouvrage, de la maîtrise d'œuvre et de l'entreprise de déconstruction, ainsi que le contexte technique du bâtiment : type de bâtiment, période de construction, date / permis de construire, phase d'intervention, opérations passées (choix Oui / Non / Inconnu), diagnostics disponibles, documents (DOE, plans).

**Why this priority**: Contexte utile au diagnostic, mais l'évaluation peut se poursuivre sans ces informations.

**Independent Test**: Saisir un « Type de bâtiment » et vérifier que des suggestions sont proposées.

**Acceptance Scenarios**:

1. **Given** le champ « Type de bâtiment », **When** l'utilisateur le sélectionne, **Then** une liste de suggestions de types de bâtiment est proposée (la saisie libre reste possible).
2. **Given** le champ « Phase d'intervention », **When** l'utilisateur le sélectionne, **Then** une liste de phases d'intervention est proposée.
3. **Given** un groupe « Opérations passées » (par exemple une rénovation importante), **When** l'utilisateur choisit Oui / Non / Inconnu, **Then** le choix est conservé et reflété, la valeur par défaut étant « Inconnu ».

### Edge Cases

- La « Référence gisement » est toujours dérivée du nom d'opération et de la date ; elle est en lecture seule et ne peut pas être modifiée directement.
- Si le statut d'étude enregistré n'est pas reconnu, il est ramené à la première position (« Pré-diagnostic »).
- La version de l'évaluation (texte libre saisi par l'utilisateur) est distincte d'un numéro de révision interne qui s'incrémente automatiquement à chaque enregistrement et n'est pas saisi par l'utilisateur.
- Les listes de suggestions (type de bâtiment, phase d'intervention, conditionnement, protection, situations) sont pré-remplies au chargement mais laissent toujours la saisie libre.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système DOIT présenter l'onglet Général sous forme de sections repliables couvrant l'identité de l'opération, les contacts et le contexte technique.
- **FR-002**: Le système DOIT enregistrer chaque champ saisi dès qu'il change.
- **FR-003**: Le système DOIT calculer la « Référence gisement » en lecture seule à partir du nom de l'opération (mis en majuscules, sans accents, caractères non alphanumériques remplacés par un séparateur) et de la date (sans séparateurs), avec des valeurs par défaut lorsque le nom ou la date manquent.
- **FR-004**: Le système DOIT présenter le statut d'étude sous forme d'un curseur à 5 positions correspondant, dans l'ordre, à « Pré-diagnostic », « En cours », « Finalisé », « Révision », « Clôturé ».
- **FR-005**: Le système DOIT afficher un texte d'aide propre à chaque position du statut d'étude.
- **FR-006**: Le système DOIT fixer le statut par défaut à « Pré-diagnostic » pour une évaluation nouvelle ou vide.
- **FR-007**: Le système DOIT conserver la version de l'évaluation comme texte libre, sans contrôle de format.
- **FR-008**: Le système DOIT incrémenter automatiquement un numéro de révision interne à chaque enregistrement, indépendamment de la version saisie par l'utilisateur.
- **FR-009**: Le système DOIT reprendre le contact du diagnostiqueur à partir d'une ancienne valeur « opérateur » lorsqu'une évaluation antérieure est rouverte.
- **FR-010**: Le système DOIT afficher des badges d'alerte « section incomplète » pour les blocs identité de l'opération, diagnostiqueur, intervenants, contexte technique, diagnostiqueur PEMD et visite PEMD.
- **FR-011**: Le système DOIT pré-remplir au chargement les listes de suggestions (type de bâtiment, phase d'intervention, situations, conditionnement, protection) tout en laissant la saisie libre.
- **FR-012**: Le système DOIT proposer des choix Oui / Non / Inconnu pour les opérations passées (rénovation importante, décontamination, autre intervention), les diagnostics disponibles (structure, amiante, plomb, termites), les documents (DOE, plans), les compétences justifiables PEMD, les vices apparents, les précautions de démolition et le type d'opération, avec « Inconnu » par défaut le cas échéant.
- **FR-013**: Le système DOIT enregistrer toutes les modifications dans l'espace de stockage actif (local pour un usage invité, ou dans le cloud).

### Key Entities *(include if data)*

- **Informations de l'opération (méta)**: regroupent le nom de l'opération, la date, la version de l'évaluation, le statut d'étude, le numéro de révision (automatique), la localisation libre et la localisation géographique (voir `006`). Contacts : diagnostiqueur, maîtrise d'ouvrage, maîtrise d'œuvre, entreprise de déconstruction. Diagnostiqueur PEMD : identité, coordonnées, SIRET, assurance et dates de validité, compétences justifiables. Visite PEMD : date de visite, parties visitées / non visitées et motifs, vices apparents, précautions de démolition. Contexte technique : type de bâtiment, période de construction, date / permis de construire, phase d'intervention, conditionnement, protection, opérations passées, diagnostics, documents, type d'opération CERFA, surfaces et nombres de bâtiments (démolition / rénovation), dates de début et de fin de chantier.
- **Valeurs de statut d'étude**: liste ordonnée « Pré-diagnostic / En cours / Finalisé / Révision / Clôturé ».
- **Suggestions de type de bâtiment**: une trentaine de libellés français regroupés (habitation, tertiaire, industriel, agricole, logistique, patrimoine, « Autre »).
- **Suggestions de phase d'intervention**: Pré-diagnostic, Diagnostic in situ, Curage, Dépose sélective, Démontage, Tri sur site, Stockage temporaire.
- **Suggestions de situation de lot**: Toiture, Murs, Plancher, Revêtement intérieur / extérieur, Structure libre intérieur / extérieur, Conditionné (utilisées dans les lignes de lot / pièce, pas dans ce bloc).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Modifier n'importe quel champ de l'onglet Général puis recharger l'évaluation conserve la valeur.
- **SC-002**: Un nom d'opération non vide et une date produisent une référence de la forme « NOM_DATE » affichée dans le champ « Référence gisement ».
- **SC-003**: Déplacer le curseur de statut sur chacune des 5 positions enregistre le libellé français correspondant et affiche le texte d'aide associé.
- **SC-004**: Compléter tous les champs d'un bloc de contact efface le badge d'alerte de ce bloc.
- **SC-005**: Les champs avec suggestions (type de bâtiment, phase d'intervention, situations) proposent des choix dès le chargement.

## Assumptions

- L'onglet Général et le bloc « informations de l'opération » désignent le même ensemble de données.
- Les listes de suggestions de conditionnement et de protection proviennent de fichiers de données qui n'étaient pas inclus dans le périmètre relu.

## Source Files

- `js/app/editor-tab-general.js`
- `js/app/valobois-app.js`
- `index.html`
- `js/lib/datalist-populate.js`
- `js/data/datalist-type-batiment.js`
- `js/data/datalist-phase-intervention.js`
- `js/data/datalist-situations-lot.js`

## Open Questions

- Plusieurs champs de saisie semblent dupliquer, sous d'autres libellés, des champs français déjà actifs (assurance, dates de validité, opérations passées, documents, visite, etc.) et paraissent inutilisés : confirmer qu'aucun export ni aucune traduction ne s'en sert encore.
- Le lien entre la version de l'évaluation (texte libre, visible) et le numéro de révision interne (automatique, non affiché) n'est pas explicité dans l'interface : la distinction voulue (version pour l'utilisateur vs compteur d'enregistrements) reste à confirmer.
- Les valeurs proposées pour le conditionnement et la protection n'ont pas pu être documentées ici, leur source n'étant pas dans le périmètre relu.
- Un emplacement est prévu pour amener automatiquement le focus sur les informations de l'opération, mais cette fonction n'est pas encore réalisée : confirmer s'il s'agit d'une évolution prévue.
