/**
 * Régression structure page de garde PDF (Phases B + D).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, '../js/app/valobois-app.js'), 'utf8');

const identiteBlock = (() => {
    const start = src.indexOf('buildPdfGardeIdentiteContent(validLotIndices');
    return start >= 0 ? src.slice(start, start + 1200) : '';
})();

const zonedSlice = (() => {
    const sig = 'buildPdfOperationSheetZonedLayout(pairs, meta, tpdf, options = {}) {';
    const start = src.indexOf(sig);
    if (start < 0) return '';
    const open = start + sig.length - 1;
    let depth = 0;
    for (let i = open; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') {
            depth--;
            if (depth === 0) return src.slice(open, i + 1);
        }
    }
    return '';
})();

const syntheseSlice = (() => {
    const start = src.indexOf('buildPdfGardeSyntheseContent(validLotIndices');
    return start >= 0 ? src.slice(start, start + 800) : '';
})();

const synthesisZonedSlice = (() => {
    const sig = 'buildPdfSynthesisZonedLayout(validLotIndices, tpdf, options = {}) {';
    const start = src.indexOf(sig);
    if (start < 0) return '';
    const open = start + sig.length - 1;
    let depth = 0;
    for (let i = open; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') {
            depth--;
            if (depth === 0) return src.slice(open, i + 1);
        }
    }
    return '';
})();

const contactsSlice = (() => {
    const sig = 'buildPdfGardeContactsContent() {';
    const start = src.indexOf(sig);
    return start >= 0 ? src.slice(start, start + 120) : '';
})();

const asserts = [
    ['buildPdfGardeIdentiteContent défini', () => src.includes('buildPdfGardeIdentiteContent(validLotIndices')],
    ['buildPdfOperationSheetZonedLayout défini', () => src.includes('buildPdfOperationSheetZonedLayout(pairs, meta, tpdf')],
    ['buildPdfOperationSheetBoundedBlock défini', () => src.includes('buildPdfOperationSheetBoundedBlock(title, pairs')],
    ['buildPdfGardeContactsContent défini', () => src.includes('buildPdfGardeContactsContent()')],
    ['buildPdfGardeContexteContent défini', () => src.includes('buildPdfGardeContexteContent()')],
    ['buildPdfGardePemdContent défini', () => src.includes('buildPdfGardePemdContent()')],
    ['buildPdfGardeSyntheseContent défini', () => src.includes('buildPdfGardeSyntheseContent(validLotIndices')],
    ['buildPdfSynthesisZonedLayout défini', () => src.includes('buildPdfSynthesisZonedLayout(validLotIndices, tpdf')],
    ['buildPdfSynthesisSheetBoundedBlock défini', () => src.includes('buildPdfSynthesisSheetBoundedBlock(title, bodyContent')],
    ['cover utilise buildPdfGardeContent', () => /buildPdfSelectedLotsCoverContent[\s\S]{0,120}buildPdfGardeContent/.test(src)],
    ['page de couverture revue complète', () => src.includes('buildPdfRevueCompleteCoverPage(')
        && src.includes('getPdfValoxyloLogoSvg(')
        && src.includes('buildPdfCoverMetaRow(')
        && src.includes('formatPdfExportDateDisplay(')
        && (() => {
            const fnStart = src.indexOf('buildPdfRevueCompleteCoverPage(_validLotIndices');
            const fnEnd = src.indexOf('    /** Marges communes à l\'export PDF « Revue complète » (paysage). */', fnStart);
            const fn = fnStart >= 0 && fnEnd > fnStart ? src.slice(fnStart, fnEnd) : '';
            const metaRowStart = src.indexOf('buildPdfCoverMetaRow(label, value, f)');
            const metaRowEnd = src.indexOf('formatPdfExportDateDisplay(date', metaRowStart);
            const metaRowFn = metaRowStart >= 0 && metaRowEnd > metaRowStart ? src.slice(metaRowStart, metaRowEnd) : '';
            return fn.includes("tpdf('pdf.meta.diagnosticianWood'")
                && fn.includes("tpdf('pdf.meta.location'")
                && fn.includes("tpdf('pdf.meta.versionEtude'")
                && fn.includes("tpdf('pdf.meta.statutEtude'")
                && fn.includes("tpdf('pdf.cover.exportDate'")
                && fn.includes('getPdfRevueCompleteCoverVerticalLayout(pageMargins)')
                && fn.includes('heights: [topSpacerPt, contentZonePt]')
                && fn.includes('verticalAlignment: \'middle\'')
                && fn.includes('stack: metaRows')
                && !fn.includes('coverMetaBlockWidth')
                && metaRowFn.includes("width: '*'")
                && metaRowFn.includes("alignment: 'right'")
                && metaRowFn.includes("alignment: 'left'");
        })()],
    ['synthèse utilise buildPdfGardeContent', () => /buildPdfSynthesisDocDef[\s\S]{0,800}buildPdfGardeContent/.test(src)],
    ['plus de buildPdfOperationMetaSections', () => !src.includes('buildPdfOperationMetaSections')],
    ['contacts fusionnés dans fiche opération', () => contactsSlice.includes('return [];')
        && zonedSlice.includes('buildPdfOperationSheetContactBlock')],
    ['fiche opération 4 colonnes maquette', () => zonedSlice.includes('getPdfOperationSheetColumnWeights()')
        && zonedSlice.includes('colWeights')
        && zonedSlice.includes('getPdfOperationSheetColumnGapPt()')
        && !zonedSlice.includes('col1Width')
        && !zonedSlice.includes("colWidth = '20%'")],
    ['proportions colonnes 50/60/80/80 mm', () => zonedSlice.includes('getPdfOperationSheetColumnWeights()')
        && zonedSlice.includes('getPdfSheetColumnWidthsPt(colWeights')
        && zonedSlice.includes('width: colWidthsPt[0]')
        && zonedSlice.includes('width: colWidthsPt[3]')
        && !zonedSlice.includes('width: colWeights')],
    ['hauteurs cibles opération', () => zonedSlice.includes('100 * MM_TO_PT')
        && zonedSlice.includes('50 * MM_TO_PT')
        && zonedSlice.includes('90 * MM_TO_PT')
        && zonedSlice.includes('30 * MM_TO_PT')
        && zonedSlice.includes('60 * MM_TO_PT')
        && zonedSlice.includes('120 * MM_TO_PT')
        && zonedSlice.includes('buildPdfZonedSheetPageTitle')
        && zonedSlice.includes('buildPdfOperationSheetBoundedBlock')],
    ['visite PEMD colonne 4', () => zonedSlice.includes('pdf.card.pemdVisit')
        && zonedSlice.includes('pemdVisitPairs')],
    ['notes commentaires colonne 3', () => zonedSlice.includes('pdf.card.notesComments')
        && zonedSlice.includes('pdf.meta.commentaires')
        && zonedSlice.includes('notesPairs')],
    ['sans inspection dans fiche opération', () => !identiteBlock.includes('buildPdfGardeLotsInspectionContent')],
    ['Diagnostiqueur (Bois) dans référence', () => src.includes("'Diagnostiqueur (Bois)'")],
    ['contacts sans libellé structure redondant', () => src.includes('buildPdfOperationSheetContactBlock')
        && src.includes('standardLabels')],
    ['titre fiche opération aligné à gauche', () => zonedSlice.includes('buildPdfZonedSheetPageTitle')
        && src.includes('getPdfZonedSheetPageTitleFontSize')
        && src.includes("alignment: 'left'")],
    ['synthèse lots pageBreak revue complète', () => syntheseSlice.includes("synthesePage.pageBreak = 'before'")],
    ['synthèse page unique zonée', () => synthesisZonedSlice.includes('buildPdfZonedSheetPageTitle')
        && synthesisZonedSlice.includes('evalHeightPt')
        && synthesisZonedSlice.includes('scoresHeightPt')
        && synthesisZonedSlice.includes('lotsHeightPt')
        && synthesisZonedSlice.includes('bottomColWeights')
        && synthesisZonedSlice.includes('getPdfSheetColumnWidthsPt(bottomColWeights')
        && synthesisZonedSlice.includes('width: bottomColWidthsPt[0]')
        && !synthesisZonedSlice.includes('width: bottomColWeights')
        && synthesisZonedSlice.includes('getPdfOperationSheetColumnGapPt()')
        && synthesisZonedSlice.includes('buildPdfOperationEvalContent(validLotIndices)')
        && synthesisZonedSlice.includes("buildPdfLotsSummaryCardContent(summaryEntries, 'scoresTable')")
        && synthesisZonedSlice.includes("buildPdfLotsSummaryCardContent(summaryEntries, 'identityTable')")
        && !syntheseSlice.includes('scoresEvalBody')
        && !syntheseSlice.includes('pdf.cover.selectedLots')],
    ['marges fiche opération 10/10/17/10 mm', () => src.includes('getPdfOperationSheetPageMargins()')
        && src.includes('17 * MM_TO_PT')],
    ['sanitizePdfFieldText défini', () => src.includes('sanitizePdfFieldText(value, fieldKind')],
    ['pdfKeyValueGrid f option', () => {
        const fn = src.slice(src.indexOf('pdfKeyValueGrid(pairs'), src.indexOf('pdfKeyValueGrid(pairs') + 200);
        return fn.includes('options.f || this.getPdfFontScale()');
    }],
    ['getPdfCoverPageMargins défini', () => src.includes('getPdfCoverPageMargins()')],
    ['operationReference séparée', () => src.includes('operationReference: [')
        && !src.includes('operationBase: [')],
    ['typeOperation absent du contexte technique', () => {
        const block = src.slice(src.indexOf('technicalContext: ['), src.indexOf('technicalContext: [') + 1200);
        return !block.includes("pdf.meta.typeOperation");
    }],
    ['tableaux lot libellé gris', () => src.includes('pdfLotSheetLabelValueTable')
        && src.includes("color: '#6a6257'")
        && src.includes('buildPdfLotConformitySheetBody')],
    ['localisation dans geoContext', () => {
        const block = src.slice(src.indexOf('geoContext: ['), src.indexOf('geoContext: [') + 900);
        return block.includes("pdf.meta.location");
    }],
    ['cahier charges déconstruction export PDF', () => {
        const block = src.slice(src.indexOf('diagnosticsDocs: ['), src.indexOf('diagnosticsDocs: [') + 1200);
        return block.includes('documentCahierDeconstruction')
            && block.includes('Cahier des charges de déconstruction');
    }]
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
console.log('check-pdf-cover-structure: all invariants passed');
