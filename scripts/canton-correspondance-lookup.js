/**
 * canton-correspondance-lookup.js
 *
 * Lookup anciens cantons (pré-2015) → nouveaux cantons (post-2015)
 * à partir du CSV produit par generate-canton-correspondance.py
 *
 * Format CSV attendu (UTF-8-BOM, séparateur virgule) :
 *   departement, code_ancien_canton, nom_ancien_canton,
 *   code_nouveau_canton, nom_nouveau_canton, nb_communes
 *
 * Usage Node.js :
 *   const lookup = await buildLookup(csvText);
 *   lookup.getNewCantons('HAUTE-SAONE', 'LURE NORD');
 *   // → ['Lure-1', 'Lure-2']
 *
 * Usage navigateur :
 *   const resp = await fetch('canton_correspondance.csv');
 *   const lookup = await buildLookup(await resp.text());
 */

'use strict';

// ── Normalisation identique à celle du script QA ─────────────────────────────

/**
 * Normalise un nom de canton pour la comparaison :
 * strip accents → majuscules → supprime tout sauf A-Z0-9
 * "Barcelonnette" → "BARCELONNETTE"
 * "Lure-1"        → "LURE1"
 */
function normalizeKey(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '')
        .trim();
}

// ── Parsing CSV minimaliste (RFC 4180, pas de quotes imbriquées complexes) ────

function parseCSV(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) return [];

    // Détecte séparateur
    const header = lines[0];
    const sep = header.includes(';') ? ';' : ',';

    const headers = header.split(sep).map(h => h.replace(/^\uFEFF/, '').trim());

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(sep);
        const row = {};
        headers.forEach((h, idx) => { row[h] = (cols[idx] ?? '').trim(); });
        rows.push(row);
    }
    return rows;
}

// ── Construction de l'index de lookup ────────────────────────────────────────

/**
 * Construit un objet lookup à partir du texte CSV.
 *
 * Clé interne : `${depKey}|${ancienKey}` (normalisés)
 *
 * @param {string} csvText - Contenu du fichier canton_correspondance.csv
 * @returns {CantonLookup}
 */
function buildLookup(csvText) {
    const rows = parseCSV(csvText);

    /**
     * Index principal :
     * Map< `${depKey}|${ancienKey}` → Array<{ nom, code, nb_communes }> >
     * Trié par nb_communes décroissant (nouveau canton majoritaire en premier).
     */
    const index = new Map();

    for (const row of rows) {
        const dep  = row['departement']         ?? '';
        const codeA = row['code_ancien_canton']  ?? '';
        const nomA  = row['nom_ancien_canton']   ?? '';
        const codeN = row['code_nouveau_canton'] ?? '';
        const nomN  = row['nom_nouveau_canton']  ?? '';
        const nb    = parseInt(row['nb_communes'] ?? '0', 10) || 0;

        if (!dep || !codeA || !codeN) continue;

        const depKey    = normalizeKey(dep);
        const ancienKey = normalizeKey(nomA || codeA);
        const mapKey    = `${depKey}|${ancienKey}`;

        if (!index.has(mapKey)) {
            index.set(mapKey, { dep, codeAncien: codeA, nomAncien: nomA, nouveaux: [] });
        }
        index.get(mapKey).nouveaux.push({ nom: nomN, code: codeN, nb_communes: nb });
    }

    // Trier chaque liste par nb_communes décroissant (canton héritant le plus de communes en tête)
    for (const entry of index.values()) {
        entry.nouveaux.sort((a, b) => b.nb_communes - a.nb_communes);
    }

    return new CantonLookup(index);
}

// ── Classe CantonLookup ───────────────────────────────────────────────────────

class CantonLookup {
    /** @param {Map} index */
    constructor(index) {
        this._index = index;
    }

    /**
     * Retourne tous les nouveaux cantons correspondant à un ancien canton.
     *
     * @param {string} departementNom - Nom du département (ex: 'HAUTE-SAONE', 'Haute-Saône')
     * @param {string} ancienCantonNom - Nom de l'ancien canton (ex: 'LURE NORD')
     * @returns {Array<{nom: string, code: string, nb_communes: number}>}
     *   Tableau trié par nb_communes décroissant. Vide si non trouvé.
     */
    getNewCantons(departementNom, ancienCantonNom) {
        const depKey    = normalizeKey(departementNom);
        const ancienKey = normalizeKey(ancienCantonNom);
        const entry = this._index.get(`${depKey}|${ancienKey}`);
        return entry ? entry.nouveaux : [];
    }

    /**
     * Retourne le nom du nouveau canton majoritaire (le plus de communes en commun),
     * ou null si aucune correspondance.
     *
     * @param {string} departementNom
     * @param {string} ancienCantonNom
     * @returns {string|null}
     */
    getPrimaryNewCanton(departementNom, ancienCantonNom) {
        const result = this.getNewCantons(departementNom, ancienCantonNom);
        return result.length > 0 ? result[0].nom : null;
    }

    /**
     * Retourne tous les noms de nouveaux cantons sous forme de tableau de chaînes.
     *
     * @param {string} departementNom
     * @param {string} ancienCantonNom
     * @returns {string[]}
     */
    getNewCantonNames(departementNom, ancienCantonNom) {
        return this.getNewCantons(departementNom, ancienCantonNom).map(c => c.nom);
    }

    /**
     * Vérifie si un ancien canton a une correspondance dans l'index.
     *
     * @param {string} departementNom
     * @param {string} ancienCantonNom
     * @returns {boolean}
     */
    has(departementNom, ancienCantonNom) {
        return this._index.has(
            `${normalizeKey(departementNom)}|${normalizeKey(ancienCantonNom)}`
        );
    }

    /**
     * Retourne toutes les entrées pour un département donné.
     *
     * @param {string} departementNom
     * @returns {Array<{dep, codeAncien, nomAncien, nouveaux}>}
     */
    getByDepartement(departementNom) {
        const depKey = normalizeKey(departementNom);
        const result = [];
        for (const [key, entry] of this._index.entries()) {
            if (key.startsWith(`${depKey}|`)) result.push(entry);
        }
        return result;
    }

    /** Nombre d'anciens cantons indexés. */
    get size() {
        return this._index.size;
    }
}

// ── Exports ───────────────────────────────────────────────────────────────────

// Node.js / CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildLookup, normalizeKey, CantonLookup };
}

// ES Module (si renommé en .mjs ou via bundler)
// export { buildLookup, normalizeKey, CantonLookup };

// ── Exemple d'utilisation (Node.js) ──────────────────────────────────────────
//
// const fs = require('fs');
// const { buildLookup } = require('./canton-correspondance-lookup.js');
//
// const csvText = fs.readFileSync('canton_correspondance.csv', 'utf-8');
// const lookup = buildLookup(csvText);
//
// console.log(lookup.size, 'anciens cantons indexés');
//
// // Ancien canton unique → 1 nouveau
// console.log(lookup.getNewCantonNames('HAUTE-SAONE', 'LURE NORD'));
// // → ['Lure-1']  ou  ['Lure-1', 'Lure-2'] si à cheval
//
// // Générer automatiquement des suggestions d'alias pour valobois
// const aliases = {};
// for (const [depNom, exceptions] of Object.entries(window.VALOBOIS_CLIMATE_DATA)) {
//     for (const ancienCanton of Object.keys(exceptions.exceptions ?? {})) {
//         const noms = lookup.getNewCantonNames(depNom, ancienCanton);
//         if (noms.length === 1) {
//             aliases[depNom] ??= {};
//             aliases[depNom][ancienCanton] = noms[0];
//         }
//     }
// }
// console.log(JSON.stringify(aliases, null, 4));
