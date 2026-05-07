#!/usr/bin/env python3
"""
Harmonise la structure de toutes les fonctions buildValoboisMatrixGenericXxx
dans valobois-app.js pour que renderDetailModalContent produise des <h3>
uniformes via des blocs isolés.

Changements :
1. Headers ":"  → "." (ex: 'Où la donnée ... :' → 'Source des données.')
2. Suppression des premières lignes "Alerte X." non auto-strippées par le moteur
3. Insertion d'une ligne vide APRÈS chaque header de section (pour isoler le bloc → h3)
"""

FILEPATH = '/Users/maxence/Documents/valobois-app/js/app/valobois-app.js'
INDENT = '        '  # 8 espaces

with open(FILEPATH, 'r', encoding='utf-8') as f:
    content = f.read()

original = content


def rep(old, new, label=''):
    global content
    n = content.count(old)
    if n:
        content = content.replace(old, new)
        print(f'  [{n:2d}x] {label or old[:60]}')
    else:
        print(f'  [ 0x] NOT FOUND: {label or old[:60]}')


# ═══════════════════════════════════════════════════════════
# ÉTAPE 1 — Normalisation des headers ':' → '.'
# ═══════════════════════════════════════════════════════════
print('\n── ÉTAPE 1 : headers ":" → "." ──')

# Curly apostrophe = \u2019 ; e accent aigu = \u00e9 ; è = \u00e8 ; etc.
rep("'O\u00f9 la donn\u00e9e est prise dans l\u2019interface :'",
    "'Source des donn\u00e9es.'",
    "Où la donnée → Source des données.")

rep("'O\u00f9 les donn\u00e9es sont prises dans l\u2019interface :'",
    "'Source des donn\u00e9es.'",
    "Où les données → Source des données.")

rep("'Donn\u00e9e r\u00e9ellement utilis\u00e9e par l\u2019alerte :'",
    "'Source des donn\u00e9es.'",
    "Donnée réellement utilisée → Source des données.")

rep("'Donn\u00e9es r\u00e9ellement utilis\u00e9es par l\u2019alerte :'",
    "'Source des donn\u00e9es.'",
    "Données réellement utilisées → Source des données.")

rep("'Lecture m\u00e9tier de cette alerte :'",
    "'Lecture.'",
    "Lecture métier de cette alerte → Lecture.")

rep("'Lecture m\u00e9tier :'",
    "'Lecture.'",
    "Lecture métier → Lecture.")

rep("'Exemple de lecture :'",
    "'Exemple.'",
    "Exemple de lecture → Exemple.")

rep("'Exemple chiffr\u00e9 :'",
    "'Exemple.'",
    "Exemple chiffré → Exemple.")

rep("'Limite importante :'",
    "'Limite.'",
    "Limite importante → Limite.")

rep("'Effet sur l\u2019orientation :'",
    "'Effet sur l\u2019orientation.'",
    "Effet sur l'orientation : → .")

rep("'Effet sur l\u2019orientation (quand non neutralis\u00e9e) :'",
    "'Effet sur l\u2019orientation.'",
    "Effet sur l'orientation (quand non neutralisée) → .")

rep("'Effet m\u00e9tier principal :'",
    "'Effet sur l\u2019orientation.'",
    "Effet métier principal → Effet sur l'orientation.")

rep("'R\u00e8gle de d\u00e9clenchement du cartouche :'",
    "'R\u00e8gle.'",
    "Règle de déclenchement du cartouche → Règle.")

rep("'R\u00e8gle de d\u00e9clenchement du cartouche (impl\u00e9mentation actuelle) :'",
    "'R\u00e8gle (impl\u00e9mentation actuelle).'",
    "Règle de déclenchement (impl. actuelle) → .")

rep("'R\u00e8gle de d\u00e9clenchement :'",
    "'R\u00e8gle.'",
    "Règle de déclenchement → Règle.")

rep("'R\u00e8gle d\u2019alerte et de gate :'",
    "'R\u00e8gle.'",
    "Règle d'alerte et de gate → Règle.")

rep("'R\u00e8gle d\u2019\u00e9tat du cartouche :'",
    "'R\u00e8gle.'",
    "Règle d'état du cartouche → Règle.")

rep("'R\u00e8gle de s\u00e9lection pour la classe retenue :'",
    "'R\u00e8gle de s\u00e9lection.'",
    "Règle de sélection pour la classe → .")

rep("'R\u00e8gle de s\u00e9lection du niveau retenu :'",
    "'R\u00e8gle de s\u00e9lection.'",
    "Règle de sélection du niveau → .")

rep("'Pr\u00e9-traitement appliqu\u00e9 :'",
    "'Pr\u00e9-traitement.'",
    "Pré-traitement appliqué → Pré-traitement.")

rep("'R\u00e8gles de pr\u00e9paration avant calcul :'",
    "'Pr\u00e9-traitement.'",
    "Règles de préparation avant calcul → Pré-traitement.")

rep("'Calculs appliqu\u00e9s :'",
    "'Calcul.'",
    "Calculs appliqués → Calcul.")

rep("'Seuils de d\u00e9cision :'",
    "'Seuils.'",
    "Seuils de décision → Seuils.")

rep("'Conversion en niveau d\u2019alerte :'",
    "'Seuils.'",
    "Conversion en niveau d'alerte → Seuils.")

rep("'Pond\u00e9rations appliqu\u00e9es \u00e0 chaque contributeur renseign\u00e9 :'",
    "'Pond\u00e9rations.'",
    "Pondérations appliquées à chaque → Pondérations.")

rep("'Cas o\u00f9 l\u2019alerte est neutralis\u00e9e m\u00eame si la condition principale est vraie :'",
    "'Cas de neutralisation.'",
    "Cas où l'alerte est neutralisée → Cas de neutralisation.")

rep("'Issue possible de la lev\u00e9e du verrou :'",
    "'Lev\u00e9e du verrou.'",
    "Issue possible de la levée du verrou → Levée du verrou.")

rep("'Tol\u00e9rance g\u00e9om\u00e9trique appliqu\u00e9e :'",
    "'Tol\u00e9rance g\u00e9om\u00e9trique.'",
    "Tolérance géométrique appliquée → Tolérance géométrique.")


# ═══════════════════════════════════════════════════════════
# ÉTAPE 2 — Suppression des premières lignes "Alerte X."
# non auto-strippées (PurgeBio, PurgeMéca, Altération)
# ═══════════════════════════════════════════════════════════
print('\n── ÉTAPE 2 : suppression premières lignes "Alerte X." non strippées ──')

rep(INDENT + "'Alerte Purge biologique.',\n" + INDENT + "'',\n",
    "",
    "Suppression 'Alerte Purge biologique.' + ligne vide")

rep(INDENT + "'Alerte Purge m\u00e9canique.',\n" + INDENT + "'',\n",
    "",
    "Suppression 'Alerte Purge mécanique.' + ligne vide")

rep(INDENT + "'Alerte Alt\u00e9ration.',\n" + INDENT + "'',\n",
    "",
    "Suppression 'Alerte Altération.' + ligne vide")


# ═══════════════════════════════════════════════════════════
# ÉTAPE 3 — Insertion de ligne vide APRÈS les headers de section
# pour qu'ils forment un bloc isolé → déclenchement <h3>
# ═══════════════════════════════════════════════════════════
print('\n── ÉTAPE 3 : insertion lignes vides après headers ──')

# Liste de tous les headers (contenu sans quotes, sans virgule)
# qui doivent être suivis d'une ligne vide pour former leur propre bloc.
HEADERS = [
    # Communs (simple quotes)
    "Source des donn\u00e9es.",
    "Calcul.",
    "Seuils.",
    "Effet sur l\u2019orientation.",
    "Exemple.",
    "Limite.",
    "R\u00e8gle.",
    "R\u00e8gle (impl\u00e9mentation actuelle).",
    "Lecture.",
    "Pond\u00e9rations.",
    "Pr\u00e9-traitement.",
    "Tol\u00e9rance g\u00e9om\u00e9trique.",
    "R\u00e8gle de s\u00e9lection.",
    "R\u00e8gle de d\u00e9cision.",
    "Cas de neutralisation.",
    "Lev\u00e9e du verrou.",
    # Feu
    "Pond\u00e9rations appliqu\u00e9es.",
    "Signaux critiques.",
    "R\u00e8gle de niveau du cartouche.",
    # DurabiliteNaturelle
    "Agents \u00e9valu\u00e9s.",
    "Conversion des classes en rang de risque.",
    "R\u00e8gle d\u2019\u00e9valuation par essence.",
    "Ajustement aubier.",
    "R\u00e8gle de synth\u00e8se lot.",
]

# Headers spécifiques au Vieillissement (double quotes)
HEADERS_DQ = [
    "Source des donn\u00e9es.",
    "Seuils.",
    "Effet sur l\u2019orientation.",
    "Exemple.",
    "Limite.",
    "R\u00e8gle prioritaire \u2014 Int\u00e9grit\u00e9 biologique faible.",
    "Calcul du score (hors r\u00e8gle prioritaire).",
]

# Les premiers caractères possibles d'une ligne suivante (après le quote ouvrant)
# On couvre les bullets, les lettres de début de phrase, les tirets
FIRST_CHARS_SQ = list("'-ABCDEFGHIJKLMNOPQRSTUVWXYZ'abcdefghijklmnopqrstuvwxyz")
# Build starting strings for single-quoted context
starts_sq = ["'- "] + [f"'{c}" for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"] + [f"'{c}" for c in "abcdefghijklmnopqrstuvwxyz"]
starts_sq_no_bullet = [f"'{c}" for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"] + [f"'{c}" for c in "abcdefghijklmnopqrstuvwxyz"]

# Pour double-quote headers (Vieillissement), la ligne suivante peut être " ou '
starts_dq = ['"- '] + [f'"{c}' for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"] + [f'"{c}' for c in "abcdefghijklmnopqrstuvwxyz"]
starts_dq += ["'- "] + [f"'{c}" for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"]


def insert_blank_after(header, quote_char, possible_starts):
    """
    Cherche INDENT+Q+header+Q+',\\n'+INDENT+START
    et insère INDENT+'',\\n entre le header et START,
    SAUF si une ligne vide est déjà présente.
    """
    global content
    q = quote_char
    blank = INDENT + "''" + ','
    for start in possible_starts:
        old = INDENT + q + header + q + ',\n' + INDENT + start
        already = INDENT + q + header + q + ',\n' + blank + '\n' + INDENT + start
        if old in content and already not in content:
            new_val = INDENT + q + header + q + ',\n' + blank + '\n' + INDENT + start
            count = content.count(old)
            content = content.replace(old, new_val)
            print(f"  [blank+] '{header[:35]}' → {repr(start)}")
            break  # une seule occurrence par header normalement ; stopper après le premier match


print("  Single-quoted headers :")
for h in HEADERS:
    insert_blank_after(h, "'", starts_sq)

print("  Double-quoted headers (Vieillissement) :")
for h in HEADERS_DQ:
    insert_blank_after(h, '"', starts_dq)


# ═══════════════════════════════════════════════════════════
# SAUVEGARDE
# ═══════════════════════════════════════════════════════════
if content != original:
    with open(FILEPATH, 'w', encoding='utf-8') as f:
        f.write(content)
    print('\n✅ Fichier sauvegardé.')
else:
    print('\n⚠️  Aucun changement détecté.')
