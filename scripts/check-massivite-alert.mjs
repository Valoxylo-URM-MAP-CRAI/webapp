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

const getState = sandbox.window.valoboisGetMassiviteAlertState;
if (typeof getState !== 'function') {
    console.error('valoboisGetMassiviteAlertState is not defined');
    process.exit(1);
}

const cases = [
    ['120', 'strong'],
    ['75.1', 'strong'],
    ['50', 'medium'],
    ['28.1', 'medium'],
    ['20', 'low'],
    ['28', 'low'],
    ['', 'none'],
    [null, 'none']
];

let failed = 0;
for (const [input, expected] of cases) {
    const actual = getState(input);
    if (actual !== expected) {
        console.error(`FAIL: valoboisGetMassiviteAlertState(${JSON.stringify(input)}) = ${actual}, expected ${expected}`);
        failed += 1;
    }
}

const appCode = fs.readFileSync(path.join(rootDir, 'js/app/valobois-app.js'), 'utf8');
const modalMarkers = [
    'Massivité : ${levelLabel}',
    'Logique de l\\\'alerte Massivité.',
    '- Forte : épaisseur > 75 mm',
    'Pour les critères détaillés BLC/BMA (lamelles, chant), voir le bouton info du critère Massivité.'
];
for (const marker of modalMarkers) {
    if (!appCode.includes(marker)) {
        console.error(`FAIL: buildMassiviteAlertModalMessage missing marker: ${marker}`);
        failed += 1;
    }
}

if (failed > 0) {
    console.error(`${failed} massivité alert check(s) failed`);
    process.exit(1);
}

console.log(`OK: ${cases.length} massivité alert state checks passed, modal text markers verified`);
