with open('/Users/maxence/Documents/valobois-app/js/app/valobois-app.js', 'r', encoding='utf-8') as f:
    content = f.read()

old = (
    "        documentationTraces: `Documentation.\n\n"
    "Noter la disponibilit\u00e9 d\u2019une documentation permettant d\u2019\u00e9valuer des crit\u00e8res physiques/chimiques des bois et les usages ant\u00e9rieurs de l\u2019ouvrage.\n\n"
    "Une documentation \u00ab forte \u00bb vaut pour des \u00e9l\u00e9ments m\u00e9caniques, historiques ou \u00e9cologiques d\u00e9taill\u00e9s [+3].\n"
    "Une documentation \u00ab moyenne \u00bb vaut pour une origine connue mais des \u00e9l\u00e9ments d\u2019usage partiels [+1].\n"
    "Une documentation \u00ab faible \u00bb vaut pour une origine inconnue ou incertaine [-3].`,"
)

new = (
    "        documentationTraces: `Documentation.\n\n"
    "Noter la disponibilit\u00e9 d\u2019une documentation permettant d\u2019\u00e9valuer des crit\u00e8res physiques ou chimiques des bois et les usages ant\u00e9rieurs de l\u2019ouvrage les contenant.\n\n"
    "Une documentation \u00ab forte \u00bb vaut pour des \u00e9l\u00e9ments d\u2019ordre m\u00e9canique (notes de calculs, classements de bois), d\u2019ordre historique (plans, occupation des espaces) ou d\u2019ordre \u00e9cologique (essence de bois, durabilit\u00e9 naturelle ou conf\u00e9r\u00e9, activit\u00e9s autour des bois) [+3].\n"
    "Une documentation \u00ab moyenne \u00bb vaut pour des bois dont l\u2019origine est connue (lieu d\u2019extraction), mais dont les \u00e9l\u00e9ments relatifs \u00e0 leur usage sont partiels ou indirects [+1].\n"
    "Une documentation \u00ab faible \u00bb vaut pour de pi\u00e8ces bois dont l\u2019origine est inconnue ou incertaine [-3].`,"
)

if old in content:
    content = content.replace(old, new)
    with open('/Users/maxence/Documents/valobois-app/js/app/valobois-app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("NOT FOUND")
    # Debug: find the actual content
    idx = content.find("documentationTraces: `Documentation")
    if idx >= 0:
        print(repr(content[idx:idx+400]))
