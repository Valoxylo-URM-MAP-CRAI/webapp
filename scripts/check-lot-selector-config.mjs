import fs from 'fs';
import path from 'path';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const constantsJs = fs.readFileSync(path.join(rootDir, 'js/app/valobois-constants.js'), 'utf8');

const requiredTriggers = [
    { id: 'activeLotLabel', tag: 'button' },
    { id: 'detailLotActiveLotLabel', tag: 'button' },
    { id: 'seuilsActiveLotLabel', tag: 'button' },
    { id: 'radarActiveLotLabel', tag: 'button' },
    { id: 'scatterDimsActiveLotLabel', tag: 'button' }
];

let failed = 0;

for (const { id, tag } of requiredTriggers) {
    const pattern = new RegExp(`<${tag}[^>]*id="${id}"`, 'i');
    if (!pattern.test(indexHtml)) {
        console.error(`FAIL: index.html must declare <${tag} id="${id}">`);
        failed += 1;
    }
}

const configKeys = ['allotissement', 'detailLot', 'seuils', 'radar', 'scatterDims'];
for (const key of configKeys) {
    if (!constantsJs.includes(`${key}: Object.freeze({ triggerId:`)) {
        console.error(`FAIL: valobois-constants.js missing lot selector config for "${key}"`);
        failed += 1;
    }
}

if (!constantsJs.includes("'allotissement', 'detailLot', 'seuils'")) {
    console.error('FAIL: VALOBOIS_ANALYSIS_LOT_SELECTOR_KEYS must include allotissement and detailLot');
    failed += 1;
}

if (failed > 0) {
    console.error(`${failed} lot selector config check(s) failed`);
    process.exit(1);
}

console.log(`OK: ${configKeys.length} lot selector triggers configured`);
