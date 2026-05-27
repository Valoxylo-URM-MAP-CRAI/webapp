# Archive 2026-05-27

## Contexte

Consolidation des fichiers de backup utilises lors de la stabilisation du composer Etiqueter:
- clarification de la recuperation des elements de code,
- remise en oeuvre de la repartition lot/piece,
- controle de disponibilite des champs.

## Fichiers sauvegardes

- `css/main.css.bak`
- `js/app/valobois-app.js.backup`
- `js/app/valobois-app.js.pre-restore`
- `js/app/valobois-app.js.truncated-backup`

## Integrite (SHA256)

- `0c71f820300d5b8c59e7e276404f82b16b5d85d382eeb0c6b1aae8697235d9d6  css/main.css.bak`
- `983c10a39e23f21b1a5d2e87472bbaebf44016b1d28fb8aaa5a3c451fbe4c4d5  js/app/valobois-app.js.backup`
- `6709d141d7226f086efa29b03bf01ef9328438a83329de9b20361274ce60f429  js/app/valobois-app.js.pre-restore`
- `9a0bb63ba3ed17277a14844955a4612677102201cb444d90958acab4f4b7713d  js/app/valobois-app.js.truncated-backup`

## Procedure de restauration rapide

Exemple (restaurer le JS principal depuis pre-restore):

```bash
cp backups/archive-2026-05-27/js/app/valobois-app.js.pre-restore js/app/valobois-app.js
```

Exemple (restaurer le CSS):

```bash
cp backups/archive-2026-05-27/css/main.css.bak css/main.css
```

Avant restauration, verifier l'empreinte:

```bash
shasum -a 256 backups/archive-2026-05-27/js/app/valobois-app.js.pre-restore
```
