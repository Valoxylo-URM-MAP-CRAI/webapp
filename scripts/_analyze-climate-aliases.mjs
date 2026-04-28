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
function isCantonMatch(cur, exc) {
    const c = normalizeKey(cur), e = normalizeKey(exc);
    if (!c || !e) return false;
    return c === e || c.startsWith(e) || e.startsWith(c);
}

load('js/data/france-departements.js');
load('js/data/france-cantons.js');
load('js/data/climate-humidification-fd-p20-651.js');
load('js/data/climate-humidification-fd-p20-651-aliases.js');

const deps = sandbox.window.VALOBOIS_FRANCE_DEPARTEMENTS;
const cantons = sandbox.window.VALOBOIS_FRANCE_CANTONS;
const climate = sandbox.window.VALOBOIS_CLIMATE_DATA;
const aliases = sandbox.window.VALOBOIS_CLIMATE_ALIASES || {};

const depMap = new Map();
deps.forEach(d => depMap.set(normalizeKey(d.nom || d.name || d.label), d));

const unknowns = [];
const ambiguous = [];

Object.entries(climate).forEach(([depNom, cfg]) => {
    const depKey = normalizeKey(depNom);
    const depEntry = depMap.get(depKey);
    const cantonNames = depEntry && cantons[depEntry.code]
        ? cantons[depEntry.code].features.map(f => f.properties.nom).filter(Boolean)
        : null;

    const depAliases = aliases[depNom] || {};

    if (!cfg.exceptions) return;
    Object.entries(cfg.exceptions).forEach(([cantonNom, level]) => {
        if (!cantonNames) return;
        const aliasTarget = depAliases[cantonNom];
        let matches;
        if (aliasTarget) {
            const targetKey = normalizeKey(aliasTarget);
            matches = cantonNames.filter(c => normalizeKey(c) === targetKey);
        } else {
            matches = cantonNames.filter(c => isCantonMatch(c, cantonNom));
        }
        if (matches.length === 0) unknowns.push({ dep: depNom, canton: cantonNom, geoCantons: cantonNames });
        else if (matches.length > 1) ambiguous.push({ dep: depNom, canton: cantonNom, matches });
    });
});

console.log('=== UNKNOWNS (' + unknowns.length + ') ===');
unknowns.forEach(u => {
    const norm = normalizeKey(u.canton);
    const candidates = u.geoCantons.filter(c => {
        const cn = normalizeKey(c);
        return cn.includes(norm.slice(0, 4)) || norm.includes(cn.slice(0, 4));
    }).slice(0, 5);
    console.log(u.dep + ' > ' + u.canton + (candidates.length ? ' | candidates: ' + candidates.join(', ') : ' | [none]'));
});
console.log('');
console.log('=== AMBIGUOUS (' + ambiguous.length + ') ===');
ambiguous.forEach(a => {
    console.log(a.dep + ' > ' + a.canton + ' | matches: ' + a.matches.join(', '));
});
console.log('');
console.log('=== ALL GEO CANTONS BY DEP (for unknown deps) ===');
unknowns.forEach(u => {
    const depKey = normalizeKey(u.dep);
    const depEntry = depMap.get(depKey);
    if (depEntry) {
        const all = cantons[depEntry.code] ? cantons[depEntry.code].features.map(f => f.properties.nom) : [];
        console.log('DEP ' + u.dep + ' (' + depEntry.code + ') [' + all.length + ' cantons]: ' + all.join(' | '));
    }
});
