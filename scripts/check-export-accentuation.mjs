/**
 * Régression accentuation FR — libellés visibles dans les exports PDF/CSV.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appSrc = fs.readFileSync(path.join(__dirname, '../js/app/valobois-app.js'), 'utf8');
const constantsSrc = fs.readFileSync(path.join(__dirname, '../js/app/valobois-constants.js'), 'utf8');

const exportStart = appSrc.indexOf('getPdfText(_key');
const exportEnd = appSrc.indexOf('exportToCsv(mode = ');
const exportBlock = appSrc.slice(exportStart, exportEnd);
const pdfMapBlock = constantsSrc.slice(
    constantsSrc.indexOf('VALOBOIS_PDF_TEXT_MAP'),
    constantsSrc.indexOf('global.VALOBOIS_PDF_TEXT_MAP')
);

function frenchLines(block) {
    return block
        .split('\n')
        .filter((line) => !/\ben:\s*'/.test(line) && !/\ben:\s*"/.test(line));
}

const frenchExportText = [
    ...frenchLines(exportBlock),
    ...frenchLines(pdfMapBlock)
].join('\n');

const forbidden = [
    ['Confirmee', 'Confirmée'],
    ['Forcee', 'Forcée'],
    ['Deduite', 'Déduite'],
    ['confirmee', 'confirmée'],
    ['deduite par elimination', 'déduite par élimination'],
    ['par elimination, non confirmee', 'par élimination, non confirmée'],
    ['Hauteur / Epaisseur', 'Hauteur / Épaisseur'],
    ['Age arbre', 'Âge arbre'],
    ['Epaisseur moyenne', 'Épaisseur moyenne'],
    ['Delta epaisseur', 'Delta épaisseur'],
    ['VALOBOIS - Evaluation', 'VALOBOIS - Évaluation']
];

const required = [
    ['Confirmée', 'statut orientation confirmée'],
    ['Forcée', 'statut orientation forcée'],
    ['Déduite (non confirmée)', 'statut combustion déduite'],
    ['Orientation déduite par élimination', 'alerte combustion'],
    ['VALOBOIS - Évaluation', 'titre document PDF'],
    ['Hauteur / Épaisseur', 'libellé épaisseur lot/pièce'],
    ['Âge arbre', 'libellé âge arbre CSV'],
    ['Pièce type du lot', 'carte pièce type PDF'],
    ['Homogénéité & hétérogénéité', 'carte homogénéité PDF'],
    ['Seuils & conformité', 'carte seuils PDF'],
    ['Variation (± %)', 'libellé variation CSV']
];

let failed = 0;

for (const [bad, hint] of forbidden) {
    if (frenchExportText.includes(bad)) {
        console.error(`FAIL : trouvé « ${bad} » — attendu : ${hint}`);
        failed++;
    }
}

const combined = exportBlock + pdfMapBlock;
for (const [good, label] of required) {
    if (!combined.includes(good)) {
        console.error(`FAIL : libellé attendu absent (${label}) : « ${good} »`);
        failed++;
    } else {
        console.log('OK:', label);
    }
}

if (failed) {
    console.error(`\n${failed} problème(s) d'accentuation export.`);
    process.exit(1);
}

console.log('\nAccentuation export OK.');
