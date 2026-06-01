import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appFilePath = path.resolve(__dirname, '../../js/app/valobois-app.js');
const appSource = fs.readFileSync(appFilePath, 'utf8');

test('Mode Liste: filtering uses linked option set (id-aware)', () => {
  const pattern = /if \(Object\.prototype\.hasOwnProperty\.call\(updates, 'valueMode'\)\)\s*\{[\s\S]*?if \(target\.valueMode === 'list'\)\s*\{[\s\S]*?const linkedSet = this\.getCustomInfoOptionSetForEntry\(target\);[\s\S]*?\}\s*\}/;
  assert.match(
    appSource,
    pattern,
    'Expected list-mode filtering to resolve allowed options through getCustomInfoOptionSetForEntry(target).'
  );
});

test('Delete set flow: list and hybrid entries both fallback to free mode', () => {
  const pattern = /const clearSetRef = \(pieceLike\) => \{[\s\S]*?if \(String\(entry && entry\.optionSetId \|\| ''\) !== targetSetId\) return;[\s\S]*?entry\.optionSetId = '';[\s\S]*?if \(entry\.valueMode === 'list' \|\| entry\.valueMode === 'hybrid'\) \{[\s\S]*?entry\.valueMode = 'free';[\s\S]*?entry\.valueType = 'text';[\s\S]*?\}[\s\S]*?\};/;
  assert.match(
    appSource,
    pattern,
    'Expected clearSetRef to normalize both list and hybrid entries to free/text when a linked set is deleted.'
  );
});

test('Mode Hybride: selecting "Autre" keeps the input empty for manual typing', () => {
  const pattern = /if \(mode === 'hybrid' && this\.normalizeCustomInfoKey\(candidateValue\) === this\.normalizeCustomInfoKey\(hybridOtherChoiceLabel\)\) \{[\s\S]*?valueInput\.value = '';[\s\S]*?valueInput\.dataset\.previousValue = '';[\s\S]*?valueInput\.focus\(\);[\s\S]*?return;[\s\S]*?\}/;
  assert.match(
    appSource,
    pattern,
    'Expected hybrid mode to treat "Autre" as a trigger and clear the input for manual entry.'
  );
});
