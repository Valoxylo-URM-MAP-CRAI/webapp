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

loadBrowserScript('js/app/valobois-domain-helpers.js');

const getState = sandbox.window.valoboisGetArtisanaliteAlertState;
if (typeof getState !== 'function') {
    console.error('valoboisGetArtisanaliteAlertState is not defined');
    process.exit(1);
}

const cases = [
    ['Bois Brut Sec (BBS)', 'strong'],
    ['Bois Non Taillé (BNT)', 'strong'],
    ['Bois Avivé (BA)', 'strong'],
    ['Bois Équarri Non Scié (BENS)', 'strong'],
    ['Bois Raboté Séché (BRS)', 'medium'],
    ['Bois Ossature (BO)', 'medium'],
    ['Bois Lamellé-Collé (BLC)', 'low'],
    ['Bois Lamellé-Croisé (CLT)', 'low'],
    ['Bois Massif Abouté (BMA)', 'low'],
    ['Bois Massif Reconstitué (BMR)', 'low'],
    ['Bois Contre-Collé (CC)', 'low'],
    ['Bois Fermette (BF)', 'low'],
    ['', 'none'],
    ['Type inconnu', 'none']
];

let failed = 0;
for (const [input, expected] of cases) {
    const actual = getState(input);
    if (actual !== expected) {
        console.error(`FAIL: valoboisGetArtisanaliteAlertState(${JSON.stringify(input)}) = ${actual}, expected ${expected}`);
        failed += 1;
    }
}

if (failed > 0) {
    console.error(`${failed} artisanalité alert check(s) failed`);
    process.exit(1);
}

console.log(`OK: ${cases.length} artisanalité alert state checks passed`);
