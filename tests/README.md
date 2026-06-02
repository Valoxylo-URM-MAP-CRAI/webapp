# Tests end-to-end (Playwright)

Tests de la **tab « Général »** de l'éditeur VALOBOIS, pilotés via l'**arbre
d'accessibilité** (rôles, noms accessibles, états `aria-pressed` / `aria-selected`,
régions live) plutôt que par des sélecteurs CSS ou des `id`.

## Prérequis

- **Node ≥ 18** (requis par `@playwright/test`).
- **Python 3** (utilisé par le `webServer` de `playwright.config.js` pour servir
  les fichiers statiques via `python3 -m http.server`).
- Installer les navigateurs Playwright une première fois : `npx playwright install chromium`.

## Lancer

```bash
npm run test:e2e          # exécution headless
npm run test:e2e:ui       # mode UI interactif
npm run test:e2e:report   # ouvrir le dernier rapport HTML
```

Le `webServer` de `playwright.config.js` sert les fichiers statiques avec
`python3 -m http.server` sur le port **8077** (port dédié pour ne pas entrer en
conflit avec un serveur de dev déjà lancé sur 8080). Le port est configurable
via la variable d'environnement `PLAYWRIGHT_PORT`.

## Fichiers

| Fichier | Contenu |
|---------|---------|
| `general-tab.spec.js` | Sémantique du `tablist`, référence gisement dérivée, bascule « Type d'opération », slider « Statut de l'étude » + région live, indépendance des groupes Oui/Non/Inconnu, contacts, sections repliables, déverrouillage canton. |
| `general-tab-behaviors.spec.js` | Persistance locale (champs + onglet actif survivent au rechargement), cascade géographique France (département → canton → conditions climatiques / termites / mérules + réinitialisation), alertes de complétude par section, flux de confirmation « Réinitialiser ». |
| `general-tab-i18n.spec.js` | Bascule de langue (FR ↔ EN) via le sélecteur du bandeau : noms accessibles des onglets, champs, groupes et boutons d'alerte qui suivent la langue, persistance du choix au rechargement, conservation de l'onglet actif. |
| `general-tab-pemd.spec.js` | Sous-sections CERFA repliées par défaut (« Diagnostiqueur PEMD », « Visite PEMD ») : révélation des bascules Oui/Non à l'ouverture, sélection mutuellement exclusive et indépendance entre groupes, saisie des champs libres, persistance des choix au rechargement. |
| `general-tab-import.spec.js` | **Import d'une évaluation** (`fixtures/evaluation-general.json`) puis vérification de l'affichage de tous les champs de la tab Général. |
| `fixtures/evaluation-general.json` | Charge utile d'export réelle (schemaVersion + meta + ui + 1 lot) rejouée par le vrai pipeline d'import. |

## Améliorations d'accessibilité associées

Pour rendre l'arbre d'accessibilité testable **et** mieux exposé aux technologies
d'assistance, `index.html` a reçu des noms de groupes là où plusieurs contrôles
partageaient le même libellé :

- chaque groupe de bascules (`.meta-toggle-group`, ex. Oui / Non / Inconnu)
  porte `role="group"` + `data-i18n-aria-label` reprenant son libellé visible ;
- les blocs « Diagnostiqueur » et « Diagnostiqueur PEMD » sont des
  `role="group"` nommés ;
- les sous-sections de contacts (Maîtrise d'ouvrage / d'œuvre / Entreprise de
  déconstruction) sont des `role="group"` reliés à leur titre `<h3>` via
  `aria-labelledby` ;
- les boutons d'alerte de complétude (le triangle par section) ont reçu un nom
  accessible (`data-i18n-aria-label`, ex. « Champs manquants : Diagnostiqueur »)
  et exposent leur état résolu via `aria-disabled` — l'indicateur grisé
  (`pointer-events: none`) est ainsi distinguable d'une alerte active.

Sans ces noms, des libellés répétés comme « Structure / Nom » ou « Oui » étaient
ambigus dans l'arbre d'accessibilité (et donc pour un lecteur d'écran).
