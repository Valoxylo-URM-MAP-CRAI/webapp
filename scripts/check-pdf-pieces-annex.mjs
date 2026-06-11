/**
 * Régression annexe pièces PDF paysage + fiches (Phase C).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, '../js/app/valobois-app.js'), 'utf8');

const annexSlice = (() => {
    const start = src.indexOf('buildPdfPiecesDetailAnnexContent(lotIndices');
    if (start < 0) throw new Error('buildPdfPiecesDetailAnnexContent introuvable');
    const open = src.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') {
            depth--;
            if (depth === 0) return src.slice(open, i + 1);
        }
    }
    throw new Error('Corps buildPdfPiecesDetailAnnexContent non parsé');
})();

const exportSlice = (() => {
    const start = src.indexOf('exportSelectedLotsToPdf(lotIndices)');
    return start >= 0 ? src.slice(start, start + 4000) : '';
})();

const asserts = [
    ['buildPdfPieceDetailFiche défini', () => src.includes('buildPdfPieceDetailFiche(entry, lot')],
    ['collectPdfLotPieceAnnexEntries défini', () => src.includes('collectPdfLotPieceAnnexEntries(lot)')],
    ['pièces par défaut regroupées', () => src.includes('groupedDefault: true') && src.includes('collectPdfLotPieceAnnexEntries')],
    ['annexe pièces pageBreak par lot', () => annexSlice.includes("pageBreak: 'before'")],
    ['marges annexe pièces alignées revue complète', () => annexSlice.includes('getPdfRevueCompletePageMargins()')],
    ['table récap avec colonne quantité', () => annexSlice.includes("tpdf('pdf.piece.quantity'")],
    ['fiches via pdfFlatCard', () => src.includes('return this.pdfFlatCard(ficheTitle')],
    ['annexe pièces dans la revue complète PDF', () => {
        const exportBlock = src.slice(src.indexOf('exportSelectedLotsToPdf(lotIndices)'), src.indexOf('exportSelectedLotsToPdf(lotIndices)') + 4000);
        return exportBlock.includes('buildPdfPiecesDetailAnnexContent(validLotIndices)');
    }],
    ['revue complète sans retour portrait', () => !exportSlice.includes("pageOrientation: 'portrait'")],
    ['fiche lot zonage sidebar', () => {
        const fn = src.slice(src.indexOf('buildPdfActiveLotDocDef(lotIndex)'), src.indexOf('buildPdfActiveLotDocDef(lotIndex)') + 25000);
        return fn.includes('buildPdfLotSummaryZonedLayout(currentLot, tpdf')
            && fn.includes('ficheLotPairsForGrid')
            && fn.includes('customInfoPairs')
            && src.includes('buildPdfLotSheetBoundedBlock(')
            && !fn.includes('lotSummaryHalfPage');
    }],
    ['vecteurs actifs multi-colonnes', () => src.includes('buildPdfMultiColumnBulletList')]
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
console.log('check-pdf-pieces-annex: all invariants passed');
