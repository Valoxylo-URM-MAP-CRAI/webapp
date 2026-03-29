with open('/Users/maxence/Documents/valobois-app/js/app/valobois-app.js', 'r', encoding='utf-8') as f:
    content = f.read()

apos = "\u2019"

old_content = (
    "        reputationProv: `R\u00e9putation.\n\n"
    "Noter la r\u00e9putation des bois au regard de l" + apos + "origine g\u00e9ographique des arbres et des qualit\u00e9s qui lui sont attribu\u00e9es.\n\n"
    "Une r\u00e9putation \u00ab forte \u00bb vaut pour des bois issus de for\u00eats sp\u00e9cifiques reconnues (Tron\u00e7ais, Berc\u00e9, Lyons, etc.) [+3].\n"
    "Une r\u00e9putation \u00ab moyenne \u00bb vaut pour des bois de massifs reconnus (Vosges, Jura sup\u00e9rieur, etc.) [+2].\n"
    "Une r\u00e9putation \u00ab faible \u00bb vaut pour des bois dont l" + apos + "origine est peu valoris\u00e9e [+1].`,"
)

new_content = (
    "        reputationProv: `"
    "Une r\u00e9putation \u00ab forte \u00bb vaut pour des bois en provenance de for\u00eats sp\u00e9cifique reconnue pour les qualit\u00e9s de leurs bois (ex : Tron\u00e7ais, Berc\u00e9, Lyons\u2026) [+3].\n"
    "Une r\u00e9putation \u00ab moyenne \u00bb vaut pour des bois en provenance de massifs forestiers reconnus pour la qualit\u00e9s de leurs bois (ex : S\u00e9lection Vosges, Jura sup\u00e9rieur\u2026) [+2].\n"
    "Une r\u00e9putation \u00ab faible \u00bb vaut pour des bois dont l" + apos + "origine est peu valoris\u00e9e [+1].\n\n"
    "\u00c0 noter : Une r\u00e9putation inconnue ou incertaine n" + apos + "est pas not\u00e9e.\n\n"
    "Lenglet, J., & Peyrache-Gadeau, V. (2020). Valuation de la ressource territoriale et formes de circularit\u00e9 : la labellisation dans la fili\u00e8re for\u00eat-bois fran\u00e7aise (Alpes, Jura, Vosges). Revue foresti\u00e8re fran\u00e7aise, 72(4), 339\u2013360. https://doi.org/10.20870/revforfr.2020.5333\n"
    "King, L., & Vallauri, D. (2023). Marques r\u00e9gionales pour le bois : Quelles plus-values environnementales ? WWF-France. https://www.wwf.fr/sites/default/files/doc-2023-12/Fiche_marques_regionales.pdf`,"
)

if old_content in content:
    content = content.replace(old_content, new_content)
    print("Content: SUCCESS")
else:
    print("Content: NOT FOUND")
    idx = content.find("reputationProv: `")
    if idx >= 0:
        print(repr(content[idx:idx+400]))

with open("/Users/maxence/Documents/valobois-app/js/app/valobois-app.js", "w", encoding="utf-8") as f:
    f.write(content)
