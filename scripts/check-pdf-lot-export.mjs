/**
 * Régression export PDF fiche lot — Phase A pagination.
 * Parse valobois-app.js et vérifie les invariants anti-pages vides.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, '../js/app/valobois-app.js');
const src = fs.readFileSync(appPath, 'utf8');

const fnBody = (() => {
    const start = src.indexOf('buildPdfActiveLotDocDef(lotIndex)');
    if (start < 0) throw new Error('buildPdfActiveLotDocDef introuvable');
    const open = src.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') {
            depth--;
            if (depth === 0) return src.slice(open, i + 1);
        }
    }
    throw new Error('Corps buildPdfActiveLotDocDef non parsé');
})();

const exportSlice = (() => {
    const start = src.indexOf('exportSelectedLotsToPdf(lotIndices)');
    return start >= 0 ? src.slice(start, start + 4000) : '';
})();

const notesDistributionFnBody = (() => {
    const sig = 'buildPdfNotesDistributionPanel(lot, state, tpdf, panelWidth, options = {}) {';
    const start = src.indexOf(sig);
    if (start < 0) throw new Error('buildPdfNotesDistributionPanel introuvable');
    const open = start + sig.length - 1;
    let depth = 0;
    for (let i = open; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') {
            depth--;
            if (depth === 0) return src.slice(open, i + 1);
        }
    }
    throw new Error('Corps buildPdfNotesDistributionPanel non parsé');
})();

const asserts = [
    ['pdfFlatCard défini', () => src.includes('pdfFlatCard(titleText, bodyContent')],
    ['maxGaugeWidth défini dans fiche lot', () => fnBody.includes('buildPdfCategoryGaugesPanel(currentLot, tpdf, gaugePanelWidth')],
    ['pas de mainColumns unbreakable', () => !fnBody.includes('mainColumns')],
    ['fiche lot via blocs bornés', () => src.includes('buildPdfLotSheetBoundedBlock(')
        && src.includes("tpdf('pdf.card.lotSheet'")],
    ['fiche lot en paysage', () => fnBody.includes("pageOrientation = 'landscape'")],
    ['fiche lot colonne unique sidebar', () => fnBody.includes('ficheLotPairsForGrid')
        && fnBody.includes('buildPdfLotSummaryZonedPages(currentLot, tpdf')
        && fnBody.includes('customInfoPairs')
        && fnBody.includes('const ficheLotPairsForGrid = lotPairs')
        && src.includes('options.pairs || []')],
    ['titres fiche lot harmonisés', () => src.includes('getPdfZonedSheetPageTitleFontSize')
        && src.includes('buildPdfZonedSheetPageTitle')
        && fnBody.includes('buildPdfZonedSheetPageTitle(this.getPdfLotLabel')],
    ['zonage maquette 100/170 mm', () => {
        const zonedStart = src.indexOf('buildPdfLotSummaryZonedPages(lot, tpdf');
        const zonedEnd = src.indexOf('buildPdfLotSummaryZonedLayout(lot, tpdf', zonedStart);
        const zonedFn = zonedStart >= 0 && zonedEnd > zonedStart ? src.slice(zonedStart, zonedEnd) : '';
        return fnBody.includes('buildPdfLotSummaryZonedPages(currentLot, tpdf')
            && zonedFn.includes('mainColWeights')
            && zonedFn.includes('middleColWeights')
            && zonedFn.includes('getPdfSheetColumnWidthsPt(mainColWeights')
            && zonedFn.includes('width: mainColWidthsPt[0]')
            && zonedFn.includes('width: middleColWidthsPt[0]')
            && !zonedFn.includes('width: mainColWeights')
            && !zonedFn.includes('width: middleColWeights')
            && zonedFn.includes('getPdfOperationSheetColumnGapPt()')
            && zonedFn.includes('20 * MM_TO_PT')
            && zonedFn.includes('middleRowHeightMm = 110')
            && zonedFn.includes('customInfoHeightMm = 50')
            && zonedFn.includes('10 * MM_TO_PT')
            && zonedFn.includes('15 * MM_TO_PT')
            && zonedFn.includes('40 * MM_TO_PT')
            && zonedFn.includes('pdf.card.lotDestination')
            && zonedFn.includes('pdf.pieceType.homoTitle')
            && zonedFn.includes('pdf.card.pieceType')
            && zonedFn.includes('pdf.pieceType.seuilsTitle')
            && zonedFn.includes('pdfLotSheetLabelValueTable')
            && !zonedFn.includes('45 * MM_TO_PT')
            && !zonedFn.includes('35 * MM_TO_PT')
            && !fnBody.includes('lotSummaryHalfPage')
            && !fnBody.includes('customInfoCard');
    }],
    ['classes emploi groupées export PDF', () => src.includes('groupLotEmploymentClassDetailLines(entries)')
        && src.includes('getPdfLotEmploymentClassExportPairs(lot, tpdf)')
        && src.includes('groupedDetailLines')],
    ['suite fiche lot pagination', () => src.includes('buildPdfLotSheetPageHeader(continuationTitle, f)')
        && src.includes("pageBreak: 'before'")
        && src.includes('buildPdfLotSummaryZonedPages')
        && src.includes('splitPdfKvPairsByRowBudget')],
    ['fiche lot valeurs alignées UI', () => {
        const lotPairsStart = fnBody.indexOf('const lotPairs = [');
        const lotPairsEnd = fnBody.indexOf('const customInfoColumns', lotPairsStart);
        const lotPairsBlock = lotPairsStart >= 0 && lotPairsEnd > lotPairsStart
            ? fnBody.slice(lotPairsStart, lotPairsEnd)
            : '';
        return src.includes('formatPdfLotMasseDisplay(')
            && src.includes('formatPdfLotPco2Display(')
            && src.includes('formatPdfLotAllotissementNumeric(')
            && src.includes('formatPdfLotCarbonFieldDisplay(currentLot, this.getLotHumiditeDetailSummary)')
            && lotPairsBlock.includes('formatPdfLotMasseDisplay(allotissement.masseLot)')
            && lotPairsBlock.includes('formatPdfLotPco2Display(allotissement.carboneBiogeniqueEstime)')
            && !lotPairsBlock.includes('String(parseFloat(allotissement.masseLot)');
    }],
    ['inspection retirée du haut fiche lot', () => !fnBody.includes('orientationJustificationCard')
        && fnBody.includes('buildPdfLotInspectionReminderTable(currentLot, tpdf')],
    ['plus de carte justification orientation', () => !fnBody.includes('orientationJustificationCard')
        && !fnBody.includes('buildOrientationDriversList')],
    ['notation fusionnée avec matrice', () => fnBody.includes('buildPdfOrientationMatrixRoleIndex(currentLot)')
        && fnBody.includes('getPdfNotationSectionsForExport(currentLot, tpdf)')
        && fnBody.includes('buildPdfNotationSectionCell(currentLot, sectionDef, tpdf, matrixRoleIndex')
        && src.includes('buildPdfMatrixRoleCell')
        && fnBody.includes("pdf.card.notationOrientation")],
    ['jauges et radar en haut 66/34', () => fnBody.includes('scoresVisualRow')
        && fnBody.includes("width: '66%'")
        && fnBody.includes("width: '34%'")
        && fnBody.includes('buildPdfCategoryGaugesPanel(currentLot, tpdf')],
    ['critères perso et inspection en dernière position grille', () => {
        const sectionsIdx = fnBody.indexOf('...notationCells');
        const customIdx = fnBody.indexOf('...(customCriteriaTable ? [customCriteriaTable] : [])');
        const inspectionIdx = fnBody.indexOf('...(inspectionReminderTable ? [inspectionReminderTable] : [])');
        return fnBody.includes('buildPdfLotCustomCriteriaTable(currentLot, tpdf, matrixRoleIndex')
            && sectionsIdx >= 0
            && customIdx > sectionsIdx
            && inspectionIdx > customIdx;
    }],
    ['grille notation sur 3 colonnes', () => fnBody.includes('const notationGridColumns = 3')
        && fnBody.includes('for (let i = 0; i < notationGridCells.length; i += notationGridColumns)')
        && fnBody.includes('while (rowCells.length < notationGridColumns)')
        && fnBody.includes('rowCells.map((cell) => ({ width: notationColumnWidth')
        && fnBody.includes('notationGridColumnGap')],
    ['marge verticale notation réduite', () => fnBody.includes('const notationGridVerticalGap = 5 * MM_TO_PT')
        && fnBody.includes('buildPdfNotationGridVerticalSpacer(notationGridVerticalGap')
        && src.includes('heights: [gap]')
        && src.includes('border: [false, false, false, false]')],
    ['blocs analyse orientation complets', () => fnBody.includes('buildPdfOrientationAnalysisStack(currentLot, lotIndex, tpdf, usableWidthPt')
        && src.includes('generatePdfLotPositionBarSvg')
        && fnBody.includes('orientationAnalysisStack')],
    ['barre position lot parité UI', () => src.includes('drawScorePill')
        && src.includes('drawAxisPill')
        && src.includes('drawRangeBar')
        && src.includes('drawRangeBarBody')
        && src.includes('drawLaneLabel')
        && src.includes('svgTracks + svgGrid + svgLabels + svgRangeBars + svgDiamond')
        && /svgParts \+= svgScorePills;/.test(src)
        && src.includes('const baselineY = laneCenterY + fontSize * 0.35')
        && src.includes('fill-opacity="0.12"')
        && src.includes('shouldFlipCombustionLabel')
        && src.includes("const fill = isActive ? '#111111' : '#595959'")
        && src.includes('escapeSvgText(lotBubbleLabel)}</text>')
        && src.includes('escapeSvgText(lotScoreLabel)}</text>')],
    ['répartition notes largeur colonnes bornée', () => notesDistributionFnBody.includes('leftColMax')
        && notesDistributionFnBody.includes('leftBarMaxWidth')
        && notesDistributionFnBody.includes('rightBarMaxWidth')
        && notesDistributionFnBody.includes('width: leftColWidth')
        && notesDistributionFnBody.includes('width: rightColWidth')
        && !notesDistributionFnBody.includes('barMaxWidth = Math.max(80, panelWidth - 50)')],
    ['layout notation analyse avant grilles', () => {
        const scoresIdx = fnBody.indexOf('scoresVisualRow');
        const analysisIdx = fnBody.indexOf('orientationAnalysisStack');
        const tablesPageIdx = fnBody.indexOf('notationTablesPageBlock');
        const blockIdx = fnBody.indexOf('const notationBlock = [');
        return scoresIdx >= 0 && analysisIdx > scoresIdx && tablesPageIdx > blockIdx
            && fnBody.includes('...notationGridRows');
    }],
    ['grille notation page dédiée', () => fnBody.includes('notationTablesPageBlock')
        && fnBody.includes("tpdf('pdf.card.notationDetailGrid'")
        && fnBody.includes('pageBreak: \'before\'')
        && !/orientationAnalysisStack[\s\S]{0,400}notationGridRows/.test(fnBody)],
    ['jauges avec curseur thumb', () => src.includes('thumbHtml')
        && src.includes('thumbLabelHtml')],
    ['radar avec légende et zeroPct', () => fnBody.includes('radarZeroPct')
        && src.includes('buildPdfRadarLegend')],
    ['tableaux notation 6 colonnes UI', () => src.includes('buildPdfNotationLockCell')
        && src.includes("tpdf('pdf.table.score'")
        && src.includes("tpdf('pdf.table.letterAbbr'")
        && src.includes("tpdf('pdf.table.lockAbbr'")],
    ['tableaux notation lignes compactes et cadenas réduit', () => src.includes('const notationTableRowHeight = 11')
        && src.includes('const iconSize = Math.max(6, Math.min(8, Number(fontSize) + 1))')
        && src.includes('getPdfNotationTableRowHeights')
        && src.includes('getPdfNotationMiniTableLayout')
        && src.includes("vLineColor: () => '#ffffff'")
        && src.includes('getPdfNotationSectionTableWidths(columnWidth, notationFontSize)')],
    ['inspection suit échelle notation', () => fnBody.includes('notationFontSize: compactNotationFontSize')
        && fnBody.includes('const compactNotationFontSize = Math.max(6.1, notationFontSize + 0.3)')
        && fnBody.includes('const notationColumnWidth = Math.floor((notationGridUsableWidth - notationGridColumnGap * (notationGridColumns - 1)) / notationGridColumns)')
        && fnBody.includes('const notationGridPageInset = 12')
        && fnBody.includes('sectionTitleFontSize: compactSectionTitleFontSize')
        && fnBody.includes('columnWidth: notationColumnWidth')
        && fnBody.includes('const notationGridColumnGap = Math.round(10 * MM_TO_PT)')],
    ['colonne critères notation flexible pleine largeur', () => src.includes('getPdfNotationCriteriaBaselineLabel()')
        && src.includes('clampPdfNotationTableWidths')
        && src.includes('getPdfNotationSectionTableWidths(columnWidth, notationFontSize)')
        && src.includes('getPdfNotationCustomTableWidths(columnWidth, notationFontSize)')],
    ['couleurs notes A-E', () => src.includes('getPdfLetterFillColor(letter)')
        && src.includes('buildPdfNotationNoteCell(')],
    ['demi-page sans unbreakable droite', () => !fnBody.includes('pieceTypeColumnCard') && !fnBody.includes('lotSummaryHalfPage')],
    ['plus de carte CV/EIQ/MAD', () => !fnBody.includes('dispersionPairs') && !fnBody.includes('pdf.card.dispersionMetrics')],
    ['notation en lignes fragmentables', () => fnBody.includes('notationGridRows')],
    ['radar non unbreakable', () => !/radarCard[\s\S]{0,200}unbreakable: true/.test(fnBody)],
    ['pageBreak avant chaque lot fusionné', () => /docDefPages\.forEach\([\s\S]*pageBreak: 'before'/.test(exportSlice)
        && !/if \(idx > 0\)[\s\S]{0,80}pageBreak: 'before'/.test(exportSlice)],
    ['revue complète entièrement paysage', () => exportSlice.includes("pageOrientation: 'landscape'")
        && !exportSlice.includes("pageOrientation: 'portrait'")]
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

if (failed) {
    process.exit(1);
}
console.log('check-pdf-lot-export: all invariants passed');
