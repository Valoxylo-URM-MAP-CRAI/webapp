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

const getState = sandbox.window.valoboisGetInclusiviteAlertState;
if (typeof getState !== 'function') {
    console.error('valoboisGetInclusiviteAlertState is not defined');
    process.exit(1);
}

function input(regularite, rusticite, deformation, medoideScore) {
    return {
        regulariteLevel: regularite,
        rusticiteLevel: rusticite,
        deformationLevel: deformation,
        medoideScore
    };
}

const cases = [
    [input('Forte', 'Faible', 'Faible', 70), 'strong'],
    [input('Forte', 'Faible', 'Faible', 66), 'strong'],
    [input('Forte', 'Moyenne', 'Faible', 50), 'medium'],
    [input('Moyenne', 'Faible', 'Moyenne', 40), 'medium'],
    [input('Faible', 'Faible', 'Faible', 50), 'low'],
    [input('Forte', 'Forte', 'Faible', 50), 'low'],
    [input('Forte', 'Faible', 'Forte', 50), 'low'],
    [input('Forte', 'Faible', 'Faible', 50), 'medium'],
    [input('Forte', 'Faible', 'Faible', 65.9), 'medium'],
    [input('Forte', 'Moyenne', 'Faible', 70), 'none'],
    [input('Faible', 'Faible', 'Faible', 70), 'none'],
    [input('Forte', 'Forte', 'Forte', 70), 'none'],
    [input('Forte', 'Faible', 'Faible', null), 'none'],
    [input('', 'Faible', 'Faible', 70), 'none'],
    [input('Forte', '', 'Faible', 70), 'none'],
    [input('Forte', 'Faible', '', 70), 'none']
];

let failed = 0;
for (const [payload, expected] of cases) {
    const actual = getState(payload);
    if (actual !== expected) {
        console.error(`FAIL: valoboisGetInclusiviteAlertState(${JSON.stringify(payload)}) = ${actual}, expected ${expected}`);
        failed += 1;
    }
}

if (failed > 0) {
    console.error(`${failed} inclusivité alert check(s) failed`);
    process.exit(1);
}

console.log(`OK: ${cases.length} inclusivité alert state checks passed`);
