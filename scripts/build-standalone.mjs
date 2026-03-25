import fs from 'fs';
import path from 'path';
import { buildStandaloneHtmlString, getProjectRoot } from './lib/build-standalone-html.mjs';

const root = getProjectRoot();
const outDir = path.join(root, 'dist');
const outFile = path.join(outDir, 'valobois-standalone.html');

fs.mkdirSync(outDir, { recursive: true });
const html = buildStandaloneHtmlString({ rootDir: root });
fs.writeFileSync(outFile, html, 'utf8');
console.log('Wrote', outFile);
