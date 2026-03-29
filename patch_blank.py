#!/usr/bin/env python3
# -*- coding: utf-8 -*-

with open('js/app/valobois-app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Ajouter une ligne vide après l'encart À noter
content = content.replace(
    "À noter : S'en référer à l'histoire de l'exploitation de l'essence identifiée.\nUne rareté commerciale",
    "À noter : S'en référer à l'histoire de l'exploitation de l'essence identifiée.\n\nUne rareté commerciale"
)

with open('js/app/valobois-app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: Added blank line after note")
