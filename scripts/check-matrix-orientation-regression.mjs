import { readFileSync } from 'fs';

const csv = readFileSync('valoxylo_matrice_vecteurs_rejets.csv', 'utf8');
const lines = csv.split('\n').filter((line) => line && line.trim());
const dataLines = lines.slice(3).filter((line) => /^\d+;/.test(line));

const toText = (value) => (value == null ? '' : String(value)).trim();

function inferLevelsFromTerms(termsRaw) {
  const terms = toText(termsRaw);
  if (!terms || /^aucun$/i.test(terms) || terms === '-') {
    return { fort: false, moyen: false, faible: false };
  }

  const mentionsStrong = /\b(Fortes?|Forts?)\b/i.test(terms);
  const mentionsMedium = /\b(Moyennes?|Moyens?)\b/i.test(terms);
  const mentionsWeak = /\b(Faibles?)\b/i.test(terms);
  const isRangeA = / à /.test(terms);

  if (isRangeA) {
    if (mentionsStrong && mentionsWeak) return { fort: true, moyen: true, faible: true };
    if (mentionsStrong && mentionsMedium) return { fort: true, moyen: true, faible: false };
    if (mentionsMedium && mentionsWeak) return { fort: false, moyen: true, faible: true };
  }

  return {
    fort: mentionsStrong,
    moyen: mentionsMedium,
    faible: mentionsWeak,
  };
}

const columnByKindOrientation = {
  vectors: {
    combustion: 12,
    recyclage: 15,
    reutilisation: 18,
    reemploi: 25,
  },
  rejects: {
    combustion: 32,
    recyclage: 39,
    reutilisation: 44,
    reemploi: 47,
  },
};

function getLineByRank(rank) {
  const line = dataLines.find((entry) => entry.startsWith(`${rank};`));
  if (!line) throw new Error(`Rang ${rank} introuvable dans le CSV`);
  return line.split(';');
}

function actual(rank, kind, orientation) {
  const cols = getLineByRank(rank);
  const idx = columnByKindOrientation[kind][orientation];
  const terms = toText(cols[idx]);
  return {
    terms,
    levels: inferLevelsFromTerms(terms),
  };
}

function assertLevels(testName, got, expected) {
  const ok = got.fort === expected.fort && got.moyen === expected.moyen && got.faible === expected.faible;
  if (!ok) {
    throw new Error(`${testName}: attendu ${JSON.stringify(expected)} mais recu ${JSON.stringify(got)}`);
  }
}

function decideOrientationFromFlows({ hasNotation, rejects, vectors }) {
  if (!hasNotation) return 'none';

  let orientation = 'reemploi';

  if (!rejects.reemploi && vectors.recyclage) {
    orientation = rejects.recyclage ? 'combustion' : 'recyclage';
  } else if (rejects.reemploi) {
    orientation = 'reutilisation';
    if (rejects.reutilisation) {
      orientation = 'recyclage';
      if (rejects.recyclage) {
        orientation = 'combustion';
      }
    }
  }

  return orientation;
}

function assertOrientation(testName, got, expected) {
  if (got !== expected) {
    throw new Error(`${testName}: attendu ${expected} mais recu ${got}`);
  }
}

const cases = [
  { rank: 1, kind: 'vectors', orientation: 'combustion', expected: { fort: true, moyen: false, faible: false } },
  { rank: 1, kind: 'vectors', orientation: 'reutilisation', expected: { fort: false, moyen: true, faible: true } },
  { rank: 6, kind: 'vectors', orientation: 'reutilisation', expected: { fort: true, moyen: true, faible: true } },
  { rank: 7, kind: 'vectors', orientation: 'reutilisation', expected: { fort: true, moyen: true, faible: true } },
  { rank: 7, kind: 'rejects', orientation: 'reemploi', expected: { fort: true, moyen: true, faible: false } },
  { rank: 10, kind: 'vectors', orientation: 'reutilisation', expected: { fort: true, moyen: false, faible: true } },
  { rank: 10, kind: 'vectors', orientation: 'reemploi', expected: { fort: false, moyen: true, faible: false } },
  { rank: 12, kind: 'vectors', orientation: 'reutilisation', expected: { fort: true, moyen: true, faible: true } },
  { rank: 12, kind: 'rejects', orientation: 'combustion', expected: { fort: true, moyen: true, faible: true } },
];

let passed = 0;
for (const testCase of cases) {
  const { rank, kind, orientation, expected } = testCase;
  const result = actual(rank, kind, orientation);
  const testName = `r${rank} ${kind}.${orientation} (${result.terms || 'Aucun'})`;
  assertLevels(testName, result.levels, expected);
  console.log(`OK  ${testName}`);
  passed += 1;
}

console.log(`\nRegression matrix flow checks: ${passed}/${cases.length} OK`);

const orientationCases = [
  {
    name: 'Aucune notation',
    input: {
      hasNotation: false,
      rejects: { reemploi: false, reutilisation: false, recyclage: false },
      vectors: { recyclage: false },
    },
    expected: 'none',
  },
  {
    name: 'Aucun rejet actif',
    input: {
      hasNotation: true,
      rejects: { reemploi: false, reutilisation: false, recyclage: false },
      vectors: { recyclage: false },
    },
    expected: 'reemploi',
  },
  {
    name: 'Rejet Réemploi uniquement',
    input: {
      hasNotation: true,
      rejects: { reemploi: true, reutilisation: false, recyclage: false },
      vectors: { recyclage: false },
    },
    expected: 'reutilisation',
  },
  {
    name: 'Rejet Réemploi + Réutilisation',
    input: {
      hasNotation: true,
      rejects: { reemploi: true, reutilisation: true, recyclage: false },
      vectors: { recyclage: false },
    },
    expected: 'recyclage',
  },
  {
    name: 'Triple rejet descendant',
    input: {
      hasNotation: true,
      rejects: { reemploi: true, reutilisation: true, recyclage: true },
      vectors: { recyclage: false },
    },
    expected: 'combustion',
  },
  {
    name: 'Vecteur Recyclage sans rejet Réemploi',
    input: {
      hasNotation: true,
      rejects: { reemploi: false, reutilisation: false, recyclage: false },
      vectors: { recyclage: true },
    },
    expected: 'recyclage',
  },
  {
    name: 'Vecteur Recyclage + rejet Recyclage',
    input: {
      hasNotation: true,
      rejects: { reemploi: false, reutilisation: false, recyclage: true },
      vectors: { recyclage: true },
    },
    expected: 'combustion',
  },
];

let orientationPassed = 0;
for (const testCase of orientationCases) {
  const got = decideOrientationFromFlows(testCase.input);
  assertOrientation(testCase.name, got, testCase.expected);
  console.log(`OK  orientation ${testCase.name} -> ${got}`);
  orientationPassed += 1;
}

console.log(`\nRegression orientation decision checks: ${orientationPassed}/${orientationCases.length} OK`);
