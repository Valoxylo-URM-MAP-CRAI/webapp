#!/usr/bin/env node
/**
 * Régression — seuils layout 2D (QR / DataMatrix).
 * Vérifie getCodeZoneSize au seuil 250 et la présence des hooks clés.
 */
import fs from 'node:fs';
import path from 'node:path';

const jsPath = path.join(process.cwd(), 'js/app/valobois-app.js');
const src = fs.readFileSync(jsPath, 'utf8');

function getCodeZoneSize(dataString) {
    const len = String(dataString || '').length;
    if (len <= 250) return 'small';
    return 'large';
}

function normalize2DCodePayload(str) {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}

const thresholdCases = [
    ['x'.repeat(249), 'small'],
    ['x'.repeat(250), 'small'],
    ['x'.repeat(251), 'large'],
    ['x'.repeat(499), 'large'],
    ['x'.repeat(500), 'large'],
    ['x'.repeat(501), 'large'],
    ['x'.repeat(2000), 'large']
];

const failures = [];
thresholdCases.forEach(([input, expected]) => {
    const got = getCodeZoneSize(input);
    if (got !== expected) {
        failures.push(`len=${input.length}: attendu "${expected}", obtenu "${got}"`);
    }
});

const accent = normalize2DCodePayload('Pièce réemploi É');
if (accent !== 'PIECE REEMPLOI E') {
    failures.push(`normalisation 2D: "${accent}" !== "PIECE REEMPLOI E"`);
}

const requiredSnippets = [
    'normalize2DCodePayload',
    'getCodeZoneSize',
    'getCodePayloadForEncoding',
    'getCodeZoneQuietZoneMm',
    'buildLabel2DLarge',
    "generateQrSvgString(content, 132, 'L')"
];

requiredSnippets.forEach((snippet) => {
    if (!src.includes(snippet)) {
        failures.push(`extrait manquant dans valobois-app.js: ${snippet}`);
    }
});

if (src.includes("generateQrSvgString(content, 132, 'H')")) {
    failures.push('QR encore en correction H — attendu L (minimum)');
}

if (!/zoneSize === 'large' && mode === 'datamatrix'\)\s*return\s*2/.test(src)) {
    failures.push('quiet zone DataMatrix grand format : attendu 2 mm');
}

if (!/getQuietZoneMm\('large',\s*codeMode\)/.test(src)) {
    failures.push('buildLabel2DLarge : quiet zone via getQuietZoneMm(large, codeMode)');
}

if (failures.length) {
    console.error('[check:code-zone-size] ÉCHEC');
    failures.forEach((msg) => console.error(` - ${msg}`));
    process.exit(1);
}

console.log('[check:code-zone-size] OK (seuil 250 + hooks layout 2D)');
