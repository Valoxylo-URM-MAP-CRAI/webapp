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

const getState = sandbox.window.valoboisGetNaturaliteAlertState;
if (typeof getState !== 'function') {
    console.error('valoboisGetNaturaliteAlertState is not defined');
    process.exit(1);
}

const cases = [
    ['Bois Brut Sec (BBS)', '20', 'strong'],
    ['Bois Non Taillé (BNT)', '30', 'strong'],
    ['Bois Équarri Non Scié (BENS)', '40', 'strong'],
    ['Bois Brut Sec (BBS)', '', 'medium'],
    ['Bois Non Taillé (BNT)', '', 'medium'],
    ['Bois Équarri Non Scié (BENS)', '', 'medium'],
    ['Bois Raboté Séché (BRS)', '', 'medium'],
    ['Bois Contre-Collé (CC)', '', 'medium'],
    ['Bois Lamellé-Collé (BLC)', '', 'medium'],
    ['Bois Lamellé-Croisé (CLT)', '', 'medium'],
    ['Bois Ossature (BO)', '', 'medium'],
    ['Bois Fermette (BF)', '', 'medium'],
    ['Bois Massif Abouté (BMA)', '', 'medium'],
    ['Bois Massif Reconstitué (BMR)', '', 'medium'],
    ['Bois Avivé (BA)', '', 'none'],
    ['Panneau Bois (PB)', '', 'none'],
    ['', '20', 'none'],
    ['Type inconnu', '', 'none']
];

let failed = 0;
for (const [typeProduit, diametre, expected] of cases) {
    const actual = getState(typeProduit, diametre);
    if (actual !== expected) {
        console.error(`FAIL: valoboisGetNaturaliteAlertState(${JSON.stringify(typeProduit)}, ${JSON.stringify(diametre)}) = ${actual}, expected ${expected}`);
        failed += 1;
    }
}

if (failed > 0) {
    console.error(`${failed} naturalité alert check(s) failed`);
    process.exit(1);
}

console.log(`OK: ${cases.length} naturalité alert state checks passed`);
