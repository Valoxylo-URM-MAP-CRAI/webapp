import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const URL_DEPARTEMENTS = 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson';
const URL_CANTONS = 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/cantons-version-simplifiee.geojson';

function resolveDepartementCode(codeRaw) {
    const code = String(codeRaw || '').trim().toUpperCase();
    if (!code) return '';
    if (code.startsWith('2A')) return '2A';
    if (code.startsWith('2B')) return '2B';
    if (/^97\d/.test(code)) return code.slice(0, 3);
    return code.slice(0, 2);
}

function toWindowAssignment(name, value) {
    return 'window.' + name + ' = ' + JSON.stringify(value) + ';\n';
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Échec du téléchargement : ' + url + ' (' + response.status + ')');
    }
    return response.json();
}

function normalizeDepartements(fc) {
    return (fc.features || [])
        .map((feature) => ({
            code: String(((feature || {}).properties || {}).code || '').trim(),
            nom: String(((feature || {}).properties || {}).nom || '').trim()
        }))
        .filter((item) => item.code && item.nom)
        .sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base', numeric: true }));
}

function normalizeCantons(fc) {
    const grouped = {};

    (fc.features || []).forEach((feature) => {
        if (!feature || !feature.properties || !feature.geometry) return;

        const code = String(feature.properties.code || '').trim();
        const nom = String(feature.properties.nom || '').trim();
        const departementCode = resolveDepartementCode(code);

        if (!code || !nom || !departementCode) return;

        if (!grouped[departementCode]) {
            grouped[departementCode] = {
                type: 'FeatureCollection',
                features: []
            };
        }

        grouped[departementCode].features.push({
            type: 'Feature',
            properties: {
                code,
                nom
            },
            geometry: feature.geometry
        });
    });

    Object.keys(grouped).forEach((departementCode) => {
        grouped[departementCode].features.sort((a, b) =>
            String(a.properties.nom || '').localeCompare(String(b.properties.nom || ''), 'fr', { sensitivity: 'base', numeric: true })
        );
    });

    return grouped;
}

async function main() {
    const departementsGeoJson = await fetchJson(URL_DEPARTEMENTS);
    const cantonsGeoJson = await fetchJson(URL_CANTONS);

    const departements = normalizeDepartements(departementsGeoJson);
    const cantonsByDepartement = normalizeCantons(cantonsGeoJson);

    const departementsFile = path.join(rootDir, 'js/data/france-departements.js');
    const cantonsFile = path.join(rootDir, 'js/data/france-cantons.js');

    await fs.writeFile(
        departementsFile,
        '/* Généré par scripts/import-france-geojson.mjs */\n' + toWindowAssignment('VALOBOIS_FRANCE_DEPARTEMENTS', departements),
        'utf8'
    );

    await fs.writeFile(
        cantonsFile,
        '/* Généré par scripts/import-france-geojson.mjs */\n' + toWindowAssignment('VALOBOIS_FRANCE_CANTONS', cantonsByDepartement),
        'utf8'
    );

    console.log('Fichiers générés :');
    console.log('-', departementsFile);
    console.log('-', cantonsFile);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});