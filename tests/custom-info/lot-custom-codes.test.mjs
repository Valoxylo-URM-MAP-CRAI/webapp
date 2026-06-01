import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appFilePath = path.resolve(__dirname, '../../js/app/valobois-app.js');
const indexFilePath = path.resolve(__dirname, '../../index.html');
const cssFilePath = path.resolve(__dirname, '../../css/main.css');
const appSource = fs.readFileSync(appFilePath, 'utf8');
const indexSource = fs.readFileSync(indexFilePath, 'utf8');
const cssSource = fs.readFileSync(cssFilePath, 'utf8');

test('Lot defaults include lotCustomCodes in createEmptyLot allotissement', () => {
  const pattern = /similarityVariants:\s*\{[\s\S]*?multiple:\s*null,[\s\S]*?\},\s*lotCustomCodes:\s*\[\]/;
  assert.match(
    appSource,
    pattern,
    'Expected createEmptyLot allotissement defaults to initialize lotCustomCodes as an empty array.'
  );
});

test('Lot custom code helpers and normalization hook are present', () => {
  assert.match(
    appSource,
    /normalizeLotCustomCodes\(entries\)\s*\{[\s\S]*?\}/,
    'Expected normalizeLotCustomCodes(entries) helper to exist.'
  );
  assert.match(
    appSource,
    /ensureLotCustomCodes\(lot\)\s*\{[\s\S]*?\}/,
    'Expected ensureLotCustomCodes(lot) helper to exist.'
  );
  assert.match(
    appSource,
    /formatLotCustomCodesForExport\(lot\)\s*\{[\s\S]*?\}/,
    'Expected formatLotCustomCodesForExport(lot) helper to exist.'
  );
  assert.match(
    appSource,
    /normalizeLotAllotissementFields\(lot\)\s*\{[\s\S]*?this\.ensureLotCustomCodes\(lot\);[\s\S]*?\}/,
    'Expected lot normalization to call ensureLotCustomCodes(lot).'
  );
});

test('Barcode payload does not auto-append lot custom codes', () => {
  assert.doesNotMatch(
    appSource,
    /if \(lotCodesRaw\) add\('Codes lot', lotCodesRaw\);/,
    'Expected no automatic append of lot custom codes in buildBarcodeContent.'
  );
  assert.doesNotMatch(
    appSource,
    /const customCodeRaw = String\(cfg\.customCode \|\| ''\)/,
    'Expected no direct encoding from customCode input state without explicit custom-info selection.'
  );
});

test('Exports include lot custom codes in CSV/PDF/IFC', () => {
  assert.match(
    appSource,
    /'Codes lot \(ajouts\)'/,
    'Expected CSV exports to include a "Codes lot (ajouts)" column.'
  );
  assert.match(
    appSource,
    /tpdf\('pdf\.lot\.customCodes', 'Codes lot \(ajouts\)'/,
    'Expected PDF lot sheet to include the lot custom codes row.'
  );
  assert.match(
    appSource,
    /codesLotAjoutes|nombreCodesLotAjoutes/,
    'Expected IFC custom infos properties to reference lot custom codes.'
  );
});

test('Composer does not force payload format for lot custom codes', () => {
  assert.doesNotMatch(
    appSource,
    /if \(hasLotCustomCodes && supportsComplete\) nextPayloadFormat = 'complet';/,
    'Expected payload format to stay user-driven (no forced complet for lot custom codes).'
  );
  assert.doesNotMatch(
    appSource,
    /compactOption\.disabled = hasLotCustomCodes && supportsComplete/,
    'Expected compact option to remain available (no forced lock) for lot custom codes.'
  );
});

test('Composer validates selected lot custom codes only', () => {
  assert.ok(
    appSource.includes('const updateLotCodesValidationStatus = (encodedContent, customInfosSelection) => {'),
    'Expected validation helper to evaluate selected custom-info entries for lot custom codes.'
  );
  assert.match(
    appSource,
    /Cochez un complément d'information pour l'inclure dans la chaîne\./,
    'Expected guidance that inclusion requires checkbox selection in the complementary info block.'
  );
  assert.match(
    appSource,
    /Validation OK: .*code\(s\) sélectionné\(s\) présent\(s\) dans la chaîne\./,
    'Expected explicit OK messaging for selected lot custom codes present in encoded payload.'
  );
  assert.match(
    appSource,
    /updateLotCodesValidationStatus\(content, config\.customInfosSelection\);/,
    'Expected validation status helper to be called after each output update.'
  );
});

test('Etiqueter markup includes dedicated lot-codes sub-panel status zone', () => {
  assert.match(
    indexSource,
    /id="bcLotCodesBlock"[\s\S]*?id="bcAddLotCodeBtn"[\s\S]*?id="bcLotCodesValidation"/,
    'Expected dedicated lot-codes panel with inline add button and validation status region in Etiqueter composer.'
  );
  assert.doesNotMatch(
    indexSource,
    /barcode-composer__lot-codes-hint|barcode-composer__lot-codes-usage/,
    'Expected explanatory helper text to be removed from the lot-codes block.'
  );
});

test('Composer reuses the blue button style for lot-code addition', () => {
  assert.match(
    indexSource,
    /class="piece-duplicate-btn barcode-composer__lot-codes-add"/,
    'Expected the lot-code add action to reuse the existing blue button class.'
  );
  assert.match(
    cssSource,
    /#etiqueterBackdrop \.barcode-composer__lot-codes-add \{[\s\S]*?background-color: var\(--bleu-crai\);[\s\S]*?color: var\(--blanc-pur\);[\s\S]*?\}/,
    'Expected the lot-code add action to keep the blue filled styling.'
  );
});

test('Composer custom infos include lot custom codes for selected lots', () => {
  assert.match(
    appSource,
    /const lotIndices = selectedLotIndices\.length \? selectedLotIndices : \[this\.currentLotIndex \|\| 0\];[\s\S]*?scope: 'lot'/,
    'Expected lot custom codes to be merged into the custom-info entries used for encoding.'
  );
  assert.match(
    appSource,
    /const selectedLotIndices = this\.getSelectedEtiqueterLotIndices\(\);[\s\S]*?const selectedCustomInfosComplete = this\.formatBarcodeComposerCustomInfosBySelection\(pieceSource, cfg\.customInfosSelection, 'complete'\);/,
    'Expected the complete payload path to keep using the custom-info selection state.'
  );
});

test('Selected lot custom codes are encoded in complete form even in compact payload', () => {
  assert.match(
    appSource,
    /compact:\s*''[\s\S]*?complete:\s*label \? `\$\{label\}: \$\{code\}` : code[\s\S]*?scope:\s*'lot'/,
    'Expected lot custom code entries to expose only a complete representation.'
  );
  assert.match(
    appSource,
    /if \(entry\.scope === 'lot'\) \{[\s\S]*?return String\(entry\.complete \|\| ''\)\.trim\(\);/,
    'Expected selected lot custom codes to force complete formatting regardless of payload mode.'
  );
});

test('Complete payload keeps selected custom infos even when customInfos field is unchecked', () => {
  assert.match(
    appSource,
    /let selectedCustomInfosCompleteAdded = false;[\s\S]*?if \(selectedCustomInfosComplete\) \{[\s\S]*?selectedCustomInfosCompleteAdded = true;[\s\S]*?\}[\s\S]*?if \(selectedCustomInfosComplete && !selectedCustomInfosCompleteAdded\) \{[\s\S]*?add\('Informations personnalisées', selectedCustomInfosComplete\);[\s\S]*?\}/,
    'Expected complete payload to append selected custom infos even when the optional customInfos checkbox is not enabled.'
  );
});
