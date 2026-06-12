# VALOXYLO

Outil web d'évaluation des bois d'occasion : grille de notation, gestion des lots, exports PDF / 3D / étiquettes, analyse et matrice d'orientation.

Développé par **Maxence Lebossé et al.** dans le cadre d'une **thèse de doctorat** financée sur **fonds publics**, au sein de l'**URM MAP CRAI, ENSA de Nancy**.

Le dépôt de développement utilise le préfixe `valobois` dans le code source ; **Valoxylo** est le nom public du logiciel.

**Dépôt :** [github.com/Valoxylo-URM-MAP-CRAI/webapp](https://github.com/Valoxylo-URM-MAP-CRAI/webapp)

## Licence — vue d'ensemble

| Périmètre | Licence | Fichier |
|-----------|---------|---------|
| Code source (`*.html`, `css/`, `js/`, `scripts/`, `lib/`) | [AGPL-3.0-or-later](LICENSE) | `LICENSE` |
| Documentation (`*.md`, guides, rapports) | [CC BY-SA 4.0](LICENSE-docs) | `LICENSE-docs` |
| Données de référence (CSV sources à la racine) | CC BY-SA 4.0 | voir `NOTICE` |
| Composants tiers | Licences d'origine | voir `NOTICE` |

**Recommandation retenue :** code sous **AGPL-3.0-or-later**, documentation sous **CC BY-SA 4.0**, sans CeCILL-2.1 (sauf contrainte institutionnelle explicite).

### Ce que cela implique concrètement

- **Réutilisation libre**, y compris à des fins commerciales, sous conditions.
- **Attribution obligatoire** : citez URM MAP CRAI, ENSA de Nancy, Lebossé et al. comme auteurs de Valoxylo.
- **Copyleft** : les versions modifiées du code doivent rester sous AGPL, y compris si l'application est proposée comme **service en ligne** (SaaS).
- **Documentation** : partage à l'identique (ShareAlike) avec attribution.

En-tête court pour les fichiers source : voir [`LICENSE-HEADER.txt`](LICENSE-HEADER.txt).

Attributions et dépendances tierces : voir [`NOTICE`](NOTICE).

Page intégrée dans l'application : [`licences.html`](licences.html).

## Points de vigilance (non substitut d'un avis juridique)

Avant publication ou contribution externe, vérifiez :

1. **Titularité des droits** — accord de l'université, du laboratoire ou du financeur sur la licence choisie ;
2. **Politique institutionnelle** — charte open source, clauses de propriété intellectuelle de la thèse ;
3. **Dépendances tierces** — compatibilité AGPL avec les bibliothèques embarquées ou chargées (voir `NOTICE`) ;
4. **Contributeurs externes** — entente écrite (Contributor License Agreement ou équivalent) si des tiers commitent du code ;
5. **Données intégrées** — certaines sources (CEREMA, normes, référentiels) peuvent avoir leurs propres conditions de réutilisation.

## Structure du dépôt

```
.
├── LICENSE                 # AGPL-3.0-or-later (code)
├── LICENSE-docs            # CC BY-SA 4.0 (documentation)
├── LICENSE-HEADER.txt      # En-tête court pour fichiers source
├── NOTICE                  # Attribution et bibliothèques tierces
├── README.md               # Ce fichier (CC BY-SA 4.0)
├── CLAUDE.md               # Guide développeur (CC BY-SA 4.0)
├── index.html              # Application principale
├── auth.html               # Authentification Firebase
├── mes-evaluations.html    # Liste des évaluations cloud
├── licences.html           # Mentions légales / licences (UI)
├── css/main.css            # Styles
├── js/
│   ├── app/                # Logique métier (ValoboisApp, onglets, patches)
│   ├── data/               # Jeux de données générés (AGPL, voir NOTICE)
│   ├── i18n/               # Traductions fr/en
│   └── lib/                # Utilitaires (build standalone, Firestore, exports 3D)
├── lib/                    # Bibliothèques vendored (MIT, voir NOTICE)
├── scripts/                # Build, checks de régression, importeurs
└── *.csv                   # Sources de données documentaires (CC BY-SA 4.0)
```

| Élément | Rôle |
|--------|------|
| [`index.html`](index.html) | Page principale : UI, templates, chargement des scripts. |
| [`css/main.css`](css/main.css) | Styles de l'application. |
| [`js/app/valobois-app.js`](js/app/valobois-app.js) | Cœur métier : classe `ValoboisApp`, rendu, stockage, exports. |
| [`js/data/`](js/data/) | Données de référence (essences, climat FD P20-651, départements, etc.). |
| [`scripts/build-standalone.mjs`](scripts/build-standalone.mjs) | Génère `dist/valobois-standalone.html`. |
| [`dist/`](dist/) | Sortie build (non versionné par défaut). |

Les graphiques et exports PDF dépendent de bibliothèques CDN (Chart.js, pdfmake, jsPDF, Firebase) : un accès Internet est nécessaire, même pour la version « standalone ».

## Prérequis

- Navigateur récent.
- Serveur HTTP local pour le développement.
- Node.js (pour `npm run build:standalone` et les scripts de vérification).

## Lancer l'application en local

Ouvrir `index.html` en `file://` **n'est pas recommandé** (fetch, sauvegarde HTML).

```bash
python3 -m http.server 8080
# puis http://localhost:8080/index.html
```

Alternative :

```bash
npm run serve
```

## Build autonome

```bash
npm run build:standalone
# → dist/valobois-standalone.html
```

Les scripts CDN restent externes. Régénérez `dist/` après clone ou mise à jour.

## Checks de régression

```bash
npm run check:climate-table
npm run check:matrix-export-config
npm run check:orientation-parity
```

Voir [`CLAUDE.md`](CLAUDE.md) pour l'architecture détaillée et les conventions de développement.

## Citation suggérée

> URM MAP CRAI, ENSA de Nancy, Lebossé et al. (2026). *Valoxylo — outil web d'évaluation des bois d'occasion*. Logiciel AGPL-3.0-or-later. https://github.com/Valoxylo-URM-MAP-CRAI/webapp

---

Documentation de ce dépôt : [CC BY-SA 4.0](LICENSE-docs) · Code : [AGPL-3.0-or-later](LICENSE)
