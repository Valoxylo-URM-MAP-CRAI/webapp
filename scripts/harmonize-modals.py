#!/usr/bin/env python3
"""
Harmonise la structure de toutes les fonctions buildValoboisMatrixGenericXxx
dans valobois-app.js pour que le moteur renderDetailModalContent produise
un rendu uniforme (h3 subtitles via blocs isolés, headers normalisés).

Changements appliqués :
1. Headers "Où ...:" / "Données ...:" / "Exemple de lecture :" etc. → "." style
2. Première ligne "Alerte X." supprimée si non auto-strippée par le moteur
   (cas : PurgeBio, PurgeMéca, Altération dont le titre de spec diffère)
3. Insertion d'une ligne vide APRÈS chaque header de section pour qu'il
   forme son propre bloc et déclenche le rendu <h3 class="detail-modal-subtitle">
"""

import re

FILEPATH = '/Users/maxence/Documents/valobois-app/js/app/valobois-app.js'

with open(FILEPATH, 'r', encoding='utf-8') as f:
    content = f.read()

original = content
changes = []

def replace_all(old, new, label=''):
    global content
    count = content.count(old)
    if count:
        content = content.replace(old, new)
        changes.append(f"  [{count}x] {label or repr(old[:60])}")
    else:
        changes.append(f"  [NOT FOUND] {label or repr(old[:60])}")

# ─────────────────────────────────────────────────────────────
# ÉTAPE 1 : Headers ":" → "." (replacements globaux)
# ─────────────────────────────────────────────────────────────

# Curly apostrophe \u2019 apparaît dans les chaînes JS de l'interface
step1 = [
    # "Où la donnée ..." (singulier)
    ("'Où la donnée est prise dans l\u2019interface :'",
     "'Source des données.'",
     "Où la donnée → Source des données."),
    # "Où les données ..." (pluriel)
    ("'Où les données sont prises dans l\u2019interface :'",
     "'Source des données.'",
     "Où les données → Source des données."),
    # "Donnée réellement utilisée..." (singulier)
    ("'Donn\u00e9e r\u00e9ellement utilis\u00e9e par l\u2019alerte :'",
     "'Source des données.'",
     "Donnée réellement utilisée → Source des données."),
    # "Données réellement utilisées..." (pluriel)
    ("'Donn\u00e9es r\u00e9ellement utilis\u00e9es par l\u2019alerte :'",
     "'Source des données.'",
     "Données réellement utilisées → Source des données."),
    # Lecture
    ("'Lecture m\u00e9tier de cette alerte :'",
     "'Lecture.'",
     "Lecture métier de cette alerte → Lecture."),
    ("'Lecture m\u00e9tier :'",
     "'Lecture.'",
     "Lecture métier → Lecture."),
    # Exemple
    ("'Exemple de lecture :'",
     "'Exemple.'",
     "Exemple de lecture → Exemple."),
    ("'Exemple chiffr\u00e9 :'",
     "'Exemple.'",
     "Exemple chiffré → Exemple."),
    # Limite
    ("'Limite importante :'",
     "'Limite.'",
     "Limite importante → Limite."),
    # Effet sur l'orientation (pluriel aussi)
    ("'Effet sur l\u2019orientation :'",
     "'Effet sur l\u2019orientation.'",
     "Effet sur l'orientation : → ."),
    ("'Effet sur l\u2019orientation (quand non neutralis\u00e9e) :'",
     "'Effet sur l\u2019orientation.'",
     "Effet sur l'orientation (quand non neutralisée) → ."),
    # Règles
    ("'R\u00e8gle de d\u00e9clenchement du cartouche :'",
     "'R\u00e8gle.'",
     "Règle de déclenchement du cartouche → Règle."),
    ("'R\u00e8gle de d\u00e9clenchement du cartouche (impl\u00e9mentation actuelle) :'",
     "'R\u00e8gle (impl\u00e9mentation actuelle).'",
     "Règle de déclenchement (implémentation actuelle) → ."),
    ("'R\u00e8gle de d\u00e9clenchement :'",
     "'R\u00e8gle.'",
     "Règle de déclenchement → Règle."),
    ("'R\u00e8gle d\u2019alerte et de gate :'",
     "'R\u00e8gle.'",
     "Règle d'alerte et de gate → Règle."),
    ("'R\u00e8gle d\u2019\u00e9tat du cartouche :'",
     "'R\u00e8gle.'",
     "Règle d'état du cartouche → Règle."),
    ("'R\u00e8gle de s\u00e9lection pour la classe retenue :'",
     "'R\u00e8gle de s\u00e9lection.'",
     "Règle de sélection pour la classe → ."),
    ("'R\u00e8gle de s\u00e9lection du niveau retenu :'",
     "'R\u00e8gle de s\u00e9lection.'",
     "Règle de sélection du niveau → ."),
    # Pré-traitement
    ("'Pr\u00e9-traitement appliqu\u00e9 :'",
     "'Pr\u00e9-traitement.'",
     "Pré-traitement appliqué → Pré-traitement."),
    ("'R\u00e8gles de pr\u00e9paration avant calcul :'",
     "'Pr\u00e9-traitement.'",
     "Règles de préparation → Pré-traitement."),
    # Calcul
    ("'Calculs appliqu\u00e9s :'",
     "'Calcul.'",
     "Calculs appliqués → Calcul."),
    # Seuils
    ("'Seuils de d\u00e9cision :'",
     "'Seuils.'",
     "Seuils de décision → Seuils."),
    ("'Conversion en niveau d\u2019alerte :'",
     "'Seuils.'",
     "Conversion en niveau d'alerte → Seuils."),
    # Pondérations (Macro-histoire)
    ("'Pond\u00e9rations appliqu\u00e9es \u00e0 chaque contributeur renseign\u00e9 :'",
     "'Pond\u00e9rations.'",
     "Pondérations appliquées à chaque contrib → Pondérations."),
    # Cas de neutralisation (DurabiliteConférée)
    ("'Cas o\u00f9 l\u2019alerte est neutralis\u00e9e m\u00eame si la condition principale est vraie :'",
     "'Cas de neutralisation.'",
     "Cas où l'alerte est neutralisée → Cas de neutralisation."),
    # Effet métier principal (Altération)
    ("'Effet m\u00e9tier principal :'",
     "'Effet sur l\u2019orientation.'",
     "Effet métier principal → Effet sur l'orientation."),
    # Issue possible (Altération)
    ("'Issue possible de la lev\u00e9e du verrou :'",
     "'Lev\u00e9e du verrou.'",
     "Issue possible de la levée du verrou → Levée du verrou."),
    # Tolérance géométrique (Régularité)
    ("'Tol\u00e9rance g\u00e9om\u00e9trique appliqu\u00e9e :'",
     "'Tol\u00e9rance g\u00e9om\u00e9trique.'",
     "Tolérance géométrique appliquée → Tolérance géométrique."),
    # Exemple chiffré (Stabilité)  – already handled above
]

print("\n=== ÉTAPE 1 : Normalisation des headers ':' → '.' ===")
for old, new, label in step1:
    replace_all(old, new, label)

# ─────────────────────────────────────────────────────────────
# ÉTAPE 2 : Suppression des premières lignes "Alerte X."
# non auto-strippées par le moteur de rendu
# (PurgeBio, PurgeMéca, Altération — leur titre de spec diffère)
# ─────────────────────────────────────────────────────────────

print("\n=== ÉTAPE 2 : Suppression des premières lignes 'Alerte X.' non auto-strippées ===")

lines_to_remove = [
    ("        'Alerte Purge biologique.',\n        '',\n",
     "",
     "Suppression première ligne PurgeBio"),
    ("        'Alerte Purge m\u00e9canique.',\n        '',\n",
     "",
     "Suppression première ligne PurgeMéca"),
    ("        'Alerte Alt\u00e9ration.',\n        '',\n",
     "",
     "Suppression première ligne Altération"),
]

for old, new, label in lines_to_remove:
    replace_all(old, new, label)

# ─────────────────────────────────────────────────────────────
# ÉTAPE 3 : Insertion d'une ligne vide APRÈS les headers de section
# pour qu'ils forment chacun leur propre bloc → déclenchement h3
# ─────────────────────────────────────────────────────────────

print("\n=== ÉTAPE 3 : Insertion de lignes vides après les headers de section ===")

INDENT = '        '  # 8 espaces (niveau des strings dans les fonctions)

# Headers en simple quotes (apostrophe curly \u2019 pour "l'orientation")
# Le contenu de la ligne doit être exactement la chaîne ci-dessous (sans les apostrophes extérieures)
single_q_headers = [
    'Source des données.',
    'Calcul.',
    'Seuils.',
    "Effet sur l\u2019orientation.",
    'Exemple.',
    'Limite.',
    'Règle.',
    "Règle (implémentation actuelle).",
    'Lecture.',
    'Pondérations.',
    'Pré-traitement.',
    'Tolérance géométrique.',
    'Règle de sélection.',
    'Règle de décision.',
    'Cas de neutralisation.',
    "Levée du verrou.",
    # Feu-specific
    'Pondérations appliquées.',
    'Signaux critiques.',
    'Règle de niveau du cartouche.',
    # DurabiliteNaturelle-specific
    'Agents évalués.',
    'Conversion des classes en rang de risque.',
    "Règle d\u2019évaluation par essence.",
    'Ajustement aubier.',
    'Règle de synthèse lot.',
]

# Headers en double quotes (Vieillissement utilise "...")
double_q_headers = [
    'Source des données.',
    'Calcul.',
    'Seuils.',
    "Effet sur l\u2019orientation.",
    'Exemple.',
    'Limite.',
    "Règle prioritaire \u2014 Intégrité biologique faible.",
    'Calcul du score (hors règle prioritaire).',
]

def add_blank_after(header, quote_char):
    """
    Insère une ligne vide après 'header' si elle n'en a pas déjà une.
    Utilise une negative lookahead pour éviter la double-insertion.
    quote_char : "'" ou '"'
    """
    global content
    q = re.escape(quote_char)
    h = re.escape(header)
    # Pattern: INDENT + quote + header + quote + , + \n + INDENT + quote + (pas un autre quote)
    pattern = re.escape(INDENT) + q + h + q + r',\n' + re.escape(INDENT) + q + r'(?!' + q + r')'
    replacement = INDENT + quote_char + header + quote_char + ',\n' + INDENT + "'" + "'" + ',\n' + INDENT + quote_char
    # Pour double quotes, la ligne vide doit aussi être en double quotes? Non — on insère ''
    # car '' et "" sont équivalents en JS pour une chaîne vide
    if quote_char == '"':
        replacement = INDENT + '"' + header + '"' + ',\n' + INDENT + "''" + ',\n' + INDENT + '"'
    
    new_content, n = re.subn(pattern, re.escape(replacement), content)
    # re.subn avec re.escape sur le replacement — ça ne marche pas directement
    # Utiliser une fonction lambda à la place
    if quote_char == "'":
        repl_str = INDENT + "'" + header + "'" + ",\n" + INDENT + "''" + ",\n" + INDENT + "'"
    else:
        repl_str = INDENT + '"' + header + '"' + ",\n" + INDENT + "''" + ",\n" + INDENT + '"'

    def replacer(m):
        return repl_str + m.group(0)[len(INDENT) + 1 + len(header) + 1 + len(",\n" + INDENT):]
    
    new_content = re.sub(pattern, lambda m: repl_str, content)
    # Hmm, the lambda loses the rest of the match. Let me use a different approach.
    return None

# Approche plus simple et fiable : remplacement de chaîne
# Pattern : INDENT + QUOTE + HEADER + QUOTE + ',\n' + INDENT + QUOTE + (not QUOTE)
# → remplacer par : INDENT + QUOTE + HEADER + QUOTE + ',\n' + INDENT + "''" + ',\n' + INDENT + QUOTE

def insert_blank_after_header(header, quote_char):
    global content
    q = quote_char
    # old : 'HEADER',\n        'X (où X != ' pour éviter les '' existants)
    # Astuce : on cherche la séquence exacte et on vérifie que juste après le 2e quote
    # il n'y a pas immédiatement un autre quote (= string vide déjà présente)
    
    # Cas 1 : header suivi d'un bullet '-'
    # Cas 2 : header suivi d'une lettre majuscule ou minuscule
    # Dans les deux cas on veut insérer ''
    
    # On ne peut pas facilement faire ça avec str.replace car on doit exclure ''
    # On utilise donc re.sub avec lookahead
    
    h_esc = re.escape(header)
    q_esc = re.escape(q)
    indent_esc = re.escape(INDENT)
    
    # Regex: INDENT + Q + header + Q + ',\n' + INDENT + Q + NOT_Q
    pattern = indent_esc + q_esc + h_esc + q_esc + r',\n' + indent_esc + q_esc + r'(?!' + q_esc + r')'
    
    # La replacement doit reconstruire la même chose mais avec '' inséré
    blank_line = INDENT + "''" + ','
    repl = INDENT + q + header + q + ',\n' + blank_line + '\n' + INDENT + q
    
    new_content, n = re.subn(pattern, re.escape(repl), content)
    # re.escape sur le replacement casse tout. Utiliser sub avec lambda :
    
    count_before = len(re.findall(pattern, content))
    if count_before:
        content = re.sub(pattern, repl.replace('\\', '\\\\'), content)
        # Ça ne marche toujours pas avec les backslashes...
        # Utilisons une approche différente
        pass
    return count_before

# ─────────────────────────────────────────────────────────────
# ABANDON DE L'APPROCHE REGEX COMPLEXE
# On utilise plutôt des remplacements str.replace ciblés,
# listant les PAIRES (header, ligne-suivante) connues
# ─────────────────────────────────────────────────────────────

# On reconstruit les remplacements pour chaque header connu
# en cherchant INDENT+'HEADER',\nINDENT+'X  (où X != "'")
# et en insérant INDENT+'',\n avant INDENT+'X

print("\n  (approche targeted string replace)")

def add_blank_after_targeted(header, following_starts, quote_char="'"):
    """
    Pour chaque combinaison (header, début_de_ligne_suivante), insère '','
    si pas déjà présent.
    """
    global content, changes
    q = quote_char
    for start in following_starts:
        old = INDENT + q + header + q + ',\n' + INDENT + start
        already = INDENT + q + header + q + ",\n" + INDENT + "'',\n" + INDENT + start
        if old in content and already not in content:
            new = INDENT + q + header + q + ',\n' + INDENT + "'',\n" + INDENT + start
            content = content.replace(old, new)
            changes.append(f"  [blank after] {repr(header[:40])} → {repr(start[:20])}")

# Les débuts de lignes suivantes possibles (sans le quote ouvrant)
POSSIBLE_STARTS_SQ = [
    # Bullet
    "'- ",
    # Ligne de texte (lettre)
    "'C", "'L", "'S", "'D", "'A", "'M", "'P", "'R", "'E", "'F", "'T", "'I", "'U", "'N", "'O",
    "'c", "'l", "'s", "'d", "'a", "'m", "'p", "'r", "'e", "'f", "'t", "'i", "'u", "'n",
    # Double quote (Vieillissement mixte)
    '"- ', '"C', '"L', '"S', '"D', '"A', '"M', '"P', '"R', '"E', '"F', '"T', '"I',
]

POSSIBLE_STARTS_DQ = [
    '"- ',
    '"C', '"L', '"S', '"D', '"A', '"M', '"P', '"R', '"E', '"F', '"T',
    "'- ", "'C", "'S", "'L",
]

for h in single_q_headers:
    for start in POSSIBLE_STARTS_SQ:
        old = INDENT + "'" + h + "'" + ',\n' + INDENT + start
        already_blank = INDENT + "'" + h + "'" + ',\n' + INDENT + "''" + ',\n' + INDENT + start
        if old in content and already_blank not in content:
            new_val = INDENT + "'" + h + "'" + ',\n' + INDENT + "''" + ',\n' + INDENT + start
            old_count = content.count(old)
            content = content.replace(old, new_val)
            changes.append(f"  [blank+] '{h}' → {repr(start)}")

for h in double_q_headers:
    for start in POSSIBLE_STARTS_DQ:
        old = INDENT + '"' + h + '"' + ',\n' + INDENT + start
        already_blank = INDENT + '"' + h + '"' + ',\n' + INDENT + "''" + ',\n' + INDENT + start
        already_blank2 = INDENT + '"' + h + '"' + ',\n' + INDENT + '""' + ',\n' + INDENT + start
        if old in content and already_blank not in content and already_blank2 not in content:
            new_val = INDENT + '"' + h + '"' + ',\n' + INDENT + "''" + ',\n' + INDENT + start
            content = content.replace(old, new_val)
            changes.append(f"  [blank+] \"{h}\" → {repr(start)}")

# ─────────────────────────────────────────────────────────────
# RÉSUMÉ
# ─────────────────────────────────────────────────────────────

print()
if content != original:
    with open(FILEPATH, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ Fichier mis à jour : {len([c for c in changes if 'NOT FOUND' not in c and 'blank+' not in c])} remplac. globaux")
    blank_changes = [c for c in changes if 'blank+' in c]
    print(f"✅ Lignes vides insérées après {len(blank_changes)} paires header→contenu")
    print("\nDétail :")
    for c in changes:
        print(c)
else:
    print("⚠️  Aucun changement appliqué")
    print("\nDétail :")
    for c in changes:
        print(c)
