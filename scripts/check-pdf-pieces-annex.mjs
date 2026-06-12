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
    ['annexe pièces pageBreak par lot', () => annexSlice.includes('lotDetailBlocks.push')
        && annexSlice.includes('buildPdfLotPiecesDetailPages(')
        && src.includes("pageBreak: 'before'")],
    ['récapitulatifs regroupés en tête d\'annexe', () => src.includes('buildPdfLotPiecesRecapTable(')
        && annexSlice.includes('recapContent.push')
        && annexSlice.includes('...recapContent')
        && annexSlice.includes('...lotDetailBlocks')
        && !annexSlice.includes('...fiches\n            );\n\n            content.push')],
    ['fiche pièce tableau une colonne', () => {
        const fnStart = src.indexOf('buildPdfPieceDetailPairs(entry, lot, lotIndex, pieceIndex, tpdf, customInfoColumns) {');
        const fnEnd = src.indexOf('\n    buildPdfPieceDetailFiche(entry, lot', fnStart);
        const fn = fnStart >= 0 && fnEnd > fnStart ? src.slice(fnStart, fnEnd) : '';
        return fn.includes('const allPairs = [')
            && fn.includes('buildPdfPieceDurabiliteSummaryPairs(sourcePiece, lot, tpdf)')
            && src.includes('buildPdfPieceDetailKvGrid(rows, f)')
            && src.includes('buildPdfPieceDetailColumnData(pairs, layout, f')
            && src.includes('buildPdfPieceDualKvPair(left, right, options)')
    }],
    ['marges détail pièces annexe 10/10/12/10 mm', () => src.includes('getPdfPiecesDetailAnnexPageMargins()')
        && src.includes('10 * MM_TO_PT, 10 * MM_TO_PT, 12 * MM_TO_PT, 10 * MM_TO_PT')],
    ['grille 4 colonnes 70 mm + interstice 1 mm', () => {
        const layoutFn = src.slice(
            src.indexOf('getPdfPiecesDetailAnnexLayout()'),
            src.indexOf('getPdfPiecesDetailAnnexLayout()') + 600
        );
        return layoutFn.includes('columnsPerPage: 4')
            && layoutFn.includes('columnWidthPt: 70 * MM_TO_PT')
            && layoutFn.includes('columnGapPt: 1 * MM_TO_PT')
            && layoutFn.includes('lotTitleHeightPt: 5 * MM_TO_PT')
            && layoutFn.includes('pieceHeaderHeightPt: 5 * MM_TO_PT')
            && !layoutFn.includes('pieceDataHeightPt')
            && src.includes('getPdfPieceDetailDataHeightPt(pageMargins)')
            && src.includes('buildPdfLotPiecesDetailPages(')
            && src.includes('expandPdfPieceAnnexColumnSlots(')
            && src.includes('getPdfPieceDetailColumnMaxRows(f, layout, pageMargins)');
    }],
    ['table récap avec colonne quantité', () => src.includes("tpdf('pdf.piece.quantity'")
        && src.includes('buildPdfPiecesDetailAnnexRecapHeaders')
        && (() => {
            const fn = src.slice(
                src.indexOf('buildPdfLotPiecesRecapTable(lotLabel, recapHeaders, recapRows, tpdf, f, options = {})'),
                src.indexOf('buildPdfLotPiecesRecapTable(lotLabel, recapHeaders, recapRows, tpdf, f, options = {})') + 1200
            );
            return fn.includes("widths: recapHeaders.map(() => '*')")
                && fn.includes('fullWidth: true')
                && fn.includes('titleNode.id = options.destId');
        })()],
    ['annexe pièces démarre nouvelle page', () => {
        const fn = src.slice(
            src.indexOf('buildPdfPiecesDetailAnnexContent(lotIndices'),
            src.indexOf('formatPdfCriteriaAnnexBodyText(value, fieldTitle')
        );
        return fn.includes("tpdf('pdf.title.piecesAnnex'")
            && fn.includes("pageBreak: 'before'")
            && fn.includes('pageMargins: annexMargins');
    }],
    ['fiches en colonnes zonées', () => src.includes('buildPdfPieceDetailColumn(')
        && src.includes('buildPdfPieceDetailColumnHeader(')
        && src.includes('buildPdfPieceDetailColumnData(pairs, layout, f)')
        && src.includes('buildPdfPieceDetailKvGrid(rows, f)')
        && src.includes('splitPdfPieceDetailPairsByRowBudget(remaining, maxRows)')
        && src.includes('getPdfPieceDetailPairRowWeight(pair)')
        && src.includes('getPdfPieceDetailSplitRowBudget(f, layout, pageMargins)')
        && src.includes('buildPdfPiecesDetailBoundedCell(')],
    ['paires de champs sur une ligne fiche pièce', () => {
        const fnStart = src.indexOf('buildPdfPieceDetailPairs(entry, lot, lotIndex, pieceIndex, tpdf, customInfoColumns) {');
        const fnEnd = src.indexOf('\n    buildPdfPieceDetailFiche(entry, lot', fnStart);
        const fn = fnStart >= 0 && fnEnd > fnStart ? src.slice(fnStart, fnEnd) : '';
        const gridFn = src.slice(
            src.indexOf('buildPdfPieceDetailKvGrid(pairs, f)'),
            src.indexOf('buildPdfPieceDetailKvGrid(pairs, f)') + 1200
        );
        return fn.includes('const dual = (left, right, options) => this.buildPdfPieceDualKvPair(left, right, options)')
            && fn.includes("tpdf('pdf.lot.lengthShort'")
            && fn.includes("tpdf('pdf.piece.massivite'")
            && src.includes('buildPdfPieceDetailKvGrid(pairs, f)')
            && gridFn.includes('GRID_COLS = 30')
            && gridFn.includes('buildRowCells(pair.fields, pair.colWeights)');
    }],
    ['ess. scientifique / EN 13556 dual 65/35 fiche pièce', () => {
        const fnStart = src.indexOf('buildPdfPieceDetailPairs(entry, lot, lotIndex, pieceIndex, tpdf, customInfoColumns) {');
        const fnEnd = src.indexOf('\n    buildPdfPieceDetailFiche(entry, lot', fnStart);
        const fn = fnStart >= 0 && fnEnd > fnStart ? src.slice(fnStart, fnEnd) : '';
        return fn.includes("tpdf('pdf.lot.speciesScientificShort'")
            && fn.includes("tpdf('pdf.lot.en13556Short'")
            && fn.includes('colWeights: [65, 35]');
    }],
    ['masse vol. dual 40/60 fiche pièce', () => {
        const fnStart = src.indexOf('buildPdfPieceDetailPairs(entry, lot, lotIndex, pieceIndex, tpdf, customInfoColumns) {');
        const fnEnd = src.indexOf('\n    buildPdfPieceDetailFiche(entry, lot', fnStart);
        const fn = fnStart >= 0 && fnEnd > fnStart ? src.slice(fnStart, fnEnd) : '';
        const gridFn = src.slice(
            src.indexOf('buildPdfPieceDetailKvGrid(pairs, f)'),
            src.indexOf('buildPdfPieceDetailKvGrid(pairs, f)') + 1600
        );
        return fn.includes("tpdf('pdf.lot.masseVolumiqueShort'")
            && fn.includes("tpdf('pdf.piece.masseVolumiqueMesuree'")
            && fn.includes('colWeights: [4, 6]')
            && src.includes('allocatePdfGridColSpans(weights, totalCols)')
            && gridFn.includes('pair.colWeights');
    }],
    ['mesures multiples dans fiches pièce', () => src.includes('buildPdfPieceMultipleMeasurementsPairs(piece, tpdf)')
        && src.includes('getPdfPieceMultipleMeasurementsValidSections(piece)')
        && src.includes('...mmPairs')
        && !src.includes("tpdf('pdf.piece.mmCvEpaisseur'")
        && (() => {
            const fnStart = src.indexOf('const allPairs = [');
            const fnEnd = src.indexOf('];', fnStart);
            const block = fnStart >= 0 && fnEnd > fnStart ? src.slice(fnStart, fnEnd) : '';
            const dimsIdx = block.indexOf('...dimsPairs');
            const mmIdx = block.indexOf('...mmPairs');
            const simIdx = block.indexOf('...similarityPairs');
            return dimsIdx >= 0 && mmIdx > dimsIdx && simIdx > mmIdx;
        })()],
    ['ordonnancement thématique fiche pièce', () => {
        const fnStart = src.indexOf('const allPairs = [');
        const fnEnd = src.indexOf('];', fnStart);
        const block = fnStart >= 0 && fnEnd > fnStart ? src.slice(fnStart, fnEnd) : '';
        const idx = (name) => block.indexOf(name);
        return block.includes('...pieceIdPairs')
            && block.includes('...essencePairs')
            && block.includes('...durabilitePairs')
            && block.includes('...dimsPairs')
            && block.includes('...mmPairs')
            && block.includes('...similarityPairs')
            && block.includes('...physiquePairs')
            && block.includes('...valorisationPairs')
            && block.includes('...cycleViePairs')
            && block.includes('...locSitPairs')
            && block.includes('...customPairs')
            && idx('...pieceIdPairs') < idx('...essencePairs')
            && idx('...essencePairs') < idx('...durabilitePairs')
            && idx('...durabilitePairs') < idx('...dimsPairs')
            && idx('...dimsPairs') < idx('...mmPairs')
            && idx('...mmPairs') < idx('...similarityPairs')
            && idx('...similarityPairs') < idx('...physiquePairs')
            && idx('...physiquePairs') < idx('...valorisationPairs')
            && idx('...valorisationPairs') < idx('...cycleViePairs')
            && idx('...cycleViePairs') < idx('...locSitPairs')
            && idx('...locSitPairs') < idx('...customPairs');
    }],
    ['césure fiche pièce budget hauteur utile', () => {
        const fn = src.slice(
            src.indexOf('getPdfPieceDetailColumnMaxRows(f, layout, pageMargins)'),
            src.indexOf('getPdfPieceDetailColumnMaxRows(f, layout, pageMargins)') + 500
        );
        return fn.includes('getPdfPieceDetailDataHeightPt(pageMargins)')
            && fn.includes('getPdfLotSheetKvRowHeightPt(scale)')
            && !fn.includes('getPdfLotSheetMaxRowsForHeight(dataHeightMm');
    }],
    ['homogénéité / hétérogénéité fiche pièce', () => src.includes('buildPdfPieceHomogeneityHeterogeneityPairs(entry, lot, piece, tpdf)')
        && src.includes('getPdfPieceSimilarityAtomContext(entry, lot)')
        && src.includes('resolvePdfPieceMedoidAtomKey(entry, lot)')
        && src.includes('classifyPdfPieceDestinationLabel(lot, pieceLike)')
        && src.includes('atomScores: scored.map')
        && (() => {
            const fnStart = src.indexOf('buildPdfPieceHomogeneityHeterogeneityPairs(entry, lot, piece, tpdf) {');
            const fnEnd = src.indexOf('\n    buildPdfPieceMultipleMeasurementsPairs(piece, tpdf)', fnStart);
            const fn = fnStart >= 0 && fnEnd > fnStart ? src.slice(fnStart, fnEnd) : '';
            return fn.includes("tpdf('pdf.piece.positionLot'")
                && fn.includes("tpdf('pdf.piece.conformity'")
                && fn.includes('classifyPdfPieceDestinationLabel(lot, piece)')
                && !fn.includes("tpdf('pdf.piece.destinationClass'");
        })()],
    ['export pièce recalculé (preview)', () => src.includes('resolvePdfPieceExportPiece(entry, lot)')
        && src.includes('buildPieceFromDefault(lot, -1, sourcePiece.id')
        && src.includes('this.recalculatePiece(exportPiece, lot)')],
    ['unités dans les valeurs fiche pièce', () => src.includes('formatPdfPieceDetailWithUnit(value, unit)')
        && src.includes("withUnit(getPieceValue(piece.longueur, allotissement.longueur), 'mm')")
        && src.includes("withUnit(prixDisplay, '€')")],
    ['vol / surf / vol enrichi triple 30/30/40 fiche pièce', () => {
        const fnStart = src.indexOf('buildPdfPieceDetailPairs(entry, lot, lotIndex, pieceIndex, tpdf, customInfoColumns) {');
        const fnEnd = src.indexOf('\n    buildPdfPieceDetailFiche(entry, lot', fnStart);
        const fn = fnStart >= 0 && fnEnd > fnStart ? src.slice(fnStart, fnEnd) : '';
        return fn.includes("tpdf('pdf.mmAnnex.enrichedVolShort'")
            && fn.includes('colWeights: [30, 30, 40]');
    }],
    ['volumes fiche pièce arrondis au millième', () => {
        const fnStart = src.indexOf('buildPdfPieceDetailPairs(entry, lot, lotIndex, pieceIndex, tpdf, customInfoColumns) {');
        const fnEnd = src.indexOf('\n    buildPdfPieceDetailFiche(entry, lot', fnStart);
        const fn = fnStart >= 0 && fnEnd > fnStart ? src.slice(fnStart, fnEnd) : '';
        return fn.includes('formatPdfPieceExportNumber(piece.volumePiece, 3, 3)')
            && fn.includes('formatPdfDecimal(parseFloat(piece.volumePieceEnrichi), 3, 3)')
            && fn.includes('formatPdfPieceExportNumber(piece.surfacePiece, 2, 2)');
    }],
    ['sans annexe technique mesures multiples', () => !src.includes('buildPdfMultipleMeasurementsAnnexContent(')
        && !exportSlice.includes('buildPdfMultipleMeasurementsAnnexContent')],
    ['annexe pièces dans la revue complète PDF', () => {
        const exportBlock = src.slice(src.indexOf('exportSelectedLotsToPdf(lotIndices)'), src.indexOf('exportSelectedLotsToPdf(lotIndices)') + 4000);
        return exportBlock.includes('buildPdfPiecesDetailAnnexContent(validLotIndices)');
    }],
    ['revue complète sans retour portrait', () => !exportSlice.includes("pageOrientation: 'portrait'")],
    ['fiche lot zonage sidebar', () => {
        const fn = src.slice(src.indexOf('buildPdfActiveLotDocDef(lotIndex, options = {})'), src.indexOf('buildPdfActiveLotDocDef(lotIndex, options = {})') + 25000);
        return fn.includes('buildPdfLotSummaryZonedPages(currentLot, tpdf')
            && fn.includes('ficheLotPairsForGrid')
            && fn.includes('customInfoPairs')
            && src.includes('buildPdfLotSheetBoundedBlock(')
            && !fn.includes('lotSummaryHalfPage');
    }],
    ['vecteurs actifs multi-colonnes', () => src.includes('buildPdfMultiColumnBulletList')],
    ['annexe durabilité EN 350 en 3 colonnes', () => {
        const rowsFn = src.slice(
            src.indexOf('buildPdfDurabiliteNaturelleAnnexRows(cards, options'),
            src.indexOf('buildPdfDurabiliteNaturelleAnnexRows(cards, options') + 1600
        );
        return src.includes('buildPdfDurabiliteNaturelleLotEssenceCard(')
            && src.includes('...this.buildPdfDurabiliteNaturelleAnnexRows(cards)')
            && rowsFn.includes('columnsPerRow')
            && rowsFn.includes('colWidthsPt')
            && rowsFn.includes('unbreakable: true')
            && rowsFn.includes('columnGap');
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
console.log('check-pdf-pieces-annex: all invariants passed');
