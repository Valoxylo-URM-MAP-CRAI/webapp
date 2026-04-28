/**
 * Génère VALOBOIS_CLIMATE_ALIASES en croisant :
 *   - canton_correspondance.csv  (anciens cantons pré-2015 → nouveaux cantons post-2015)
 *   - climate-humidification-fd-p20-651.js (table climatique, cantons pré-2015)
 *   - france-cantons.js  (référentiel géo, cantons post-2015)
 *
 * Usage :
 *   node scripts/generate-climate-aliases.mjs [--output js/data/climate-...-aliases.js] [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sandbox = { window: {}, console };

function load(rel) {
    const code = fs.readFileSync(path.join(rootDir, rel), 'utf8');
    vm.runInNewContext(code, sandbox, { filename: rel });
}

function normalizeKey(v) {
    return String(v || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toUpperCase().replace(/[^A-Z0-9]+/g, '').trim();
}

function stripLeadingArticle(v) {
    return String(v || '')
        .replace(/^\s*(L['’]|LE\s+|LA\s+|LES\s+|DU\s+|DE\s+|DES\s+)/i, '')
        .trim();
}

function parseCsvLine(line) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (ch === ',' && !inQuotes) {
            out.push(cur);
            cur = '';
        } else {
            cur += ch;
        }
    }
    out.push(cur);
    return out;
}

function findGeoMatch(geoIdx, name) {
    const key = normalizeKey(name);
    if (geoIdx.has(key)) {
        return geoIdx.get(key);
    }

    const stripped = stripLeadingArticle(name);
    const strippedKey = normalizeKey(stripped);

    for (const [geoKey, geoName] of geoIdx.entries()) {
        const geoStrippedKey = normalizeKey(stripLeadingArticle(geoName));
        if (strippedKey && (strippedKey === geoKey || strippedKey === geoStrippedKey)) {
            return geoName;
        }
    }

    if (strippedKey && strippedKey.length >= 5) {
        for (const [geoKey, geoName] of geoIdx.entries()) {
            const geoStrippedKey = normalizeKey(stripLeadingArticle(geoName));
            if (
                geoKey.includes(strippedKey) ||
                strippedKey.includes(geoKey) ||
                geoStrippedKey.includes(strippedKey) ||
                strippedKey.includes(geoStrippedKey)
            ) {
                return geoName;
            }
        }
    }

    return null;
}

// ── Chargement des données JS ──────────────────────────────────────────────
load('js/data/france-departements.js');
load('js/data/france-cantons.js');
load('js/data/climate-humidification-fd-p20-651.js');
load('js/data/climate-humidification-fd-p20-651-aliases.js');

const deps = sandbox.window.VALOBOIS_FRANCE_DEPARTEMENTS;
const cantons = sandbox.window.VALOBOIS_FRANCE_CANTONS;
const climate = sandbox.window.VALOBOIS_CLIMATE_DATA;
const existingAliases = sandbox.window.VALOBOIS_CLIMATE_ALIASES || {};

// ── Index département : code numérique → nom original ─────────────────────
const depByCode = new Map(); // '04' → 'Alpes-de-Haute-Provence'
const depCodeByNormName = new Map(); // 'ALPESDEHAUTEPROVENCE' → '04'

deps.forEach(d => {
    const code = String(d.code || d.num || d.id || '').padStart(2, '0');
    const nom = d.nom || d.name || d.label || '';
    depByCode.set(code, nom);
    depCodeByNormName.set(normalizeKey(nom), code);
});

// ── Index cantons géo post-2015 par département ────────────────────────────
// Map: depCode → Map(normName → nomOriginal)
const geoCantonsByDep = new Map();
// Map: depCode → Map(codeCanton → nomOriginal)
const geoCantonsByCodeByDep = new Map();
for (const [depCode, geojson] of Object.entries(cantons)) {
    const idx = new Map();
    const idxCode = new Map();
    (geojson.features || []).forEach(f => {
        const nom = f.properties?.nom;
        const code = f.properties?.code;
        if (nom) idx.set(normalizeKey(nom), nom);
        if (nom && code) idxCode.set(String(code).trim().toUpperCase(), nom);
    });
    geoCantonsByDep.set(depCode, idx);
    geoCantonsByCodeByDep.set(depCode, idxCode);
}

function canonicalGeoCode(depCode, rawCode) {
    const dep = String(depCode || '').trim().toUpperCase();
    const raw = String(rawCode || '').trim().toUpperCase();
    if (!dep || !raw) return null;

    // Format attendu dans la géo : DEP + 3 chiffres (ex: 04001, 2A001)
    if (raw.startsWith(dep) && raw.length === dep.length + 3) {
        return raw;
    }

    // Format produit par le script Python actuel : DEP + CAN, où CAN contient
    // déjà le DEP (ex: 01 + 0101 => 010101, 2A + 2A01 => 2A2A01).
    const depTwice = dep + dep;
    if (raw.startsWith(depTwice)) {
        const tail = raw.slice(depTwice.length);
        if (/^[0-9]+$/.test(tail)) {
            return dep + tail.padStart(3, '0');
        }
    }

    // Fallback : DEP + suffixe numérique
    if (raw.startsWith(dep)) {
        const tail = raw.slice(dep.length);
        if (/^[0-9]+$/.test(tail)) {
            return dep + tail.slice(-3).padStart(3, '0');
        }
    }

    return null;
}

// ── Chargement du CSV de correspondance ────────────────────────────────────
const csvPath = path.join(rootDir, 'scripts', 'canton_correspondance.csv');
const csvText = fs.readFileSync(csvPath, 'utf8');
const csvLines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/);
const csvHeader = parseCsvLine(csvLines[0]);
const idxDep = csvHeader.indexOf('departement');
const idxAncienCode = csvHeader.indexOf('code_ancien_canton');
const idxAncienNom = csvHeader.indexOf('nom_ancien_canton');
const idxNouveauCode = csvHeader.indexOf('code_nouveau_canton');
const idxNouveauNom = csvHeader.indexOf('nom_nouveau_canton');
const idxNbCom = csvHeader.indexOf('nb_communes');

// correspondanceLookup : depCode|ancienNomNorm → [{ nouveauCode, nouveauNom, nbCom }]
// (plusieurs entrées si le vieux canton couvre plusieurs nouveaux)
const correspondanceLookup = new Map();

for (let i = 1; i < csvLines.length; i++) {
    const row = parseCsvLine(csvLines[i]);
    if (row.length < 4) continue;
    const depCode = String(row[idxDep] || '').trim().replace(/^0+/, '').padStart(2, '0');
    const ancienNom = (row[idxAncienNom] || '').trim();
    const nouveauCode = (row[idxNouveauCode] || '').trim();
    const nouveauNom = (row[idxNouveauNom] || '').trim();
    const nbCom = parseInt(row[idxNbCom] || '0', 10);
    if (!ancienNom || !nouveauNom || !nouveauCode) continue;

    const key = depCode + '|' + normalizeKey(ancienNom);
    if (!correspondanceLookup.has(key)) correspondanceLookup.set(key, []);
    correspondanceLookup.get(key).push({ nouveauCode, nouveauNom, nbCom });
}

// ── Construction des alias ─────────────────────────────────────────────────
const newAliases = {};

// Clone des alias existants
for (const [dep, map] of Object.entries(existingAliases)) {
    newAliases[dep] = { ...map };
}

const stats = { resolved: 0, ambiguous: 0, notFound: 0, alreadyOk: 0 };
const ambiguousCases = [];
const notFoundCases = [];

for (const [depNom, cfg] of Object.entries(climate)) {
    if (!cfg.exceptions) continue;

    const depCode = depCodeByNormName.get(normalizeKey(depNom));
    if (!depCode) continue;

    const geoIdx = geoCantonsByDep.get(depCode) || new Map();
    const geoIdxByCode = geoCantonsByCodeByDep.get(depCode) || new Map();
    const depAliases = newAliases[depNom] || {};

    for (const cantonNom of Object.keys(cfg.exceptions)) {
        // Déjà résolu en géo directement ?
        const directMatch = [...geoIdx.values()].find(c => {
            const cn = normalizeKey(c);
            const en = normalizeKey(cantonNom);
            return cn === en || cn.startsWith(en) || en.startsWith(cn);
        });
        if (directMatch) { stats.alreadyOk++; continue; }

        // Déjà dans les alias existants ?
        if (depAliases[cantonNom]) {
            const t = depAliases[cantonNom];
            if (geoIdx.has(normalizeKey(t))) { stats.alreadyOk++; continue; }
        }

        // Chercher dans la correspondance
        const key = depCode + '|' + normalizeKey(cantonNom);
        const matches = correspondanceLookup.get(key) || [];

        if (matches.length === 0) {
            notFoundCases.push({ dep: depNom, canton: cantonNom });
            stats.notFound++;
            continue;
        }

        // Filtrer sur les cantons qui existent dans la géo
        const geoMatches = matches
            .map(m => {
                const canonCode = canonicalGeoCode(depCode, m.nouveauCode);
                const geoByCode = canonCode ? geoIdxByCode.get(canonCode) : null;
                const geoName = geoByCode || findGeoMatch(geoIdx, m.nouveauNom);
                return geoName ? { ...m, nouveauNom: geoName } : null;
            })
            .filter(Boolean);

        if (geoMatches.length === 0) {
            // Aucun match géo — conserver le meilleur match CSV quand même
            const best = matches.sort((a, b) => b.nbCom - a.nbCom)[0];
            notFoundCases.push({ dep: depNom, canton: cantonNom, csvBest: best.nouveauNom });
            stats.notFound++;
            continue;
        }

        if (geoMatches.length === 1) {
            if (!newAliases[depNom]) newAliases[depNom] = {};
            newAliases[depNom][cantonNom] = geoMatches[0].nouveauNom;
            stats.resolved++;
            continue;
        }

        // Plusieurs correspondances géo → prendre celle avec le plus de communes
        const best = geoMatches.sort((a, b) => b.nbCom - a.nbCom)[0];
        if (!newAliases[depNom]) newAliases[depNom] = {};
        newAliases[depNom][cantonNom] = best.nouveauNom;
        ambiguousCases.push({
            dep: depNom,
            canton: cantonNom,
            chosen: best.nouveauNom,
            others: geoMatches.filter(m => m !== best).map(m => m.nouveauNom),
        });
        stats.ambiguous++;
        stats.resolved++;
    }
}

// ── Rapport ────────────────────────────────────────────────────────────────
console.log('\n=== Résultats ===');
console.log(`  ✓ Déjà en ordre (geo direct ou alias existant) : ${stats.alreadyOk}`);
console.log(`  ✓ Alias résolus automatiquement                : ${stats.resolved - stats.ambiguous}`);
console.log(`  ⚠ Résolus mais avec plusieurs candidats        : ${stats.ambiguous}`);
console.log(`  ✗ Non résolus                                  : ${stats.notFound}`);

if (ambiguousCases.length > 0) {
    console.log('\n=== Cas résolus avec ambiguïté (vérifier manuellement) ===');
    ambiguousCases.forEach(c => {
        console.log(`  ${c.dep} > ${c.canton} → "${c.chosen}" (autres: ${c.others.join(', ')})`);
    });
}

if (notFoundCases.length > 0) {
    console.log('\n=== Cantons non résolus (à traiter manuellement) ===');
    notFoundCases.forEach(c => {
        const note = c.csvBest ? ` (meilleur CSV: "${c.csvBest}", absent de la géo)` : '';
        console.log(`  ${c.dep} > ${c.canton}${note}`);
    });
}

// ── Génération du fichier JS ───────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const outIdx = args.indexOf('--output');
const outFile = outIdx >= 0 ? args[outIdx + 1]
    : 'js/data/climate-humidification-fd-p20-651-aliases.js';

// Trier les alias pour lisibilité
const sortedAliases = {};
for (const dep of Object.keys(newAliases).sort()) {
    const inner = {};
    for (const canton of Object.keys(newAliases[dep]).sort()) {
        inner[canton] = newAliases[dep][canton];
    }
    if (Object.keys(inner).length > 0) sortedAliases[dep] = inner;
}

const js = `// Correspondances cantons pré-2015 → cantons post-2015 (réforme de mars 2015).
// Utilisé par l'application Valobois pour résoudre les cantons de la table
// climatique FD P 20-651 (juin 2011) vers le référentiel géographique actuel.
//
// Généré automatiquement par scripts/generate-climate-aliases.mjs
// Source : COG INSEE 2015 (pré-réforme) + COG INSEE 2023 (post-réforme)
window.VALOBOIS_CLIMATE_ALIASES = ${JSON.stringify(sortedAliases, null, 4)};
`;

if (dryRun) {
    console.log('\n[DRY RUN] Aperçu du fichier généré :');
    console.log(js.slice(0, 800) + '...');
} else {
    const outPath = path.join(rootDir, outFile);
    fs.writeFileSync(outPath, js, 'utf8');
    console.log(`\n✓ Fichier écrit : ${outPath}`);
    console.log(`  ${Object.keys(sortedAliases).length} départements, `
        + `${Object.values(sortedAliases).reduce((n, m) => n + Object.keys(m).length, 0)} alias`);
}
