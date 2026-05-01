import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.join(import.meta.dirname, '..'));
const sourcePath = path.join(ROOT, 'tableau_essences_rarete.csv');
const targetPath = path.join(ROOT, 'js', 'data', 'rarete-provenance.js');

const csv = fs.readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '').trimEnd();

const generated = `(function () {
    "use strict";

    const RAW_CSV = ${JSON.stringify(csv)};

    const normalizeKey = (value) => (value == null ? "" : String(value))
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\\u0300-\\u036f]/g, "")
        .replace(/[’']/g, "")
        .replace(/\\s+/g, " ")
        .trim();

    function parseRows(rawCsv) {
        const lines = rawCsv.split(/\\r?\\n/).filter(Boolean);
        if (lines.length <= 1) return [];
        return lines
            .slice(1)
            .map((line) => line.split(";"))
            .filter((cols) => cols.length >= 11)
            .map((cols) => ({
                famille: (cols[0] || "").trim(),
                nomFrancais: (cols[1] || "").trim(),
                nomPiloteEn: (cols[2] || "").trim(),
                nomScientifique: (cols[3] || "").trim(),
                codeEn13556: (cols[4] || "").trim().toUpperCase(),
                origineEn350: (cols[5] || "").trim(),
                origineTropixCirad: (cols[6] || "").trim(),
                origineGuideBenoitFcba: (cols[7] || "").trim(),
                rareteParDefaut: (cols[8] || "").trim(),
                rareteGuideBenoit: (cols[9] || "").trim(),
                disponibiliteBruteBenoit: (cols[10] || "").trim()
            }))
            .filter((entry) => entry.nomFrancais || entry.nomScientifique || entry.codeEn13556);
    }

    const entries = parseRows(RAW_CSV);

    const byCode = new Map();
    const byFrench = new Map();
    const byScientific = new Map();

    entries.forEach((entry) => {
        const codeKey = (entry.codeEn13556 || "").toUpperCase();
        if (codeKey && codeKey !== "X" && !byCode.has(codeKey)) byCode.set(codeKey, entry);

        const frKey = normalizeKey(entry.nomFrancais);
        if (frKey && !byFrench.has(frKey)) byFrench.set(frKey, entry);

        const sciKey = normalizeKey(entry.nomScientifique);
        if (sciKey && !byScientific.has(sciKey)) byScientific.set(sciKey, entry);
    });

    window.VALOBOIS_RARETE_PROVENANCE = {
        source: "tableau_essences_rarete.csv",
        columns: [
            "Famille",
            "Nom français",
            "Nom pilote (EN)",
            "Nom scientifique",
            "Code EN 13556",
            "Origine (EN 350)",
            "Origine (Tropix CIRAD)",
            "Origine (Guide Benoît FCBA)",
            "Rareté par défaut",
            "Rareté (Guide Benoît)",
            "Disponibilité brute Benoît"
        ],
        entries,
        index: {
            byCode,
            byFrench,
            byScientific
        }
    };
})();
`;

fs.writeFileSync(targetPath, generated);
console.log(`Generated ${path.relative(ROOT, targetPath)} from ${path.relative(ROOT, sourcePath)}`);