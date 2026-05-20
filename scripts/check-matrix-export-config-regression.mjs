import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourcePath = path.resolve(__dirname, '../js/app/valobois-app.js');
const source = fs.readFileSync(sourcePath, 'utf8');

function extractFunctionBody(name) {
  const signaturePattern = new RegExp(`^\\s*${name}\\s*\\([^)]*\\)\\s*\\{`, 'gm');
  const matches = [...source.matchAll(signaturePattern)];
  if (!matches.length) return null;
  const lastMatch = matches[matches.length - 1];
  const start = lastMatch.index;
  const openBrace = start + lastMatch[0].lastIndexOf('{');
  if (openBrace < 0) return null;

  let depth = 0;
  for (let i = openBrace; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openBrace + 1, i);
      }
    }
  }

  return null;
}

function assertIncludes(haystack, needle, message, errors) {
  if (!haystack || !haystack.includes(needle)) {
    errors.push(message);
  }
}

const errors = [];

const exportDiffBody = extractFunctionBody('buildValoboisMatrixConfigExportDiff');
assertIncludes(exportDiffBody, 'criteriaSnapshot', 'buildValoboisMatrixConfigExportDiff: missing criteriaSnapshot', errors);
assertIncludes(exportDiffBody, 'defaultCriteria', 'buildValoboisMatrixConfigExportDiff: missing defaultCriteria snapshot', errors);
assertIncludes(exportDiffBody, 'customFreeCriteria', 'buildValoboisMatrixConfigExportDiff: missing customFreeCriteria snapshot', errors);

const generalExportBody = extractFunctionBody('buildEvaluationJsonExportData');
assertIncludes(generalExportBody, 'valoboisMatrixConfigExport', 'buildEvaluationJsonExportData: missing valoboisMatrixConfigExport', errors);

const importBody = extractFunctionBody('handleValoboisMatrixConfigImport');
assertIncludes(importBody, 'importedCustomFreeCriteria', 'handleValoboisMatrixConfigImport: missing importedCustomFreeCriteria merge list', errors);
assertIncludes(importBody, 'parsed.criteriaSnapshot.customFreeCriteria', 'handleValoboisMatrixConfigImport: missing criteriaSnapshot customFreeCriteria import', errors);
assertIncludes(importBody, 'replaceCustomFreeCriteria', 'handleValoboisMatrixConfigImport: missing replaceCustomFreeCriteria option support', errors);

const renderBody = extractFunctionBody('renderMatrice');
assertIncludes(renderBody, 'valoboisMatrixImportReplaceCustom', 'renderMatrice: missing import replace toggle control', errors);

if (errors.length) {
  console.error('Matrix export/import regression check failed:');
  errors.forEach((entry) => console.error(`- ${entry}`));
  process.exit(1);
}

console.log('Matrix export/import regression check passed.');
