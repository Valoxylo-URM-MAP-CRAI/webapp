# Feature Specification: Contexte géographique (département & canton en France)

**Feature Branch**: `006-geo-france-context`
**Created**: 2026-06-01
**Status**: Draft (as-built documentation)
**Input**: Description du contexte géographique : sélection d'un département et d'un canton français (carte interactive) qui renseigne la classe climatique d'humidification, le vent de pluie dominant et les vigilances termites et mérules

## User Scenarios & Testing *(mandatory)*

Dans l'onglet « Informations générales » de l'éditeur, un encadré « Localisation géographique » permet au diagnostiqueur de situer, de façon facultative, l'opération par **département** et par **canton**. Cette sélection complète la localisation libre (le champ « Adresse ») et renseigne automatiquement quatre informations en lecture seule :
1. **Condition climatique d'humidification** (classe climatique du bois) — selon la norme FD P 20-651, Annexe B : « Sèche » / « Modérée » / « Humide ».
2. **Vent de pluie dominant** (secteurs de vent de pluie dominant) — selon FD P 20-651, Annexe A, d'après la station météo de référence du département.
3. **Vigilance termites** (risque termites) — d'après les cartes d'aléa Cerema.
4. **Vigilance mérules** (risque mérule / pourriture sèche) — d'après les cartes d'aléa Cerema.

On peut faire la sélection de trois façons : avec les deux listes déroulantes (département puis canton), en cliquant un canton sur la carte, ou par détection automatique à partir de l'adresse saisie.

À noter : cet encadré reste en français même lorsque l'application est basculée en anglais (la liste des départements, le bouton « Détecter depuis « Adresse » », etc. restent en français).

### User Story 1 - Choisir un département puis un canton (Priority: P1)

Le diagnostiqueur choisit un département dans la liste, la liste des cantons et la carte se remplissent avec les cantons de ce département, puis il sélectionne un canton (par la liste ou en cliquant sur la carte).

**Why this priority**: Le canton détermine la classe climatique d'humidification (et le département détermine le vent, les termites et les mérules), qui alimentent ensuite l'évaluation de la durabilité du bois.

**Independent Test**: Choisir « Doubs » puis le canton « Besançon » et vérifier que le champ climat affiche « Modérée » (exception cantonale qui prime sur la valeur par défaut du département, « Humide »).

**Acceptance Scenarios**:

1. **Given** aucune sélection, **When** l'utilisateur choisit un département, **Then** le département est enregistré, toute sélection de canton antérieure est effacée, la carte revient à son cadrage initial, et la liste des cantons et la carte affichent les cantons du département, classés par nom (ordre français).
2. **Given** un département sélectionné, **When** l'utilisateur change de département, **Then** le canton est désélectionné et les suggestions sont réinitialisées.
3. **Given** un département sélectionné, **When** l'utilisateur choisit un canton dans la liste ou le sélectionne sur la carte (clic, appui tactile ou clavier), **Then** le canton est enregistré, le mode de sélection est noté (liste ou carte), le canton est mis en évidence sur la carte (les autres sont atténués) et le résumé est mis à jour.
4. **Given** un département et un canton résolus, **When** l'affichage se met à jour, **Then** le champ climat affiche la classe FD P 20-651 et les champs vent, termites et mérules se renseignent à partir du département.

### User Story 2 - Détection automatique à partir de l'adresse (Priority: P2)

Le diagnostiqueur a saisi une adresse contenant un code postal à 5 chiffres ; en cliquant sur « Détecter depuis « Adresse » », l'application retrouve la commune, le département et, lorsque c'est sans ambiguïté, le canton.

**Why this priority**: Confort qui évite une recherche manuelle, mais non indispensable ; les listes et la carte restent disponibles en repli.

**Independent Test**: Saisir « 75002 Paris » dans le champ adresse, cliquer sur Détecter, et vérifier que le département est fixé à 75 et qu'un message de statut apparaît.

**Acceptance Scenarios**:

1. **Given** une adresse avec un code postal, **When** Détecter est cliqué, **Then** l'application recherche les communes correspondant au code postal, retient la commune la plus probable (ressemblance du nom avec le texte saisi après le code postal, sinon la plus peuplée) et applique son département.
2. **Given** une commune qui correspond à un seul canton, **When** la détection s'exécute, **Then** ce canton est sélectionné automatiquement et un message de réussite s'affiche.
3. **Given** plusieurs cantons candidats (commune ambiguë, par exemple Nancy-1 / 2 / 3), **When** la détection s'exécute, **Then** aucun canton n'est imposé ; les correspondances sont proposées en tête de la liste des cantons sous « Cantons suggérés » et un message d'avertissement les énumère.
4. **Given** aucune correspondance par nom de commune, **When** la détection s'exécute, **Then** l'application tente de localiser l'adresse sur un point géographique pour retrouver le canton ; si cela échoue encore, seul le département est renseigné, avec un avertissement.
5. **Given** aucune adresse contenant un code postal à 5 chiffres, **When** l'utilisateur regarde l'encadré, **Then** le bouton Détecter est masqué.

### User Story 3 - Lire le climat, le vent, les termites et les mérules (Priority: P1)

Après une sélection, le diagnostiqueur lit les quatre informations en lecture seule et peut ouvrir la fenêtre « Sources » expliquant les normes employées.

**Why this priority**: Ces valeurs sont la raison d'être de l'encadré et sont reprises dans les récapitulatifs PDF et CERFA.

**Acceptance Scenarios**:

1. **Given** un département et un canton, **When** le climat est déterminé, **Then** le champ affiche « Sèche » / « Modérée » / « Humide » avec une infobulle indiquant s'il s'agit d'une « Exception cantonale (Annexe B) » ou de la « Règle départementale (Annexe B) ».
2. **Given** un département seul, **When** l'affichage se met à jour, **Then** le champ vent affiche les secteurs du département et la rose des vents met en évidence les secteurs actifs ; les champs termites et mérules affichent le statut du département ; le champ climat reste vide tant qu'un canton n'est pas aussi choisi.
3. **Given** un département sans donnée de vent, **When** l'affichage se met à jour, **Then** le champ vent indique « Non renseigné (Annexe A) ».
4. **Given** le bouton d'information, **When** il est cliqué, **Then** la fenêtre « Sources » s'ouvre et décrit les normes et jeux de données utilisés.
5. **Given** le bouton de réinitialisation, **When** il est cliqué, **Then** la sélection revient à son état par défaut et le message de détection est masqué.

### Edge Cases

- La correspondance des noms de canton ignore les accents, espaces et traits d'union, et accepte aussi qu'un nom soit le début de l'autre : des noms courts peuvent ainsi correspondre à tort (voir Open Questions).
- La table FD P 20-651 utilise des **noms de cantons d'avant la réforme de 2015**, alors que la géographie actuelle utilise les cantons d'après 2015 ; une table de correspondance relie les anciens noms aux nouveaux pour retrouver l'exception applicable. Un canton actuel peut correspondre à plusieurs anciens noms normatifs.
- Si le département sélectionné n'est pas trouvé dans la table climatique, le champ climat affiche « Non déterminée (département introuvable) ».
- La Corse apparaît sous les codes 2A / 2B et les noms Corse-du-Sud / Haute-Corse ; la liste des départements couvre la métropole et la Corse (les DOM figurent dans les données termites / mérules, mais leur présence dans la liste des départements et des cantons n'est pas confirmée).
- La sélection géographique est explicitement **facultative** ; l'adresse en texte libre reste la référence principale (le résumé l'indique tant que rien n'est sélectionné).
- La carte se déplace (glisser) et se zoome (+/−) ; un clic qui suit un déplacement est ignoré, pour qu'un déplacement ne sélectionne pas un canton par mégarde.
- Statuts termites : « O » = tout le département sous arrêté préfectoral ; « P » = partiel (arrêtés communaux) avec un conseil de vérification au niveau communal et un indicateur de proportion ; « N » = aucun. Statuts mérules : seulement « P » (partiel, communal) ou « N » (aucun) — il n'y a volontairement pas de « O » pour les mérules.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système DOIT présenter l'encadré géographique avec une liste de départements, une liste de cantons, quatre champs en lecture seule (climat, vent, termites, mérules), une ligne de résumé, une carte des cantons (déplaçable et zoomable), une rose des vents, et les boutons Détecter / Réinitialiser / Information.
- **FR-002**: Le système DOIT remplir la liste des départements (classés par nom) et, après le choix d'un département, la liste et la carte des cantons de ce département (classés par nom).
- **FR-003**: Le système DOIT enregistrer la sélection (département, canton, mode de sélection) avec la localisation de l'opération.
- **FR-004**: Le système DOIT effacer le canton (ainsi que le cadrage de la carte et les suggestions) chaque fois que le département change.
- **FR-005**: Le système DOIT permettre de sélectionner un canton dans la liste ou sur la carte (clic, appui tactile sans déplacement, ou touche Entrée / Espace).
- **FR-006**: Le système DOIT déterminer la classe climatique d'humidification (« Sèche » / « Modérée » / « Humide ») à partir de la valeur par défaut du département et, le cas échéant, de l'exception cantonale, en indiquant l'origine de la valeur (exception cantonale, règle départementale, département introuvable, ou information incomplète).
- **FR-007**: Le système DOIT retrouver l'exception FD P 20-651 d'un canton d'après 2015 en passant par la table de correspondance avec les anciens noms (d'avant 2015), en privilégiant une correspondance par ancien nom sur une correspondance approchée.
- **FR-008**: Le système DOIT exiger à la fois un département et un canton avant d'afficher une classe climatique ; sinon le champ reste vide avec l'indication « Renseignez le département et le canton ».
- **FR-009**: Le système DOIT déterminer le vent de pluie dominant à partir du département, en affichant les secteurs, une infobulle « Station de référence : … » et en mettant en évidence les secteurs correspondants de la rose des vents.
- **FR-010**: Le système DOIT déterminer la vigilance termites à partir du département, en traduisant les statuts O / P / N en libellés français et en ajoutant un complément (date d'arrêté pour « O » ; proportion de communes concernées et conseil de vérification communale pour « P »).
- **FR-011**: Le système DOIT déterminer la vigilance mérules à partir du département, en traduisant les statuts P / N en libellés français et en ajoutant un conseil de vérification communale pour « P ».
- **FR-012**: Le système DOIT transmettre aux exports les valeurs climat (avec la mention « FD P 20-651 - Annexe B ») et vent (avec la mention « FD P 20-651 - Annexe A »), pour le récapitulatif PDF et les exports CERFA / texte.
- **FR-013**: Le système DOIT reporter la classe climatique dans l'évaluation « localisation & situation » du lot / de la pièce, en affichant « Données manquantes » avec une consigne lorsqu'elle n'est pas déterminée.
- **FR-014**: Le système DOIT proposer la détection automatique à partir de l'adresse, avec choix de la meilleure commune, sélection automatique du canton unique, liste de « Cantons suggérés » en cas de candidats multiples, et localisation par point géographique en repli ; les messages de statut sont de type réussite / avertissement / erreur.
- **FR-015**: Le système DOIT masquer le bouton Détecter tant que l'adresse ne contient pas de code postal à 5 chiffres.
- **FR-016**: Le système DOIT proposer Réinitialiser (retour aux valeurs par défaut) et une fenêtre d'information documentant les sources et les normes.
- **FR-017**: Le système DOIT afficher un message d'état vide sur la carte lorsqu'aucun département, aucun canton ou aucune géométrie valide n'est disponible, et désactiver les commandes de zoom dans ces cas.
- **FR-018**: Le système DOIT afficher l'avertissement microclimat (§6.2) sous le champ climat ainsi que le rappel des seuils FD P 20-651 (Sèche ≤ 100 j/an ; 100 < Modérée ≤ 150 ; Humide > 150 j/an ; nombre moyen annuel de jours de précipitations > 1 mm, Météo-France 1971-2000).

### Key Entities *(include if data)*

- **Sélection géographique**: département (code et nom), canton (code et nom), mode de sélection, conservés avec la localisation de l'opération.
- **Département**: liste de codes et de noms (métropole + Corse 2A / 2B).
- **Canton**: pour chaque département, la liste des cantons (nom, code et tracé pour la carte).
- **Donnée climatique**: par département, une classe par défaut (Sèche / Modérée / Humide) et d'éventuelles exceptions par canton ; source FD P 20-651 (06/2011), Annexe B.
- **Correspondance climatique**: pour chaque département, le lien entre noms de cantons d'avant 2015 et noms d'après 2015 (établi à partir du code officiel géographique INSEE 2015→2023).
- **Donnée de vent**: par département, la station de référence et les secteurs de vent dominant ; source FD P 20-651 Annexe A (Météo-France 1994-2008).
- **Donnée termites**: par département, le statut O / P / N, le nombre de communes infestées et total, et la date d'arrêté ; source Cerema, mise à jour le 21/03/2024.
- **Donnée mérules**: par département, le statut P / N et le nombre de communes ; source Cerema, mise à jour le 21/03/2024.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Choisir un département remplit ses cantons dans la liste et sur la carte.
- **SC-002**: Choisir « Doubs » + canton « Besançon » donne le climat « Modérée » (exception cantonale au lieu de la valeur par défaut « Humide ») ; un canton du Doubs sans exception donne « Humide ».
- **SC-003**: Un canton renommé par la réforme de 2015 retrouve quand même son exception FD P 20-651 via la table de correspondance.
- **SC-004**: Choisir un département affiche les bons secteurs de vent et la bonne station de référence, et met en évidence les secteurs correspondants de la rose des vents.
- **SC-005**: Les champs termites et mérules affichent le bon libellé (O / P / N pour les termites, P / N pour les mérules) et le complément associé pour le département choisi.
- **SC-006**: La détection à partir de « 75002 Paris » fixe le département 75 et affiche un statut ; une commune ambiguë produit une liste de suggestions au lieu d'imposer un canton.
- **SC-007**: Les valeurs climat, vent et station apparaissent dans les exports PDF / CERFA avec la mention de leur annexe FD P 20-651.

## Assumptions

- L'encadré fait partie de l'onglet Général (`005-editor-general-info`) ; la sélection géographique est enregistrée avec le reste des informations de l'opération.
- Les libellés affichés du climat (« Sèche » / « Modérée » / « Humide ») dérivent des valeurs sources sans accent.
- Les données de départements et de cantons sont des fichiers volumineux générés, contenant noms, codes et tracés.

## Source Files

- `index.html`
- `js/app/valobois-app.js`
- `js/data/france-departements.js`
- `js/data/france-cantons.js`
- `js/data/climate-humidification-fd-p20-651.js`
- `js/data/climate-humidification-fd-p20-651-aliases.js`
- `js/data/termites-cerema.js`
- `js/data/merules-cerema.js`

## Open Questions

- Les données de vent de pluie dominant sont intégrées directement dans l'application (et non dans un fichier de données séparé comme les autres jeux) et ne couvrent pas tous les départements (notamment certains départements d'Île-de-France, le 16, le 90 et les DOM, et la Corse au-delà de 2A / 2B) ; pour ceux-là, le champ vent affiche « Non renseigné (Annexe A) ». Confirmer si ces manques sont volontaires ou s'il s'agit d'un import incomplet.
- La correspondance des noms de canton accepte qu'un nom soit le début d'un autre ; des noms courts pourraient correspondre à des cantons sans lien. Confirmer que c'est acceptable plutôt qu'une correspondance exacte.
- Le climat est repéré par le **nom** du département alors que le vent, les termites et les mérules le sont par le **code** ; une différence d'orthographe du nom entre fichiers donnerait silencieusement « département introuvable ». La cohérence des noms entre jeux de données n'est pas vérifiée à l'usage.
- La couverture des DOM est incohérente : les données termites / mérules incluent les DOM, mais leur présence dans la liste des départements, dans les cantons et dans les données vent / climat n'a pas été confirmée.
- La détection automatique repose sur deux services externes (recherche de communes et géolocalisation) ; le comportement hors ligne ou en cas de panne, au-delà du message d'erreur, n'est pas confirmé.
- Certaines couvertures de données (termites / mérules) ne portent que sur une partie d'un département (statut « partiel »), ce qui impose une vérification au niveau communal.
