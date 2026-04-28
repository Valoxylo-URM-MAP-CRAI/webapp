import fs from 'fs';
import path from 'path';
import vm from 'vm';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sandbox = { window: {}, console };

function loadBrowserScript(relativePath) {
    const absolutePath = path.join(rootDir, relativePath);
    const code = fs.readFileSync(absolutePath, 'utf8');
    vm.runInNewContext(code, sandbox, { filename: relativePath });
}

function normalizeKey(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '')
        .trim();
}

function isCantonMatch(currentCantonName, exceptionCantonName) {
    const currentKey = normalizeKey(currentCantonName);
    const exceptionKey = normalizeKey(exceptionCantonName);
    if (!currentKey || !exceptionKey) return false;
    if (currentKey === exceptionKey) return true;
    return currentKey.startsWith(exceptionKey) || exceptionKey.startsWith(currentKey);
}

loadBrowserScript('js/data/france-departements.js');
loadBrowserScript('js/data/france-cantons.js');
loadBrowserScript('js/data/climate-humidification-fd-p20-651.js');
loadBrowserScript('js/data/climate-humidification-fd-p20-651-aliases.js');

const allowedLevels = new Set(['Seche', 'Moderee', 'Humide']);
const departements = Array.isArray(sandbox.window.VALOBOIS_FRANCE_DEPARTEMENTS)
    ? sandbox.window.VALOBOIS_FRANCE_DEPARTEMENTS
    : [];
const cantonsByDepartement = sandbox.window.VALOBOIS_FRANCE_CANTONS && typeof sandbox.window.VALOBOIS_FRANCE_CANTONS === 'object'
    ? sandbox.window.VALOBOIS_FRANCE_CANTONS
    : {};
const climateTable = sandbox.window.VALOBOIS_CLIMATE_DATA && typeof sandbox.window.VALOBOIS_CLIMATE_DATA === 'object'
    ? sandbox.window.VALOBOIS_CLIMATE_DATA
    : {};
const climateAliases = sandbox.window.VALOBOIS_CLIMATE_ALIASES && typeof sandbox.window.VALOBOIS_CLIMATE_ALIASES === 'object'
    ? sandbox.window.VALOBOIS_CLIMATE_ALIASES
    : {};

const aliasIndexByDepartement = new Map();
Object.entries(climateAliases).forEach(([departementNom, aliases]) => {
    const depKey = normalizeKey(departementNom);
    if (!depKey || !aliases || typeof aliases !== 'object') return;

    const depAliases = new Map();
    Object.entries(aliases).forEach(([normativeName, targetName]) => {
        const normativeKey = normalizeKey(normativeName);
        const targetKey = normalizeKey(targetName);
        if (!normativeKey || !targetKey) return;
        depAliases.set(normativeKey, targetKey);
    });

    aliasIndexByDepartement.set(depKey, depAliases);
});

function resolveAliasTargetKey(departementNom, exceptionCantonName) {
    const depKey = normalizeKey(departementNom);
    const exceptionKey = normalizeKey(exceptionCantonName);
    if (!depKey || !exceptionKey) return null;

    const depAliases = aliasIndexByDepartement.get(depKey);
    return depAliases ? (depAliases.get(exceptionKey) || null) : null;
}

const departementsByKey = new Map();
departements.forEach((entry) => {
    const depKey = normalizeKey(entry && (entry.nom || entry.name || entry.label));
    if (depKey) departementsByKey.set(depKey, entry);
});

const report = {
    invalidDepartmentLevels: [],
    invalidExceptionLevels: [],
    unknownDepartments: [],
    unknownCantons: [],
    ambiguousCantons: []
};

Object.entries(climateTable).forEach(([departementNom, config]) => {
    if (!config || typeof config !== 'object') return;

    const depKey = normalizeKey(departementNom);
    const depLevel = String(config.defaut || '').trim();
    if (!allowedLevels.has(depLevel)) {
        report.invalidDepartmentLevels.push(`${departementNom}: ${depLevel || '(vide)'}`);
    }

    const departementEntry = departementsByKey.get(depKey);
    if (!departementEntry) {
        report.unknownDepartments.push(departementNom);
    }

    let cantonNames = null;
    if (departementEntry && departementEntry.code) {
        const departmentFeatures = cantonsByDepartement[departementEntry.code];
        if (departmentFeatures && Array.isArray(departmentFeatures.features)) {
            cantonNames = [];
            departmentFeatures.features.forEach((feature) => {
                const cantonName = feature && feature.properties && feature.properties.nom;
                if (!cantonName) return;
                cantonNames.push(String(cantonName));
            });
        }
    }

    const exceptions = config.exceptions && typeof config.exceptions === 'object' ? config.exceptions : {};
    Object.entries(exceptions).forEach(([cantonNom, level]) => {
        const exceptionLevel = String(level || '').trim();
        if (!allowedLevels.has(exceptionLevel)) {
            report.invalidExceptionLevels.push(`${departementNom} > ${cantonNom}: ${exceptionLevel || '(vide)'}`);
        }

        if (!cantonNames) return;

        const aliasTargetKey = resolveAliasTargetKey(departementNom, cantonNom);
        const matchCount = aliasTargetKey
            ? cantonNames.filter((candidate) => normalizeKey(candidate) === aliasTargetKey).length
            : cantonNames.filter((candidate) => isCantonMatch(candidate, cantonNom)).length;

        if (matchCount === 0) {
            report.unknownCantons.push(`${departementNom} > ${cantonNom}`);
        } else if (matchCount > 1) {
            report.ambiguousCantons.push(`${departementNom} > ${cantonNom}`);
        }
    });
});

const summary = Object.fromEntries(
    Object.entries(report).map(([key, values]) => [key, values.length])
);
const hasIssues = Object.values(summary).some((count) => count > 0);

console.log(JSON.stringify({ summary, samples: Object.fromEntries(
    Object.entries(report).map(([key, values]) => [key, values.slice(0, 20)])
) }, null, 2));

if (hasIssues) {
    process.exitCode = 1;
}