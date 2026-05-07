#!/usr/bin/env python3
"""Corrige les blank lines manquantes (cas lowercases manqués par le script principal)."""
FILEPATH = '/Users/maxence/Documents/valobois-app/js/app/valobois-app.js'
INDENT = '        '

with open(FILEPATH, 'r', encoding='utf-8') as f:
    content = f.read()

orig = content

HEADERS = [
    'Source des donn\u00e9es.',
    'Calcul.',
    'Seuils.',
    "Effet sur l\u2019orientation.",
    'Exemple.',
    'Limite.',
    'R\u00e8gle.',
    "R\u00e8gle (impl\u00e9mentation actuelle).",
    'Lecture.',
    'Pond\u00e9rations.',
    'Pr\u00e9-traitement.',
    'Tol\u00e9rance g\u00e9om\u00e9trique.',
    'R\u00e8gle de s\u00e9lection.',
    'R\u00e8gle de d\u00e9cision.',
    'Cas de neutralisation.',
    'Lev\u00e9e du verrou.',
    'Pond\u00e9rations appliqu\u00e9es.',
    'Signaux critiques.',
    'R\u00e8gle de niveau du cartouche.',
    'Agents \u00e9valu\u00e9s.',
    'Conversion des classes en rang de risque.',
    "R\u00e8gle d\u2019\u00e9valuation par essence.",
    'Ajustement aubier.',
    'R\u00e8gle de synth\u00e8se lot.',
]

all_chars = list('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
starts = ["'- "] + [f"'{c}" for c in all_chars] + ['"- '] + [f'"{c}' for c in all_chars]

for h in HEADERS:
    for start in starts:
        old = INDENT + "'" + h + "'" + ',\n' + INDENT + start
        already = INDENT + "'" + h + "'" + ',\n' + INDENT + "''" + ',\n' + INDENT + start
        if old in content and already not in content:
            new_val = INDENT + "'" + h + "'" + ',\n' + INDENT + "''" + ',\n' + INDENT + start
            n = content.count(old)
            content = content.replace(old, new_val)
            print(f'  [fix] {repr(h[:35])} → {repr(start)}  ({n}x)')

if content != orig:
    with open(FILEPATH, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Saved.')
else:
    print('No additional changes.')
