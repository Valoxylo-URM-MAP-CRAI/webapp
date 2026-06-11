/**
 * Régression export pièce type / similarité / conformité (PDF, CSV, IFC).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, '../js/app/valobois-app.js'), 'utf8');

const asserts = [
    ['getLotPieceTypeExportContext défini', () => src.includes('getLotPieceTypeExportContext(lot)')],
    ['buildPdfLotPieceTypeSimilarityCards défini', () => src.includes('buildPdfLotPieceTypeSimilarityCards(lot, tpdf')],
    ['buildPdfLotSummaryZonedLayout défini', () => src.includes('buildPdfLotSummaryZonedLayout(lot, tpdf')],
    ['getPdfLotLocalisationExportPairs défini', () => src.includes('getPdfLotLocalisationExportPairs(lot, tpdf')],
    ['buildPdfLotPieceTypeSimilarityCompactStack défini', () => src.includes('buildPdfLotPieceTypeSimilarityCompactStack(lot, tpdf')],
    ['getLotPieceTypeSimilarityCsvFieldDefs défini', () => src.includes('getLotPieceTypeSimilarityCsvFieldDefs()')],
    ['CSV détail pièce type colonnes', () => {
        const block = src.slice(src.indexOf('buildCsvRowsForPiecesDetailed(lotIndices)'), src.indexOf('buildCsvRowsForLots(lotIndices)'));
        return block.includes('getLotPieceTypeSimilarityCsvFieldDefs().map((field) => field.label)')
            && block.includes('getLotPieceTypeSimilarityCsvValues(lot)')
            && !block.includes('CV longueur lot (%)')
            && !block.includes('Conformité lot');
    }],
    ['CSV synthèse pièce type colonnes', () => {
        const block = src.slice(src.indexOf('buildCsvRowsForLots(lotIndices)'), src.indexOf('exportToCsv(mode = '));
        const fields = src.slice(src.indexOf('getLotPieceTypeSimilarityCsvFieldDefs()'), src.indexOf('getLotPieceTypeSimilarityCsvValues(lot)'));
        return block.includes('...this.getLotPieceTypeSimilarityCsvFieldDefs()')
            && fields.includes("'Pièce type (nom)'");
    }],
    ['IFC Pset pièce type', () => src.includes("psetName: 'Pset_Valobois_PieceTypeConformite'")
        && src.includes('pieceTypeConformite:')],
    ['PDF sans dispersionPairs', () => {
        const start = src.indexOf('buildPdfActiveLotDocDef(lotIndex)');
        const end = src.indexOf('normalizeDecimalForCsv(value)', start);
        const fn = end > start ? src.slice(start, end) : src.slice(start, start + 50000);
        return !fn.includes('dispersionPairs') && fn.includes('buildPdfLotSummaryZonedLayout(currentLot, tpdf');
    }],
    ['libellés UI alignés', () => src.includes("'Score médoïde (%)'")
        && src.includes("'Variation (± %)'")
        && src.includes("'Écart pièce extrême (Δ %)'")]
];

let failed = 0;
for (const [label, test] of asserts) {
    if (!test()) {
        console.error('FAIL:', label);
        failed++;
    } else {
        console.log('OK:', label);
    }
}

if (failed) process.exit(1);
console.log('check-pdf-piece-type-export: all invariants passed');
