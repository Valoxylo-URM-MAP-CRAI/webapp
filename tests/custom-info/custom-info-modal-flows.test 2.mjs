import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appFilePath = path.resolve(__dirname, '../../js/app/valobois-app.js');
const appSource = fs.readFileSync(appFilePath, 'utf8');

test('Modal footer primary action is Enregistrer', () => {
  assert.match(
    appSource,
    /id="btnSaveCustomInfoSetModalFooter">Enregistrer<\/button>/,
    'Expected a footer save button labeled Enregistrer in the custom info set modal.'
  );
});

test('Save and close flow blurs active field before closing modal', () => {
  const pattern = /const saveAndCloseModal = \(\) => \{[\s\S]*?const active = document\.activeElement;[\s\S]*?if \(active instanceof HTMLElement && backdrop\.contains\(active\)\) \{[\s\S]*?const tagName = String\(active\.tagName \|\| ''\)\.toUpperCase\(\);[\s\S]*?if \(tagName === 'INPUT' \|\| tagName === 'TEXTAREA' \|\| tagName === 'SELECT'\) \{[\s\S]*?active\.blur\(\);[\s\S]*?\}[\s\S]*?\}[\s\S]*?closeModal\(\);[\s\S]*?\};/;
  assert.match(
    appSource,
    pattern,
    'Expected saveAndCloseModal to blur active editable controls before closing.'
  );
});

test('Footer save button is bound to saveAndCloseModal handler', () => {
  assert.match(
    appSource,
    /if \(saveFooterBtn\) saveFooterBtn\.onclick = saveAndCloseModal;/,
    'Expected the footer save button to trigger saveAndCloseModal.'
  );
});

test('Editor flow exposes explicit return navigation to home panel', () => {
  const renderPattern = /data-custom-info-modal-go-home>Retour<\/button>/;
  const bindPattern = /bodyEl\.querySelectorAll\('\[data-custom-info-modal-go-home\]'\)\.forEach\(\(btn\) => \{[\s\S]*?state\.view = 'home';[\s\S]*?render\(\);[\s\S]*?\}\);/;
  assert.match(appSource, renderPattern, 'Expected a Retour button to go back to home panel.');
  assert.match(appSource, bindPattern, 'Expected Retour button handler to switch state.view to home and re-render.');
});
