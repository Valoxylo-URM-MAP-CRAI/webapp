/**
 * Wraps editor sections in tab panels and hoists modals into #editor-modals-root.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(indexPath, 'utf8');

const hoist = [];

function extractModalById(src, idAttr) {
    const needle = `id="${idAttr}"`;
    const mi = src.indexOf(needle);
    if (mi === -1) throw new Error('Missing modal ' + idAttr);
    const mStart = src.lastIndexOf('<div class="modal-backdrop', mi);
    let pos = src.indexOf('>', mStart) + 1;
    let depth = 1;
    while (depth > 0 && pos < src.length) {
        const o = src.indexOf('<div', pos);
        const c = src.indexOf('</div>', pos);
        if (c === -1) throw new Error('Unclosed modal ' + idAttr);
        if (o !== -1 && o < c) {
            depth++;
            pos = src.indexOf('>', o) + 1;
        } else {
            depth--;
            pos = c + 6;
        }
    }
    if (depth !== 0) throw new Error('modal balance ' + idAttr);
    return { modalHtml: src.slice(mStart, pos), before: src.slice(0, mStart), after: src.slice(pos) };
}

function stripAllModalBackdrops(fragment) {
    let s = fragment;
    for (let guard = 0; guard < 400; guard++) {
        const idx = s.search(/<div class="modal-backdrop/);
        if (idx === -1) break;
        let pos = s.indexOf('>', idx) + 1;
        let depth = 1;
        while (depth > 0 && pos < s.length) {
            const o = s.indexOf('<div', pos);
            const c = s.indexOf('</div>', pos);
            if (c === -1) throw new Error('Unclosed modal-backdrop');
            if (o !== -1 && o < c) {
                depth++;
                pos = s.indexOf('>', o) + 1;
            } else {
                depth--;
                pos = c + 6;
            }
        }
        if (depth !== 0) throw new Error('modal-backdrop balance');
        hoist.push(s.slice(idx, pos));
        s = s.slice(0, idx) + s.slice(pos);
    }
    return s;
}

const TAB_NAV = `            <nav class="editor-tab-bar" id="editorTabBar" role="tablist" data-i18n-aria-label="editor.tabs.tablistAria" aria-label="Sections de l’évaluation">
                <button type="button" class="editor-tab" id="editor-tab-general" role="tab" aria-selected="true" aria-controls="editor-tabpanel-general" data-tab-id="general" tabindex="0" data-i18n="editor.tabs.general">Général</button>
                <button type="button" class="editor-tab" id="editor-tab-lots" role="tab" aria-selected="false" aria-controls="editor-tabpanel-lots" data-tab-id="lots" tabindex="-1" data-i18n="editor.tabs.lots">Lots</button>
                <button type="button" class="editor-tab" id="editor-tab-notation" role="tab" aria-selected="false" aria-controls="editor-tabpanel-notation" data-tab-id="notation" tabindex="-1" data-i18n="editor.tabs.notation">Notation</button>
                <button type="button" class="editor-tab" id="editor-tab-analyse" role="tab" aria-selected="false" aria-controls="editor-tabpanel-analyse" data-tab-id="analyse" tabindex="-1" data-i18n="editor.tabs.analyse">Analyse</button>
                <button type="button" class="editor-tab" id="editor-tab-synthese" role="tab" aria-selected="false" aria-controls="editor-tabpanel-synthese" data-tab-id="synthese" tabindex="-1" data-i18n="editor.tabs.synthese">Synthèse</button>
            </nav>
            <div id="editor-tab-panels" class="editor-tab-panels">
            <div class="editor-tab-panel" role="tabpanel" id="editor-tabpanel-general" aria-labelledby="editor-tab-general">
`;

const M1 = '            </section>\n\n            <!-- Métadonnées de l’opération -->';
if (!h.includes(M1)) throw new Error('M1');
h = h.replace(M1, '            </section>\n\n' + TAB_NAV + '\n            <!-- Métadonnées de l’opération -->');

const M2 = '            </section>\n\n            <!-- Section Allotissement / Évaluation -->';
if (!h.includes(M2)) throw new Error('M2');
h = h.replace(
    M2,
    `            </section>
            </div>
            <div class="editor-tab-panel" role="tabpanel" id="editor-tabpanel-lots" hidden aria-labelledby="editor-tab-lots">

            <!-- Section Allotissement / Évaluation -->`
);

const M3_START = '            <!-- Modale alerte pièces non détaillées -->';
const M3_END = '            <!-- INSPECTION -->\n            <!-- Group: Inspection + Notation (grid responsive) -->\n            <div class="cards-grid">';
const i3a = h.indexOf(M3_START);
const i3b = h.indexOf(M3_END);
if (i3a === -1 || i3b === -1) throw new Error('M3');
hoist.push(h.slice(i3a, i3b));
h = h.slice(0, i3a) + `            </div>
            <div class="editor-tab-panel" role="tabpanel" id="editor-tabpanel-notation" hidden aria-labelledby="editor-tab-notation">

` + h.slice(i3b);

const GRID_OPEN = '            <div class="cards-grid">';
const GRID_TAIL_MARK = '\n        </div>\n\n        <!-- Modale info Provenance globale -->';
const g0 = h.indexOf(GRID_OPEN);
const g1 = h.indexOf(GRID_TAIL_MARK, g0);
if (g0 === -1 || g1 === -1) throw new Error('cards-grid');
const beforeGrid = h.slice(0, g0 + GRID_OPEN.length);
const afterGridComment = h.slice(g1 + GRID_TAIL_MARK.length);
let gridInner = h.slice(g0 + GRID_OPEN.length, g1);
gridInner = stripAllModalBackdrops(gridInner);
gridInner = gridInner.replace(/\n        <\/section>\n\n        <\/div>\s*$/, '\n        </div>');
h = beforeGrid + gridInner + '\n        </div>\n\n        <!-- Modale info Provenance globale -->' + afterGridComment;

const PROV_START = '        <!-- Modale info Provenance globale -->';
const PROV_END = '        <!-- Synthèse : Seuils -->';
const p0 = h.indexOf(PROV_START);
const p1 = h.indexOf(PROV_END);
if (p0 === -1 || p1 === -1) throw new Error('provenance');
hoist.push(h.slice(p0, p1));
h = h.slice(0, p0) + h.slice(p1);

const SEUILS_MARK = '        <!-- Synthèse : Seuils -->';
const FOOTER_MARK = '        <!-- Actions finales -->';
const sSeuil = h.indexOf(SEUILS_MARK);
const sFoot = h.indexOf(FOOTER_MARK);
if (sSeuil === -1 || sFoot === -1) throw new Error('seuils/footer');
let synthRegion = h.slice(sSeuil, sFoot);
const headToSeuil = h.slice(0, sSeuil);

const modalIds = ['evalOpModalBackdrop', 'orientationModalBackdrop', 'scatterDimsModalBackdrop', 'radarModalBackdrop', 'seuilsModalBackdrop'];
for (const id of modalIds) {
    const { before, after, modalHtml } = extractModalById(synthRegion, id);
    hoist.push(modalHtml);
    synthRegion = before + after;
}

const ORI_MARK = '        <!-- Orientation -->';
const co = synthRegion.indexOf(ORI_MARK);
if (co === -1) throw new Error('Orientation mark');
const analyseBlock = synthRegion.slice(0, co);
const syntheseBlock = synthRegion.slice(co);

const rebuilt =
    headToSeuil +
    `            </div>
            <div class="editor-tab-panel" role="tabpanel" id="editor-tabpanel-analyse" hidden aria-labelledby="editor-tab-analyse">
` +
    analyseBlock +
    `            </div>
            <div class="editor-tab-panel" role="tabpanel" id="editor-tabpanel-synthese" hidden aria-labelledby="editor-tab-synthese">
` +
    syntheseBlock +
    `            </div>
            </div>

            <div id="editor-modals-root" class="editor-modals-root">
` +
    hoist.join('\n\n') +
    `
            </div>

` +
    h.slice(sFoot);

fs.writeFileSync(indexPath, rebuilt, 'utf8');
console.log('OK: editor tabs +', hoist.length, 'hoisted chunks.');
