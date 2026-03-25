# VALOBOIS

Outil web d’évaluation des bois d’occasion (grille de notation, lots, export PDF, etc.). Le code est découpé en fichiers statiques (HTML, CSS, JavaScript) pour faciliter la maintenance.

## Structure du dépôt

| Élément | Rôle |
|--------|------|
| [`index.html`](index.html) | Page principale : en-tête, chargement des bibliothèques (CDN), lien vers la feuille de style, contenu `<main>`, scripts en bas de page. |
| [`css/main.css`](css/main.css) | Styles de l’application. |
| [`js/app/valobois-app.js`](js/app/valobois-app.js) | Logique métier : classe `ValoboisApp`, rendu, stockage, exports. |
| [`js/data/`](js/data/) | Données de référence : essences, termes de bois, listes pour les champs avec suggestion (`datalist-*`). |
| [`js/lib/build-standalone-html.js`](js/lib/build-standalone-html.js) | Utilitaire navigateur pour reconstruire un HTML autonome (sauvegarde depuis l’UI). |
| [`js/lib/datalist-populate.js`](js/lib/datalist-populate.js) | Remplit les `<datalist>` vides à partir des tableaux définis dans `js/data/datalist-*.js`. |
| [`js/ui/version-input-width.js`](js/ui/version-input-width.js) | Ajustement de largeur du champ « Version de l’évaluation ». |
| [`scripts/build-standalone.mjs`](scripts/build-standalone.mjs) | Script Node : génère un fichier HTML unique en inlinant CSS et JS locaux. |
| [`scripts/lib/build-standalone-html.mjs`](scripts/lib/build-standalone-html.mjs) | Logique d’inlining partagée côté Node. |
| [`dist/`](dist/) | **Non versionné par défaut** (voir `.gitignore`) : sortie `valobois-standalone.html` après build. |
| [`valobois.html`](valobois.html) | Redirection minimale vers `index.html` (ancien point d’entrée monolithique). |

Les graphiques et exports PDF dépendent de bibliothèques chargées depuis le réseau (Chart.js, jsPDF, html2canvas, polices Google) : un accès Internet est nécessaire même pour la version « standalone » locale, sauf si vous intégrez ces assets dans le projet.

## Prérequis

- **Navigateur** récent.
- **Serveur HTTP local** pour le développement (voir ci-dessous).
- **Node.js** (pour la commande `npm run build:standalone`).

## Lancer l’application en local

Ouvrir `index.html` directement avec le schéma `file://` **n’est pas recommandé** : les scripts et la sauvegarde HTML dépendent du chargement des ressources avec des chemins relatifs et de `fetch`.

À la racine du dépôt :

```bash
# Python 3
python3 -m http.server 8080
```

Puis ouvrir dans le navigateur : `http://localhost:8080/index.html`.

Alternative avec npm (si `serve` est acceptable sur votre machine) :

```bash
npm run serve
```

Suivez l’URL indiquée dans le terminal (souvent `http://localhost:3000`) et ouvrez `index.html`.

## Produire un fichier HTML autonome (`dist`)

Un build regroupe le CSS et tous les scripts **locaux** dans un seul fichier. Les balises `<script src="https://…">` (CDN) restent des liens externes.

```bash
npm run build:standalone
```

Le fichier généré est :

`dist/valobois-standalone.html`

Vous pouvez le copier ou l’ouvrir (de préférence via un petit serveur HTTP pour éviter certains blocages navigateur). Le dossier `dist/` est ignoré par Git dans ce dépôt : régénérez-le après clone ou mise à jour du code.

## Sauvegarde depuis l’interface (« Sauvegarder »)

L’export HTML avec l’état courant de l’évaluation s’appuie sur le même principe d’inlining que le build, mais côté navigateur. Il faut que l’app soit servie en **HTTP** (pas en `file://`). En cas d’échec, le message d’erreur propose d’utiliser `npm run build:standalone` pour obtenir une base autonome.

---

Licence : voir [`LICENSE`](LICENSE).
