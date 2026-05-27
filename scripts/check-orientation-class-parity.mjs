#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const jsPath = path.join(rootDir, 'js/app/valobois-app.js');
const cssPath = path.join(rootDir, 'css/main.css');

function readUtf8(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`[check:orientation-parity] Unable to read ${filePath}:`, error.message);
    process.exit(2);
  }
}

const jsContent = readUtf8(jsPath);
const cssContent = readUtf8(cssPath);

const classRegex = /orientation-[a-z0-9-]+/g;
const jsClasses = new Set(jsContent.match(classRegex) || []);

const requiredClasses = [...jsClasses]
  .filter((name) => name.startsWith('orientation-compact-') || name.startsWith('orientation-score-') || name.startsWith('orientation-negative-') || name.startsWith('orientation-destination-') || name === 'orientation-lot-card-body')
  .sort((a, b) => a.localeCompare(b));

const missing = requiredClasses.filter((className) => {
  const selectorRegex = new RegExp(`\\.${className}(?![a-zA-Z0-9_-])`);
  return !selectorRegex.test(cssContent);
});

if (requiredClasses.length === 0) {
  console.warn('[check:orientation-parity] No orientation compact classes were detected in JS.');
  process.exit(0);
}

if (missing.length > 0) {
  console.error('[check:orientation-parity] Missing CSS selectors for orientation classes:');
  missing.forEach((name) => console.error(` - .${name}`));
  process.exit(1);
}

console.log(`[check:orientation-parity] OK (${requiredClasses.length} classes checked)`);
