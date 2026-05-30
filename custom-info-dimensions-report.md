# Rapport CSV vs CSS (verifie)

- Source dimensions: custom-info-dimensions-template.csv
- Portee: composant Contenu de la liste selectionnee
- Methode: verification directe des selecteurs dans css/main.css (desktop + media 768)

## Resultat

- Lignes cibles verifiees: 58
- Mismatch reel: 0
- Ecart detecte precedent: faux positifs du script d'audit (gestion des media blocks et shorthand)

## Points confirmes

1. Typographie globale et titre section conformes
	- h3: font-size 16px, font-weight 600
2. Champs de saisie conformes
	- .lot-input: min-height 36px, padding 8px 12px, font-size 13px (via variable)
3. Toolbar listes conforme
	- .piece-custom-info-order-btn: 36x36, font-size 18px
	- .piece-custom-info-delete-list-btn: min-height 36px, min-width 100px, padding 0 16px
4. Carte valeur conforme
	- .piece-custom-info-value-card: padding 12px, gap 8px
	- .piece-custom-info-value-card__actions .piece-duplicate-btn: min-height 36px, min-width 100px, padding 0 18px
5. Lignes connexes conformes
	- Desktop: .piece-custom-info-connexe-line = minmax(0,1fr) 36 36 36, gap 8
	- Desktop: boutons ordre = 36x36, font-size 18
	- Desktop: bouton + = 36x36, font-size 20
6. Responsive conforme (max-width: 768px)
	- .piece-custom-info-connexe-line = minmax(0,1fr) 32 32 32, gap 6
	- boutons ordre = 32x32, font-size 16
	- bouton + = 32x32, font-size 18
	- toolbar gap = 10

## Remarque

Le bouton X global .price-preset-row__remove reste en 32x32 pour le reste de l'app, et est correctement surcharge en 36x36 dans le scope du set editor:
- .piece-custom-info-set-editor .price-preset-row__remove
