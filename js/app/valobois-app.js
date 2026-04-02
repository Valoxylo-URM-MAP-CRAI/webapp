// ── Archives statistiques (conservées pour réutilisation interne) ─────────
// Ces utilitaires restent stockés dans le code mais ne pilotent plus l'UI
// active ni les fonctionnalités métier courantes.
// Métriques archivées: CV, σ, EIq, EIqAbs, MAD, Tukey.

// ── Utilitaires : Coefficient de Variation dimensionnel ───────
const _vbMoyenne = vals =>
  vals.reduce((acc, v) => acc + v, 0) / vals.length;

const _vbEcartType = vals => {
  const m = _vbMoyenne(vals);
  return Math.sqrt(
    vals.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / vals.length
  );
};

const _vbCV = vals => {
  const vv = vals.filter(v => Number.isFinite(v) && v > 0);
  if (vv.length < 2) return null;
  const m = _vbMoyenne(vv);
  if (m === 0) return null;
  return _vbEcartType(vv) / m;
};

// ── Utilitaires : Écart Inter-Quartile normalisé ──────────────
// Interpolation linéaire au percentile p (0-100) sur tableau trié.
const _vbPercentile = (sorted, p) => {
  const r  = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(r);
  const hi = Math.ceil(r);
  return lo === hi
    ? sorted[lo]
    : sorted[lo] + (sorted[hi] - sorted[lo]) * (r - lo);
};

// Retourne (Q3 - Q1) / Q2  ou  null si < 2 valeurs valides.
const _vbEIq = vals => {
  const vv = vals.filter(v => Number.isFinite(v) && v > 0);
  if (vv.length < 2) return null;
  const sorted = [...vv].sort((a, b) => a - b);
  const q1 = _vbPercentile(sorted, 25);
  const q2 = _vbPercentile(sorted, 50);
  const q3 = _vbPercentile(sorted, 75);
  return q2 === 0 ? null : (q3 - q1) / q2;
};

// Retourne l'écart inter-quartile absolu (Q3 − Q1) en unité d'origine (mm).
const _vbEIqAbs = (vals) => {
  const vv = vals.filter(v => Number.isFinite(v) && v > 0);
  if (vv.length < 2) return null;
  const sorted = [...vv].sort((a, b) => a - b);
  const q1 = _vbPercentile(sorted, 25);
  const q3 = _vbPercentile(sorted, 75);
  return q3 - q1;
};

// Retourne les bornes basse et haute selon la règle de Tukey (k = 1.5).
const _vbTukeyFences = (vals, k = 1.5) => {
  const vv = vals.filter(v => Number.isFinite(v) && v > 0);
  if (vv.length < 4) return null;
  const sorted = [...vv].sort((a, b) => a - b);
  const q1  = _vbPercentile(sorted, 25);
  const q3  = _vbPercentile(sorted, 75);
  const eiq = q3 - q1;
  return {
    lowerFence : q1 - k * eiq,
    upperFence : q3 + k * eiq,
    q1, q3, eiq
  };
};

// Mediane d'un tableau de valeurs finies
const vbMedian = vals => {
    const vv = [...vals].filter(v => Number.isFinite(v) && v > 0)
                                            .sort((a, b) => a - b);
    if (!vv.length) return null;
    const mid = Math.floor(vv.length / 2);
    return vv.length % 2 === 0 ? (vv[mid - 1] + vv[mid]) / 2 : vv[mid];
};

// Mediane des ecarts absolus au point de reference ref
const vbMAD = (vals, ref) => {
    if (!Number.isFinite(ref) || ref <= 0) return null;
    const diffs = vals.filter(v => Number.isFinite(v) && v > 0)
                                        .map(v => Math.abs(v - ref))
                                        .sort((a, b) => a - b);
    if (!diffs.length) return null;
    const mid = Math.floor(diffs.length / 2);
    return diffs.length % 2 === 0
        ? (diffs[mid - 1] + diffs[mid]) / 2
        : diffs[mid];
};

class ValoboisApp {
    constructor() {
        this.storageKey = 'valobois_v1';
        this.storageBackupKey = 'valobois_v1_backup';
        /** 'guest' = persistance LocalStorage uniquement ; 'cloud' = Firestore uniquement (pas de payload en local). */
        this.persistenceMode = 'guest';
        this.data = this.loadGuestDataFromLocalStorage();
        this.currentLotIndex = 0;
        this.pendingDeleteLotIndex = null;
        this.pendingPieceCreationDecision = null;
        this.pendingPieceCreationModalOptions = null;
        this.seuilsCharts = {};
        this.radarChart = null;
        this.scatterDimsChart = null;
        this.ensureTermesBoisDatalist();
        this.ensureEssencesBoisDatalist();
        this.ensureTypeProduitDatalist();
        this.bindEvents();
        this.render();
        if (typeof attachValoboisFirestoreSync === 'function') {
            attachValoboisFirestoreSync(this);
        }
        this.refreshPersistenceUi();
    }

    ensureTermesBoisDatalist() {
        let datalist = document.getElementById('liste-termes-bois');
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = 'liste-termes-bois';
            document.body.appendChild(datalist);
        }
        if (datalist.children.length > 0) return;

        TERMES_BOIS.forEach((terme) => {
            const option = document.createElement('option');
            option.value = terme;
            datalist.appendChild(option);
        });
    }

    ensureEssencesBoisDatalist() {
        let datalistCommon = document.getElementById('liste-essences-communes');
        if (!datalistCommon) {
            datalistCommon = document.createElement('datalist');
            datalistCommon.id = 'liste-essences-communes';
            document.body.appendChild(datalistCommon);
        }

        let datalistScientific = document.getElementById('liste-essences-scientifiques');
        if (!datalistScientific) {
            datalistScientific = document.createElement('datalist');
            datalistScientific.id = 'liste-essences-scientifiques';
            document.body.appendChild(datalistScientific);
        }

        if (datalistCommon.children.length > 0 && datalistScientific.children.length > 0) return;

        const shouldFillCommon = datalistCommon.children.length === 0;
        const scientificNames = new Set(Array.from(datalistScientific.querySelectorAll('option')).map((option) => option.value));
        ESSENCES_BOIS.forEach((essence) => {
            if (shouldFillCommon) {
                const commonOption = document.createElement('option');
                commonOption.value = essence.nomUsuel;
                datalistCommon.appendChild(commonOption);
            }
            if (!scientificNames.has(essence.nomScientifique)) {
                scientificNames.add(essence.nomScientifique);
                const scientificOption = document.createElement('option');
                scientificOption.value = essence.nomScientifique;
                datalistScientific.appendChild(scientificOption);
            }
        });
    }

    ensureTypeProduitDatalist() {
        let datalist = document.getElementById('liste-types-produit');
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = 'liste-types-produit';
            document.body.appendChild(datalist);
        }
        if (datalist.children.length > 0) return;

        [
            'Bois Non Taillé (BNT)',
            'Bois Équarri Non Scié (BENS)',
            'Bois Avivé (BA)',
            'Bois Brut Sec (BBS)',
            'Bois Raboté Séché (BRS)',
            'Bois Lamellé-Collé (BLC)',
            'Bois Lamellé-Croisé (CLT)',
            'Bois Contre-Collé (CC)',
            'Bois Ossature (BO)',
            'Bois Fermette (BF)',
            'Bois Massif Abouté (BMA)',
            'Bois Massif Reconstitué (BMR)',
            'Panneau Bois (PB)'
        ].forEach((label) => {
            const option = document.createElement('option');
            option.value = label;
            datalist.appendChild(option);
        });
    }

    findEssenceByCommonName(value) {
        const key = normalizeEssenceLookupKey(value);
        if (!key) return null;
        const detailed = ESSENCES_VALOBOIS_BY_COMMON.get(key);
        if (detailed) return detailed;
        return ESSENCES_BOIS.find((essence) => normalizeEssenceLookupKey(essence.nomUsuel) === key) || null;
    }

    findEssenceByScientificName(value) {
        const key = normalizeEssenceLookupKey(value);
        if (!key) return null;
        const detailed = ESSENCES_VALOBOIS_BY_SCIENTIFIC.get(key);
        if (detailed) return detailed;
        return ESSENCES_BOIS.find((essence) => normalizeEssenceLookupKey(essence.nomScientifique) === key) || null;
    }

    resolveDetailedEssenceForAllotissement(allotissement) {
        if (!allotissement) return null;
        const nomCommun = (allotissement.essenceNomCommun || '').toString().trim();
        const nomScientifique = (allotissement.essenceNomScientifique || '').toString().trim();

        const byCommon = ESSENCES_VALOBOIS_BY_COMMON.get(normalizeEssenceLookupKey(nomCommun));
        if (byCommon) return byCommon;

        const byScientific = ESSENCES_VALOBOIS_BY_SCIENTIFIC.get(normalizeEssenceLookupKey(nomScientifique));
        if (byScientific) return byScientific;

        return null;
    }

    getDetailedMasseVolumiqueAverage(lot) {
        if (!lot || !lot.allotissement) return null;

        let weightedSum = 0;
        let totalWeight = 0;

        if (Array.isArray(lot.pieces)) {
            lot.pieces.forEach((piece) => {
                if (!piece || typeof piece !== 'object') return;
                const normalized = this.normalizeAllotissementNumericInput(piece.masseVolumique);
                if (!normalized) return;
                const rho = parseFloat(normalized);
                if (!Number.isFinite(rho)) return;
                weightedSum += rho;
                totalWeight += 1;
            });
        }

        this.ensureDefaultPiecesData(lot).forEach((defaultPiece) => {
            const defaultQty = Math.max(0, parseFloat((defaultPiece && defaultPiece.quantite) || 0) || 0);
            const defaultRhoNormalized = this.normalizeAllotissementNumericInput(defaultPiece && defaultPiece.masseVolumique);
            if (defaultQty <= 0 || !defaultRhoNormalized) return;
            const defaultRho = parseFloat(defaultRhoNormalized);
            if (!Number.isFinite(defaultRho)) return;
            weightedSum += defaultRho * defaultQty;
            totalWeight += defaultQty;
        });

        if (totalWeight <= 0) return null;
        return weightedSum / totalWeight;
    }

    getMasseVolumiqueSourceLabel(allotissement) {
        if (allotissement && allotissement._masseVolumiqueFromDetail === 'true') {
            return 'Moyenne pondérée';
        }

        const ownNormalized = allotissement && allotissement._ownMasseVolumique != null
            ? this.normalizeAllotissementNumericInput(allotissement._ownMasseVolumique)
            : '';
        if (ownNormalized !== '') {
            const suggested = this.getSuggestedMasseVolumique(allotissement);
            const actual = parseFloat(ownNormalized);
            if (Number.isFinite(actual) && Math.abs(actual - parseFloat(suggested)) > 0.001) {
                return 'Source : Utilisateur';
            }
        }

        const detailed = this.resolveDetailedEssenceForAllotissement(allotissement);
        if (detailed && detailed.sourceDensite) {
            return `Source : ${detailed.sourceDensite}`;
        }

        const suggested = this.getSuggestedMasseVolumique(allotissement);
        if (Number(suggested) === DEFAULT_MASSE_VOLUMIQUE) {
            return 'Source : ρ par défaut';
        }

        return '';
    }

    getSuggestedMasseVolumique(allotissement) {
        if (!allotissement) return DEFAULT_MASSE_VOLUMIQUE;

        const nomCommun = (allotissement.essenceNomCommun || '').toString().trim();
        const nomScientifique = (allotissement.essenceNomScientifique || '').toString().trim();
        const matchByCommon = this.findEssenceByCommonName(nomCommun);

        if (matchByCommon && Number.isFinite(parseFloat(matchByCommon.massevolumique))) {
            return parseFloat(matchByCommon.massevolumique);
        }

        const scientificToCheck = nomScientifique || (matchByCommon && matchByCommon.nomScientifique) || '';
        const matchByScientific = this.findEssenceByScientificName(scientificToCheck);
        if (matchByScientific && Number.isFinite(parseFloat(matchByScientific.massevolumique))) {
            return parseFloat(matchByScientific.massevolumique);
        }

        return DEFAULT_MASSE_VOLUMIQUE;
    }

    applySuggestedMasseVolumique(lot, { force = false } = {}) {
        if (!lot || !lot.allotissement) return DEFAULT_MASSE_VOLUMIQUE;
        const current = this.normalizeAllotissementNumericInput(lot.allotissement.masseVolumique);
        const suggested = this.getSuggestedMasseVolumique(lot.allotissement);
        if (force || current === '') {
            lot.allotissement.masseVolumique = String(suggested);
        }
        return suggested;
    }

    getSuggestedPieceMasseVolumique(piece, lot) {
        return this.getSuggestedMasseVolumique({
            essenceNomCommun: (piece && piece.essenceNomCommun !== '')
                ? piece.essenceNomCommun
                : ((lot && lot.allotissement && lot.allotissement.essenceNomCommun) || ''),
            essenceNomScientifique: (piece && piece.essenceNomScientifique !== '')
                ? piece.essenceNomScientifique
                : ((lot && lot.allotissement && lot.allotissement.essenceNomScientifique) || '')
        });
    }

    applySuggestedPieceMasseVolumique(piece, lot, { force = false } = {}) {
        if (!piece) return DEFAULT_MASSE_VOLUMIQUE;
        const current = this.normalizeAllotissementNumericInput(piece.masseVolumique);
        const suggested = this.getSuggestedPieceMasseVolumique(piece, lot);
        if (force || current === '') {
            piece.masseVolumique = String(suggested);
        }
        return suggested;
    }

    getInitialPieceMasseVolumique(piece) {
        const essenceNomCommun = ((piece && piece.essenceNomCommun) || '').toString().trim();
        const essenceNomScientifique = ((piece && piece.essenceNomScientifique) || '').toString().trim();

        if (essenceNomCommun === '' && essenceNomScientifique === '') {
            return DEFAULT_MASSE_VOLUMIQUE;
        }

        return this.getSuggestedMasseVolumique({
            essenceNomCommun,
            essenceNomScientifique
        });
    }

    ensurePieceMasseVolumiqueInitialized(piece) {
        if (!piece) return DEFAULT_MASSE_VOLUMIQUE;

        const current = this.normalizeAllotissementNumericInput(piece.masseVolumique);
        if (current !== '') {
            piece.masseVolumique = current;
            return parseFloat(current);
        }

        const initial = this.getInitialPieceMasseVolumique(piece);
        piece.masseVolumique = String(initial);
        return initial;
    }

    createDefaultPieceId() {
        return `default-piece-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }

    createEmptyDefaultPiece() {
        return {
            id: this.createDefaultPieceId(),
            quantite: '1',
            localisation: '',
            situation: '',
            typePiece: '',
            typeProduit: '',
            essenceNomCommun: '',
            essenceNomScientifique: '',
            essence: '',
            longueur: '',
            largeur: '',
            epaisseur: '',
            diametre: '',
            prixUnite: '',
            prixMarche: '',
            masseVolumique: String(DEFAULT_MASSE_VOLUMIQUE),
            masseVolumiqueMesuree: '',
            massePieceMesuree: '',
            humidite: '',
            fractionCarbonee: '',
            bois: '',
            ageArbre: '',
            dateMiseEnService: ''
        };
    }

    ensureDefaultPieceShape(lot, piece, { fallbackQty = '', fallbackLocation = '', fallbackSituation = '' } = {}) {
        const target = (piece && typeof piece === 'object') ? piece : this.createEmptyDefaultPiece();

        if (target.id == null || target.id === '') target.id = this.createDefaultPieceId();
        if (target.quantite == null || target.quantite === '') target.quantite = fallbackQty;
        if (target.localisation == null) target.localisation = fallbackLocation;
        if (target.situation == null) target.situation = fallbackSituation;
        if (target.typePiece == null) target.typePiece = '';
        if (target.typeProduit == null) target.typeProduit = '';
        if (target.essenceNomCommun == null) target.essenceNomCommun = '';
        if (target.essenceNomScientifique == null) target.essenceNomScientifique = '';
        if (target.essence == null) target.essence = '';
        if (target.longueur == null) target.longueur = '';
        if (target.largeur == null) target.largeur = '';
        if (target.epaisseur == null) target.epaisseur = target.hauteur != null ? target.hauteur : '';
        delete target.hauteur;
        if (target.diametre == null) target.diametre = '';
        if (target.prixUnite == null) target.prixUnite = '';
        if (target.prixMarche == null) target.prixMarche = '';
        if (target.masseVolumique == null) target.masseVolumique = '';
        if (target.masseVolumiqueMesuree == null) target.masseVolumiqueMesuree = '';
        if (target.massePieceMesuree == null) target.massePieceMesuree = '';
        this.ensurePieceMasseVolumiqueInitialized(target);
        if (target.humidite == null) target.humidite = '';
        if (target.fractionCarbonee == null) target.fractionCarbonee = '';
        if (target.bois == null) target.bois = '';
        if (target.ageArbre == null) target.ageArbre = '';
        if (target.dateMiseEnService == null) target.dateMiseEnService = '';

        return target;
    }

    ensureDefaultPiecesData(lot, { createIfEmpty = false } = {}) {
        if (!lot) {
            return createIfEmpty ? [this.ensureDefaultPieceShape(null, this.createEmptyDefaultPiece())] : [];
        }

        const qLot = parseFloat((lot.allotissement && lot.allotissement.quantite) || 0) || 0;
        const nbPieces = Array.isArray(lot.pieces) ? lot.pieces.length : 0;
        const derivedQty = Math.max(0, qLot - nbPieces);
        const fallbackQty = derivedQty > 0 ? String(derivedQty) : '';
        const fallbackLocation = (lot.localisation || '').toString();
        const fallbackSituation = (lot.situation || '').toString();

        if (!Array.isArray(lot.defaultPieces)) {
            const basePiece = (lot.defaultPiece && typeof lot.defaultPiece === 'object')
                ? lot.defaultPiece
                : null;
            lot.defaultPieces = basePiece ? [this.ensureDefaultPieceShape(lot, basePiece, {
                fallbackQty,
                fallbackLocation,
                fallbackSituation
            })] : [];
        } else {
            lot.defaultPieces = lot.defaultPieces
                .filter((piece) => piece && typeof piece === 'object')
                .map((piece, index) => this.ensureDefaultPieceShape(lot, piece, {
                    fallbackQty: index === 0 ? fallbackQty : '0',
                    fallbackLocation,
                    fallbackSituation
                }));
        }

        if (createIfEmpty && !lot.defaultPieces.length) {
            lot.defaultPieces = [this.ensureDefaultPieceShape(lot, this.createEmptyDefaultPiece(), {
                fallbackQty,
                fallbackLocation,
                fallbackSituation
            })];
        }

        lot.defaultPiece = lot.defaultPieces[0] || null;
        return lot.defaultPieces;
    }

    getDefaultPieceById(lot, defaultPieceId = null) {
        const defaultPieces = this.ensureDefaultPiecesData(lot, { createIfEmpty: false });
        if (defaultPieceId != null && defaultPieceId !== '') {
            const found = defaultPieces.find((piece) => piece.id === defaultPieceId);
            if (found) return found;
        }
        return defaultPieces[0] || null;
    }

    getTotalDefaultPieceQuantity(lot) {
        return this.ensureDefaultPiecesData(lot, { createIfEmpty: false }).reduce((sum, piece) => {
            return sum + Math.max(0, parseFloat(piece && piece.quantite) || 0);
        }, 0);
    }

    resetDefaultPieceData(defaultPiece) {
        if (!defaultPiece) return;
        defaultPiece.localisation = '';
        defaultPiece.situation = '';
        defaultPiece.typePiece = '';
        defaultPiece.typeProduit = '';
        defaultPiece.essenceNomCommun = '';
        defaultPiece.essenceNomScientifique = '';
        defaultPiece.essence = '';
        defaultPiece.longueur = '';
        defaultPiece.largeur = '';
        defaultPiece.epaisseur = '';
        defaultPiece.diametre = '';
        defaultPiece.prixUnite = '';
        defaultPiece.prixMarche = '';
        defaultPiece.masseVolumique = String(DEFAULT_MASSE_VOLUMIQUE);
        defaultPiece.masseVolumiqueMesuree = '';
        defaultPiece.massePieceMesuree = '';
        defaultPiece.humidite = '';
        defaultPiece.fractionCarbonee = '';
        defaultPiece.bois = '';
        defaultPiece.ageArbre = '';
        defaultPiece.dateMiseEnService = '';
        defaultPiece.quantite = '0';
    }

    ensureDefaultPieceData(lot, defaultPieceId = null) {
        return this.getDefaultPieceById(lot, defaultPieceId);
    }

    buildPieceFromDefault(lot, index, defaultPieceId = null) {
        const dp = this.ensureDefaultPieceData(lot, defaultPieceId);
        const a = lot && lot.allotissement ? lot.allotissement : {};
        const piece = this.createEmptyPiece(index);
        const source = dp || {};
        piece.sourceDefaultPieceId = source.id || null;
        piece.localisation = source.localisation || '';
        piece.situation = source.situation || '';
        piece.typePiece = source.typePiece || a.typePiece || '';
        piece.typeProduit = source.typeProduit || a.typeProduit || '';
        piece.essenceNomCommun = source.essenceNomCommun || a.essenceNomCommun || '';
        piece.essenceNomScientifique = source.essenceNomScientifique || a.essenceNomScientifique || '';
        piece.essence = [piece.essenceNomCommun, piece.essenceNomScientifique].filter(Boolean).join(' - ');
        piece.longueur = source.longueur !== '' && source.longueur != null ? source.longueur : (a.longueur || '');
        piece.largeur = source.largeur !== '' && source.largeur != null ? source.largeur : (a.largeur || '');
        piece.epaisseur = source.epaisseur !== '' && source.epaisseur != null ? source.epaisseur : (a.epaisseur || '');
        piece.diametre = source.diametre !== '' && source.diametre != null ? source.diametre : (a.diametre || '');
        piece.prixUnite = (source.prixUnite || a.prixUnite || 'm3').toLowerCase();
        piece.prixMarche = source.prixMarche !== '' && source.prixMarche != null ? source.prixMarche : (a.prixMarche || '');
        piece.masseVolumique = source.masseVolumique !== '' && source.masseVolumique != null
            ? source.masseVolumique
            : String(this.getInitialPieceMasseVolumique(source));
        piece.masseVolumiqueMesuree = source.masseVolumiqueMesuree !== '' && source.masseVolumiqueMesuree != null ? source.masseVolumiqueMesuree : '';
        piece.massePieceMesuree = source.massePieceMesuree !== '' && source.massePieceMesuree != null ? source.massePieceMesuree : '';
        piece.humidite = source.humidite !== '' && source.humidite != null ? String(source.humidite) : (a.humidite !== undefined ? String(a.humidite) : '');
        piece.fractionCarbonee = source.fractionCarbonee !== '' && source.fractionCarbonee != null ? String(source.fractionCarbonee) : (a.fractionCarbonee !== undefined ? String(a.fractionCarbonee) : '');
        piece.bois = source.bois !== '' && source.bois != null ? String(source.bois) : (a.bois !== undefined ? String(a.bois) : '');
        return piece;
    }

    addDetailedPieceToLot(lot, piece, { deductDefaultPiece = false, defaultPieceId = null } = {}) {
        if (!lot || !piece) return;

        const dp = this.ensureDefaultPieceData(lot, defaultPieceId || piece.sourceDefaultPieceId);
        lot.pieces.push(piece);

        if (piece.sourceDefaultPieceId == null && dp && dp.id) {
            piece.sourceDefaultPieceId = dp.id;
        }

        if (deductDefaultPiece && dp) {
            const currentDefaultQty = Math.max(0, parseFloat(dp.quantite || 0) || 0);
            if (currentDefaultQty > 0) {
                dp.quantite = String(Math.max(0, currentDefaultQty - 1));
            }
        }

        this.setDetailLotActiveCardKey(lot, `piece:${lot.pieces.length - 1}`, { persist: false });
        lot.allotissement.quantite = String(this.getLotQuantityFromDetail(lot));
        this.recalculateLotAllotissement(lot);
        this.saveData();
        this.renderAllotissement();
        this.renderDetailLot();
    }

    deletePieceFromLot(lot, pi, { restoreDefaultPiece = false } = {}) {
        if (!lot || !Array.isArray(lot.pieces) || pi < 0 || pi >= lot.pieces.length) return;

        const piece = lot.pieces[pi];
        const dp = this.ensureDefaultPieceData(lot, piece && piece.sourceDefaultPieceId);
        lot.pieces.splice(pi, 1);
        lot.pieces.forEach((p, idx) => { p.nom = `Pi\u00e8ce ${idx + 1}`; });

        if (restoreDefaultPiece && dp) {
            const currentDefaultQty = Math.max(0, parseFloat(dp.quantite || 0) || 0);
            dp.quantite = String(currentDefaultQty + 1);
        }

        this.setDetailLotActiveCardKey(lot, dp && dp.id ? `default:${dp.id}` : null, { persist: false });
        lot.allotissement.quantite = String(this.getLotQuantityFromDetail(lot));
        this.recalculateLotAllotissement(lot);
        this.saveData();
        this.renderAllotissement();
        this.renderDetailLot();
    }

    cloneDefaultPiece(lot, sourceDefaultPieceId) {
        if (!lot || !sourceDefaultPieceId) return null;
        
        const source = this.ensureDefaultPieceData(lot, sourceDefaultPieceId);
        if (!source) return null;
        
        // Clone profond de tous les champs de la pièce par défaut
        const cloned = {
            id: this.createDefaultPieceId(),
            quantite: '1', // Nouvelle pièce avec quantité 1
            localisation: source.localisation || '',
            situation: source.situation || '',
            typePiece: source.typePiece || '',
            typeProduit: source.typeProduit || '',
            essenceNomCommun: source.essenceNomCommun || '',
            essenceNomScientifique: source.essenceNomScientifique || '',
            essence: source.essence || '',
            longueur: source.longueur || '',
            largeur: source.largeur || '',
            epaisseur: source.epaisseur || '',
            diametre: source.diametre || '',
            prixUnite: source.prixUnite || '',
            prixMarche: source.prixMarche || '',
            masseVolumique: source.masseVolumique || String(DEFAULT_MASSE_VOLUMIQUE),
            masseVolumiqueMesuree: source.masseVolumiqueMesuree || '',
            massePieceMesuree: source.massePieceMesuree || '',
            humidite: source.humidite || '',
            fractionCarbonee: source.fractionCarbonee || '',
            bois: source.bois || '',
            ageArbre: source.ageArbre || '',
            dateMiseEnService: source.dateMiseEnService || ''
        };
        
        // Normaliser la structure du clone
        this.ensureDefaultPieceShape(lot, cloned);
        
        // Ajouter à la liste des pièces par défaut
        if (!Array.isArray(lot.defaultPieces)) {
            lot.defaultPieces = [];
        }
        lot.defaultPieces.push(cloned);
        
        // Mettre à jour la référence rapide si c'est la première pièce
        if (!lot.defaultPiece) {
            lot.defaultPiece = cloned;
        }
        
        return cloned;
    }

    requestDefaultPieceDuplication(lot, defaultPieceId) {
        if (!lot || !defaultPieceId) return;

        const dp = this.ensureDefaultPieceData(lot, defaultPieceId);
        if (!dp) return;

        const detailedPiece = this.buildPieceFromDefault(lot, lot.pieces.length, defaultPieceId);

        this.openCreatePieceDeductionModal({
            showCreationModeChoice: true,
            onDecision: (decision) => {
                const mode = decision && typeof decision === 'object' ? decision.creationMode : 'detailed';
                if (mode === 'default') {
                    const clonedDefaultPiece = this.cloneDefaultPiece(lot, defaultPieceId);
                    if (!clonedDefaultPiece) return;
                    this.setDetailLotActiveCardKey(lot, `default:${clonedDefaultPiece.id}`, { persist: false });
                    lot.allotissement.quantite = String(this.getLotQuantityFromDetail(lot));
                    this.recalculateLotAllotissement(lot);
                    this.saveData();
                    this.renderAllotissement();
                    this.renderDetailLot();
                    return;
                }

                const shouldDeductDefault = !!(decision && typeof decision === 'object' && decision.shouldDeductDefault);
                this.addDetailedPieceToLot(lot, detailedPiece, {
                    deductDefaultPiece: shouldDeductDefault,
                    defaultPieceId: dp && dp.id
                });
            }
        });
    }

    requestDetailedPieceCreation(lot, piece, defaultPieceId = null) {
        if (!lot || !piece) return;

        const dp = this.ensureDefaultPieceData(lot, defaultPieceId || piece.sourceDefaultPieceId);
        if (piece.sourceDefaultPieceId == null && dp && dp.id) {
            piece.sourceDefaultPieceId = dp.id;
        }
        const currentDefaultQty = dp ? Math.max(0, parseFloat(dp.quantite || 0) || 0) : 0;
        if (currentDefaultQty <= 0) {
            this.addDetailedPieceToLot(lot, piece, { deductDefaultPiece: false, defaultPieceId: dp && dp.id });
            return;
        }

        this.openCreatePieceDeductionModal({
            onDecision: (decision) => {
                const shouldDeductDefault = !!(decision && typeof decision === 'object'
                    ? decision.shouldDeductDefault
                    : decision);
                this.addDetailedPieceToLot(lot, piece, {
                    deductDefaultPiece: shouldDeductDefault,
                    defaultPieceId: dp && dp.id
                });
            }
        });
    }

    deleteDefaultPieceFromLot(lot, defaultPieceId, { generateDetailedPieces = false } = {}) {
        if (!lot || !defaultPieceId) return;
        const defaultPieces = this.ensureDefaultPiecesData(lot, { createIfEmpty: false });
        const index = defaultPieces.findIndex((piece) => piece && piece.id === defaultPieceId);
        if (index < 0) return;

        const removedDefaultPiece = defaultPieces[index];
        const generatedCount = generateDetailedPieces
            ? Math.max(0, Math.floor(parseFloat((removedDefaultPiece && removedDefaultPiece.quantite) || 0) || 0))
            : 0;

        if (generatedCount > 0) {
            for (let i = 0; i < generatedCount; i += 1) {
                const newPiece = this.buildPieceFromDefault(lot, lot.pieces.length, defaultPieceId);
                newPiece.sourceDefaultPieceId = null;
                lot.pieces.push(newPiece);
            }
        }

        defaultPieces.splice(index, 1);
        lot.defaultPiece = defaultPieces[0] || null;

        (lot.pieces || []).forEach((piece, pieceIndex) => {
            piece.nom = `Pièce ${pieceIndex + 1}`;
            if (piece.sourceDefaultPieceId === defaultPieceId) {
                piece.sourceDefaultPieceId = null;
            }
        });

        const nextDefault = defaultPieces[index] || defaultPieces[index - 1] || null;
        const nextCardKey = nextDefault && nextDefault.id
            ? `default:${nextDefault.id}`
            : (lot.pieces.length > 0 ? `piece:${Math.max(0, lot.pieces.length - 1)}` : null);

        this.setDetailLotActiveCardKey(lot, nextCardKey, { persist: false });
        lot.allotissement.quantite = String(this.getLotQuantityFromDetail(lot));
        this.recalculateLotAllotissement(lot);
        this.saveData();
        this.renderAllotissement();
        this.renderDetailLot();
    }

    getLotLocationSituationGroups(lot) {
        if (!lot) return [];
        const groups = new Map();
        const addGroup = (localisation, situation, label) => {
            const loc = (localisation || '').toString().trim();
            const sit = (situation || '').toString().trim();
            if (!loc && !sit) return;
            const key = `${loc}||${sit}`;
            if (!groups.has(key)) {
                groups.set(key, { key, localisation: loc, situation: sit, labels: [] });
            }
            groups.get(key).labels.push(label);
        };

        this.ensureDefaultPiecesData(lot).forEach((defaultPiece, index) => {
            const defaultQty = parseFloat(defaultPiece.quantite || 0) || 0;
            if (defaultQty > 0) {
                addGroup(defaultPiece.localisation, defaultPiece.situation, `Pièce par défaut ${index + 1} (${Math.round(defaultQty)})`);
            }
        });

        (lot.pieces || []).forEach((piece, index) => {
            addGroup(piece.localisation, piece.situation, `Pièce ${index + 1}`);
        });

        return Array.from(groups.values());
    }

    getLotQuantityFromDetail(lot) {
        if (!lot) return 0;
        const defaultQty = this.getTotalDefaultPieceQuantity(lot);
        const pieceQty = Array.isArray(lot.pieces) ? lot.pieces.length : 0;
        return defaultQty + pieceQty;
    }

    normalizeLotEssenceFields(lot) {
        if (!lot || !lot.allotissement) return;
        const allotissement = lot.allotissement;

        let nomCommun = (allotissement.essenceNomCommun || '').toString().trim();
        let nomScientifique = (allotissement.essenceNomScientifique || '').toString().trim();
        const legacyEssence = (allotissement.essence || '').toString().trim();

        if (!nomCommun && !nomScientifique && legacyEssence) {
            const parts = legacyEssence.split(' - ');
            if (parts.length > 1) {
                nomCommun = parts[0].trim();
                nomScientifique = parts.slice(1).join(' - ').trim();
            } else {
                nomCommun = legacyEssence;
            }
        }

        if (nomCommun && !nomScientifique) {
            const match = this.findEssenceByCommonName(nomCommun);
            if (match) nomScientifique = match.nomScientifique;
        }

        if (nomScientifique && !nomCommun) {
            const match = this.findEssenceByScientificName(nomScientifique);
            if (match) nomCommun = match.nomUsuel;
        }

        allotissement.essenceNomCommun = nomCommun;
        allotissement.essenceNomScientifique = nomScientifique;
        allotissement.essence = [nomCommun, nomScientifique].filter(Boolean).join(' - ');
    }

    normalizeLotAllotissementFields(lot) {
        if (!lot || !lot.allotissement) return;
        const allotissement = lot.allotissement;

        // Migration legacy : ces champs appartiennent au lot (racine), pas à allotissement.
        if ((lot.localisation == null || lot.localisation === '') && allotissement.localisation != null && allotissement.localisation !== '') {
            lot.localisation = String(allotissement.localisation);
        }
        if ((lot.situation == null || lot.situation === '') && allotissement.situation != null && allotissement.situation !== '') {
            lot.situation = String(allotissement.situation);
        }
        if (lot.localisation == null) lot.localisation = '';
        if (lot.situation == null) lot.situation = '';
        delete allotissement.localisation;
        delete allotissement.situation;

        if (allotissement.masseVolumique == null || allotissement.masseVolumique === '') {
            allotissement.masseVolumique = String(this.getSuggestedMasseVolumique(allotissement));
        }
        if (allotissement.humidite == null) allotissement.humidite = 12;
        if (allotissement.fractionCarbonee == null) allotissement.fractionCarbonee = 50;
        if (allotissement.bois == null) allotissement.bois = 100;
        if (allotissement.typeProduit == null) allotissement.typeProduit = '';
        if (allotissement.diametre == null) allotissement.diametre = '';
        // Migration: hauteur → epaisseur
        if (allotissement.epaisseur == null) { allotissement.epaisseur = allotissement.hauteur != null ? allotissement.hauteur : ''; }
        delete allotissement.hauteur;
        if (allotissement.carboneBiogeniqueEstime == null) allotissement.carboneBiogeniqueEstime = '';
        if (allotissement.prixLotDirect == null) allotissement.prixLotDirect = false;
        if (!Array.isArray(lot.pieces)) lot.pieces = [];
        lot.pieces.forEach((piece) => {
            if (!piece || typeof piece !== 'object') return;
            if (piece.localisation == null) piece.localisation = '';
            if (piece.situation == null) piece.situation = '';
            if (piece.typeProduit == null) piece.typeProduit = '';
            if (piece.masseVolumiqueMesuree == null) piece.masseVolumiqueMesuree = '';
            if (piece.massePieceMesuree == null) piece.massePieceMesuree = '';
            // Migration: hauteur → epaisseur
            if (piece.epaisseur == null) { piece.epaisseur = piece.hauteur != null ? piece.hauteur : ''; }
            delete piece.hauteur;
            this.ensurePieceMasseVolumiqueInitialized(piece);
        });
        this.ensureDefaultPiecesData(lot, { createIfEmpty: false });
        if (!lot.poidsSimilarite || typeof lot.poidsSimilarite !== 'object') {
            lot.poidsSimilarite = { longueur: 0, largeur: 0, epaisseur: 0, diametre: 0 };
        } else {
            if (lot.poidsSimilarite.longueur == null) lot.poidsSimilarite.longueur = 0;
            if (lot.poidsSimilarite.largeur == null) lot.poidsSimilarite.largeur = 0;
            if (lot.poidsSimilarite.epaisseur == null) lot.poidsSimilarite.epaisseur = 0;
            if (lot.poidsSimilarite.diametre == null) lot.poidsSimilarite.diametre = 0;
        }
        if (!lot.seuilsDestination || typeof lot.seuilsDestination !== 'object') {
            lot.seuilsDestination = {
                longueur: { min: null, max: null },
                largeur: { min: null, max: null },
                epaisseur: { min: null, max: null },
                diametre: { min: null, max: null },
            };
        } else {
            if (!lot.seuilsDestination.longueur || typeof lot.seuilsDestination.longueur !== 'object') {
                lot.seuilsDestination.longueur = { min: null, max: null };
            }
            if (lot.seuilsDestination.longueur.min == null) lot.seuilsDestination.longueur.min = null;
            if (lot.seuilsDestination.longueur.max == null) lot.seuilsDestination.longueur.max = null;
            if (!lot.seuilsDestination.largeur || typeof lot.seuilsDestination.largeur !== 'object') {
                lot.seuilsDestination.largeur = { min: null, max: null };
            }
            if (lot.seuilsDestination.largeur.min == null) lot.seuilsDestination.largeur.min = null;
            if (lot.seuilsDestination.largeur.max == null) lot.seuilsDestination.largeur.max = null;
            if (!lot.seuilsDestination.epaisseur || typeof lot.seuilsDestination.epaisseur !== 'object') {
                lot.seuilsDestination.epaisseur = { min: null, max: null };
            }
            if (lot.seuilsDestination.epaisseur.min == null) lot.seuilsDestination.epaisseur.min = null;
            if (lot.seuilsDestination.epaisseur.max == null) lot.seuilsDestination.epaisseur.max = null;
            if (!lot.seuilsDestination.diametre || typeof lot.seuilsDestination.diametre !== 'object') {
                lot.seuilsDestination.diametre = { min: null, max: null };
            }
            if (lot.seuilsDestination.diametre.min == null) lot.seuilsDestination.diametre.min = null;
            if (lot.seuilsDestination.diametre.max == null) lot.seuilsDestination.diametre.max = null;
        }
        if (!lot.seuilsDestinationOffset || typeof lot.seuilsDestinationOffset !== 'object') {
            lot.seuilsDestinationOffset = {
                longueur: { min: null, max: null },
                largeur: { min: null, max: null },
                epaisseur: { min: null, max: null },
                diametre: { min: null, max: null },
            };
        } else {
            if (!lot.seuilsDestinationOffset.longueur || typeof lot.seuilsDestinationOffset.longueur !== 'object') {
                lot.seuilsDestinationOffset.longueur = { min: null, max: null };
            }
            if (lot.seuilsDestinationOffset.longueur.min == null) lot.seuilsDestinationOffset.longueur.min = null;
            if (lot.seuilsDestinationOffset.longueur.max == null) lot.seuilsDestinationOffset.longueur.max = null;
            if (!lot.seuilsDestinationOffset.largeur || typeof lot.seuilsDestinationOffset.largeur !== 'object') {
                lot.seuilsDestinationOffset.largeur = { min: null, max: null };
            }
            if (lot.seuilsDestinationOffset.largeur.min == null) lot.seuilsDestinationOffset.largeur.min = null;
            if (lot.seuilsDestinationOffset.largeur.max == null) lot.seuilsDestinationOffset.largeur.max = null;
            if (!lot.seuilsDestinationOffset.epaisseur || typeof lot.seuilsDestinationOffset.epaisseur !== 'object') {
                lot.seuilsDestinationOffset.epaisseur = { min: null, max: null };
            }
            if (lot.seuilsDestinationOffset.epaisseur.min == null) lot.seuilsDestinationOffset.epaisseur.min = null;
            if (lot.seuilsDestinationOffset.epaisseur.max == null) lot.seuilsDestinationOffset.epaisseur.max = null;
            if (!lot.seuilsDestinationOffset.diametre || typeof lot.seuilsDestinationOffset.diametre !== 'object') {
                lot.seuilsDestinationOffset.diametre = { min: null, max: null };
            }
            if (lot.seuilsDestinationOffset.diametre.min == null) lot.seuilsDestinationOffset.diametre.min = null;
            if (lot.seuilsDestinationOffset.diametre.max == null) lot.seuilsDestinationOffset.diametre.max = null;
        }
        if (typeof lot.seuilsDestinationOffsetMigrated !== 'boolean') {
            lot.seuilsDestinationOffsetMigrated = false;
        }
    }

    createEmptyLot(index) {
        const defaultPiece = this.createEmptyDefaultPiece();
        return {
            id: Date.now() + index,
            nom: `Lot ${index + 1}`,
            localisation: '',
            situation: '',
            allotissement: {
                quantite: '1',
                typePiece: '',
                typeProduit: '',
                essenceNomCommun: '',
                essenceNomScientifique: '',
                essence: '',
                longueur: '',
                largeur: '',
                epaisseur: '',
                diametre: '',
                cvLongueur: null,
                cvLargeur: null,
                cvEpaisseur: null,
                cvDiametre: null,
                ecartTypeLongueur: null,
                ecartTypeLargeur: null,
                ecartTypeEpaisseur: null,
                ecartTypeDiametre: null,
                eiqLongueur: null,
                eiqLargeur: null,
                eiqEpaisseur: null,
                eiqDiametre: null,
                eiqAbsLongueur: null,
                eiqAbsLargeur: null,
                eiqAbsEpaisseur: null,
                eiqAbsDiametre: null,
                tauxSimilarite: null,
                medoideKey: null,
                medoideLabel: null,
                medoideScore: null,
                medoideDims: null,
                madLongueur: null,
                madLargeur: null,
                madEpaisseur: null,
                madDiametre: null,
                seuilSuggest: null,
                conformiteLot: null,
                tukeyLongueur: null,
                tukeyLargeur: null,
                tukeyEpaisseur: null,
                tukeyDiametre: null,
                prixUnite: 'm3',
                prixMarche: '',
                surfacePiece: 0,
                surfaceLot: 0,
                volumePiece: 0,
                volumeLot: 0,
                prixLot: 0,
                prixLotAjusteIntegrite: 0,
                lineaireLot: 0,
                masseVolumique: DEFAULT_MASSE_VOLUMIQUE,
                masseLot: 0,
                humidite: 12,
                fractionCarbonee: 50,
                bois: 100,
                carboneBiogeniqueEstime: '',
                destination: ''
            },
            inspection: {
                visibilite: null,
                instrumentation: null,
                integrite: { niveau: null, ignore: false, coeff: null }
            },
            bio: {
                purge: null, expansion: null, integriteBio: null, exposition: null, confianceBio: null
            },
            mech: {
                purgeMech: null, feuMech: null, integriteMech: null, expositionMech: null, confianceMech: null
            },
            usage: {
                confianceUsage: null, durabiliteUsage: null, classementUsage: null, humiditeUsage: null, aspectUsage: null
            },
            denat: {
                depollutionDenat: null, contaminationDenat: null, durabiliteConfDenat: null, confianceDenat: null, naturaliteDenat: null
            },
            debit: {
                regulariteDebit: null, volumetrieDebit: null, stabiliteDebit: null, artisanaliteDebit: null, rusticiteDebit: null
            },
            geo: {
                adaptabiliteGeo: null, massiviteGeo: null, deformationGeo: null, industrialiteGeo: null, inclusiviteGeo: null
            },
            essence: {
                confianceEssence: null, rareteEcoEssence: null, masseVolEssence: null, rareteHistEssence: null, singulariteEssence: null
            },
            ancien: {
                confianceAncien: null, amortissementAncien: null, vieillissementAncien: null, microhistoireAncien: null, demontabiliteAncien: null
            },
            traces: {
                confianceTraces: null, etiquetageTraces: null, alterationTraces: null, documentationTraces: null, singularitesTraces: null
            },
            provenance: {
                confianceProv: null, transportProv: null, reputationProv: null, macroProv: null, territorialiteProv: null
            },
            defaultPiece,
            defaultPieces: [defaultPiece],
            pieces: [],
            criteres: [],
            poidsSimilarite: { longueur: 0, largeur: 0, epaisseur: 0, diametre: 0 },
            seuilsDestination: {
                longueur: { min: null, max: null },
                largeur: { min: null, max: null },
                epaisseur: { min: null, max: null },
                diametre: { min: null, max: null },
            },
            seuilsDestinationOffset: {
                longueur: { min: null, max: null },
                largeur: { min: null, max: null },
                epaisseur: { min: null, max: null },
                diametre: { min: null, max: null },
            },
            seuilsDestinationOffsetMigrated: true,
        };
    }

    createEmptyPiece(index) {
        return {
            nom: `Pièce ${index + 1}`,
            sourceDefaultPieceId: null,
            localisation: '',
            situation: '',
            typePiece: '',
            typeProduit: '',
            essenceNomCommun: '',
            essenceNomScientifique: '',
            essence: '',
            longueur: '',
            largeur: '',
            epaisseur: '',
            diametre: '',
            prixUnite: '',
            prixMarche: '',
            surfacePiece: 0,
            volumePiece: 0,
            prixPiece: 0,
            prixPieceAjusteIntegrite: 0,
            masseVolumique: String(DEFAULT_MASSE_VOLUMIQUE),
            masseVolumiqueMesuree: '',
            massePieceMesuree: '',
            humidite: '',
            fractionCarbonee: '',
            bois: '',
            ageArbre: '',
            dateMiseEnService: '',
            massePiece: 0,
            carboneBiogeniqueEstime: ''
        };
    }

    createInitialData() {
        return {
            meta: this.getDefaultMeta(),
            ui: this.getDefaultUi(),
            lots: [this.createEmptyLot(0), this.createEmptyLot(1)]
        };
    }

    getDefaultUi(existingUi = {}) {
        const existingCollapsibles = (existingUi && existingUi.collapsibles) || {};
        const existingDetailLotActiveCardByLot = (existingUi && existingUi.detailLotActiveCardByLot) || {};
        return {
            collapsibles: {
                apropos: false,
                'reference-operation': false,
                diagnostiqueur: false,
                contacts: false,
                'contexte-technique': false,
                documents: false,
                notes: false,
                ...existingCollapsibles
            },
            detailLotActiveCardByLot: { ...existingDetailLotActiveCardByLot },
            // [ARCHIVE TECHNIQUE] Seuils historiques conservés pour compatibilité
            // des données locales et réutilisation future éventuelle.
            seuilsVariabilite: {
                longueur:  { t1: 8,  t2: 20, t3: 40,
                             ...existingUi?.seuilsVariabilite?.longueur },
                largeur:   { t1: 5,  t2: 15, t3: 30,
                             ...existingUi?.seuilsVariabilite?.largeur },
                epaisseur: { t1: 5,  t2: 15, t3: 30,
                             ...existingUi?.seuilsVariabilite?.epaisseur },
                diametre:  { t1: 8,  t2: 20, t3: 35,
                             ...existingUi?.seuilsVariabilite?.diametre }
            },
            seuilsVariabiliteEiqAbs: {
                longueur:  { t1: 50,  t2: 150, t3: 300,
                             ...existingUi?.seuilsVariabiliteEiqAbs?.longueur },
                largeur:   { t1: 10,  t2: 30,  t3: 60,
                             ...existingUi?.seuilsVariabiliteEiqAbs?.largeur },
                epaisseur: { t1: 5,   t2: 15,  t3: 30,
                             ...existingUi?.seuilsVariabiliteEiqAbs?.epaisseur },
                diametre:  { t1: 30,  t2: 80,  t3: 150,
                             ...existingUi?.seuilsVariabiliteEiqAbs?.diametre }
            }
        };
    }

    getDefaultMeta(existingMeta = {}) {
        const legacyOperateur = (existingMeta.operateur || '').toString();
        return {
            operation: '',
            date: '',
            versionEtude: '',
            statutEtude: 'Pré-diagnostic',
            diagnostiqueurNom: '',
            diagnostiqueurContact: legacyOperateur,
            diagnostiqueurMail: '',
            diagnostiqueurTelephone: '',
            diagnostiqueurAdresse: '',
            maitriseOuvrageNom: '',
            maitriseOuvrageContact: '',
            maitriseOuvrageMail: '',
            maitriseOuvrageTelephone: '',
            maitriseOuvrageAdresse: '',
            maitriseOeuvreNom: '',
            maitriseOeuvreContact: '',
            maitriseOeuvreMail: '',
            maitriseOeuvreTelephone: '',
            maitriseOeuvreAdresse: '',
            entrepriseDeconstructionNom: '',
            entrepriseDeconstructionContact: '',
            entrepriseDeconstructionMail: '',
            entrepriseDeconstructionTelephone: '',
            entrepriseDeconstructionAdresse: '',
            typeBatiment: '',
            periodeConstruction: '',
            phaseIntervention: '',
            localisation: '',
            conditionnementType: '',
            protectionType: '',
            diagnosticStructure: '',
            diagnosticAmiante: '',
            diagnosticPlomb: '',
            commentaires: '',
            ...existingMeta,
            diagnosticStructure: existingMeta.diagnosticStructure || 'Inconnu',
            diagnosticAmiante: existingMeta.diagnosticAmiante || 'Inconnu',
            diagnosticPlomb: existingMeta.diagnosticPlomb || 'Inconnu',
            diagnostiqueurContact: (existingMeta.diagnostiqueurContact || legacyOperateur || '').toString(),
            revision: Number.isFinite(Number(existingMeta.revision)) ? Number(existingMeta.revision) : 0,
        };
    }

    getReferenceGisement(meta = this.data.meta) {
        const source = this.getDefaultMeta(meta || {});
        const operation = (source.operation || 'operation')
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .toUpperCase() || 'OPERATION';
        const date = (source.date || '').toString().replace(/-/g, '') || 'SANSDATE';
        return `${operation}_${date}`;
    }

    parseStoredEvaluation(raw) {
        if (typeof raw !== 'string' || !raw.trim()) return null;
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.warn('Impossible de parser les donnees stockees.', e);
            return null;
        }
    }

    normalizeGuestEvaluationData(data) {
        if (!data || typeof data !== 'object') return null;
        if (!Array.isArray(data.lots)) {
            if (data.lots && typeof data.lots === 'object') {
                data.lots = Object.values(data.lots).filter((lot) => lot && typeof lot === 'object');
            } else {
                data.lots = [];
            }
        }

        data.meta = this.getDefaultMeta(data.meta || {});
        data.ui = this.getDefaultUi(data.ui || {});
        data.lots = data.lots.filter((lot) => lot && typeof lot === 'object');
        if (!data.lots.length) {
            data.lots = [this.createEmptyLot(0)];
        }

        data.lots.forEach((lot) => {
            this.normalizeLotEssenceFields(lot);
            this.normalizeLotAllotissementFields(lot);
        });

        return data;
    }

    /** Données invité / export HTML autonome — jamais utilisé pour le corps de l’évaluation en mode cloud. */
    loadGuestDataFromLocalStorage() {
        try {
            // Vérifier d'abord si les données sont injectées dans la page (depuis un fichier HTML téléchargé)
            if (window.__VALOBOIS_DATA__) {
                const injectedData = this.normalizeGuestEvaluationData(window.__VALOBOIS_DATA__);
                if (injectedData) {
                    const serialized = JSON.stringify(injectedData);
                    // Sauvegarder aussi dans localStorage pour la persistance locale
                    localStorage.setItem(this.storageKey, serialized);
                    localStorage.setItem(this.storageBackupKey, serialized);
                    return injectedData;
                }
            }

            const rawPrimary = localStorage.getItem(this.storageKey);
            const primaryParsed = this.parseStoredEvaluation(rawPrimary);
            const primaryData = this.normalizeGuestEvaluationData(primaryParsed);
            if (primaryData) {
                return primaryData;
            }

            const rawBackup = localStorage.getItem(this.storageBackupKey);
            const backupParsed = this.parseStoredEvaluation(rawBackup);
            const backupData = this.normalizeGuestEvaluationData(backupParsed);
            if (backupData) {
                localStorage.setItem(this.storageKey, JSON.stringify(backupData));
                return backupData;
            }

            return this.createInitialData();
        } catch (e) {
            console.error(e);
            return this.createInitialData();
        }
    }

    loadData() {
        return this.loadGuestDataFromLocalStorage();
    }

    reloadGuestStateFromLocalStorage() {
        this.persistenceMode = 'guest';
        this.data = this.loadGuestDataFromLocalStorage();
        this.currentLotIndex = 0;
        this.render();
    }

    saveData() {
        try {
            this.data.meta = this.getDefaultMeta(this.data.meta || {});
            this.data.meta.revision = (Number(this.data.meta.revision) || 0) + 1;
            if (this.persistenceMode === 'cloud') {
                if (typeof window.__valoboisScheduleCloudSave === 'function') {
                    window.__valoboisScheduleCloudSave(this);
                }
            } else {
                const serialized = JSON.stringify(this.data);
                localStorage.setItem(this.storageKey, serialized);
                localStorage.setItem(this.storageBackupKey, serialized);
            }
        } catch (e) {
            console.error(e);
        }
    }

    getCurrentLot() {
        const lots = this.data.lots || [];
        if (!lots.length) return null;
        if (this.currentLotIndex < 0 || this.currentLotIndex >= lots.length) {
            this.currentLotIndex = 0;
        }
        return lots[this.currentLotIndex];
    }

    getDetailLotActiveCardStore() {
        if (!this.data.ui) this.data.ui = this.getDefaultUi();
        if (!this.data.ui.detailLotActiveCardByLot || typeof this.data.ui.detailLotActiveCardByLot !== 'object') {
            this.data.ui.detailLotActiveCardByLot = {};
        }
        return this.data.ui.detailLotActiveCardByLot;
    }

    getDetailLotStorageKey(lot) {
        if (!lot) return 'lot:none';
        if (lot.id != null && lot.id !== '') return `lot:${lot.id}`;
        const idx = (this.data.lots || []).indexOf(lot);
        return `lot-index:${idx >= 0 ? idx : 0}`;
    }

    normalizeDetailLotActiveCardKey(lot, rawKey) {
        const defaultPieces = this.ensureDefaultPiecesData(lot, { createIfEmpty: false });
        const hasPieces = Array.isArray(lot && lot.pieces) && lot.pieces.length > 0;
        const fallbackKey = defaultPieces[0] && defaultPieces[0].id
            ? `default:${defaultPieces[0].id}`
            : (hasPieces ? 'piece:0' : null);

        if (rawKey === 'default') return fallbackKey;
        if (typeof rawKey === 'string' && rawKey.startsWith('default:')) {
            const defaultPieceId = rawKey.slice(8);
            if (defaultPieces.some((piece) => piece.id === defaultPieceId)) {
                return `default:${defaultPieceId}`;
            }
        }
        if (typeof rawKey === 'string' && rawKey.startsWith('piece:')) {
            const idx = parseInt(rawKey.slice(6), 10);
            if (Number.isFinite(idx) && idx >= 0 && Array.isArray(lot.pieces) && idx < lot.pieces.length) {
                return `piece:${idx}`;
            }
        }
        return fallbackKey;
    }

    getDetailLotActiveCardKey(lot) {
        if (!lot) return null;
        const store = this.getDetailLotActiveCardStore();
        const storageKey = this.getDetailLotStorageKey(lot);
        const normalized = this.normalizeDetailLotActiveCardKey(lot, store[storageKey]);
        store[storageKey] = normalized;
        return normalized;
    }

    setDetailLotActiveCardKey(lot, nextKey, { persist = true } = {}) {
        if (!lot) return null;
        const store = this.getDetailLotActiveCardStore();
        const storageKey = this.getDetailLotStorageKey(lot);
        const normalized = this.normalizeDetailLotActiveCardKey(lot, nextKey);
        store[storageKey] = normalized;
        if (persist) this.saveData();
        return normalized;
    }

    isDetailLotCardActive(lot, cardKey) {
        return this.getDetailLotActiveCardKey(lot) === cardKey;
    }

    applyDetailLotCardActivation(pieceRail, lot) {
        if (!pieceRail || !lot) return;
        const activeKey = this.getDetailLotActiveCardKey(lot);
        pieceRail.querySelectorAll('.piece-card[data-detail-card-key]').forEach((card) => {
            const cardKey = card.dataset.detailCardKey;
            const isActive = cardKey === activeKey;
            card.classList.toggle('piece-card--active', isActive);
            card.classList.toggle('piece-card--passive', !isActive);

            card.querySelectorAll('input, button, select, textarea').forEach((ctrl) => {
                if (!Object.prototype.hasOwnProperty.call(ctrl.dataset, 'baseDisabled')) {
                    ctrl.dataset.baseDisabled = ctrl.disabled ? 'true' : 'false';
                }
                if (!isActive) {
                    ctrl.disabled = true;
                } else {
                    ctrl.disabled = ctrl.dataset.baseDisabled === 'true';
                }
            });
        });
    }

    getLotIntegrityPriceFactor(lot) {
        const integrite = lot && lot.inspection && lot.inspection.integrite;
        if (!integrite || integrite.ignore || integrite.coeff == null) return 1;
        const coeff = parseFloat(integrite.coeff);
        return Number.isFinite(coeff) ? coeff : 1;
    }

    hasIncompleteDetailLotPieces(lot) {
        if (!lot || !Array.isArray(lot.pieces) || lot.pieces.length === 0) return false;

        const hasValue = (value) => value != null && String(value).trim() !== '';

        return lot.pieces.some((piece) => {
            const typePiece = piece.typePiece !== '' ? piece.typePiece : lot.allotissement.typePiece;
            const essenceNomCommun = piece.essenceNomCommun !== '' ? piece.essenceNomCommun : lot.allotissement.essenceNomCommun;
            const essenceNomScientifique = piece.essenceNomScientifique !== '' ? piece.essenceNomScientifique : lot.allotissement.essenceNomScientifique;
            const prixMarche = piece.prixMarche !== '' ? piece.prixMarche : lot.allotissement.prixMarche;
            const masseVolumique = piece.masseVolumique !== '' ? piece.masseVolumique : lot.allotissement.masseVolumique;
            const humidite = piece.humidite !== '' ? piece.humidite : lot.allotissement.humidite;
            const fractionCarbonee = piece.fractionCarbonee !== '' ? piece.fractionCarbonee : lot.allotissement.fractionCarbonee;
            const bois = piece.bois !== '' ? piece.bois : lot.allotissement.bois;

            const hasLongueur = hasValue(piece.longueur);
            const hasDiametre = hasValue(piece.diametre);
            const hasLargeur = hasValue(piece.largeur);
            const hasEpaisseur = hasValue(piece.epaisseur);
            const dimensionsComplete = hasLongueur && (hasDiametre || (hasLargeur && hasEpaisseur));

            return !(
                hasValue(typePiece) &&
                hasValue(essenceNomCommun) &&
                hasValue(essenceNomScientifique) &&
                dimensionsComplete &&
                hasValue(prixMarche) &&
                hasValue(masseVolumique) &&
                hasValue(humidite) &&
                hasValue(fractionCarbonee) &&
                hasValue(bois)
            );
        });
    }

    lotHasMissingPrixMarche(lot) {
        const isMissing = (v) => !v || String(v).trim() === '';
        const hasMissingDefaultPrix = this.ensureDefaultPiecesData(lot).some((defaultPiece) => {
            const defaultQty = parseFloat(defaultPiece.quantite) || 0;
            return defaultQty > 0 && isMissing(defaultPiece.prixMarche);
        });
        if (hasMissingDefaultPrix) return true;
        return (lot.pieces || []).some((piece) => isMissing(piece.prixMarche));
    }

    hasIncompleteNotationCriteria(lot) {
        if (!lot) return false;
        const hasValue = (value) => value != null && String(value).trim() !== '';

        const checkBlock = (block, fields) => {
            if (!block || typeof block !== 'object') return true;
            return fields.some((field) => !hasValue(block[field]));
        };

        const inspection = lot.inspection || {};
        const integrite = inspection.integrite || {};
        const hasInspectionGap =
            !hasValue(inspection.visibilite)
            || !hasValue(inspection.instrumentation)
            || (!(integrite && integrite.ignore === true) && !hasValue(integrite.niveau));
        if (hasInspectionGap) return true;

        const blocks = [
            [lot.bio, ['purge', 'expansion', 'integriteBio', 'exposition', 'confianceBio']],
            [lot.mech, ['purgeMech', 'feuMech', 'integriteMech', 'expositionMech', 'confianceMech']],
            [lot.usage, ['confianceUsage', 'durabiliteUsage', 'classementUsage', 'humiditeUsage', 'aspectUsage']],
            [lot.denat, ['depollutionDenat', 'contaminationDenat', 'durabiliteConfDenat', 'confianceDenat', 'naturaliteDenat']],
            [lot.debit, ['regulariteDebit', 'volumetrieDebit', 'stabiliteDebit', 'artisanaliteDebit', 'rusticiteDebit']],
            [lot.geo, ['adaptabiliteGeo', 'massiviteGeo', 'deformationGeo', 'industrialiteGeo', 'inclusiviteGeo']],
            [lot.essence, ['confianceEssence', 'rareteEcoEssence', 'masseVolEssence', 'rareteHistEssence', 'singulariteEssence']],
            [lot.ancien, ['confianceAncien', 'amortissementAncien', 'vieillissementAncien', 'microhistoireAncien', 'demontabiliteAncien']],
            [lot.traces, ['confianceTraces', 'etiquetageTraces', 'alterationTraces', 'documentationTraces', 'singularitesTraces']],
            [lot.provenance, ['confianceProv', 'transportProv', 'reputationProv', 'macroProv', 'territorialiteProv']]
        ];

        return blocks.some(([block, fields]) => checkBlock(block, fields));
    }

    hasIncompleteDestinationFields(lot) {
        if (!lot || !lot.allotissement) return true;
        const hasValue = (value) => value != null && String(value).trim() !== '';
        const destinationFields = [
            'destination',
            'destinationAdresse',
            'destinationContact',
            'destinationMail',
            'destinationTelephone'
        ];
        return destinationFields.some((field) => !hasValue(lot.allotissement[field]));
    }

    hasIncompleteOperationReferenceFields(meta = this.data && this.data.meta) {
        const sourceMeta = this.getDefaultMeta(meta || {});
        const hasValue = (value) => value != null && String(value).trim() !== '';
        const operationReferenceFields = ['operation', 'date', 'versionEtude', 'statutEtude'];
        return operationReferenceFields.some((field) => !hasValue(sourceMeta[field]));
    }

    hasIncompleteDiagnostiqueurFields(meta = this.data && this.data.meta) {
        const sourceMeta = this.getDefaultMeta(meta || {});
        const hasValue = (value) => value != null && String(value).trim() !== '';
        const diagnostiqueurFields = [
            'diagnostiqueurNom',
            'diagnostiqueurContact',
            'diagnostiqueurMail',
            'diagnostiqueurTelephone',
            'diagnostiqueurAdresse'
        ];
        return diagnostiqueurFields.some((field) => !hasValue(sourceMeta[field]));
    }

    hasIncompleteContactsFields(meta = this.data && this.data.meta) {
        const sourceMeta = this.getDefaultMeta(meta || {});
        const hasValue = (value) => value != null && String(value).trim() !== '';
        const contactsFields = [
            'maitriseOuvrageNom', 'maitriseOuvrageContact', 'maitriseOuvrageMail',
            'maitriseOuvrageTelephone', 'maitriseOuvrageAdresse',
            'maitriseOeuvreNom', 'maitriseOeuvreContact', 'maitriseOeuvreMail',
            'maitriseOeuvreTelephone', 'maitriseOeuvreAdresse',
            'entrepriseDeconstructionNom', 'entrepriseDeconstructionContact', 'entrepriseDeconstructionMail',
            'entrepriseDeconstructionTelephone', 'entrepriseDeconstructionAdresse'
        ];
        return contactsFields.some((field) => !hasValue(sourceMeta[field]));
    }

    hasIncompleteContexteTechniqueFields(meta = this.data && this.data.meta) {
        const sourceMeta = this.getDefaultMeta(meta || {});
        const hasValue = (value) => value != null && String(value).trim() !== '';
        const contexteTechniqueFields = [
            'typeBatiment', 'periodeConstruction', 'phaseIntervention',
            'localisation', 'conditionnementType', 'protectionType'
        ];
        return contexteTechniqueFields.some((field) => !hasValue(sourceMeta[field]));
    }

    formatPco2Display(valueKgRaw) {
        const valueKg = Math.max(0, parseFloat(valueKgRaw) || 0);
        if (valueKg >= 1000) {
            return {
                value: (valueKg / 1000).toLocaleString(getValoboisIntlLocale(), {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }),
                unit: 't CO₂ (NF EN 16449)'
            };
        }
        return {
            value: Math.round(valueKg).toLocaleString(getValoboisIntlLocale(), { maximumFractionDigits: 0 }),
            unit: 'kg CO₂ (NF EN 16449)'
        };
    }

    _formatCV(val) {
        if (val == null) return '—';
        return (val * 100).toLocaleString(getValoboisIntlLocale(), {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }) + '\u00a0%';
    }

    _formatEIq(val) {
        if (val == null) return '—';
        return (val * 100).toLocaleString(getValoboisIntlLocale(), {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }) + '\u00a0%';
    }

    _formatEcartType(val) {
        if (val == null) return '—';
        return Math.round(val).toLocaleString(getValoboisIntlLocale(), {
            maximumFractionDigits: 0,
        }) + '\u00a0mm';
    }

    _formatEIqAbs(val) {
        if (val == null) return '—';
        return Math.round(val).toLocaleString(getValoboisIntlLocale(), {
            maximumFractionDigits: 0,
        }) + '\u00a0mm';
    }

    formatTauxSimilarite(val) {
        if (val === null || val === undefined) return '';
        return Math.round(val).toLocaleString(getValoboisIntlLocale(), {
            maximumFractionDigits: 0,
        }) + '\u00a0%';
    }

    computeAmortissementBiologique(ageArbre, dateMiseEnService) {
        const age = parseFloat(ageArbre);
        if (!isFinite(age) || age <= 0) return '—';
        const extractYear = (str) => {
            if (!str) return null;
            const m = String(str).match(/\b(\d{4})\b/);
            return m ? parseInt(m[1], 10) : null;
        };
        const evalYear = extractYear(this.data.meta && this.data.meta.date);
        const serviceYear = extractYear(dateMiseEnService);
        if (evalYear == null || serviceYear == null) return '—';
        const diff = evalYear - serviceYear;
        if (diff <= 0) return '—';
        const result = diff / age;
        return result.toLocaleString(getValoboisIntlLocale(), { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    /**
     * Mappe la valeur d'Amortissement biologique aux états d'alerte.
     * @param {string|number} amortissementValue - Valeur retournée par computeAmortissementBiologique()
     * @returns {string} État: 'strong' (>= 1), 'medium' (> 0.5 && < 1), 'low' (<= 0.5), ou 'none' (indisponible)
     */
    getAmortissementAlertState(amortissementValue) {
        const num = parseFloat(String(amortissementValue || '').replace(/,/, '.'));
        
        if (!isFinite(num) || amortissementValue === '—' || amortissementValue === null || amortissementValue === '') {
            return 'none';
        }
        
        if (num >= 1) {
            return 'strong';
        } else if (num > 0.5) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    openAncienAmortissementAlertModal(alertState) {
        const backdrop = document.getElementById('ancienDetailModalBackdrop');
        const titleEl = document.getElementById('ancienDetailModalTitle');
        const contentEl = document.getElementById('ancienDetailModalContent');

        const messagesByState = {
            strong: 'D\'après les données renseignées dans le Détail du lot, il est recommandé de noter un Amortissement Fort.',
            medium: 'D\'après les données renseignées dans le Détail du lot, il est recommandé de noter un Amortissement Moyen.',
            low: 'D\'après les données renseignées dans le Détail du lot, il est recommandé de noter un Amortissement Faible.',
            none: 'Renseigner ou compléter les données relatives à l\'âge de l\'arbre et à la date de mise en service de la ou des pièces de bois du lot. Vérifier qu\'une date soit correctement renseignée pour cette opération.'
        };

        if (titleEl) titleEl.textContent = 'Alerte Amortissement';
        this.renderDetailModalContent(contentEl, messagesByState[alertState] || messagesByState.none);

        if (backdrop) {
            backdrop.classList.remove('hidden');
            backdrop.setAttribute('aria-hidden', 'false');
        }
    }

    /**
     * Mappe la valeur d'Epaisseur aux etats d'alerte de Massivite.
     * @param {string|number} epaisseurValue - Valeur en mm
     * @returns {string} Etat: 'strong' (> 75), 'medium' (> 28 et <= 75), 'low' (<= 28), ou 'none' (indisponible)
     */
    getMassiviteAlertState(epaisseurValue) {
        const num = parseFloat(String(epaisseurValue || '').replace(/,/, '.'));

        if (!isFinite(num) || epaisseurValue === null || epaisseurValue === '') {
            return 'none';
        }

        if (num > 75) {
            return 'strong';
        } else if (num > 28) {
            return 'medium';
        }
        return 'low';
    }

    openGeoMassiviteAlertModal(alertState) {
        const backdrop = document.getElementById('geoDetailModalBackdrop');
        const titleEl = document.getElementById('geoDetailModalTitle');
        const contentEl = document.getElementById('geoDetailModalContent');

        const messagesByState = {
            strong: 'D\'après les données renseignées la massivité devrait être Forte. Vérifier les règles suivantes : Une massivité « forte » vaut pour les pièces de bois massif et de Bois Massif Abouté (BMA) d\'une épaisseur (e ou b) strictement supérieure à 75 mm, pour les pièces en bois lamellé-collé (BLC) d\'une épaisseur de lamelles strictement supérieure à 35 mm et d\'une épaisseur de chant strictement supérieure à 150 mm, ou pour les pièces en BLC avec une épaisseur de lamelles inférieure ou égale à 35 mm d\'une épaisseur de chant strictement supérieure à 210 mm.',
            medium: 'D\'après les données renseignées la massivité devrait être Moyenne. Vérifier les règles suivantes : Une massivité « moyenne » vaut pour les pièces : de bois massif et de BMA d\'une épaisseur strictement supérieure à 28 mm et inférieure ou égale à 75 mm, pour les pièces de BLC avec épaisseur de lamelles strictement supérieure à 35 mm d\'une épaisseur de chant inférieure ou égale à 150 mm, ou pour les pièces de BLC avec une épaisseur de lamelles inférieure ou égale à 35 mm et d\'une épaisseur de chant strictement supérieure à 28 mm et inférieure ou égale à 210 mm.',
            low: 'D\'après les données renseignées la massivité devrait être Faible. Vérifier les règles suivantes : Une massivité « faible » vaut pour les pièces de bois massif et BMA d\'une épaisseur inférieure ou égale à 28 mm ou pour les pièces en BLC avec une épaisseur de lamelles inférieure ou égale à 35 mm et d\'une épaisseur de chant inférieure ou égale à 28 mm.',
            none: 'Vérifier l\'Épaisseur renseignée dans le Détail du lot.'
        };

        if (titleEl) titleEl.textContent = 'Alerte Massivité';
        this.renderDetailModalContent(contentEl, messagesByState[alertState] || messagesByState.none);

        if (backdrop) {
            backdrop.classList.remove('hidden');
            backdrop.setAttribute('aria-hidden', 'false');
        }
    }

    /**
     * Retourne la valeur par défaut du champ Bois (%) selon le type de produit.
     * BLC, CLT, CC, BMA, BMR, PB → 95 ; autres types connus → 100 ; vide → null.
     * @param {string} typeProduitValue
     * @returns {string|null}
     */
    getDefaultBoisFromTypeProduit(typeProduitValue) {
        const normalize = (value) => String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const typeProduit = normalize(typeProduitValue);
        if (!typeProduit) return null;

        const types95 = [
            'Bois Lamellé-Collé (BLC)',
            'Bois Lamellé-Croisé (CLT)',
            'Bois Contre-Collé (CC)',
            'Bois Massif Abouté (BMA)',
            'Bois Massif Reconstitué (BMR)',
            'Panneau Bois (PB)',
        ];
        if (types95.some(t => normalize(t) === typeProduit)) return '95';
        return '100';
    }

    /**
     * Détermine l'état d'alerte d'Industrialité selon le Type de produit.
     * @param {string} typeProduitValue - Type de produit du lot
     * @returns {string} 'strong', 'medium', 'low' ou 'none'
     */
    getIndustrialiteAlertState(typeProduitValue) {
        const normalize = (value) => String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const typeProduit = normalize(typeProduitValue);
        if (!typeProduit) return 'none';

        if (
            typeProduit === normalize('Bois Lamellé-Collé (BLC)') ||
            typeProduit === normalize('Bois Massif Abouté (BMA)') ||
            typeProduit === normalize('Bois Contre-Collé (CC)') ||
            typeProduit === normalize('Bois Lamellé-Croisé (CLT)') ||
            typeProduit === normalize('Bois Ossature (BO)') ||
            typeProduit === normalize('Bois Fermette (BF)') ||
            typeProduit === normalize('Bois Massif Reconstitué (BMR)')
        ) {
            return 'strong';
        }

        if (
            typeProduit === normalize('Bois Raboté Séché (BRS)') ||
            typeProduit === normalize('Bois Brut Sec (BBS)') ||
            typeProduit === normalize('Bois Avivé (BA)')
        ) {
            return 'medium';
        }

        if (
            typeProduit === normalize('Bois Non Taillé (BNT)') ||
            typeProduit === normalize('Bois Équarri Non Scié (BENS)')
        ) {
            return 'low';
        }

        return 'none';
    }

    openGeoIndustrialiteAlertModal(alertState) {
        const backdrop = document.getElementById('geoDetailModalBackdrop');
        const titleEl = document.getElementById('geoDetailModalTitle');
        const contentEl = document.getElementById('geoDetailModalContent');

        const messagesByState = {
            strong: 'D\'après le type de produit renseigné l\'industrialité devrait être Forte.',
            medium: 'D\'après le type de produit renseigné l\'industrialité devrait être Moyenne.',
            low: 'D\'après le type de produit renseigné l\'industrialité devrait être Faible.',
            none: 'Vérifier le Type de produit renseigné dans le Détail du lot.'
        };

        if (titleEl) titleEl.textContent = 'Alerte Industrialité';
        this.renderDetailModalContent(contentEl, messagesByState[alertState] || messagesByState.none);

        if (backdrop) {
            backdrop.classList.remove('hidden');
            backdrop.setAttribute('aria-hidden', 'false');
        }
    }

    /**
     * Mappe la volumetrie unitaire aux etats d'alerte de Volumetrie.
     * @param {string|number} volumetrieValue - Valeur en m3
     * @returns {string} Etat: 'strong' (> 0.1), 'medium' (>= 0.05 et <= 0.1), 'low' (< 0.05), ou 'none' (indisponible)
     */
    getVolumetrieAlertState(volumetrieValue) {
        const num = parseFloat(String(volumetrieValue || '').replace(/,/, '.'));

        if (!isFinite(num) || volumetrieValue === null || volumetrieValue === '' || num <= 0) {
            return 'none';
        }

        if (num > 0.1) {
            return 'strong';
        } else if (num >= 0.05) {
            return 'medium';
        }
        return 'low';
    }

    openDebitVolumetrieAlertModal(alertState) {
        const backdrop = document.getElementById('debitDetailModalBackdrop');
        const titleEl = document.getElementById('debitDetailModalTitle');
        const contentEl = document.getElementById('debitDetailModalContent');

        const messagesByState = {
            strong: 'D\'après les dimensions renseignées la volumétrie devrait être Forte.',
            medium: 'D\'après les dimensions renseignées la volumétrie devrait être Moyenne.',
            low: 'D\'après les dimensions renseignées la volumétrie devrait être Faible.',
            none: 'Vérifier les dimensions renseignées dans le Détail du lot.'
        };

        if (titleEl) titleEl.textContent = 'Alerte Volumétrie';
        this.renderDetailModalContent(contentEl, messagesByState[alertState] || messagesByState.none);

        if (backdrop) {
            backdrop.classList.remove('hidden');
            backdrop.setAttribute('aria-hidden', 'false');
        }
    }

    /**
     * Détermine l'état d'alerte de Régularité selon l'usage du champ Diamètre.
     * @param {string|number} diametreValue - Valeur du champ diamètre du lot
     * @returns {string} 'used' si renseigné, sinon 'none'
     */
    getRegulariteAlertState(diametreValue) {
        const hasValue = diametreValue != null && String(diametreValue).trim() !== '';
        return hasValue ? 'used' : 'none';
    }

    parsePositiveAlertDimensionValue(value) {
        const normalized = String(value == null ? '' : value)
            .replace(/,/g, '.')
            .trim();
        const num = parseFloat(normalized);
        return Number.isFinite(num) && num > 0 ? num : null;
    }

    getEffectiveStabiliteAlertDimensions(lot) {
        const targetLot = lot || this.getCurrentLot();
        if (!targetLot || !targetLot.allotissement) {
            return { longueur: null, largeur: null, epaisseur: null, diametre: null };
        }

        const allotissement = targetLot.allotissement;
        const longueur = this.parsePositiveAlertDimensionValue(
            allotissement._avgLongueur != null && allotissement._avgLongueur !== ''
                ? allotissement._avgLongueur
                : allotissement.longueur
        );
        const largeur = this.parsePositiveAlertDimensionValue(
            allotissement._avgLargeur != null && allotissement._avgLargeur !== ''
                ? allotissement._avgLargeur
                : allotissement.largeur
        );
        const epaisseur = this.parsePositiveAlertDimensionValue(
            allotissement._avgEpaisseur != null && allotissement._avgEpaisseur !== ''
                ? allotissement._avgEpaisseur
                : allotissement.epaisseur
        );
        const diametre = this.parsePositiveAlertDimensionValue(allotissement.diametre);

        return { longueur, largeur, epaisseur, diametre };
    }

    getStabiliteAlertState(longueurValue, largeurValue, epaisseurValue, diametreValue) {
        let longueur = this.parsePositiveAlertDimensionValue(longueurValue);
        let largeur = this.parsePositiveAlertDimensionValue(largeurValue);
        let epaisseur = this.parsePositiveAlertDimensionValue(epaisseurValue);
        const diametre = this.parsePositiveAlertDimensionValue(diametreValue);

        if (diametre) {
            epaisseur = diametre;
            largeur = diametre;
        }

        if (!longueur || !epaisseur || !largeur) {
            return 'none';
        }

        if (epaisseur < largeur) {
            const temp = epaisseur;
            epaisseur = largeur;
            largeur = temp;
        }

        const ratioLe = longueur / epaisseur;
        const ratioBe = largeur / epaisseur;

        if (!Number.isFinite(ratioLe) || !Number.isFinite(ratioBe) || ratioLe <= 0 || ratioBe <= 0) {
            return 'none';
        }

        if (ratioLe <= 18 && ratioBe >= 0.4) {
            return 'strong';
        }

        if (
            (ratioLe <= 18 && ratioBe >= 0.25 && ratioBe < 0.4) ||
            (ratioLe > 18 && ratioLe <= 28 && ratioBe >= 0.25)
        ) {
            return 'medium';
        }

        if (ratioLe > 28 || ratioBe < 0.25) {
            return 'low';
        }

        return 'none';
    }

    openDebitStabiliteAlertModal(alertState) {
        const backdrop = document.getElementById('debitDetailModalBackdrop');
        const titleEl = document.getElementById('debitDetailModalTitle');
        const contentEl = document.getElementById('debitDetailModalContent');

        const messagesByState = {
            strong: 'D\'après les dimensions renseignées, la stabilité devrait être Forte.',
            medium: 'D\'après les dimensions renseignées, la stabilité devrait être Moyenne.',
            low: 'D\'après les dimensions renseignées, la stabilité devrait être Faible.',
            none: 'Vérifier les dimensions renseignées dans le Détail du lot.'
        };

        if (titleEl) titleEl.textContent = 'Alerte Stabilité';
        this.renderDetailModalContent(contentEl, messagesByState[alertState] || messagesByState.none);

        if (backdrop) {
            backdrop.classList.remove('hidden');
            backdrop.setAttribute('aria-hidden', 'false');
        }
    }

    openDebitRegulariteAlertModal(alertState) {
        const backdrop = document.getElementById('debitDetailModalBackdrop');
        const titleEl = document.getElementById('debitDetailModalTitle');
        const contentEl = document.getElementById('debitDetailModalContent');

        const messagesByState = {
            used: 'D\'après les dimensions renseignées la régularité est faible compte tenu de la présence de bois ronds.',
            none: 'Rien à signaler'
        };

        if (titleEl) titleEl.textContent = 'Alerte Régularité';
        this.renderDetailModalContent(contentEl, messagesByState[alertState] || messagesByState.none);

        if (backdrop) {
            backdrop.classList.remove('hidden');
            backdrop.setAttribute('aria-hidden', 'false');
        }
    }

    /**
     * Détermine l'état d'alerte de Naturalité selon Type de produit et Diamètre.
     * @param {string} typeProduitValue - Type de produit du lot
     * @param {string|number} diametreValue - Diamètre du lot
     * @returns {string} 'strong', 'medium' ou 'none'
     */
    getNaturaliteAlertState(typeProduitValue, diametreValue) {
        const normalize = (value) => String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const typeProduit = normalize(typeProduitValue);
        const hasDiametre = diametreValue != null && String(diametreValue).trim() !== '';

        if (!typeProduit) return 'none';

        if (
          hasDiametre &&
          (
            typeProduit === normalize('Bois Brut Sec (BBS)') ||
            typeProduit === normalize('Bois Non Taillé (BNT)') ||
            typeProduit === normalize('Bois Équarri Non Scié (BENS)')
          )
        ) {
          return 'strong';
        }

        if (
            typeProduit === normalize('Bois Raboté Séché (BRS)') ||
            typeProduit === normalize('Bois Contre-Collé (CC)') ||
            typeProduit === normalize('Bois Lamellé-Collé (BLC)') ||
            typeProduit === normalize('Bois Lamellé-Croisé (CLT)') ||
            typeProduit === normalize('Bois Ossature (BO)') ||
            typeProduit === normalize('Bois Fermette (BF)') ||
            typeProduit === normalize('Bois Massif Abouté (BMA)') ||
            typeProduit === normalize('Bois Massif Reconstitué (BMR)')
        ) {
            return 'medium';
        }

        return 'none';
    }

    openDenatNaturaliteAlertModal(alertState) {
        const backdrop = document.getElementById('denatDetailModalBackdrop');
        const titleEl = document.getElementById('denatDetailModalTitle');
        const contentEl = document.getElementById('denatDetailModalContent');

        const messagesByState = {
            strong: 'D\'après les champs renseignés la naturalité pourrait être Forte, sauf si le bois évalué n\'est pas libre de finition.',
            medium: 'D\'après les champs renseignés la naturalité devrait être Moyenne à Faible',
            none: 'Vérifier le type de produit renseigné.'
        };

        if (titleEl) titleEl.textContent = 'Alerte Naturalité';
        this.renderDetailModalContent(contentEl, messagesByState[alertState] || messagesByState.none);

        if (backdrop) {
            backdrop.classList.remove('hidden');
            backdrop.setAttribute('aria-hidden', 'false');
        }
    }

    getEffectiveTypeProduitAlertValue(lot) {
        const targetLot = lot || this.getCurrentLot();
        if (!targetLot) return '';

        const lotTypeProduit = targetLot && targetLot.allotissement
            ? String(targetLot.allotissement.typeProduit || '').trim()
            : '';
        const aggregatedTypeProduit = this.getLotAggregatedTextValue(targetLot, 'typeProduit');

        if (lotTypeProduit && lotTypeProduit !== 'Multiples') {
            return lotTypeProduit;
        }

        if (aggregatedTypeProduit && aggregatedTypeProduit !== 'Multiples') {
            return aggregatedTypeProduit;
        }

        return '';
    }

    refreshNaturaliteAlertButton(lot) {
        const targetLot = lot || this.getCurrentLot();
        const currentLot = this.getCurrentLot();
        if (!targetLot || targetLot !== currentLot) return;

        const row = document.querySelector('.denat-row[data-denat-field="naturaliteDenat"]');
        if (!row) return;
        const alertBtn = row.querySelector('[data-denat-naturalite-alert-btn]');
        if (!alertBtn) return;

        const typeProduitValue = this.getEffectiveTypeProduitAlertValue(targetLot);

        const lotDiametre = targetLot && targetLot.allotissement
            ? String(targetLot.allotissement.diametre || '').trim()
            : '';
        let hasDetailDiametre = false;
        hasDetailDiametre = this.ensureDefaultPiecesData(targetLot).some((defaultPiece) => {
            const defaultQty = Math.max(0, parseFloat((defaultPiece && defaultPiece.quantite) || 0) || 0);
            return defaultQty > 0 && String((defaultPiece && defaultPiece.diametre) || '').trim() !== '';
        });
        if (!hasDetailDiametre && Array.isArray(targetLot.pieces)) {
            hasDetailDiametre = targetLot.pieces.some((piece) => piece && String(piece.diametre || '').trim() !== '');
        }
        const diametreValue = lotDiametre || (hasDetailDiametre ? '1' : '');

        const state = this.getNaturaliteAlertState(typeProduitValue, diametreValue);
        alertBtn.dataset.alertNaturaliteState = state;
    }

    refreshStabiliteAlertButton(lot) {
        const targetLot = lot || this.getCurrentLot();
        const currentLot = this.getCurrentLot();
        if (!targetLot || targetLot !== currentLot) return;

        const row = document.querySelector('.debit-row[data-debit-field="stabiliteDebit"]');
        if (!row) return;
        const alertBtn = row.querySelector('[data-debit-stabilite-alert-btn]');
        if (!alertBtn) return;

        const dimensions = this.getEffectiveStabiliteAlertDimensions(targetLot);
        const state = this.getStabiliteAlertState(
            dimensions.longueur,
            dimensions.largeur,
            dimensions.epaisseur,
            dimensions.diametre
        );
        alertBtn.dataset.alertStabiliteState = state;
    }

    getArtisanaliteAlertState(typeProduitValue) {
        const normalize = (value) => String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const typeProduit = normalize(typeProduitValue);
        if (!typeProduit) return 'none';

        if (
            typeProduit === normalize('Bois Lamellé-Collé (BLC)') ||
            typeProduit === normalize('Bois Lamellé-Croisé (CLT)') ||
            typeProduit === normalize('Bois Massif Abouté (BMA)') ||
            typeProduit === normalize('Bois Massif Reconstitué (BMR)') ||
            typeProduit === normalize('Bois Contre-Collé') ||
            typeProduit === normalize('Bois Contre-Collé (CC)') ||
            typeProduit === normalize('Bois Fermette (BF)')
        ) {
            return 'strong';
        }

        if (
            typeProduit === normalize('Bois Raboté Séché (BRS)') ||
            typeProduit === normalize('Bois Ossature (BO)')
        ) {
            return 'medium';
        }

        if (
            typeProduit === normalize('Bois Brut Sec (BBS)') ||
            typeProduit === normalize('Bois Non Taillé (BNT)') ||
            typeProduit === normalize('Bois Avivé (BA)') ||
            typeProduit === normalize('Bois Équarri Non Scié (BENS)')
        ) {
            return 'low';
        }

        return 'none';
    }

    openDebitArtisanaliteAlertModal(alertState) {
        const backdrop = document.getElementById('debitDetailModalBackdrop');
        const titleEl = document.getElementById('debitDetailModalTitle');
        const contentEl = document.getElementById('debitDetailModalContent');

        const messagesByState = {
            strong: 'D\'après le type de produit renseigné l\'artisanalité devrait être Forte.',
            medium: 'D\'après le type de produit renseigné l\'artisanalité devrait être Moyenne.',
            low: 'D\'après le type de produit renseigné l\'artisanalité devrait être Faible.',
            none: 'Vérifier le Type de produit renseigné dans le Détail du lot.'
        };

        if (titleEl) titleEl.textContent = 'Alerte Artisanalité';
        this.renderDetailModalContent(contentEl, messagesByState[alertState] || messagesByState.none);

        if (backdrop) {
            backdrop.classList.remove('hidden');
            backdrop.setAttribute('aria-hidden', 'false');
        }
    }

    refreshArtisanaliteAlertButton(lot) {
        const targetLot = lot || this.getCurrentLot();
        const currentLot = this.getCurrentLot();
        if (!targetLot || targetLot !== currentLot) return;

        const row = document.querySelector('.debit-row[data-debit-field="artisanaliteDebit"]');
        if (!row) return;
        const alertBtn = row.querySelector('[data-debit-artisanalite-alert-btn]');
        if (!alertBtn) return;

        const typeProduitValue = this.getEffectiveTypeProduitAlertValue(targetLot);
        const state = this.getArtisanaliteAlertState(typeProduitValue);
        alertBtn.dataset.alertArtisanaliteState = state;
    }

    refreshIndustrialiteAlertButton(lot) {
        const targetLot = lot || this.getCurrentLot();
        const currentLot = this.getCurrentLot();
        if (!targetLot || targetLot !== currentLot) return;

        const row = document.querySelector('.geo-row[data-geo-field="industrialiteGeo"]');
        if (!row) return;
        const alertBtn = row.querySelector('[data-geo-industrialite-alert-btn]');
        if (!alertBtn) return;

        const typeProduitValue = this.getEffectiveTypeProduitAlertValue(targetLot);
        const state = this.getIndustrialiteAlertState(typeProduitValue);
        alertBtn.dataset.alertIndustrialiteState = state;
    }

    formatMasseDisplay(valueKgRaw) {
        const valueKg = Math.max(0, parseFloat(valueKgRaw) || 0);
        if (valueKg >= 1000) {
            return {
                value: (valueKg / 1000).toLocaleString(getValoboisIntlLocale(), {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }),
                unit: 't'
            };
        }
        return {
            value: valueKg.toLocaleString(getValoboisIntlLocale(), { maximumFractionDigits: 1 }),
            unit: 'kg'
        };
    }

    getMeasuredDensityValue(measuredMassRaw, volumeRaw) {
        const normalizedMeasuredMass = this.normalizeAllotissementNumericInput(measuredMassRaw);
        const measuredMass = parseFloat(normalizedMeasuredMass);
        const volume = parseFloat(volumeRaw);

        if (!Number.isFinite(measuredMass) || measuredMass < 0 || !Number.isFinite(volume) || volume <= 0) {
            return null;
        }

        return measuredMass / volume;
    }

    formatDensityDisplay(valueRaw) {
        const value = parseFloat(valueRaw);
        if (!Number.isFinite(value) || value < 0) return '';
        return value.toLocaleString(getValoboisIntlLocale(), {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1
        });
    }

    formatMeasuredDensityDisplay(measuredMassRaw, volumeRaw) {
        return this.formatDensityDisplay(this.getMeasuredDensityValue(measuredMassRaw, volumeRaw));
    }

    getMeasuredLotDensityDisplay(lot) {
        if (!lot) return { value: '…', unit: '', status: 'none' };

        let hasAnyMeasuredValue = false;
        let hasMissingMeasuredValue = false;
        let weightedDensitySum = 0;
        let totalWeight = 0;

        this.ensureDefaultPiecesData(lot, { createIfEmpty: false }).forEach((defaultPiece) => {
            const qty = Math.max(0, parseFloat((defaultPiece && defaultPiece.quantite) || 0) || 0);
            if (qty <= 0) return;

            const preview = this.buildPieceFromDefault(lot, -1, defaultPiece && defaultPiece.id);
            this.recalculatePiece(preview, lot);

            const density = this.getMeasuredDensityValue(defaultPiece && defaultPiece.massePieceMesuree, preview.volumePiece);
            if (density == null) {
                hasMissingMeasuredValue = true;
                return;
            }

            hasAnyMeasuredValue = true;
            weightedDensitySum += density * qty;
            totalWeight += qty;
        });

        (lot.pieces || []).forEach((piece) => {
            const density = this.getMeasuredDensityValue(piece && piece.massePieceMesuree, piece && piece.volumePiece);
            if (density == null) {
                hasMissingMeasuredValue = true;
                return;
            }

            hasAnyMeasuredValue = true;
            weightedDensitySum += density;
            totalWeight += 1;
        });

        if (!hasAnyMeasuredValue || totalWeight <= 0) return { value: '…', unit: '', status: 'none' };
        if (hasMissingMeasuredValue) return { value: 'Partielle', unit: '', status: 'partial' };

        return {
            value: this.formatDensityDisplay(weightedDensitySum / totalWeight),
            unit: 'kg/m3',
            status: 'full'
        };
    }

    getMeasuredLotMassDisplay(lot) {
        if (!lot) return { value: '…', unit: '', status: 'none' };

        let hasAnyMeasuredValue = false;
        let hasMissingMeasuredValue = false;
        let measuredMassKg = 0;

        this.ensureDefaultPiecesData(lot, { createIfEmpty: false }).forEach((defaultPiece) => {
            const qty = Math.max(0, parseFloat((defaultPiece && defaultPiece.quantite) || 0) || 0);
            if (qty <= 0) return;

            const normalizedMeasured = this.normalizeAllotissementNumericInput(defaultPiece && defaultPiece.massePieceMesuree);
            if (normalizedMeasured === '') {
                hasMissingMeasuredValue = true;
                return;
            }

            const value = parseFloat(normalizedMeasured);
            if (!Number.isFinite(value)) {
                hasMissingMeasuredValue = true;
                return;
            }

            hasAnyMeasuredValue = true;
            measuredMassKg += value * qty;
        });

        (lot.pieces || []).forEach((piece) => {
            const normalizedMeasured = this.normalizeAllotissementNumericInput(piece && piece.massePieceMesuree);
            if (normalizedMeasured === '') {
                hasMissingMeasuredValue = true;
                return;
            }

            const value = parseFloat(normalizedMeasured);
            if (!Number.isFinite(value)) {
                hasMissingMeasuredValue = true;
                return;
            }

            hasAnyMeasuredValue = true;
            measuredMassKg += value;
        });

        if (!hasAnyMeasuredValue) return { value: '…', unit: '', status: 'none' };
        if (hasMissingMeasuredValue) return { value: 'Partielle', unit: '', status: 'partial' };

        const display = this.formatMasseDisplay(measuredMassKg);
        return { value: display.value, unit: display.unit, status: 'full' };
    }

    getStudyStatusValues() {
        return ['Pré-diagnostic', 'En cours', 'Finalisé', 'Révision', 'Cloturé'];
    }

    getStudyStatusHelpTextByIndex(index) {
        const texts = [
            'Ce statut est recommandé pour initier le diagnostic en renseignant tous les champs de description de l’opération. En pré-diagnostic il est conseillé d’initier une première démarche d’évaluation en créant des lots de pièces par défaut, afin de disposer d’un aperçu rapide de la qualité du gisement. Dans ce statut la notation des critères peut être partielle.',
            'Ce statut est recommandé pour étendre le Pré-diagnostic et détailler le contenu des lots pièce par pièce. Dans ce statut la notation des critères doit être complète.',
            'Ce statut est recommandé pour affiner les informations et le contenu des lots. Il est possible de modifier des éléments préalablement renseignés, supprimer des pièces ou des lots.',
            'Ce statut ne permet pas de supprimer des lots ou de pièces. Les éléments précédemment notés peuvent être désactivés et seront conservés. Des duplicatas de correction peuvent être généré. Les lots ou pièces qui pourraient être supprimés seront signalés comme des « pertes ». Suivant la même logique, les données ne peuvent pas être réinitialisées. Le signalement de ce statut est à privilégier dans une situation de récolement, après le déconstruction ou le transfert de propriété des bois.',
            'Cette évaluation est clôturée, seul sa lecture et les fonctionnalités d’exports restent encore opérationnelles.'
        ];

        const safeIndex = Number.isFinite(index) ? Math.min(Math.max(index, 0), texts.length - 1) : 0;
        return texts[safeIndex] || '';
    }

    getStudyStatusIndexFromValue(statusValue) {
        const index = this.getStudyStatusValues().indexOf(statusValue);
        return index >= 0 ? index : 0;
    }

    renderStudyStatusHelpByIndex(index) {
        const helpTextEl = document.getElementById('studyStatusHelpText');
        if (!helpTextEl) return;
        helpTextEl.textContent = this.getStudyStatusHelpTextByIndex(index);
    }

    getEssenceCommonLabel(rawValue) {
        const raw = (rawValue || '').toString().trim();
        if (!raw) return '';
        const parts = raw.split(' - ');
        return (parts[0] || '').toString().trim();
    }

    getLotOrientationCountedDisplay(lot, fieldName) {
        if (!lot || !lot.allotissement || !fieldName) return '';

        const counts = new Map();
        let nextOrder = 0;
        const formatLabel = (rawValue) => {
            if (fieldName === 'essenceNomCommun') {
                return this.getEssenceCommonLabel(rawValue);
            }
            return (rawValue || '').toString().trim();
        };

        const addCount = (rawLabel, qtyRaw) => {
            const label = formatLabel(rawLabel);
            const qty = Math.max(0, Math.round(parseFloat(qtyRaw) || 0));
            if (!label || qty <= 0) return;
            const key = label.toLowerCase();
            if (!counts.has(key)) {
                counts.set(key, { label, qty: 0, order: nextOrder++ });
            }
            counts.get(key).qty += qty;
        };

        const allot = lot.allotissement || {};
        const baseType = (allot.typePiece || allot.typePieces || '').toString().trim();
        const baseEssence = this.getEssenceCommonLabel(allot.essenceNomCommun || allot.essence || '');
        const baseValue = fieldName === 'essenceNomCommun' ? baseEssence : baseType;

        this.ensureDefaultPiecesData(lot).forEach((defaultPiece) => {
            const defaultQty = Math.max(0, parseFloat((defaultPiece && defaultPiece.quantite) || 0) || 0);
            if (defaultQty <= 0) return;
            const defaultRaw = (defaultPiece && defaultPiece[fieldName]) || '';
            addCount(defaultRaw || baseValue, defaultQty);
        });

        (lot.pieces || []).forEach((piece) => {
            if (!piece || typeof piece !== 'object') return;
            const pieceRaw = (piece[fieldName] || '').toString().trim();
            addCount(pieceRaw || baseValue, 1);
        });

        const sortedItems = Array.from(counts.values()).sort((a, b) => {
            if (b.qty !== a.qty) return b.qty - a.qty;
            return a.order - b.order;
        });

        if (!sortedItems.length) return '';
        return sortedItems
            .map((item) => `${item.label} (${item.qty.toLocaleString(getValoboisIntlLocale(), { maximumFractionDigits: 0 })})`)
            .join(', ');
    }

    getLotUnfavorableCriteria(lot) {
        if (!lot) return '';
        const getVal = (entry) => {
            if (!entry) return 0;
            if (typeof entry === 'number') return entry;
            if (typeof entry === 'object') return parseFloat(entry.valeur) || 0;
            return 0;
        };
        const checks = [
            { section: 'bio',    field: 'expansion',          label: 'Expansion' },
            { section: 'bio',    field: 'integriteBio',       label: 'Intégrité bio.' },
            { section: 'mech',   field: 'integriteMech',      label: 'Intégrité méc.' },
            { section: 'denat',  field: 'contaminationDenat', label: 'Contamination' },
            { section: 'traces', field: 'alterationTraces',   label: 'Altération' },
        ];
        return checks
            .filter(({ section, field }) => getVal(lot[section] && lot[section][field]) === -10)
            .map(({ label }) => label)
            .join(', ');
    }

    getLotAggregatedTextValue(lot, fieldName) {
        if (!lot || !lot.allotissement || !fieldName) return '';

        const baseValue = (lot.allotissement[fieldName] || '').toString().trim();
        const values = new Set();

        const addValue = (value) => {
            const normalized = (value || '').toString().trim();
            if (normalized) values.add(normalized);
        };

        if (Array.isArray(lot.pieces)) {
            lot.pieces.forEach((piece) => {
                if (!piece || typeof piece !== 'object') return;
                const pieceValue = (piece[fieldName] || '').toString().trim();
                addValue(pieceValue || baseValue);
            });
        }

        this.ensureDefaultPiecesData(lot).forEach((defaultPiece) => {
            const defaultQty = Math.max(0, parseFloat((defaultPiece && defaultPiece.quantite) || 0) || 0);
            if (defaultQty <= 0) return;
            const defaultValue = (defaultPiece[fieldName] || '').toString().trim();
            addValue(defaultValue || baseValue);
        });

        if (values.size > 1) return 'Multiples';
        if (values.size === 1) return Array.from(values)[0];
        return baseValue;
    }

    composeEssenceLabel(commonName, scientificName) {
        const common = (commonName || '').toString().trim();
        const scientific = (scientificName || '').toString().trim();
        return [common, scientific].filter(Boolean).join(' - ');
    }

    getLotDetailDistinctValues(lot, fieldName) {
        if (!lot || !lot.allotissement || !fieldName) return [];

        const values = new Set();
        const addValue = (value) => {
            const normalized = (value || '').toString().trim();
            if (normalized) values.add(normalized);
        };

        if (fieldName === 'essence') {
            const baseCommon = (lot.allotissement.essenceNomCommun || '').toString().trim();
            const baseScientific = (lot.allotissement.essenceNomScientifique || '').toString().trim();
            const baseEssence = this.composeEssenceLabel(baseCommon, baseScientific);

            (lot.pieces || []).forEach((piece) => {
                if (!piece || typeof piece !== 'object') return;
                const common = (piece.essenceNomCommun || '').toString().trim() || baseCommon;
                const scientific = (piece.essenceNomScientifique || '').toString().trim() || baseScientific;
                addValue(this.composeEssenceLabel(common, scientific) || baseEssence);
            });

            this.ensureDefaultPiecesData(lot).forEach((defaultPiece) => {
                const defaultQty = Math.max(0, parseFloat((defaultPiece && defaultPiece.quantite) || 0) || 0);
                if (defaultQty <= 0) return;
                const common = (defaultPiece.essenceNomCommun || '').toString().trim() || baseCommon;
                const scientific = (defaultPiece.essenceNomScientifique || '').toString().trim() || baseScientific;
                addValue(this.composeEssenceLabel(common, scientific) || baseEssence);
            });

            if (values.size === 0) addValue(baseEssence);
            return Array.from(values);
        }

        const baseValue = (lot.allotissement[fieldName] || '').toString().trim();

        (lot.pieces || []).forEach((piece) => {
            if (!piece || typeof piece !== 'object') return;
            const pieceValue = (piece[fieldName] || '').toString().trim();
            addValue(pieceValue || baseValue);
        });

        this.ensureDefaultPiecesData(lot).forEach((defaultPiece) => {
            const defaultQty = Math.max(0, parseFloat((defaultPiece && defaultPiece.quantite) || 0) || 0);
            if (defaultQty <= 0) return;
            const defaultValue = (defaultPiece[fieldName] || '').toString().trim();
            addValue(defaultValue || baseValue);
        });

        if (values.size === 0) addValue(baseValue);
        return Array.from(values);
    }

    openLotDetailValuesModal(lot, fieldName, title) {
        const backdrop = document.getElementById('alertPiecesModalBackdrop');
        const titleEl = document.getElementById('alertPiecesModalTitle');
        const messageEl = document.getElementById('alertPiecesModalMessage');
        if (!backdrop || !messageEl) return;

        const values = this.getLotDetailDistinctValues(lot, fieldName);
        if (titleEl) titleEl.textContent = title || 'Détails';

        messageEl.style.whiteSpace = 'pre-line';
        messageEl.style.textAlign = 'left';
        if (!values.length) {
            messageEl.textContent = 'Aucune valeur renseignée dans le Détail du lot.';
        } else {
            const lines = values.map((value, idx) => `${idx + 1}. ${value}`);
            messageEl.textContent = lines.join('\n');
        }

        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }

    openLotLocationPiecesModal(title, linesText) {
        const backdrop = document.getElementById('lotLocationPiecesModalBackdrop');
        const titleEl = document.getElementById('lotLocationPiecesModalTitle');
        const messageEl = document.getElementById('lotLocationPiecesModalMessage');
        if (!backdrop || !messageEl) return;

        if (titleEl) titleEl.textContent = title || 'Pièces de la combinaison';
        messageEl.style.whiteSpace = 'pre-line';
        messageEl.style.textAlign = 'left';

        const content = (linesText || '').toString().trim();
        messageEl.textContent = content || 'Aucune pièce renseignée pour cette combinaison.';

        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }

    closeLotLocationPiecesModal() {
        const backdrop = document.getElementById('lotLocationPiecesModalBackdrop');
        if (!backdrop) return;
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }

    // [ARCHIVE TECHNIQUE] Etats de variabilite conserves, non relies a l'UI active.

    getVariabiliteState(cvVal, dim) {
        if (cvVal === null || cvVal === undefined) return 'neutre';
        const seuils = (
            this.data?.ui?.seuilsVariabilite?.[dim]
        ) ?? { t1: 8, t2: 20, t3: 40 };
        const pct = cvVal * 100;
        if (pct <= seuils.t1) return 'homogene';
        if (pct <= seuils.t2) return 'acceptable';
        if (pct <= seuils.t3) return 'heterogene';
        return 'tres-heterogene';
    }

    // [ARCHIVE TECHNIQUE] Etat EIqAbs conserve, non relie a l'UI active.
    getVariabiliteEiqAbsState(eiqAbsVal, dim) {
        if (eiqAbsVal === null || eiqAbsVal === undefined) return 'neutre';
        const seuils = (
            this.data?.ui?.seuilsVariabiliteEiqAbs?.[dim]
        ) ?? { t1: 50, t2: 150, t3: 300 };
        if (eiqAbsVal <= seuils.t1) return 'homogene';
        if (eiqAbsVal <= seuils.t2) return 'acceptable';
        if (eiqAbsVal <= seuils.t3) return 'heterogene';
        return 'tres-heterogene';
    }

    updateSeuilVariabilite(dim, tier, rawValue) {
        const parsed = parseInt(rawValue, 10);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return;
        if (!this.data.ui.seuilsVariabilite)
            this.data.ui.seuilsVariabilite = {};
        if (!this.data.ui.seuilsVariabilite[dim])
            this.data.ui.seuilsVariabilite[dim] = { t1: 8, t2: 20, t3: 40 };
        this.data.ui.seuilsVariabilite[dim][tier] = parsed;
        this.saveData();
        const currentLot = this.getCurrentLot();
        if (currentLot) this.updateActiveLotCardDisplays(currentLot);
    }

    // [ARCHIVE TECHNIQUE] Setter historique EIqAbs conserve, non relie au flux UI actuel.
    updateSeuilVariabiliteEiqAbs(dim, tier, rawValue) {
        const parsed = parseFloat(rawValue);
        if (!Number.isFinite(parsed) || parsed < 0) return;
        if (!this.data.ui.seuilsVariabiliteEiqAbs)
            this.data.ui.seuilsVariabiliteEiqAbs = {};
        if (!this.data.ui.seuilsVariabiliteEiqAbs[dim])
            this.data.ui.seuilsVariabiliteEiqAbs[dim] = { t1: 50, t2: 150, t3: 300 };
        this.data.ui.seuilsVariabiliteEiqAbs[dim][tier] = parsed;
        this.saveData();
        const currentLot = this.getCurrentLot();
        if (currentLot) this.updateActiveLotCardDisplays(currentLot);
    }

    // [ARCHIVE TECHNIQUE] Setter historique des ponderations conserve, non relie au flux UI actuel.
    updatePoidsSimilarite(dim, rawValue) {
        const parsed = parseFloat(rawValue);
        if (!Number.isFinite(parsed) || parsed < 0) return;
        const currentLot = this.getCurrentLot();
        if (!currentLot) return;
        if (!currentLot.poidsSimilarite || typeof currentLot.poidsSimilarite !== 'object') {
            currentLot.poidsSimilarite = { longueur: 0, largeur: 0, epaisseur: 0, diametre: 0 };
        }
        currentLot.poidsSimilarite[dim] = parsed;
        this.saveData();
        this.recalculateLotAllotissement(currentLot);
        this.updateActiveLotCardDisplays(currentLot);
        // Rafraîchit les inputs DOM en place sans re-render complet
        const lotIndex = this.data.lots.indexOf(currentLot);
        const card = document.querySelector(`.lot-card[data-lot-index="${lotIndex}"]`);
        if (card) {
            card.querySelectorAll('[data-poids-dim]').forEach((input) => {
                const d = input.dataset.poidsDim;
                if (d && currentLot.poidsSimilarite[d] != null) {
                    input.value = currentLot.poidsSimilarite[d];
                }
            });
        }
    }

    updateActiveLotCardDisplays(lot) {
        const lotIndex = this.data.lots.indexOf(lot);
        if (lotIndex < 0) return;
        const card = document.querySelector(`.lot-card[data-lot-index="${lotIndex}"]`);
        if (!card) return;

        const formatGrouped = (value, digits = 0) => (parseFloat(value) || 0).toLocaleString(getValoboisIntlLocale(), {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
        const formatOneDecimal = (value) => formatGrouped(value, 1);

        const el = (sel) => card.querySelector(sel);
        const setVal = (sel, v) => { const e = el(sel); if (e) e.value = v; };

        setVal('[data-display="volumePiece"]', formatGrouped(lot.allotissement.volumePiece, 3));
        setVal('[data-display="volumeLot"]', formatOneDecimal(lot.allotissement.volumeLot));
        setVal('[data-display="surfacePiece"]', formatOneDecimal(lot.allotissement.surfacePiece));
        setVal('[data-display="surfaceLot"]', formatOneDecimal(lot.allotissement.surfaceLot));
        setVal('[data-display="prixLot"]', formatGrouped(Math.round(lot.allotissement.prixLot), 0));
        const isIgnored = !!(((lot.inspection || {}).integrite || {}).ignore);
        setVal('[data-display="prixLotAjusteIntegrite"]', isIgnored ? '' : formatGrouped(Math.round(lot.allotissement.prixLotAjusteIntegrite || 0), 0));
        setVal('[data-display="lineaireLot"]', formatOneDecimal(lot.allotissement.lineaireLot));
        const masseLotD = this.formatMasseDisplay(lot.allotissement.masseLot);
        setVal('[data-display="masseLot"]', masseLotD.value);
        const masseLotUnitEl = el('[data-display="masseLotUnit"]');
        if (masseLotUnitEl) masseLotUnitEl.textContent = masseLotD.unit;
        const masseVolumiqueMoyenneMesureeD = this.getMeasuredLotDensityDisplay(lot);
        setVal('[data-display="masseVolumiqueMoyenneMesureeLot"]', masseVolumiqueMoyenneMesureeD.value);
        const masseVolumiqueMoyenneMesureeUnitEl = el('[data-display="masseVolumiqueMoyenneMesureeLotUnit"]');
        if (masseVolumiqueMoyenneMesureeUnitEl) masseVolumiqueMoyenneMesureeUnitEl.textContent = masseVolumiqueMoyenneMesureeD.unit;
        const masseLotMesureeD = this.getMeasuredLotMassDisplay(lot);
        setVal('[data-display="masseLotMesuree"]', masseLotMesureeD.value);
        const masseLotMesureeUnitEl = el('[data-display="masseLotMesureeUnit"]');
        if (masseLotMesureeUnitEl) masseLotMesureeUnitEl.textContent = masseLotMesureeD.unit;
        const pco2D = this.formatPco2Display(lot.allotissement.carboneBiogeniqueEstime);
        setVal('[data-display="carboneBiogeniqueEstime"]', pco2D.value);
        const pco2UnitEl = el('[data-display="carboneBiogeniqueEstimeUnit"]');
        if (pco2UnitEl) pco2UnitEl.textContent = pco2D.unit;

        // Mise à jour du mode de variabilité (trio / duo)
        const _varMode = ((lot.allotissement.diametre !== '' && lot.allotissement.diametre != null) || (lot.allotissement._avgDiametre || 0) > 0) ? 'cylindrical' : 'rectangular';
        card.querySelectorAll('[data-variabilite-grid]').forEach(g => { g.dataset.variabiliteMode = _varMode; });

        const formatPieceTypeDim = (dim) => {
            const value = lot.allotissement.medoideDims?.[dim];
            return value != null
                ? Math.round(value).toLocaleString(getValoboisIntlLocale(), { maximumFractionDigits: 0 })
                : '';
        };
        setVal('[data-display="pieceTypeLongueur"]', formatPieceTypeDim('longueur'));
        setVal('[data-display="pieceTypeLargeur"]', formatPieceTypeDim('largeur'));
        setVal('[data-display="pieceTypeEpaisseur"]', formatPieceTypeDim('epaisseur'));
        setVal('[data-display="pieceTypeDiametre"]', formatPieceTypeDim('diametre'));
        ['longueur', 'largeur', 'epaisseur', 'diametre'].forEach((dim) => {
            const wrap = el(`[data-piece-type-dim-wrap="${dim}"]`);
            if (wrap) {
                const hasValue = lot.allotissement.medoideDims?.[dim] != null;
                wrap.dataset.hasValue = hasValue ? 'true' : 'false';
            }
        });
        const medoideNomEl = el('[data-display="medoideNom"]');
        if (medoideNomEl) {
            const rawLabel = lot.allotissement.medoideLabel || 'Non calculé (≥ 2 pièces requises)';
            medoideNomEl.textContent = rawLabel;
        }
        const medoideScoreEl = el('[data-display="medoideScore"]');
        if (medoideScoreEl) {
            medoideScoreEl.textContent = lot.allotissement.medoideScore !== null
                ? `${Math.round(lot.allotissement.medoideScore)}\u00a0%`
                : '—';
        }

        // Taux de similarité
        const tauxEl = el('[data-display="tauxSimilarite"]');
        if (tauxEl) {
            const formattedTaux = this.formatTauxSimilarite(lot.allotissement.tauxSimilarite);
            if ('value' in tauxEl) {
                tauxEl.value = formattedTaux;
            } else {
                tauxEl.textContent = formattedTaux;
            }
        }

        // Mise à jour du groupe "Amortissement biologique" du lot
        const avgAgeEl2 = el('[data-display="avgAgeArbre"]');
        if (avgAgeEl2) avgAgeEl2.value = lot.allotissement._avgAgeArbre != null ? lot.allotissement._avgAgeArbre.toLocaleString(getValoboisIntlLocale(), { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : '';
        const avgYearEl2 = el('[data-display="avgServiceYear"]');
        if (avgYearEl2) avgYearEl2.value = lot.allotissement._avgServiceYear != null ? String(lot.allotissement._avgServiceYear) : '';
        const avgAmortEl2 = el('[data-display="avgAmortissementBiologique"]');
        if (avgAmortEl2) avgAmortEl2.value = this.computeAmortissementBiologique(lot.allotissement._avgAgeArbre != null ? String(lot.allotissement._avgAgeArbre) : '', lot.allotissement._avgServiceYear != null ? String(lot.allotissement._avgServiceYear) : '');

        // Mise à jour badge pièces et bouton alerte
        const nbPieces = (lot.pieces || []).length;
        const qTotal = parseFloat(lot.allotissement.quantite) || 0;
        const qEffective = Math.max(qTotal, nbPieces);
        const badgeEl = el('[data-display="piecesBadge"]');
        if (badgeEl) badgeEl.textContent = `${nbPieces}/${qEffective}`;
        const alertBtn = el('[data-lot-alert-btn]');
        if (alertBtn) {
            const hasOrangeAlert = qTotal > nbPieces;
            const hasMissingPieceFields = !hasOrangeAlert && this.hasIncompleteDetailLotPieces(lot);
            alertBtn.dataset.alertActive = hasOrangeAlert ? 'true' : 'false';
            alertBtn.dataset.alertMissing = hasMissingPieceFields ? 'true' : 'false';
        }
        const notationAlertBtn = el('[data-lot-notation-alert-btn]');
        if (notationAlertBtn) {
            notationAlertBtn.dataset.alertNotation = this.hasIncompleteNotationCriteria(lot) ? 'true' : 'false';
        }
        const destinationAlertBtn = el('[data-lot-destination-alert-btn]');
        if (destinationAlertBtn) {
            destinationAlertBtn.dataset.alertDestination = this.hasIncompleteDestinationFields(lot) ? 'true' : 'false';
        }

        const typePieceDisplay = this.getLotAggregatedTextValue(lot, 'typePiece');
        const typeProduitDisplay = this.getLotAggregatedTextValue(lot, 'typeProduit');
        const essenceCommonDisplay = this.getLotAggregatedTextValue(lot, 'essenceNomCommun');
        const essenceScientificDisplay = this.getLotAggregatedTextValue(lot, 'essenceNomScientifique');
        const isTypePieceMultiple = typePieceDisplay === 'Multiples';
        const isTypeProduitMultiple = typeProduitDisplay === 'Multiples';
        const isEssenceMultiple = essenceCommonDisplay === 'Multiples' || essenceScientificDisplay === 'Multiples';

        const lotTypePieceInput = el('input[data-lot-input="typePiece"]');
        if (lotTypePieceInput) {
            lotTypePieceInput.value = typePieceDisplay;
        }
        const lotTypeProduitInput = el('input[data-lot-input="typeProduit"]');
        if (lotTypeProduitInput) {
            lotTypeProduitInput.value = typeProduitDisplay;
        }
        const lotEssenceCommonInput = el('input[data-lot-input="essenceNomCommun"]');
        if (lotEssenceCommonInput) {
            lotEssenceCommonInput.value = essenceCommonDisplay;
        }
        const lotEssenceScientificInput = el('input[data-lot-input="essenceNomScientifique"]');
        if (lotEssenceScientificInput) {
            lotEssenceScientificInput.value = essenceScientificDisplay;
        }

        const typeButton = el('[data-lot-details-btn="typePiece"]');
        const typeProduitButton = el('[data-lot-details-btn="typeProduit"]');
        const essenceButton = el('[data-lot-details-btn="essence"]');
        if (typeButton) {
            typeButton.hidden = !isTypePieceMultiple;
            const typeWrapper = typeButton.closest('.lot-type-with-detail');
            if (typeWrapper) typeWrapper.classList.toggle('has-detail-btn', isTypePieceMultiple);
        }
        if (typeProduitButton) {
            typeProduitButton.hidden = !isTypeProduitMultiple;
            const typeProduitWrapper = typeProduitButton.closest('.lot-type-with-detail');
            if (typeProduitWrapper) typeProduitWrapper.classList.toggle('has-detail-btn', isTypeProduitMultiple);
        }
        if (essenceButton) {
            essenceButton.hidden = !isEssenceMultiple;
            const essenceWrapper = essenceButton.closest('.lot-essence-with-detail');
            if (essenceWrapper) essenceWrapper.classList.toggle('has-detail-btn', isEssenceMultiple);
        }

        // Mise à jour des dimensions moyennes dans le formulaire lot
        const defaultQty = this.getTotalDefaultPieceQuantity(lot);
        if (nbPieces > 0 || defaultQty > 0) {
            const longueurInput = el('input[data-lot-input="longueur"]');
            const largeurInput = el('input[data-lot-input="largeur"]');
            const epaisseurInput = el('input[data-lot-input="epaisseur"]');
            if (longueurInput && document.activeElement !== longueurInput) {
                longueurInput.value = this.formatAllotissementNumericDisplay(String(Math.round(lot.allotissement._avgLongueur || 0)));
            }
            if (largeurInput && document.activeElement !== largeurInput) {
                largeurInput.value = this.formatAllotissementNumericDisplay(String(Math.round(lot.allotissement._avgLargeur || 0)));
            }
            if (epaisseurInput && document.activeElement !== epaisseurInput) {
                epaisseurInput.value = this.formatAllotissementNumericDisplay(String(Math.round(lot.allotissement._avgEpaisseur || 0)));
            }
        }

        // Ne pas remplacer le DOM du détail ici : cela casse l'état actif/passif des cartes.
    }

    isAllotissementNumericField(field) {
        return [
            'quantite',
            'longueur',
            'largeur',
            'epaisseur',
            'diametre',
            'prixMarche',
            'masseVolumique',
            'masseVolumiqueMesuree',
            'massePieceMesuree',
            'humidite',
            'fractionCarbonee',
            'bois'
        ].includes(field);
    }

    isCarbonPrixNumericField(field) {
        return [
            'prixMarche',
            'masseVolumique',
            'masseVolumiqueMesuree',
            'massePieceMesuree',
            'fractionCarbonee',
            'humidite',
            'bois'
        ].includes(field);
    }

    normalizeAllotissementNumericInput(rawValue) {
        const raw = (rawValue == null ? '' : String(rawValue))
            .replace(/[\s\u00A0\u202F]/g, '')
            .replace(/,/g, '.');

        if (!raw) return '';

        let cleaned = raw.replace(/[^0-9.\-]/g, '');
        cleaned = cleaned.replace(/(?!^)-/g, '');

        const firstDot = cleaned.indexOf('.');
        if (firstDot !== -1) {
            cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
        }

        if (cleaned === '-' || cleaned === '.' || cleaned === '-.') return '';
        return cleaned;
    }

    formatAllotissementNumericDisplay(rawValue) {
        const normalized = this.normalizeAllotissementNumericInput(rawValue);
        if (!normalized) return '';

        const negative = normalized.startsWith('-');
        const unsigned = negative ? normalized.slice(1) : normalized;
        const [intPartRaw, decPartRaw] = unsigned.split('.');
        const intPart = (intPartRaw || '0').replace(/^0+(?=\d)/, '');
        const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

        if (decPartRaw != null && decPartRaw !== '') {
            return `${negative ? '-' : ''}${groupedInt},${decPartRaw}`;
        }
        return `${negative ? '-' : ''}${groupedInt}`;
    }

    computeMedoideLot(lot, allDimValues) {
        // allDimValues = { longueur: [], largeur: [], epaisseur: [], diametre: [] }
        // construit dans recalculateLotAllotissement (voir etape 5)

        const defaultPieces = this.ensureDefaultPiecesData(lot);
        const totalDefaultCount = defaultPieces.reduce((sum, piece) => {
            return sum + Math.max(0, parseFloat(piece && piece.quantite) || 0);
        }, 0);
        const detailedPieces = Array.isArray(lot.pieces) ? lot.pieces : [];
        const N = totalDefaultCount + detailedPieces.length;
        if (N < 2) return null;

        const lotHasDiametre = (parseFloat(lot.allotissement?.diametre) || 0) > 0;
        const activeDims = lotHasDiametre
            ? ['longueur', 'diametre']
            : ['longueur', 'largeur', 'epaisseur'];

        const resolveDim = (pieceVal, lotVal) => {
            const v = parseFloat(pieceVal);
            if (Number.isFinite(v) && v > 0) return v;
            const vl = parseFloat(lotVal);
            return (Number.isFinite(vl) && vl > 0) ? vl : null;
        };

        // Construire la liste des "atoms" : {label, count, dims}
        const atoms = [];
        defaultPieces.forEach((defaultPiece, index) => {
            const count = Math.max(0, parseFloat(defaultPiece?.quantite) || 0);
            if (count <= 0) return;
            atoms.push({
                key: `default_${defaultPiece.id || index}`,
                label: `Pièce par défaut ${index + 1} (×${Math.round(count)})`,
                count,
                dims: {
                    longueur:  resolveDim(defaultPiece.longueur, lot.allotissement?.longueur),
                    largeur:   resolveDim(defaultPiece.largeur, lot.allotissement?.largeur),
                    epaisseur: resolveDim(defaultPiece.epaisseur, lot.allotissement?.epaisseur),
                    diametre:  resolveDim(defaultPiece.diametre, lot.allotissement?.diametre),
                },
            });
        });
        detailedPieces.forEach((p, idx) => {
            atoms.push({
                key: `piece_${idx}`,
                label: p.nom || `Pièce ${idx + 1}`,
                count: 1,
                dims: {
                    longueur:  resolveDim(p.longueur, null),
                    largeur:   resolveDim(p.largeur, null),
                    epaisseur: resolveDim(p.epaisseur, null),
                    diametre:  resolveDim(p.diametre, null),
                },
            });
        });

        // Score pairwise entre deux sets de dims
        const pairScore = (dimsA, dimsB) => {
            let sumS = 0;
            let count = 0;
            activeDims.forEach(d => {
                const a = dimsA[d];
                const b = dimsB[d];
                if (a === null || b === null) return;
                const scale = Math.max(1, Math.abs(a), Math.abs(b));
                const relDiff = Math.abs(a - b) / scale;
                sumS += Math.max(0, 1 - relDiff);
                count += 1;
            });
            return count > 0 ? sumS / count : null;
        };

        // Score moyen de chaque atom vs tous les autres (pondere par count)
        const scored = atoms.map((atomI, i) => {
            let sumS = 0, totalPairs = 0;
            atoms.forEach((atomJ, j) => {
                if (i === j) return;
                const s = pairScore(atomI.dims, atomJ.dims);
                if (s === null) return;
                const w = Math.max(1, atomJ.count);
                sumS += s * w;
                totalPairs += w;
            });
            if (atomI.key.startsWith('default_') && atomI.count > 1) {
                sumS += (atomI.count - 1) * 1.0;
                totalPairs += (atomI.count - 1);
            }
            return {
                key: atomI.key,
                label: atomI.label,
                dims: atomI.dims,
                score: totalPairs > 0 ? (sumS / totalPairs) * 100 : null,
            };
        }).filter(a => a.score !== null);

        if (!scored.length) return null;

        // Medoide = atom avec le score le plus eleve
        const medoide = scored.reduce((best, a) => a.score > best.score ? a : best);

        // MAD par dimension depuis le medoide
        const mad = {};
        ['longueur', 'largeur', 'epaisseur', 'diametre'].forEach(dim => {
            const ref = medoide.dims[dim];
            const vals = allDimValues[dim] ?? [];
            const m = vbMAD(vals, ref);
            mad[dim] = m !== null ? Math.round(m) : null;
        });

        return {
            key: medoide.key,
            label: medoide.label,
            score: medoide.score,
            dims: medoide.dims,
            mad,
        };
    }

    // [ARCHIVE TECHNIQUE] Normalisation de ponderations historiques, non utilisee
    // par le calcul courant du taux de similarite.
    computePoidsSimilarite(lot) {
        const poids = lot?.poidsSimilarite ?? {};
        const wL  = Math.max(0, parseFloat(poids.longueur)  || 0) || 1;
        const wLa = Math.max(0, parseFloat(poids.largeur)   || 0) || 1;
        const wE  = Math.max(0, parseFloat(poids.epaisseur) || 0) || 1;
        const wD  = Math.max(0, parseFloat(poids.diametre)  || 0) || 1;

        const hasDiametre = lot?.allotissement?.diametre !== ''
          && lot?.allotissement?.diametre !== null
          && lot?.allotissement?.diametre !== undefined;

        const activeDims = hasDiametre
          ? [{ dim: 'longueur', w: wL }, { dim: 'diametre', w: wD }]
          : [{ dim: 'longueur', w: wL }, { dim: 'largeur', w: wLa }, { dim: 'epaisseur', w: wE }];

        const totalW = activeDims.reduce((s, d) => s + d.w, 0);

        const result = { longueur: null, largeur: null, epaisseur: null, diametre: null };
        if (totalW > 0) {
          activeDims.forEach(d => {
            result[d.dim] = (d.w / totalW) * 100;
          });
        }
        return result;
    }

    recalculateLotAllotissement(lot) {
        if (!lot || !lot.allotissement) return;
        const defaultPieces = this.ensureDefaultPiecesData(lot);
        const q = this.getLotQuantityFromDetail(lot);
        lot.allotissement.quantite = String(q);
        const currentLotMasseVolumique = this.normalizeAllotissementNumericInput(lot.allotissement.masseVolumique);
        const detailMasseVolumiqueWasActive = lot.allotissement._masseVolumiqueFromDetail === 'true';
        const detailMasseVolumiqueAverage = this.getDetailedMasseVolumiqueAverage(lot);
        if (detailMasseVolumiqueAverage != null) {
            if (!detailMasseVolumiqueWasActive && currentLotMasseVolumique !== '') {
                lot.allotissement._baseMasseVolumique = currentLotMasseVolumique;
            }
            lot.allotissement.masseVolumique = this.normalizeAllotissementNumericInput(String(Math.round(detailMasseVolumiqueAverage)));
            lot.allotissement._masseVolumiqueFromDetail = 'true';
        } else {
            if (!detailMasseVolumiqueWasActive && currentLotMasseVolumique !== '') {
                lot.allotissement._baseMasseVolumique = currentLotMasseVolumique;
            }
            const fallbackMasseVolumique = this.normalizeAllotissementNumericInput(lot.allotissement._baseMasseVolumique);
            if (detailMasseVolumiqueWasActive && fallbackMasseVolumique !== '') {
                lot.allotissement.masseVolumique = fallbackMasseVolumique;
            }
            lot.allotissement._masseVolumiqueFromDetail = 'false';
        }
        const L = parseFloat(lot.allotissement.longueur) || 0;
        const l = parseFloat(lot.allotissement.largeur) || 0;
        const e = parseFloat(lot.allotissement.epaisseur) || 0;
        const d = parseFloat(lot.allotissement.diametre) || 0;
        const pm = parseFloat(lot.allotissement.prixMarche) || 0;
        const integrityFactor = this.getLotIntegrityPriceFactor(lot);
        const priceUnitRaw = ((lot.allotissement.prixUnite || 'm3') + '').toLowerCase();
        const priceUnit = (priceUnitRaw === 'ml' || priceUnitRaw === 'm2' || priceUnitRaw === 'm3') ? priceUnitRaw : 'm3';
        lot.allotissement.prixUnite = priceUnit;

        lot.allotissement.surfacePiece = (L * l) / 1000000;
        lot.allotissement.surfaceLot = lot.allotissement.surfacePiece * q;
        if (d > 0) {
            const rayon = d / 2;
            lot.allotissement.volumePiece = (Math.PI * rayon * rayon * L) / 1000000000;
        } else {
            lot.allotissement.volumePiece = (L * l * e) / 1000000000;
        }
        lot.allotissement.volumeLot = lot.allotissement.volumePiece * q;
        lot.allotissement.lineaireLot = (q * L) / 1000;

        const pricingBase =
            priceUnit === 'ml' ? lot.allotissement.lineaireLot :
            priceUnit === 'm2' ? lot.allotissement.surfaceLot :
            lot.allotissement.volumeLot;

        lot.allotissement.prixLot = pricingBase * pm;
        lot.allotissement.prixLotAjusteIntegrite = lot.allotissement.prixLot * integrityFactor;

        // Calcul de la masse du lot (Masse volumique en kg/m3 × Volume du lot en m3)
        const rhoMass = parseFloat(lot.allotissement.masseVolumique) || 0;
        const vForMass = parseFloat(lot.allotissement.volumeLot) || 0;
        lot.allotissement.masseLot = rhoMass * vForMass;

        // NF EN 16449:2014 -> cf fixe = 0.5
        const carbonFractionFixed = 0.5;
        const rho = parseFloat(lot.allotissement.masseVolumique) || 0;
        const vGross = parseFloat(lot.allotissement.volumeLot) || 0;
        const woodPct = parseFloat(lot.allotissement.bois);
        const mc = parseFloat(lot.allotissement.humidite);

        const safeWoodPct = Number.isFinite(woodPct) ? woodPct : 100;
        const safeMc = Number.isFinite(mc) ? mc : 12;
        const moistureDenominator = 1 + (safeMc / 100);

        const pco2Kg = moistureDenominator > 0
            ? (44 / 12) * carbonFractionFixed * rho * vGross * (safeWoodPct / 100) / moistureDenominator
            : 0;

        lot.allotissement.carboneBiogeniqueEstime = String(Math.max(0, Math.round(pco2Kg)));

        // ─── Agrégation pièces ───
        if (q > 0) {
            lot.pieces.forEach(p => this.recalculatePiece(p, lot));

            // Somme des contributions des pièces individuelles
            let sumVolume = 0, sumSurface = 0, sumLineaire = 0;
            let sumPrix = 0, sumPrixAjuste = 0, sumMasse = 0, sumCO2 = 0;
            lot.pieces.forEach(p => {
                sumVolume += p.volumePiece || 0;
                sumSurface += p.surfacePiece || 0;
                sumLineaire += (parseFloat(p.longueur) || 0) / 1000;
                sumPrix += p.prixPiece || 0;
                sumPrixAjuste += p.prixPieceAjusteIntegrite || 0;
                sumMasse += p.massePiece || 0;
                sumCO2 += parseFloat(p.carboneBiogeniqueEstime) || 0;
            });

            const defaultPieceSamples = [];
            defaultPieces.forEach((defaultPiece) => {
                const numDefault = Math.max(0, parseFloat(defaultPiece.quantite || 0) || 0);
                if (numDefault <= 0) return;

                const dL = parseFloat(defaultPiece.longueur !== '' ? defaultPiece.longueur : lot.allotissement.longueur) || 0;
                const dl = parseFloat(defaultPiece.largeur !== '' ? defaultPiece.largeur : lot.allotissement.largeur) || 0;
                const de = parseFloat(defaultPiece.epaisseur !== '' ? defaultPiece.epaisseur : lot.allotissement.epaisseur) || 0;
                const dd = parseFloat(defaultPiece.diametre !== '' ? defaultPiece.diametre : lot.allotissement.diametre) || 0;
                const dPm = parseFloat(defaultPiece.prixMarche !== '' ? defaultPiece.prixMarche : lot.allotissement.prixMarche) || 0;
                const dPriceUnitRaw = ((defaultPiece.prixUnite || lot.allotissement.prixUnite || 'm3') + '').toLowerCase();
                const dPriceUnit = (dPriceUnitRaw === 'ml' || dPriceUnitRaw === 'm2' || dPriceUnitRaw === 'm3') ? dPriceUnitRaw : 'm3';
                const dRho = parseFloat(defaultPiece.masseVolumique !== '' ? defaultPiece.masseVolumique : lot.allotissement.masseVolumique) || 0;
                const dWood = parseFloat(defaultPiece.bois !== '' ? defaultPiece.bois : lot.allotissement.bois);
                const dMc = parseFloat(defaultPiece.humidite !== '' ? defaultPiece.humidite : lot.allotissement.humidite);
                const dSafeWood = Number.isFinite(dWood) ? dWood : 100;
                const dSafeMc = Number.isFinite(dMc) ? dMc : 12;
                const dMoistureDenominator = 1 + (dSafeMc / 100);

                const defaultSurfPerPiece = (dL * dl) / 1000000;
                const defaultVolPerPiece = dd > 0
                    ? (Math.PI * (dd / 2) * (dd / 2) * dL) / 1000000000
                    : (dL * dl * de) / 1000000000;
                const defaultLinPerPiece = dL / 1000;
                const defaultPricingBase =
                    dPriceUnit === 'ml' ? defaultLinPerPiece :
                    dPriceUnit === 'm2' ? defaultSurfPerPiece :
                    defaultVolPerPiece;
                const defaultPrixPerPiece = defaultPricingBase * dPm;
                const defaultCO2PerPiece = dMoistureDenominator > 0
                    ? (44 / 12) * carbonFractionFixed * dRho * defaultVolPerPiece * (dSafeWood / 100) / dMoistureDenominator
                    : 0;

                sumVolume += numDefault * defaultVolPerPiece;
                sumSurface += numDefault * defaultSurfPerPiece;
                sumLineaire += numDefault * defaultLinPerPiece;
                sumPrix += numDefault * defaultPrixPerPiece;
                sumPrixAjuste += numDefault * defaultPrixPerPiece * integrityFactor;
                sumMasse += numDefault * (dRho * defaultVolPerPiece);
                sumCO2 += numDefault * defaultCO2PerPiece;

                defaultPieceSamples.push({
                    count: numDefault,
                    longueur: dL,
                    largeur: dl,
                    epaisseur: de,
                    diametre: dd,
                    ageArbre: defaultPiece.ageArbre,
                    dateMiseEnService: defaultPiece.dateMiseEnService,
                });
            });

            lot.allotissement.volumeLot = sumVolume;
            lot.allotissement.surfaceLot = sumSurface;
            lot.allotissement.lineaireLot = sumLineaire;
            // En mode prixLotDirect, le prix du lot reste celui calculé depuis le formulaire du lot (pricingBase × prixMarche)
            if (!lot.allotissement.prixLotDirect) {
                lot.allotissement.prixLot = sumPrix;
                lot.allotissement.prixLotAjusteIntegrite = sumPrixAjuste;
            } else {
                // Recalculer le prix lot direct sur la base des volumes/surfaces/linéaires agrégés
                const directPricingBase =
                    priceUnit === 'ml' ? sumLineaire :
                    priceUnit === 'm2' ? sumSurface :
                    sumVolume;
                lot.allotissement.prixLot = directPricingBase * pm;
                lot.allotissement.prixLotAjusteIntegrite = lot.allotissement.prixLot * integrityFactor;
            }
            lot.allotissement.masseLot = sumMasse;
            lot.allotissement.carboneBiogeniqueEstime = String(Math.max(0, Math.round(sumCO2)));

            // Volume unitaire moyen affiché dans le lot = moyenne pondérée
            if (q > 0) {
                lot.allotissement.volumePiece = sumVolume / q;
                lot.allotissement.surfacePiece = sumSurface / q;
            }

            // Moyenne pondérée des dimensions pour affichage dans le formulaire du lot
            let sumLongueur = 0, sumLargeur = 0, sumEpaisseur = 0, sumDiametre = 0;
            lot.pieces.forEach(p => {
                sumLongueur += parseFloat(p.longueur) || 0;
                sumLargeur += parseFloat(p.largeur) || 0;
                sumEpaisseur += parseFloat(p.epaisseur) || 0;
                sumDiametre += parseFloat(p.diametre) || 0;
            });
            defaultPieces.forEach((defaultPiece) => {
                const numDefault = Math.max(0, parseFloat(defaultPiece.quantite || 0) || 0);
                if (numDefault <= 0) return;
                const dL = parseFloat(defaultPiece.longueur !== '' ? defaultPiece.longueur : lot.allotissement.longueur) || 0;
                const dl = parseFloat(defaultPiece.largeur !== '' ? defaultPiece.largeur : lot.allotissement.largeur) || 0;
                const de = parseFloat(defaultPiece.epaisseur !== '' ? defaultPiece.epaisseur : lot.allotissement.epaisseur) || 0;
                const dd = parseFloat(defaultPiece.diametre !== '' ? defaultPiece.diametre : lot.allotissement.diametre) || 0;
                sumLongueur += numDefault * dL;
                sumLargeur += numDefault * dl;
                sumEpaisseur += numDefault * de;
                sumDiametre += numDefault * dd;
            });
            if (q > 0) {
                lot.allotissement._avgLongueur = sumLongueur / q;
                lot.allotissement._avgLargeur = sumLargeur / q;
                lot.allotissement._avgEpaisseur = sumEpaisseur / q;
                lot.allotissement._avgDiametre = sumDiametre / q;
            } else {
                lot.allotissement._avgLongueur = L;
                lot.allotissement._avgLargeur = l;
                lot.allotissement._avgEpaisseur = e;
                lot.allotissement._avgDiametre = d;
            }

            // ── Coefficients de Variation par dimension ───────────────────
            const _cvL  = [];
            const _cvLg = [];
            const _cvE  = [];
            const _cvD  = [];

            lot.pieces.forEach(p => {
                const vL = parseFloat(p.longueur);
                const vLg = parseFloat(p.largeur);
                const vE = parseFloat(p.epaisseur);
                const vD = parseFloat(p.diametre);
                if (Number.isFinite(vL)  && vL  > 0) _cvL.push(vL);
                if (Number.isFinite(vLg) && vLg > 0) _cvLg.push(vLg);
                if (Number.isFinite(vE)  && vE  > 0) _cvE.push(vE);
                if (Number.isFinite(vD)  && vD  > 0) _cvD.push(vD);
            });

            defaultPieceSamples.forEach((sample) => {
                for (let _i = 0; _i < sample.count; _i++) {
                    if (Number.isFinite(sample.longueur) && sample.longueur > 0) _cvL.push(sample.longueur);
                    if (Number.isFinite(sample.largeur) && sample.largeur > 0) _cvLg.push(sample.largeur);
                    if (Number.isFinite(sample.epaisseur) && sample.epaisseur > 0) _cvE.push(sample.epaisseur);
                    if (Number.isFinite(sample.diametre) && sample.diametre > 0) _cvD.push(sample.diametre);
                }
            });

            // Tableaux de dimensions tous lots confondus (pour MAD)
            const allDimValues = {
                longueur: [..._cvL],
                largeur: [..._cvLg],
                epaisseur: [..._cvE],
                diametre: [..._cvD],
            };

            lot.allotissement.cvLongueur  = _vbCV(_cvL);
            lot.allotissement.cvLargeur   = _vbCV(_cvLg);
            lot.allotissement.cvEpaisseur = _vbCV(_cvE);
            lot.allotissement.cvDiametre  = _vbCV(_cvD);

            lot.allotissement.ecartTypeLongueur  = _cvL.length >= 2 ? _vbEcartType(_cvL) : null;
            lot.allotissement.ecartTypeLargeur   = _cvLg.length >= 2 ? _vbEcartType(_cvLg) : null;
            lot.allotissement.ecartTypeEpaisseur = _cvE.length >= 2 ? _vbEcartType(_cvE) : null;
            lot.allotissement.ecartTypeDiametre  = _cvD.length >= 2 ? _vbEcartType(_cvD) : null;

            lot.allotissement.eiqLongueur  = _vbEIq(_cvL);
            lot.allotissement.eiqLargeur   = _vbEIq(_cvLg);
            lot.allotissement.eiqEpaisseur = _vbEIq(_cvE);
            lot.allotissement.eiqDiametre  = _vbEIq(_cvD);

            lot.allotissement.eiqAbsLongueur  = _vbEIqAbs(_cvL);
            lot.allotissement.eiqAbsLargeur   = _vbEIqAbs(_cvLg);
            lot.allotissement.eiqAbsEpaisseur = _vbEIqAbs(_cvE);
            lot.allotissement.eiqAbsDiametre  = _vbEIqAbs(_cvD);

            // Medoide et seuils suggeres
            {
                const medoideResult = this.computeMedoideLot(lot, allDimValues);
                if (medoideResult) {
                    lot.allotissement.medoideKey = medoideResult.key;
                    lot.allotissement.medoideLabel = medoideResult.label;
                    lot.allotissement.medoideScore = medoideResult.score;
                    lot.allotissement.medoideDims = medoideResult.dims;
                    lot.allotissement.madLongueur = medoideResult.mad.longueur;
                    lot.allotissement.madLargeur = medoideResult.mad.largeur;
                    lot.allotissement.madEpaisseur = medoideResult.mad.epaisseur;
                    lot.allotissement.madDiametre = medoideResult.mad.diametre;
                    // Archivage MAD conserve ; suggestion de seuils désactivée.
                    lot.allotissement.seuilSuggest = null;
                } else {
                    lot.allotissement.medoideKey = null;
                    lot.allotissement.medoideLabel = null;
                    lot.allotissement.medoideScore = null;
                    lot.allotissement.medoideDims = null;
                    lot.allotissement.madLongueur = null;
                    lot.allotissement.madLargeur = null;
                    lot.allotissement.madEpaisseur = null;
                    lot.allotissement.madDiametre = null;
                    lot.allotissement.seuilSuggest = null;
                }

                // Taux de similarite du lot par rapport a la piece type (medoide),
                // pilote par les seuils de destination renseignes par l'utilisateur.
                const sdAbsolute = lot.seuilsDestination ?? {};
                const sdOffset = lot.seuilsDestinationOffset ?? {};
                const lotHasDiametreForSimilarity = (parseFloat(lot.allotissement?.diametre) || 0) > 0;
                const activeDimsForSimilarity = lotHasDiametreForSimilarity
                    ? ['longueur', 'diametre']
                    : ['longueur', 'largeur', 'epaisseur'];

                const medoidDims = lot.allotissement.medoideDims || null;
                if (medoidDims && !lot.seuilsDestinationOffsetMigrated) {
                    ['longueur', 'largeur', 'epaisseur', 'diametre'].forEach((dim) => {
                        const center = parseFloat(medoidDims?.[dim]);
                        if (!Number.isFinite(center) || center <= 0) return;
                        const absMin = sdAbsolute?.[dim]?.min;
                        const absMax = sdAbsolute?.[dim]?.max;
                        const minNum = absMin != null ? parseFloat(absMin) : null;
                        const maxNum = absMax != null ? parseFloat(absMax) : null;
                        if (Number.isFinite(minNum)) {
                            sdOffset[dim].min = Math.round((minNum - center) * 1000) / 1000;
                        }
                        if (Number.isFinite(maxNum)) {
                            sdOffset[dim].max = Math.round((maxNum - center) * 1000) / 1000;
                        }
                    });
                    lot.seuilsDestinationOffsetMigrated = true;
                }

                const similarityBoundsByDim = {
                    longueur: {
                        min: null,
                        max: null,
                    },
                    largeur: {
                        min: null,
                        max: null,
                    },
                    epaisseur: {
                        min: null,
                        max: null,
                    },
                    diametre: {
                        min: null,
                        max: null,
                    },
                };

                ['longueur', 'largeur', 'epaisseur', 'diametre'].forEach((dim) => {
                    const center = parseFloat(medoidDims?.[dim]);
                    const offsetMin = sdOffset?.[dim]?.min != null ? parseFloat(sdOffset[dim].min) : null;
                    const offsetMax = sdOffset?.[dim]?.max != null ? parseFloat(sdOffset[dim].max) : null;
                    const absMin = sdAbsolute?.[dim]?.min != null ? parseFloat(sdAbsolute[dim].min) : null;
                    const absMax = sdAbsolute?.[dim]?.max != null ? parseFloat(sdAbsolute[dim].max) : null;

                    if (Number.isFinite(center) && Number.isFinite(offsetMin)) {
                        similarityBoundsByDim[dim].min = center + offsetMin;
                    } else if (!lot.seuilsDestinationOffsetMigrated && Number.isFinite(absMin)) {
                        similarityBoundsByDim[dim].min = absMin;
                    }

                    if (Number.isFinite(center) && Number.isFinite(offsetMax)) {
                        similarityBoundsByDim[dim].max = center + offsetMax;
                    } else if (!lot.seuilsDestinationOffsetMigrated && Number.isFinite(absMax)) {
                        similarityBoundsByDim[dim].max = absMax;
                    }

                    if (similarityBoundsByDim[dim].min != null) {
                        sdAbsolute[dim].min = Math.round(similarityBoundsByDim[dim].min * 1000) / 1000;
                    }
                    if (similarityBoundsByDim[dim].max != null) {
                        sdAbsolute[dim].max = Math.round(similarityBoundsByDim[dim].max * 1000) / 1000;
                    }
                });

                const dimsUsedForSimilarity = activeDimsForSimilarity.filter((dim) => {
                    const b = similarityBoundsByDim[dim] || {};
                    return b.min != null || b.max != null;
                });
                const scoreDimVsBounds = (value, dim) => {
                    const x = parseFloat(value);
                    if (!Number.isFinite(x) || x <= 0) return null;

                    const bounds = similarityBoundsByDim[dim] || {};
                    let min = bounds.min;
                    let max = bounds.max;
                    if (min != null && max != null && min > max) {
                        const tmp = min;
                        min = max;
                        max = tmp;
                    }
                    if (min == null && max == null) return null;

                    let distance = 0;
                    if (min != null && x < min) distance = min - x;
                    else if (max != null && x > max) distance = x - max;

                    const ref = parseFloat(medoidDims?.[dim]);
                    let tolerance = null;
                    if (min != null && max != null) {
                        tolerance = Math.max(1, (max - min) / 2);
                    } else if (Number.isFinite(ref)) {
                        const bound = min != null ? min : max;
                        tolerance = Math.max(1, Math.abs(ref - bound));
                    }
                    if (!Number.isFinite(tolerance) || tolerance <= 0) {
                        tolerance = Math.max(1, Math.abs(x) * 0.1);
                    }

                    return Math.max(0, 1 - (distance / tolerance));
                };

                if (!medoidDims || dimsUsedForSimilarity.length === 0) {
                    lot.allotissement.tauxSimilarite = null;
                } else {
                    let sumScores = 0;
                    let sumWeights = 0;

                    const evalPieceSimilarity = (Lx, lax, ex, dx, count) => {
                        const valuesByDim = {
                            longueur: Lx,
                            largeur: lax,
                            epaisseur: ex,
                            diametre: dx,
                        };
                        dimsUsedForSimilarity.forEach((dim) => {
                            const s = scoreDimVsBounds(valuesByDim[dim], dim);
                            if (s == null) return;
                            sumScores += s * count;
                            sumWeights += count;
                        });
                    };

                    lot.pieces.forEach((p) => {
                        const pL = parseFloat(p.longueur) || 0;
                        const pLa = parseFloat(p.largeur) || 0;
                        const pE = parseFloat(p.epaisseur) || 0;
                        const pD = parseFloat(p.diametre) || 0;
                        evalPieceSimilarity(pL, pLa, pE, pD, 1);
                    });

                    defaultPieceSamples.forEach((sample) => {
                        if (sample.count > 0) {
                            evalPieceSimilarity(sample.longueur, sample.largeur, sample.epaisseur, sample.diametre, sample.count);
                        }
                    });

                    lot.allotissement.tauxSimilarite = sumWeights > 0
                        ? Math.round((sumScores / sumWeights) * 100)
                        : null;
                }

                const hasConformityBounds = activeDimsForSimilarity.some((dim) => {
                    const b = similarityBoundsByDim[dim] || {};
                    return b.min != null || b.max != null;
                });

                if (hasConformityBounds) {
                    let nbConformes = 0;
                    let nbRecoupe = 0;
                    let nbCorroyage = 0;
                    let nbRecoupeCorroyage = 0;
                    let nbBoisCourt = 0;
                    let nbRejet = 0;

                    const classifyPiece = (Lx, lax, ex, dx, count) => {
                        const bL = similarityBoundsByDim.longueur || {};
                        const vL = parseFloat(Lx);

                        // --- Compute all dimension violations ---
                        const lengthInvalid = !Number.isFinite(vL) || vL <= 0;
                        const lengthMin = !lengthInvalid && bL.min != null && vL < bL.min;
                        const lengthMax = !lengthInvalid && bL.max != null && vL > bL.max;
                        
                        let sectionMin = false;
                        let sectionMax = false;

                        // Check section violations
                        if (lotHasDiametreForSimilarity) {
                            const bD = similarityBoundsByDim.diametre || {};
                            const vD = parseFloat(dx);
                            if (bD.min != null && Number.isFinite(vD) && vD < bD.min) {
                                sectionMin = true;
                            }
                            if (bD.max != null && Number.isFinite(vD) && vD > bD.max) {
                                sectionMax = true;
                            }
                        } else {
                            const bLa = similarityBoundsByDim.largeur || {};
                            const bE = similarityBoundsByDim.epaisseur || {};
                            const vLa = parseFloat(lax);
                            const vE = parseFloat(ex);
                            if (bLa.min != null && Number.isFinite(vLa) && vLa < bLa.min) {
                                sectionMin = true;
                            }
                            if (bE.min != null && Number.isFinite(vE) && vE < bE.min) {
                                sectionMin = true;
                            }
                            if (bLa.max != null && Number.isFinite(vLa) && vLa > bLa.max) {
                                sectionMax = true;
                            }
                            if (bE.max != null && Number.isFinite(vE) && vE > bE.max) {
                                sectionMax = true;
                            }
                        }

                        // --- Classify based on all violations ---
                        // Rejet = any critical/unusable condition
                        if (lengthInvalid || sectionMin || (lengthMin && sectionMin)) {
                            nbRejet += count;
                        }
                        // Bois court = length too short, but section is OK
                        else if (lengthMin) {
                            nbBoisCourt += count;
                        }
                        // Recoupe, Corroyage, or Conforme (length-based logic only)
                        else if (!lengthMax && !sectionMax) {
                            nbConformes += count;  // All dimensions within bounds
                        } else if (lengthMax && !sectionMax) {
                            nbRecoupe += count;  // Length > max, section OK
                        } else if (!lengthMax && sectionMax) {
                            nbCorroyage += count;  // Length OK, section > max
                        } else {
                            nbRecoupeCorroyage += count;  // Both violations
                        }
                    };

                    lot.pieces.forEach((p) => {
                        const pL = parseFloat(p.longueur) || 0;
                        const pLa = parseFloat(p.largeur) || 0;
                        const pE = parseFloat(p.epaisseur) || 0;
                        const pD = parseFloat(p.diametre) || 0;
                        classifyPiece(pL, pLa, pE, pD, 1);
                    });

                    defaultPieceSamples.forEach((sample) => {
                        if (sample.count > 0) {
                            classifyPiece(sample.longueur, sample.largeur, sample.epaisseur, sample.diametre, sample.count);
                        }
                    });

                    const totalPieces = nbConformes + nbRecoupe + nbCorroyage + nbRecoupeCorroyage + nbBoisCourt + nbRejet;
                    lot.allotissement.conformiteLot = {
                        nbConformes,
                        nbRecoupe,
                        nbCorroyage,
                        nbRecoupeCorroyage,
                        nbBoisCourt,
                        nbRejet,
                        totalPieces,
                        tauxConformite: q > 0 ? Math.round(nbConformes / q * 100) : null,
                    };
                } else {
                    lot.allotissement.conformiteLot = null;
                }
            }

            // Outliers optionnels — utiles pour alerte pièce aberrante
            lot.allotissement.tukeyLongueur  = _vbTukeyFences(_cvL);
            lot.allotissement.tukeyLargeur   = _vbTukeyFences(_cvLg);
            lot.allotissement.tukeyEpaisseur = _vbTukeyFences(_cvE);
            lot.allotissement.tukeyDiametre  = _vbTukeyFences(_cvD);

            // Moyenne âge arbre et année de mise en service pour le groupe "Amortissement biologique" du lot
            const extractYear = (str) => {
                if (!str) return null;
                const m = String(str).match(/\b(\d{4})\b/);
                return m ? parseInt(m[1], 10) : null;
            };
            let sumAgeArbre = 0, countAgeArbre = 0;
            let sumServiceYear = 0, countServiceYear = 0;
            lot.pieces.forEach(p => {
                const age = parseFloat(p.ageArbre);
                if (isFinite(age) && age > 0) { sumAgeArbre += age; countAgeArbre++; }
                const yr = extractYear(p.dateMiseEnService);
                if (yr != null) { sumServiceYear += yr; countServiceYear++; }
            });
            defaultPieceSamples.forEach((sample) => {
                const dAge = parseFloat(sample.ageArbre);
                if (isFinite(dAge) && dAge > 0) {
                    sumAgeArbre += sample.count * dAge;
                    countAgeArbre += sample.count;
                }
                const dYr = extractYear(sample.dateMiseEnService);
                if (dYr != null) {
                    sumServiceYear += sample.count * dYr;
                    countServiceYear += sample.count;
                }
            });
            lot.allotissement._avgAgeArbre = countAgeArbre > 0 ? sumAgeArbre / countAgeArbre : null;
            lot.allotissement._avgServiceYear = countServiceYear > 0 ? Math.round(sumServiceYear / countServiceYear) : null;
        } else {
            lot.allotissement._avgLongueur = L;
            lot.allotissement._avgLargeur = l;
            lot.allotissement._avgEpaisseur = e;
            lot.allotissement._avgDiametre = d;
            lot.allotissement._avgAgeArbre = null;
            lot.allotissement._avgServiceYear = null;
            lot.allotissement.cvLongueur = null;
            lot.allotissement.cvLargeur = null;
            lot.allotissement.cvEpaisseur = null;
            lot.allotissement.cvDiametre = null;
            lot.allotissement.ecartTypeLongueur = null;
            lot.allotissement.ecartTypeLargeur = null;
            lot.allotissement.ecartTypeEpaisseur = null;
            lot.allotissement.ecartTypeDiametre = null;
            lot.allotissement.eiqLongueur = null;
            lot.allotissement.eiqLargeur = null;
            lot.allotissement.eiqEpaisseur = null;
            lot.allotissement.eiqDiametre = null;
            lot.allotissement.eiqAbsLongueur = null;
            lot.allotissement.eiqAbsLargeur = null;
            lot.allotissement.eiqAbsEpaisseur = null;
            lot.allotissement.eiqAbsDiametre = null;
            lot.allotissement.tauxSimilarite = null;
            lot.allotissement.medoideKey = null;
            lot.allotissement.medoideLabel = null;
            lot.allotissement.medoideScore = null;
            lot.allotissement.medoideDims = null;
            lot.allotissement.madLongueur = null;
            lot.allotissement.madLargeur = null;
            lot.allotissement.madEpaisseur = null;
            lot.allotissement.madDiametre = null;
            lot.allotissement.seuilSuggest = null;
            lot.allotissement.conformiteLot = null;
            lot.allotissement.tukeyLongueur = null;
            lot.allotissement.tukeyLargeur = null;
            lot.allotissement.tukeyEpaisseur = null;
            lot.allotissement.tukeyDiametre = null;
        }
    }

    recalculatePiece(piece, lot) {
        const L = parseFloat(piece.longueur) || 0;
        const l = parseFloat(piece.largeur) || 0;
        const e = parseFloat(piece.epaisseur) || 0;
        const d = parseFloat(piece.diametre) || 0;
        const pm = parseFloat(piece.prixMarche || lot.allotissement.prixMarche) || 0;
        const priceUnitRaw = ((piece.prixUnite || lot.allotissement.prixUnite || 'm3') + '').toLowerCase();
        const priceUnit = (priceUnitRaw === 'ml' || priceUnitRaw === 'm2' || priceUnitRaw === 'm3') ? priceUnitRaw : 'm3';
        const integrityFactor = this.getLotIntegrityPriceFactor(lot);

        piece.surfacePiece = (L * l) / 1000000;
        if (d > 0) {
            const rayon = d / 2;
            piece.volumePiece = (Math.PI * rayon * rayon * L) / 1000000000;
        } else {
            piece.volumePiece = (L * l * e) / 1000000000;
        }

        const lineairePiece = L / 1000;
        const pricingBase =
            priceUnit === 'ml' ? lineairePiece :
            priceUnit === 'm2' ? piece.surfacePiece :
            piece.volumePiece;
        piece.prixPiece = pricingBase * pm;
        piece.prixPieceAjusteIntegrite = piece.prixPiece * integrityFactor;

        // Carbone pour cette pièce
        const rho = parseFloat(piece.masseVolumique || lot.allotissement.masseVolumique) || 0;
        piece.massePiece = rho * piece.volumePiece;
        const carbonFractionFixed = 0.5;
        const woodPct = parseFloat(piece.bois !== '' ? piece.bois : lot.allotissement.bois);
        const mc = parseFloat(piece.humidite !== '' ? piece.humidite : lot.allotissement.humidite);
        const safeWoodPct = Number.isFinite(woodPct) ? woodPct : 100;
        const safeMc = Number.isFinite(mc) ? mc : 12;
        const moistureDenominator = 1 + (safeMc / 100);
        const pco2Kg = moistureDenominator > 0
            ? (44 / 12) * carbonFractionFixed * rho * piece.volumePiece * (safeWoodPct / 100) / moistureDenominator
            : 0;
        piece.carboneBiogeniqueEstime = String(Math.max(0, Math.round(pco2Kg)));
    }

    setCurrentLotIndex(index) {
        this.currentLotIndex = index;
        this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
        this.render();
    }

    openDeleteLotModal(index) {
    this.pendingDeleteLotIndex = index;

    const backdrop = document.getElementById('deleteLotConfirmBackdrop');
    const message = document.getElementById('deleteLotConfirmMessage');

    if (backdrop) {
        if (message) {
            message.textContent = `Voulez-vous vraiment supprimer le lot ${index + 1} ?`;
        }
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

    closeDeleteLotModal() {
        const backdrop = document.getElementById('deleteLotConfirmBackdrop');
        if (backdrop) {
            backdrop.classList.add('hidden');
            backdrop.setAttribute('aria-hidden', 'true');
        }
        this.pendingDeleteLotIndex = null;
    }

    confirmDeleteLot() {
        if (this.pendingDeleteLotIndex === null) return;
        const index = this.pendingDeleteLotIndex;
        this.pendingDeleteLotIndex = null;

        this.deleteLot(index);
        this.closeDeleteLotModal();
    }

    closeResetConfirmModal() {
        const backdrop = document.getElementById('resetConfirmBackdrop');
        if (backdrop) {
            backdrop.classList.add('hidden');
            backdrop.setAttribute('aria-hidden', 'true');
        }
        this.pendingResetConfirmAction = null;
    }

    confirmResetAction() {
        const action = this.pendingResetConfirmAction;
        this.pendingResetConfirmAction = null;
        this.closeResetConfirmModal();
        if (typeof action === 'function') {
            action();
        }
    }

    closeCreatePieceDeductionModal() {
        const backdrop = document.getElementById('createPieceDeductionBackdrop');
        if (backdrop) {
            backdrop.classList.add('hidden');
            backdrop.setAttribute('aria-hidden', 'true');
        }
        this.pendingPieceCreationDecision = null;
        this.pendingPieceCreationModalOptions = null;
    }

    getCreatePieceDuplicationMode() {
        const defaultModeRadio = document.getElementById('createPieceDuplicationModeDefault');
        return defaultModeRadio && defaultModeRadio.checked ? 'default' : 'detailed';
    }

    updateCreatePieceDeductionModalByMode() {
        const messageEl = document.getElementById('createPieceDeductionMessage');
        const yesBtn = document.getElementById('btnCreatePieceDeductionYes');
        const noBtn = document.getElementById('btnCreatePieceDeductionNo');
        const mode = this.getCreatePieceDuplicationMode();

        if (messageEl) {
            const detailedMessage = messageEl.dataset.detailedMessage || '';
            const defaultMessage = messageEl.dataset.defaultMessage || detailedMessage;
            messageEl.textContent = mode === 'default' ? defaultMessage : detailedMessage;
        }
        if (yesBtn) {
            const detailedLabel = yesBtn.dataset.detailedLabel || yesBtn.textContent;
            const defaultLabel = yesBtn.dataset.defaultLabel || detailedLabel;
            yesBtn.textContent = mode === 'default' ? defaultLabel : detailedLabel;
        }
        if (noBtn) {
            const detailedLabel = noBtn.dataset.detailedLabel || noBtn.textContent;
            const defaultLabel = noBtn.dataset.defaultLabel || detailedLabel;
            noBtn.textContent = mode === 'default' ? defaultLabel : detailedLabel;
        }
    }

    confirmCreatePieceDeductionAction(shouldDeductDefault) {
        const action = this.pendingPieceCreationDecision;
        const modalOptions = this.pendingPieceCreationModalOptions || {};
        const mode = this.getCreatePieceDuplicationMode();
        this.closeCreatePieceDeductionModal();
        if (typeof action === 'function') {
            if (modalOptions.showCreationModeChoice && mode === 'default') {
                if (!shouldDeductDefault) return;
                action({ creationMode: 'default', shouldDeductDefault: false });
                return;
            }
            action({ creationMode: 'detailed', shouldDeductDefault: !!shouldDeductDefault });
        }
    }

    // ─── Modales prix lot direct ───

    openPrixLotDirectConfirmModal(onConfirm) {
        this._pendingPrixLotDirectConfirm = onConfirm;
        const backdrop = document.getElementById('prixLotDirectConfirmBackdrop');
        if (backdrop) { backdrop.classList.remove('hidden'); backdrop.setAttribute('aria-hidden', 'false'); }
    }

    closePrixLotDirectConfirmModal() {
        const backdrop = document.getElementById('prixLotDirectConfirmBackdrop');
        if (backdrop) { backdrop.classList.add('hidden'); backdrop.setAttribute('aria-hidden', 'true'); }
        this._pendingPrixLotDirectConfirm = null;
    }

    openPrixLotDirectActivateModal(onConfirm) {
        this._pendingPrixLotDirectActivate = onConfirm;
        const backdrop = document.getElementById('prixLotDirectActivateBackdrop');
        if (backdrop) { backdrop.classList.remove('hidden'); backdrop.setAttribute('aria-hidden', 'false'); }
    }

    closePrixLotDirectActivateModal() {
        const backdrop = document.getElementById('prixLotDirectActivateBackdrop');
        if (backdrop) { backdrop.classList.add('hidden'); backdrop.setAttribute('aria-hidden', 'true'); }
        this._pendingPrixLotDirectActivate = null;
    }

    openPrixPieceMissingModal() {
        const backdrop = document.getElementById('prixPieceMissingBackdrop');
        if (backdrop) { backdrop.classList.remove('hidden'); backdrop.setAttribute('aria-hidden', 'false'); }
    }

    closePrixPieceMissingModal() {
        const backdrop = document.getElementById('prixPieceMissingBackdrop');
        if (backdrop) { backdrop.classList.add('hidden'); backdrop.setAttribute('aria-hidden', 'true'); }
    }

    getNotationResetLabel(row) {
        if (!row) return '';
        const criterionLabel = row.querySelector(':is(.bio-label-box, .mech-label-box, .usage-label-box, .denat-label-box, .debit-label-box, .geo-label-box, .essence-label-box, .ancien-label-box, .traces-label-box, .provenance-label-box)');
        const text = criterionLabel ? (criterionLabel.textContent || '').replace(/\s+/g, ' ').trim() : '';
        return text;
    }

    refreshNotationRowSlider(row) {
        if (!row) return;
        const slider = row.querySelector('.bio-slider, .mech-slider, .usage-slider, .denat-slider, .debit-slider, .geo-slider, .essence-slider, .ancien-slider, .traces-slider, .provenance-slider');
        if (slider && typeof slider.__refreshActiveSliderLabel === 'function') {
            requestAnimationFrame(() => slider.__refreshActiveSliderLabel());
        }
    }

    setupNotationResetConfirmations() {
        const selector = [
            '.bio-reset-btn',
            '.mech-reset-btn',
            '.usage-reset-btn',
            '.denat-reset-btn',
            '.debit-reset-btn',
            '.geo-reset-btn',
            '.essence-reset-btn',
            '.ancien-reset-btn',
            '.traces-reset-btn',
            '.provenance-reset-btn'
        ].join(', ');

        document.querySelectorAll(selector).forEach((btn) => {
            const originalHandler = btn.onclick;
            if (typeof originalHandler !== 'function') return;
            if (btn.__notationResetOriginalHandler === originalHandler) return;

            btn.__notationResetOriginalHandler = originalHandler;
            btn.onclick = (event) => {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }

                const row = btn.closest('.bio-row, .mech-row, .usage-row, .denat-row, .debit-row, .geo-row, .essence-row, .ancien-row, .traces-row, .provenance-row');
                const criterionLabel = this.getNotationResetLabel(row);
                const message = criterionLabel
                    ? `Voulez-vous vraiment réinitialiser le critere \"${criterionLabel}\" ?`
                    : 'Voulez-vous vraiment réinitialiser ce critere ?';

                this.openResetConfirmModal({
                    title: 'Réinitialiser le critere',
                    message,
                    confirmLabel: 'Oui, réinitialiser',
                    onConfirm: () => {
                        btn.__notationResetOriginalHandler();
                        this.refreshNotationRowSlider(row);
                    }
                });
            };
        });
    }


deleteLot(index) {
    if (!this.data.lots || this.data.lots.length === 0) return;

    this.data.lots.splice(index, 1);

    if (this.data.lots.length === 0) {
        const lot = this.createEmptyLot(0);
        this.data.lots.push(lot);
        this.currentLotIndex = 0;
        this.setDetailLotActiveCardKey(lot, 'default', { persist: false });
    } else if (this.currentLotIndex >= this.data.lots.length) {
        this.currentLotIndex = this.data.lots.length - 1;
    }

    this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
    this.render();
}

    setupNotationResetIcons() {
        const resetSelector = [
            '.bio-reset-btn',
            '.mech-reset-btn',
            '.usage-reset-btn',
            '.denat-reset-btn',
            '.debit-reset-btn',
            '.geo-reset-btn',
            '.essence-reset-btn',
            '.ancien-reset-btn',
            '.traces-reset-btn',
            '.provenance-reset-btn',
            '.inspection-reset-btn'
        ].join(', ');

        const iconMarkup = `
  <svg
    aria-hidden="true"
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <polyline points="3 3 3 8 8 8" />
  </svg>
  <span class="sr-only">Réinitialiser</span>
`;

        document.querySelectorAll(resetSelector).forEach((btn) => {
            if (btn.dataset.iconifiedReset === '1') return;
            btn.classList.add('btn-reset');
            btn.setAttribute('aria-label', 'Réinitialiser le formulaire');
            btn.setAttribute('title', 'Réinitialiser');
            btn.innerHTML = iconMarkup;
            btn.dataset.iconifiedReset = '1';
        });
    }

        setupInspectionIgnoreIcons() {
                const ignoreSelector = '.inspection-ignore-btn';
                const iconMarkup = `
    <svg
        aria-hidden="true"
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <circle cx="12" cy="12" r="8" />
        <path d="M8.5 15.5 15.5 8.5" />
    </svg>
    <span class="sr-only">Ignorer</span>
`;

                document.querySelectorAll(ignoreSelector).forEach((btn) => {
                        if (btn.dataset.iconifiedIgnore === '1') return;
                        btn.classList.add('btn-ignore');
                        btn.setAttribute('aria-label', 'Ignorer ce critere');
                        btn.setAttribute('title', 'Ignorer');
                        btn.innerHTML = iconMarkup;
                        btn.dataset.iconifiedIgnore = '1';
                });
        }

    bindEvents() {
        this.setupNotationResetIcons();
                this.setupInspectionIgnoreIcons();

        // Bouton mode jour / nuit
        const btnThemeToggle = document.getElementById('btnThemeToggle');
        const syncThemeToggleLabel = () => {
            if (!btnThemeToggle) return;
            btnThemeToggle.setAttribute('title', t('theme.toggleTitle'));
            const modeLabel = document.getElementById('btnThemeToggleLabel');
            const isDay = document.body.classList.contains('day-mode');
            const labelText = isDay ? t('theme.modeNight') : t('theme.modeDay');
            if (modeLabel) modeLabel.textContent = labelText;
            else btnThemeToggle.textContent = labelText;
        };
        if (btnThemeToggle) {
            const savedTheme = localStorage.getItem('valoboisTheme');
            if (savedTheme !== 'night') {
                document.body.classList.add('day-mode');
            }
            syncThemeToggleLabel();
            btnThemeToggle.addEventListener('click', () => {
                const isDay = document.body.classList.toggle('day-mode');
                syncThemeToggleLabel();
                localStorage.setItem('valoboisTheme', isDay ? 'day' : 'night');
            });
            window.addEventListener('valobois:langchange', syncThemeToggleLabel);
        }

        window.addEventListener('valobois:langchange', () => {
            this.renderScatterDims();
        });

        // Toggle À propos
        const aproposBtn = document.getElementById('btnAproposToggle');
        const aproposContent = document.getElementById('aproposContent');
        if (aproposBtn && aproposContent) {
            aproposBtn.addEventListener('click', () => {
                const isHidden = aproposContent.hasAttribute('hidden');
                if (!this.data.ui) this.data.ui = this.getDefaultUi();
                if (!this.data.ui.collapsibles) this.data.ui.collapsibles = this.getDefaultUi().collapsibles;
                if (isHidden) {
                    aproposContent.removeAttribute('hidden');
                    aproposBtn.setAttribute('aria-expanded', 'true');
                    this.data.ui.collapsibles.apropos = true;
                } else {
                    aproposContent.setAttribute('hidden', '');
                    aproposBtn.setAttribute('aria-expanded', 'false');
                    this.data.ui.collapsibles.apropos = false;
                }
                this.saveData();
            });
        }

        const accueilCollapsibles = document.querySelectorAll('[data-ui-collapsible]');
        accueilCollapsibles.forEach((detailsEl) => {
            detailsEl.addEventListener('toggle', () => {
                const key = detailsEl.getAttribute('data-ui-collapsible');
                if (!key) return;
                if (!this.data.ui) this.data.ui = this.getDefaultUi();
                if (!this.data.ui.collapsibles) this.data.ui.collapsibles = this.getDefaultUi().collapsibles;
                this.data.ui.collapsibles[key] = detailsEl.open;
                this.saveData();
            });
        });

        // Persister aussi les details recrees dynamiquement (ex: panneau seuils-dest du lot)
        document.addEventListener('toggle', (e) => {
            const detailsEl = e.target;
            if (!(detailsEl instanceof HTMLDetailsElement)) return;
            const key = detailsEl.getAttribute('data-ui-collapsible');
            if (!key) return;
            if (!this.data.ui) this.data.ui = this.getDefaultUi();
            if (!this.data.ui.collapsibles) this.data.ui.collapsibles = this.getDefaultUi().collapsibles;
            this.data.ui.collapsibles[key] = detailsEl.open;
            this.saveData();
        }, true);

        const operationReferenceAlertBtn = document.querySelector('[data-operation-reference-alert-btn]');
        if (operationReferenceAlertBtn) {
            operationReferenceAlertBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (operationReferenceAlertBtn.dataset.alertOperationReference !== 'true') return;
                const backdrop = document.getElementById('alertOperationReferenceModalBackdrop');
                if (backdrop) {
                    backdrop.classList.remove('hidden');
                    backdrop.setAttribute('aria-hidden', 'false');
                }
            });
        }

        const diagnostiqueurAlertBtn = document.querySelector('[data-diagnostiqueur-alert-btn]');
        if (diagnostiqueurAlertBtn) {
            diagnostiqueurAlertBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (diagnostiqueurAlertBtn.dataset.alertDiagnostiqueur !== 'true') return;
                const backdrop = document.getElementById('alertDiagnostiqueurModalBackdrop');
                if (backdrop) {
                    backdrop.classList.remove('hidden');
                    backdrop.setAttribute('aria-hidden', 'false');
                }
            });
        }

        const contactsAlertBtn = document.querySelector('[data-contacts-alert-btn]');
        if (contactsAlertBtn) {
            contactsAlertBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (contactsAlertBtn.dataset.alertContacts !== 'true') return;
                const backdrop = document.getElementById('alertContactsModalBackdrop');
                if (backdrop) {
                    backdrop.classList.remove('hidden');
                    backdrop.setAttribute('aria-hidden', 'false');
                }
            });
        }

        const contexteTechniqueAlertBtn = document.querySelector('[data-contexte-technique-alert-btn]');
        if (contexteTechniqueAlertBtn) {
            contexteTechniqueAlertBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (contexteTechniqueAlertBtn.dataset.alertContexteTechnique !== 'true') return;
                const backdrop = document.getElementById('alertContexteTechniqueModalBackdrop');
                if (backdrop) {
                    backdrop.classList.remove('hidden');
                    backdrop.setAttribute('aria-hidden', 'false');
                }
            });
        }

        // Seuils de destination
        document.addEventListener('change', e => {
            const input = e.target.closest('[data-dest-seuil-dim]');
            if (!input) return;
            const lot = this.getCurrentLot();
            if (!lot?.seuilsDestination || !lot?.seuilsDestinationOffset) return;
            const dim = input.dataset.destSeuilDim;
            const bound = input.dataset.destSeuilBound;
            const val = input.value.trim() === '' ? null : parseFloat(input.value);
            if (!lot.seuilsDestination?.[dim] || !lot.seuilsDestinationOffset?.[dim]) return;
            lot.seuilsDestination[dim][bound] = val;

            const center = parseFloat(lot.allotissement?.medoideDims?.[dim]);
            if (Number.isFinite(center) && center > 0 && val != null && Number.isFinite(val)) {
                lot.seuilsDestinationOffset[dim][bound] = Math.round((val - center) * 1000) / 1000;
                lot.seuilsDestinationOffsetMigrated = true;
            } else if (val == null) {
                lot.seuilsDestinationOffset[dim][bound] = null;
            } else {
                lot.seuilsDestinationOffsetMigrated = false;
            }
            this.recalculateLotAllotissement(lot);
            this.saveData();
            this.renderAllotissement();
        });

        // Champs méta
        const metainputs = document.querySelectorAll('[data-meta-field]');
        metainputs.forEach((el) => {
            const handleMetaUpdate = () => {
                const field = el.getAttribute('data-meta-field');
                if (!field) return;
                this.data.meta = this.getDefaultMeta(this.data.meta || {});
                
                // Special handling for statute slider
                if (field === 'statutEtude' && el.type === 'range') {
                    const sliderIndex = parseInt(el.value, 10);
                    this.data.meta[field] = this.getStudyStatusValues()[sliderIndex] || '';
                    this.renderStudyStatusHelpByIndex(sliderIndex);
                    
                    // Update active label styling
                    const sliderWrapper = el.closest('.bio-slider-wrapper');
                    if (sliderWrapper) {
                        const labels = sliderWrapper.querySelectorAll('.bio-slider-label');
                        labels.forEach((label) => {
                            label.classList.remove('bio-slider-label--active');
                            if (label.getAttribute('data-index') === el.value) {
                                label.classList.add('bio-slider-label--active');
                            }
                        });
                    }
                } else {
                    this.data.meta[field] = el.value;
                }
                
                this.renderAccueilMeta();
                this.saveData();
                const activeLot = this.getCurrentLot(); // On récupère le lot actuel
                if (activeLot) {
                    this.computeOrientation(activeLot);
                }
            };

            el.addEventListener('input', handleMetaUpdate);
            el.addEventListener('change', handleMetaUpdate);
        });

        // Boutons toggle diagnostics (Oui / Non / Inconnu)
        document.querySelectorAll('button[data-meta-toggle-field]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const field = btn.getAttribute('data-meta-toggle-field');
                const value = btn.getAttribute('data-meta-toggle-value');
                if (!field || !value) return;
                this.data.meta = this.getDefaultMeta(this.data.meta || {});
                this.data.meta[field] = value;
                this.syncMetaToggleGroup(field);
                this.saveData();
            });
        });

        // Premier clic sur slider en état neutre: sélectionne le niveau cliqué
        const neutralNotationSliders = document.querySelectorAll('.bio-slider, .mech-slider, .usage-slider, .denat-slider, .debit-slider, .geo-slider, .essence-slider, .ancien-slider, .traces-slider, .provenance-slider');
        neutralNotationSliders.forEach((slider) => {
            const commitNeutralSliderSelection = (event) => {
                const row = slider.closest('.bio-row, .mech-row, .usage-row, .denat-row, .debit-row, .geo-row, .essence-row, .ancien-row, .traces-row, .provenance-row');
                if (!row || !/--disabled\b/.test(row.className)) return;

                const level = this.getSliderLevelFromEvent(slider, event, 3);
                if (level == null) return;

                slider.value = String(level);
                slider.dispatchEvent(new Event('input'));
            };

            slider.addEventListener('click', commitNeutralSliderSelection);
            slider.addEventListener('pointerup', commitNeutralSliderSelection);
            slider.addEventListener('touchend', commitNeutralSliderSelection);
        });

        // Appliquer la logique visuelle du slider "Statut de l'étude" à tous les sliders de notation/inspection
        (function enhanceAllSliders() {
            const sliderWrapperSelectors = [
                '.bio-slider-wrapper',
                '.mech-slider-wrapper',
                '.usage-slider-wrapper',
                '.denat-slider-wrapper',
                '.debit-slider-wrapper',
                '.geo-slider-wrapper',
                '.essence-slider-wrapper',
                '.ancien-slider-wrapper',
                '.traces-slider-wrapper',
                '.provenance-slider-wrapper'
            ];

            // Pour chaque wrapper de slider, si l'affichage visuel (ligne + points) n'existe pas,
            // on le recrée en s'appuyant sur la structure CSS déjà prévue pour le statut.
            document.querySelectorAll(sliderWrapperSelectors.join(',')).forEach((wrapper) => {
                // Ne pas dupliquer si un affichage est déjà présent (statut, inspection, etc.)
                if (wrapper.querySelector('.bio-slider-display--statut, .inspection-slider-display')) return;
                const scale = wrapper.querySelector('.bio-slider-scale, .mech-slider-scale, .usage-slider-scale, .denat-slider-scale, .debit-slider-scale, .geo-slider-scale, .essence-slider-scale, .ancien-slider-scale, .traces-slider-scale, .provenance-slider-scale, .inspection-slider-scale');
                const slider = wrapper.querySelector('input[type="range"]');
                if (!scale || !slider) return;

                const display = document.createElement('div');
                display.className = 'bio-slider-display--statut';
                display.setAttribute('aria-hidden', 'true');

                const line = document.createElement('div');
                line.className = 'bio-slider-display-line--statut';

                // Aligne les crans d'abord sur les steps du slider, sinon sur les labels
                const labels = Array.from(scale.children);
                const min = Number(slider.min);
                const max = Number(slider.max);
                const step = Number(slider.step || 1);
                const stepCount = Number.isFinite(min) && Number.isFinite(max) && Number.isFinite(step) && step > 0
                    ? Math.round((max - min) / step) + 1
                    : NaN;
                const dotCount = Math.max(2, Number.isFinite(stepCount) ? stepCount : labels.length);
                for (let i = 0; i < dotCount; i++) {
                    const dot = document.createElement('span');
                    dot.className = 'bio-slider-dot--statut';
                    line.appendChild(dot);
                }

                display.appendChild(line);
                // Insère avant le slider afin que le DOM corresponde à l'implémentation du statut
                wrapper.insertBefore(display, slider);

                // Applique un style de piste transparente pour éviter un double track visuel
                slider.classList.add('slider--statut-visual');
            });

            // Synchroniser l'état "actif" des labels quand la valeur du slider change
            const fallbackNotesBySliderKey = {
                purge: [-3, 1, 3],
                expansion: [-10, -3, 3],
                integriteBio: [3, 1, -10],
                exposition: [-3, 1, 3],
                confianceBio: [3, 2, 1],

                purgeMech: [-3, 1, 3],
                feuMech: [3, 2, 1],
                integriteMech: [3, -3, -10],
                expositionMech: [-3, 1, 3],
                confianceMech: [3, 2, 1],

                confianceUsage: [3, 2, 1],
                durabiliteUsage: [3, 2, 1],
                classementUsage: [3, 2, 1],
                humiditeUsage: [-3, 3, 1],
                aspectUsage: [3, 2, 1],

                depollutionDenat: [-3, 1, 3],
                contaminationDenat: [-10, 1, 3],
                durabiliteConfDenat: [1, 2, 3],
                confianceDenat: [3, 2, 1],
                naturaliteDenat: [3, 2, 1],

                regulariteDebit: [3, 2, 1],
                volumetrieDebit: [3, 2, 1],
                stabiliteDebit: [3, 2, 1],
                artisanaliteDebit: [3, 2, 1],
                rusticiteDebit: [3, 2, 1],

                adaptabiliteGeo: [3, 2, 1],
                massiviteGeo: [3, 2, 1],
                deformationGeo: [-3, 1, 3],
                industrialiteGeo: [3, 2, 1],
                inclusiviteGeo: [3, 2, 1],

                confianceEssence: [3, 2, 1],
                rareteEcoEssence: [3, 2, 1],
                masseVolEssence: [3, 2, 1],
                rareteHistEssence: [3, 2, 1],
                singulariteEssence: [3, 2, 1],

                confianceAncien: [3, 2, 1],
                amortissementAncien: [3, 1, -3],
                vieillissementAncien: [-3, 1, 3],
                microhistoireAncien: [3, 2, 1],
                demontabiliteAncien: [3, 2, -3],

                confianceTraces: [3, 2, 1],
                etiquetageTraces: [3, 2, 1],
                alterationTraces: [-10, 1, 3],
                documentationTraces: [3, 1, -3],
                singularitesTraces: [3, 2, 1],

                confianceProv: [3, 2, 1],
                transportProv: [-3, 1, 3],
                reputationProv: [3, 2, 1],
                macroProv: [3, 2, 1],
                territorialiteProv: [3, 2, 1],

                visibilite: [1, 2, 3],
                instrumentation: [1, 2, 3],
                integrite: ['0,7', '0,3', '0,1']
            };

            const placeholders = new Set(['', '...', '…', 'Coeff. …']);
            const formatFallbackNote = (value) => {
                if (value == null) return '';
                if (typeof value === 'number') return (value > 0 ? '+' : '') + String(value);
                return String(value);
            };

            const allSliders = document.querySelectorAll('.bio-slider, .mech-slider, .usage-slider, .denat-slider, .debit-slider, .geo-slider, .essence-slider, .ancien-slider, .traces-slider, .provenance-slider, .inspection-slider');

            // ── Fix mobile : pendant un scroll vertical, conserver la valeur de départ
            //    du slider pour éviter les modifications accidentelles sans bloquer le scroll ──
            (function setupSliderTouchGuard() {
                const sliderSelector = [
                    '.bio-slider', '.mech-slider', '.usage-slider', '.denat-slider',
                    '.debit-slider', '.geo-slider', '.essence-slider', '.ancien-slider',
                    '.traces-slider', '.provenance-slider', '.inspection-slider'
                ].join(', ');

                document.querySelectorAll(sliderSelector).forEach(slider => {
                    let _touchStartX = 0;
                    let _touchStartY = 0;
                    let _touchStartValue = slider.value;
                    let _directionLocked = false;
                    let _isVerticalGesture = false;

                    const resetTouchState = () => {
                        _directionLocked = false;
                        _isVerticalGesture = false;
                    };

                    slider.addEventListener('touchstart', (e) => {
                        if (!e.touches || !e.touches[0]) return;
                        _touchStartX = e.touches[0].clientX;
                        _touchStartY = e.touches[0].clientY;
                        _touchStartValue = slider.value;
                        resetTouchState();
                    }, { passive: true });

                    slider.addEventListener('touchmove', (e) => {
                        if (!e.touches || !e.touches[0]) return;
                        const deltaX = Math.abs(e.touches[0].clientX - _touchStartX);
                        const deltaY = Math.abs(e.touches[0].clientY - _touchStartY);

                        // Verrouiller la direction au premier mouvement significatif
                        if (!_directionLocked && (deltaX > 8 || deltaY > 8)) {
                            _isVerticalGesture = deltaY > (deltaX * 1.2);
                            _directionLocked = true;
                        }

                        // Si geste vertical : laisser défiler la page mais figer la valeur du slider
                        if (_directionLocked && _isVerticalGesture && slider.value !== _touchStartValue) {
                            slider.value = _touchStartValue;
                            slider.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }, { passive: true });

                    slider.addEventListener('touchend', resetTouchState, { passive: true });
                    slider.addEventListener('touchcancel', resetTouchState, { passive: true });
                });
            })();

            const refreshAllSliderLabels = () => {
                document.querySelectorAll('.bio-slider, .mech-slider, .usage-slider, .denat-slider, .debit-slider, .geo-slider, .essence-slider, .ancien-slider, .traces-slider, .provenance-slider, .inspection-slider').forEach((sliderEl) => {
                    if (typeof sliderEl.__refreshActiveSliderLabel === 'function') {
                        sliderEl.__refreshActiveSliderLabel();
                    }
                });
            };

            allSliders.forEach((s) => {
                const updateActiveLabel = () => {
                    const wrapper = s.closest(sliderWrapperSelectors.join(',')) || s.closest('.inspection-slider-wrapper');
                    if (!wrapper) return;
                    const scale = wrapper.querySelector('.bio-slider-scale, .mech-slider-scale, .usage-slider-scale, .denat-slider-scale, .debit-slider-scale, .geo-slider-scale, .essence-slider-scale, .ancien-slider-scale, .traces-slider-scale, .provenance-slider-scale, .inspection-slider-scale');
                    if (!scale) return;
                    const labels = Array.from(scale.children);
                    const row = s.closest('.inspection-row, .bio-row, .mech-row, .usage-row, .denat-row, .debit-row, .geo-row, .essence-row, .ancien-row, .traces-row, .provenance-row');
                    const key = s.getAttribute('data-slider');
                    labels.forEach((l) => {
                        l.classList.remove('bio-slider-label--active', 'slider-label--active');
                        l.removeAttribute('data-note');
                    });

                    // Différents sliders utilisent des gammes distinctes :
                    // - notation standard : valeurs 1..3 (3 étapes)
                    // - statut : 0..4 (5 étapes)
                    // - fallback : clamp sur le nombre de labels
                    const val = Number(s.value);
                    let target;
                    if (labels.length === 3) {
                        target = Math.max(0, Math.min(2, val - 1));
                    } else {
                        target = Math.max(0, Math.min(labels.length - 1, val));
                    }

                    const fallbackByStep = key ? fallbackNotesBySliderKey[key] : null;
                    if (Array.isArray(fallbackByStep)) {
                        labels.forEach((labelEl, idx) => {
                            const fallbackNote = formatFallbackNote(fallbackByStep[idx]);
                            if (fallbackNote && !placeholders.has(fallbackNote)) {
                                labelEl.setAttribute('data-note', fallbackNote);
                            }
                        });
                    }

                    if (labels[target]) {
                        labels[target].classList.add('slider-label--active');
                        labels[target].classList.add('bio-slider-label--active');

                        let noteText = '';

                        if (row && key) {
                            const noteBox = row.querySelector(`[data-intensity="${key}"]`);
                            if (noteBox) {
                                noteText = (noteBox.textContent || '').trim();
                            }

                            // Si la ligne est grisée/reset (note box = ...), on calcule une note fallback
                            // à partir du critère et de la position active du slider.
                            if (placeholders.has(noteText)) {
                                if (Array.isArray(fallbackByStep) && fallbackByStep[target] != null) {
                                    noteText = formatFallbackNote(fallbackByStep[target]);
                                }
                            }
                        }

                        if (noteText && !placeholders.has(noteText)) {
                            labels[target].setAttribute('data-note', noteText);
                        }
                    }
                };

                s.__refreshActiveSliderLabel = updateActiveLabel;

                const scheduleUpdateActiveLabel = () => {
                    requestAnimationFrame(updateActiveLabel);
                };

                s.addEventListener('input', scheduleUpdateActiveLabel);
                s.addEventListener('change', scheduleUpdateActiveLabel);
                // initialisation au chargement
                updateActiveLabel();
            });

            // Après reset/ignorer, les classes disabled changent sans événement slider.
            // On force alors une resynchronisation visuelle au frame suivant.
            document.addEventListener('click', (event) => {
                const targetBtn = event.target && event.target.closest
                    ? event.target.closest('.inspection-ignore-btn, .inspection-reset-btn, .bio-reset-btn, .mech-reset-btn, .usage-reset-btn, .denat-reset-btn, .debit-reset-btn, .geo-reset-btn, .essence-reset-btn, .ancien-reset-btn, .traces-reset-btn, .provenance-reset-btn')
                    : null;
                if (!targetBtn) return;
                requestAnimationFrame(refreshAllSliderLabels);
            });
        })();

        // Modale confirmation suppression de lot
        const deleteLotBackdrop = document.getElementById('deleteLotConfirmBackdrop');
        const btnCloseDeleteLotConfirm = document.getElementById('btnCloseDeleteLotConfirm');
        const btnCancelDeleteLot = document.getElementById('btnCancelDeleteLot');
        const btnConfirmDeleteLot = document.getElementById('btnConfirmDeleteLot');
        if (deleteLotBackdrop && btnCloseDeleteLotConfirm && btnCancelDeleteLot && btnConfirmDeleteLot) {
            btnCloseDeleteLotConfirm.addEventListener('click', () => this.closeDeleteLotModal());
            btnCancelDeleteLot.addEventListener('click', () => this.closeDeleteLotModal());
            btnConfirmDeleteLot.addEventListener('click', () => this.confirmDeleteLot());

            deleteLotBackdrop.addEventListener('click', (e) => {
                if (e.target === deleteLotBackdrop) {
                    this.closeDeleteLotModal();
                }
            });
        }

        // Modale alerte pièces non détaillées
        const alertPiecesBackdrop = document.getElementById('alertPiecesModalBackdrop');
        const btnCloseAlertPieces = document.getElementById('btnCloseAlertPiecesModal');
        const btnOkAlertPieces = document.getElementById('btnOkAlertPiecesModal');
        const closeAlertPiecesModal = () => {
            if (alertPiecesBackdrop) { alertPiecesBackdrop.classList.add('hidden'); alertPiecesBackdrop.setAttribute('aria-hidden', 'true'); }
        };
        if (alertPiecesBackdrop) {
            if (btnCloseAlertPieces) btnCloseAlertPieces.addEventListener('click', closeAlertPiecesModal);
            if (btnOkAlertPieces) btnOkAlertPieces.addEventListener('click', closeAlertPiecesModal);
            alertPiecesBackdrop.addEventListener('click', (e) => {
                if (e.target === alertPiecesBackdrop) closeAlertPiecesModal();
            });
        }

        // Modale alerte destination du lot
        const alertDestinationBackdrop = document.getElementById('alertDestinationModalBackdrop');
        const btnCloseAlertDestination = document.getElementById('btnCloseAlertDestinationModal');
        const btnOkAlertDestination = document.getElementById('btnOkAlertDestinationModal');
        const closeAlertDestinationModal = () => {
            if (alertDestinationBackdrop) {
                alertDestinationBackdrop.classList.add('hidden');
                alertDestinationBackdrop.setAttribute('aria-hidden', 'true');
            }
        };
        if (alertDestinationBackdrop) {
            if (btnCloseAlertDestination) btnCloseAlertDestination.addEventListener('click', closeAlertDestinationModal);
            if (btnOkAlertDestination) btnOkAlertDestination.addEventListener('click', closeAlertDestinationModal);
            alertDestinationBackdrop.addEventListener('click', (e) => {
                if (e.target === alertDestinationBackdrop) closeAlertDestinationModal();
            });
        }

        // Modale alerte contexte technique
        const alertContexteTechniqueBackdrop = document.getElementById('alertContexteTechniqueModalBackdrop');
        const btnCloseAlertContexteTechnique = document.getElementById('btnCloseAlertContexteTechniqueModal');
        const btnOkAlertContexteTechnique = document.getElementById('btnOkAlertContexteTechniqueModal');
        const closeAlertContexteTechniqueModal = () => {
            if (alertContexteTechniqueBackdrop) {
                alertContexteTechniqueBackdrop.classList.add('hidden');
                alertContexteTechniqueBackdrop.setAttribute('aria-hidden', 'true');
            }
        };
        if (alertContexteTechniqueBackdrop) {
            if (btnCloseAlertContexteTechnique) btnCloseAlertContexteTechnique.addEventListener('click', closeAlertContexteTechniqueModal);
            if (btnOkAlertContexteTechnique) btnOkAlertContexteTechnique.addEventListener('click', closeAlertContexteTechniqueModal);
            alertContexteTechniqueBackdrop.addEventListener('click', (e) => {
                if (e.target === alertContexteTechniqueBackdrop) closeAlertContexteTechniqueModal();
            });
        }

        // Modale alerte contacts de l'opération
        const alertContactsBackdrop = document.getElementById('alertContactsModalBackdrop');
        const btnCloseAlertContacts = document.getElementById('btnCloseAlertContactsModal');
        const btnOkAlertContacts = document.getElementById('btnOkAlertContactsModal');
        const closeAlertContactsModal = () => {
            if (alertContactsBackdrop) {
                alertContactsBackdrop.classList.add('hidden');
                alertContactsBackdrop.setAttribute('aria-hidden', 'true');
            }
        };
        if (alertContactsBackdrop) {
            if (btnCloseAlertContacts) btnCloseAlertContacts.addEventListener('click', closeAlertContactsModal);
            if (btnOkAlertContacts) btnOkAlertContacts.addEventListener('click', closeAlertContactsModal);
            alertContactsBackdrop.addEventListener('click', (e) => {
                if (e.target === alertContactsBackdrop) closeAlertContactsModal();
            });
        }

        // Modale alerte diagnostiqueur
        const alertDiagnostiqueurBackdrop = document.getElementById('alertDiagnostiqueurModalBackdrop');
        const btnCloseAlertDiagnostiqueur = document.getElementById('btnCloseAlertDiagnostiqueurModal');
        const btnOkAlertDiagnostiqueur = document.getElementById('btnOkAlertDiagnostiqueurModal');
        const closeAlertDiagnostiqueurModal = () => {
            if (alertDiagnostiqueurBackdrop) {
                alertDiagnostiqueurBackdrop.classList.add('hidden');
                alertDiagnostiqueurBackdrop.setAttribute('aria-hidden', 'true');
            }
        };
        if (alertDiagnostiqueurBackdrop) {
            if (btnCloseAlertDiagnostiqueur) btnCloseAlertDiagnostiqueur.addEventListener('click', closeAlertDiagnostiqueurModal);
            if (btnOkAlertDiagnostiqueur) btnOkAlertDiagnostiqueur.addEventListener('click', closeAlertDiagnostiqueurModal);
            alertDiagnostiqueurBackdrop.addEventListener('click', (e) => {
                if (e.target === alertDiagnostiqueurBackdrop) closeAlertDiagnostiqueurModal();
            });
        }

        // Modale alerte référence de l'opération
        const alertOperationReferenceBackdrop = document.getElementById('alertOperationReferenceModalBackdrop');
        const btnCloseAlertOperationReference = document.getElementById('btnCloseAlertOperationReferenceModal');
        const btnOkAlertOperationReference = document.getElementById('btnOkAlertOperationReferenceModal');
        const closeAlertOperationReferenceModal = () => {
            if (alertOperationReferenceBackdrop) {
                alertOperationReferenceBackdrop.classList.add('hidden');
                alertOperationReferenceBackdrop.setAttribute('aria-hidden', 'true');
            }
        };
        if (alertOperationReferenceBackdrop) {
            if (btnCloseAlertOperationReference) btnCloseAlertOperationReference.addEventListener('click', closeAlertOperationReferenceModal);
            if (btnOkAlertOperationReference) btnOkAlertOperationReference.addEventListener('click', closeAlertOperationReferenceModal);
            alertOperationReferenceBackdrop.addEventListener('click', (e) => {
                if (e.target === alertOperationReferenceBackdrop) closeAlertOperationReferenceModal();
            });
        }

        // Modale dédiée : pièces de la combinaison localisation/situation
        const lotLocationPiecesBackdrop = document.getElementById('lotLocationPiecesModalBackdrop');
        const btnCloseLotLocationPiecesModal = document.getElementById('btnCloseLotLocationPiecesModal');
        const btnOkLotLocationPiecesModal = document.getElementById('btnOkLotLocationPiecesModal');
        if (lotLocationPiecesBackdrop) {
            if (btnCloseLotLocationPiecesModal) {
                btnCloseLotLocationPiecesModal.addEventListener('click', () => this.closeLotLocationPiecesModal());
            }
            if (btnOkLotLocationPiecesModal) {
                btnOkLotLocationPiecesModal.addEventListener('click', () => this.closeLotLocationPiecesModal());
            }
            lotLocationPiecesBackdrop.addEventListener('click', (e) => {
                if (e.target === lotLocationPiecesBackdrop) this.closeLotLocationPiecesModal();
            });
        }

        // Modale confirmation suppression de pièce
        this._pendingDeletePiece = null;
        const deletePieceBackdrop = document.getElementById('deletePieceConfirmBackdrop');
        const btnCloseDeletePiece = document.getElementById('btnCloseDeletePieceConfirm');
        const btnCancelDeletePiece = document.getElementById('btnCancelDeletePiece');
        const btnConfirmDeletePiece = document.getElementById('btnConfirmDeletePiece');
        const btnConfirmDeletePieceRestore = document.getElementById('btnConfirmDeletePieceRestore');
        const closeDeletePieceModal = () => {
            if (deletePieceBackdrop) { deletePieceBackdrop.classList.add('hidden'); deletePieceBackdrop.setAttribute('aria-hidden', 'true'); }
        };
        const executePendingDeletePiece = (restoreDefaultPiece) => {
            closeDeletePieceModal();
            if (this._pendingDeletePiece) {
                const { lot, pi } = this._pendingDeletePiece;
                this._pendingDeletePiece = null;
                this.deletePieceFromLot(lot, pi, { restoreDefaultPiece });
            }
        };
        if (deletePieceBackdrop) {
            if (btnCloseDeletePiece) btnCloseDeletePiece.addEventListener('click', closeDeletePieceModal);
            if (btnCancelDeletePiece) btnCancelDeletePiece.addEventListener('click', closeDeletePieceModal);
            deletePieceBackdrop.addEventListener('click', (e) => {
                if (e.target === deletePieceBackdrop) closeDeletePieceModal();
            });
            if (btnConfirmDeletePieceRestore) {
                btnConfirmDeletePieceRestore.addEventListener('click', () => executePendingDeletePiece(true));
            }
            if (btnConfirmDeletePiece) {
                btnConfirmDeletePiece.addEventListener('click', () => executePendingDeletePiece(false));
            }

            this._pendingDeleteDefaultPiece = null;
            const deleteDefaultPieceBackdrop = document.getElementById('deleteDefaultPieceConfirmBackdrop');
            const btnCloseDeleteDefaultPiece = document.getElementById('btnCloseDeleteDefaultPieceConfirm');
            const btnCancelDeleteDefaultPiece = document.getElementById('btnCancelDeleteDefaultPiece');
            const btnConfirmDeleteDefaultPieceOnly = document.getElementById('btnConfirmDeleteDefaultPieceOnly');
            const btnConfirmDeleteDefaultPieceGenerate = document.getElementById('btnConfirmDeleteDefaultPieceGenerate');
            const closeDeleteDefaultPieceModal = () => {
                if (deleteDefaultPieceBackdrop) {
                    deleteDefaultPieceBackdrop.classList.add('hidden');
                    deleteDefaultPieceBackdrop.setAttribute('aria-hidden', 'true');
                }
            };
            const executePendingDeleteDefaultPiece = (generateDetailedPieces) => {
                closeDeleteDefaultPieceModal();
                if (this._pendingDeleteDefaultPiece) {
                    const { lot, defaultPieceId } = this._pendingDeleteDefaultPiece;
                    this._pendingDeleteDefaultPiece = null;
                    this.deleteDefaultPieceFromLot(lot, defaultPieceId, { generateDetailedPieces });
                }
            };
            if (deleteDefaultPieceBackdrop) {
                if (btnCloseDeleteDefaultPiece) btnCloseDeleteDefaultPiece.addEventListener('click', closeDeleteDefaultPieceModal);
                if (btnCancelDeleteDefaultPiece) btnCancelDeleteDefaultPiece.addEventListener('click', closeDeleteDefaultPieceModal);
                deleteDefaultPieceBackdrop.addEventListener('click', (e) => {
                    if (e.target === deleteDefaultPieceBackdrop) closeDeleteDefaultPieceModal();
                });
                if (btnConfirmDeleteDefaultPieceOnly) {
                    btnConfirmDeleteDefaultPieceOnly.addEventListener('click', () => executePendingDeleteDefaultPiece(false));
                }
                if (btnConfirmDeleteDefaultPieceGenerate) {
                    btnConfirmDeleteDefaultPieceGenerate.addEventListener('click', () => executePendingDeleteDefaultPiece(true));
                }
            }

            const createPieceDeductionBackdrop = document.getElementById('createPieceDeductionBackdrop');
            const btnCloseCreatePieceDeduction = document.getElementById('btnCloseCreatePieceDeduction');
            const btnCreatePieceDeductionYes = document.getElementById('btnCreatePieceDeductionYes');
            const btnCreatePieceDeductionNo = document.getElementById('btnCreatePieceDeductionNo');
            const modeDetailedRadio = document.getElementById('createPieceDuplicationModeDetailed');
            const modeDefaultRadio = document.getElementById('createPieceDuplicationModeDefault');
            if (createPieceDeductionBackdrop) {
                if (btnCloseCreatePieceDeduction) {
                    btnCloseCreatePieceDeduction.addEventListener('click', () => this.closeCreatePieceDeductionModal());
                }
                if (btnCreatePieceDeductionYes) {
                    btnCreatePieceDeductionYes.addEventListener('click', () => this.confirmCreatePieceDeductionAction(true));
                }
                if (btnCreatePieceDeductionNo) {
                    btnCreatePieceDeductionNo.addEventListener('click', () => this.confirmCreatePieceDeductionAction(false));
                }
                createPieceDeductionBackdrop.addEventListener('click', (e) => {
                    if (e.target === createPieceDeductionBackdrop) this.closeCreatePieceDeductionModal();
                });
                if (modeDetailedRadio) {
                    modeDetailedRadio.addEventListener('change', () => this.updateCreatePieceDeductionModalByMode());
                }
                if (modeDefaultRadio) {
                    modeDefaultRadio.addEventListener('change', () => this.updateCreatePieceDeductionModalByMode());
                }
            }
        }

        // Modale allotissement
        const allotissementBtn = document.getElementById('btnAllotissementInfo');
        const allotissementBackdrop = document.getElementById('allotissementModalBackdrop');
        const allotissementClose = document.getElementById('btnCloseAllotissementModal');
        const allotissementCloseFooter = document.getElementById('btnCloseAllotissementModalFooter');

        if (allotissementBtn && allotissementBackdrop && allotissementClose && allotissementCloseFooter) {
            allotissementBtn.addEventListener('click', () => this.openAllotissementModal());
            allotissementClose.addEventListener('click', () => this.closeAllotissementModal());
            allotissementCloseFooter.addEventListener('click', () => this.closeAllotissementModal());
            allotissementBackdrop.addEventListener('click', (e) => {
                if (e.target === allotissementBackdrop) this.closeAllotissementModal();
            });
        }

        // Modale détail du lot
        const detailLotBtn = document.getElementById('btnDetailLotInfo');
        const detailLotBackdrop = document.getElementById('detailLotModalBackdrop');
        const detailLotClose = document.getElementById('btnCloseDetailLotModal');
        const detailLotCloseFooter = document.getElementById('btnCloseDetailLotModalFooter');

        if (detailLotBtn && detailLotBackdrop && detailLotClose && detailLotCloseFooter) {
            detailLotBtn.addEventListener('click', () => this.openDetailLotModal());
            detailLotClose.addEventListener('click', () => this.closeDetailLotModal());
            detailLotCloseFooter.addEventListener('click', () => this.closeDetailLotModal());
            detailLotBackdrop.addEventListener('click', (e) => {
                if (e.target === detailLotBackdrop) this.closeDetailLotModal();
            });
        }

        // Modale info logique prix
        const prixLogicBackdrop = document.getElementById('prixLogicModalBackdrop');
        const prixLogicClose = document.getElementById('btnClosePrixLogicModal');
        const prixLogicCloseFooter = document.getElementById('btnClosePrixLogicModalFooter');

        if (prixLogicBackdrop && prixLogicClose && prixLogicCloseFooter) {
            prixLogicClose.addEventListener('click', () => this.closePrixLogicModal());
            prixLogicCloseFooter.addEventListener('click', () => this.closePrixLogicModal());
            prixLogicBackdrop.addEventListener('click', (e) => {
                if (e.target === prixLogicBackdrop) this.closePrixLogicModal();
            });
        }

        // Modale info Taux de similarité et Pièce type
        const tauxLogicBackdrop = document.getElementById('tauxLogicModalBackdrop');
        const tauxLogicClose = document.getElementById('btnCloseTauxLogicModal');
        const tauxLogicCloseFooter = document.getElementById('btnCloseTauxLogicModalFooter');

        if (tauxLogicBackdrop && tauxLogicClose && tauxLogicCloseFooter) {
            tauxLogicClose.addEventListener('click', () => this.closeTauxLogicModal());
            tauxLogicCloseFooter.addEventListener('click', () => this.closeTauxLogicModal());
            tauxLogicBackdrop.addEventListener('click', (e) => {
                if (e.target === tauxLogicBackdrop) this.closeTauxLogicModal();
            });
        }

        // Modale import documents (placeholder)
        const importButtons = document.querySelectorAll('[data-import-target]');
        const documentsImportBackdrop = document.getElementById('documentsImportModalBackdrop');
        const btnCloseDocumentsImportModal = document.getElementById('btnCloseDocumentsImportModal');
        const btnCloseDocumentsImportModalFooter = document.getElementById('btnCloseDocumentsImportModalFooter');

        if (importButtons.length && documentsImportBackdrop && btnCloseDocumentsImportModal && btnCloseDocumentsImportModalFooter) {
            importButtons.forEach((btn) => {
                btn.addEventListener('click', () => this.openDocumentsImportModal());
            });
            btnCloseDocumentsImportModal.addEventListener('click', () => this.closeDocumentsImportModal());
            btnCloseDocumentsImportModalFooter.addEventListener('click', () => this.closeDocumentsImportModal());
            documentsImportBackdrop.addEventListener('click', (e) => {
                if (e.target === documentsImportBackdrop) this.closeDocumentsImportModal();
            });
        }


        // Modales inspection
        const inspBtn = document.getElementById('btnInspectionInfo');
        const inspBackdrop = document.getElementById('inspectionModalBackdrop');
        const inspClose = document.getElementById('btnCloseInspectionModal');
        const inspCloseFooter = document.getElementById('btnCloseInspectionModalFooter');

        if (inspBtn && inspBackdrop && inspClose && inspCloseFooter) {
            inspBtn.addEventListener('click', () => this.openInspectionModal());
            inspClose.addEventListener('click', () => this.closeInspectionModal());
            inspCloseFooter.addEventListener('click', () => this.closeInspectionModal());
            inspBackdrop.addEventListener('click', (e) => {
                if (e.target === inspBackdrop) this.closeInspectionModal();
            });
        }

        const inspDetailBackdrop = document.getElementById('inspectionDetailModalBackdrop');
        const inspDetailClose = document.getElementById('btnCloseInspectionDetailModal');
        const inspDetailCloseFooter = document.getElementById('btnCloseInspectionDetailModalFooter');

        if (inspDetailBackdrop && inspDetailClose && inspDetailCloseFooter) {
            inspDetailClose.addEventListener('click', () => this.closeInspectionDetailModal());
            inspDetailCloseFooter.addEventListener('click', () => this.closeInspectionDetailModal());
            inspDetailBackdrop.addEventListener('click', (e) => {
                if (e.target === inspDetailBackdrop) this.closeInspectionDetailModal();
            });
        }

        // Modales bio
        const bioBtn = document.getElementById('btnBioInfo');
        const bioBackdrop = document.getElementById('bioModalBackdrop');
        const bioClose = document.getElementById('btnCloseBioModal');
        const bioCloseFooter = document.getElementById('btnCloseBioModalFooter');

        if (bioBtn && bioBackdrop && bioClose && bioCloseFooter) {
            bioBtn.addEventListener('click', () => this.openBioModal());
            bioClose.addEventListener('click', () => this.closeBioModal());
            bioCloseFooter.addEventListener('click', () => this.closeBioModal());
            bioBackdrop.addEventListener('click', (e) => {
                if (e.target === bioBackdrop) this.closeBioModal();
            });
        }

        const bioDetailBackdrop = document.getElementById('bioDetailModalBackdrop');
        const bioDetailClose = document.getElementById('btnCloseBioDetailModal');
        const bioDetailCloseFooter = document.getElementById('btnCloseBioDetailModalFooter');

        if (bioDetailBackdrop && bioDetailClose && bioDetailCloseFooter) {
            bioDetailClose.addEventListener('click', () => this.closeBioDetailModal());
            bioDetailCloseFooter.addEventListener('click', () => this.closeBioDetailModal());
            bioDetailBackdrop.addEventListener('click', (e) => {
                if (e.target === bioDetailBackdrop) this.closeBioDetailModal();
            });
        }

        // Modale mech globale
const mechBtn = document.getElementById('btnMechInfo');
const mechBackdrop = document.getElementById('mechModalBackdrop');
const mechClose = document.getElementById('btnCloseMechModal');
const mechCloseFooter = document.getElementById('btnCloseMechModalFooter');

if (mechBtn && mechBackdrop && mechClose && mechCloseFooter) {
    mechBtn.addEventListener('click', () => this.openMechModal());
    mechClose.addEventListener('click', () => this.closeMechModal());
    mechCloseFooter.addEventListener('click', () => this.closeMechModal());
    mechBackdrop.addEventListener('click', (e) => {
        if (e.target === mechBackdrop) this.closeMechModal();
    });
}

// Modale détail mech
const mechDetailBackdrop = document.getElementById('mechDetailModalBackdrop');
const mechDetailClose = document.getElementById('btnCloseMechDetailModal');
const mechDetailCloseFooter = document.getElementById('btnCloseMechDetailModalFooter');

if (mechDetailBackdrop && mechDetailClose && mechDetailCloseFooter) {
    mechDetailClose.addEventListener('click', () => this.closeMechDetailModal());
    mechDetailCloseFooter.addEventListener('click', () => this.closeMechDetailModal());
    mechDetailBackdrop.addEventListener('click', (e) => {
        if (e.target === mechDetailBackdrop) this.closeMechDetailModal();
    });
}
// Modale usage globale
const usageBtn = document.getElementById('btnUsageInfo');
const usageBackdrop = document.getElementById('usageModalBackdrop');
const usageClose = document.getElementById('btnCloseUsageModal');
const usageCloseFooter = document.getElementById('btnCloseUsageModalFooter');

if (usageBtn && usageBackdrop && usageClose && usageCloseFooter) {
    usageBtn.addEventListener('click', () => this.openUsageModal());
    usageClose.addEventListener('click', () => this.closeUsageModal());
    usageCloseFooter.addEventListener('click', () => this.closeUsageModal());
    usageBackdrop.addEventListener('click', (e) => {
        if (e.target === usageBackdrop) this.closeUsageModal();
    });
}

// Modale détail usage
const usageDetailBackdrop = document.getElementById('usageDetailModalBackdrop');
const usageDetailClose = document.getElementById('btnCloseUsageDetailModal');
const usageDetailCloseFooter = document.getElementById('btnCloseUsageDetailModalFooter');

if (usageDetailBackdrop && usageDetailClose && usageDetailCloseFooter) {
    usageDetailClose.addEventListener('click', () => this.closeUsageDetailModal());
    usageDetailCloseFooter.addEventListener('click', () => this.closeUsageDetailModal());
    usageDetailBackdrop.addEventListener('click', (e) => {
        if (e.target === usageDetailBackdrop) this.closeUsageDetailModal();
    });
}

// Modale denat globale
const denatBtn = document.getElementById('btnDenatInfo');
const denatBackdrop = document.getElementById('denatModalBackdrop');
const denatClose = document.getElementById('btnCloseDenatModal');
const denatCloseFooter = document.getElementById('btnCloseDenatModalFooter');

if (denatBtn && denatBackdrop && denatClose && denatCloseFooter) {
    denatBtn.addEventListener('click', () => this.openDenatModal());
    denatClose.addEventListener('click', () => this.closeDenatModal());
    denatCloseFooter.addEventListener('click', () => this.closeDenatModal());
    denatBackdrop.addEventListener('click', (e) => {
        if (e.target === denatBackdrop) this.closeDenatModal();
    });
}

// Modale détail denat
const denatDetailBackdrop = document.getElementById('denatDetailModalBackdrop');
const denatDetailClose = document.getElementById('btnCloseDenatDetailModal');
const denatDetailCloseFooter = document.getElementById('btnCloseDenatDetailModalFooter');

if (denatDetailBackdrop && denatDetailClose && denatDetailCloseFooter) {
    denatDetailClose.addEventListener('click', () => this.closeDenatDetailModal());
    denatDetailCloseFooter.addEventListener('click', () => this.closeDenatDetailModal());
    denatDetailBackdrop.addEventListener('click', (e) => {
        if (e.target === denatDetailBackdrop) this.closeDenatDetailModal();
    });
}

// Modale debit globale
const debitBtn = document.getElementById('btnDebitInfo');
const debitBackdrop = document.getElementById('debitModalBackdrop');
const debitClose = document.getElementById('btnCloseDebitModal');
const debitCloseFooter = document.getElementById('btnCloseDebitModalFooter');

if (debitBtn && debitBackdrop && debitClose && debitCloseFooter) {
    debitBtn.addEventListener('click', () => this.openDebitModal());
    debitClose.addEventListener('click', () => this.closeDebitModal());
    debitCloseFooter.addEventListener('click', () => this.closeDebitModal());
    debitBackdrop.addEventListener('click', (e) => {
        if (e.target === debitBackdrop) this.closeDebitModal();
    });
}

// Modale détail debit
const debitDetailBackdrop = document.getElementById('debitDetailModalBackdrop');
const debitDetailClose = document.getElementById('btnCloseDebitDetailModal');
const debitDetailCloseFooter = document.getElementById('btnCloseDebitDetailModalFooter');

if (debitDetailBackdrop && debitDetailClose && debitDetailCloseFooter) {
    debitDetailClose.addEventListener('click', () => this.closeDebitDetailModal());
    debitDetailCloseFooter.addEventListener('click', () => this.closeDebitDetailModal());
    debitDetailBackdrop.addEventListener('click', (e) => {
        if (e.target === debitDetailBackdrop) this.closeDebitDetailModal();
    });
}

// Modale geo globale
const geoBtn = document.getElementById('btnGeoInfo');
const geoBackdrop = document.getElementById('geoModalBackdrop');
const geoClose = document.getElementById('btnCloseGeoModal');
const geoCloseFooter = document.getElementById('btnCloseGeoModalFooter');

if (geoBtn && geoBackdrop && geoClose && geoCloseFooter) {
    geoBtn.addEventListener('click', () => this.openGeoModal());
    geoClose.addEventListener('click', () => this.closeGeoModal());
    geoCloseFooter.addEventListener('click', () => this.closeGeoModal());
    geoBackdrop.addEventListener('click', (e) => {
        if (e.target === geoBackdrop) this.closeGeoModal();
    });
}

// Modale détail geo
const geoDetailBackdrop = document.getElementById('geoDetailModalBackdrop');
const geoDetailClose = document.getElementById('btnCloseGeoDetailModal');
const geoDetailCloseFooter = document.getElementById('btnCloseGeoDetailModalFooter');

if (geoDetailBackdrop && geoDetailClose && geoDetailCloseFooter) {
    geoDetailClose.addEventListener('click', () => this.closeGeoDetailModal());
    geoDetailCloseFooter.addEventListener('click', () => this.closeGeoDetailModal());
    geoDetailBackdrop.addEventListener('click', (e) => {
        if (e.target === geoDetailBackdrop) this.closeGeoDetailModal();
    });
}

// Modale essence globale
const essenceBtn = document.getElementById('btnEssenceInfo');
const essenceBackdrop = document.getElementById('essenceModalBackdrop');
const essenceClose = document.getElementById('btnCloseEssenceModal');
const essenceCloseFooter = document.getElementById('btnCloseEssenceModalFooter');

if (essenceBtn && essenceBackdrop && essenceClose && essenceCloseFooter) {
    essenceBtn.addEventListener('click', () => this.openEssenceModal());
    essenceClose.addEventListener('click', () => this.closeEssenceModal());
    essenceCloseFooter.addEventListener('click', () => this.closeEssenceModal());
    essenceBackdrop.addEventListener('click', (e) => {
        if (e.target === essenceBackdrop) this.closeEssenceModal();
    });
}

// Modale détail essence
const essenceDetailBackdrop = document.getElementById('essenceDetailModalBackdrop');
const essenceDetailClose = document.getElementById('btnCloseEssenceDetailModal');
const essenceDetailCloseFooter = document.getElementById('btnCloseEssenceDetailModalFooter');

if (essenceDetailBackdrop && essenceDetailClose && essenceDetailCloseFooter) {
    essenceDetailClose.addEventListener('click', () => this.closeEssenceDetailModal());
    essenceDetailCloseFooter.addEventListener('click', () => this.closeEssenceDetailModal());
    essenceDetailBackdrop.addEventListener('click', (e) => {
        if (e.target === essenceDetailBackdrop) this.closeEssenceDetailModal();
    });
}

// Modale ancien globale
const ancienBtn = document.getElementById('btnAncienInfo');
const ancienBackdrop = document.getElementById('ancienModalBackdrop');
const ancienClose = document.getElementById('btnCloseAncienModal');
const ancienCloseFooter = document.getElementById('btnCloseAncienModalFooter');

if (ancienBtn && ancienBackdrop && ancienClose && ancienCloseFooter) {
    ancienBtn.addEventListener('click', () => this.openAncienModal());
    ancienClose.addEventListener('click', () => this.closeAncienModal());
    ancienCloseFooter.addEventListener('click', () => this.closeAncienModal());
    ancienBackdrop.addEventListener('click', (e) => {
        if (e.target === ancienBackdrop) this.closeAncienModal();
    });
}

// Modale détail ancien
const ancienDetailBackdrop = document.getElementById('ancienDetailModalBackdrop');
const ancienDetailClose = document.getElementById('btnCloseAncienDetailModal');
const ancienDetailCloseFooter = document.getElementById('btnCloseAncienDetailModalFooter');

if (ancienDetailBackdrop && ancienDetailClose && ancienDetailCloseFooter) {
    ancienDetailClose.addEventListener('click', () => this.closeAncienDetailModal());
    ancienDetailCloseFooter.addEventListener('click', () => this.closeAncienDetailModal());
    ancienDetailBackdrop.addEventListener('click', (e) => {
        if (e.target === ancienDetailBackdrop) this.closeAncienDetailModal();
    });
}

// Modale traces globale
const tracesBtn = document.getElementById('btnTracesInfo');
const tracesBackdrop = document.getElementById('tracesModalBackdrop');
const tracesClose = document.getElementById('btnCloseTracesModal');
const tracesCloseFooter = document.getElementById('btnCloseTracesModalFooter');

if (tracesBtn && tracesBackdrop && tracesClose && tracesCloseFooter) {
    tracesBtn.addEventListener('click', () => this.openTracesModal());
    tracesClose.addEventListener('click', () => this.closeTracesModal());
    tracesCloseFooter.addEventListener('click', () => this.closeTracesModal());
    tracesBackdrop.addEventListener('click', (e) => {
        if (e.target === tracesBackdrop) this.closeTracesModal();
    });
}

// Modale détail traces
const tracesDetailBackdrop = document.getElementById('tracesDetailModalBackdrop');
const tracesDetailClose = document.getElementById('btnCloseTracesDetailModal');
const tracesDetailCloseFooter = document.getElementById('btnCloseTracesDetailModalFooter');

if (tracesDetailBackdrop && tracesDetailClose && tracesDetailCloseFooter) {
    tracesDetailClose.addEventListener('click', () => this.closeTracesDetailModal());
    tracesDetailCloseFooter.addEventListener('click', () => this.closeTracesDetailModal());
    tracesDetailBackdrop.addEventListener('click', (e) => {
        if (e.target === tracesDetailBackdrop) this.closeTracesDetailModal();
    });
}

        // Modale provenance globale
const provBtn = document.getElementById('btnProvenanceInfo');
const provBackdrop = document.getElementById('provenanceModalBackdrop');
const provClose = document.getElementById('btnCloseProvenanceModal');
const provCloseFooter = document.getElementById('btnCloseProvenanceModalFooter');

if (provBtn && provBackdrop && provClose && provCloseFooter) {
    provBtn.addEventListener('click', () => this.openProvenanceModal());
    provClose.addEventListener('click', () => this.closeProvenanceModal());
    provCloseFooter.addEventListener('click', () => this.closeProvenanceModal());
    provBackdrop.addEventListener('click', (e) => {
        if (e.target === provBackdrop) this.closeProvenanceModal();
    });
}

// Modale détail provenance
const provDetailBackdrop = document.getElementById('provenanceDetailModalBackdrop');
const provDetailClose = document.getElementById('btnCloseProvenanceDetailModal');
const provDetailCloseFooter = document.getElementById('btnCloseProvenanceDetailModalFooter');

if (provDetailBackdrop && provDetailClose && provDetailCloseFooter) {
    provDetailClose.addEventListener('click', () => this.closeProvenanceDetailModal());
    provDetailCloseFooter.addEventListener('click', () => this.closeProvenanceDetailModal());
    provDetailBackdrop.addEventListener('click', (e) => {
        if (e.target === provDetailBackdrop) this.closeProvenanceDetailModal();
    });
}

        // Seuils modale
        const seuilsBtn = document.getElementById('btnSeuilsInfo');
        const seuilsBackdrop = document.getElementById('seuilsModalBackdrop');
        const seuilsClose = document.getElementById('btnCloseSeuilsModal');
        const seuilsCloseFooter = document.getElementById('btnCloseSeuilsModalFooter');

        if (seuilsBtn && seuilsBackdrop && seuilsClose && seuilsCloseFooter) {
            seuilsBtn.addEventListener('click', () => this.openSeuilsModal());
            seuilsClose.addEventListener('click', () => this.closeSeuilsModal());
            seuilsCloseFooter.addEventListener('click', () => this.closeSeuilsModal());
            seuilsBackdrop.addEventListener('click', (e) => {
                if (e.target === seuilsBackdrop) this.closeSeuilsModal();
            });
        }

        // Radar modales
        const radarBtn = document.getElementById('btnRadarInfo');
        const radarBackdrop = document.getElementById('radarModalBackdrop');
        const radarClose = document.getElementById('btnCloseRadarModal');
        const radarCloseFooter = document.getElementById('btnCloseRadarModalFooter');

        if (radarBtn && radarBackdrop && radarClose && radarCloseFooter) {
            radarBtn.addEventListener('click', () => this.openRadarModal());
            radarClose.addEventListener('click', () => this.closeRadarModal());
            radarCloseFooter.addEventListener('click', () => this.closeRadarModal());
            radarBackdrop.addEventListener('click', (e) => {
                if (e.target === radarBackdrop) this.closeRadarModal();
            });
        }

        const scatterDimsBtn = document.getElementById('btnScatterDimsInfo');
        const scatterDimsBackdrop = document.getElementById('scatterDimsModalBackdrop');
        const scatterDimsClose = document.getElementById('btnCloseScatterDimsModal');
        const scatterDimsCloseFooter = document.getElementById('btnCloseScatterDimsModalFooter');

        if (scatterDimsBtn && scatterDimsBackdrop && scatterDimsClose && scatterDimsCloseFooter) {
            scatterDimsBtn.addEventListener('click', () => this.openScatterDimsModal());
            scatterDimsClose.addEventListener('click', () => this.closeScatterDimsModal());
            scatterDimsCloseFooter.addEventListener('click', () => this.closeScatterDimsModal());
            scatterDimsBackdrop.addEventListener('click', (e) => {
                if (e.target === scatterDimsBackdrop) this.closeScatterDimsModal();
            });
        }

// Modale Orientation
const orientBtn = document.getElementById('btnOrientationInfo');
const orientBackdrop = document.getElementById('orientationModalBackdrop');
const orientClose = document.getElementById('btnCloseOrientationModal');
const orientCloseFooter = document.getElementById('btnCloseOrientationModalFooter');

if (orientBtn && orientBackdrop && orientClose && orientCloseFooter) {
    orientBtn.addEventListener('click', () => this.openOrientationModal());
    orientClose.addEventListener('click', () => this.closeOrientationModal());
    orientCloseFooter.addEventListener('click', () => this.closeOrientationModal());
    orientBackdrop.addEventListener('click', (e) => {
        if (e.target === orientBackdrop) this.closeOrientationModal();
    });
}        

// Modale Évaluation de l'opération
const evalOpBtn = document.getElementById('btnEvalOpInfo');
const evalOpBackdrop = document.getElementById('evalOpModalBackdrop');
const evalOpClose = document.getElementById('btnCloseEvalOpModal');
const evalOpCloseFooter = document.getElementById('btnCloseEvalOpModalFooter');

if (evalOpBtn && evalOpBackdrop && evalOpClose && evalOpCloseFooter) {
    evalOpBtn.addEventListener('click', () => this.openEvalOpModal());
    evalOpClose.addEventListener('click', () => this.closeEvalOpModal());
    evalOpCloseFooter.addEventListener('click', () => this.closeEvalOpModal());
    evalOpBackdrop.addEventListener('click', (e) => {
        if (e.target === evalOpBackdrop) this.closeEvalOpModal();
    });
}

        // CTA bas de page
        const btnResetAll = document.getElementById('btnResetAll');
        const btnImportJson = document.getElementById('btnImportJson');
        const importJsonInput = document.getElementById('importJsonInput');
        const btnEtiqueter = document.getElementById('btnEtiqueter');
        const btnExportPdf = document.getElementById('btnExportPdf');

        if (btnResetAll) btnResetAll.addEventListener('click', () => this.openResetConfirmModal());
        if (btnImportJson && importJsonInput) {
            btnImportJson.addEventListener('click', () => importJsonInput.click());
            importJsonInput.addEventListener('change', () => {
                const file = importJsonInput.files && importJsonInput.files[0];
                importJsonInput.value = '';
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const text = String(reader.result || '');
                        const parsed = JSON.parse(text);
                        if (!this.applyEvaluationPayload(parsed)) {
                            alert(
                                'Fichier JSON invalide : la structure doit contenir un tableau « lots » (export VALOBOIS / nuage).'
                            );
                        }
                    } catch (err) {
                        console.error(err);
                        alert('Impossible de lire ce fichier comme JSON VALOBOIS.');
                    }
                };
                reader.onerror = () => alert('Lecture du fichier impossible.');
                reader.readAsText(file, 'UTF-8');
            });
        }
        if (btnEtiqueter) btnEtiqueter.addEventListener('click', () => this.openEtiqueterModal());
        if (btnExportPdf) btnExportPdf.addEventListener('click', () => this.openExportPdfModal());

        const resetBackdrop = document.getElementById('resetConfirmBackdrop');
        const btnCloseResetConfirm = document.getElementById('btnCloseResetConfirm');
        const btnCancelReset = document.getElementById('btnCancelReset');
        const btnConfirmReset = document.getElementById('btnConfirmReset');

        if (resetBackdrop && btnCloseResetConfirm && btnCancelReset && btnConfirmReset) {
            btnCloseResetConfirm.addEventListener('click', () => this.closeResetConfirmModal());
            btnCancelReset.addEventListener('click', () => this.closeResetConfirmModal());
            resetBackdrop.addEventListener('click', (e) => {
                if (e.target === resetBackdrop) this.closeResetConfirmModal();
            });
            btnConfirmReset.addEventListener('click', () => this.confirmResetAction());
        }

        // ─── Init modales prix lot direct ───
        {
            const bd1 = document.getElementById('prixLotDirectConfirmBackdrop');
            const btnClose1 = document.getElementById('btnClosePrixLotDirectConfirm');
            const btnCancel1 = document.getElementById('btnCancelPrixLotDirect');
            const btnConfirm1 = document.getElementById('btnConfirmPrixLotDirect');
            if (bd1) {
                if (btnClose1) btnClose1.addEventListener('click', () => this.closePrixLotDirectConfirmModal());
                if (btnCancel1) btnCancel1.addEventListener('click', () => this.closePrixLotDirectConfirmModal());
                bd1.addEventListener('click', (e) => { if (e.target === bd1) this.closePrixLotDirectConfirmModal(); });
                if (btnConfirm1) btnConfirm1.addEventListener('click', () => {
                    const cb = this._pendingPrixLotDirectConfirm;
                    this.closePrixLotDirectConfirmModal();
                    if (typeof cb === 'function') cb();
                });
            }
            const bd2 = document.getElementById('prixLotDirectActivateBackdrop');
            const btnClose2 = document.getElementById('btnClosePrixLotDirectActivate');
            const btnCancel2 = document.getElementById('btnCancelPrixLotDirectActivate');
            const btnConfirm2 = document.getElementById('btnConfirmPrixLotDirectActivate');
            if (bd2) {
                if (btnClose2) btnClose2.addEventListener('click', () => this.closePrixLotDirectActivateModal());
                if (btnCancel2) btnCancel2.addEventListener('click', () => this.closePrixLotDirectActivateModal());
                bd2.addEventListener('click', (e) => { if (e.target === bd2) this.closePrixLotDirectActivateModal(); });
                if (btnConfirm2) btnConfirm2.addEventListener('click', () => {
                    const cb = this._pendingPrixLotDirectActivate;
                    this.closePrixLotDirectActivateModal();
                    if (typeof cb === 'function') cb();
                });
            }
            const bd3 = document.getElementById('prixPieceMissingBackdrop');
            const btnClose3 = document.getElementById('btnClosePrixPieceMissing');
            const btnClose3Footer = document.getElementById('btnClosePrixPieceMissingFooter');
            if (bd3) {
                if (btnClose3) btnClose3.addEventListener('click', () => this.closePrixPieceMissingModal());
                if (btnClose3Footer) btnClose3Footer.addEventListener('click', () => this.closePrixPieceMissingModal());
                bd3.addEventListener('click', (e) => { if (e.target === bd3) this.closePrixPieceMissingModal(); });
            }
        }

        const exportPdfBackdrop = document.getElementById('exportPdfBackdrop');
        const btnCloseExportPdf = document.getElementById('btnCloseExportPdf');
        const btnCancelExportPdf = document.getElementById('btnCancelExportPdf');
        const btnRunExport = document.getElementById('btnRunExport');
        const exportFileFormatSelect = document.getElementById('exportFileFormatSelect');
        const exportContentModeSelect = document.getElementById('exportContentModeSelect');
        const exportLotsHint = document.getElementById('exportLotsHint');
        const exportPdfLotsList = document.getElementById('exportPdfLotsList');
        const exportModalLotsSection = document.getElementById('exportModalLotsSection');
        const exportModalDetailSection = document.getElementById('exportModalDetailSection');
        const exportModalIntro = document.getElementById('exportModalIntro');

        if (exportPdfBackdrop && btnCloseExportPdf && btnCancelExportPdf && btnRunExport && exportFileFormatSelect && exportContentModeSelect && exportPdfLotsList) {
            const closeExportPdf = () => this.closeExportPdfModal();
            const updateExportLotsState = () => {
                if (exportFileFormatSelect.value === 'json') return;
                const requiresLotSelection = exportContentModeSelect.value === 'lots-selectionnes';
                const lotCheckboxes = exportPdfLotsList.querySelectorAll('[data-export-pdf-lot]');
                lotCheckboxes.forEach((checkbox) => {
                    checkbox.disabled = !requiresLotSelection;
                });
                exportPdfLotsList.style.opacity = requiresLotSelection ? '1' : '0.55';
                if (exportLotsHint) {
                    exportLotsHint.textContent = requiresLotSelection
                        ? 'Sélectionner le ou les lots, puis choisir le format de fichier.'
                        : 'Mode synthèse: tous les lots sont inclus automatiquement.';
                }
            };

            const updateExportModalFormatState = () => {
                const isJson = exportFileFormatSelect.value === 'json';
                if (exportModalLotsSection) {
                    exportModalLotsSection.classList.toggle('hidden', isJson);
                    exportModalLotsSection.toggleAttribute('hidden', isJson);
                }
                if (exportModalDetailSection) {
                    exportModalDetailSection.classList.toggle('hidden', isJson);
                    exportModalDetailSection.toggleAttribute('hidden', isJson);
                }
                if (exportModalIntro) {
                    exportModalIntro.textContent = isJson
                        ? 'Export JSON : données d’évaluation (même structure que l’enregistrement nuage).'
                        : 'Choisissez le contenu et le format à exporter.';
                }
                if (isJson) {
                    exportPdfLotsList.style.opacity = '1';
                } else {
                    updateExportLotsState();
                }
            };

            btnCloseExportPdf.addEventListener('click', closeExportPdf);
            btnCancelExportPdf.addEventListener('click', closeExportPdf);
            exportPdfBackdrop.addEventListener('click', (e) => {
                if (e.target === exportPdfBackdrop) closeExportPdf();
            });

            exportContentModeSelect.addEventListener('change', updateExportLotsState);
            exportFileFormatSelect.addEventListener('change', updateExportModalFormatState);

            btnRunExport.addEventListener('click', () => {
                const formatVal = exportFileFormatSelect.value;
                if (formatVal === 'json') {
                    closeExportPdf();
                    this.exportEvaluationJson();
                    return;
                }
                const mode = exportContentModeSelect.value === 'lots-selectionnes' ? 'lots-selectionnes' : 'synthese';
                const format = formatVal === 'csv' ? 'csv' : 'pdf';
                let selectedLotIndices = [];

                if (mode === 'lots-selectionnes') {
                    selectedLotIndices = this.getSelectedExportPdfLotIndices();
                    if (!selectedLotIndices.length) {
                        alert('Sélectionne au moins un lot à exporter.');
                        return;
                    }
                }

                if (format === 'pdf') {
                    closeExportPdf();
                    this.exportToPdf(mode, selectedLotIndices);
                } else {
                    closeExportPdf();
                    this.exportToCsv(mode, selectedLotIndices);
                }
            });

            updateExportModalFormatState();
        }

        const etiqueterBackdrop = document.getElementById('etiqueterBackdrop');
        const btnCloseEtiqueter = document.getElementById('btnCloseEtiqueter');
        const btnCancelEtiqueter = document.getElementById('btnCancelEtiqueter');
        const btnRunEtiqueter = document.getElementById('btnRunEtiqueter');

        if (etiqueterBackdrop && btnCloseEtiqueter && btnCancelEtiqueter && btnRunEtiqueter) {
            const closeEtiqueter = () => this.closeEtiqueterModal();

            btnCloseEtiqueter.addEventListener('click', closeEtiqueter);
            btnCancelEtiqueter.addEventListener('click', closeEtiqueter);
            etiqueterBackdrop.addEventListener('click', (e) => {
                if (e.target === etiqueterBackdrop) closeEtiqueter();
            });

            btnRunEtiqueter.addEventListener('click', () => {
                const selectedLotIndices = this.getSelectedEtiqueterLotIndices();
                if (!selectedLotIndices.length) {
                    alert('Sélectionne au moins un lot pour exporter les étiquettes.');
                    return;
                }

                closeEtiqueter();
                this.exportEtiquettes(selectedLotIndices);
            });
        }
    }

    /* ---- Modales helpers ---- */

    openAllotissementModal() {
        const b = document.getElementById('allotissementModalBackdrop');
        if (b) {
            b.classList.remove('hidden');
            b.setAttribute('aria-hidden', 'false');
        }
    }

    closeAllotissementModal() {
        const b = document.getElementById('allotissementModalBackdrop');
        if (b) {
            b.classList.add('hidden');
            b.setAttribute('aria-hidden', 'true');
        }
    }

    openDetailLotModal() {
        const b = document.getElementById('detailLotModalBackdrop');
        if (b) {
            b.classList.remove('hidden');
            b.setAttribute('aria-hidden', 'false');
        }
    }

    closeDetailLotModal() {
        const b = document.getElementById('detailLotModalBackdrop');
        if (b) {
            b.classList.add('hidden');
            b.setAttribute('aria-hidden', 'true');
        }
    }

    openPrixLogicModal() {
        const b = document.getElementById('prixLogicModalBackdrop');
        if (b) {
            b.classList.remove('hidden');
            b.setAttribute('aria-hidden', 'false');
        }
    }

    closePrixLogicModal() {
        const b = document.getElementById('prixLogicModalBackdrop');
        if (b) {
            b.classList.add('hidden');
            b.setAttribute('aria-hidden', 'true');
        }
    }

    openTauxLogicModal() {
        const b = document.getElementById('tauxLogicModalBackdrop');
        if (b) {
            b.classList.remove('hidden');
            b.setAttribute('aria-hidden', 'false');
        }
    }

    closeTauxLogicModal() {
        const b = document.getElementById('tauxLogicModalBackdrop');
        if (b) {
            b.classList.add('hidden');
            b.setAttribute('aria-hidden', 'true');
        }
    }

    openInspectionModal() {
        const b = document.getElementById('inspectionModalBackdrop');
        if (b) {
            b.classList.remove('hidden');
            b.setAttribute('aria-hidden', 'false');
        }
    }

    closeInspectionModal() {
        const b = document.getElementById('inspectionModalBackdrop');
        if (b) {
            b.classList.add('hidden');
            b.setAttribute('aria-hidden', 'true');
        }
    }

    syncMetaToggleGroup(field) {
        const current = (this.data.meta && this.data.meta[field]) || '';
        document.querySelectorAll(`button[data-meta-toggle-field="${field}"]`).forEach((btn) => {
            btn.setAttribute('aria-pressed', btn.getAttribute('data-meta-toggle-value') === current ? 'true' : 'false');
        });
    }

    openDocumentsImportModal() {
        const b = document.getElementById('documentsImportModalBackdrop');
        if (b) {
            b.classList.remove('hidden');
            b.setAttribute('aria-hidden', 'false');
        }
    }

    closeDocumentsImportModal() {
        const b = document.getElementById('documentsImportModalBackdrop');
        if (b) {
            b.classList.add('hidden');
            b.setAttribute('aria-hidden', 'true');
        }
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    linkifyText(value) {
        const text = String(value || '');
        const linkRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|doi:\s*10\.\d{4,9}\/[^\s<>"']+|10\.\d{4,9}\/[^\s<>"']+)/gi;
        let lastIndex = 0;
        let html = '';

        text.replace(linkRegex, (fullMatch, _tokenGroup, offset) => {
            let token = fullMatch;
            let trailing = '';

            while (/[),.;:!?]$/.test(token)) {
                trailing = token.slice(-1) + trailing;
                token = token.slice(0, -1);
            }

            const trimmedToken = token.trim();
            let href = trimmedToken;
            let label = trimmedToken;

            if (/^www\./i.test(trimmedToken)) {
                href = 'https://' + trimmedToken;
            } else if (/^doi:\s*/i.test(trimmedToken)) {
                const doiValue = trimmedToken.replace(/^doi:\s*/i, '').trim();
                href = 'https://doi.org/' + doiValue;
                label = 'doi:' + doiValue;
            } else if (/^10\.\d{4,9}\//i.test(trimmedToken)) {
                href = 'https://doi.org/' + trimmedToken;
            }

            html += this.escapeHtml(text.slice(lastIndex, offset));
            html += `<a class="detail-modal-link" href="${this.escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(label)}</a>`;
            html += this.escapeHtml(trailing);
            lastIndex = offset + fullMatch.length;
            return fullMatch;
        });

        html += this.escapeHtml(text.slice(lastIndex));
        return html;
    }

    normalizeDetailTitle(value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
    }

    renderDetailModalContent(contentEl, rawText) {
        if (!contentEl) return;

        const modalRoot = contentEl.closest('.modal');
        const modalTitleEl = modalRoot ? modalRoot.querySelector('.modal-header h2') : null;
        const modalTitleNormalized = this.normalizeDetailTitle(modalTitleEl ? modalTitleEl.textContent : '');

        const text = (rawText || 'À renseigner').toString().trim();
        if (!text) {
            contentEl.innerHTML = '<div class="detail-modal-paragraph"><p>À renseigner</p></div>';
            return;
        }

        const blocks = text
            .split(/\n\s*\n+/)
            .map((block) => block.trim())
            .filter(Boolean);

        const referenceChunks = [];

        const scaleRegex = /(?:Une?|Un|Des)\s+[^\n]*«\s*(fort(?:e|es|s)?|moyen(?:ne|nes|s)?|faible(?:s)?)\s*»[^\n]*\[[^\]]+\][^\n]*\.?/gi;
        const referenceTokenRegex = /(https?:\/\/|\bwww\.|\bdoi\s*:|\b10\.\d{4,9}\/)/i;
        const bibliographicRegex = /\((?:\d{4}(?:[^)]*)|s\.\s*d\.)\)/i;
        const normRegex = /\b(FD|NF|EN|ISO|FWPA|STI|STII|STIII|C\d{2}|D\d{2})\b/i;
        const scaleLineRegex = /(?:Une?|Un|Des)\s+.*«\s*(fort(?:e|es|s)?|moyen(?:ne|nes|s)?|faible(?:s)?)\s*».*\[[^\]]+\]/i;

        const isReferenceLine = (line) => {
            const clean = String(line || '').trim();
            if (!clean) return false;
            if (/^Noter\b/i.test(clean)) return false;
            if (/^(Voir\b|Références?|Bibliographie|Sources?)\s*/i.test(clean)) return true;
            if (referenceTokenRegex.test(clean)) return true;
            if (bibliographicRegex.test(clean) && /^[*]?[A-ZÀ-ÖØ-Ý]/.test(clean)) return true;
            if (/^(Se référer\b|Normes?)\s*/i.test(clean)) return true;
            if (normRegex.test(clean) && clean.length < 180) return true;
            if (/^\*+/.test(clean)) return true;
            if (/^[A-ZÀ-ÖØ-Ý][a-zA-Zà-öø-ÿ]+,\s/.test(clean) && /\b\d{4}\b/.test(clean)) return true;
            return false;
        };

        const classFromLevelLabel = (levelRaw) => {
            const level = String(levelRaw || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
            return /^fort/.test(level)
                ? 'forte'
                : /^moy/.test(level)
                    ? 'moyenne'
                    : /^faibl/.test(level)
                        ? 'faible'
                        : 'moyenne';
        };

        const extractScaleScore = (sentence) => {
            const scoreMatch = String(sentence || '').match(/\[\s*([+-]?\d+(?:[.,]\d+)?)\s*\]/);
            if (!scoreMatch) return NaN;
            return parseFloat(String(scoreMatch[1]).replace(',', '.'));
        };

        const toScaleItem = (sentence, levelRaw, forcedClassName) => {
            const level = String(levelRaw || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
            const safeSentence = this.linkifyText(sentence.replace(/\s+/g, ' ').trim());
            const className = forcedClassName || classFromLevelLabel(level);
            const normalizedLabel = level.replace(/[^a-z]/g, '');
            const label = normalizedLabel
                ? normalizedLabel.charAt(0).toUpperCase() + normalizedLabel.slice(1)
                : (className.charAt(0).toUpperCase() + className.slice(1));
            return `<div class="detail-modal-scale-item"><span class="detail-modal-scale-pill detail-modal-scale-pill--${className}">${label}</span><span>${safeSentence}</span></div>`;
        };

        const html = blocks.map((block) => {
            let currentBlock = block;
            const firstLine = currentBlock.split('\n')[0].trim();
            const firstLineNoDot = firstLine.replace(/\.$/, '').trim();
            const firstLineNormalized = this.normalizeDetailTitle(firstLineNoDot);

            // Si le premier titre du bloc duplique le titre de la modale, on le retire du corps.
            if (modalTitleNormalized && firstLineNormalized && firstLineNormalized === modalTitleNormalized) {
                const remaining = currentBlock.split('\n').slice(1).join('\n').trim();
                if (remaining) {
                    currentBlock = remaining;
                }
            }

            const rawLines = currentBlock
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean);
            const referenceLines = [];
            const contentLines = [];

            rawLines.forEach((line, index) => {
                const nextLine = rawLines[index + 1] || '';
                const isCitationBeforeUrl = bibliographicRegex.test(line) && referenceTokenRegex.test(nextLine);
                const isScaleLine = scaleLineRegex.test(line);
                if (!isScaleLine && (isReferenceLine(line) || isCitationBeforeUrl)) {
                    referenceLines.push(line);
                } else {
                    contentLines.push(line);
                }
            });

            if (referenceLines.length) {
                referenceChunks.push(referenceLines.map((line) => this.linkifyText(line)).join('<br>'));
            }

            currentBlock = contentLines.join('\n').trim();
            if (!currentBlock) return '';

            const inlineText = currentBlock.replace(/\s*\n\s*/g, ' ').trim();
            const linesHtml = currentBlock
                .split('\n')
                .map((line) => this.linkifyText(line.trim()))
                .filter(Boolean)
                .join('<br>');

            if (!inlineText) return '';

            if (/^Noter\b/i.test(inlineText)) {
                return `<div class="detail-modal-instruction"><p>${linesHtml}</p></div>`;
            }

            if (/^(Attention|À noter|Exemple)\s*:/i.test(inlineText)) {
                return `<div class="detail-modal-note"><p>${linesHtml}</p></div>`;
            }

            if (inlineText.length <= 80 && /^[A-ZÀ-ÖØ-Ý]/.test(inlineText) && /\.$/.test(inlineText)) {
                const subtitle = inlineText.slice(0, -1).trim();
                const subtitleNormalized = this.normalizeDetailTitle(subtitle);
                if (modalTitleNormalized && subtitleNormalized === modalTitleNormalized) {
                    return '';
                }
                return `<h3 class="detail-modal-subtitle">${this.escapeHtml(subtitle)}</h3>`;
            }

            const scaleEntries = [];
            const textWithoutScale = currentBlock.replace(scaleRegex, (match, level) => {
                scaleEntries.push({
                    sentence: match,
                    level,
                    score: extractScaleScore(match)
                });
                return '';
            }).trim();

            const scaleItems = scaleEntries.map((entry) => {
                const finiteScores = scaleEntries
                    .map((item) => item.score)
                    .filter((value) => Number.isFinite(value));

                let className = classFromLevelLabel(entry.level);
                if (finiteScores.length) {
                    const minScore = Math.min(...finiteScores);
                    const maxScore = Math.max(...finiteScores);
                    if (minScore !== maxScore && Number.isFinite(entry.score)) {
                        className = entry.score === maxScore
                            ? 'forte'
                            : entry.score === minScore
                                ? 'faible'
                                : 'moyenne';
                    } else if (minScore === maxScore && Number.isFinite(entry.score)) {
                        className = 'moyenne';
                    }
                }

                return toScaleItem(entry.sentence, entry.level, className);
            });

            if (scaleItems.length >= 2) {
                const intro = textWithoutScale
                    ? `<div class="detail-modal-paragraph"><p>${textWithoutScale.split('\n').map((line) => this.linkifyText(line.trim())).filter(Boolean).join('<br>')}</p></div>`
                    : '';
                return `${intro}<div class="detail-modal-scale">${scaleItems.join('')}</div>`;
            }

            return `<div class="detail-modal-paragraph"><p>${linesHtml}</p></div>`;
        }).join('');

        const mainHtml = html || '<div class="detail-modal-paragraph"><p>À renseigner</p></div>';

        const mergedReferenceChunks = [];
        for (let i = 0; i < referenceChunks.length; i += 1) {
            const current = referenceChunks[i] || '';
            const next = referenceChunks[i + 1] || '';
            const currentHasLink = /<a\b/i.test(current);
            const nextIsLinkOnly = /^\s*<a\b[^>]*>[^<]+<\/a>\s*$/i.test(next);

            if (!currentHasLink && nextIsLinkOnly) {
                mergedReferenceChunks.push(current + '<br>' + next);
                i += 1;
            } else {
                mergedReferenceChunks.push(current);
            }
        }

        const referencesHtml = mergedReferenceChunks.length
            ? mergedReferenceChunks.map((chunk) => `<p>${chunk}</p>`).join('')
            : '<p class="detail-modal-references-empty">Aucune référence renseignée pour ce critère.</p>';

        contentEl.innerHTML = `${mainHtml}<details class="detail-modal-references"><summary>Références et ressources</summary>${referencesHtml}</details>`;
    }

    openInspectionDetailModal(fieldKey) {
        const backdrop = document.getElementById('inspectionDetailModalBackdrop');
        const titleEl = document.getElementById('inspectionDetailModalTitle');
        const contentEl = document.getElementById('inspectionDetailModalContent');

        const titles = {
            visibilite: 'Visibilité - Accessibilité',
            instrumentation: 'Instrumentation',
            integrite: 'Intégrité générale'
        };

        const contents = {
            visibilite: `Noter le niveau de visibilité et d’accessibilité aux pièces de bois évaluées.

Une visibilité et une accessibilité forte vaut pour des conditions de diagnostic qui permettent une mesure de toutes les dimensions de toutes les pièces évalués pour le lot créé.

Une visibilité et une accessibilité faible vaut pour des conditions de diagnostic pour lesquelles les mesures sont limités, voire absente.`,
            instrumentation: `Noter le niveau d’instrumentation de l’évaluation des pièces de bois.

    Une instrumentation faible vaut pour l’usage de dispositifs permettant :
    • la prise de côtes partielle,
    • un relevé photographique partiel, limité à des prises de vues globales des pièces,
    • l’utilisation de cette application ou de dispositifs similaires.

    Une instrumentation moyenne vaut pour l’usage de dispositifs permettant :
    • le relevé de l’humidité des pièces,
    • un relevé photographique incluant des prises de vues de détails des pièces,
    • la prise de côtes,
    • et pour le précédent niveau.

    Une instrumentation forte vaut pour l’usage de dispositifs permettant :
    • le classement mécanique des pièces bois à l’aide machine,
    • et pour les précédents niveaux.`,
            integrite: `Intégrité générale.

La notation de l’intégrité générale permet de statuer sur une évaluation rapide de la qualité d’un lot. Cette notation applique un coefficient qui dégrade et ajuste le prix de marché du lot donné au regard de son état général. Il est un indicateur indépendant du choix d’orientation du bois lié à la notation des critères. Il signale implicitement le degré de travail (tri, coupe, préparation…) nécessaire à la prolongation de l’usage des bois d’un lot.`
        };

        if (titleEl) titleEl.textContent = titles[fieldKey] || 'Détail';
        this.renderDetailModalContent(contentEl, contents[fieldKey] || 'À renseigner');

        if (backdrop) {
            backdrop.classList.remove('hidden');
            backdrop.setAttribute('aria-hidden', 'false');
        }
    }

    closeInspectionDetailModal() {
        const b = document.getElementById('inspectionDetailModalBackdrop');
        if (b) {
            b.classList.add('hidden');
            b.setAttribute('aria-hidden', 'true');
        }
    }

    openBioModal() {
        const b = document.getElementById('bioModalBackdrop');
        if (b) {
            b.classList.remove('hidden');
            b.setAttribute('aria-hidden', 'false');
        }
    }

    closeBioModal() {
        const b = document.getElementById('bioModalBackdrop');
        if (b) {
            b.classList.add('hidden');
            b.setAttribute('aria-hidden', 'true');
        }
    }

    openBioDetailModal(fieldKey) {
        const backdrop = document.getElementById('bioDetailModalBackdrop');
        const titleEl = document.getElementById('bioDetailModalTitle');
        const contentEl = document.getElementById('bioDetailModalContent');

        const titles = {
            purge: 'Purge',
            expansion: 'Expansion',
            integriteBio: 'Intégrité',
            exposition: 'Exposition',
            confianceBio: 'Confiance'
        };

        const contents = {
            purge: `Purge.
Noter le degré de purge des dégradations biologiques nécessaire pour le réusage des bois évalués.

Une purge « forte » vaut pour la réalisation de coupes transversales (réduction de la longueur) des pièces de bois d’une dégradation à plus de 50 cm de leurs extrémités [-3].
Une purge « moyenne » vaut pour la coupe des extrémités de bois inférieure à 50 cm [+1].
Une purge « faible » vaut pour la réalisation du retrait de dégradations superficielles, limitées à l’aubier [+3].

Voir : François Privat. Faisabilité du recyclage en boucle fermée des déchets post-consommateurs en bois massif. Génie des procédés. École centrale de Nantes, 2019.`,
            expansion: `Expansion.

Noter le degré d’expansion des dégradations biologiques des bois évalués dans sa dimension environnementale.

Une expansion « forte » vaut pour : des infections ou infestations sur plus de la moitié de la longueur du bois et/ou plus de la moitié du lot évalué, et/ou d’une activité fongique ou animale manifeste (ex : sporulations, larves, insectes, en particulier termites ou mérule*) [-10].
Une expansion « moyenne » vaut pour des infections, infestations ou moisissures localisées là où se situent les pièces de bois évaluées, sans activité manifeste [-3].
Une expansion « faible » vaut pour une absence de dégradations ou pour des infections, infestations ou moisissures (bleuissement, tâches) de surface et ponctuelles, limitées à l’aubier, sans activité manifeste [+3].

*Ministère de la Transition écologique. (2023, 30 janvier). Termites, insectes xylophages et champignons lignivores. Ministère de la Transition écologique et de la Cohésion des territoires.
https://www.ecologie.gouv.fr/politiques-publiques/termites-insectes-xylophages-champignons-lignivores

Agence Qualité Construction. (2024, janvier). Les attaques des bois par les agents biologiques. Collection Fiches Pathologie bâtiment.
https://qualiteconstruction.com/ressource/fiches-pathologie-batiment/attaques-bois-agents-biologiques/

Agence Qualité Construction. (2017). Le risque de mérule dans le bâtiment : mesures préventives.
https://qualiteconstruction.com/wp-content/uploads/2024/05/Plaquette-Risque-Merule-Batiment-Mesures-Preventives-AQC.pdf

ADEME. (s. d.). Bois contaminé (termites). Que faire de mes déchets ?
https://quefairedemesdechets.ademe.fr/dechet/bois-contamine-termites/`,
            integriteBio: `Noter le degré d’atteinte à l’intégrité des bois par des dégradations biologiques.

Une intégrité biologique « forte » vaut pour une absence de dégradation [+3].
Une intégrité biologique « moyenne » vaut pour des altérations d’ordres biologiques superficielles limitées aux premières cernes de l’aubier [+1].
Une intégrité biologique « faible » vaut pour des altérations biologiques à cœur manifestes sur plus d’un tiers de la longueur des éléments évalués [-10].

(Choix des dimensions à spécifier).

Witomski, P., Olek, W. & Bonarski, J. T. (2016). inputs in strength of Scots pine wood (Pinus silvestris L.) decayed by brown rot (Coniophora puteana) and white rot (Trametes versicolor). Construction and Building Materials, 102. https://doi.org/10.1016/j.conbuildmat.2015.10.109`,
            exposition: `Exposition biologique.

Noter le niveau d’exposition biologique historique des bois évalués au regard de leur classe d’emploi.

Une exposition biologique « forte » vaut pour les classes 5, 4 et 3.2 (ex : terrasse) [-3].
Une exposition biologique « moyenne » vaut pour la classe 3.1 (ex: bardage) [+1].
Une exposition biologique « faible » vaut pour les classes 2 et 1 (ex: charpente en toiture; solivage) [+3].

Se rapporter à la norme NF-EN-335.

Attention, l’estimation de la classe n’est pas que situationnelle (localisation dans le bâtiment) mais aussi contextuelle relative à l’usage du bâtiment. Exemple : un solivage d’un ouvrage en friche peut ainsi être réévalué en classe 2 voir 3 si des flaques peuvent être observées sur les sols intérieurs.`,
            confianceBio: `Confiance.

Noter le niveau de confiance dans l’identification des dégradations biologiques des bois évalués.

Une confiance « forte » vaut pour une certitude [3].
Une confiance « moyenne » vaut pour un doute [2].
Une confiance « faible » implique d’engager une étude complémentaire [1].`
        };

        if (titleEl) titleEl.textContent = titles[fieldKey] || 'Détail';
        this.renderDetailModalContent(contentEl, contents[fieldKey] || 'À renseigner');

        if (backdrop) {
            backdrop.classList.remove('hidden');
            backdrop.setAttribute('aria-hidden', 'false');
        }
    }

    closeBioDetailModal() {
        const b = document.getElementById('bioDetailModalBackdrop');
        if (b) {
            b.classList.add('hidden');
            b.setAttribute('aria-hidden', 'true');
        }
    }

openMechModal() {
        const backdrop = document.getElementById('mechModalBackdrop');
        if (backdrop) {
            backdrop.classList.remove('hidden');
            backdrop.setAttribute('aria-hidden', 'false');
        }
    }

closeMechModal() {
    const backdrop = document.getElementById('mechModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openMechDetailModal(fieldKey) {
    const backdrop = document.getElementById('mechDetailModalBackdrop');
    const titleEl = document.getElementById('mechDetailModalTitle');
    const contentEl = document.getElementById('mechDetailModalContent');

    const titles = {
        purgeMech: 'Purge',
        feuMech: 'Feu',
        integriteMech: 'Intégrité',
        expositionMech: 'Exposition',
        confianceMech: 'Confiance'
    };

    const contents = {
        purgeMech: `Purge.

Noter le degré de purge des dégradations mécaniques nécessaire pour le réusage des bois évalués.

Une purge mécanique « forte » vaut pour la réalisation de coupes transversales (réduction de la longueur) sur des pièces de bois à l’intégrité biologique faible et à l’intégrité mécanique faible [-3].
Une intégrité mécanique « moyenne » vaut pour la coupe des extrémités des bois, sur une longueur totale inférieure à un cinquième de la pièce, avec une intégrité biologique moyenne et une intégrité mécanique moyenne [+1].
Une intégrité mécanique « faible » vaut pour l’absence de l’élimination des défauts du bois par des coupes transversales (en dehors d’une purge de propreté, moins de 5 cm en bout des pièces) induit par une intégrité biologique et mécanique forte [+3].

Ridout, B. (2001). Timber Decay in Buildings: The Conservation Approach to Treatment. APT Bulletin: The Journal of Preservation Technology, 32(1), 58–60. https://doi.org/10.2307/1504694.
(Préconise à minima la purge des éléments endommagés).`,
        feuMech: `Feu.

Noter la tenue au feu potentielle des pièces évaluées.

Une tenue au feu « forte » vaut pour des pièces de bois combinant plusieurs de ces éléments : une volumétrie forte, une humidité moyenne, une massivité forte, une masse volumique forte à moyenne, une expansion des dégradations biologiques faible [+3].
Une tenue au feu « moyenne » vaut pour des pièces de bois combinant plusieurs de ces éléments : une volumétrie moyenne, une humidité moyenne, une massivité moyenne, une masse volumique faible, expansion des dégradations biologiques moyenne [+2].
Une tenue au feu « faible » vaut pour des pièces de bois combinant plusieurs de ces éléments : une volumétrie faible, une humidité faible, une massivité faible, une masse volumique faible, expansion des dégradations biologiques forte [+1].

Voir : Uldry, A., Husted, B. P., Pope, I., & Ottosen, L. M. (2024). A Review of the Applicability of Non-destructive Testing for the Determination of the Fire Performance of Reused Structural Timber. Journal of Nondestructive Evaluation, 43(4). https://doi.org/10.1007/s10921-024-01120-6

Jurecki, A., Wieruszewski, M., & Grześkowiak, W. (2024). Comparative Analysis of the Flammability Characteristics of Historic Oak Wood from 1869 and Contemporary Wood. In Wood & Fire Safety 2024 (p. 370‑377). Springer Nature Switzerland. https://doi.org/10.1007/978-3-031-59177-8_43

Jing, C., Renner, J. S., & Xu, Q. (2024). Research on the Fire Performance of Aged and Modern Wood. In Wood & Fire Safety 2024 (p. 378‑386). Springer Nature Switzerland. https://doi.org/10.1007/978-3-031-59177-8_44`,
        integriteMech: `Intégrité mécanique.

Noter l’intégrité mécanique des bois évalués.

Une intégrité mécanique « forte » vaut pour une absence de dégradations ou pour des dégradations superficielles, locales, limitées aux premières cernes de l’aubier, aux arêtes, aux extrémités des pièces sur moins d’un cinquième de la longueur totale du bois, répondants aux critères les plus défavorables de classement visuel des normes relatives à l’essence évaluée [+3].
Une intégrité mécanique « moyenne » vaut pour des bois disposant d’assemblages taillés dans la pièce (ex : entailles, poches, mortaises, encoches, mi-bois, percements de boulons, vis ou clous, de charbon*…), des fentes de séchage non traversantes [-3].
Une intégrité mécanique « faible » vaut pour : des dégradations, qui ne sont pas des assemblages ou ne portent pas sur ceux-ci, réparties sur plus de la moitié de la longueur ou de la section de la pièce (ex : tronçonnage partiel, arrachements …); pour des signes de ruptures/cassures qui portent atteintes à la résistance mécanique générale de la pièce, des fentes traversantes ou décollement de cerne [-10].

*Des bois ayant subi une combustion superficielle restent réutilisables dans la mesure où l’humidité n’est pas trop faible et l’état microscopique du bois est aussi évalué. Ne sont pas ici évaluées les dégradations mécaniques liées aux traitements, ni les dégradations internes des bois et/ou propres à leur croissance : nœuds et groupes de nœuds, échauffures, roulures, gélivures, pente de fil, bois de réaction ou de tension…(Voir : publication à propos).

Voir : Forest Wood Products Australia. (2025). FWPA standard G01.`,
        expositionMech: `Exposition mécanique.

Noter le niveau d’exposition mécanique historique des bois évalués au regard du couplage mécano-sportif.

Une exposition mécanique « forte » vaut pour des pièces situées en classes d’emploi 5, 4, 3.2 et 3.1 et classe 2 en cas de sous-dimensionnement manifeste de la charpente [-3].
Une exposition mécanique « moyenne » vaut pour des pièces : soumises à leur seul « poids propre » en classes 3.2 et 3.1 ou situées en classe 2 combinée à de fortes sollicitations dynamiques et statiques (ex : territoires venteux, neigeux, passage d’engin, lieu de stockage) [+1].
Une exposition mécanique « faible » vaut pour les classes 1 à 2 combinée à des faibles sollicitations dynamiques et statiques [+3].

Pour les équivalences se rapporter aux classes d’emploi NF-EN-335.

Attention, l’estimation de la classe n’est pas que situationnelle (localisation dans le bâtiment) mais aussi contextuelle relative à l’usage du bâtiment.

Exemple : un solivage d’un ouvrage en friche peut ainsi être réévalué en classe 2 voir 3 si des flaques peuvent être observées sur les sols intérieurs.

Voir, en lien avec l’humidité : Teodorescu, I., Erbaşu, R., Branco, J. M., & Tăpuşi, D. (2021). Study in the inputs of the moisture content in wood. IOP Conference Series: Earth and Environmental Science, 664(1), 012017. https://doi.org/10.1088/1755-1315/664/1/012017).

Définir un % de charge moyen sur la durée d’usage pour statuer sur le dimensionnement et son influence.`,
        confianceMech: `Confiance.

Noter le niveau de confiance dans l’identification des dégradations mécaniques des bois évalués.

Une confiance « forte » vaut pour une certitude [+3].
Une confiance « moyenne » vaut pour un doute [+2].
Une confiance « faible » implique d’engager une étude complémentaire [+1].`
    };

    if (titleEl) titleEl.textContent = titles[fieldKey] || 'Détail';
    this.renderDetailModalContent(contentEl, contents[fieldKey] || 'À renseigner');

    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeMechDetailModal() {
    const backdrop = document.getElementById('mechDetailModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openUsageModal() {
    const backdrop = document.getElementById('usageModalBackdrop');
    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeUsageModal() {
    const backdrop = document.getElementById('usageModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openUsageDetailModal(fieldKey) {
    const backdrop = document.getElementById('usageDetailModalBackdrop');
    const titleEl = document.getElementById('usageDetailModalTitle');
    const contentEl = document.getElementById('usageDetailModalContent');

    const titles = {
        confianceUsage: 'Confiance',
        durabiliteUsage: 'Durabilité naturelle',
        classementUsage: 'Classement estimé',
        humiditeUsage: 'Humidité',
        aspectUsage: 'Aspect'
    };

    const contents = {
        confianceUsage: `Confiance.

Noter le niveau de confiance de la résistance mécanique des bois évalués.

Une confiance « forte » vaut pour une certitude [+3].
Une confiance « moyenne » vaut pour un doute [+2].
Une confiance « faible » implique d’engager une étude complémentaire [+1].`,
        durabiliteUsage: `Durabilité naturelle.

Noter la durabilité naturelle de l’essence de bois identifiée.

Cette durabilité biologique globale est appréciée à partir des classes de l’EN 350 vis‑à‑vis des champignons, termites, coléoptères et xylophages marins (agents biologiques).

Une durabilité naturelle « forte » vaut pour les bois des essences de classe 1 ou 2 vis‑à‑vis des champignons et ne présentant pas de classe supérieure à 2 et A pour les autres agents biologiques [+3].
Une durabilité naturelle « moyenne » vaut pour les bois des essences de classe 3 vis‑à‑vis des champignons, et/ou présentant au plus une classe 3 ou M pour un autre agent biologique, sans classe 4 ou 5 [+2].
Une durabilité naturelle « faible » vaut pour les essences de classes 4 ou 5 vis‑à‑vis des champignons et/ou présentant au moins une classe 4, 5 ou S pour l’un des autres agents biologiques [+1].

À noter : La présence d’aubier peut être prise en compte : lorsque la largeur de l’aubier est identifiable et supérieure ou égale à 5 cm, ou est indiqué comme « non résistant » dans l’EN 350, la note est abaissée d’un niveau.`,
        classementUsage: `Noter la classe mécanique estimée des bois évalués (couramment relative à la flexion sur chant).

Un classement estimé « fort » vaut pour : un classement visuel STI, un classement de résistance supérieur ou égal à C30 (résineux); un classement visuel 1 (chêne), un classement de résistance supérieur ou égal à D30 (feuillus) [+3].
Un classement estimé « moyen » vaut pour : un classement visuel STII et STIII, un classement de résistance strictement inférieur à C30 et supérieur ou égal à C18 (résineux, peuplier et châtaigner); un classement visuel 2 et 3 (chêne), un classement de résistance strictement inférieur à D30 et supérieur ou égal à D18 (feuillus) [+2].
Un classement estimé « faible » vaut pour : un classement visuel strictement inférieur à STIII, un classement de résistance strictement inférieur à C18 (résineux et peuplier); un déclassement visuel (chêne), un classement de résistance strictement inférieur à D18 (feuillus) [+1].

Les estimations peuvent être effectuées visuellement ou à l’aide d’instruments dédiés.

Les estimations instrumentés sont donc ici simplifiées pour correspondre aux classement visuels.

Ce classement ne vaut pas pour une mesure à la rupture et ne vaut pas uniformément pour l’ensemble des formes de sollicitations du bois ni de toutes les essences.

Se référer aux normes :
• NF EN 14081-1,
• EN 338,
• NF EN 1912 (Compatibilité Europe et Canada),
• NF B52-001-1 (Voir en particulier l’Annexe A « Correspondance entre les catégories visuelles et les classes de résistance mécanique »)
• NF B52-001-2 en vue de compléter la catégorisation.

Pour rappel sur l’usage du classement voir : Ridley-Ellis, D., Stapel, P., & Baño, V. (2015, April 15-17). Strength grading of sawn timber in Europe - an explanation for engineers.. COST Action FP 1004 - Final Meeting. http://researchrepository.napier.ac.uk/id/eprint/8232.

Attention, il n’y a pas de consensus sur le transfert d’usage des méthodes conçu pour le bois neuf vers le bois d’occasion : Arriaga, F., Osuna-Sequera, C., Bobadilla, I., & Esteban, M. (2022). Prediction of the mechanical properties of timber members in existing structures using the dynamic modulus of elasticity and visual grading parameters. Construction and Building Materials, 322, 126512. https://doi.org/10.1016/j.conbuildmat.2022.126512

Kauniste, M., Saarelaan, T., Just, A., & Tuhkanen, E. (2025). Assessment of strength and stiffness properties of reclaimed structural timber of norway spruce. In World Conference on Timber Engineering 2025 (p. 3484‑3493). World Conference On Timber Engineering 2025. World Conference on Timber Engineering 2025. https://doi.org/10.52202/080513-0427`,
        humiditeUsage: `Humidité.

Noter l’humidité des bois évalués.

Une humidité « forte » vaut pour des pièces de bois dont l’humidité mesurée est supérieure à 22%* [-3].
Une humidité « moyenne » vaut pour des pièces de bois dont l’humidité est strictement inférieure à 22% et strictement supérieure à 8% [+3].
Une humidité « faible » vaut pour des pièces de bois dont l’humidité est strictement inférieure à 8%** [+1].

Se référer aux normes :
NF EN 384 (Plages courantes des tests 8 à 18%).
FD P20-651 (20%).
NF EN 335 d'après ISO 3130 (20%).
NF P03-200 (20%).

*22% étant le seuil maximum pour des Fermettes ou « commercialement sec », voir norme NF B51-002. 14081-1 : max 24% pour une mesure ponctuel.

Voir aussi 13183-2 et 13183-3. L'équilibre hygroscopique des bois est aussi fonction de la région géographique.

À savoir que l'humidité relevée peut ne pas refléter l'humidité à cœur des bois évalués, qui sont susceptibles d'être plus secs. La mesure de cette valeur étant aussi variable selon les conditions climatiques de la mesure, du matériel employé et de la zone de mesure.

**8% étant un seuil pour un usage en parqueterie. Une humidité inférieure ou égale à 8% correspond à des conditions climatiques plus particulières aux ouvrages de menuiserie.

Voir B.3 de l'Annexe B de la norme NF P63-202-1.

Voir l'Annexe B de la norme EN 942. Pour la mesure de l'humidité se rapporter à la série de normes NF EN 13183. Pour une approche par lot voir : ISO 4470.

Pour la technique in-situ voir la NF EN 13183-2.
Fu, Z., Chen, J., Zhang, Y., Xie, F., & Lu, Y. (2023). Review on Wood Deformation and Cracking during Moisture Loss. Polymers, 15(15), 3295. https://doi.org/10.3390/polym15153295

Glass, S.V.; Zelinka, S.L. 2021. Chapter 4: Moisture relations and physical properties of wood. In: Wood handbook—wood as an engineering material. General Technical Report FPL-GTR-282. Madison, WI: U.S. Department of Agriculture, Forest Service, Forest Products Laboratory.

24,3% étant une valeur extrême d'équilibre, au-delà une humidification d'eau liquide est fort probable.

En principe une humidité forte dégrade significativement les propriétés mécaniques des bois.
Roshchuk, M., Homon, S., Pavluk, A., Gomon, S., Drobyshynets, S., Romaniuk, M., Smal, M., & Dziubynska, O. (2024). Effect of long-term moisture on the mechanical properties of wood: an experimental study. Procedia Structural Integrity, 59, 718‑723. https://doi.org/10.1016/j.prostr.2024.04.102

Serdar, B., Sagiroglu Demirci, O., Ozturk, M., Aksoy, E., & Kara Alasalvar, M. A. (2025). The Effect of Different Relative Humidity Conditions on Mechanical Properties of Historical Fir Wood Under the Influence of Natural Aging. Drvna Industrija, 76(3), 287‑298. https://doi.org/10.5552/drvind.2025.0211

En principe une humidité faible resserre les fibres et accentue la résistance du bois.
Zhou, J., Tian, Q., Nie, J., Cao, P., & Tan, Z. (2024). Mechanical properties and damage mechanisms of woods under extreme environmental conditions. Case Studies in Construction Materials, 20, e03146. https://doi.org/10.1016/j.cscm.2024.e03146

Kherais, M., Csébfalvi, A., Len, A., Fülöp, A., & Pál-Schreiner, J. (2024). The effect of moisture content on the mechanical properties of wood structure. Pollack Periodica, 19(1), 41‑46. https://doi.org/10.1556/606.2023.00917

Jaskowska-Lemańska, J., & Przesmycka, E. (2020). Semi-Destructive and Non-Destructive Tests of Timber Structure of Various Moisture Contents. Materials, 14(1), 96. https://doi.org/10.3390/ma14010096`,
        aspectUsage: `Noter l’aspect des bois évalués pour en déterminer les usages possibles.

Un aspect « fort » vaut pour des bois de classes d’aspects 0A, 0B, 1 (résineux) ou QPA, QBA, QB1 et QFA QFA1-a/b (chêne) ou FBA, FB1, FSA, FS1, FF1, FDA (hêtre) ou A (bois rond résineux et feuillus) [+3].
Un aspect « moyen » vaut pour des bois de classes d’aspects 2 (résineux) ou QP1, QB2 et QF2 (chêne) ou FB2, FS2, FF2, FD1 (hêtre) ou B (bois rond résineux et feuillus) [+2].
Un aspect « faible » vaut pour des bois de classes d’aspects 3A et 3B (résineux) ou QPC, QB3 et QF3 (chêne) ou FB3, FS3, FF3, FD2 (hêtre) ou C et D (bois rond résineux et feuillus) [+1].

Se référer aux normes :
NF B52-001-1 (Voir en particulier l’Annexe A « Correspondance entre les catégories visuelles et les classes de résistance mécanique »).
Voir EN-975-1/2 : chêne-hêtre / peuplier,
NF B53-801 (châtaigner),
NF EN-1611-1 (résineux : épicéas, sapins, pins, douglas et mélèzes),
EN 1927-1/2/3 (bois rond résineux : épicéas-sapins / pins / mélèzes-douglas),
EN 1316-1/2 (bois rond feuillus : chêne-hêtre/peuplier).

Compte tenu d’un objectif d’allongement de la durée d’usage du bois, ne sont pas prises en compte ici les normes relatives aux produits de logistique (ex : NF EN 12246).

Pour les différentes dénominations de défauts se reporter à la série de normes ISO dédiées : ISO 737, ISO 1029, ISO 1030, ISO 1031, ISO 2299, ISO 2300, ISO 2301, ISO 8904.`
    };

    if (titleEl) titleEl.textContent = titles[fieldKey] || 'Détail';
    this.renderDetailModalContent(contentEl, contents[fieldKey] || 'À renseigner');

    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeUsageDetailModal() {
    const backdrop = document.getElementById('usageDetailModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openDenatModal() {
    const backdrop = document.getElementById('denatModalBackdrop');
    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeDenatModal() {
    const backdrop = document.getElementById('denatModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openDenatDetailModal(fieldKey) {
    const backdrop = document.getElementById('denatDetailModalBackdrop');
    const titleEl = document.getElementById('denatDetailModalTitle');
    const contentEl = document.getElementById('denatDetailModalContent');

    const titles = {
        depollutionDenat: 'Dépollution',
        contaminationDenat: 'Contamination',
        durabiliteConfDenat: 'Durabilité conférée',
        confianceDenat: 'Confiance',
        naturaliteDenat: 'Naturalité'
    };

    const contents = {
        depollutionDenat: `Dépollution.

Noter le degré de dépollution nécessaire à la réappropriation des bois évalués.

Une dépollution « forte » vaut pour des bois disposant de dégradations biologiques, nécessitant une purge forte, et d’une intégrité faible (ex: pourriture à cœur), ou des peints ou traités, en surface (non imprégnés), mécaniquement extractibles* (ex : peinture plombée) [-3].
Une dépollution « moyenne » vaut pour des bois nécessitant un nettoyage conséquent lié à la présence de poussières (brossage, eau à haute pression) et autres formes de polluants assimilés (poussière de plâtre, boue, terres*, moisissures superficielles, liés à la déconstruction) et/ou des corps étrangers de surface (clous, vis et autres formes de connecteurs métalliques, ou d’objets liés à l’usage du bâtiment, etc…) [+1].
Une dépollution « faible » vaut pour des bois conservés à l’état brut, exempts de polluants (y compris traitements préventifs ou curatifs), et nécessitant peu de nettoyage [+3].

* Voir : François Privat. Faisabilité du recyclage en boucle fermée des déchets post-consommateurs en bois massif. Génie des procédés. École centrale de Nantes, 2019, page 36.`,
        contaminationDenat: `Contamination.

Noter le degré de contamination des bois évalués.

Une contamination « forte » vaut pour : des bois dits de classe C*, défini comme des déchets dangereux (ex : créosote); des bois imprégnés dont l’agent de traitement est inconnu, retiré du marché, ou dont la teneur de certaines substances est supérieure aux exigences de recyclage en panneaux* et impropre à la combustion** dans certaines installations dédiées; des bois pour lesquels une expansion forte des dégradations biologiques (termites et mérules en particulier) est constatée [-10].
Une contamination « moyenne » vaut pour des bois imprégnés dont les agents employés sont encore présent sur le marché, ou pour lesquels une dépollution forte est possible; ou dits de classes BR1, BR2 [+1].
Une contamination « faible » vaut pour de bois de classe A, dépollution moyenne et faible [+3].

Voir : FCBA, Référentiel de classification des déchets bois (2022). EPF, EN ISO 17225-1, Ineris (2021), etc.`,
        durabiliteConfDenat: `Durabilité conférée.

Noter la durabilité conférée des bois évalués.

Une durabilité conférée « forte » vaut pour des bois disposant de traitement les élevant à une classe équivalente à une durabilité naturelle forte [+1].
Une durabilité conférée « moyenne » vaut pour des bois disposant de traitement les élevant à une classe équivalente à une durabilité naturelle moyenne [+2].
Une durabilité conférée « faible » vaut pour des bois conservés à l’état brut ne disposant pas de traitements [+3].`,
        confianceDenat: `Confiance.

    Noter le niveau de confiance de la dénaturation des bois évalués.

Une confiance « forte » vaut pour une certitude [+3].
Une confiance « moyenne » vaut pour un doute [+2].
    Une confiance « faible » implique d’engager une étude complémentaire [+1].`,
        naturaliteDenat: `Naturalité.

Noter le degré de naturalité des bois évalués.

Une naturalité « forte » vaut pour des bois bruts et ronds. Libres de finition chimique  et disposant d’une durabilité conférée faible [+3].
Une naturalité « moyenne » vaut pour des bois bruts et d'ingénierie, rabotés, brossés, etc. Libres de finition chimique  et disposant d’une durabilité conférée faible [+2].
Une naturalité « faible » vaut pour des bois peints, vernis, traités, disposant d’une durabilité conférée forte à moyenne, dont l’apparence n’est pas celle du bois au terme de sa première transformation en dehors des modifications d’aspect liées au vieillissement naturel (poussière, assombrissement, grisaillement, etc.) [+1].`
    };

    if (titleEl) titleEl.textContent = titles[fieldKey] || 'Détail';
    this.renderDetailModalContent(contentEl, contents[fieldKey] || 'À renseigner');

    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeDenatDetailModal() {
    const backdrop = document.getElementById('denatDetailModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openDebitModal() {
    const backdrop = document.getElementById('debitModalBackdrop');
    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeDebitModal() {
    const backdrop = document.getElementById('debitModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openDebitDetailModal(fieldKey) {
    const backdrop = document.getElementById('debitDetailModalBackdrop');
    const titleEl = document.getElementById('debitDetailModalTitle');
    const contentEl = document.getElementById('debitDetailModalContent');

    const titles = {
        regulariteDebit: 'Régularité',
        volumetrieDebit: 'Volumétrie',
        stabiliteDebit: 'Stabilité',
        artisanaliteDebit: 'Artisanalité',
        rusticiteDebit: 'Rusticité'
    };

    const contents = {
        regulariteDebit: `Régularité.

Noter le degré de régularité du débit des bois évalués.

Une régularité « forte », ou parallélépipédique forte vaut pour des pièces de bois dont les arêtes sont parallèles et/ou perpendiculaires entre elles et des extrémités anguleuses sur moins de 25 cm [+3].
Une régularité « moyenne » vaut pour des pièces qui comportent des flaches localisés et des extrémités anguleuses sur plus de 26 cm [+2].
Une régularité « faible » vaut pour des pièces qui comportent plusieurs flaches étendus toute la longueur de la pièce, demi-rond ou rond [+1].`,
        volumetrieDebit: `Volumétrie.

Noter l’importance de la volumétrie des bois évalués.

Une volumétrie « forte » vaut pour des pièces de bois d’un volume strictement supérieur à 0,1 m³ [+3].
Une volumétrie « moyenne » vaut pour des pièces d’un volume inférieur ou égal à 0,1 m³ et supérieur ou égal à 0,05 m³ [+2].
Une volumétrie « faible » vaut pour des pièces d’un volume strictement inférieur à 0,05 m³ [+1].`,
        stabiliteDebit: `Stabilité.

    Noter le rapport entre élancement et stabilité de la pièce de bois évaluée, en combinant le rapport d'élancement L/h (résistance au flambement axial) et le rapport de section b/h (résistance au déversement latéral).

    Une stabilité « forte » vaut pour des pièces dont le rapport L/h est inférieur ou égal à 18 et le rapport b/h supérieur ou égal à 0,4 [+3].
    Une stabilité « moyenne » vaut pour des pièces ne relevant pas de la catégorie « forte », soit : (L/h ≤ 18 et 0,25 ≤ b/h < 0,4) ou (18 < L/h ≤ 28 et b/h ≥ 0,25) [+2].
    Une stabilité « faible » vaut pour des pièces dont le rapport L/h est strictement supérieur à 28 ou le rapport b/h strictement inférieur à 0,25 [+1].
    En cas de rapport h/b très élevé (h/b > 4, équivalent à b/h < 0,25), la pièce est directement classée « faible » indépendamment de L/h, conformément aux seuils de déversement latéral de l'Eurocode 5 (CEN, 2004, § 6.3.3).

    Références et ressources.

    CEN — European Committee for Standardization. (2004). EN 1995-1-1 : Eurocode 5 — Design of timber structures — Part 1-1 : General — Common rules and rules for buildings. CEN.
    
    Hassan, O. A. B. (2019). On the structural stability of timber members to Eurocode. Mechanics Based Design of Structures and Machines, 47(5), 647–657. https://doi.org/10.1080/15397734.2019.1633344`,
        artisanaliteDebit: `Artisanalité.

Noter le degré d’artisanat des bois évalués.

Une artisanalité « forte » vaut pour : des bois de charpente débités à la main et/ou faisant partie intégrante d’un système constructif propre (ex : ferme…) dont les assemblages « bois-bois » sont principalement chevillés [+3].
Une artisanalité « moyenne » vaut pour des bois de charpente sciés faisant partie intégrante d’un système constructif (ex : arbalétrier) [+2].
Une artisanalité « faible » vaut pour des bois sciés unitaires (ex : solive, chevron, panne, poteau…) [+1].`,
        rusticiteDebit: `Rusticité.

Noter le degré de rusticité des bois évalués.

Une rusticité « forte » vaut pour des bois ronds à demi-rond, débités à la main, écorcés et/ou sommairement sciés sur deux faces ou moins, droits ou courbes [+3].
Une rusticité « moyenne » vaut pour des bois de charpente débités à la main à section parallélépipédique, droits ou courbes [+2].
Une rusticité « faible » vaut pour des bois sciés et bruts [+1].`
    };

    if (titleEl) titleEl.textContent = titles[fieldKey] || 'Détail';
    this.renderDetailModalContent(contentEl, contents[fieldKey] || 'À renseigner');

    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeDebitDetailModal() {
    const backdrop = document.getElementById('debitDetailModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openGeoModal() {
    const backdrop = document.getElementById('geoModalBackdrop');
    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeGeoModal() {
    const backdrop = document.getElementById('geoModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openGeoDetailModal(fieldKey) {
    const backdrop = document.getElementById('geoDetailModalBackdrop');
    const titleEl = document.getElementById('geoDetailModalTitle');
    const contentEl = document.getElementById('geoDetailModalContent');

    const titles = {
        adaptabiliteGeo: 'Adaptabilité',
        massiviteGeo: 'Massivité',
        deformationGeo: 'Déformation',
        industrialiteGeo: 'Industrialité',
        inclusiviteGeo: 'Inclusivité'
    };

    const contents = {
        adaptabiliteGeo: `Adaptabilité.

Noter le degré d’adaptabilité de la géométrie des bois évalués.

Une adaptabilité « forte » vaut pour des pièces de bois sans singularités sur leurs chants et à régularité forte [+3].
Une adaptabilité « moyenne » vaut pour des pièces de bois qui comportent des parties taillées sur leur chant pour des assemblages [+2].
Une adaptabilité « faible » vaut pour des pièces qui comportent des flaches étendus sur toute la longueur de la pièce et plus de la moitié du chant, demi-rond, rond, ou qui comportent des parties taillées pour des assemblages sur plus de la moitié de leur longueur [+1].`,
        massiviteGeo: `Massivité.

Noter l’importance de la massivité des bois évalués.

Une massivité « forte » vaut pour les pièces de bois massif et de Bois Massif Abouté (BMA) d’une épaisseur strictement supérieure à 75 mm, pour les pièces en BLC avec lamelles > 35 mm et chant > 150 mm, ou pour les pièces en BLC avec lamelles ≤ 35 mm et chant > 210 mm [+3].
Une massivité « moyenne » vaut pour des configurations intermédiaires (28–75 mm, etc.) [+2].
Une massivité « faible » vaut pour les pièces les plus fines (≤ 28 mm) [+1].`,
        deformationGeo: `Déformation.

Noter l’importance des déformations des bois évalués.

Une déformation « forte » vaut pour des pièces présentant torsion, gauchissement, flèche, tuilage marqués [-3].
Une déformation « moyenne » vaut pour des déformations partielles sur la longueur (purge possible) [+1].
Une déformation « faible » vaut pour des pièces respectant les critères usuels de flèche/gauchissement des normes [+3].`,
        industrialiteGeo: `Industrialité.

Noter le degré d’industrialité des bois évalués.

Une industrialité « forte » vaut pour des bois sciés dits d'ingénierie : Bois Massif Abouté (BMA) ou Reconstitué (BMR), Bois Lamellé-Collé (BLC) ou Lamellé-croisé (CLT) et Contre-Collé (CC) [+3].
Une industrialité « moyenne » vaut pour des Bois Brut Sec (BBS), Bois Brut Séché (BRS), les Bois d’Ossature (BO) et de Fermette (BF) [+2].
Une industrialité « faible » vaut pour les bois Brut Non Taillé (BNT), Bois Équarri Non Scié (BENS) ou Bois Avivé (BA) [+1].`,
        inclusiviteGeo: `Inclusivité.

Noter le degré d’inclusivité des bois évalués.

Une inclusivité « forte » vaut pour des bois sciés, droits, régularité forte et unitaire, avec taux de similarité élevé [+3].
Une inclusivité « moyenne » vaut pour des bois sciés à régularité moyenne/unitaire ou intégrés à un système constructif, taux de similarité moyen à élevé [+2].
Une inclusivité « faible » vaut pour des bois à régularité faible ou rusticité forte/moyenne, taux de similarité moyen à faible [+1].`
    };

    if (titleEl) titleEl.textContent = titles[fieldKey] || 'Détail';
    this.renderDetailModalContent(contentEl, contents[fieldKey] || 'À renseigner');

    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeGeoDetailModal() {
    const backdrop = document.getElementById('geoDetailModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}



openEssenceModal() {
    const backdrop = document.getElementById('essenceModalBackdrop');
    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeEssenceModal() {
    const backdrop = document.getElementById('essenceModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openEssenceDetailModal(fieldKey) {
    const backdrop = document.getElementById('essenceDetailModalBackdrop');
    const titleEl = document.getElementById('essenceDetailModalTitle');
    const contentEl = document.getElementById('essenceDetailModalContent');

    const titles = {
        confianceEssence: 'Confiance',
        rareteEcoEssence: 'Rareté',
        masseVolEssence: 'Masse volumique',
        rareteHistEssence: 'Rareté commerciale',
        singulariteEssence: 'Singularité essence'
    };

    const contents = {
        confianceEssence: `Confiance.

Noter le niveau de confiance de la reconnaissance de l’essence et des caractéristiques notées ci-après qui lui sont relatives.

Une confiance « forte » vaut pour une certitude [+3].
Une confiance « moyenne » vaut pour un doute [+2].
Une confiance « faible » implique d’engager une étude complémentaire [+1].`,
        rareteEcoEssence: `Rareté.

Noter le niveau de rareté de l'essence.

À noter : Cette notation est fonction de l'aire géographique continentale de la localisation de cette évaluation. En Europe, on peut se rapporter aux exemples des catégories cités ci-après.

Une rareté « forte » est attribuée à une essence qui ne pousse pas sur l'aire géographique, rare et le plus souvent importée [+3].
Une rareté « moyenne » est attribuée à une essence peu commune sur l'aire géographique [+2].
Une rareté « faible » est attribuée à une essence commune sur l'aire géographique [+1].

Peuvent être considérées comme « rares » les essences de bois suivantes : Teck, iroko, padouk, wengé, merbau, azobé, ipé.

Peuvent être considérées comme « peu communes » les essences de bois suivantes : Alisier, cormier, noyer, orme, tilleul, aulne, charme, robinier, érable, platane, merisier.

Peuvent être considérées comme « communes » les essences de bois suivantes : Épicéa, pin maritime, pin sylvestre, sapin, douglas, chêne, hêtre, peuplier, bouleau, mélèze, frêne, châtaigner.

Voir Benoit, Y. (2018). Guide des essences de bois : 100 essences, comment les reconnaître, les choisir et les employer (4e éd.). Eyrolles.
Et/ou se rapporter à la norme EN 13556.`,
        masseVolEssence: `Masse volumique.

Noter le niveau de la masse volumique « ρ » du bois.

Une masse volumique « forte » vaut pour des bois dits très lourds à lourds dont la ρ est supérieure à 750 kg/m3 [+3]. 
Une masse volumique « moyenne » vaut pour des bois dits mi-lourds à légers dont la ρ se situe entre 450 et 750 kg/m3 [+2].
Une masse volumique « faible » vaut pour des bois dits très légers dont la ρ est inférieure à 450 kg/m3 [+1]. 

Attention cette valeur doit être mesurée ou estimée au regard de l'humidité relative du bois qui est dans les normes de l'ordre de 12% +ou- 3% (pour la précision voir EN 14081-1+A1.)

Voir la norme NF B51-002.
Voir Yang, H., Wang, S., Son, R., Lee, H., Benson, V., Zhang, W., Zhang, Y., Zhang, Y., Kattge, J., Boenisch, G., Schepaschenko, D., Karaszewski, Z., Stereńczak, K., Moreno-Martínez, Á., Nabais, C., Birnbaum, P., Vieilledent, G., Weber, U., & Carvalhais, N. (2024). Global patterns of tree wood density. Global change biology, 30(3), e17224. https://doi.org/10.1111/gcb.17224

Cuny, H., Bontemps, J.-D., Besic, N., Colin, A., Hertzog, L., Le Squin, A., Marchand, W., Vega, C., and Leban, J.-M.: Wood density variation in European forest species: drivers and implications for multiscale biomass and carbon assessment in France, EGUsphere [preprint], https://doi.org/10.5194/egusphere-2025-4152, 2025.`,
        rareteHistEssence: `Rareté commerciale.

Noter le niveau de rareté commerciale de l’essence au regard du marché et de l’évolution de son exploitation.

À noter : S'en référer à l'histoire de l'exploitation de l'essence identifiée.

Une rareté commerciale « forte » est attribuée à une essence rare qui n’est plus ou pas disponible sur le marché [+3].
Une rareté commerciale « moyenne » est attribuée à une essence peu commune sur le marché [+2].
Un niveau commercial « faible » est attribué à une essence commune sur le marché [+1].`,
        singulariteEssence: `Singularité de l'essence

Noter le niveau de singularité de l’essence au regard de ses particularités esthétiques : grain ou veinage, fil, couleur, odeur, forme et dessin.

Une singularité « forte » est donnée aux essences à attributs esthétiques reconnus et recherchés (ex : noyer, olivier) [+3].
Une singularité « moyenne » est donnée aux essences aux attributs esthétiques reconnaissables à l’œil nu (ex : pins) [+2].
Une singularité « faible » est donnée aux essences aux attributs esthétiques peu spécifiques (ex : bois blancs) [+1].

Voir EN 14081-1+A1 « B2. Code de marquage pour les essence combinées.`
    };

    if (titleEl) titleEl.textContent = titles[fieldKey] || 'Détail';
    this.renderDetailModalContent(contentEl, contents[fieldKey] || 'À renseigner');

    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeEssenceDetailModal() {
    const backdrop = document.getElementById('essenceDetailModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openAncienModal() {
    const backdrop = document.getElementById('ancienModalBackdrop');
    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeAncienModal() {
    const backdrop = document.getElementById('ancienModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openAncienDetailModal(fieldKey) {
    const backdrop = document.getElementById('ancienDetailModalBackdrop');
    const titleEl = document.getElementById('ancienDetailModalTitle');
    const contentEl = document.getElementById('ancienDetailModalContent');

    const titles = {
        confianceAncien: 'Confiance',
        amortissementAncien: 'Amortissement',
        vieillissementAncien: 'Vieillissement',
        microhistoireAncien: 'Micro-histoire',
        demontabiliteAncien: 'Démontabilité'
    };

    const contents = {
        confianceAncien: `Confiance.

Noter le niveau de confiance dans l’identification de l’ancienneté des bois évalués.

Une confiance « forte » vaut pour une certitude [+3].
Une confiance « moyenne » vaut pour un doute [+2].
Une confiance « faible » implique d’engager une étude complémentaire [+1].`,
        amortissementAncien: `Amortissement.

Noter le degré d’amortissement biologique des bois évalués.

À noter : Noter le rapport entre l’âge estimé de l’arbre lors de son abattage et la durée qui sépare cette date ou période d’abattage de la récupération du bois, qu’on nommera durée d’usage par simplification.
Nécessite d’estimer l’âge de l’arbre par comptage des cernes visibles et de prendre en compte le type de débit de la section. Une estimation peut aussi être réalisée via l’historique de l’ouvrage, afin de déterminer les dates de mise en service et de récupération de la pièce.

Un amortissement biologique « fort » vaut pour un rapport supérieur ou égal à 1, signifiant que la durée d’usage excède le temps de croissance de l’arbre [+3].
Un amortissement biologique « moyen » vaut pour un rapport strictement inférieur à 1 et strictement supérieur à 0,5 [+1].
Un amortissement biologique « faible » vaut pour un rapport inférieur ou égal à 0,5 [-3].

Voir : Eugénie Cateau; Laurent Larrieu; Daniel Vallauri; Jean-Marie Savoie; Julien Touroult; Hervé Brustel. Ancienneté et maturité : deux qualités complémentaires d’un écosystème forestier. Comptes Rendus. Biologies, Volume 338 (2015) no. 1, pp. 58-73. doi: 10.1016/j.crvi.2014.10.004

À propos de la datation voir : Inrap (13 décembre 2020). La dendrochronologie : potentialités et nouveaux enjeux pour l’archéologie. Rencontres scientifiques et techniques de l'Inrap. En ligne : https://doi.org/10.58079/ujy9`,
        vieillissementAncien: `Vieillissement.

Noter le degré de vieillissement des bois évalués.

Un vieillissement « fort » vaut pour des bois combinant plusieurs éléments suivants : une durée d’usage de plus de 150 ans, une déformation forte, une exposition biologique et mécanique forte à moyenne, une intégrité biologique moyenne à faible, une humidité forte ou faible [-3].
Un vieillissement « moyen » vaut pour des bois combinant plusieurs éléments suivants : une durée d’usage entre 51 et 149 ans, une déformation moyenne, une exposition biologique et mécanique moyenne, une humidité forte ou faible [+1].
Un vieillissement « faible » vaut pour des bois combinant plusieurs éléments suivants : une durée d’usage de moins de 50 ans, une déformation faible, une exposition biologique et mécanique faible, une humidité moyenne [+3].

En complément de ces observations et en fonction des études complémentaires réalisées, une étude de l’état microscopique du bois permettra de confirmer l’état de dégradation à cette échelle.

Zhang, J., Li, T., Lu, W., Wu, Q., Huang, J., Jia, C., Wang, K., Feng, Y., Chen, X., & Song, F. (2024). Influence of wood species and natural aging on the mechanics properties and microstructure of wood. Journal of Building Engineering, 91, 109469. https://doi.org/10.1016/j.jobe.2024.109469

Moumakwa, N. L., & Hughes, M. (2025). Assessing changes in the mechanical properties of wood recovered from demolished buildings. Construction and Building Materials, 504, 144612. https://doi.org/10.1016/j.conbuildmat.2025.144612

Kojima, E., Kato, H., Watanabe, Y., & Yamamoto, K. (2024). Mechanical Properties of Wooden Structural Members from a Historical Japanese Temple Under Renovation – and the Effects of Cross-Sectional Voids and Aging. International Journal of Architectural Heritage, 19(10), 2390-2397. https://doi.org/10.1080/15583058.2024.2432340

Zou, Q., Wang, S., Hu, J., & Zou, F. (2025). Experimental Study on the Evolution and Mechanism of Mechanical Properties of Chinese Fir Under Long-Term Service. Buildings, 15(24), 4500. https://doi.org/10.3390/buildings15244500

Machado, J. S., Pereira, F., & Quilhó, T. (2019). Assessment of old timber members: Importance of wood species identification and direct tensile test information. Construction and Building Materials, 207, 651-660. https://doi.org/10.1016/j.conbuildmat.2019.02.168

Nocetti, M., Aminti, G., Vicario, M., & Brunetti, M. (2024). Mechanical properties of ancient wood structural elements assessed by visual and machine strength grading. Construction and Building Materials, 411, 134418. https://doi.org/10.1016/j.conbuildmat.2023.134418`,
        microhistoireAncien: `Micro-histoire.

Noter le niveau d’information relatif à la micro-histoire des bois.

Une micro-histoire « forte » vaut pour la combinaison de plusieurs de ces éléments : inscription de l’ouvrage dans une histoire nationale, dimension historique de ses occupants ou activités y ayant eu cours ; inscription de son système constructif dans une tradition identifiée ou unique d’échelle nationale (ex : charpente d’église) [+3].
Une micro-histoire « moyenne » vaut pour l’un de ces éléments : inscription de l’ouvrage dans une histoire nationale ou locale, dimension historique de ses occupants ou activités y ayant eu cours ; inscription de son système constructif dans une tradition identifiée ou unique d’échelle locale (ex : pan de bois) [+2].
Une micro-histoire « faible » vaut pour des bois dont l’origine est inconnue, incertaine ou pour lesquels seul un faisceau d’indices limités ne permet pas de les inscrire dans une perspective historique [+1].

Ermakoff, I. (2018). La microhistoire au prisme de l’exception. Vingtième Siècle. Revue d'histoire, 139(3), 193-211. https://doi.org/10.3917/ving.139.0193

Christelle Nau, « Le patrimoine culturel immatériel comme outil d’étude et de valorisation d’un savoir-faire : la fabrication de terre cuite architecturale dans les Pyrénées-Orientales », Patrimoines du Sud [En ligne], 11 | 2020, mis en ligne le 10 mars 2020.

Vanessa Py-Saragaglia, Sylvain Burri, Léonel Fouédjeu. Les forêts montagnardes du versant nord des Pyrénées. Sylvie Bépoix ; Hervé Richard. La forêt au Moyen Âge, Les Belles Lettres, pp. 276-299, 2019.

Terlikowski, W. (2023). Problems and Technical Issues in the Diagnosis, Conservation, and Rehabilitation of Structures of Historical Wooden Buildings with a Focus on Wooden Historic Buildings in Poland. Sustainability, 15(1), 510. https://doi.org/10.3390/su15010510`,
        demontabiliteAncien: `Démontabilité.

Noter la démontabilité et la remontabilité des bois évalués.

    Une démontabilité / remontabilité « forte » vaut pour des systèmes constructifs combinant plusieurs éléments suivants : assemblages visibles et accessibles sans dégrader l’intégrité des bois, assemblages gravitaires ou sans éléments tiers (ex : encastrement maçonné), assemblages boulonnés, assemblages jugés réemployables, pièces manuportables (1 pièce pour 2 personnes maximum), singularité tracéologique forte, assemblages cloués (pointes de diamètre inférieur à 3 mm et de longueur inférieure à 10 cm), une industrialité forte, assemblages taillés par des machines (hors électroportatif), une documentation forte, une exposition mécanique moyenne à faible [+3].
    Une démontabilité / remontabilité « moyenne » vaut pour des systèmes constructifs combinant plusieurs éléments suivants : un vieillissement fort à moyen et des assemblages dits « bois-bois », des assemblages vissés (3 vis ou moins par assemblage), des assemblages cloués (pointes de diamètre supérieur à 3 mm et de longueur supérieure à 10 cm), des assemblages jugés non réemployables (jetables), une documentation forte à moyenne, une artisanalité forte, une exposition mécanique moyenne à faible [+1].
    Une démontabilité / remontabilité « faible » vaut pour des systèmes constructifs combinant plusieurs éléments suivants : assemblages invisibles et inaccessibles sans dégrader l’intégrité des bois, assemblages jugés non réemployables (jetables), assemblages collés (ex : parquet), des assemblages vissés (plus de 3 vis par assemblage), un vieillissement fort à moyen, des assemblages taillés à la main, une documentation moyenne à faible, une exposition mécanique forte à moyenne [-3].

    À noter : Cette notation est effectuée indépendamment du degré d’intégrité générale de la structure bois pouvant contenir les bois évalués. De fait, une charpente trop abîmée pour être démontée, et non démolie, est jugée comme « inaccessible ». Il faut distinguer un démontage amenant à la mise à nu des bois d’un démontage qui conserve des assemblages rapportés sur les bois.

    Ottenhaus, L.-M., Yan, Z., Brandner, R., Leardini, P., Fink, G., & Jockwer, R. (2023). Design for adaptability, disassembly and reuse – A review of reversible timber connection systems. Construction and Building Materials, 400, 132823. https://doi.org/10.1016/j.conbuildmat.2023.132823`
    };

    if (titleEl) titleEl.textContent = titles[fieldKey] || 'Détail';
    this.renderDetailModalContent(contentEl, contents[fieldKey] || 'À renseigner');

    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeAncienDetailModal() {
    const backdrop = document.getElementById('ancienDetailModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openTracesModal() {
    const backdrop = document.getElementById('tracesModalBackdrop');
    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeTracesModal() {
    const backdrop = document.getElementById('tracesModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openTracesDetailModal(fieldKey) {
    const backdrop = document.getElementById('tracesDetailModalBackdrop');
    const titleEl = document.getElementById('tracesDetailModalTitle');
    const contentEl = document.getElementById('tracesDetailModalContent');

    const titles = {
        confianceTraces: 'Confiance',
        etiquetageTraces: 'Étiquetage',
        alterationTraces: 'Altération',
        documentationTraces: 'Documentation',
        singularitesTraces: 'Singularités tracéologiques'
    };

    const contents = {
        confianceTraces: `Confiance.

Noter le niveau de confiance de la tracéologie effectuée sur les bois évalués.

Une confiance « forte » vaut pour une certitude [+3].
Une confiance « moyenne » vaut pour un doute [+2].
Une confiance « faible » implique d’engager une étude complémentaire [+1].`,
        etiquetageTraces: `Étiquetage.

Noter la qualité de l’étiquetage des pièces de bois évaluées.

Un étiquetage « fort » vaut pour la présence de l’un des éléments suivants : marquage descriptif du bois après sa déconstruction (essence, classes diverses, bâtiment d’origine, propriétaire antérieur…) ou un marquage CE [+3].
Un étiquetage « moyen » vaut pour des pièces de bois disposant de toute forme de labellisation connue [+2].
Un étiquetage « faible » vaut pour une absence de traçabilité [+1].

À noter : Les bois dits de « structure », sciés, doivent être marqués CE selon la norme NF EN 14081-1 pour pouvoir être mis sur le marché en Europe depuis le 1er janvier 2012.

Voir : EN 13556 (essence).
Voir : NF EN 14250 (mise en forme).`,
        alterationTraces: `Altération.

Noter les altérations imputables à la récupération des éléments.

Une altération « forte » vaut pour des bois présentant ruptures, cassures, morsures d’engin, auréoles, tâches d’huiles ou d’hydrocarbures [-10].
Une altération « moyenne » vaut pour des bois avec coins et arêtes enfoncés ou arrachés sur les premières cernes [+1].
Une altération « faible » vaut pour des bois ne présentant pas ces signes [+3].`,
        documentationTraces: `Documentation.

Noter la disponibilité d’une documentation permettant d’évaluer des critères physiques ou chimiques des bois et les usages antérieurs de l’ouvrage les contenant.

Une documentation « forte » vaut pour des éléments d’ordre mécanique (notes de calculs, classements de bois), d’ordre historique (plans, occupation des espaces) ou d’ordre écologique (essence de bois, durabilité naturelle ou conféré, activités autour des bois) [+3].
Une documentation « moyenne » vaut pour des bois dont l’origine est connue (lieu d’extraction), mais dont les éléments relatifs à leur usage sont partiels ou indirects [+1].
Une documentation « faible » vaut pour de pièces bois dont l’origine est inconnue ou incertaine [-3].`,
        singularitesTraces: `Une singularité tracéologique « forte » vaut pour des bois disposant d'éléments visibles donnant accès à leur mode production (ex : marque de hache, scie…) et pouvant contribuer à la remontabilité d'un système constructif propre (ex : marques de charpente), voire de sculptures (ex : linteau, bois d'angle, chevron, frise…) [+3].
Une singularité tracéologique « moyenne » vaut pour des bois pour lesquels les éléments visibles relèvent de l'anecdotique mais ne permettent pas de constituer une épaisseur historique significative [+2].
Une singularité tracéologique « faible » vaut pour des bois ne disposant pas d'éléments visible œuvrant à leur singularité [+1].

Manuel Porcheron, « Tracéologie du bois d'époque médiévale », Revue archéologique du Centre de la France [En ligne], Tome 58 | 2019, mis en ligne le 16 décembre 2019.

Greck Sandra, Guibal Frédéric. Le bois, matériau de construction : étude xylologique, tracéologique et dendromorphologique du chaland Arles-Rhône 3. In: Archaeonautica, 18, 2014. Arles-Rhône 3. Un chaland gallo-romain du Ier siècle après Jésus-Christ. pp. 171-202.

Calame, F. (1983). Les marques de charpente. Ethnologie française, 13(1), 7–24. https://www.jstor.org/stable/40988748`
    };

    if (titleEl) titleEl.textContent = titles[fieldKey] || 'Détail';
    this.renderDetailModalContent(contentEl, contents[fieldKey] || 'À renseigner');

    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeTracesDetailModal() {
    const backdrop = document.getElementById('tracesDetailModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openProvenanceModal() {
    const backdrop = document.getElementById('provenanceModalBackdrop');
    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeProvenanceModal() {
    const backdrop = document.getElementById('provenanceModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openProvenanceDetailModal(fieldKey) {
    const backdrop = document.getElementById('provenanceDetailModalBackdrop');
    const titleEl = document.getElementById('provenanceDetailModalTitle');
    const contentEl = document.getElementById('provenanceDetailModalContent');

    const titles = {
        confianceProv: 'Confiance',
        transportProv: 'Transport',
        reputationProv: 'Réputation',
        macroProv: 'Macro-histoire',
        territorialiteProv: 'Territorialité'
    };

    const contents = {
        confianceProv: `Confiance.

Noter le niveau de confiance de la tracéologie effectuée sur les bois évalués.

Une confiance « forte » vaut pour une certitude [+3].
Une confiance « moyenne » vaut pour un doute [+2].
Une confiance « faible » implique d’engager une étude complémentaire [+1].`,
        transportProv: `Un transport « fort » vaut pour des bois transportés sur une distance intercontinentale (hors Europe) [-3].
    Un transport « moyen » vaut pour des bois transportés dans un rayon continentale (pays transfrontaliers, Europe) [+1].
    Un transport « faible » vaut pour des bois qui peuvent être réemployés, réutilisés ou recyclés sur site (in situ) [+3].

    Voir : Ghyoot M., Devlieger L., Billiet L., Warnier A., Déconstruction et réemploi, Comment faire circuler les éléments de construction ? Presses polytechniques universitaires romandes (PPUR), 2018, pages 72-73.`,
        reputationProv: `Une réputation « forte » vaut pour des bois en provenance de forêts spécifique reconnue pour les qualités de leurs bois (ex : Tronçais, Bercé, Lyons…) [+3].
Une réputation « moyenne » vaut pour des bois en provenance de massifs forestiers reconnus pour la qualités de leurs bois (ex : Sélection Vosges, Jura supérieur…) [+2].
Une réputation « faible » vaut pour des bois dont l’origine est peu valorisée [+1].

À noter : Une réputation inconnue ou incertaine n’est pas notée.

Lenglet, J., & Peyrache-Gadeau, V. (2020). Valuation de la ressource territoriale et formes de circularité : la labellisation dans la filière forêt-bois française (Alpes, Jura, Vosges). Revue forestière française, 72(4), 339–360. https://doi.org/10.20870/revforfr.2020.5333

King, L., & Vallauri, D. (2023). Marques régionales pour le bois : Quelles plus-values environnementales ? WWF-France. https://www.wwf.fr/sites/default/files/doc-2023-12/Fiche_marques_regionales.pdf`,
        macroProv: `Une macro-histoire « forte » vaut pour des bois combinant plusieurs de ces critères : un amortissement biologique fort, une réputation forte, une micro-histoire forte, une rareté commerciale forte [+3].
    Une macro-histoire « moyenne » vaut pour des bois combinant plusieurs de ces critères : un amortissement biologique moyen, une réputation moyenne, une micro-histoire moyenne, une rareté commerciale moyenne [+2].
    Une macro-histoire « faible » vaut pour des bois dont l’origine est inconnue ou incertaine [+1].`,
        territorialiteProv: `Noter la territorialité des bois évalués au regard d’éléments caractéristiques du territoire dans lequel le bois a été extrait et transformé.

    Une territorialité « forte » vaut pour des bois combinant les éléments suivant lorsqu’ils sont associées à un territoire donnée : une essence et ces singularités propre au territoire, un système constructif dans lequel ils sont inclus et par lequel ils sont formés, des traces qui font leur singularité [+3].
    Une territorialité « moyenne » vaut pour des bois disposant de l’un de ses éléments suivant lorsqu’ils sont associées à un territoire donnée : une essence et ces singularités propre au territoire, un système constructif dans lequel ils sont inclus et par lequel ils sont formés, des traces qui font leur singularité [+2].
    Une territorialité « faible » vaut pour des bois ne disposant d’aucun de ces éléments caractéristiques d’un rattachement à un territoire donné [+1].`
    };

    if (titleEl) titleEl.textContent = titles[fieldKey] || 'Détail';
    this.renderDetailModalContent(contentEl, contents[fieldKey] || 'À renseigner');

    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeProvenanceDetailModal() {
    const backdrop = document.getElementById('provenanceDetailModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

    openSeuilsModal() {
        const b = document.getElementById('seuilsModalBackdrop');
        if (b) {
            b.classList.remove('hidden');
            b.setAttribute('aria-hidden', 'false');
        }
    }

    closeSeuilsModal() {
        const b = document.getElementById('seuilsModalBackdrop');
        if (b) {
            b.classList.add('hidden');
            b.setAttribute('aria-hidden', 'true');
        }
    }

    openRadarModal() {
        const b = document.getElementById('radarModalBackdrop');
        if (b) {
            b.classList.remove('hidden');
            b.setAttribute('aria-hidden', 'false');
        }
    }

    closeRadarModal() {
        const b = document.getElementById('radarModalBackdrop');
        if (b) {
            b.classList.add('hidden');
            b.setAttribute('aria-hidden', 'true');
        }
    }

    openScatterDimsModal() {
        const b = document.getElementById('scatterDimsModalBackdrop');
        if (b) {
            b.classList.remove('hidden');
            b.setAttribute('aria-hidden', 'false');
        }
    }

    closeScatterDimsModal() {
        const b = document.getElementById('scatterDimsModalBackdrop');
        if (b) {
            b.classList.add('hidden');
            b.setAttribute('aria-hidden', 'true');
        }
    }

openOrientationModal() {
    const backdrop = document.getElementById('orientationModalBackdrop');
    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeOrientationModal() {
    const backdrop = document.getElementById('orientationModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

openEvalOpModal() {
    const backdrop = document.getElementById('evalOpModalBackdrop');
    if (backdrop) {
        backdrop.classList.remove('hidden');
        backdrop.setAttribute('aria-hidden', 'false');
    }
}

closeEvalOpModal() {
    const backdrop = document.getElementById('evalOpModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('hidden');
        backdrop.setAttribute('aria-hidden', 'true');
    }
}

    openResetConfirmModal(options = {}) {
        const {
            title = 'Réinitialiser',
            message = 'Voulez-vous vraiment réinitialiser toutes les données de cette évaluation ?',
            confirmLabel = 'Oui, réinitialiser',
            onConfirm = () => this.resetAllData()
        } = options;

        const backdrop = document.getElementById('resetConfirmBackdrop');
        const titleEl = document.getElementById('resetConfirmTitle');
        const messageEl = document.getElementById('resetConfirmMessage');
        const confirmBtn = document.getElementById('btnConfirmReset');

        if (backdrop) {
            this.pendingResetConfirmAction = onConfirm;
            if (titleEl) titleEl.textContent = title;
            if (messageEl) messageEl.textContent = message;
            if (confirmBtn) confirmBtn.textContent = confirmLabel;
            backdrop.classList.remove('hidden');
            backdrop.setAttribute('aria-hidden', 'false');
        }
    }

    openCreatePieceDeductionModal(options = {}) {
        const {
            title = 'Déduction des pièces par défaut',
            message = 'Souhaitez-vous déduire cette nouvelle pièce de la quantité des Pièces par défaut ?',
            yesLabel = 'Oui, déduire',
            noLabel = 'Non, conserver la quantité',
            showCreationModeChoice = false,
            defaultCreationMode = 'detailed',
            defaultModeMessage = 'Créer un nouveau formulaire de pièce par défaut à partir de cette pièce ?',
            defaultModeYesLabel = 'Créer la pièce par défaut',
            defaultModeNoLabel = 'Annuler',
            onDecision = () => {}
        } = options;

        const backdrop = document.getElementById('createPieceDeductionBackdrop');
        const titleEl = document.getElementById('createPieceDeductionTitle');
        const messageEl = document.getElementById('createPieceDeductionMessage');
        const yesBtn = document.getElementById('btnCreatePieceDeductionYes');
        const noBtn = document.getElementById('btnCreatePieceDeductionNo');
        const modeGroup = document.getElementById('createPieceDuplicationModeGroup');
        const modeDetailedRadio = document.getElementById('createPieceDuplicationModeDetailed');
        const modeDefaultRadio = document.getElementById('createPieceDuplicationModeDefault');

        if (backdrop) {
            this.pendingPieceCreationDecision = onDecision;
            this.pendingPieceCreationModalOptions = { showCreationModeChoice };
            if (titleEl) titleEl.textContent = title;

            if (messageEl) {
                messageEl.dataset.detailedMessage = message;
                messageEl.dataset.defaultMessage = defaultModeMessage;
            }
            if (yesBtn) {
                yesBtn.dataset.detailedLabel = yesLabel;
                yesBtn.dataset.defaultLabel = defaultModeYesLabel;
            }
            if (noBtn) {
                noBtn.dataset.detailedLabel = noLabel;
                noBtn.dataset.defaultLabel = defaultModeNoLabel;
            }

            if (modeGroup) {
                modeGroup.classList.toggle('hidden', !showCreationModeChoice);
            }
            if (modeDetailedRadio && modeDefaultRadio) {
                const useDefaultMode = showCreationModeChoice && defaultCreationMode === 'default';
                modeDefaultRadio.checked = useDefaultMode;
                modeDetailedRadio.checked = !useDefaultMode;
            }

            this.updateCreatePieceDeductionModalByMode();
            backdrop.classList.remove('hidden');
            backdrop.setAttribute('aria-hidden', 'false');
        }
    }

    openExportPdfModal() {
        const backdrop = document.getElementById('exportPdfBackdrop');
        if (backdrop) {
            this.renderExportPdfLotOptions();
            backdrop.classList.remove('hidden');
            backdrop.removeAttribute('inert');
            backdrop.setAttribute('aria-hidden', 'false');
            const exportFormatSel = document.getElementById('exportFileFormatSelect');
            if (exportFormatSel) {
                exportFormatSel.dispatchEvent(new Event('change'));
                exportFormatSel.focus();
            }
        }
    }

    closeExportPdfModal() {
        const backdrop = document.getElementById('exportPdfBackdrop');
        if (backdrop) {
            const activeEl = document.activeElement;
            if (activeEl && backdrop.contains(activeEl) && typeof activeEl.blur === 'function') {
                activeEl.blur();
            }
            backdrop.setAttribute('inert', '');
            backdrop.classList.add('hidden');
            backdrop.setAttribute('aria-hidden', 'true');
            const trigger = document.getElementById('btnExportPdf');
            if (trigger && typeof trigger.focus === 'function') {
                trigger.focus();
            }
        }
    }

    openEtiqueterModal() {
        const backdrop = document.getElementById('etiqueterBackdrop');
        if (backdrop) {
            this.renderEtiqueterLotOptions();
            backdrop.classList.remove('hidden');
            backdrop.setAttribute('aria-hidden', 'false');
        }
    }

    closeEtiqueterModal() {
        const backdrop = document.getElementById('etiqueterBackdrop');
        if (backdrop) {
            backdrop.classList.add('hidden');
            backdrop.setAttribute('aria-hidden', 'true');
        }
    }

    renderExportPdfLotOptions() {
        const list = document.getElementById('exportPdfLotsList');
        if (!list) return;

        const lots = this.data.lots || [];
        list.innerHTML = '';

        lots.forEach((lot, index) => {
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '8px';
            label.style.padding = '8px 10px';
            label.style.border = '1px solid #E6E6E6';
            label.style.borderRadius = '8px';
            label.style.cursor = 'pointer';
            label.style.background = '#FAFAFA';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = String(index);
            checkbox.setAttribute('data-export-pdf-lot', 'true');
            checkbox.checked = index === this.currentLotIndex;

            const lotName = (lot.nom || '').trim() || ('Lot ' + (index + 1));
            const typePiece = ((lot.allotissement && lot.allotissement.typePiece) || '').trim();
            const orientation = lot.orientationLabel && lot.orientationLabel !== '…' ? ' · ' + lot.orientationLabel : '';
            const typePieceTerm = typePiece ? ' · ' + typePiece : '';

            const text = document.createElement('span');
            text.textContent = lotName + typePieceTerm + orientation;

            label.appendChild(checkbox);
            label.appendChild(text);
            list.appendChild(label);
        });
    }

    getSelectedExportPdfLotIndices() {
        return Array.from(document.querySelectorAll('[data-export-pdf-lot]'))
            .filter((input) => input.checked)
            .map((input) => parseInt(input.value, 10))
            .filter((value) => Number.isInteger(value) && value >= 0);
    }

    renderEtiqueterLotOptions() {
        const list = document.getElementById('etiqueterLotsList');
        const hint = document.getElementById('etiqueterLotsHint');
        if (!list) return;

        const lots = this.data.lots || [];
        list.innerHTML = '';

        if (!lots.length) {
            const emptyText = document.createElement('p');
            emptyText.style.margin = '0';
            emptyText.style.fontSize = '13px';
            emptyText.style.color = '#666666';
            emptyText.textContent = 'Aucun lot disponible.';
            list.appendChild(emptyText);
            if (hint) hint.textContent = 'Ajoutez un lot avant de lancer un export d\'étiquettes.';
            return;
        }

        if (hint) hint.textContent = 'Sélectionner un ou plusieurs lots puis lancer l\'export.';

        lots.forEach((lot, index) => {
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '8px';
            label.style.padding = '8px 10px';
            label.style.border = '1px solid #E6E6E6';
            label.style.borderRadius = '8px';
            label.style.cursor = 'pointer';
            label.style.background = '#FAFAFA';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = String(index);
            checkbox.setAttribute('data-export-etiquette-lot', 'true');
            checkbox.checked = index === this.currentLotIndex;

            const lotName = this.getPdfLotLabel(lot, index);
            const typePiece = ((lot.allotissement && lot.allotissement.typePiece) || '').trim();
            const orientation = lot.orientationLabel && lot.orientationLabel !== '…' ? ' · ' + lot.orientationLabel : '';
            const typePieceTerm = typePiece ? ' · ' + typePiece : '';

            const text = document.createElement('span');
            text.textContent = lotName + typePieceTerm + orientation;

            label.appendChild(checkbox);
            label.appendChild(text);
            list.appendChild(label);
        });
    }

    getSelectedEtiqueterLotIndices() {
        return Array.from(document.querySelectorAll('[data-export-etiquette-lot]'))
            .filter((input) => input.checked)
            .map((input) => parseInt(input.value, 10))
            .filter((value) => Number.isInteger(value) && value >= 0);
    }

    render() {
        this.renderAccueilMeta();
        this.renderInspection();
        this.renderAllotissement();
        this.renderDetailLot();
        this.renderBio();
        this.renderMech();
        this.renderUsage();
        this.renderDenat();
        this.renderDebit();
        this.renderGeo();
        this.renderEssence();
        this.renderAncien();
        this.renderTraces();
        this.renderProvenance();
        this.renderSeuils();
        this.renderRadar();
        this.renderScatterDims();
        this.renderOrientation();
        this.renderEvalOp();
        this.setupNotationResetConfirmations();

        document.querySelectorAll('.bio-slider, .mech-slider, .usage-slider, .denat-slider, .debit-slider, .geo-slider, .essence-slider, .ancien-slider, .traces-slider, .provenance-slider, .inspection-slider').forEach((slider) => {
            if (typeof slider.__refreshActiveSliderLabel === 'function') {
                slider.__refreshActiveSliderLabel();
            }
        });
    }

    renderAccueilMeta() {
        this.data.meta = this.getDefaultMeta(this.data.meta || {});
        this.data.ui = this.getDefaultUi(this.data.ui || {});
        const meta = this.data.meta;
        const ui = this.data.ui;

        document.querySelectorAll('[data-ui-collapsible]').forEach((detailsEl) => {
            const key = detailsEl.getAttribute('data-ui-collapsible');
            if (!key) return;
            const shouldBeOpen = ui.collapsibles[key] !== false;
            if (detailsEl.open !== shouldBeOpen) detailsEl.open = shouldBeOpen;
        });

        const aproposBtn = document.getElementById('btnAproposToggle');
        const aproposContent = document.getElementById('aproposContent');
        if (aproposBtn && aproposContent) {
            const shouldShowApropos = ui.collapsibles.apropos === true;
            if (shouldShowApropos) {
                aproposContent.removeAttribute('hidden');
                aproposBtn.setAttribute('aria-expanded', 'true');
            } else {
                aproposContent.setAttribute('hidden', '');
                aproposBtn.setAttribute('aria-expanded', 'false');
            }
        }

        document.querySelectorAll('[data-meta-field]').forEach((el) => {
            const field = el.getAttribute('data-meta-field');
            if (!field) return;
            const nextValue = meta[field] || '';
            
            // Special handling for statute slider
            if (field === 'statutEtude' && el.type === 'range') {
                const sliderIndex = this.getStudyStatusIndexFromValue(nextValue);
                if (el.value !== String(sliderIndex >= 0 ? sliderIndex : 0)) {
                    el.value = String(sliderIndex >= 0 ? sliderIndex : 0);
                }
                this.renderStudyStatusHelpByIndex(sliderIndex);
                
                // Initialize active label styling
                const sliderWrapper = el.closest('.bio-slider-wrapper');
                if (sliderWrapper) {
                    const labels = sliderWrapper.querySelectorAll('.bio-slider-label');
                    labels.forEach((label) => {
                        label.classList.remove('bio-slider-label--active');
                        if (label.getAttribute('data-index') === el.value) {
                            label.classList.add('bio-slider-label--active');
                        }
                    });
                }
            } else if (el.value !== nextValue) {
                el.value = nextValue;
            }
        });

        const refInput = document.getElementById('inputReferenceGisement');
        if (refInput) refInput.value = this.getReferenceGisement(meta);

        const operationReferenceAlertBtn = document.querySelector('[data-operation-reference-alert-btn]');
        if (operationReferenceAlertBtn) {
            operationReferenceAlertBtn.dataset.alertOperationReference = this.hasIncompleteOperationReferenceFields(meta) ? 'true' : 'false';
        }

        const diagnostiqueurAlertBtn = document.querySelector('[data-diagnostiqueur-alert-btn]');
        if (diagnostiqueurAlertBtn) {
            diagnostiqueurAlertBtn.dataset.alertDiagnostiqueur = this.hasIncompleteDiagnostiqueurFields(meta) ? 'true' : 'false';
        }

        const contactsAlertBtn = document.querySelector('[data-contacts-alert-btn]');
        if (contactsAlertBtn) {
            contactsAlertBtn.dataset.alertContacts = this.hasIncompleteContactsFields(meta) ? 'true' : 'false';
        }

        const contexteTechniqueAlertBtn = document.querySelector('[data-contexte-technique-alert-btn]');
        if (contexteTechniqueAlertBtn) {
            contexteTechniqueAlertBtn.dataset.alertContexteTechnique = this.hasIncompleteContexteTechniqueFields(meta) ? 'true' : 'false';
        }

        // Sync boutons toggle diagnostics
        ['diagnosticStructure', 'diagnosticAmiante', 'diagnosticPlomb'].forEach((field) => {
            this.syncMetaToggleGroup(field);
        });
    }

    renderDefaultPieceCardHTML(lot, defaultPiece, defaultPieceIndex, isActive = true) {
        const formatGrouped = (value, digits = 0) => (parseFloat(value) || 0).toLocaleString(getValoboisIntlLocale(), {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
        const formatOneDecimal = (value) => formatGrouped(value, 1);

        const defaultPieceId = defaultPiece && defaultPiece.id ? defaultPiece.id : '';
        const numDefault = Math.max(0, parseFloat(defaultPiece.quantite || 0) || 0);
        const isDisabled = numDefault <= 0;

        const dpPreview = this.buildPieceFromDefault(lot, -1, defaultPieceId);
        this.recalculatePiece(dpPreview, lot);

        const pEffTypePiece = defaultPiece.typePiece || '';
        const pEffEssenceCommun = defaultPiece.essenceNomCommun || '';
        const pEffEssenceScientifique = defaultPiece.essenceNomScientifique || '';
        const pPriceUnit = ((dpPreview.prixUnite || lot.allotissement.prixUnite || 'm3') + '').toLowerCase();
        const pPrixMarche = defaultPiece.prixMarche;
        const pMasseVol = defaultPiece.masseVolumique;
        const pMasseVolSourceLabel = this.getMasseVolumiqueSourceLabel({
            essenceNomCommun: pEffEssenceCommun,
            essenceNomScientifique: pEffEssenceScientifique,
            _ownMasseVolumique: defaultPiece.masseVolumique
        });
        const pHumidite = dpPreview.humidite;
        const pFractionC = dpPreview.fractionCarbonee;
        const pBois = dpPreview.bois;
        const pco2Display = this.formatPco2Display(dpPreview.carboneBiogeniqueEstime);
        const masseDisplay = this.formatMasseDisplay(dpPreview.massePiece);
        const measuredDensityDisplay = this.formatMeasuredDensityDisplay(defaultPiece.massePieceMesuree, dpPreview.volumePiece);
        const integriteData = (lot.inspection && lot.inspection.integrite) || {};
        const integrityLabel = integriteData.ignore ? 'Ignoré'
            : integriteData.niveau === 'forte' ? `Forte (${integriteData.coeff ?? '...'})`
            : integriteData.niveau === 'moyenne' ? `Moyenne (${integriteData.coeff ?? '...'})`
            : integriteData.niveau === 'faible' ? `Faible (${integriteData.coeff ?? '...'})`
            : '...';

        const hasDiametre = dpPreview.diametre !== '' && dpPreview.diametre != null;
        const hasLH = (dpPreview.largeur !== '' && dpPreview.largeur != null) || (dpPreview.epaisseur !== '' && dpPreview.epaisseur != null);
        const _lDim = parseFloat(dpPreview.largeur) || 0;
        const _hDim = parseFloat(dpPreview.epaisseur) || 0;
        const isSurfaceMutedByShape = _hDim > 55 || (_lDim > 0 && _hDim > 0 && _lDim / _hDim <= 4);
        const isSurfaceMuted = hasDiametre || isSurfaceMutedByShape;

        const showAsDisabled = isDisabled && !isActive;
        const viewValue = (value) => (showAsDisabled ? '' : value);

        const resetIconMarkup = `
            <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <polyline points="3 3 3 8 8 8" />
            </svg>
            <span class="sr-only">Réinitialiser</span>
        `;

        return `
        <div class="piece-card piece-card--default${showAsDisabled ? ' piece-card--disabled' : ''}${isActive ? ' piece-card--active' : ' piece-card--passive'}" data-default-piece-id="${defaultPieceId}" data-detail-card-key="default:${defaultPieceId}">
            <div class="piece-card-header">
                <div class="piece-card-title-block">
                    <span class="piece-card-title">Pièce par défaut ${defaultPieceIndex + 1}</span>
                    <span class="piece-default-count">${isDisabled ? 'Aucune' : (numDefault + ' pièce' + (numDefault > 1 ? 's' : ''))}</span>
                </div>
                <div class="piece-card-actions">
                    <button class="piece-delete-btn btn-reset" type="button" data-default-piece-reset="${defaultPieceId}" title="Réinitialiser la pièce par défaut">${resetIconMarkup}</button>
                    <button class="piece-delete-btn" type="button" data-default-piece-delete="${defaultPieceId}" title="Supprimer la pièce par défaut" aria-label="Supprimer la pièce par défaut">✕</button>
                    <button class="piece-duplicate-btn piece-duplicate-btn--default" type="button" data-default-piece-duplicate="${defaultPieceId}" title="Dupliquer la pièce par défaut"${isDisabled ? ' disabled' : ''}>Dupliquer</button>
                </div>
            </div>
            <div class="piece-form-grid">
                <div class="lot-group" style="margin-bottom: 6px;">
                    <div class="lot-inline-grid lot-inline-grid--2">
                        <div class="lot-field-block">
                            <label class="lot-field-label lot-field-label--hidden">Bâtiment, zone, espace…</label>
                            <input type="text" class="lot-input" value="${viewValue(defaultPiece.localisation || '')}" placeholder="Bâtiment, zone, espace…" data-default-piece-id="${defaultPieceId}" data-default-piece-input="localisation">
                        </div>
                        <div class="lot-field-block">
                            <label class="lot-field-label lot-field-label--hidden">Situation</label>
                            <input type="text" class="lot-input" value="${viewValue(defaultPiece.situation || '')}" placeholder="Situation du lot" data-default-piece-id="${defaultPieceId}" data-default-piece-input="situation" list="liste-situations" autocomplete="off">
                        </div>
                    </div>
                    <div class="lot-field-block" style="margin-top: 6px;">
                        <label class="lot-field-label lot-field-label--hidden">Quantité pièce par défaut</label>
                        <input type="text" inputmode="numeric" class="lot-input" value="${this.formatAllotissementNumericDisplay(defaultPiece.quantite)}" placeholder="Quantité pièce par défaut" data-default-piece-id="${defaultPieceId}" data-default-piece-input="quantite">
                    </div>
                </div>
                <div class="lot-group" style="margin-bottom: 4px;">
                    <p class="lot-group-title">Type de pièce, essence</p>
                    <div class="lot-field-block">
                        <div class="lot-essence-picker">
                            <input type="text" class="lot-input" value="${viewValue(pEffTypePiece)}" placeholder="Type de pièce" data-default-piece-id="${defaultPieceId}" data-default-piece-input="typePiece" list="liste-termes-bois" autocomplete="off">
                        </div>
                    </div>
                    <div class="lot-field-block">
                        <input type="text" class="lot-input" value="${viewValue(defaultPiece.typeProduit || '')}" placeholder="Type de produit" data-default-piece-id="${defaultPieceId}" data-default-piece-input="typeProduit" list="liste-types-produit" autocomplete="off">
                    </div>
                    <div class="lot-inline-grid lot-inline-grid--lot-essence">
                        <input type="text" class="lot-input lot-input--essence-common" value="${viewValue(pEffEssenceCommun)}" placeholder="Essence (nom commun)" data-default-piece-id="${defaultPieceId}" data-default-piece-input="essenceNomCommun" list="liste-essences-communes" autocomplete="off">
                        <input type="text" class="lot-input lot-input--essence-scientific" value="${viewValue(pEffEssenceScientifique)}" placeholder="Essence (nom scientifique)" data-default-piece-id="${defaultPieceId}" data-default-piece-input="essenceNomScientifique" list="liste-essences-scientifiques" autocomplete="off">
                    </div>
                </div>
                <div class="lot-group">
                    <p class="lot-group-title">Dimensions, volume, surface</p>
                    <div class="lot-inline-grid lot-inline-grid--lot-dimensions">
                        <div class="lot-dimension-field">
                            <label class="lot-field-label">Longueur</label>
                            <div class="lot-dimension-input-wrap" data-has-value="${defaultPiece.longueur !== '' && defaultPiece.longueur != null ? 'true' : 'false'}">
                                <input type="text" inputmode="decimal" class="lot-input" value="${viewValue(this.formatAllotissementNumericDisplay(defaultPiece.longueur))}" data-default-piece-id="${defaultPieceId}" data-default-piece-input="longueur" oninput="this.parentElement.dataset.hasValue = this.value !== '' ? 'true' : 'false'">
                                <span class="lot-dimension-unit">mm</span>
                            </div>
                            <div class="lot-dimension-computed">
                                <label class="lot-field-label">Volume unitaire</label>
                                <div class="lot-input-with-unit">
                                    <input type="text" class="lot-input" value="${viewValue(formatGrouped(dpPreview.volumePiece, 3))}" readonly data-default-piece-id="${defaultPieceId}" data-default-piece-display="volumePiece">
                                    <span class="lot-input-unit">m3</span>
                                </div>
                            </div>
                        </div>
                        <div class="lot-dimension-field"${hasDiametre ? ' data-muted="true"' : ''}>
                            <label class="lot-field-label">Largeur</label>
                            <div class="lot-dimension-input-wrap" data-has-value="${defaultPiece.largeur !== '' && defaultPiece.largeur != null ? 'true' : 'false'}">
                                <input type="text" inputmode="decimal" class="lot-input lot-input--with-placeholder" value="${viewValue(this.formatAllotissementNumericDisplay(defaultPiece.largeur))}" placeholder="Face, Plat…" data-default-piece-id="${defaultPieceId}" data-default-piece-input="largeur" oninput="this.parentElement.dataset.hasValue = this.value !== '' ? 'true' : 'false'">
                                <span class="lot-dimension-unit">mm</span>
                            </div>
                            <div class="lot-dimension-computed"${isSurfaceMuted ? ' data-muted="true"' : ''}>
                                <label class="lot-field-label">Surface unitaire</label>
                                <div class="lot-input-with-unit">
                                    <input type="text" class="lot-input" value="${(isDisabled || isSurfaceMuted) ? '' : formatOneDecimal(dpPreview.surfacePiece)}" readonly data-default-piece-id="${defaultPieceId}" data-default-piece-display="surfacePiece">
                                    <span class="lot-input-unit">m2</span>
                                </div>
                            </div>
                        </div>
                        <div class="lot-dimension-field"${hasDiametre ? ' data-muted="true"' : ''}>
                            <label class="lot-field-label">Épaisseur</label>
                            <div class="lot-dimension-input-wrap" data-has-value="${defaultPiece.epaisseur !== '' && defaultPiece.epaisseur != null ? 'true' : 'false'}">
                                <input type="text" inputmode="decimal" class="lot-input lot-input--with-placeholder" value="${viewValue(this.formatAllotissementNumericDisplay(defaultPiece.epaisseur))}" placeholder="Chant, Rive…" data-default-piece-id="${defaultPieceId}" data-default-piece-input="epaisseur" oninput="this.parentElement.dataset.hasValue = this.value !== '' ? 'true' : 'false'">
                                <span class="lot-dimension-unit">mm</span>
                            </div>
                            <div class="lot-dimension-computed"${hasLH ? ' data-muted="true"' : ''}>
                                <label class="lot-field-label">Diamètre</label>
                                <div class="lot-input-with-unit">
                                    <input type="text" inputmode="decimal" class="lot-input" value="${viewValue(this.formatAllotissementNumericDisplay(defaultPiece.diametre))}" data-default-piece-id="${defaultPieceId}" data-default-piece-input="diametre">
                                    <span class="lot-input-unit">mm</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="lot-group" data-prix-group-disabled="${lot.allotissement.prixLotDirect ? 'true' : 'false'}">
                    <p class="lot-group-title">Prix</p>
                    <div class="lot-field-block">
                        <label class="lot-field-label lot-field-label--subsection">Prix du marché</label>
                        <div class="lot-price-market-row">
                            <div class="lot-input-with-unit">
                                <input type="text" inputmode="decimal" class="lot-input" value="${viewValue(this.formatAllotissementNumericDisplay(pPrixMarche))}" data-default-piece-id="${defaultPieceId}" data-default-piece-input="prixMarche"${lot.allotissement.prixLotDirect ? ' readonly' : ''}>
                                <span class="lot-input-unit" data-default-piece-id="${defaultPieceId}" data-default-piece-display="prixMarcheUnit">€/${pPriceUnit}</span>
                            </div>
                            <div class="lot-price-unit-toggle" role="group" aria-label="Unité de prix">
                                <button type="button" class="lot-price-unit-btn" data-default-piece-id="${defaultPieceId}" data-default-piece-price-unit="ml" aria-pressed="${pPriceUnit === 'ml' ? 'true' : 'false'}"${lot.allotissement.prixLotDirect ? ' disabled' : ''}>au ml</button>
                                <button type="button" class="lot-price-unit-btn" data-default-piece-id="${defaultPieceId}" data-default-piece-price-unit="m2" aria-pressed="${pPriceUnit === 'm2' ? 'true' : 'false'}"${lot.allotissement.prixLotDirect ? ' disabled' : ''}>au m2</button>
                                <button type="button" class="lot-price-unit-btn" data-default-piece-id="${defaultPieceId}" data-default-piece-price-unit="m3" aria-pressed="${pPriceUnit !== 'ml' && pPriceUnit !== 'm2' ? 'true' : 'false'}"${lot.allotissement.prixLotDirect ? ' disabled' : ''}>au m3</button>
                            </div>
                        </div>
                    </div>
                    <div class="lot-price-summary-row">
                        <div class="lot-field-block">
                            <label class="lot-field-label">Prix de la pièce</label>
                            <div class="lot-input-with-unit lot-input-with-unit--compact">
                                <input type="text" class="lot-input" value="${viewValue(formatGrouped(Math.round(dpPreview.prixPiece || 0), 0))}" readonly data-default-piece-id="${defaultPieceId}" data-default-piece-display="prixPiece">
                                <span class="lot-input-unit">€</span>
                            </div>
                        </div>
                        <div class="lot-field-block"${integriteData.ignore ? ' data-muted="true"' : ''}>
                            <label class="lot-field-label">Prix ajusté</label>
                            <div class="lot-input-with-unit lot-input-with-unit--compact">
                                <input type="text" class="lot-input" value="${(isDisabled || integriteData.ignore) ? '' : formatGrouped(Math.round(dpPreview.prixPieceAjusteIntegrite || 0), 0)}" readonly data-default-piece-id="${defaultPieceId}" data-default-piece-display="prixPieceAjuste">
                                <span class="lot-input-unit">€</span>
                            </div>
                        </div>
                        <div class="lot-field-block">
                            <label class="lot-field-label">Intégrité lot</label>
                            <input type="text" class="lot-input" value="${integrityLabel}" readonly data-default-piece-id="${defaultPieceId}" data-default-piece-display="integriteLot">
                        </div>
                    </div>
                </div>
                <div class="lot-group">
                    <p class="lot-group-title">Carbone</p>
                    <div class="lot-carbon-input-row">
                        <div class="lot-carbon-volumique-row">
                            <div class="lot-field-block">
                                <label class="lot-field-label">Masse volumique théorique</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact lot-input-with-unit--mass-density">
                                    <input type="text" inputmode="decimal" class="lot-input" value="${viewValue(this.formatAllotissementNumericDisplay(pMasseVol))}" data-default-piece-id="${defaultPieceId}" data-default-piece-input="masseVolumique">
                                    <span class="lot-input-unit">kg/m3</span>
                                </div>
                                <p class="lot-field-meta" data-default-piece-id="${defaultPieceId}" data-default-piece-display="masseVolumiqueSource">${showAsDisabled ? '' : pMasseVolSourceLabel}</p>
                            </div>
                            <div class="lot-field-block">
                                <label class="lot-field-label">Masse volumique mesurée</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact lot-input-with-unit--mass-density">
                                    <input type="text" class="lot-input" value="${viewValue(measuredDensityDisplay)}" readonly data-default-piece-id="${defaultPieceId}" data-default-piece-display="masseVolumiqueMesuree">
                                    <span class="lot-input-unit">kg/m3</span>
                                </div>
                            </div>
                        </div>
                        <div class="lot-carbon-unit-row">
                            <div class="lot-field-block">
                                <label class="lot-field-label">Masse unitaire théorique</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact">
                                    <input type="text" class="lot-input" value="${viewValue(masseDisplay.value)}" readonly data-default-piece-id="${defaultPieceId}" data-default-piece-display="massePiece">
                                    <span class="lot-input-unit" data-default-piece-id="${defaultPieceId}" data-default-piece-display="massePieceUnit">${masseDisplay.unit}</span>
                                </div>
                            </div>
                            <div class="lot-field-block">
                                <label class="lot-field-label">Masse unitaire mesurée</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact">
                                    <input type="text" inputmode="decimal" class="lot-input" value="${viewValue(this.formatAllotissementNumericDisplay(defaultPiece.massePieceMesuree))}" data-default-piece-id="${defaultPieceId}" data-default-piece-input="massePieceMesuree">
                                    <span class="lot-input-unit">kg</span>
                                </div>
                            </div>
                        </div>
                        <div class="lot-carbon-other-row">
                            <div class="lot-field-block">
                                <label class="lot-field-label">Fraction C</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact">
                                    <input type="text" inputmode="decimal" class="lot-input" value="${viewValue(this.formatAllotissementNumericDisplay(pFractionC))}" data-default-piece-id="${defaultPieceId}" data-default-piece-input="fractionCarbonee">
                                    <span class="lot-input-unit">%</span>
                                </div>
                            </div>
                            <div class="lot-field-block">
                                <label class="lot-field-label">Humidité</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact">
                                    <input type="text" inputmode="decimal" class="lot-input" value="${viewValue(this.formatAllotissementNumericDisplay(pHumidite))}" data-default-piece-id="${defaultPieceId}" data-default-piece-input="humidite">
                                    <span class="lot-input-unit">%</span>
                                </div>
                            </div>
                            <div class="lot-field-block">
                                <label class="lot-field-label">Bois</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact">
                                    <input type="text" inputmode="decimal" class="lot-input" value="${viewValue(this.formatAllotissementNumericDisplay(pBois))}" data-default-piece-id="${defaultPieceId}" data-default-piece-input="bois">
                                    <span class="lot-input-unit">%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="lot-carbon-summary-row">
                        <div class="lot-field-block">
                            <label class="lot-field-label">PCO₂ pièce théorique</label>
                            <div class="lot-input-with-unit">
                                <input type="text" class="lot-input" value="${viewValue(pco2Display.value)}" readonly data-default-piece-id="${defaultPieceId}" data-default-piece-display="carboneBiogeniqueEstime">
                                <span class="lot-input-unit" data-default-piece-id="${defaultPieceId}" data-default-piece-display="carboneBiogeniqueEstimeUnit">${pco2Display.unit}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="lot-group">
                    <p class="lot-group-title">Ancienneté du bois</p>
                    <div class="lot-inline-grid lot-inline-grid--3">
                        <div class="lot-field-block">
                            <label class="lot-field-label">Âge de<br>l'arbre</label>
                            <div class="lot-input-with-unit lot-input-with-unit--compact">
                                <input type="text" inputmode="decimal" class="lot-input" value="${viewValue(defaultPiece.ageArbre || '')}" data-default-piece-id="${defaultPieceId}" data-default-piece-input="ageArbre">
                                <span class="lot-input-unit">ans</span>
                            </div>
                        </div>
                        <div class="lot-field-block">
                            <label class="lot-field-label">Date de mise<br>en service</label>
                            <input type="text" class="lot-input" value="${viewValue(defaultPiece.dateMiseEnService || '')}" data-default-piece-id="${defaultPieceId}" data-default-piece-input="dateMiseEnService">
                        </div>
                        <div class="lot-field-block">
                            <label class="lot-field-label">Amortissement<br>biologique</label>
                            <input type="text" class="lot-input" value="${viewValue(this.computeAmortissementBiologique(defaultPiece.ageArbre, defaultPiece.dateMiseEnService))}" readonly data-default-piece-id="${defaultPieceId}" data-default-piece-display="amortissementBiologique">
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    renderPieceCardHTML(piece, pieceIndex, lot, isActive = true) {
        const formatGrouped = (value, digits = 0) => (parseFloat(value) || 0).toLocaleString(getValoboisIntlLocale(), {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
        const formatOneDecimal = (value) => formatGrouped(value, 1);

        const pEffTypePiece = piece.typePiece || lot.allotissement.typePiece || '';
        const pEffTypeProduit = piece.typeProduit || lot.allotissement.typeProduit || '';
        const pEffEssenceCommun = piece.essenceNomCommun || lot.allotissement.essenceNomCommun || '';
        const pEffEssenceScientifique = piece.essenceNomScientifique || lot.allotissement.essenceNomScientifique || '';
        const pPriceUnit = ((piece.prixUnite || lot.allotissement.prixUnite || 'm3') + '').toLowerCase();
        const pPrixMarche = piece.prixMarche !== '' ? piece.prixMarche : lot.allotissement.prixMarche;
        const pMasseVol = piece.masseVolumique !== '' ? piece.masseVolumique : String(this.getInitialPieceMasseVolumique(piece));
        const pMasseVolSourceLabel = this.getMasseVolumiqueSourceLabel({
            essenceNomCommun: pEffEssenceCommun,
            essenceNomScientifique: pEffEssenceScientifique,
            _ownMasseVolumique: piece.masseVolumique
        });
        const pHumidite = piece.humidite !== '' ? piece.humidite : lot.allotissement.humidite;
        const pFractionC = piece.fractionCarbonee !== '' ? piece.fractionCarbonee : lot.allotissement.fractionCarbonee;
        const pBois = piece.bois !== '' ? piece.bois : lot.allotissement.bois;
        const pco2Display = this.formatPco2Display(piece.carboneBiogeniqueEstime);
        const masseDisplay = this.formatMasseDisplay(piece.massePiece);
        const measuredDensityDisplay = this.formatMeasuredDensityDisplay(piece.massePieceMesuree, piece.volumePiece);
        const integriteData = (lot.inspection && lot.inspection.integrite) || {};
        const integrityLabel = integriteData.ignore ? 'Ignoré'
            : integriteData.niveau === 'forte' ? `Forte (${integriteData.coeff ?? '...'})`
            : integriteData.niveau === 'moyenne' ? `Moyenne (${integriteData.coeff ?? '...'})`
            : integriteData.niveau === 'faible' ? `Faible (${integriteData.coeff ?? '...'})`
            : '...';

        const hasDiametre = piece.diametre !== '' && piece.diametre != null;
        const hasLH = (piece.largeur !== '' && piece.largeur != null) || (piece.epaisseur !== '' && piece.epaisseur != null);
        const _lDim = parseFloat(piece.largeur) || 0;
        const _hDim = parseFloat(piece.epaisseur) || 0;
        const isSurfaceMutedByShape = _hDim > 55 || (_lDim > 0 && _hDim > 0 && _lDim / _hDim <= 4);
        const isSurfaceMuted = hasDiametre || isSurfaceMutedByShape;

        return `
        <div class="piece-card ${isActive ? 'piece-card--active' : 'piece-card--passive'}" data-piece-index="${pieceIndex}" data-detail-card-key="piece:${pieceIndex}">
            <div class="piece-card-header">
                <span class="piece-card-title">${piece.nom || ('Pièce ' + (pieceIndex + 1))}</span>
                <div class="piece-card-actions">
                    <button class="piece-delete-btn" type="button" data-piece-delete="${pieceIndex}">✕</button>
                    <button class="piece-duplicate-btn" type="button" data-piece-duplicate="${pieceIndex}" title="Dupliquer cette pièce">Dupliquer</button>
                </div>
            </div>
            <div class="piece-form-grid">
                <div class="lot-group" style="margin-bottom: 6px;">
                    <div class="lot-inline-grid lot-inline-grid--2">
                        <div class="lot-field-block">
                            <label class="lot-field-label lot-field-label--hidden">Bâtiment, zone, espace…</label>
                            <input type="text" class="lot-input" value="${piece.localisation || ''}" placeholder="Bâtiment, zone, espace…" data-piece-input="localisation">
                        </div>
                        <div class="lot-field-block">
                            <label class="lot-field-label lot-field-label--hidden">Situation</label>
                            <input type="text" class="lot-input" value="${piece.situation || ''}" placeholder="Situation du lot" data-piece-input="situation" list="liste-situations" autocomplete="off">
                        </div>
                    </div>
                </div>
                <div class="lot-group" style="margin-bottom: 4px;">
                    <p class="lot-group-title">Type de pièce, essence</p>
                    <div class="lot-field-block">
                        <div class="lot-essence-picker">
                            <input type="text" class="lot-input" value="${pEffTypePiece}" placeholder="Type de pièce" data-piece-input="typePiece" list="liste-termes-bois" autocomplete="off">
                        </div>
                    </div>
                    <div class="lot-field-block">
                        <input type="text" class="lot-input" value="${pEffTypeProduit}" placeholder="Type de produit" data-piece-input="typeProduit" list="liste-types-produit" autocomplete="off">
                    </div>
                    <div class="lot-inline-grid lot-inline-grid--lot-essence">
                        <input type="text" class="lot-input lot-input--essence-common" value="${pEffEssenceCommun}" placeholder="Essence (nom commun)" data-piece-input="essenceNomCommun" list="liste-essences-communes" autocomplete="off">
                        <input type="text" class="lot-input lot-input--essence-scientific" value="${pEffEssenceScientifique}" placeholder="Essence (nom scientifique)" data-piece-input="essenceNomScientifique" list="liste-essences-scientifiques" autocomplete="off">
                    </div>
                </div>
                <div class="lot-group">
                    <p class="lot-group-title">Dimensions, volume, surface</p>
                    <div class="lot-inline-grid lot-inline-grid--lot-dimensions">
                        <div class="lot-dimension-field">
                            <label class="lot-field-label">Longueur</label>
                            <div class="lot-dimension-input-wrap" data-has-value="${piece.longueur !== '' && piece.longueur != null ? 'true' : 'false'}">
                                <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(piece.longueur)}" data-piece-input="longueur" oninput="this.parentElement.dataset.hasValue = this.value !== '' ? 'true' : 'false'">
                                <span class="lot-dimension-unit">mm</span>
                            </div>
                            <div class="lot-dimension-computed">
                                <label class="lot-field-label">Volume unitaire</label>
                                <div class="lot-input-with-unit">
                                    <input type="text" class="lot-input" value="${formatGrouped(piece.volumePiece, 3)}" readonly data-piece-display="volumePiece">
                                    <span class="lot-input-unit">m3</span>
                                </div>
                            </div>
                        </div>
                        <div class="lot-dimension-field"${hasDiametre ? ' data-muted="true"' : ''}>
                            <label class="lot-field-label">Largeur</label>
                            <div class="lot-dimension-input-wrap" data-has-value="${piece.largeur !== '' && piece.largeur != null ? 'true' : 'false'}">
                                <input type="text" inputmode="decimal" class="lot-input lot-input--with-placeholder" value="${this.formatAllotissementNumericDisplay(piece.largeur)}" placeholder="Face, Plat…" data-piece-input="largeur" oninput="this.parentElement.dataset.hasValue = this.value !== '' ? 'true' : 'false'">
                                <span class="lot-dimension-unit">mm</span>
                            </div>
                            <div class="lot-dimension-computed"${isSurfaceMuted ? ' data-muted="true"' : ''}>
                                <label class="lot-field-label">Surface unitaire</label>
                                <div class="lot-input-with-unit">
                                    <input type="text" class="lot-input" value="${isSurfaceMuted ? '' : formatOneDecimal(piece.surfacePiece)}" readonly data-piece-display="surfacePiece">
                                    <span class="lot-input-unit">m2</span>
                                </div>
                            </div>
                        </div>
                        <div class="lot-dimension-field"${hasDiametre ? ' data-muted="true"' : ''}>
                            <label class="lot-field-label">Épaisseur</label>
                            <div class="lot-dimension-input-wrap" data-has-value="${piece.epaisseur !== '' && piece.epaisseur != null ? 'true' : 'false'}">
                                <input type="text" inputmode="decimal" class="lot-input lot-input--with-placeholder" value="${this.formatAllotissementNumericDisplay(piece.epaisseur)}" placeholder="Chant, Rive…" data-piece-input="epaisseur" oninput="this.parentElement.dataset.hasValue = this.value !== '' ? 'true' : 'false'">
                                <span class="lot-dimension-unit">mm</span>
                            </div>
                            <div class="lot-dimension-computed"${hasLH ? ' data-muted="true"' : ''}>
                                <label class="lot-field-label">Diamètre</label>
                                <div class="lot-input-with-unit">
                                    <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(piece.diametre)}" data-piece-input="diametre">
                                    <span class="lot-input-unit">mm</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="lot-group" data-prix-group-disabled="${lot.allotissement.prixLotDirect ? 'true' : 'false'}">
                    <p class="lot-group-title">Prix</p>
                    <div class="lot-field-block">
                        <label class="lot-field-label lot-field-label--subsection">Prix du marché</label>
                        <div class="lot-price-market-row">
                            <div class="lot-input-with-unit">
                                <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(pPrixMarche)}" data-piece-input="prixMarche"${lot.allotissement.prixLotDirect ? ' readonly' : ''}>
                                <span class="lot-input-unit" data-piece-display="prixMarcheUnit">€/${pPriceUnit}</span>
                            </div>
                            <div class="lot-price-unit-toggle" role="group" aria-label="Unité de prix">
                                <button type="button" class="lot-price-unit-btn" data-piece-price-unit="ml" aria-pressed="${pPriceUnit === 'ml' ? 'true' : 'false'}"${lot.allotissement.prixLotDirect ? ' disabled' : ''}>au ml</button>
                                <button type="button" class="lot-price-unit-btn" data-piece-price-unit="m2" aria-pressed="${pPriceUnit === 'm2' ? 'true' : 'false'}"${lot.allotissement.prixLotDirect ? ' disabled' : ''}>au m2</button>
                                <button type="button" class="lot-price-unit-btn" data-piece-price-unit="m3" aria-pressed="${pPriceUnit !== 'ml' && pPriceUnit !== 'm2' ? 'true' : 'false'}"${lot.allotissement.prixLotDirect ? ' disabled' : ''}>au m3</button>
                            </div>
                        </div>
                    </div>
                    <div class="lot-price-summary-row">
                        <div class="lot-field-block">
                            <label class="lot-field-label">Prix de la pièce</label>
                            <div class="lot-input-with-unit lot-input-with-unit--compact">
                                <input type="text" class="lot-input" value="${formatGrouped(Math.round(piece.prixPiece || 0), 0)}" readonly data-piece-display="prixPiece">
                                <span class="lot-input-unit">€</span>
                            </div>
                        </div>
                        <div class="lot-field-block"${integriteData.ignore ? ' data-muted="true"' : ''}>
                            <label class="lot-field-label">Prix ajusté</label>
                            <div class="lot-input-with-unit lot-input-with-unit--compact">
                                <input type="text" class="lot-input" value="${integriteData.ignore ? '' : formatGrouped(Math.round(piece.prixPieceAjusteIntegrite || 0), 0)}" readonly data-piece-display="prixPieceAjuste">
                                <span class="lot-input-unit">€</span>
                            </div>
                        </div>
                        <div class="lot-field-block">
                            <label class="lot-field-label">Intégrité lot</label>
                            <input type="text" class="lot-input" value="${integrityLabel}" readonly data-piece-display="integriteLot">
                        </div>
                    </div>
                </div>
                <div class="lot-group">
                    <p class="lot-group-title">Carbone</p>
                    <div class="lot-carbon-input-row">
                        <div class="lot-carbon-volumique-row">
                            <div class="lot-field-block">
                                <label class="lot-field-label">Masse volumique théorique</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact lot-input-with-unit--mass-density">
                                    <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(pMasseVol)}" data-piece-input="masseVolumique">
                                    <span class="lot-input-unit">kg/m3</span>
                                </div>
                                <p class="lot-field-meta" data-piece-display="masseVolumiqueSource">${pMasseVolSourceLabel}</p>
                            </div>
                            <div class="lot-field-block">
                                <label class="lot-field-label">Masse volumique mesurée</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact lot-input-with-unit--mass-density">
                                    <input type="text" class="lot-input" value="${measuredDensityDisplay}" readonly data-piece-display="masseVolumiqueMesuree">
                                    <span class="lot-input-unit">kg/m3</span>
                                </div>
                            </div>
                        </div>
                        <div class="lot-carbon-unit-row">
                            <div class="lot-field-block">
                                <label class="lot-field-label">Masse unitaire théorique</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact">
                                    <input type="text" class="lot-input" value="${masseDisplay.value}" readonly data-piece-display="massePiece">
                                    <span class="lot-input-unit" data-piece-display="massePieceUnit">${masseDisplay.unit}</span>
                                </div>
                            </div>
                            <div class="lot-field-block">
                                <label class="lot-field-label">Masse unitaire mesurée</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact">
                                    <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(piece.massePieceMesuree)}" data-piece-input="massePieceMesuree">
                                    <span class="lot-input-unit">kg</span>
                                </div>
                            </div>
                        </div>
                        <div class="lot-carbon-other-row">
                            <div class="lot-field-block">
                                <label class="lot-field-label">Fraction C</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact">
                                    <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(pFractionC)}" data-piece-input="fractionCarbonee">
                                    <span class="lot-input-unit">%</span>
                                </div>
                            </div>
                            <div class="lot-field-block">
                                <label class="lot-field-label">Humidité</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact">
                                    <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(pHumidite)}" data-piece-input="humidite">
                                    <span class="lot-input-unit">%</span>
                                </div>
                            </div>
                            <div class="lot-field-block">
                                <label class="lot-field-label">Bois</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact">
                                    <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(pBois)}" data-piece-input="bois">
                                    <span class="lot-input-unit">%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="lot-carbon-summary-row">
                        <div class="lot-field-block">
                            <label class="lot-field-label">PCO₂ pièce théorique</label>
                            <div class="lot-input-with-unit">
                                <input type="text" class="lot-input" value="${pco2Display.value}" readonly data-piece-display="carboneBiogeniqueEstime">
                                <span class="lot-input-unit" data-piece-display="carboneBiogeniqueEstimeUnit">${pco2Display.unit}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="lot-group">
                    <p class="lot-group-title">Ancienneté du bois</p>
                    <div class="lot-inline-grid lot-inline-grid--3">
                        <div class="lot-field-block">
                            <label class="lot-field-label">Âge de<br>l'arbre</label>
                            <div class="lot-input-with-unit lot-input-with-unit--compact">
                                <input type="text" inputmode="decimal" class="lot-input" value="${piece.ageArbre || ''}" data-piece-input="ageArbre">
                                <span class="lot-input-unit">ans</span>
                            </div>
                        </div>
                        <div class="lot-field-block">
                            <label class="lot-field-label">Date de mise<br>en service</label>
                            <input type="text" class="lot-input" value="${piece.dateMiseEnService || ''}" data-piece-input="dateMiseEnService">
                        </div>
                        <div class="lot-field-block">
                            <label class="lot-field-label">Amortissement<br>biologique</label>
                            <input type="text" class="lot-input" value="${this.computeAmortissementBiologique(piece.ageArbre, piece.dateMiseEnService)}" readonly data-piece-display="amortissementBiologique">
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    renderAllotissement () {
    const rail = document.getElementById('lotRail');
    const sliderTrack = document.getElementById('lotSliderTrack');
    const lotLabel = document.getElementById('activeLotLabel');

    if (!rail || !sliderTrack) return;

    rail.innerHTML = '';
    sliderTrack.innerHTML = '';

    const lots = this.data.lots;
    const currentLot = this.getCurrentLot();

    // Titre de l'en-tête
    if (lotLabel && currentLot) {
        const index = lots.indexOf(currentLot);
        lotLabel.textContent = index >= 0 ? `Lot ${index + 1}` : 'Lot';
    }

    // BOUCLE SUR CHAQUE LOT
    lots.forEach((lot, index) => {
        const formatGrouped = (value, digits = 0) => (parseFloat(value) || 0).toLocaleString(getValoboisIntlLocale(), {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
        const formatOneDecimal = (value) => formatGrouped(value, 1);

        this.normalizeLotEssenceFields(lot);
        this.normalizeLotAllotissementFields(lot);
        this.ensureDefaultPiecesData(lot, { createIfEmpty: false });
        lot.allotissement.quantite = String(this.getLotQuantityFromDetail(lot));
        this.recalculateLotAllotissement(lot);

        const card = document.createElement('div');
        card.className = 'lot-card ' + (index === this.currentLotIndex ? 'lot-card--active' : 'lot-card--passive');
        card.dataset.lotIndex = String(index);

        const lotOrientationLabel = lot.orientationLabel || '…';
        const lotOrientationClass = lot.orientationCode ? `lot-orientation--${lot.orientationCode}` : 'lot-orientation--none';
        const lotDisplayName = (!lot.nom || lot.nom === 'Nouveau Lot') ? `Lot ${index + 1}` : lot.nom;
        const lotTypePieceDisplay = this.getLotAggregatedTextValue(lot, 'typePiece');
        const lotTypeProduitDisplay = this.getLotAggregatedTextValue(lot, 'typeProduit');
        const lotEssenceCommonDisplay = this.getLotAggregatedTextValue(lot, 'essenceNomCommun');
        const lotEssenceScientificDisplay = this.getLotAggregatedTextValue(lot, 'essenceNomScientifique');
        const showTypePieceDetailsBtn = lotTypePieceDisplay === 'Multiples';
        const showTypeProduitDetailsBtn = lotTypeProduitDisplay === 'Multiples';
        const showEssenceDetailsBtn = lotEssenceCommonDisplay === 'Multiples' || lotEssenceScientificDisplay === 'Multiples';
        const priceUnit = ((lot.allotissement.prixUnite || 'm3') + '').toLowerCase();
        const pco2Display = this.formatPco2Display(lot.allotissement.carboneBiogeniqueEstime);
        const masseLotDisplay = this.formatMasseDisplay(lot.allotissement.masseLot);
        const masseLotMesureeDisplay = this.getMeasuredLotMassDisplay(lot);
        const masseVolumiqueMoyenneMesureeDisplay = this.getMeasuredLotDensityDisplay(lot);
        const masseVolumiqueSourceLabel = this.getMasseVolumiqueSourceLabel(lot.allotissement);
        const integriteData = (lot.inspection && lot.inspection.integrite) || {};
        const lotIntegrityLabel = integriteData.ignore
            ? 'Ignoré'
            : integriteData.niveau === 'forte'
                ? `Forte (${integriteData.coeff ?? '...'})`
                : integriteData.niveau === 'moyenne'
                    ? `Moyenne (${integriteData.coeff ?? '...'})`
                    : integriteData.niveau === 'faible'
                        ? `Faible (${integriteData.coeff ?? '...'})`
                        : '...';

        const hasDetailDimensions = this.getLotQuantityFromDetail(lot) > 0;
        const hasDiametre = (lot.allotissement.diametre !== '' && lot.allotissement.diametre != null) || (hasDetailDimensions && (lot.allotissement._avgDiametre || 0) > 0);
        const hasLargeurEpaisseur = (lot.allotissement.largeur !== '' && lot.allotissement.largeur != null) || (lot.allotissement.epaisseur !== '' && lot.allotissement.epaisseur != null) || (hasDetailDimensions && ((lot.allotissement._avgLargeur || 0) > 0 || (lot.allotissement._avgEpaisseur || 0) > 0));
        const _lDim = parseFloat(hasDetailDimensions ? lot.allotissement._avgLargeur : lot.allotissement.largeur) || 0;
        const _hDim = parseFloat(hasDetailDimensions ? lot.allotissement._avgEpaisseur : lot.allotissement.epaisseur) || 0;
        const isSurfaceMutedByShape = _hDim > 55 || (_lDim > 0 && _hDim > 0 && _lDim / _hDim <= 4);
        const isSurfaceMuted = hasDiametre || isSurfaceMutedByShape;
        const locationSituationGroups = this.getLotLocationSituationGroups(lot);
        const hasLocationGroups = locationSituationGroups.length > 0;
        const localisationDistinctCount = new Set(
            locationSituationGroups
                .map((group) => (group.localisation || '').toString().trim())
                .filter(Boolean)
        ).size;
        const situationDistinctCount = new Set(
            locationSituationGroups
                .map((group) => (group.situation || '').toString().trim())
                .filter(Boolean)
        ).size;
        const localisationTitle = localisationDistinctCount > 1 ? `Localisations (${localisationDistinctCount})` : 'Localisation';
        const situationTitle = situationDistinctCount > 1 ? `Situations (${situationDistinctCount})` : 'Situation';
        const hasNotationAlert = this.hasIncompleteNotationCriteria(lot);
        const hasDestinationAlert = this.hasIncompleteDestinationFields(lot);
        const displayLongueur = hasDetailDimensions ? ((lot.allotissement._avgLongueur || 0) > 0 ? String(Math.round(lot.allotissement._avgLongueur)) : '') : lot.allotissement.longueur;
        const displayLargeur = hasDetailDimensions ? ((lot.allotissement._avgLargeur || 0) > 0 ? String(Math.round(lot.allotissement._avgLargeur)) : '') : lot.allotissement.largeur;
        const displayEpaisseur = hasDetailDimensions ? ((lot.allotissement._avgEpaisseur || 0) > 0 ? String(Math.round(lot.allotissement._avgEpaisseur)) : '') : lot.allotissement.epaisseur;
        const displayDiametre = hasDetailDimensions ? ((lot.allotissement._avgDiametre || 0) > 0 ? String(Math.round(lot.allotissement._avgDiametre)) : '') : lot.allotissement.diametre;
        const hasDisplayLongueur = displayLongueur !== '' && displayLongueur != null;
        const hasDisplayLargeur = displayLargeur !== '' && displayLargeur != null;
        const hasDisplayEpaisseur = displayEpaisseur !== '' && displayEpaisseur != null;

        card.innerHTML = `
            <div class="lot-card-header">
                <div class="lot-card-header-left">
                    <p class="lot-name-label" aria-label="Nom du lot">${lotDisplayName}</p>
                    <span class="lot-orientation-badge ${lotOrientationClass}" data-lot-orientation-badge>${lotOrientationLabel}</span>
                </div>
                <div class="lot-card-header-actions">
                    <button class="lot-delete-btn" type="button">✕</button>
                    <button type="button" class="lot-alert-btn lot-alert-btn--header" data-alert-notation="${hasNotationAlert ? 'true' : 'false'}" data-lot-notation-alert-btn>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </button>
                </div>
            </div>
            <div class="lot-form-grid mt-16">
                <div class="lot-field-block lot-field-block--full">
                    <div class="lot-group" style="margin-bottom: 6px;">
                        <div class="lot-location-group-nav" data-lot-location-groups data-group-count="${locationSituationGroups.length}">
                            <div class="lot-location-grid">
                                <div class="lot-field-block">
                                    <label class="lot-field-label" data-lot-location-label="localisation">${localisationTitle}</label>
                                    <div class="lot-location-field-row">
                                        <input type="text" class="lot-input" value="" readonly data-lot-location-field="localisation">
                                        <button type="button" class="btn btn-primary lot-location-cycle-btn" data-lot-location-next ${hasLocationGroups ? '' : 'disabled'} aria-label="Combinaison suivante"><svg class="lot-location-cycle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l8 6-8 6V6z"/></svg></button>
                                    </div>
                                </div>
                                <div class="lot-field-block">
                                    <label class="lot-field-label" data-lot-location-label="situation">${situationTitle}</label>
                                    <div class="lot-location-field-row">
                                        <input type="text" class="lot-input" value="" readonly data-lot-location-field="situation">
                                        <button type="button" class="btn btn-primary lot-location-cycle-btn" data-lot-location-prev ${hasLocationGroups ? '' : 'disabled'} aria-label="Combinaison précédente"><svg class="lot-location-cycle-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-8 6 8 6V6z"/></svg></button>
                                    </div>
                                </div>
                                <div class="lot-field-block">
                                    <label class="lot-field-label" data-lot-location-label="pieces">Pièce dans cette combinaison</label>
                                    <div class="lot-location-pieces-row">
                                        <input type="text" class="lot-input" value="" readonly data-lot-location-field="pieceNames">
                                        <button type="button" class="btn btn-secondary lot-detail-btn lot-location-open-btn" data-lot-location-open-pieces ${hasLocationGroups ? '' : 'disabled'}>Détail</button>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                    <div class="lot-group">
                        <p class="lot-group-title">Groupe : type de pièce, type de produit, quantité, essence</p>
                        <div class="lot-type-qty-grid">
                            <div class="lot-field-block">
                                <label class="lot-field-label">Quantité</label>
                                <div class="lot-qty-row">
                                    <input type="text" inputmode="numeric" class="lot-input lot-input--qty" value="${this.formatAllotissementNumericDisplay(lot.allotissement.quantite)}" data-lot-input="quantite" readonly>
                                    <span class="lot-pieces-badge" data-display="piecesBadge">${lot.pieces.length}/${Math.max(parseFloat(lot.allotissement.quantite) || 0, lot.pieces.length)}</span>
                                    <button type="button" class="lot-alert-btn" data-alert-active="${(parseFloat(lot.allotissement.quantite) || 0) > lot.pieces.length ? 'true' : 'false'}" data-alert-missing="${((parseFloat(lot.allotissement.quantite) || 0) > lot.pieces.length) ? 'false' : (this.hasIncompleteDetailLotPieces(lot) ? 'true' : 'false')}" data-lot-alert-btn>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                    </button>
                                </div>
                            </div>
                            <div class="lot-field-block">
                                <label class="lot-field-label">Type de pièce</label>
                                <div class="lot-type-with-detail${showTypePieceDetailsBtn ? ' has-detail-btn' : ''}">
                                    <div class="lot-essence-picker">
                                        <input
                                            type="text"
                                            class="lot-input"
                                            value="${lotTypePieceDisplay}"
                                            data-lot-input="typePiece"
                                            list="liste-termes-bois"
                                            autocomplete="off">
                                    </div>
                                    <button type="button" class="btn btn-secondary lot-detail-btn" data-lot-details-btn="typePiece"${showTypePieceDetailsBtn ? '' : ' hidden'}>Détail des pièces</button>
                                </div>
                            </div>
                            <div class="lot-field-block">
                                <label class="lot-field-label">Type de produit</label>
                                <div class="lot-type-with-detail${showTypeProduitDetailsBtn ? ' has-detail-btn' : ''}">
                                    <div class="lot-essence-picker">
                                        <input
                                            type="text"
                                            class="lot-input"
                                            value="${lotTypeProduitDisplay}"
                                            data-lot-input="typeProduit"
                                            list="liste-types-produit"
                                            autocomplete="off">
                                    </div>
                                    <button type="button" class="btn btn-secondary lot-detail-btn" data-lot-details-btn="typeProduit"${showTypeProduitDetailsBtn ? '' : ' hidden'}>Détail des produits</button>
                                </div>
                            </div>
                        </div>
                        <label class="lot-field-label lot-field-label--subsection">Essence</label>
                        <div class="lot-essence-with-detail${showEssenceDetailsBtn ? ' has-detail-btn' : ''}">
                            <div class="lot-inline-grid lot-inline-grid--lot-essence">
                                <input type="text" class="lot-input lot-input--essence-common" value="${lotEssenceCommonDisplay}" data-lot-input="essenceNomCommun" list="liste-essences-communes" autocomplete="off">
                                <input type="text" class="lot-input lot-input--essence-scientific" value="${lotEssenceScientificDisplay}" data-lot-input="essenceNomScientifique" list="liste-essences-scientifiques" autocomplete="off">
                            </div>
                            <button type="button" class="btn btn-secondary lot-detail-btn" data-lot-details-btn="essence"${showEssenceDetailsBtn ? '' : ' hidden'}>Détail des essences</button>
                        </div>
                    </div>
                    <div class="lot-group">
                        <p class="lot-group-title">Groupe : dimensions, volumes, surface</p>
                        <div class="lot-inline-grid lot-inline-grid--lot-dimensions">
                            <div class="lot-dimension-field">
                                <label class="lot-field-label">Longueur Moy.</label>
                                <div class="lot-dimension-input-wrap" data-has-value="${hasDisplayLongueur ? 'true' : 'false'}">
                                    <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(displayLongueur)}" data-lot-input="longueur" oninput="this.parentElement.dataset.hasValue = this.value !== '' ? 'true' : 'false'">
                                    <span class="lot-dimension-unit">mm</span>
                                </div>
                                <div class="lot-dimension-computed">
                                    <label class="lot-field-label">Volume unitaire</label>
                                    <div class="lot-input-with-unit">
                                        <input type="text" class="lot-input" value="${formatGrouped(lot.allotissement.volumePiece, 3)}" readonly data-display="volumePiece">
                                        <span class="lot-input-unit">m3</span>
                                    </div>
                                </div>
                                <div class="lot-dimension-computed">
                                    <label class="lot-field-label">Volume du lot</label>
                                    <div class="lot-input-with-unit">
                                        <input type="text" class="lot-input" value="${formatOneDecimal(lot.allotissement.volumeLot)}" readonly data-display="volumeLot">
                                        <span class="lot-input-unit">m3</span>
                                    </div>
                                </div>
                            </div>
                            <div class="lot-dimension-field"${hasDiametre ? ' data-muted="true"' : ''}>
                                <label class="lot-field-label">Largeur Moy.</label>
                                <div class="lot-dimension-input-wrap" data-has-value="${hasDisplayLargeur ? 'true' : 'false'}">
                                    <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(displayLargeur)}" data-lot-input="largeur" oninput="this.parentElement.dataset.hasValue = this.value !== '' ? 'true' : 'false'">
                                    <span class="lot-dimension-unit">mm</span>
                                </div>
                                <div class="lot-dimension-computed"${isSurfaceMuted ? ' data-muted="true"' : ''}>
                                    <label class="lot-field-label">Surface unitaire</label>
                                    <div class="lot-input-with-unit">
                                        <input type="text" class="lot-input" value="${isSurfaceMuted ? '' : formatOneDecimal(lot.allotissement.surfacePiece)}" readonly data-display="surfacePiece">
                                        <span class="lot-input-unit">m2</span>
                                    </div>
                                </div>
                                <div class="lot-dimension-computed"${isSurfaceMuted ? ' data-muted="true"' : ''}>
                                    <label class="lot-field-label">Surface du lot</label>
                                    <div class="lot-input-with-unit">
                                        <input type="text" class="lot-input" value="${isSurfaceMuted ? '' : formatOneDecimal(lot.allotissement.surfaceLot)}" readonly data-display="surfaceLot">
                                        <span class="lot-input-unit">m2</span>
                                    </div>
                                </div>
                            </div>
                            <div class="lot-dimension-field"${hasDiametre ? ' data-muted="true"' : ''}>
                                <label class="lot-field-label">Épaisseur Moy.</label>
                                <div class="lot-dimension-input-wrap" data-has-value="${hasDisplayEpaisseur ? 'true' : 'false'}">
                                    <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(displayEpaisseur)}" data-lot-input="epaisseur" oninput="this.parentElement.dataset.hasValue = this.value !== '' ? 'true' : 'false'">
                                    <span class="lot-dimension-unit">mm</span>
                                </div>
                                <div class="lot-dimension-computed"${hasLargeurEpaisseur ? ' data-muted="true"' : ''}>
                                    <label class="lot-field-label">Diamètre</label>
                                    <div class="lot-input-with-unit">
                                        <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(displayDiametre)}" data-lot-input="diametre">
                                        <span class="lot-input-unit">mm</span>
                                    </div>
                                </div>
                                <div class="lot-dimension-computed">
                                    <label class="lot-field-label">Linéaire du lot</label>
                                    <div class="lot-input-with-unit">
                                        <input type="text" class="lot-input" value="${formatOneDecimal(lot.allotissement.lineaireLot)}" readonly data-display="lineaireLot">
                                        <span class="lot-input-unit">m</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="lot-group">
                        <div class="lot-piece-type-summary-inline">
                            <div class="lot-taux-piecetype-header">
                                <h3 class="lot-taux-piecetype-title">Pièce type</h3>
                                <button type="button" class="lot-taux-info-btn" data-lot-taux-info-btn aria-label="Informations sur le Taux de similarité et la Pièce type">info</button>
                            </div>
                            <div class="lot-taux-piecetype-wrapper">
                                <div class="lot-field-block lot-field-block--taux-similarite lot-field-block--piece-type-summary">
                                    <div class="lot-piece-type-fields">
                                        <div class="lot-piece-type-field lot-piece-type-field--nom">
                                            <label class="lot-field-label">Nom</label>
                                            <div class="lot-dest-medoide-label lot-dest-medoide-label--taux lot-dest-medoide-label--piece-name" data-display="medoideNom">
                                                ${(() => {
                                                    const rawLabel = lot.allotissement.medoideLabel || 'Non calculé (≥ 2 pièces requises)';
                                                    return rawLabel;
                                                })()}
                                            </div>
                                        </div>
                                        <div class="lot-piece-type-field lot-piece-type-field--score">
                                            <label class="lot-field-label">Score</label>
                                            <div class="lot-dest-medoide-label lot-dest-medoide-label--taux" data-display="medoideScore">
                                                ${lot.allotissement.medoideScore !== null
                                                    ? `${Math.round(lot.allotissement.medoideScore)}\u00a0%`
                                                    : '—'}
                                            </div>
                                        </div>
                                        <div class="lot-piece-type-field lot-piece-type-field--taux">
                                            <label class="lot-field-label lot-field-label--two-lines">Taux de<br>similarité</label>
                                            <div class="lot-dest-medoide-label lot-dest-medoide-label--taux lot-taux-similarite-display"
                                                 data-display="tauxSimilarite">
                                                ${this.formatTauxSimilarite(lot.allotissement.tauxSimilarite)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="lot-inline-grid lot-inline-grid--4" data-variabilite-mode="${hasDiametre ? 'cylindrical' : 'rectangular'}" data-variabilite-grid="pieceType">
                            <div class="lot-field-block" data-variabilite-dim="longueur">
                                <label class="lot-field-label">L type</label>
                                <div class="lot-dimension-input-wrap" data-piece-type-dim-wrap="longueur" data-has-value="${lot.allotissement.medoideDims?.longueur != null ? 'true' : 'false'}">
                                    <input type="text" class="lot-input" value="${lot.allotissement.medoideDims?.longueur != null ? Math.round(lot.allotissement.medoideDims.longueur).toLocaleString(getValoboisIntlLocale(), { maximumFractionDigits: 0 }) : ''}" readonly data-display="pieceTypeLongueur">
                                    <span class="lot-dimension-unit">mm</span>
                                </div>
                            </div>
                            <div class="lot-field-block" data-variabilite-dim="largeur">
                                <label class="lot-field-label">l type</label>
                                <div class="lot-dimension-input-wrap" data-piece-type-dim-wrap="largeur" data-has-value="${lot.allotissement.medoideDims?.largeur != null ? 'true' : 'false'}">
                                    <input type="text" class="lot-input" value="${lot.allotissement.medoideDims?.largeur != null ? Math.round(lot.allotissement.medoideDims.largeur).toLocaleString(getValoboisIntlLocale(), { maximumFractionDigits: 0 }) : ''}" readonly data-display="pieceTypeLargeur">
                                    <span class="lot-dimension-unit">mm</span>
                                </div>
                            </div>
                            <div class="lot-field-block" data-variabilite-dim="epaisseur">
                                <label class="lot-field-label">e type</label>
                                <div class="lot-dimension-input-wrap" data-piece-type-dim-wrap="epaisseur" data-has-value="${lot.allotissement.medoideDims?.epaisseur != null ? 'true' : 'false'}">
                                    <input type="text" class="lot-input" value="${lot.allotissement.medoideDims?.epaisseur != null ? Math.round(lot.allotissement.medoideDims.epaisseur).toLocaleString(getValoboisIntlLocale(), { maximumFractionDigits: 0 }) : ''}" readonly data-display="pieceTypeEpaisseur">
                                    <span class="lot-dimension-unit">mm</span>
                                </div>
                            </div>
                            <div class="lot-field-block" data-variabilite-dim="diametre">
                                <label class="lot-field-label">d type</label>
                                <div class="lot-dimension-input-wrap" data-piece-type-dim-wrap="diametre" data-has-value="${lot.allotissement.medoideDims?.diametre != null ? 'true' : 'false'}">
                                    <input type="text" class="lot-input" value="${lot.allotissement.medoideDims?.diametre != null ? Math.round(lot.allotissement.medoideDims.diametre).toLocaleString(getValoboisIntlLocale(), { maximumFractionDigits: 0 }) : ''}" readonly data-display="pieceTypeDiametre">
                                    <span class="lot-dimension-unit">mm</span>
                                </div>
                            </div>
                        </div>
                        <details class="lot-group lot-group--collapsible lot-group--seuils-dest" data-ui-collapsible="seuils-dest" ${this.data?.ui?.collapsibles?.['seuils-dest'] === false ? '' : 'open'}>
                            <summary class="lot-group-summary">
                                <span>Seuils de destination</span>
                            </summary>
                            <div class="lot-group-content">

                                <p class="lot-seuils-section-title" style="font-weight:normal;opacity:0.75;margin-top:-4px;">
                                    Renseigner ici les bornes minimum et maximum admissibles pour que les pièces du lot soient définies comme similaires à la pièce type.
                                </p>

                                <div class="lot-dest-grid" data-variabilite-grid="seuilsDest" data-variabilite-mode="${hasDiametre ? 'cylindrical' : 'rectangular'}">
                                    <div></div>
                                    <div class="lot-dest-header-cell">Borne min</div>
                                    <div class="lot-dest-header-cell">Borne max</div>

                                    <div class="lot-seuils-dim-label" data-variabilite-dim="longueur">L</div>
                                    <div class="lot-dest-input-wrap" data-variabilite-dim="longueur">
                                        <input type="number" class="lot-dest-input"
                                               data-dest-seuil-dim="longueur" data-dest-seuil-bound="min"
                                                                                                 value="${lot.seuilsDestination?.longueur?.min ?? ''}"
                                               placeholder="—">
                                        <span class="lot-seuils-unit">mm</span>
                                    </div>
                                    <div class="lot-dest-input-wrap" data-variabilite-dim="longueur">
                                        <input type="number" class="lot-dest-input"
                                               data-dest-seuil-dim="longueur" data-dest-seuil-bound="max"
                                                                                                 value="${lot.seuilsDestination?.longueur?.max ?? ''}"
                                               placeholder="—">
                                        <span class="lot-seuils-unit">mm</span>
                                    </div>

                                    <div class="lot-seuils-dim-label" data-variabilite-dim="largeur">l</div>
                                                                        <div class="lot-dest-input-wrap" data-variabilite-dim="largeur">
                                                                                <input type="number" class="lot-dest-input"
                                                                                             data-dest-seuil-dim="largeur" data-dest-seuil-bound="min"
                                                                                                 value="${lot.seuilsDestination?.largeur?.min ?? ''}"
                                                                                             placeholder="—">
                                                                                <span class="lot-seuils-unit">mm</span>
                                                                        </div>
                                    <div class="lot-dest-input-wrap" data-variabilite-dim="largeur">
                                        <input type="number" class="lot-dest-input"
                                               data-dest-seuil-dim="largeur" data-dest-seuil-bound="max"
                                                                                                 value="${lot.seuilsDestination?.largeur?.max ?? ''}"
                                               placeholder="—">
                                        <span class="lot-seuils-unit">mm</span>
                                    </div>

                                    <div class="lot-seuils-dim-label" data-variabilite-dim="epaisseur">e</div>
                                                                        <div class="lot-dest-input-wrap" data-variabilite-dim="epaisseur">
                                                                                <input type="number" class="lot-dest-input"
                                                                                             data-dest-seuil-dim="epaisseur" data-dest-seuil-bound="min"
                                                                                                 value="${lot.seuilsDestination?.epaisseur?.min ?? ''}"
                                                                                             placeholder="—">
                                                                                <span class="lot-seuils-unit">mm</span>
                                                                        </div>
                                    <div class="lot-dest-input-wrap" data-variabilite-dim="epaisseur">
                                        <input type="number" class="lot-dest-input"
                                               data-dest-seuil-dim="epaisseur" data-dest-seuil-bound="max"
                                                                                                 value="${lot.seuilsDestination?.epaisseur?.max ?? ''}"
                                               placeholder="—">
                                        <span class="lot-seuils-unit">mm</span>
                                    </div>

                                    <div class="lot-seuils-dim-label" data-variabilite-dim="diametre">∅</div>
                                                                        <div class="lot-dest-input-wrap" data-variabilite-dim="diametre">
                                                                                <input type="number" class="lot-dest-input"
                                                                                             data-dest-seuil-dim="diametre" data-dest-seuil-bound="min"
                                                                                                 value="${lot.seuilsDestination?.diametre?.min ?? ''}"
                                                                                             placeholder="—">
                                                                                <span class="lot-seuils-unit">mm</span>
                                                                        </div>
                                    <div class="lot-dest-input-wrap" data-variabilite-dim="diametre">
                                        <input type="number" class="lot-dest-input"
                                               data-dest-seuil-dim="diametre" data-dest-seuil-bound="max"
                                                                                                 value="${lot.seuilsDestination?.diametre?.max ?? ''}"
                                               placeholder="—">
                                        <span class="lot-seuils-unit">mm</span>
                                    </div>

                                </div>
                            </div>
                        </details>
                        <details class="lot-group lot-group--collapsible lot-group--conformite-lot" data-ui-collapsible="conformite-lot" ${this.data?.ui?.collapsibles?.['conformite-lot'] === false ? '' : 'open'}>
                            <summary class="lot-group-summary">
                                <span>Conformité du lot</span>
                            </summary>
                            <div class="lot-group-content">
                                ${lot.allotissement.conformiteLot ? `
                                <div class="lot-conformite-gauges">
                                    <div class="lot-conformite-gauge-row">
                                        <span class="lot-conformite-gauge-label">Conforme</span>
                                        <div class="lot-conformite-gauge-track">
                                            <div class="lot-conformite-gauge-fill" style="width: ${lot.allotissement.conformiteLot.totalPieces > 0 ? (lot.allotissement.conformiteLot.nbConformes / lot.allotissement.conformiteLot.totalPieces * 100) : 0}%"></div>
                                        </div>
                                        <span class="lot-conformite-gauge-count">${lot.allotissement.conformiteLot.nbConformes}</span>
                                    </div>
                                    <div class="lot-conformite-gauge-row">
                                        <span class="lot-conformite-gauge-label">Recoupe</span>
                                        <div class="lot-conformite-gauge-track">
                                            <div class="lot-conformite-gauge-fill" style="width: ${lot.allotissement.conformiteLot.totalPieces > 0 ? (lot.allotissement.conformiteLot.nbRecoupe / lot.allotissement.conformiteLot.totalPieces * 100) : 0}%"></div>
                                        </div>
                                        <span class="lot-conformite-gauge-count">${lot.allotissement.conformiteLot.nbRecoupe}</span>
                                    </div>
                                    <div class="lot-conformite-gauge-row">
                                        <span class="lot-conformite-gauge-label">Corroyage</span>
                                        <div class="lot-conformite-gauge-track">
                                            <div class="lot-conformite-gauge-fill" style="width: ${lot.allotissement.conformiteLot.totalPieces > 0 ? (lot.allotissement.conformiteLot.nbCorroyage / lot.allotissement.conformiteLot.totalPieces * 100) : 0}%"></div>
                                        </div>
                                        <span class="lot-conformite-gauge-count">${lot.allotissement.conformiteLot.nbCorroyage}</span>
                                    </div>
                                    <div class="lot-conformite-gauge-row">
                                        <span class="lot-conformite-gauge-label">R&amp;C</span>
                                        <div class="lot-conformite-gauge-track">
                                            <div class="lot-conformite-gauge-fill" style="width: ${lot.allotissement.conformiteLot.totalPieces > 0 ? (lot.allotissement.conformiteLot.nbRecoupeCorroyage / lot.allotissement.conformiteLot.totalPieces * 100) : 0}%"></div>
                                        </div>
                                        <span class="lot-conformite-gauge-count">${lot.allotissement.conformiteLot.nbRecoupeCorroyage}</span>
                                    </div>
                                    <div class="lot-conformite-gauge-row">
                                        <span class="lot-conformite-gauge-label">Bois court</span>
                                        <div class="lot-conformite-gauge-track">
                                            <div class="lot-conformite-gauge-fill" style="width: ${lot.allotissement.conformiteLot.totalPieces > 0 ? (lot.allotissement.conformiteLot.nbBoisCourt / lot.allotissement.conformiteLot.totalPieces * 100) : 0}%"></div>
                                        </div>
                                        <span class="lot-conformite-gauge-count">${lot.allotissement.conformiteLot.nbBoisCourt}</span>
                                    </div>
                                    <div class="lot-conformite-gauge-row">
                                        <span class="lot-conformite-gauge-label">Rejet</span>
                                        <div class="lot-conformite-gauge-track">
                                            <div class="lot-conformite-gauge-fill" style="width: ${lot.allotissement.conformiteLot.totalPieces > 0 ? (lot.allotissement.conformiteLot.nbRejet / lot.allotissement.conformiteLot.totalPieces * 100) : 0}%"></div>
                                        </div>
                                        <span class="lot-conformite-gauge-count">${lot.allotissement.conformiteLot.nbRejet}</span>
                                    </div>
                                </div>
                                ` : '<p class="lot-seuils-section-title" style="font-weight:normal;opacity:0.75;">Renseigner les seuils de destination pour calculer la conformité du lot.</p>'}
                            </div>
                        </details>
                    </div>
                    <div class="lot-group">
                        <p class="lot-group-title">Groupe : prix</p>
                        <div class="lot-prix-group-header">
                            <button type="button" class="lot-alert-btn lot-prix-alert-btn" data-alert-active="${(!lot.allotissement.prixLotDirect && this.lotHasMissingPrixMarche(lot)) ? 'true' : 'false'}" data-lot-prix-alert-btn aria-label="Alerte prix du marché manquant">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            </button>
                            <button type="button" class="lot-price-unit-btn lot-prix-info-btn" data-lot-prix-info-btn aria-label="Informations sur la logique de prix">info</button>
                            <button type="button" class="lot-price-unit-btn lot-prix-toggle-btn" data-lot-prix-toggle-btn aria-pressed="${lot.allotissement.prixLotDirect ? 'true' : 'false'}" aria-label="Activer/désactiver le prix">${lot.allotissement.prixLotDirect ? 'ON' : 'OFF'}</button>
                        </div>
                        <div class="lot-field-block" data-lot-prix-market-block${!lot.allotissement.prixLotDirect ? ' data-muted="true"' : ''}>
                            <label class="lot-field-label lot-field-label--subsection">Prix du marché</label>
                            <div class="lot-price-market-row" data-lot-prix-market-row>
                                <div class="lot-input-with-unit">
                                    <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(lot.allotissement.prixMarche)}" data-lot-input="prixMarche"${!lot.allotissement.prixLotDirect ? ' readonly' : ''}>
                                    <span class="lot-input-unit" data-display="prixMarcheUnit">€/${priceUnit}</span>
                                </div>
                                <div class="lot-price-unit-toggle" role="group" aria-label="Unité de prix du marché">
                                    <button type="button" class="lot-price-unit-btn" data-price-unit="ml" aria-pressed="${priceUnit === 'ml' ? 'true' : 'false'}"${!lot.allotissement.prixLotDirect ? ' disabled' : ''}>au ml</button>
                                    <button type="button" class="lot-price-unit-btn" data-price-unit="m2" aria-pressed="${priceUnit === 'm2' ? 'true' : 'false'}"${!lot.allotissement.prixLotDirect ? ' disabled' : ''}>au m2</button>
                                    <button type="button" class="lot-price-unit-btn" data-price-unit="m3" aria-pressed="${priceUnit !== 'ml' && priceUnit !== 'm2' ? 'true' : 'false'}"${!lot.allotissement.prixLotDirect ? ' disabled' : ''}>au m3</button>
                                </div>
                            </div>
                        </div>
                        <div class="lot-price-summary-row">
                            <div class="lot-field-block">
                                <label class="lot-field-label">Prix du lot</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact">
                                    <input type="text" class="lot-input" value="${formatGrouped(Math.round(lot.allotissement.prixLot || 0), 0)}" readonly data-display="prixLot">
                                    <span class="lot-input-unit">€</span>
                                </div>
                            </div>
                            <div class="lot-field-block" data-display="prixLotAjusteBlock"${integriteData.ignore ? ' data-muted="true"' : ''}>
                                <label class="lot-field-label">Prix ajusté</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact">
                                    <input type="text" class="lot-input" value="${integriteData.ignore ? '' : formatGrouped(Math.round(lot.allotissement.prixLotAjusteIntegrite || 0), 0)}" readonly data-display="prixLotAjusteIntegrite">
                                    <span class="lot-input-unit">€</span>
                                </div>
                            </div>
                            <div class="lot-field-block">
                                <label class="lot-field-label">Intégrité lot</label>
                                <input type="text" class="lot-input" value="${lotIntegrityLabel}" readonly data-display="integriteLot">
                            </div>
                        </div>
                    </div>
                    <div class="lot-group">
                        <p class="lot-group-title">Groupe : carbone</p>
                        <div class="lot-carbon-input-row">
                            <div class="lot-carbon-volumique-row">
                                <div class="lot-field-block">
                                    <label class="lot-field-label">Masse volumique théorique moyenne</label>
                                    <div class="lot-input-with-unit lot-input-with-unit--compact lot-input-with-unit--mass-density">
                                        <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(lot.allotissement.masseVolumique ?? 510)}" data-lot-input="masseVolumique">
                                        <span class="lot-input-unit">kg/m3</span>
                                    </div>
                                    <p class="lot-field-meta" data-display="masseVolumiqueSource">${masseVolumiqueSourceLabel}</p>
                                </div>
                                <div class="lot-field-block">
                                    <label class="lot-field-label">Masse volumique moyenne mesurée du lot</label>
                                    <div class="lot-input-with-unit lot-input-with-unit--compact lot-input-with-unit--mass-density">
                                        <input type="text" class="lot-input" value="${masseVolumiqueMoyenneMesureeDisplay.value}" readonly data-display="masseVolumiqueMoyenneMesureeLot">
                                        <span class="lot-input-unit" data-display="masseVolumiqueMoyenneMesureeLotUnit">${masseVolumiqueMoyenneMesureeDisplay.unit}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="lot-carbon-unit-row">
                                <div class="lot-field-block">
                                    <label class="lot-field-label">Masse du lot théorique</label>
                                    <div class="lot-input-with-unit lot-input-with-unit--compact">
                                        <input type="text" class="lot-input" value="${masseLotDisplay.value}" readonly data-display="masseLot">
                                        <span class="lot-input-unit" data-display="masseLotUnit">${masseLotDisplay.unit}</span>
                                    </div>
                                </div>
                                <div class="lot-field-block">
                                    <label class="lot-field-label">Masse du lot mesurée</label>
                                    <div class="lot-input-with-unit lot-input-with-unit--compact">
                                        <input type="text" class="lot-input" value="${masseLotMesureeDisplay.value}" readonly data-display="masseLotMesuree">
                                        <span class="lot-input-unit" data-display="masseLotMesureeUnit">${masseLotMesureeDisplay.unit}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="lot-carbon-other-row">
                                <div class="lot-field-block">
                                    <label class="lot-field-label">Fraction C</label>
                                    <div class="lot-input-with-unit lot-input-with-unit--compact">
                                        <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(lot.allotissement.fractionCarbonee ?? 50)}" data-lot-input="fractionCarbonee">
                                        <span class="lot-input-unit">%</span>
                                    </div>
                                </div>
                                <div class="lot-field-block">
                                    <label class="lot-field-label">Humidité</label>
                                    <div class="lot-input-with-unit lot-input-with-unit--compact">
                                        <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(lot.allotissement.humidite ?? 12)}" data-lot-input="humidite">
                                        <span class="lot-input-unit">%</span>
                                    </div>
                                </div>
                                <div class="lot-field-block">
                                    <label class="lot-field-label">Bois</label>
                                    <div class="lot-input-with-unit lot-input-with-unit--compact">
                                        <input type="text" inputmode="decimal" class="lot-input" value="${this.formatAllotissementNumericDisplay(lot.allotissement.bois ?? 100)}" data-lot-input="bois">
                                        <span class="lot-input-unit">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="lot-carbon-summary-row">
                            <div class="lot-field-block">
                                <label class="lot-field-label">PCO₂ : masse de CO₂ séquestré théorique</label>
                                <div class="lot-input-with-unit">
                                    <input type="text" class="lot-input" value="${pco2Display.value}" readonly data-display="carboneBiogeniqueEstime">
                                    <span class="lot-input-unit" data-display="carboneBiogeniqueEstimeUnit">${pco2Display.unit}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="lot-group">
                        <p class="lot-group-title">Amortissement biologique</p>
                        <div class="lot-inline-grid lot-inline-grid--3">
                            <div class="lot-field-block">
                                <label class="lot-field-label">Âge moyen<br>des<br>arbres</label>
                                <div class="lot-input-with-unit lot-input-with-unit--compact">
                                    <input type="text" class="lot-input" value="${lot.allotissement._avgAgeArbre != null ? lot.allotissement._avgAgeArbre.toLocaleString(getValoboisIntlLocale(), { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : ''}" readonly data-display="avgAgeArbre">
                                    <span class="lot-input-unit">ans</span>
                                </div>
                            </div>
                            <div class="lot-field-block">
                                <label class="lot-field-label">Date moyenne<br>de mise<br>en service</label>
                                <input type="text" class="lot-input" value="${lot.allotissement._avgServiceYear != null ? String(lot.allotissement._avgServiceYear) : ''}" readonly data-display="avgServiceYear">
                            </div>
                            <div class="lot-field-block">
                                <label class="lot-field-label">Amortissement<br>biologique<br>moyen</label>
                                <input type="text" class="lot-input" value="${this.computeAmortissementBiologique(lot.allotissement._avgAgeArbre != null ? String(lot.allotissement._avgAgeArbre) : '', lot.allotissement._avgServiceYear != null ? String(lot.allotissement._avgServiceYear) : '')}" readonly data-display="avgAmortissementBiologique">
                            </div>
                        </div>
                    </div>
                    <details class="lot-group lot-group--collapsible accueil-collapsible">
                        <summary class="accueil-collapsible-summary accueil-collapsible-summary--with-alert">
                            <span>Destination du lot</span>
                            <button type="button" class="lot-alert-btn lot-alert-btn--destination" data-alert-destination="${hasDestinationAlert ? 'true' : 'false'}" data-lot-destination-alert-btn>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            </button>
                        </summary>
                        <div class="lot-group-content">
                            <div class="lot-field-block">
                                <input type="text" class="lot-input" value="${lot.allotissement.destination ?? ''}" placeholder="Entreprise" data-lot-input="destination">
                                <input type="text" class="lot-input" value="${lot.allotissement.destinationAdresse || ''}" placeholder="Adresse" data-lot-input="destinationAdresse">
                                <input type="text" class="lot-input" value="${lot.allotissement.destinationContact || ''}" placeholder="Personne contact" data-lot-input="destinationContact">
                                <input type="email" class="lot-input" value="${lot.allotissement.destinationMail || ''}" placeholder="Mail" data-lot-input="destinationMail">
                                <input type="tel" class="lot-input" value="${lot.allotissement.destinationTelephone || ''}" placeholder="Téléphone" data-lot-input="destinationTelephone">
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        `;

        // Gestion du clic pour activer le lot
        card.addEventListener('click', () => {
            if (this.currentLotIndex !== index) this.setCurrentLotIndex(index);
        });

        // Permet de déplier/replier le bloc Destination sans changer la sélection du lot
        card.querySelectorAll('.lot-group--collapsible').forEach((detailsEl) => {
            detailsEl.addEventListener('click', (e) => e.stopPropagation());
        });

        // Suppression
        card.querySelector('.lot-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openDeleteLotModal(index);
        });

        // Calculs et sauvegarde auto
        const updateCalculs = () => {
            lot.allotissement.quantite = String(this.getLotQuantityFromDetail(lot));
            this.recalculateLotAllotissement(lot);

            card.querySelector('[data-display="volumePiece"]').value = formatGrouped(lot.allotissement.volumePiece, 3);
            card.querySelector('[data-display="volumeLot"]').value = formatOneDecimal(lot.allotissement.volumeLot);
            const diametreActif = (lot.allotissement.diametre || '') !== '' || (lot.allotissement._avgDiametre || 0) > 0;
            const _varMode2 = diametreActif ? 'cylindrical' : 'rectangular';
            card.querySelectorAll('[data-variabilite-grid]').forEach(g => { g.dataset.variabiliteMode = _varMode2; });
            const _lv = parseFloat(lot.allotissement.largeur) || parseFloat(lot.allotissement._avgLargeur) || 0;
            const _hv = parseFloat(lot.allotissement.epaisseur) || parseFloat(lot.allotissement._avgEpaisseur) || 0;
            const surfaceMutedByShape = _hv > 55 || (_lv > 0 && _hv > 0 && _lv / _hv <= 4);
            const surfaceMuted = diametreActif || surfaceMutedByShape;
            card.querySelector('[data-display="surfacePiece"]').value = surfaceMuted ? '' : formatOneDecimal(lot.allotissement.surfacePiece);
            card.querySelector('[data-display="surfaceLot"]').value = surfaceMuted ? '' : formatOneDecimal(lot.allotissement.surfaceLot);
            const _spEl = card.querySelector('[data-display="surfacePiece"]')?.closest('.lot-dimension-computed');
            const _slEl = card.querySelector('[data-display="surfaceLot"]')?.closest('.lot-dimension-computed');
            if (_spEl) _spEl.dataset.muted = surfaceMuted ? 'true' : 'false';
            if (_slEl) _slEl.dataset.muted = surfaceMuted ? 'true' : 'false';
            card.querySelector('[data-display="prixLot"]').value = formatGrouped(Math.round(lot.allotissement.prixLot), 0);
            const isIntegriteIgnored = !!(((lot.inspection || {}).integrite || {}).ignore);
            card.querySelector('[data-display="prixLotAjusteIntegrite"]').value = isIntegriteIgnored
                ? ''
                : formatGrouped(Math.round(lot.allotissement.prixLotAjusteIntegrite || 0), 0);
            const prixAjusteBlock = card.querySelector('[data-display="prixLotAjusteBlock"]');
            if (prixAjusteBlock) {
                prixAjusteBlock.dataset.muted = isIntegriteIgnored ? 'true' : 'false';
            }
            card.querySelector('[data-display="lineaireLot"]').value = formatOneDecimal(lot.allotissement.lineaireLot);
            const masseLotDisplay = this.formatMasseDisplay(lot.allotissement.masseLot);
            card.querySelector('[data-display="masseLot"]').value = masseLotDisplay.value;
            const masseLotUnitEl = card.querySelector('[data-display="masseLotUnit"]');
            if (masseLotUnitEl) masseLotUnitEl.textContent = masseLotDisplay.unit;
            const masseVolumiqueMoyenneMesureeDisplay = this.getMeasuredLotDensityDisplay(lot);
            card.querySelector('[data-display="masseVolumiqueMoyenneMesureeLot"]').value = masseVolumiqueMoyenneMesureeDisplay.value;
            const masseVolumiqueMoyenneMesureeUnitEl = card.querySelector('[data-display="masseVolumiqueMoyenneMesureeLotUnit"]');
            if (masseVolumiqueMoyenneMesureeUnitEl) masseVolumiqueMoyenneMesureeUnitEl.textContent = masseVolumiqueMoyenneMesureeDisplay.unit;
            const masseLotMesureeDisplay = this.getMeasuredLotMassDisplay(lot);
            card.querySelector('[data-display="masseLotMesuree"]').value = masseLotMesureeDisplay.value;
            const masseLotMesureeUnitEl = card.querySelector('[data-display="masseLotMesureeUnit"]');
            if (masseLotMesureeUnitEl) masseLotMesureeUnitEl.textContent = masseLotMesureeDisplay.unit;
            const masseVolumiqueSourceEl = card.querySelector('[data-display="masseVolumiqueSource"]');
            if (masseVolumiqueSourceEl) {
                masseVolumiqueSourceEl.textContent = this.getMasseVolumiqueSourceLabel(lot.allotissement);
            }
            const pco2Display = this.formatPco2Display(lot.allotissement.carboneBiogeniqueEstime);
            card.querySelector('[data-display="carboneBiogeniqueEstime"]').value = pco2Display.value;
            const pco2UnitEl = card.querySelector('[data-display="carboneBiogeniqueEstimeUnit"]');
            if (pco2UnitEl) pco2UnitEl.textContent = pco2Display.unit;

            // Mise à jour du groupe "Amortissement biologique" du lot
            const avgAgeEl = card.querySelector('[data-display="avgAgeArbre"]');
            if (avgAgeEl) avgAgeEl.value = lot.allotissement._avgAgeArbre != null ? lot.allotissement._avgAgeArbre.toLocaleString(getValoboisIntlLocale(), { minimumFractionDigits: 0, maximumFractionDigits: 1 }) : '';
            const avgYearEl = card.querySelector('[data-display="avgServiceYear"]');
            if (avgYearEl) avgYearEl.value = lot.allotissement._avgServiceYear != null ? String(lot.allotissement._avgServiceYear) : '';
            const avgAmortEl = card.querySelector('[data-display="avgAmortissementBiologique"]');
            if (avgAmortEl) avgAmortEl.value = this.computeAmortissementBiologique(lot.allotissement._avgAgeArbre != null ? String(lot.allotissement._avgAgeArbre) : '', lot.allotissement._avgServiceYear != null ? String(lot.allotissement._avgServiceYear) : '');

            // Mise à jour badge pièces et bouton alerte
            const nbPieces = (lot.pieces || []).length;
            const qTotal = parseFloat(lot.allotissement.quantite) || 0;
            const qEffective = Math.max(qTotal, nbPieces);
            const badgeEl = card.querySelector('[data-display="piecesBadge"]');
            if (badgeEl) badgeEl.textContent = `${nbPieces}/${qEffective}`;
            const alertBtnUpd = card.querySelector('[data-lot-alert-btn]');
            if (alertBtnUpd) {
                const hasOrangeAlert = qTotal > nbPieces;
                const hasMissingPieceFields = !hasOrangeAlert && this.hasIncompleteDetailLotPieces(lot);
                alertBtnUpd.dataset.alertActive = hasOrangeAlert ? 'true' : 'false';
                alertBtnUpd.dataset.alertMissing = hasMissingPieceFields ? 'true' : 'false';
            }
            const notationAlertBtnUpd = card.querySelector('[data-lot-notation-alert-btn]');
            if (notationAlertBtnUpd) {
                notationAlertBtnUpd.dataset.alertNotation = this.hasIncompleteNotationCriteria(lot) ? 'true' : 'false';
            }
            const destinationAlertBtnUpd = card.querySelector('[data-lot-destination-alert-btn]');
            if (destinationAlertBtnUpd) {
                destinationAlertBtnUpd.dataset.alertDestination = this.hasIncompleteDestinationFields(lot) ? 'true' : 'false';
            }
            const prixAlertBtnUpd = card.querySelector('[data-lot-prix-alert-btn]');
            if (prixAlertBtnUpd) {
                const hasMissingPrixMarche = !lot.allotissement.prixLotDirect && this.lotHasMissingPrixMarche(lot);
                prixAlertBtnUpd.dataset.alertActive = hasMissingPrixMarche ? 'true' : 'false';
            }

            const qtyInput = card.querySelector('input[data-lot-input="quantite"]');
            if (qtyInput) {
                qtyInput.value = this.formatAllotissementNumericDisplay(lot.allotissement.quantite);
            }

            // Mise à jour des dimensions moyennes dans le formulaire lot
            const defaultQty = this.getTotalDefaultPieceQuantity(lot);
            if (nbPieces > 0 || defaultQty > 0) {
                const longueurInput = card.querySelector('input[data-lot-input="longueur"]');
                const largeurInput = card.querySelector('input[data-lot-input="largeur"]');
                const epaisseurInput = card.querySelector('input[data-lot-input="epaisseur"]');
                if (longueurInput && document.activeElement !== longueurInput) {
                    const _avgL = lot.allotissement._avgLongueur || 0;
                    longueurInput.value = _avgL > 0 ? this.formatAllotissementNumericDisplay(String(Math.round(_avgL))) : '';
                }
                if (largeurInput && document.activeElement !== largeurInput) {
                    const _avgLa = lot.allotissement._avgLargeur || 0;
                    largeurInput.value = _avgLa > 0 ? this.formatAllotissementNumericDisplay(String(Math.round(_avgLa))) : '';
                }
                if (epaisseurInput && document.activeElement !== epaisseurInput) {
                    const _avgE = lot.allotissement._avgEpaisseur || 0;
                    epaisseurInput.value = _avgE > 0 ? this.formatAllotissementNumericDisplay(String(Math.round(_avgE))) : '';
                }
                const diametreInput = card.querySelector('input[data-lot-input="diametre"]');
                if (diametreInput && document.activeElement !== diametreInput) {
                    const _avgD = lot.allotissement._avgDiametre || 0;
                    diametreInput.value = _avgD > 0 ? this.formatAllotissementNumericDisplay(String(Math.round(_avgD))) : '';
                }
            }

            const _fmtPieceType = dim => {
                const value = lot.allotissement.medoideDims?.[dim];
                return value != null
                    ? Math.round(value).toLocaleString(getValoboisIntlLocale(), { maximumFractionDigits: 0 })
                    : '';
            };
            const pieceTypeLongueurEl = card.querySelector('[data-display="pieceTypeLongueur"]');
            const pieceTypeLargeurEl = card.querySelector('[data-display="pieceTypeLargeur"]');
            const pieceTypeEpaisseurEl = card.querySelector('[data-display="pieceTypeEpaisseur"]');
            const pieceTypeDiametreEl = card.querySelector('[data-display="pieceTypeDiametre"]');
            if (pieceTypeLongueurEl)  pieceTypeLongueurEl.value  = _fmtPieceType('longueur');
            if (pieceTypeLargeurEl)   pieceTypeLargeurEl.value   = _fmtPieceType('largeur');
            if (pieceTypeEpaisseurEl) pieceTypeEpaisseurEl.value = _fmtPieceType('epaisseur');
            if (pieceTypeDiametreEl)  pieceTypeDiametreEl.value  = _fmtPieceType('diametre');
            ['longueur', 'largeur', 'epaisseur', 'diametre'].forEach((dim) => {
                const wrap = card.querySelector(`[data-piece-type-dim-wrap="${dim}"]`);
                if (wrap) {
                    const hasValue = lot.allotissement.medoideDims?.[dim] != null;
                    wrap.dataset.hasValue = hasValue ? 'true' : 'false';
                }
            });
            const medoideNomCardEl = card.querySelector('[data-display="medoideNom"]');
            if (medoideNomCardEl) {
                const rawLabel = lot.allotissement.medoideLabel || 'Non calculé (≥ 2 pièces requises)';
                medoideNomCardEl.textContent = rawLabel;
            }
            const medoideScoreCardEl = card.querySelector('[data-display="medoideScore"]');
            if (medoideScoreCardEl) {
                medoideScoreCardEl.textContent = lot.allotissement.medoideScore !== null
                    ? `${Math.round(lot.allotissement.medoideScore)}\u00a0%`
                    : '—';
            }

            // Taux de similarité
            const tauxCardEl = card.querySelector('[data-display="tauxSimilarite"]');
            if (tauxCardEl) {
                const formattedTaux = this.formatTauxSimilarite(lot.allotissement.tauxSimilarite);
                if ('value' in tauxCardEl) {
                    tauxCardEl.value = formattedTaux;
                } else {
                    tauxCardEl.textContent = formattedTaux;
                }
            }

            // Ne pas remplacer la carte "Pièce par défaut" ici pour conserver
            // la sélection active unique et les handlers déjà liés.

            const integrite = (lot.inspection && lot.inspection.integrite) || {};
            card.querySelector('[data-display="integriteLot"]').value = integrite.ignore
                ? 'Ignoré'
                : integrite.niveau === 'forte'
                    ? `Forte (${integrite.coeff ?? '...'})`
                    : integrite.niveau === 'moyenne'
                        ? `Moyenne (${integrite.coeff ?? '...'})`
                        : integrite.niveau === 'faible'
                            ? `Faible (${integrite.coeff ?? '...'})`
                            : '...';
            
            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
            this.refreshNaturaliteAlertButton(lot);
            this.refreshStabiliteAlertButton(lot);
            this.refreshArtisanaliteAlertButton(lot);
            this.refreshIndustrialiteAlertButton(lot);
            this.renderEvalOp(); // Met à jour la synthèse en temps réel
        };

        // ─── Fonction d'application de l'état visuel prixLotDirect ───
        const applyPrixLotDirectUI = () => {
            const isDirect = !!lot.allotissement.prixLotDirect;
            const toggleBtn = card.querySelector('[data-lot-prix-toggle-btn]');
            if (toggleBtn) {
                toggleBtn.setAttribute('aria-pressed', isDirect ? 'true' : 'false');
                toggleBtn.textContent = isDirect ? 'ON' : 'OFF';
            }
            const marketBlock = card.querySelector('[data-lot-prix-market-block]');
            if (marketBlock) marketBlock.dataset.muted = isDirect ? 'false' : 'true';
            const prixInput = card.querySelector('input[data-lot-input="prixMarche"]');
            if (prixInput) prixInput.readOnly = !isDirect;
            card.querySelectorAll('button[data-price-unit]').forEach(btn => {
                btn.disabled = !isDirect;
            });
            const prixAlertBtn = card.querySelector('[data-lot-prix-alert-btn]');
            if (prixAlertBtn) {
                const hasMissingPrixMarche = !isDirect && this.lotHasMissingPrixMarche(lot);
                prixAlertBtn.dataset.alertActive = hasMissingPrixMarche ? 'true' : 'false';
            }
        };

        // ─── Toggle bouton On/Off prix lot direct ───
        const togglePrixBtn = card.querySelector('[data-lot-prix-toggle-btn]');
        if (togglePrixBtn) {
            togglePrixBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (lot.allotissement.prixLotDirect) {
                    // ON → OFF : bascule directe
                    lot.allotissement.prixLotDirect = false;
                    applyPrixLotDirectUI();
                    updateCalculs();
                    this.renderDetailLot();
                } else {
                    // OFF → ON : modale de confirmation
                    this.openPrixLotDirectConfirmModal(() => {
                        lot.allotissement.prixLotDirect = true;
                        applyPrixLotDirectUI();
                        updateCalculs();
                        this.renderDetailLot();
                    });
                }
            });
        }

        const syncPriceUnitButtons = () => {
            const selectedUnit = ((lot.allotissement.prixUnite || 'm3') + '').toLowerCase();
            card.querySelectorAll('button[data-price-unit]').forEach((button) => {
                button.setAttribute('aria-pressed', button.dataset.priceUnit === selectedUnit ? 'true' : 'false');
            });
            const unitDisplay = card.querySelector('[data-display="prixMarcheUnit"]');
            if (unitDisplay) unitDisplay.textContent = '€/' + selectedUnit;
        };

        card.querySelectorAll('button[data-price-unit]').forEach((button) => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!lot.allotissement.prixLotDirect) {
                    // Mode OFF : ouvrir modale d'activation
                    this.openPrixLotDirectActivateModal(() => {
                        lot.allotissement.prixLotDirect = true;
                        applyPrixLotDirectUI();
                        updateCalculs();
                        this.renderDetailLot();
                    });
                    return;
                }
                const nextUnit = (button.dataset.priceUnit || '').toLowerCase();
                if (nextUnit !== 'ml' && nextUnit !== 'm2' && nextUnit !== 'm3') return;
                lot.allotissement.prixUnite = nextUnit;
                syncPriceUnitButtons();
                updateCalculs();
            });
        });

        syncPriceUnitButtons();

        const updateLotLocationGroupDisplay = () => {
            const nav = card.querySelector('[data-lot-location-groups]');
            if (!nav) return;
            const groups = this.getLotLocationSituationGroups(lot);
            const count = groups.length;
            const prevBtn = nav.querySelector('[data-lot-location-prev]');
            const nextBtn = nav.querySelector('[data-lot-location-next]');
            const locInput = nav.querySelector('[data-lot-location-field="localisation"]');
            const sitInput = nav.querySelector('[data-lot-location-field="situation"]');
            const piecesInput = nav.querySelector('[data-lot-location-field="pieceNames"]');
            const openPiecesBtn = nav.querySelector('[data-lot-location-open-pieces]');
            const localisationLabel = nav.querySelector('[data-lot-location-label="localisation"]');
            const situationLabel = nav.querySelector('[data-lot-location-label="situation"]');
            const piecesLabel = nav.querySelector('[data-lot-location-label="pieces"]');

            const localisationDistinctCount = new Set(
                groups
                    .map((group) => (group.localisation || '').toString().trim())
                    .filter(Boolean)
            ).size;
            const situationDistinctCount = new Set(
                groups
                    .map((group) => (group.situation || '').toString().trim())
                    .filter(Boolean)
            ).size;

            if (localisationLabel) {
                localisationLabel.textContent = localisationDistinctCount > 1 ? `Localisations (${localisationDistinctCount})` : 'Localisation';
            }
            if (situationLabel) {
                situationLabel.textContent = situationDistinctCount > 1 ? `Situations (${situationDistinctCount})` : 'Situation';
            }

            if (!count) {
                nav.dataset.groupCount = '0';
                nav.dataset.groupIndex = '0';
                if (locInput) locInput.value = '';
                if (sitInput) sitInput.value = '';
                if (piecesInput) piecesInput.value = '';
                if (piecesLabel) piecesLabel.textContent = 'Pièce dans cette combinaison';
                if (prevBtn) prevBtn.disabled = true;
                if (nextBtn) nextBtn.disabled = true;
                if (openPiecesBtn) {
                    openPiecesBtn.disabled = true;
                    openPiecesBtn.dataset.piecesList = '';
                    openPiecesBtn.dataset.modalTitle = 'Pièces de la combinaison';
                }
                return;
            }

            const currentRaw = parseInt(nav.dataset.groupIndex || '0', 10);
            const currentIndex = Number.isFinite(currentRaw) ? Math.max(0, Math.min(currentRaw, count - 1)) : 0;
            const current = groups[currentIndex];

            nav.dataset.groupCount = String(count);
            nav.dataset.groupIndex = String(currentIndex);
            if (locInput) locInput.value = current.localisation || '';
            if (sitInput) sitInput.value = current.situation || '';
            if (piecesInput) {
                const labels = (current.labels && current.labels.length) ? current.labels : [];
                if (labels.length > 2) {
                    piecesInput.value = labels.slice(0, 2).join(', ') + ' ...';
                } else {
                    piecesInput.value = labels.join(', ');
                }
                if (piecesLabel) {
                    piecesLabel.textContent = labels.length > 1
                        ? `Pièces dans cette combinaison (${labels.length})`
                        : 'Pièce dans cette combinaison';
                }
            }
            if (prevBtn) prevBtn.disabled = count <= 1;
            if (nextBtn) nextBtn.disabled = count <= 1;
            if (openPiecesBtn) {
                const labels = (current.labels && current.labels.length) ? current.labels : [];
                openPiecesBtn.disabled = labels.length === 0;
                openPiecesBtn.dataset.piecesList = labels.join('\n');
                openPiecesBtn.dataset.modalTitle = `Pièces de la combinaison ${currentIndex + 1}/${count}`;
            }
        };

        const openPiecesBtn = card.querySelector('[data-lot-location-open-pieces]');
        if (openPiecesBtn) {
            openPiecesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const title = openPiecesBtn.dataset.modalTitle || 'Pièces de la combinaison';
                const piecesList = (openPiecesBtn.dataset.piecesList || '').trim();
                this.openLotLocationPiecesModal(title, piecesList);
            });
        }

        const prevGroupBtn = card.querySelector('[data-lot-location-prev]');
        const nextGroupBtn = card.querySelector('[data-lot-location-next]');
        if (prevGroupBtn) {
            prevGroupBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const nav = card.querySelector('[data-lot-location-groups]');
                if (!nav) return;
                const count = parseInt(nav.dataset.groupCount || '0', 10) || 0;
                if (count <= 1) return;
                const current = parseInt(nav.dataset.groupIndex || '0', 10) || 0;
                nav.dataset.groupIndex = String((current - 1 + count) % count);
                updateLotLocationGroupDisplay();
            });
        }
        if (nextGroupBtn) {
            nextGroupBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const nav = card.querySelector('[data-lot-location-groups]');
                if (!nav) return;
                const count = parseInt(nav.dataset.groupCount || '0', 10) || 0;
                if (count <= 1) return;
                const current = parseInt(nav.dataset.groupIndex || '0', 10) || 0;
                nav.dataset.groupIndex = String((current + 1) % count);
                updateLotLocationGroupDisplay();
            });
        }

        updateLotLocationGroupDisplay();

        const editableLotInputs = new Set([
            'prixMarche',
            'destination',
            'destinationAdresse',
            'destinationContact',
            'destinationMail',
            'destinationTelephone'
        ]);
        card.querySelectorAll('input[data-lot-input]').forEach((input) => {
            const key = input.dataset.lotInput || '';
            if (!editableLotInputs.has(key)) {
                input.readOnly = true;
            }
        });

        // Bouton alerte pièces non détaillées
        const alertBtn = card.querySelector('[data-lot-alert-btn]');
        if (alertBtn) {
            alertBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const modalMessageEl = document.getElementById('alertPiecesModalMessage');
                const isOrangeAlert = alertBtn.dataset.alertActive === 'true';
                if (modalMessageEl) {
                    modalMessageEl.style.textAlign = 'center';
                    modalMessageEl.style.whiteSpace = 'normal';
                    modalMessageEl.textContent = isOrangeAlert
                        ? 'Ce lot contient des pièces non détaillées.'
                        : 'Des informations sont manquantes pour une ou plusieurs pièces dans le Détail du lot. Vérifier les formulaires de pièce.';
                }
                const backdrop = document.getElementById('alertPiecesModalBackdrop');
                if (backdrop) { backdrop.classList.remove('hidden'); backdrop.setAttribute('aria-hidden', 'false'); }
            });
        }

        const notationAlertBtn = card.querySelector('[data-lot-notation-alert-btn]');
        if (notationAlertBtn) {
            notationAlertBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (notationAlertBtn.dataset.alertNotation !== 'true') return;
                const modalMessageEl = document.getElementById('alertPiecesModalMessage');
                if (modalMessageEl) {
                    modalMessageEl.style.textAlign = 'center';
                    modalMessageEl.style.whiteSpace = 'normal';
                    modalMessageEl.textContent = 'Ce lot comporte des critères de notation non notés.';
                }
                const backdrop = document.getElementById('alertPiecesModalBackdrop');
                if (backdrop) { backdrop.classList.remove('hidden'); backdrop.setAttribute('aria-hidden', 'false'); }
            });
        }

        const destinationAlertBtn = card.querySelector('[data-lot-destination-alert-btn]');
        if (destinationAlertBtn) {
            destinationAlertBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (destinationAlertBtn.dataset.alertDestination !== 'true') return;
                const backdrop = document.getElementById('alertDestinationModalBackdrop');
                if (backdrop) {
                    backdrop.classList.remove('hidden');
                    backdrop.setAttribute('aria-hidden', 'false');
                }
            });
        }

        const prixAlertBtn = card.querySelector('[data-lot-prix-alert-btn]');
        if (prixAlertBtn) {
            prixAlertBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (prixAlertBtn.dataset.alertActive !== 'true') return;
                this.openPrixPieceMissingModal();
            });
        }

        const prixInfoBtn = card.querySelector('[data-lot-prix-info-btn]');
        if (prixInfoBtn) {
            prixInfoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openPrixLogicModal();
            });
        }

        const tauxInfoBtn = card.querySelector('[data-lot-taux-info-btn]');
        if (tauxInfoBtn) {
            tauxInfoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openTauxLogicModal();
            });
        }

        card.querySelectorAll('button[data-lot-details-btn]').forEach((button) => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const field = button.dataset.lotDetailsBtn;
                if (field === 'typePiece') {
                    this.openLotDetailValuesModal(lot, 'typePiece', 'Détail des pièces');
                    return;
                }
                if (field === 'typeProduit') {
                    this.openLotDetailValuesModal(lot, 'typeProduit', 'Détail des produits');
                    return;
                }
                if (field === 'essence') {
                    this.openLotDetailValuesModal(lot, 'essence', 'Détail des essences');
                }
            });
        });

        // Branchement des inputs
        card.querySelectorAll('input[data-lot-input]').forEach(input => {
            const updateField = (e) => {
                const field = e.target.dataset.lotInput;
                if (!field) return;
                if (!editableLotInputs.has(field)) return;
                if (this.isAllotissementNumericField(field)) {
                    const normalized = this.normalizeAllotissementNumericInput(e.target.value);
                    lot.allotissement[field] = normalized;
                    if (field === 'masseVolumique' && normalized === '' && (e.type === 'blur' || e.type === 'change')) {
                        const suggested = this.applySuggestedMasseVolumique(lot, { force: true });
                        lot.allotissement[field] = String(suggested);
                    }
                    // Quantité : si vidée et qu'il y a des pièces, afficher pieces.length
                    let qtyOverridden = false;
                    if (field === 'quantite' && normalized === '' && (e.type === 'blur' || e.type === 'change')) {
                        const nbPieces = (lot.pieces || []).length;
                        if (nbPieces > 0) {
                            e.target.value = this.formatAllotissementNumericDisplay(String(nbPieces));
                            qtyOverridden = true;
                        }
                    }
                    // Harmonisation Prix/Carbone :
                    // - pendant la saisie (input), on laisse le texte tel que tapé
                    // - au blur/change, on applique le format d'affichage
                    const shouldFormatDisplay =
                        e.type === 'change' ||
                        e.type === 'blur' ||
                        !this.isCarbonPrixNumericField(field);

                    if (shouldFormatDisplay && !qtyOverridden) {
                        e.target.value = this.formatAllotissementNumericDisplay(lot.allotissement[field]);
                    }
                } else {
                    if (field === 'localisation' || field === 'situation') {
                        lot[field] = e.target.value;
                    } else {
                        lot.allotissement[field] = e.target.value;
                    }
                }

                if (field === 'diametre') {
                    const hasDiameter = (lot.allotissement.diametre || '') !== '';
                    const largeurInput = card.querySelector('input[data-lot-input="largeur"]');
                    const epaisseurInput = card.querySelector('input[data-lot-input="epaisseur"]');
                    if (hasDiameter) {
                        lot.allotissement.largeur = '';
                        lot.allotissement.epaisseur = '';
                        if (largeurInput) {
                            largeurInput.value = '';
                            if (largeurInput.parentElement && largeurInput.parentElement.classList.contains('lot-dimension-input-wrap')) {
                                largeurInput.parentElement.dataset.hasValue = 'false';
                            }
                        }
                        if (epaisseurInput) {
                            epaisseurInput.value = '';
                            if (epaisseurInput.parentElement && epaisseurInput.parentElement.classList.contains('lot-dimension-input-wrap')) {
                                epaisseurInput.parentElement.dataset.hasValue = 'false';
                            }
                        }
                    }
                    if (largeurInput) {
                        const largeurField = largeurInput.closest('.lot-dimension-field');
                        if (largeurField) largeurField.dataset.muted = hasDiameter ? 'true' : 'false';
                    }
                    if (epaisseurInput) {
                        const epaisseurField = epaisseurInput.closest('.lot-dimension-field');
                        if (epaisseurField) epaisseurField.dataset.muted = hasDiameter ? 'true' : 'false';
                    }
                    const surfacePieceComputed = card.querySelector('[data-display="surfacePiece"]')?.closest('.lot-dimension-computed');
                    const surfaceLotComputed = card.querySelector('[data-display="surfaceLot"]')?.closest('.lot-dimension-computed');
                    if (surfacePieceComputed) surfacePieceComputed.dataset.muted = hasDiameter ? 'true' : 'false';
                    if (surfaceLotComputed) surfaceLotComputed.dataset.muted = hasDiameter ? 'true' : 'false';
                }

                if (field === 'largeur' || field === 'epaisseur') {
                    const hasLargeurEpaisseurNow = (lot.allotissement.largeur || '') !== '' || (lot.allotissement.epaisseur || '') !== '';
                    const diametreInput = card.querySelector('input[data-lot-input="diametre"]');
                    if (hasLargeurEpaisseurNow) {
                        lot.allotissement.diametre = '';
                        if (diametreInput) diametreInput.value = '';
                        const surfacePieceComputed = card.querySelector('[data-display="surfacePiece"]')?.closest('.lot-dimension-computed');
                        const surfaceLotComputed = card.querySelector('[data-display="surfaceLot"]')?.closest('.lot-dimension-computed');
                        if (surfacePieceComputed) surfacePieceComputed.dataset.muted = 'false';
                        if (surfaceLotComputed) surfaceLotComputed.dataset.muted = 'false';
                    }
                    if (diametreInput) {
                        const diametreComputed = diametreInput.closest('.lot-dimension-computed');
                        if (diametreComputed) diametreComputed.dataset.muted = hasLargeurEpaisseurNow ? 'true' : 'false';
                    }
                }

                if (field === 'essenceNomCommun') {
                    const nomCommun = (lot.allotissement.essenceNomCommun || '').toString().trim();
                    const match = this.findEssenceByCommonName(nomCommun);
                    if (match) {
                        lot.allotissement.essenceNomScientifique = match.nomScientifique;
                        const scientificInput = card.querySelector('input[data-lot-input="essenceNomScientifique"]');
                        if (scientificInput) scientificInput.value = match.nomScientifique;
                    }
                    const shouldApplyMasseSuggestion = e.type !== 'input' || !!match;
                    if (shouldApplyMasseSuggestion) {
                        const masseInput = card.querySelector('input[data-lot-input="masseVolumique"]');
                        this.applySuggestedMasseVolumique(lot, { force: true });
                        if (masseInput) {
                            masseInput.value = this.formatAllotissementNumericDisplay(lot.allotissement.masseVolumique);
                        }
                    }
                }

                if (field === 'essenceNomScientifique') {
                    const nomScientifique = (lot.allotissement.essenceNomScientifique || '').toString().trim();
                    const match = this.findEssenceByScientificName(nomScientifique);
                    if (match) {
                        lot.allotissement.essenceNomCommun = match.nomUsuel;
                        const commonInput = card.querySelector('input[data-lot-input="essenceNomCommun"]');
                        if (commonInput) commonInput.value = match.nomUsuel;
                    }
                    const shouldApplyMasseSuggestion = e.type !== 'input' || !!match;
                    if (shouldApplyMasseSuggestion) {
                        const masseInput = card.querySelector('input[data-lot-input="masseVolumique"]');
                        this.applySuggestedMasseVolumique(lot, { force: true });
                        if (masseInput) {
                            masseInput.value = this.formatAllotissementNumericDisplay(lot.allotissement.masseVolumique);
                        }
                    }
                }

                if (field === 'typeProduit' && e.type !== 'input') {
                    const currentBois = lot.allotissement.bois;
                    if (currentBois === '' || currentBois == null) {
                        const suggestedBois = this.getDefaultBoisFromTypeProduit(lot.allotissement.typeProduit);
                        if (suggestedBois !== null) {
                            lot.allotissement.bois = suggestedBois;
                            const boisInput = card.querySelector('input[data-lot-input="bois"]');
                            if (boisInput) boisInput.value = this.formatAllotissementNumericDisplay(suggestedBois);
                        }
                    }
                }

                lot.allotissement.essence = [
                    (lot.allotissement.essenceNomCommun || '').toString().trim(),
                    (lot.allotissement.essenceNomScientifique || '').toString().trim()
                ].filter(Boolean).join(' - ');
                updateCalculs();
            };
            input.addEventListener('click', (e) => e.stopPropagation());
            input.addEventListener('focus', (e) => {
                const field = e.target.dataset.lotInput;

                // Guard prix lot direct : en mode OFF, empêcher la saisie du prix du marché
                if (field === 'prixMarche' && !lot.allotissement.prixLotDirect) {
                    e.target.blur();
                    this.openPrixLotDirectActivateModal(() => {
                        lot.allotissement.prixLotDirect = true;
                        applyPrixLotDirectUI();
                        updateCalculs();
                        this.renderDetailLot();
                    });
                    return;
                }

                if (!field || !this.isAllotissementNumericField(field)) return;
                e.target.value = this.normalizeAllotissementNumericInput(e.target.value);

                // Démutage automatique au clic : vider le mode opposé et lever le grisage
                if ((field === 'largeur' || field === 'epaisseur') && (lot.allotissement.diametre || '') !== '') {
                    lot.allotissement.diametre = '';
                    const diametreInput = card.querySelector('input[data-lot-input="diametre"]');
                    if (diametreInput) diametreInput.value = '';
                    const diametreComputed = diametreInput && diametreInput.closest('.lot-dimension-computed');
                    if (diametreComputed) diametreComputed.dataset.muted = 'false';
                    const largeurField = card.querySelector('input[data-lot-input="largeur"]')?.closest('.lot-dimension-field');
                    const epaisseurField = card.querySelector('input[data-lot-input="epaisseur"]')?.closest('.lot-dimension-field');
                    if (largeurField) largeurField.dataset.muted = 'false';
                    if (epaisseurField) epaisseurField.dataset.muted = 'false';
                    const surfacePieceComputed = card.querySelector('[data-display="surfacePiece"]')?.closest('.lot-dimension-computed');
                    const surfaceLotComputed = card.querySelector('[data-display="surfaceLot"]')?.closest('.lot-dimension-computed');
                    if (surfacePieceComputed) surfacePieceComputed.dataset.muted = 'false';
                    if (surfaceLotComputed) surfaceLotComputed.dataset.muted = 'false';
                }

                if (field === 'diametre') {
                    const hasLH = (lot.allotissement.largeur || '') !== '' || (lot.allotissement.epaisseur || '') !== '';
                    if (hasLH) {
                        lot.allotissement.largeur = '';
                        lot.allotissement.epaisseur = '';
                        const largeurInput = card.querySelector('input[data-lot-input="largeur"]');
                        const epaisseurInput = card.querySelector('input[data-lot-input="epaisseur"]');
                        if (largeurInput) {
                            largeurInput.value = '';
                            if (largeurInput.parentElement?.classList.contains('lot-dimension-input-wrap'))
                                largeurInput.parentElement.dataset.hasValue = 'false';
                        }
                        if (epaisseurInput) {
                            epaisseurInput.value = '';
                            if (epaisseurInput.parentElement?.classList.contains('lot-dimension-input-wrap'))
                                epaisseurInput.parentElement.dataset.hasValue = 'false';
                        }
                        const largeurField = largeurInput?.closest('.lot-dimension-field');
                        const epaisseurField = epaisseurInput?.closest('.lot-dimension-field');
                        if (largeurField) largeurField.dataset.muted = 'false';
                        if (epaisseurField) epaisseurField.dataset.muted = 'false';
                        const diametreComputed = e.target.closest('.lot-dimension-computed');
                        if (diametreComputed) diametreComputed.dataset.muted = 'false';
                        updateCalculs();
                    }
                }
            });
            input.addEventListener('input', updateField);
            input.addEventListener('change', updateField);
            input.addEventListener('blur', updateField);
        });

        rail.appendChild(card);

        // Points de navigation
        const dot = document.createElement('div');
        dot.className = 'lot-slider-dot ' + (index === this.currentLotIndex ? 'lot-slider-dot--active' : '');
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            this.setCurrentLotIndex(index);
        });
        sliderTrack.appendChild(dot);
    });

    // BOUTON AJOUTER (HORS DE LA BOUCLE FOREACH)
    const btnAdd = document.getElementById('btnAddLot');
    if (btnAdd) {
        const newBtnAdd = btnAdd.cloneNode(true);
        btnAdd.parentNode.replaceChild(newBtnAdd, btnAdd);
        newBtnAdd.addEventListener('click', () => {
            const newIdx = this.data.lots.length;
            const lot = this.createEmptyLot(newIdx);
            this.data.lots.push(lot);
            this.setDetailLotActiveCardKey(lot, 'default', { persist: false });
            this.setCurrentLotIndex(newIdx);
        });
    }
}    

    renderDetailLot() {
        const section = document.getElementById('detailLotSection');
        const pieceRail = document.getElementById('pieceRail');
        const lotLabel = document.getElementById('detailLotActiveLotLabel');
        const lot = this.getCurrentLot();

        if (!section || !pieceRail) return;

        if (!lot) {
            section.style.display = 'none';
            return;
        }

        if (!Array.isArray(lot.pieces)) lot.pieces = [];
        const defaultPieces = this.ensureDefaultPiecesData(lot, { createIfEmpty: false });
        lot.allotissement.quantite = String(this.getLotQuantityFromDetail(lot));

        section.style.display = '';
        const lotIndex = this.data.lots.indexOf(lot);
        if (lotLabel) lotLabel.textContent = lotIndex >= 0 ? `Lot ${lotIndex + 1}` : 'Lot';

        const formatGrouped = (value, digits = 0) => (parseFloat(value) || 0).toLocaleString(getValoboisIntlLocale(), {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
        const formatOneDecimal = (value) => formatGrouped(value, 1);

        const activeCardKey = this.getDetailLotActiveCardKey(lot);
        pieceRail.innerHTML = defaultPieces.map((defaultPiece, defaultPieceIndex) => {
            const cardKey = `default:${defaultPiece.id}`;
            return this.renderDefaultPieceCardHTML(lot, defaultPiece, defaultPieceIndex, activeCardKey === cardKey);
        }).join('')
            + lot.pieces.map((p, pi) => this.renderPieceCardHTML(p, pi, lot, activeCardKey === `piece:${pi}`)).join('');
        this.applyDetailLotCardActivation(pieceRail, lot);

        pieceRail.querySelectorAll('.piece-card[data-detail-card-key]').forEach((card) => {
            card.addEventListener('click', (e) => {
                const key = card.dataset.detailCardKey;
                if (!key) return;
                if (this.isDetailLotCardActive(lot, key)) return;
                this.setDetailLotActiveCardKey(lot, key, { persist: true });
                // Re-render pour réappliquer l'état visuel (grisé/réactivé) avant édition.
                this.renderDetailLot();
            });
        });

        const updateDefaultPieceDisplays = (defaultPieceId) => {
            const dp = this.ensureDefaultPieceData(lot, defaultPieceId);
            const isDisabled = (Math.max(0, parseFloat(dp.quantite || 0) || 0) <= 0);
            const preview = this.buildPieceFromDefault(lot, -1, defaultPieceId);
            this.recalculatePiece(preview, lot);

            this.recalculateLotAllotissement(lot);
            this.saveData();

            const qVP = pieceRail.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-display="volumePiece"]`);
            if (qVP) qVP.value = isDisabled ? '' : formatGrouped(preview.volumePiece, 3);
            const qSP = pieceRail.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-display="surfacePiece"]`);
            if (qSP) qSP.value = isDisabled ? '' : formatOneDecimal(preview.surfacePiece);
            const qPP = pieceRail.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-display="prixPiece"]`);
            if (qPP) qPP.value = isDisabled ? '' : formatGrouped(Math.round(preview.prixPiece || 0), 0);
            const qPA = pieceRail.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-display="prixPieceAjuste"]`);
            const isIgnored = !!(((lot.inspection || {}).integrite || {}).ignore);
            if (qPA) qPA.value = (isDisabled || isIgnored) ? '' : formatGrouped(Math.round(preview.prixPieceAjusteIntegrite || 0), 0);
            const masseD = this.formatMasseDisplay(preview.massePiece);
            const qMP = pieceRail.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-display="massePiece"]`);
            if (qMP) qMP.value = isDisabled ? '' : masseD.value;
            const qMPU = pieceRail.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-display="massePieceUnit"]`);
            if (qMPU) qMPU.textContent = masseD.unit;
            const qMVM = pieceRail.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-display="masseVolumiqueMesuree"]`);
            if (qMVM) {
                qMVM.value = isDisabled ? '' : this.formatMeasuredDensityDisplay(dp.massePieceMesuree, preview.volumePiece);
            }
            const pco2D = this.formatPco2Display(preview.carboneBiogeniqueEstime);
            const qCO2 = pieceRail.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-display="carboneBiogeniqueEstime"]`);
            if (qCO2) qCO2.value = isDisabled ? '' : pco2D.value;
            const qCO2U = pieceRail.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-display="carboneBiogeniqueEstimeUnit"]`);
            if (qCO2U) qCO2U.textContent = pco2D.unit;

            const unitDisp = pieceRail.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-display="prixMarcheUnit"]`);
            if (unitDisp) {
                const u = ((dp.prixUnite || lot.allotissement.prixUnite || 'm3') + '').toLowerCase();
                unitDisp.textContent = '€/' + (u === 'ml' || u === 'm2' || u === 'm3' ? u : 'm3');
            }
            const masseVolSourceEl = pieceRail.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-display="masseVolumiqueSource"]`);
            if (masseVolSourceEl) {
                masseVolSourceEl.textContent = isDisabled ? '' : this.getMasseVolumiqueSourceLabel({
                    essenceNomCommun: preview.essenceNomCommun,
                    essenceNomScientifique: preview.essenceNomScientifique,
                    _ownMasseVolumique: dp.masseVolumique
                });
            }
            const qAmortDefault = pieceRail.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-display="amortissementBiologique"]`);
            if (qAmortDefault) qAmortDefault.value = isDisabled ? '' : this.computeAmortissementBiologique(dp.ageArbre, dp.dateMiseEnService);
            this.refreshNaturaliteAlertButton(lot);
            this.refreshStabiliteAlertButton(lot);
            this.refreshArtisanaliteAlertButton(lot);
            this.refreshIndustrialiteAlertButton(lot);
        };

        pieceRail.querySelectorAll('.piece-card[data-default-piece-id]').forEach((defaultPieceCard) => {
            const defaultPieceId = defaultPieceCard.dataset.defaultPieceId;
            if (!defaultPieceId) return;
            const cardKey = `default:${defaultPieceId}`;

            const defaultDupBtn = defaultPieceCard.querySelector(`[data-default-piece-duplicate="${defaultPieceId}"]`);
            if (defaultDupBtn) {
                defaultDupBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!this.isDetailLotCardActive(lot, cardKey)) return;
                    this.requestDefaultPieceDuplication(lot, defaultPieceId);
                });
            }

            const defaultDeleteBtn = defaultPieceCard.querySelector(`[data-default-piece-delete="${defaultPieceId}"]`);
            if (defaultDeleteBtn) {
                defaultDeleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!this.isDetailLotCardActive(lot, cardKey)) return;
                    const backdrop = document.getElementById('deleteDefaultPieceConfirmBackdrop');
                    const msgEl = document.getElementById('deleteDefaultPieceConfirmMessage');
                    if (msgEl) {
                        const dp = this.ensureDefaultPieceData(lot, defaultPieceId);
                        const defaultIndex = defaultPieces.findIndex((piece) => piece && piece.id === defaultPieceId);
                        const qty = Math.max(0, Math.floor(parseFloat((dp && dp.quantite) || 0) || 0));
                        const labelIndex = defaultIndex >= 0 ? defaultIndex + 1 : '?';
                        msgEl.textContent = `Voulez-vous supprimer « Pièce par défaut ${labelIndex} » ? L'option de génération créera ${qty} formulaire(s) de pièce détaillée.`;
                    }
                    this._pendingDeleteDefaultPiece = { lot, defaultPieceId };
                    if (backdrop) {
                        backdrop.classList.remove('hidden');
                        backdrop.setAttribute('aria-hidden', 'false');
                    }
                });
            }

            const defaultResetBtn = defaultPieceCard.querySelector(`[data-default-piece-reset="${defaultPieceId}"]`);
            if (defaultResetBtn) {
                defaultResetBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!this.isDetailLotCardActive(lot, cardKey)) return;
                    this.openResetConfirmModal({
                        title: 'Réinitialiser la pièce par défaut',
                        message: 'Voulez-vous vraiment réinitialiser les données du formulaire de pièce par défaut ?',
                        confirmLabel: 'Oui, réinitialiser',
                        onConfirm: () => {
                            this.resetDefaultPieceData(this.ensureDefaultPieceData(lot, defaultPieceId));
                            lot.allotissement.quantite = String(this.getLotQuantityFromDetail(lot));
                            this.recalculateLotAllotissement(lot);
                            this.saveData();
                            this.renderAllotissement();
                            this.renderDetailLot();
                        }
                    });
                });
            }

            defaultPieceCard.querySelectorAll(`button[data-default-piece-id="${defaultPieceId}"][data-default-piece-price-unit]`).forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!this.isDetailLotCardActive(lot, cardKey)) return;
                    const nextUnit = (btn.dataset.defaultPiecePriceUnit || '').toLowerCase();
                    if (nextUnit !== 'ml' && nextUnit !== 'm2' && nextUnit !== 'm3') return;
                    const dp = this.ensureDefaultPieceData(lot, defaultPieceId);
                    dp.prixUnite = nextUnit;
                    defaultPieceCard.querySelectorAll(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-price-unit]`).forEach((button) => {
                        button.setAttribute('aria-pressed', button.dataset.defaultPiecePriceUnit === nextUnit ? 'true' : 'false');
                    });
                    updateDefaultPieceDisplays(defaultPieceId);
                });
            });

            defaultPieceCard.querySelectorAll(`input[data-default-piece-id="${defaultPieceId}"][data-default-piece-input]`).forEach((input) => {
                const updateDefaultPieceField = (e) => {
                    const field = e.target.dataset.defaultPieceInput;
                    if (!field) return;
                    if (!this.isDetailLotCardActive(lot, cardKey)) return;
                    const dp = this.ensureDefaultPieceData(lot, defaultPieceId);
                    const isDefaultDisabled = (Math.max(0, parseFloat(dp.quantite || 0) || 0) <= 0);
                    if (field !== 'quantite' && isDefaultDisabled) return;

                    if (field === 'quantite') {
                        const normalized = this.normalizeAllotissementNumericInput(e.target.value);
                        dp.quantite = normalized;
                        if (e.type === 'change' || e.type === 'blur') {
                            e.target.value = this.formatAllotissementNumericDisplay(dp.quantite);
                        }
                    } else if (this.isAllotissementNumericField(field)) {
                        const normalized = this.normalizeAllotissementNumericInput(e.target.value);
                        dp[field] = normalized;
                        if (field === 'masseVolumique' && normalized === '' && (e.type === 'blur' || e.type === 'change')) {
                            const suggested = this.getSuggestedPieceMasseVolumique(dp, lot);
                            dp[field] = String(suggested);
                        }
                        const shouldFormatDisplay = e.type === 'change' || e.type === 'blur' || !this.isCarbonPrixNumericField(field);
                        if (shouldFormatDisplay) {
                            e.target.value = this.formatAllotissementNumericDisplay(dp[field]);
                        }
                    } else {
                        dp[field] = e.target.value;
                    }

                    if (field === 'diametre') {
                        const hasDiam = (dp.diametre || '') !== '';
                        if (hasDiam) {
                            dp.largeur = '';
                            dp.epaisseur = '';
                        }
                    }

                    if (field === 'largeur' || field === 'epaisseur') {
                        const hasLHNow = (dp.largeur || '') !== '' || (dp.epaisseur || '') !== '';
                        if (hasLHNow) dp.diametre = '';
                    }

                    if (field === 'essenceNomCommun') {
                        const nm = (dp.essenceNomCommun || '').toString().trim();
                        const match = this.findEssenceByCommonName(nm);
                        if (match) {
                            dp.essenceNomScientifique = match.nomScientifique;
                            const sci = defaultPieceCard.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-input="essenceNomScientifique"]`);
                            if (sci) sci.value = match.nomScientifique;
                        }
                        const shouldApplyMasseSuggestion = e.type !== 'input' || !!match;
                        if (shouldApplyMasseSuggestion) {
                            const masseInput = defaultPieceCard.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-input="masseVolumique"]`);
                            const suggested = this.getSuggestedPieceMasseVolumique(dp, lot);
                            if (dp.masseVolumique === '' || e.type !== 'input') dp.masseVolumique = String(suggested);
                            if (masseInput) masseInput.value = this.formatAllotissementNumericDisplay(dp.masseVolumique);
                        }
                    }

                    if (field === 'essenceNomScientifique') {
                        const nm = (dp.essenceNomScientifique || '').toString().trim();
                        const match = this.findEssenceByScientificName(nm);
                        if (match) {
                            dp.essenceNomCommun = match.nomUsuel;
                            const com = defaultPieceCard.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-input="essenceNomCommun"]`);
                            if (com) com.value = match.nomUsuel;
                        }
                        const shouldApplyMasseSuggestion = e.type !== 'input' || !!match;
                        if (shouldApplyMasseSuggestion) {
                            const masseInput = defaultPieceCard.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-input="masseVolumique"]`);
                            const suggested = this.getSuggestedPieceMasseVolumique(dp, lot);
                            if (dp.masseVolumique === '' || e.type !== 'input') dp.masseVolumique = String(suggested);
                            if (masseInput) masseInput.value = this.formatAllotissementNumericDisplay(dp.masseVolumique);
                        }
                    }

                    if (field === 'typeProduit' && e.type !== 'input') {
                        const currentBois = dp.bois;
                        if (currentBois === '' || currentBois == null) {
                            const suggestedBois = this.getDefaultBoisFromTypeProduit(dp.typeProduit);
                            if (suggestedBois !== null) {
                                dp.bois = suggestedBois;
                                const boisInput = defaultPieceCard.querySelector(`[data-default-piece-id="${defaultPieceId}"][data-default-piece-input="bois"]`);
                                if (boisInput) boisInput.value = this.formatAllotissementNumericDisplay(suggestedBois);
                            }
                        }
                    }

                    dp.essence = [
                        (dp.essenceNomCommun || '').toString().trim(),
                        (dp.essenceNomScientifique || '').toString().trim()
                    ].filter(Boolean).join(' - ');

                    lot.allotissement.quantite = String(this.getLotQuantityFromDetail(lot));
                    updateDefaultPieceDisplays(defaultPieceId);
                    this.renderAllotissement();
                    const shouldFullRerender = (field === 'quantite' && e.type !== 'input') || e.type === 'change' || e.type === 'blur';
                    if (shouldFullRerender) {
                        this.renderDetailLot();
                    }
                };

                input.addEventListener('click', (e) => e.stopPropagation());
                input.addEventListener('focus', (e) => {
                    const field = e.target.dataset.defaultPieceInput;
                    if (!field || (field !== 'quantite' && !this.isAllotissementNumericField(field))) return;
                    e.target.value = this.normalizeAllotissementNumericInput(e.target.value);
                });
                input.addEventListener('input', updateDefaultPieceField);
                input.addEventListener('change', updateDefaultPieceField);
                input.addEventListener('blur', updateDefaultPieceField);
            });
        });

        // Bouton ajouter pièce
        const btnAdd = document.getElementById('btnAddPiece');
        if (btnAdd) {
            const newBtn = btnAdd.cloneNode(true);
            btnAdd.parentNode.replaceChild(newBtn, btnAdd);
            newBtn.addEventListener('click', () => {
                const activeCardKey = this.getDetailLotActiveCardKey(lot);
                const activeDefaultPieceId = (activeCardKey && activeCardKey.startsWith('default:'))
                    ? activeCardKey.slice('default:'.length)
                    : null;
                const fallbackDefaultPieceId = defaultPieces[0] && defaultPieces[0].id;
                const sourceDefaultPieceId = activeDefaultPieceId || fallbackDefaultPieceId || null;
                const newPiece = this.createEmptyPiece(lot.pieces.length);
                this.requestDetailedPieceCreation(lot, newPiece, sourceDefaultPieceId);
            });
        }

        const btnAddDefaultPiece = document.getElementById('btnAddDefaultPiece');
        if (btnAddDefaultPiece) {
            const newBtn = btnAddDefaultPiece.cloneNode(true);
            btnAddDefaultPiece.parentNode.replaceChild(newBtn, btnAddDefaultPiece);
            newBtn.addEventListener('click', () => {
                const newDefaultPiece = this.createEmptyDefaultPiece();
                newDefaultPiece.quantite = '1';
                newDefaultPiece.localisation = (lot.localisation || '').toString();
                newDefaultPiece.situation = (lot.situation || '').toString();
                const defaultPiecesList = this.ensureDefaultPiecesData(lot);
                const normalizedDefaultPiece = this.ensureDefaultPieceShape(newDefaultPiece, defaultPiecesList.length);
                defaultPiecesList.push(normalizedDefaultPiece);
                this.setDetailLotActiveCardKey(lot, `default:${normalizedDefaultPiece.id}`, { persist: false });
                this.recalculateLotAllotissement(lot);
                this.saveData();
                this.renderAllotissement();
                this.renderDetailLot();
            });
        }

        // Branchement des événements pour chaque carte pièce
        pieceRail.querySelectorAll('.piece-card').forEach((pieceCard) => {
            const pi = parseInt(pieceCard.dataset.pieceIndex, 10);
            const piece = lot.pieces[pi];
            if (!piece) return;

            // Bouton supprimer
            const delBtn = pieceCard.querySelector('[data-piece-delete]');
            if (delBtn) {
                delBtn.addEventListener('click', () => {
                    if (!this.isDetailLotCardActive(lot, `piece:${pi}`)) return;
                    const pieceName = piece.nom || `Pièce ${pi + 1}`;
                    const msgEl = document.getElementById('deletePieceConfirmMessage');
                    if (msgEl) msgEl.textContent = `Voulez-vous vraiment supprimer « ${pieceName} » ?`;
                    this._pendingDeletePiece = { lot, pi };
                    const backdrop = document.getElementById('deletePieceConfirmBackdrop');
                    if (backdrop) { backdrop.classList.remove('hidden'); backdrop.setAttribute('aria-hidden', 'false'); }
                });
            }

            // Bouton dupliquer pièce
            const dupBtn = pieceCard.querySelector('[data-piece-duplicate]');
            if (dupBtn) {
                dupBtn.addEventListener('click', () => {
                    if (!this.isDetailLotCardActive(lot, `piece:${pi}`)) return;
                    const cloned = JSON.parse(JSON.stringify(piece));
                    cloned.id = Date.now() + '_p' + lot.pieces.length;
                    cloned.nom = `Pièce ${lot.pieces.length + 1}`;
                    this.requestDetailedPieceCreation(lot, cloned);
                });
            }

            // Mise à jour affichages pièce
            const updatePieceDisplays = () => {
                this.recalculateLotAllotissement(lot);
                this.saveData();
                // Met à jour les champs calculés de cette pièce
                const qVP = pieceCard.querySelector('[data-piece-display="volumePiece"]');
                if (qVP) qVP.value = formatGrouped(piece.volumePiece, 3);
                const qSP = pieceCard.querySelector('[data-piece-display="surfacePiece"]');
                if (qSP) qSP.value = formatOneDecimal(piece.surfacePiece);
                const qPP = pieceCard.querySelector('[data-piece-display="prixPiece"]');
                if (qPP) qPP.value = formatGrouped(Math.round(piece.prixPiece || 0), 0);
                const qPA = pieceCard.querySelector('[data-piece-display="prixPieceAjuste"]');
                const isIgnored = !!(((lot.inspection || {}).integrite || {}).ignore);
                if (qPA) qPA.value = isIgnored ? '' : formatGrouped(Math.round(piece.prixPieceAjusteIntegrite || 0), 0);
                const masseD = this.formatMasseDisplay(piece.massePiece);
                const qMP = pieceCard.querySelector('[data-piece-display="massePiece"]');
                if (qMP) qMP.value = masseD.value;
                const qMPU = pieceCard.querySelector('[data-piece-display="massePieceUnit"]');
                if (qMPU) qMPU.textContent = masseD.unit;
                const qMVM = pieceCard.querySelector('[data-piece-display="masseVolumiqueMesuree"]');
                if (qMVM) qMVM.value = this.formatMeasuredDensityDisplay(piece.massePieceMesuree, piece.volumePiece);
                const pco2D = this.formatPco2Display(piece.carboneBiogeniqueEstime);
                const qCO2 = pieceCard.querySelector('[data-piece-display="carboneBiogeniqueEstime"]');
                if (qCO2) qCO2.value = pco2D.value;
                const qCO2U = pieceCard.querySelector('[data-piece-display="carboneBiogeniqueEstimeUnit"]');
                if (qCO2U) qCO2U.textContent = pco2D.unit;
                const masseVolSourceEl = pieceCard.querySelector('[data-piece-display="masseVolumiqueSource"]');
                if (masseVolSourceEl) {
                    masseVolSourceEl.textContent = this.getMasseVolumiqueSourceLabel({
                        essenceNomCommun: (piece.essenceNomCommun || lot.allotissement.essenceNomCommun || '').toString().trim(),
                        essenceNomScientifique: (piece.essenceNomScientifique || lot.allotissement.essenceNomScientifique || '').toString().trim(),
                        _ownMasseVolumique: piece.masseVolumique
                    });
                }
                const qAmortPiece = pieceCard.querySelector('[data-piece-display="amortissementBiologique"]');
                if (qAmortPiece) qAmortPiece.value = this.computeAmortissementBiologique(piece.ageArbre, piece.dateMiseEnService);
                // Met à jour les totaux du lot dans la carte allotissement active
                this.updateActiveLotCardDisplays(lot);
                this.refreshNaturaliteAlertButton(lot);
                this.refreshStabiliteAlertButton(lot);
                this.refreshArtisanaliteAlertButton(lot);
                this.refreshIndustrialiteAlertButton(lot);
            };

            // Boutons unité de prix pièce
            pieceCard.querySelectorAll('button[data-piece-price-unit]').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const nextUnit = (btn.dataset.piecePriceUnit || '').toLowerCase();
                    if (nextUnit !== 'ml' && nextUnit !== 'm2' && nextUnit !== 'm3') return;
                    piece.prixUnite = nextUnit;
                    pieceCard.querySelectorAll('button[data-piece-price-unit]').forEach((b) => {
                        b.setAttribute('aria-pressed', b.dataset.piecePriceUnit === nextUnit ? 'true' : 'false');
                    });
                    const unitDisp = pieceCard.querySelector('[data-piece-display="prixMarcheUnit"]');
                    if (unitDisp) unitDisp.textContent = '€/' + nextUnit;
                    updatePieceDisplays();
                });
            });

            // Branchement des inputs pièce
            pieceCard.querySelectorAll('input[data-piece-input]').forEach(input => {
                const updatePieceField = (e) => {
                    const field = e.target.dataset.pieceInput;
                    if (!field) return;
                    if (!this.isDetailLotCardActive(lot, `piece:${pi}`)) return;

                    if (this.isAllotissementNumericField(field)) {
                        const normalized = this.normalizeAllotissementNumericInput(e.target.value);
                        piece[field] = normalized;
                        if (field === 'masseVolumique' && normalized === '' && (e.type === 'blur' || e.type === 'change')) {
                            const suggested = this.applySuggestedPieceMasseVolumique(piece, lot, { force: true });
                            piece[field] = String(suggested);
                        }
                        const shouldFormatDisplay = e.type === 'change' || e.type === 'blur' || !this.isCarbonPrixNumericField(field);
                        if (shouldFormatDisplay) {
                            e.target.value = this.formatAllotissementNumericDisplay(piece[field]);
                        }
                    } else {
                        piece[field] = e.target.value;
                    }

                    // Exclusion mutuelle diamètre/largeur-epaisseur
                    if (field === 'diametre') {
                        const hasDiam = (piece.diametre || '') !== '';
                        if (hasDiam) {
                            piece.largeur = ''; piece.epaisseur = '';
                            const lI = pieceCard.querySelector('input[data-piece-input="largeur"]');
                            const hI = pieceCard.querySelector('input[data-piece-input="epaisseur"]');
                            if (lI) { lI.value = ''; if (lI.parentElement?.classList.contains('lot-dimension-input-wrap')) lI.parentElement.dataset.hasValue = 'false'; }
                            if (hI) { hI.value = ''; if (hI.parentElement?.classList.contains('lot-dimension-input-wrap')) hI.parentElement.dataset.hasValue = 'false'; }
                        }
                        const lField = pieceCard.querySelector('input[data-piece-input="largeur"]')?.closest('.lot-dimension-field');
                        const hField = pieceCard.querySelector('input[data-piece-input="epaisseur"]')?.closest('.lot-dimension-field');
                        if (lField) lField.dataset.muted = hasDiam ? 'true' : 'false';
                        if (hField) hField.dataset.muted = hasDiam ? 'true' : 'false';
                    }

                    if (field === 'largeur' || field === 'epaisseur') {
                        const hasLH = (piece.largeur || '') !== '' || (piece.epaisseur || '') !== '';
                        if (hasLH) {
                            piece.diametre = '';
                            const dI = pieceCard.querySelector('input[data-piece-input="diametre"]');
                            if (dI) dI.value = '';
                        }
                        const dComp = pieceCard.querySelector('input[data-piece-input="diametre"]')?.closest('.lot-dimension-computed');
                        if (dComp) dComp.dataset.muted = hasLH ? 'true' : 'false';
                    }

                    // Synchronisation essence
                    if (field === 'essenceNomCommun') {
                        const nm = (piece.essenceNomCommun || '').toString().trim();
                        const match = this.findEssenceByCommonName(nm);
                        if (match) {
                            piece.essenceNomScientifique = match.nomScientifique;
                            const sci = pieceCard.querySelector('input[data-piece-input="essenceNomScientifique"]');
                            if (sci) sci.value = match.nomScientifique;
                        }
                        const shouldApplyMasseSuggestion = e.type !== 'input' || !!match;
                        if (shouldApplyMasseSuggestion) {
                            const masseInput = pieceCard.querySelector('input[data-piece-input="masseVolumique"]');
                            this.applySuggestedPieceMasseVolumique(piece, lot, { force: true });
                            if (masseInput) {
                                masseInput.value = this.formatAllotissementNumericDisplay(piece.masseVolumique);
                            }
                        }
                    }
                    if (field === 'essenceNomScientifique') {
                        const nm = (piece.essenceNomScientifique || '').toString().trim();
                        const match = this.findEssenceByScientificName(nm);
                        if (match) {
                            piece.essenceNomCommun = match.nomUsuel;
                            const com = pieceCard.querySelector('input[data-piece-input="essenceNomCommun"]');
                            if (com) com.value = match.nomUsuel;
                        }
                        const shouldApplyMasseSuggestion = e.type !== 'input' || !!match;
                        if (shouldApplyMasseSuggestion) {
                            const masseInput = pieceCard.querySelector('input[data-piece-input="masseVolumique"]');
                            this.applySuggestedPieceMasseVolumique(piece, lot, { force: true });
                            if (masseInput) {
                                masseInput.value = this.formatAllotissementNumericDisplay(piece.masseVolumique);
                            }
                        }
                    }

                    if (field === 'typeProduit' && e.type !== 'input') {
                        const currentBois = piece.bois;
                        if (currentBois === '' || currentBois == null) {
                            const suggestedBois = this.getDefaultBoisFromTypeProduit(piece.typeProduit);
                            if (suggestedBois !== null) {
                                piece.bois = suggestedBois;
                                const boisInput = pieceCard.querySelector('input[data-piece-input="bois"]');
                                if (boisInput) boisInput.value = this.formatAllotissementNumericDisplay(suggestedBois);
                            }
                        }
                    }

                    piece.essence = [
                        (piece.essenceNomCommun || '').toString().trim(),
                        (piece.essenceNomScientifique || '').toString().trim()
                    ].filter(Boolean).join(' - ');

                    updatePieceDisplays();
                };
                input.addEventListener('click', (e) => e.stopPropagation());
                input.addEventListener('focus', (e) => {
                    const field = e.target.dataset.pieceInput;
                    if (!field || !this.isAllotissementNumericField(field)) return;
                    e.target.value = this.normalizeAllotissementNumericInput(e.target.value);
                });
                input.addEventListener('input', updatePieceField);
                input.addEventListener('change', updatePieceField);
                input.addEventListener('blur', updatePieceField);
            });
        });
    }
        
renderInspection() {
    const section = document.getElementById('inspectionSection');
    const lotLabel = document.getElementById('inspectionActiveLotLabel');
    const currentLot = this.getCurrentLot();

    if (!section) return;

    if (!currentLot) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';

    if (!currentLot.inspection) {
        currentLot.inspection = {
            visibilite: null,
            instrumentation: null,
            integrite: { niveau: null, ignore: false, coeff: null }
        };
    }

    if (lotLabel) {
        const index = this.data.lots.indexOf(currentLot);
        lotLabel.textContent = index >= 0 ? `Lot ${index + 1}` : 'Lot –';
    }

    this.updateInspectionSimple('visibilite', currentLot);
    this.updateInspectionSimple('instrumentation', currentLot);
    this.updateInspectionIntegrite(currentLot);
}

getInspectionToneFromLevel(level) {
    if (!level) return null;
    const normalized = String(level).toLowerCase();
    if (normalized === 'forte' || normalized === 'fort') return 'high';
    if (normalized === 'moyenne' || normalized === 'moyen') return 'mid';
    if (normalized === 'faible') return 'low';
    return null;
}

getNoteToneFromIntensity(intensityMap, intensity) {
    if (!intensityMap || intensity == null) return null;
    const values = Array.from(new Set(Object.values(intensityMap)
        .map((v) => parseFloat(v))
        .filter((v) => Number.isFinite(v))))
        .sort((a, b) => b - a);

    if (!values.length) return null;
    const value = parseFloat(intensity);
    if (!Number.isFinite(value)) return null;

    const max = values[0];
    const min = values[values.length - 1];

    if (value === max) return 'high';
    if (value === min) return 'low';
    return 'mid';
}

setRowNoteTone(row, tone) {
    if (!row) return;
    if (!tone) {
        delete row.dataset.noteTone;
        return;
    }
    row.dataset.noteTone = tone;
}

setRowNoteToneFromIntensity(row, intensityMap, intensity) {
    this.setRowNoteTone(row, this.getNoteToneFromIntensity(intensityMap, intensity));
}

getClientXFromEvent(event) {
    if (!event) return null;
    if (typeof event.clientX === 'number') return event.clientX;
    if (event.changedTouches && event.changedTouches.length && typeof event.changedTouches[0].clientX === 'number') {
        return event.changedTouches[0].clientX;
    }
    if (event.touches && event.touches.length && typeof event.touches[0].clientX === 'number') {
        return event.touches[0].clientX;
    }
    return null;
}

getSliderLevelFromEvent(slider, event, steps = 3) {
    if (!slider || !event) return null;
    const clientX = this.getClientXFromEvent(event);
    if (clientX == null) return null;
    const rect = slider.getBoundingClientRect();
    if (!rect.width) return null;
    const ratio = Math.max(0, Math.min(0.999, (clientX - rect.left) / rect.width));
    return Math.max(1, Math.min(steps, Math.round(ratio * (steps - 1)) + 1));
}

updateInspectionSimple(key, lot) {
    const section = document.getElementById('inspectionSection');
    if (!section) return;

    const row = section.querySelector(`.inspection-row[data-inspection-field="${key}"]`);
    if (!row) return;

    const slider       = row.querySelector('.inspection-slider');
    const valueBox     = row.querySelector(`.inspection-value-box[data-display="${key}"]`);
    const intensityBox = row.querySelector(`.inspection-intensity-box[data-intensity="${key}"]`);
    const resetBtn     = row.querySelector('.inspection-reset-btn');
    const infoBtn      = row.querySelector('.inspection-info-small-btn');

    const levelToLabel = { 1: 'Forte', 2: 'Moyenne', 3: 'Faible' };
    const nameToLevel  = { forte: 1,   moyenne: 2,   faible: 3   };

    const stored = lot.inspection[key];
    const currentLevel = stored ? nameToLevel[stored] : null;

    // affichage initial
    if (valueBox) {
        valueBox.textContent = currentLevel ? levelToLabel[currentLevel] : '…';
    }
    if (intensityBox) {
        intensityBox.textContent = currentLevel ? '+' + String(currentLevel) : '…';
    }
    if (slider) {
        slider.value = currentLevel || 2;
    }
    row.classList.toggle('inspection-row--disabled', !currentLevel);
    this.setRowNoteTone(row, this.getInspectionToneFromLevel(stored));

    // réaction au slider
    if (slider) {
        const handleSliderChange = (e) => {
            const v = parseInt(e.target.value, 10);
            const label = levelToLabel[v];

            lot.inspection[key] =
                v === 1 ? 'forte' :
                v === 2 ? 'moyenne' :
                          'faible';

            if (valueBox)     valueBox.textContent = label;
            if (intensityBox) intensityBox.textContent = '+' + String(v);
            row.classList.remove('inspection-row--disabled');
            this.setRowNoteTone(row, this.getInspectionToneFromLevel(lot.inspection[key]));

            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
        };

        const commitIfFirstInteraction = (event) => {
            if (!lot.inspection[key]) {
                const picked = this.getSliderLevelFromEvent(slider, event, 3);
                if (picked != null) {
                    slider.value = String(picked);
                }
                handleSliderChange({ target: slider });
            }
        };

        slider.oninput = handleSliderChange;
        slider.onchange = handleSliderChange;
        slider.onclick = commitIfFirstInteraction;
        slider.onpointerup = commitIfFirstInteraction;
        slider.ontouchend = commitIfFirstInteraction;
    }

    // bouton Réinitialiser
    if (resetBtn) {
        resetBtn.onclick = () => {
            lot.inspection[key] = null;
            if (slider)       slider.value = 2;
            if (valueBox)     valueBox.textContent = '…';
            if (intensityBox) intensityBox.textContent = '…';
            row.classList.add('inspection-row--disabled');
            this.setRowNoteTone(row, null);

            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
        };
    }

    // bouton info
    if (infoBtn) {
        infoBtn.onclick = () => this.openInspectionDetailModal(key);
    }
}

updateInspectionIntegrite(lot) {
    const section = document.getElementById('inspectionSection');
    if (!section) return;

    const row = section.querySelector('.inspection-row[data-inspection-field="integrite"]');
    if (!row) return;

    const slider   = row.querySelector('.inspection-slider');
    const valueBox = row.querySelector('.inspection-value-box[data-display="integrite"]');
    const coeffBox = row.querySelector('.inspection-intensity-box[data-intensity="integrite"]');
    const resetBtn = row.querySelector('.inspection-reset-btn');
    const ignoreBtn = row.querySelector('.inspection-ignore-btn');
    const infoBtn   = row.querySelector('.inspection-info-small-btn');

    const levelToLabel = { 1: 'Forte', 2: 'Moyenne', 3: 'Faible' };
    const levelToCoeff = { 1: 0.7,    2: 0.3,       3: 0.1      };
    const nameToLevel  = { forte: 1,  moyenne: 2,   faible: 3   };

    if (!lot.inspection.integrite) {
        lot.inspection.integrite = { niveau: null, ignore: false, coeff: null };
    }
    const data = lot.inspection.integrite;
    const currentLevel = data.niveau ? nameToLevel[data.niveau] : null;

    const ignoreBox = row.querySelector('.inspection-ignore-box');

    const refreshUI = () => {
        if (data.ignore) {
            if (valueBox) valueBox.textContent = '…';
            if (coeffBox) coeffBox.textContent = 'Coeff. …';
            row.classList.add('inspection-row--disabled');
            row.classList.add('inspection-row--ignored');
            this.setRowNoteTone(row, null);
            if (ignoreBox) ignoreBox.textContent = 'Ignoré';
        } else if (data.niveau) {
            if (ignoreBox) ignoreBox.textContent = '';
            if (valueBox) {
                valueBox.textContent =
                    data.niveau === 'forte'   ? 'Forte'  :
                    data.niveau === 'moyenne' ? 'Moyenne':
                                                 'Faible';
            }
            if (coeffBox) {
                coeffBox.textContent = `Coeff. ${data.coeff.toString().replace('.', ',')}`;
            }
            row.classList.remove('inspection-row--disabled');
            row.classList.remove('inspection-row--ignored');
            this.setRowNoteTone(row, this.getInspectionToneFromLevel(data.niveau));
        } else {
            if (ignoreBox) ignoreBox.textContent = '';
            if (valueBox) valueBox.textContent = '…';
            if (coeffBox) coeffBox.textContent = 'Coeff. …';
            row.classList.add('inspection-row--disabled');
            row.classList.remove('inspection-row--ignored');
            this.setRowNoteTone(row, null);
        }
    };

    if (slider) {
        slider.value = currentLevel || 2;
        const handleIntegriteSliderChange = (e) => {
            const v = parseInt(e.target.value, 10);
            data.niveau = v === 1 ? 'forte' : v === 2 ? 'moyenne' : 'faible';
            data.coeff  = levelToCoeff[v];
            data.ignore = false;

            refreshUI();
            this.recalculateLotAllotissement(lot);
            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
            this.renderAllotissement();
            this.renderEvalOp();
        };

        const commitIntegriteIfFirstInteraction = (event) => {
            if (!data.niveau || data.ignore) {
                const picked = this.getSliderLevelFromEvent(slider, event, 3);
                if (picked != null) {
                    slider.value = String(picked);
                }
                handleIntegriteSliderChange({ target: slider });
            }
        };

        slider.oninput = handleIntegriteSliderChange;
        slider.onchange = handleIntegriteSliderChange;
        slider.onclick = commitIntegriteIfFirstInteraction;
        slider.onpointerup = commitIntegriteIfFirstInteraction;
        slider.ontouchend = commitIntegriteIfFirstInteraction;
    }

    if (resetBtn) {
        resetBtn.onclick = () => {
            data.niveau = null;
            data.coeff  = null;
            data.ignore = false;
            if (slider) slider.value = 2;
            refreshUI();
            this.recalculateLotAllotissement(lot);
            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
            this.renderAllotissement();
            this.renderEvalOp();
        };
    }

    if (ignoreBtn) {
        ignoreBtn.onclick = () => {
            data.ignore = true;
            data.niveau = null;
            data.coeff  = null;
            if (slider) slider.value = 2;
            refreshUI();
            this.recalculateLotAllotissement(lot);
            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
            this.renderAllotissement();
            this.renderEvalOp();
        };
    }

    if (infoBtn) {
        infoBtn.onclick = () => this.openInspectionDetailModal('integrite');
    }

    refreshUI();
}

/* ---- Bio ---- */

renderBio() {
    const section  = document.getElementById('bioSection');
    const lotLabel = document.getElementById('bioActiveLotLabel');
    const currentLot = this.getCurrentLot();

    if (!section) return;

    if (!currentLot) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    if (!currentLot.bio) {
        currentLot.bio = {
            purge: null,
            expansion: null,
            integriteBio: null,
            exposition: null,
            confianceBio: null
        };
    }

    if (lotLabel) {
        const index = this.data.lots.indexOf(currentLot);
        lotLabel.textContent = index >= 0 ? 'Lot ' + (index + 1) : 'Lot …';
    }

    const fields = ['purge', 'expansion', 'integriteBio', 'exposition', 'confianceBio'];

    fields.forEach((key) => {
        const row = section.querySelector(`.bio-row[data-bio-field="${key}"]`);
        if (!row) return;
        this.updateBioRow(row, key, currentLot);
    });
}

updateBioRow(row, key, lot) {
    const slider         = row.querySelector('.bio-slider');
    const levelBox       = row.querySelector(`.bio-level-box[data-display="${key}"]`);
    const intensityBox   = row.querySelector(`.bio-intensity-box[data-intensity="${key}"]`);
    const resetBtn       = row.querySelector('.bio-reset-btn');
    const infoBtn        = row.querySelector('.bio-info-small-btn');
    const confianceTitle = row.querySelector('[data-confiance-title]');

    const levelToLabel = { 1: 'Forte', 2: 'Moyenne', 3: 'Faible' };
    const intensityMaps = {
        purge:        { Forte: -3,  Moyenne:  1, Faible:  3 },
        expansion:    { Forte: -10, Moyenne: -3, Faible:  3 },
        integriteBio: { Forte:  3,  Moyenne:  1, Faible: -10 },
        exposition:   { Forte: -3,  Moyenne:  1, Faible:  3 },
        confianceBio: { Forte:  3,  Moyenne:  2, Faible:  1 }
    };

    const current = lot.bio[key];

    if (slider) {
        let val = 2;
        if (current && current.niveau) {
            val = current.niveau === 'Forte' ? 1
                : current.niveau === 'Moyenne' ? 2
                : 3;
        }
        slider.value = val;

        slider.oninput = (e) => {
            const v = parseInt(e.target.value, 10);
            const label = levelToLabel[v];
            const intensity = intensityMaps[key]
                ? (intensityMaps[key][label] != null ? intensityMaps[key][label] : null)
                : null;

            lot.bio[key] = { niveau: label, valeur: intensity };

            if (levelBox) levelBox.textContent = label;
            if (intensityBox) {
                if (intensity != null) {
                    const sign = intensity > 0 ? '+' : '';
                    intensityBox.textContent = sign + intensity;
                } else {
                    intensityBox.textContent = '...';
                }
            }

            row.classList.remove('bio-row--disabled');
            this.setRowNoteToneFromIntensity(row, intensityMaps[key], intensity);

            if (key === 'confianceBio' && confianceTitle) {
                if (label === 'Faible') {
                    confianceTitle.classList.add('bio-label-confiance--low');
                } else {
                    confianceTitle.classList.remove('bio-label-confiance--low');
                }
            }

            this.saveData();
            const activeLot = this.getCurrentLot();
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
            this.renderSeuils();
            this.renderEvalOp();
        };
    }

    if (levelBox) {
        levelBox.textContent = current && current.niveau ? current.niveau : '…';
    }
    if (intensityBox) {
        if (current && current.valeur != null) {
            const val = current.valeur;
            const sign = val > 0 ? '+' : '';
            intensityBox.textContent = sign + val;
        } else {
            intensityBox.textContent = '...';
        }
    }

    if (resetBtn) {
        resetBtn.onclick = () => {
            lot.bio[key] = null;
            if (slider) slider.value = 2;
            if (levelBox) levelBox.textContent = '…';
            if (intensityBox) intensityBox.textContent = '...';
            row.classList.add('bio-row--disabled');
            this.setRowNoteTone(row, null);

            if (key === 'confianceBio' && confianceTitle) {
                confianceTitle.classList.remove('bio-label-confiance--low');
            }

            this.saveData();
            const activeLot = this.getCurrentLot();
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
            this.renderSeuils();
            this.renderEvalOp();
        };
    }

    if (infoBtn) {
        infoBtn.onclick = () => this.openBioDetailModal(key);
    }

    if (!current) {
        row.classList.add('bio-row--disabled');
    } else {
        row.classList.remove('bio-row--disabled');
    }
    this.setRowNoteToneFromIntensity(row, intensityMaps[key], current && current.valeur != null ? current.valeur : null);

    if (key === 'confianceBio' && confianceTitle) {
        if (current && current.niveau === 'Faible') {
            confianceTitle.classList.add('bio-label-confiance--low');
        } else {
            confianceTitle.classList.remove('bio-label-confiance--low');
        }
    }
}

    /* ---- Mech ---- */

renderMech() {
    const section = document.getElementById('mechSection');
    const lotLabel = document.getElementById('mechActiveLotLabel');
    const currentLot = this.getCurrentLot();

    if (!section) return;

    if (!currentLot) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    if (!currentLot.mech) {
        currentLot.mech = {
            purgeMech: null,
            feuMech: null,
            integriteMech: null,
            expositionMech: null,
            confianceMech: null
        };
    }

    if (lotLabel) {
        const index = this.data.lots.indexOf(currentLot);
        lotLabel.textContent = index >= 0 ? 'Lot ' + (index + 1) : 'Lot …';
    }

    const fields = ['purgeMech', 'feuMech', 'integriteMech', 'expositionMech', 'confianceMech'];

    fields.forEach((key) => {
        const row = section.querySelector(`.mech-row[data-mech-field="${key}"]`);
        if (!row) return;
        this.updateMechRow(row, key, currentLot);
    });

}

updateMechRow(row, key, lot) {
    const slider = row.querySelector('.mech-slider');
    const levelBox = row.querySelector(`.mech-level-box[data-display="${key}"]`);
    const intensityBox = row.querySelector(`.mech-intensity-box[data-intensity="${key}"]`);
    const resetBtn = row.querySelector('.mech-reset-btn');
    const infoBtn = row.querySelector('.mech-info-small-btn');
    const confianceTitle = row.querySelector('[data-mech-confiance-title]');

    const levelToLabel = { 1: 'Forte', 2: 'Moyenne', 3: 'Faible' };
    const intensityMaps = {
        purgeMech: { Forte: -3, Moyenne: 1, Faible: 3 },
        feuMech: { Forte: 3, Moyenne: 2, Faible: 1 },
        integriteMech: { Forte: 3, Moyenne: -3, Faible: -10 },
        expositionMech: { Forte: -3, Moyenne: 1, Faible: 3 },
        confianceMech: { Forte: 3, Moyenne: 2, Faible: 1 }
    };

    // Initialisation
    const current = lot.mech[key];
    if (slider) {
        let val = 2;
        if (current && current.niveau) {
            val = current.niveau === 'Forte' ? 1 : (current.niveau === 'Moyenne' ? 2 : 3);
        }
        slider.value = val;

        // EVENEMENT SLIDER
        slider.oninput = (e) => {
            const v = parseInt(e.target.value, 10);
            const label = levelToLabel[v];
            const score = intensityMaps[key][label];

            lot.mech[key] = { niveau: label, valeur: score };

            if (levelBox) levelBox.textContent = label;
            if (intensityBox) intensityBox.textContent = (score > 0 ? '+' : '') + score;
            
            row.classList.remove('mech-row--disabled');
            this.setRowNoteToneFromIntensity(row, intensityMaps[key], score);
            
            this.saveData();
            // SECURITÉ : Utiliser "lot" (le paramètre) ou "activeLot"
            const activeLot = this.getCurrentLot();
            if (activeLot) this.computeOrientation(activeLot);
        };
    }

    if (levelBox) {
        if (current && current.niveau) {
            levelBox.textContent = current.niveau;
        } else {
            levelBox.textContent = '…';
        }
    }

    if (intensityBox) {
        if (current && current.valeur != null) {
            const val = current.valeur;
            const sign = val > 0 ? "+" : "";
            intensityBox.textContent = sign + val;   // juste la note
        } else {
            intensityBox.textContent = "...";        // note en attente
        }
    }

    if (resetBtn) {
        resetBtn.onclick = () => {
            lot.mech[key] = null;
            row.classList.add('mech-row--disabled');
            if (slider) slider.value = 2;
            if (levelBox) levelBox.textContent = '…';
            if (intensityBox) intensityBox.textContent = '...';
            this.setRowNoteTone(row, null);

            if (key === 'confianceMech' && confianceTitle) {
                confianceTitle.classList.remove('mech-label-confiance--low');
            }

            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }

        };
    }

    if (infoBtn) {
        infoBtn.onclick = () => this.openMechDetailModal(key);
    }

    if (!current) {
        row.classList.add('mech-row--disabled');
    } else {
        row.classList.remove('mech-row--disabled');
    }
    this.setRowNoteToneFromIntensity(row, intensityMaps[key], current && current.valeur != null ? current.valeur : null);

    if (key === 'confianceMech' && confianceTitle) {
        if (current && current.niveau === 'Faible') {
            confianceTitle.classList.add('mech-label-confiance--low');
        } else {
            confianceTitle.classList.remove('mech-label-confiance--low');
        }
    }
}    

    /* ---- Usage ---- */

renderUsage(){
    const section = document.getElementById('usageSection');
    const lotLabel = document.getElementById('usageActiveLotLabel');
    const currentLot = this.getCurrentLot();

    if (!section) return;

    if (!currentLot) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    if (!currentLot.usage) {
        currentLot.usage = {
            confianceUsage: null,
            durabiliteUsage: null,
            classementUsage: null,
            humiditeUsage: null,
            aspectUsage: null
        };
    }

    if (lotLabel) {
        const index = this.data.lots.indexOf(currentLot);
        lotLabel.textContent = index >= 0 ? 'Lot ' + (index + 1) : 'Lot …';
    }

    const fields = [
        'confianceUsage',
        'durabiliteUsage',
        'classementUsage',
        'humiditeUsage',
        'aspectUsage'
    ];

    fields.forEach((key) => {
        const row = section.querySelector(`.usage-row[data-usage-field="${key}"]`);
        if (!row) return;
        this.updateUsageRow(row, key, currentLot);
    });
}

updateUsageRow(row, key, lot) {
    const slider = row.querySelector('.usage-slider');
    const levelBox = row.querySelector(`.usage-level-box[data-display="${key}"]`);
    const intensityBox = row.querySelector(`.usage-intensity-box[data-intensity="${key}"]`);
    const resetBtn = row.querySelector('.usage-reset-btn');
    const infoBtn = row.querySelector('.usage-info-small-btn');
    const confianceTitle = row.querySelector('[data-usage-confiance-title]');

    const levelToLabel = { 1: 'Forte', 2: 'Moyenne', 3: 'Faible' };
    const levelToLabelFM = { 1: 'Fort', 2: 'Moyen', 3: 'Faible' }; // pour les champs "Fort/Moyen/Faible"

    const intensityMaps = {
        confianceUsage: { Forte: 3, Moyenne: 2, Faible: 1 },
        durabiliteUsage: { Forte: 3, Moyenne: 2, Faible: 1 },
        classementUsage: { Fort: 3, Moyen: 2, Faible: 1 },
        humiditeUsage: { Forte: -3, Moyenne: 3, Faible: 1 },
        aspectUsage: { Fort: 3, Moyen: 2, Faible: 1 }
    };

    const current = lot.usage[key];

    const isFortMoyenFaible = key === 'classementUsage' || key === 'aspectUsage';

    if (slider) {
        let val = 2;
        if (current && current.niveau) {
            const lbl = current.niveau;
            val = lbl === 'Forte' || lbl === 'Fort' ? 1 :
                  lbl === 'Moyenne' || lbl === 'Moyen' ? 2 : 3;
        }
        slider.value = val;

        slider.oninput = (e) => {
            const v = parseInt(e.target.value, 10);
            const label = isFortMoyenFaible ? levelToLabelFM[v] : levelToLabel[v];
            const map = intensityMaps[key] || {};
            const intensity = map[label] != null ? map[label] : null;

            lot.usage[key] = { niveau: label, valeur: intensity };

            if (levelBox) levelBox.textContent = label;
            if (intensityBox) {
  if (intensity != null) {
    const sign = intensity > 0 ? "+" : "";
    intensityBox.textContent = sign + intensity; // juste la note
  } else {
    intensityBox.textContent = "..."; // note en attente
  }
} 
    row.classList.remove('usage-row--disabled');
            this.setRowNoteToneFromIntensity(row, intensityMaps[key], intensity);

            if (key === 'confianceUsage' && confianceTitle) {
                if (label === 'Faible') {
                    confianceTitle.classList.add('usage-label-confiance--low');
                } else {
                    confianceTitle.classList.remove('usage-label-confiance--low');
                }
            }

            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }

        };
    }

    if (levelBox) {
        if (current && current.niveau) {
            levelBox.textContent = current.niveau;
        } else {
            levelBox.textContent = '…';
        }
    }

    if (intensityBox) {
  if (current && current.valeur != null) {
    const val = current.valeur;
    const sign = val > 0 ? "+" : "";
    intensityBox.textContent = sign + val; // juste la note
  } else {
    intensityBox.textContent = "..."; // note en attente
  }
}


    if (resetBtn) {
        resetBtn.onclick = () => {
            lot.usage[key] = null;
            row.classList.add('usage-row--disabled');
            if (slider) slider.value = 2;
            if (levelBox) levelBox.textContent = '…';
            if (intensityBox) intensityBox.textContent = '...';
            this.setRowNoteTone(row, null);

            if (key === 'confianceUsage' && confianceTitle) {
                confianceTitle.classList.remove('usage-label-confiance--low');
            }

            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }

        };
    }

    if (infoBtn) {
        infoBtn.onclick = () => this.openUsageDetailModal(key);
    }

    if (!current) {
        row.classList.add('usage-row--disabled');
    } else {
        row.classList.remove('usage-row--disabled');
    }
    this.setRowNoteToneFromIntensity(row, intensityMaps[key], current && current.valeur != null ? current.valeur : null);

    if (key === 'confianceUsage' && confianceTitle) {
        if (current && current.niveau === 'Faible') {
            confianceTitle.classList.add('usage-label-confiance--low');
        } else {
            confianceTitle.classList.remove('usage-label-confiance--low');
        }
    }
}

    /* ---- Dénaturation ---- */

renderDenat() {
    const section = document.getElementById('denatSection');
    const lotLabel = document.getElementById('denatActiveLotLabel');
    const currentLot = this.getCurrentLot();

    if (!section) return;

    if (!currentLot) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    if (!currentLot.denat) {
        currentLot.denat = {
            depollutionDenat: null,
            contaminationDenat: null,
            durabiliteConfDenat: null,
            confianceDenat: null,
            naturaliteDenat: null
        };
    }

    if (lotLabel) {
        const index = this.data.lots.indexOf(currentLot);
        lotLabel.textContent = index >= 0 ? 'Lot ' + (index + 1) : 'Lot …';
    }

    const fields = [
        'depollutionDenat',
        'contaminationDenat',
        'durabiliteConfDenat',
        'confianceDenat',
        'naturaliteDenat'
    ];

    fields.forEach((key) => {
        const row = section.querySelector(`.denat-row[data-denat-field="${key}"]`);
        if (!row) return;
        this.updateDenatRow(row, key, currentLot);
    });
}

updateDenatRow(row, key, lot) {
    const slider = row.querySelector('.denat-slider');
    const levelBox = row.querySelector(`.denat-level-box[data-display="${key}"]`);
    const intensityBox = row.querySelector(`.denat-intensity-box[data-intensity="${key}"]`);
    const resetBtn = row.querySelector('.denat-reset-btn');
    const infoBtn = row.querySelector('.denat-info-small-btn');
    const naturaliteAlertBtn = key === 'naturaliteDenat' ? row.querySelector('[data-denat-naturalite-alert-btn]') : null;
    const confianceTitle = row.querySelector('[data-denat-confiance-title]');

    const levelToLabel = { 1: 'Forte', 2: 'Moyenne', 3: 'Faible' };
    const levelToLabelFM = { 1: 'Fort', 2: 'Moyen', 3: 'Faible' };

    const intensityMaps = {
        depollutionDenat: { Forte: -3, Moyenne: 1, Faible: 3 },
        contaminationDenat: { Forte: -10, Moyenne: 1, Faible: 3 },
        durabiliteConfDenat: { Forte: 1, Moyenne: 2, Faible: 3 },
        confianceDenat: { Forte: 3, Moyenne: 2, Faible: 1 },
        naturaliteDenat: { Forte: 3, Moyenne: 2, Faible: 1 }
    };

    const current = lot.denat[key];
    const isFortMoyenFaible = key === 'durabiliteConfDenat';

    if (slider) {
        let val = 2;
        if (current && current.niveau) {
            const lbl = current.niveau;
            val = lbl === 'Forte' || lbl === 'Fort' ? 1 :
                  lbl === 'Moyenne' || lbl === 'Moyen' ? 2 : 3;
        }
        slider.value = val;

        slider.oninput = (e) => {
            const v = parseInt(e.target.value, 10);
            const label = isFortMoyenFaible ? levelToLabelFM[v] : levelToLabel[v];
            const map = intensityMaps[key];
            const mapLabel = levelToLabel[v];
            const intensity = map && map[mapLabel] != null ? map[mapLabel] : null;

            lot.denat[key] = { niveau: label, valeur: intensity };

            if (levelBox) levelBox.textContent = label;
            if (intensityBox) {
                if (intensity != null) {
                    const sign = intensity > 0 ? "+" : "";
                    intensityBox.textContent = sign + intensity;   // juste la note
                } else {
                    intensityBox.textContent = "...";        // note en attente
                }
            }

            row.classList.remove('denat-row--disabled');
            this.setRowNoteToneFromIntensity(row, intensityMaps[key], intensity);

            if (key === 'confianceDenat' && confianceTitle) {
                if (label === 'Faible') {
                    confianceTitle.classList.add('denat-label-confiance--low');
                } else {
                    confianceTitle.classList.remove('denat-label-confiance--low');
                }
            }

            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }

            updateNaturaliteAlertBtn();

        };
    }

    if (levelBox) {
        if (current && current.niveau) {
            levelBox.textContent = current.niveau;
        } else {
            levelBox.textContent = '…';
        }
    }

    if (intensityBox) {
  if (current && current.valeur != null) {
    const val = current.valeur;
    const sign = val > 0 ? "+" : "";
    intensityBox.textContent = sign + val; // juste la note
  } else {
    intensityBox.textContent = "..."; // note en attente
  }
}


    if (resetBtn) {
        resetBtn.onclick = () => {
            lot.denat[key] = null;
            row.classList.add('denat-row--disabled');
            if (slider) slider.value = 2;
            if (levelBox) levelBox.textContent = '…';
            if (intensityBox) intensityBox.textContent = '...';
            this.setRowNoteTone(row, null);

            if (key === 'confianceDenat' && confianceTitle) {
                confianceTitle.classList.remove('denat-label-confiance--low');
            }

            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }

            updateNaturaliteAlertBtn();

        };
    }

    if (infoBtn) {
        infoBtn.onclick = () => this.openDenatDetailModal(key);
    }

    const updateNaturaliteAlertBtn = () => this.refreshNaturaliteAlertButton(lot);

    if (naturaliteAlertBtn) {
        updateNaturaliteAlertBtn();
        naturaliteAlertBtn.onclick = (e) => {
            e.stopPropagation();
            updateNaturaliteAlertBtn();
            const alertState = naturaliteAlertBtn.dataset.alertNaturaliteState || 'none';
            this.openDenatNaturaliteAlertModal(alertState);
        };
    }

    if (!current) {
        row.classList.add('denat-row--disabled');
    } else {
        row.classList.remove('denat-row--disabled');
    }
    this.setRowNoteToneFromIntensity(row, intensityMaps[key], current && current.valeur != null ? current.valeur : null);

    if (key === 'confianceDenat' && confianceTitle) {
        if (current && current.niveau === 'Faible') {
            confianceTitle.classList.add('denat-label-confiance--low');
        } else {
            confianceTitle.classList.remove('denat-label-confiance--low');
        }
    }
}

    /* ---- Débit ---- */

renderDebit() {
    const section = document.getElementById('debitSection');
    const lotLabel = document.getElementById('debitActiveLotLabel');
    const currentLot = this.getCurrentLot();

    if (!section) return;

    if (!currentLot) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    if (!currentLot.debit) {
        currentLot.debit = {
            regulariteDebit: null,
            volumetrieDebit: null,
            stabiliteDebit: null,
            artisanaliteDebit: null,
            rusticiteDebit: null
        };
    }

    if (lotLabel) {
        const index = this.data.lots.indexOf(currentLot);
        lotLabel.textContent = index >= 0 ? 'Lot ' + (index + 1) : 'Lot …';
    }

    const fields = [
        'regulariteDebit',
        'volumetrieDebit',
        'stabiliteDebit',
        'artisanaliteDebit',
        'rusticiteDebit'
    ];

    fields.forEach((key) => {
        const row = section.querySelector(`.debit-row[data-debit-field="${key}"]`);
        if (!row) return;
        this.updateDebitRow(row, key, currentLot);
    });
}

updateDebitRow(row, key, lot) {
    const slider = row.querySelector('.debit-slider');
    const levelBox = row.querySelector(`.debit-level-box[data-display="${key}"]`);
    const intensityBox = row.querySelector(`.debit-intensity-box[data-intensity="${key}"]`);
    const resetBtn = row.querySelector('.debit-reset-btn');
    const infoBtn = row.querySelector('.debit-info-small-btn');
    const volumetrieAlertBtn = key === 'volumetrieDebit' ? row.querySelector('[data-debit-volumetrie-alert-btn]') : null;
    const regulariteAlertBtn = key === 'regulariteDebit' ? row.querySelector('[data-debit-regularite-alert-btn]') : null;
    const stabiliteAlertBtn = key === 'stabiliteDebit' ? row.querySelector('[data-debit-stabilite-alert-btn]') : null;
    const artisanaliteAlertBtn = key === 'artisanaliteDebit' ? row.querySelector('[data-debit-artisanalite-alert-btn]') : null;

    const levelToLabel = { 1: 'Forte', 2: 'Moyenne', 3: 'Faible' };

    const intensityMaps = {
        regulariteDebit: { Forte: 3, Moyenne: 2, Faible: 1 },
        volumetrieDebit: { Forte: 3, Moyenne: 2, Faible: 1 },
        stabiliteDebit: { Forte: 3, Moyenne: 2, Faible: 1 },
        artisanaliteDebit: { Forte: 3, Moyenne: 2, Faible: 1 },
        rusticiteDebit: { Forte: 3, Moyenne: 2, Faible: 1 }
    };

    const current = lot.debit[key];
    this.setRowNoteToneFromIntensity(row, intensityMaps[key], current && current.valeur != null ? current.valeur : null);

    if (slider) {
        let val = 2;
        if (current && current.niveau) {
            const lbl = current.niveau;
            val = lbl === 'Forte' ? 1 : lbl === 'Moyenne' ? 2 : 3;
        }
        slider.value = val;

        slider.oninput = (e) => {
            const v = parseInt(e.target.value, 10);
            const label = levelToLabel[v];
            const map = intensityMaps[key] || {};
            const intensity = map[label] != null ? map[label] : null;

            lot.debit[key] = { niveau: label, valeur: intensity };

            if (levelBox) levelBox.textContent = label;
            if (intensityBox) {
  if (intensity != null) {
    const sign = intensity > 0 ? "+" : "";
    intensityBox.textContent = sign + intensity; // juste la note
  } else {
    intensityBox.textContent = "..."; // note en attente
  }
   
            row.classList.remove('debit-row--disabled');
            this.setRowNoteToneFromIntensity(row, intensityMaps[key], intensity);
            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
            updateDebitAlertBtns();

        };
    }

    if (levelBox) {
        if (current && current.niveau) {
            levelBox.textContent = current.niveau;
        } else {
            levelBox.textContent = '…';
        }
    }

    if (intensityBox) {
  if (current && current.valeur != null) {
    const val = current.valeur;
    const sign = val > 0 ? "+" : "";
    intensityBox.textContent = sign + val; // juste la note
  } else {
    intensityBox.textContent = "..."; // note en attente
  }
    }



    if (resetBtn) {
        resetBtn.onclick = () => {
            lot.debit[key] = null;
            row.classList.add('debit-row--disabled');
            if (slider) slider.value = 2;
            if (levelBox) levelBox.textContent = '…';
            if (intensityBox) intensityBox.textContent = '...';
            this.setRowNoteTone(row, null);
            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
            updateDebitAlertBtns();

        };
    }

    if (infoBtn) {
        infoBtn.onclick = () => this.openDebitDetailModal(key);
    }

    const updateDebitAlertBtns = () => {
        if (volumetrieAlertBtn) {
            const volumetrieValue = lot && lot.allotissement && lot.allotissement.volumePiece != null
                ? String(lot.allotissement.volumePiece)
                : '';
            const volumetrieState = this.getVolumetrieAlertState(volumetrieValue);
            volumetrieAlertBtn.dataset.alertVolumetrieState = volumetrieState;
        }

        if (regulariteAlertBtn) {
            const diametreValue = lot && lot.allotissement && lot.allotissement.diametre != null
                ? String(lot.allotissement.diametre)
                : '';
            const regulariteState = this.getRegulariteAlertState(diametreValue);
            regulariteAlertBtn.dataset.alertRegulariteState = regulariteState;
        }

        if (stabiliteAlertBtn) {
            this.refreshStabiliteAlertButton(lot);
        }

        if (artisanaliteAlertBtn) {
            this.refreshArtisanaliteAlertButton(lot);
        }
    };

    updateDebitAlertBtns();

    if (volumetrieAlertBtn) {
        volumetrieAlertBtn.onclick = (e) => {
            e.stopPropagation();
            const alertState = volumetrieAlertBtn.dataset.alertVolumetrieState || 'none';
            this.openDebitVolumetrieAlertModal(alertState);
        };
    }

    if (regulariteAlertBtn) {
        regulariteAlertBtn.onclick = (e) => {
            e.stopPropagation();
            const alertState = regulariteAlertBtn.dataset.alertRegulariteState || 'none';
            this.openDebitRegulariteAlertModal(alertState);
        };
    }

    if (stabiliteAlertBtn) {
        stabiliteAlertBtn.onclick = (e) => {
            e.stopPropagation();
            this.refreshStabiliteAlertButton(lot);
            const alertState = stabiliteAlertBtn.dataset.alertStabiliteState || 'none';
            this.openDebitStabiliteAlertModal(alertState);
        };
    }

    if (artisanaliteAlertBtn) {
        artisanaliteAlertBtn.onclick = (e) => {
            e.stopPropagation();
            this.refreshArtisanaliteAlertButton(lot);
            const alertState = artisanaliteAlertBtn.dataset.alertArtisanaliteState || 'none';
            this.openDebitArtisanaliteAlertModal(alertState);
        };
    }

    if (!current) {
        row.classList.add('debit-row--disabled');
    } else {
        row.classList.remove('debit-row--disabled');
    }
}
}

updateProvenanceRow(row, key, lot) {
    const slider = row.querySelector('.provenance-slider');
    const levelBox = row.querySelector(`.provenance-level-box[data-display="${key}"]`);
    const intensityBox = row.querySelector(`.provenance-intensity-box[data-intensity="${key}"]`);
    const resetBtn = row.querySelector('.provenance-reset-btn');
    const infoBtn = row.querySelector('.provenance-info-small-btn');
    const confianceTitle = row.querySelector('[data-provenance-confiance-title]');

    const levelToLabel = { 1: 'Forte', 2: 'Moyenne', 3: 'Faible' };
    const levelToLabelFM = { 1: 'Fort', 2: 'Moyen', 3: 'Faible' };

    const intensityMaps = {
        confianceProv: { Forte: 3, Moyenne: 2, Faible: 1 },
        transportProv: { Fort: -3, Moyen: 1, Faible: 3 },
        reputationProv: { Forte: 3, Moyenne: 2, Faible: 1 },
        macroProv: { Forte: 3, Moyenne: 2, Faible: 1 },
        territorialiteProv: { Forte: 3, Moyenne: 2, Faible: 1 }
    };
    
    const current = lot.provenance[key];
    const useFM = key === 'transportProv';

    if (slider) {
        let val = 2;
        if (current && current.niveau) {
            const lbl = current.niveau;
            val =
                lbl === 'Forte' || lbl === 'Fort' ? 1 :
                lbl === 'Moyenne' || lbl === 'Moyen' ? 2 : 3;
        }
        slider.value = val;

        slider.oninput = (e) => {
            const v = parseInt(e.target.value, 10);
            const label = useFM ? levelToLabelFM[v] : levelToLabel[v];
            const map = intensityMaps[key] || {};
            const intensity = map[label] != null ? map[label] : null;

            lot.provenance[key] = { niveau: label, valeur: intensity };

            if (levelBox) levelBox.textContent = label;
            if (intensityBox) {
  if (intensity != null) {
    const sign = intensity > 0 ? "+" : "";
    intensityBox.textContent = sign + intensity; // juste la note
  } else {
    intensityBox.textContent = "..."; // note en attente
  }

    row.classList.remove('provenance-row--disabled');
            this.setRowNoteToneFromIntensity(row, intensityMaps[key], intensity);

            if (key === 'confianceProv' && confianceTitle) {
                if (label === 'Faible') {
                    confianceTitle.classList.add('provenance-label-confiance--low');
                } else {
                    confianceTitle.classList.remove('provenance-label-confiance--low');
                }
            }

            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
            this.renderSeuils();
            this.renderEvalOp();

        };
    }

    if (levelBox) {
        if (current && current.niveau) {
            levelBox.textContent = current.niveau;
        } else {
            levelBox.textContent = '…';
        }
    }

    if (intensityBox) {
        if (current && current.valeur != null) {
            const val = current.valeur;
            const sign = val > 0 ? "+" : "";
            intensityBox.textContent = sign + val; // juste la note
        } else {
            intensityBox.textContent = "..."; // note en attente
        }
    }

    if (resetBtn) {
        resetBtn.onclick = () => {
            lot.provenance[key] = null;
            row.classList.add('provenance-row--disabled');
            if (slider) slider.value = 2;
            if (levelBox) levelBox.textContent = '…';
            if (intensityBox) intensityBox.textContent = '...';
            this.setRowNoteTone(row, null);

            if (key === 'confianceProv' && confianceTitle) {
                confianceTitle.classList.remove('provenance-label-confiance--low');
            }

            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }

        };
    }

    if (infoBtn) {
        infoBtn.onclick = () => this.openProvenanceDetailModal(key);
    }

    if (!current) {
        row.classList.add('provenance-row--disabled');
    } else {
        row.classList.remove('provenance-row--disabled');
    }
    this.setRowNoteToneFromIntensity(row, intensityMaps[key], current && current.valeur != null ? current.valeur : null);

    if (key === 'confianceProv' && confianceTitle) {
        if (current && current.niveau === 'Faible') {
            confianceTitle.classList.add('provenance-label-confiance--low');
        } else {
            confianceTitle.classList.remove('provenance-label-confiance--low');
        }
    }
}
}
/* ---- Géométrie ---- */

renderGeo() {
    const section = document.getElementById('geoSection');
    const lotLabel = document.getElementById('geoActiveLotLabel');
    const currentLot = this.getCurrentLot();

    if (!section) return;

    if (!currentLot) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    if (!currentLot.geo) {
        currentLot.geo = {
            adaptabiliteGeo: null,
            massiviteGeo: null,
            deformationGeo: null,
            industrialiteGeo: null,
            inclusiviteGeo: null
        };
    }

    if (lotLabel) {
        const index = this.data.lots.indexOf(currentLot);
        lotLabel.textContent = index >= 0 ? 'Lot ' + (index + 1) : 'Lot …';
    }

    const fields = [
        'adaptabiliteGeo',
        'massiviteGeo',
        'deformationGeo',
        'industrialiteGeo',
        'inclusiviteGeo'
    ];

    fields.forEach((key) => {
        const row = section.querySelector(`.geo-row[data-geo-field="${key}"]`);
        if (!row) return;
        this.updateGeoRow(row, key, currentLot);
    });
}
updateGeoRow(row, key, lot) {
    const slider = row.querySelector('.geo-slider');
    const levelBox = row.querySelector(`.geo-level-box[data-display="${key}"]`);
    const intensityBox = row.querySelector(`.geo-intensity-box[data-intensity="${key}"]`);
    const resetBtn = row.querySelector('.geo-reset-btn');
    const infoBtn = row.querySelector('.geo-info-small-btn');
    const massiviteAlertBtn = key === 'massiviteGeo' ? row.querySelector('[data-geo-massivite-alert-btn]') : null;
    const industrialiteAlertBtn = key === 'industrialiteGeo' ? row.querySelector('[data-geo-industrialite-alert-btn]') : null;

    const levelToLabel = { 1: 'Forte', 2: 'Moyenne', 3: 'Faible' };

    const intensityMaps = {
        adaptabiliteGeo: { Forte: 3, Moyenne: 2, Faible: 1 },
        massiviteGeo: { Forte: 3, Moyenne: 2, Faible: 1 },
        deformationGeo: { Forte: -3, Moyenne: 1, Faible: 3 },
        industrialiteGeo: { Forte: 3, Moyenne: 2, Faible: 1 },
        inclusiviteGeo: { Forte: 3, Moyenne: 2, Faible: 1 }
    };

    const current = lot.geo[key];

    if (slider) {
        let val = 2;
        if (current && current.niveau) {
            const lbl = current.niveau;
            val = lbl === 'Forte' ? 1 : lbl === 'Moyenne' ? 2 : 3;
        }
        slider.value = val;

        slider.oninput = (e) => {
            const v = parseInt(e.target.value, 10);
            const label = levelToLabel[v];
            const map = intensityMaps[key] || {};
            const intensity = map[label] != null ? map[label] : null;

            lot.geo[key] = { niveau: label, valeur: intensity };

            if (levelBox) levelBox.textContent = label;
            if (intensityBox) {
                if (intensity != null) {
                    const sign = intensity > 0 ? "+" : "";
                    intensityBox.textContent = sign + intensity; // juste la note
                } else {
                    intensityBox.textContent = "..."; // note en attente
                }
            }

            row.classList.remove('geo-row--disabled');
            this.setRowNoteToneFromIntensity(row, intensityMaps[key], intensity);
            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
            this.renderSeuils();
            this.renderEvalOp();
            updateGeoAlertBtns();
        };
    }

    if (levelBox) {
        if (current && current.niveau) {
            levelBox.textContent = current.niveau;
        } else {
            levelBox.textContent = '…';
        }
    }

    if (intensityBox) {
        if (current && current.valeur != null) {
            const val = current.valeur;
            const sign = val > 0 ? "+" : "";
            intensityBox.textContent = sign + val; // juste la note
        } else {
            intensityBox.textContent = "..."; // note en attente
        }
    }

    if (resetBtn) {
        resetBtn.onclick = () => {
            lot.geo[key] = null;
            row.classList.add('geo-row--disabled');
            if (slider) slider.value = 2;
            if (levelBox) levelBox.textContent = '…';
            if (intensityBox) intensityBox.textContent = '...';
            this.setRowNoteTone(row, null);
            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
            updateGeoAlertBtns();

        };
    }

    if (infoBtn) {
        infoBtn.onclick = () => this.openGeoDetailModal(key);
    }

    const updateGeoAlertBtns = () => {
        if (massiviteAlertBtn) {
            const epaisseurValue = lot && lot.allotissement && lot.allotissement._avgEpaisseur != null
                ? String(lot.allotissement._avgEpaisseur)
                : (lot && lot.allotissement && lot.allotissement.epaisseur != null ? String(lot.allotissement.epaisseur) : '');
            const state = this.getMassiviteAlertState(epaisseurValue);
            massiviteAlertBtn.dataset.alertMassiviteState = state;
        }

        if (industrialiteAlertBtn) {
            this.refreshIndustrialiteAlertButton(lot);
        }
    };

    updateGeoAlertBtns();

    if (massiviteAlertBtn) {
        massiviteAlertBtn.onclick = (e) => {
            e.stopPropagation();
            const alertState = massiviteAlertBtn.dataset.alertMassiviteState || 'none';
            this.openGeoMassiviteAlertModal(alertState);
        };
    }

    if (industrialiteAlertBtn) {
        industrialiteAlertBtn.onclick = (e) => {
            e.stopPropagation();
            this.refreshIndustrialiteAlertButton(lot);
            const alertState = industrialiteAlertBtn.dataset.alertIndustrialiteState || 'none';
            this.openGeoIndustrialiteAlertModal(alertState);
        };
    }

    if (!current) {
        row.classList.add('geo-row--disabled');
    } else {
        row.classList.remove('geo-row--disabled');
    }
    this.setRowNoteToneFromIntensity(row, intensityMaps[key], current && current.valeur != null ? current.valeur : null);
}


renderEssence() {
    const section = document.getElementById('essenceSection');
    const lotLabel = document.getElementById('essenceActiveLotLabel');
    const currentLot = this.getCurrentLot();

    if (!section) return;

    if (!currentLot) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    if (!currentLot.essence) {
        currentLot.essence = {
            confianceEssence: null,
            rareteEcoEssence: null,
            masseVolEssence: null,
            rareteHistEssence: null,
            singulariteEssence: null
        };
    }

    if (lotLabel) {
        const index = this.data.lots.indexOf(currentLot);
        lotLabel.textContent = index >= 0 ? 'Lot ' + (index + 1) : 'Lot …';
    }

    const fields = [
        'confianceEssence',
        'rareteEcoEssence',
        'masseVolEssence',
        'rareteHistEssence',
        'singulariteEssence'
    ];

    fields.forEach((key) => {
        const row = section.querySelector(`.essence-row[data-essence-field="${key}"]`);
        if (!row) return;
        this.updateEssenceRow(row, key, currentLot);
    });
}
updateEssenceRow(row, key, lot) {
    const slider = row.querySelector('.essence-slider');
    const levelBox = row.querySelector(`.essence-level-box[data-display="${key}"]`);
    const intensityBox = row.querySelector(`.essence-intensity-box[data-intensity="${key}"]`);
    const resetBtn = row.querySelector('.essence-reset-btn');
    const infoBtn = row.querySelector('.essence-info-small-btn');
    const confianceTitle = row.querySelector('[data-essence-confiance-title]');

    const levelToLabel = { 1: 'Forte', 2: 'Moyenne', 3: 'Faible' };

    const intensityMaps = {
        confianceEssence: { Forte: 3, Moyenne: 2, Faible: 1 },
        rareteEcoEssence: { Forte: 3, Moyenne: 2, Faible: 1 },
        masseVolEssence: { Forte: 3, Moyenne: 2, Faible: 1 },
        rareteHistEssence: { Forte: 3, Moyenne: 2, Faible: 1 },
        singulariteEssence: { Forte: 3, Moyenne: 2, Faible: 1 }
    };

    const current = lot.essence[key];

    if (slider) {
        let val = 2;
        if (current && current.niveau) {
            const lbl = current.niveau;
            val = lbl === 'Forte' ? 1 : lbl === 'Moyenne' ? 2 : 3;
        }
        slider.value = val;

        slider.oninput = (e) => {
            const v = parseInt(e.target.value, 10);
            const label = levelToLabel[v];
            const map = intensityMaps[key] || {};
            const intensity = map[label] != null ? map[label] : null;

            lot.essence[key] = { niveau: label, valeur: intensity };

            if (levelBox) levelBox.textContent = label;
            if (intensityBox) {
                if (intensity != null) {
                    const sign = intensity > 0 ? "+" : "";
                    intensityBox.textContent = sign + intensity; // juste la note
                } else {
                    intensityBox.textContent = "..."; // note en attente
                }
            }

            row.classList.remove('essence-row--disabled');
            this.setRowNoteToneFromIntensity(row, intensityMaps[key], intensity);

            if (key === 'confianceEssence' && confianceTitle) {
                if (label === 'Faible') {
                    confianceTitle.classList.add('essence-label-confiance--low');
                } else {
                    confianceTitle.classList.remove('essence-label-confiance--low');
                }
            }

            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
            this.renderSeuils();
            this.renderEvalOp();
        };
    }

    if (levelBox) {
        if (current && current.niveau) {
            levelBox.textContent = current.niveau;
        } else {
            levelBox.textContent = '…';
        }
    }

    if (intensityBox) {
        if (current && current.valeur != null) {
            const val = current.valeur;
            const sign = val > 0 ? "+" : "";
            intensityBox.textContent = sign + val; // juste la note
        } else {
            intensityBox.textContent = "..."; // note en attente
        }
    }

    if (resetBtn) {
        resetBtn.onclick = () => {
            lot.essence[key] = null;
            row.classList.add('essence-row--disabled');
            if (slider) slider.value = 2;
            if (levelBox) levelBox.textContent = '…';
            if (intensityBox) intensityBox.textContent = '...';
            this.setRowNoteTone(row, null);

            if (key === 'confianceEssence' && confianceTitle) {
                confianceTitle.classList.remove('essence-label-confiance--low');
            }

            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }

        };
    }

    if (infoBtn) {
        infoBtn.onclick = () => this.openEssenceDetailModal(key);
    }

    if (!current) {
        row.classList.add('essence-row--disabled');
    } else {
        row.classList.remove('essence-row--disabled');
    }
    this.setRowNoteToneFromIntensity(row, intensityMaps[key], current && current.valeur != null ? current.valeur : null);

    if (key === 'confianceEssence' && confianceTitle) {
        if (current && current.niveau === 'Faible') {
            confianceTitle.classList.add('essence-label-confiance--low');
        } else {
            confianceTitle.classList.remove('essence-label-confiance--low');
        }
    }
}

renderAncien() {
    const section = document.getElementById('ancienSection');
    const lotLabel = document.getElementById('ancienActiveLotLabel');
    const currentLot = this.getCurrentLot();

    if (!section) return;

    if (!currentLot) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    if (!currentLot.ancien) {
        currentLot.ancien = {
            confianceAncien: null,
            amortissementAncien: null,
            vieillissementAncien: null,
            microhistoireAncien: null,
            demontabiliteAncien: null
        };
    }

    if (lotLabel) {
        const index = this.data.lots.indexOf(currentLot);
        lotLabel.textContent = index >= 0 ? 'Lot ' + (index + 1) : 'Lot …';
    }

    const fields = [
        'confianceAncien',
        'amortissementAncien',
        'vieillissementAncien',
        'microhistoireAncien',
        'demontabiliteAncien'
    ];

    fields.forEach((key) => {
        const row = section.querySelector(`.ancien-row[data-ancien-field="${key}"]`);
        if (!row) return;
        this.updateAncienRow(row, key, currentLot);
    });
}
updateAncienRow(row, key, lot) {
    const slider = row.querySelector('.ancien-slider');
    const levelBox = row.querySelector(`.ancien-level-box[data-display="${key}"]`);
    const intensityBox = row.querySelector(`.ancien-intensity-box[data-intensity="${key}"]`);
    const resetBtn = row.querySelector('.ancien-reset-btn');
    const infoBtn = row.querySelector('.ancien-info-small-btn');
    const alertBtn = key === 'amortissementAncien' ? row.querySelector('[data-ancien-amortissement-alert-btn]') : null;

    const levelToLabel = { 1: 'Forte', 2: 'Moyenne', 3: 'Faible' };
    const levelToLabelFM = { 1: 'Fort', 2: 'Moyen', 3: 'Faible' };

    const intensityMaps = {
        confianceAncien: { Forte: 3, Moyenne: 2, Faible: 1 },
        amortissementAncien: { Fort: 3, Moyen: 1, Faible: -3 },
        vieillissementAncien: { Fort: -3, Moyen: 1, Faible: 3 },
        microhistoireAncien: { Forte: 3, Moyenne: 2, Faible: 1 },
        demontabiliteAncien: { Forte: 3, Moyenne: 2, Faible: -3 }
    };

    const current = lot.ancien[key];
    const useFM = key === 'amortissementAncien';

    if (slider) {
        let val = 2;
        if (current && current.niveau) {
            const lbl = current.niveau;
            val = (lbl === 'Forte' || lbl === 'Fort') ? 1 :
                  (lbl === 'Moyenne' || lbl === 'Moyen') ? 2 : 3;
        }
        slider.value = val;

        slider.oninput = (e) => {
            const v = parseInt(e.target.value, 10);
            const label = useFM ? levelToLabelFM[v] : levelToLabel[v];
            const map = intensityMaps[key] || {};
            const intensity = map[label] != null ? map[label] : null;

            lot.ancien[key] = { niveau: label, valeur: intensity };

            if (levelBox) levelBox.textContent = label;
            if (intensityBox) {
                if (intensity != null) {
                    const sign = intensity > 0 ? "+" : "";
                    intensityBox.textContent = sign + intensity; // juste la note
                } else {
                    intensityBox.textContent = "..."; // note en attente
                }
            }

            row.classList.remove('ancien-row--disabled');
            this.setRowNoteToneFromIntensity(row, intensityMaps[key], intensity);
            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
            this.renderSeuils();
            this.renderEvalOp();
            updateAmortAlertBtn(); // MÀJ couleur alerte Amortissement
        };
    }

    if (levelBox) {
        if (current && current.niveau) {
            levelBox.textContent = current.niveau;
        } else {
            levelBox.textContent = '…';
        }
    }

    if (intensityBox) {
        if (current && current.valeur != null) {
            const val = current.valeur;
            const sign = val > 0 ? "+" : "";
            intensityBox.textContent = sign + val; // juste la note
        } else {
            intensityBox.textContent = "..."; // note en attente
        }
    }

    if (resetBtn) {
        resetBtn.onclick = () => {
            lot.ancien[key] = null;
            row.classList.add('ancien-row--disabled');
            if (slider) slider.value = 2;
            if (levelBox) levelBox.textContent = '…';
            if (intensityBox) intensityBox.textContent = '...';
            this.setRowNoteTone(row, null);
            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
            updateAmortAlertBtn(); // MÀJ couleur alerte Amortissement
        };
    }

    if (infoBtn) {
        infoBtn.onclick = () => this.openAncienDetailModal(key);
    }

    // Gestion du bouton alerte Amortissement biologique (seulement pour amortissementAncien)
    const updateAmortAlertBtn = () => {
        if (!alertBtn) return;
        const amortValue = this.computeAmortissementBiologique(
            lot.allotissement && lot.allotissement._avgAgeArbre != null ? String(lot.allotissement._avgAgeArbre) : '',
            lot.allotissement && lot.allotissement._avgServiceYear != null ? String(lot.allotissement._avgServiceYear) : ''
        );
        const state = this.getAmortissementAlertState(amortValue);
        alertBtn.dataset.alertAmortissementState = state;
    };

    if (alertBtn) {
        // Appel initial pour mettre à jour l'état du bouton
        updateAmortAlertBtn();
        
        // Gestionnaire de clic pour ouvrir la modale d'alerte personnalisee
        alertBtn.onclick = (e) => {
            e.stopPropagation();
            const alertState = alertBtn.dataset.alertAmortissementState || 'none';
            this.openAncienAmortissementAlertModal(alertState);
        };
    }

    if (!current) {
        row.classList.add('ancien-row--disabled');
    } else {
        row.classList.remove('ancien-row--disabled');
    }
    this.setRowNoteToneFromIntensity(row, intensityMaps[key], current && current.valeur != null ? current.valeur : null);
}

    /* ---- Traces ---- */

renderTraces() {
    const section = document.getElementById('tracesSection');
    const lotLabel = document.getElementById('tracesActiveLotLabel');
    const currentLot = this.getCurrentLot();

    if (!section) return;

    if (!currentLot) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    if (!currentLot.traces) {
        currentLot.traces = {
            confianceTraces: null,
            etiquetageTraces: null,
            alterationTraces: null,
            documentationTraces: null,
            singularitesTraces: null
        };
    }

    if (lotLabel) {
        const index = this.data.lots.indexOf(currentLot);
        lotLabel.textContent = index >= 0 ? 'Lot ' + (index + 1) : 'Lot …';
    }

    const fields = [
        'confianceTraces',
        'etiquetageTraces',
        'alterationTraces',
        'documentationTraces',
        'singularitesTraces'
    ];

    fields.forEach((key) => {
        const row = section.querySelector(`.traces-row[data-traces-field="${key}"]`);
        if (!row) return;
        this.updateTracesRow(row, key, currentLot);
    });
}
updateTracesRow(row, key, lot) {
    const slider = row.querySelector('.traces-slider');
    const levelBox = row.querySelector(`.traces-level-box[data-display="${key}"]`);
    const intensityBox = row.querySelector(`.traces-intensity-box[data-intensity="${key}"]`);
    const resetBtn = row.querySelector('.traces-reset-btn');
    const infoBtn = row.querySelector('.traces-info-small-btn');
    const confianceTitle = row.querySelector('[data-traces-confiance-title]');

    const levelToLabel = { 1: 'Forte', 2: 'Moyenne', 3: 'Faible' };
    const levelToLabelPlural = { 1: 'Fortes', 2: 'Moyennes', 3: 'Faibles' };

    const intensityMaps = {
        confianceTraces: { Forte: 3, Moyenne: 2, Faible: 1 },
        etiquetageTraces: { Fort: 3, Moyen: 2, Faible: 1 },
        alterationTraces: { Forte: -10, Moyenne: 1, Faible: 3 },
        documentationTraces: { Forte: 3, Moyenne: 1, Faible: -3 },
        singularitesTraces: { Fortes: 3, Moyennes: 2, Faibles: 1 }
    };

    const current = lot.traces[key];

    const useFM = key === 'etiquetageTraces';
    const usePlural = key === 'singularitesTraces';

    if (slider) {
        let val = 2;
        if (current && current.niveau) {
            const lbl = current.niveau;
            val =
                lbl === 'Forte' || lbl === 'Fort' || lbl === 'Fortes' ? 1 :
                lbl === 'Moyenne' || lbl === 'Moyen' || lbl === 'Moyennes' ? 2 :
                3;
        }
        slider.value = val;

        slider.oninput = (e) => {
            const v = parseInt(e.target.value, 10);
            let label;
            if (usePlural) {
                label = levelToLabelPlural[v];
            } else if (useFM) {
                label = v === 1 ? 'Fort' : v === 2 ? 'Moyen' : 'Faible';
            } else {
                label = levelToLabel[v];
            }

            const map = intensityMaps[key] || {};
            const intensity = map[label] != null ? map[label] : null;

            lot.traces[key] = { niveau: label, valeur: intensity };

            if (levelBox) levelBox.textContent = label;
            if (intensityBox) {
                if (intensity != null) {
                    const sign = intensity > 0 ? "+" : "";
                    intensityBox.textContent = sign + intensity; // juste la note
                } else {
                    intensityBox.textContent = "..."; // note en attente
                }
            }

            row.classList.remove('traces-row--disabled');
            this.setRowNoteToneFromIntensity(row, intensityMaps[key], intensity);

            if (key === 'confianceTraces' && confianceTitle) {
                if (label === 'Faible') {
                    confianceTitle.classList.add('traces-label-confiance--low');
                } else {
                    confianceTitle.classList.remove('traces-label-confiance--low');
                }
            }

            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }
            this.renderSeuils();
            this.renderEvalOp();

        };
    }

    if (levelBox) {
        if (current && current.niveau) {
            levelBox.textContent = current.niveau;
        } else {
            levelBox.textContent = '…';
        }
    }

    if (intensityBox) {
        if (current && current.valeur != null) {
            const val = current.valeur;
            const sign = val > 0 ? "+" : "";
            intensityBox.textContent = sign + val; // juste la note
        } else {
            intensityBox.textContent = "..."; // note en attente
        }
    }

    if (resetBtn) {
        resetBtn.onclick = () => {
            lot.traces[key] = null;
            row.classList.add('traces-row--disabled');
            if (slider) slider.value = 2;
            if (levelBox) levelBox.textContent = '…';
            if (intensityBox) intensityBox.textContent = '...';
            this.setRowNoteTone(row, null);

            if (key === 'confianceTraces' && confianceTitle) {
                confianceTitle.classList.remove('traces-label-confiance--low');
            }

            this.saveData();
            const activeLot = this.getCurrentLot(); // On récupère le lot actuel
            if (activeLot) {
                this.computeOrientation(activeLot);
            }

        };
    }

    if (infoBtn) {
        infoBtn.onclick = () => this.openTracesDetailModal(key);
    }

    if (!current) {
        row.classList.add('traces-row--disabled');
    } else {
        row.classList.remove('traces-row--disabled');
    }
    this.setRowNoteToneFromIntensity(row, intensityMaps[key], current && current.valeur != null ? current.valeur : null);

    if (key === 'confianceTraces' && confianceTitle) {
        if (current && current.niveau === 'Faible') {
            confianceTitle.classList.add('traces-label-confiance--low');
        } else {
            confianceTitle.classList.remove('traces-label-confiance--low');
        }
    }
}

renderProvenance() {
    const section = document.getElementById('provenanceSection');
    const lotLabel = document.getElementById('provenanceActiveLotLabel');
    const currentLot = this.getCurrentLot();

    if (!section) return;

    if (!currentLot) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    if (!currentLot.provenance) {
        currentLot.provenance = {
            confianceProv: null,
            transportProv: null,
            reputationProv: null,
            macroProv: null,
            territorialiteProv: null
        };
    }

    if (lotLabel) {
        const index = this.data.lots.indexOf(currentLot);
        lotLabel.textContent = index >= 0 ? 'Lot ' + (index + 1) : 'Lot …';
    }

    const fields = [
        'confianceProv',
        'transportProv',
        'reputationProv',
        'macroProv',
        'territorialiteProv'
    ];

    fields.forEach((key) => {
        const row = section.querySelector(`.provenance-row[data-provenance-field="${key}"]`);
        if (!row) return;
        this.updateProvenanceRow(row, key, currentLot);
    });
}

    /* ---- Calculs valeurs + Seuils ---- */

getRawValueScoresForLot(lot) {
    const totals = { economique: 0, ecologique: 0, mecanique: 0, historique: 0, esthetique: 0 };
    if (!lot) return totals;

    const getVal = (entry) => {
        if (!entry) return 0;
        if (typeof entry === 'number') return entry;
        if (typeof entry === 'object') return parseFloat(entry.valeur) || 0;
        return 0;
    };

    const mapping = [
        ['bio',        'purge',               'economique'],
        ['bio',        'expansion',           'ecologique'],
        ['bio',        'integriteBio',        'mecanique'],
        ['bio',        'exposition',          'historique'],
        ['bio',        'confianceBio',        'esthetique'],

        ['mech',       'purgeMech',           'economique'],
        ['mech',       'feuMech',             'ecologique'],
        ['mech',       'integriteMech',       'mecanique'],
        ['mech',       'expositionMech',      'historique'],
        ['mech',       'confianceMech',       'esthetique'],

        ['usage',      'confianceUsage',      'economique'],
        ['usage',      'durabiliteUsage',     'ecologique'],
        ['usage',      'classementUsage',     'mecanique'],
        ['usage',      'humiditeUsage',       'historique'],
        ['usage',      'aspectUsage',         'esthetique'],

        ['denat',      'depollutionDenat',    'economique'],
        ['denat',      'contaminationDenat',  'ecologique'],
        ['denat',      'durabiliteConfDenat', 'mecanique'],
        ['denat',      'confianceDenat',      'historique'],
        ['denat',      'naturaliteDenat',     'esthetique'],

        ['debit',      'regulariteDebit',     'economique'],
        ['debit',      'volumetrieDebit',     'ecologique'],
        ['debit',      'stabiliteDebit',      'mecanique'],
        ['debit',      'artisanaliteDebit',   'historique'],
        ['debit',      'rusticiteDebit',      'esthetique'],

        ['geo',        'adaptabiliteGeo',     'economique'],
        ['geo',        'massiviteGeo',        'ecologique'],
        ['geo',        'deformationGeo',      'mecanique'],
        ['geo',        'industrialiteGeo',    'historique'],
        ['geo',        'inclusiviteGeo',      'esthetique'],

        ['essence',    'confianceEssence',    'economique'],
        ['essence',    'rareteEcoEssence',    'ecologique'],
        ['essence',    'masseVolEssence',     'mecanique'],
        ['essence',    'rareteHistEssence',   'historique'],
        ['essence',    'singulariteEssence',  'esthetique'],

        ['ancien',     'confianceAncien',     'economique'],
        ['ancien',     'amortissementAncien', 'ecologique'],
        ['ancien',     'vieillissementAncien','mecanique'],
        ['ancien',     'microhistoireAncien', 'historique'],
        ['ancien',     'demontabiliteAncien', 'esthetique'],

        ['traces',     'confianceTraces',     'economique'],
        ['traces',     'etiquetageTraces',    'ecologique'],
        ['traces',     'alterationTraces',    'mecanique'],
        ['traces',     'documentationTraces', 'historique'],
        ['traces',     'singularitesTraces',  'esthetique'],

        ['provenance', 'confianceProv',       'economique'],
        ['provenance', 'transportProv',       'ecologique'],
        ['provenance', 'reputationProv',      'mecanique'],
        ['provenance', 'macroProv',           'historique'],
        ['provenance', 'territorialiteProv',  'esthetique']
    ];

    mapping.forEach(([section, field, category]) => {
        const sectionData = lot[section];
        if (!sectionData) return;
        totals[category] += getVal(sectionData[field]);
    });

    // Compatibilité avec un ancien format basé sur lot.criteres
    if (Array.isArray(lot.criteres)) {
        lot.criteres.forEach((c) => {
            const note = parseFloat(c && c.note) || 0;
            const category = c && c.valeur;
            if (Object.prototype.hasOwnProperty.call(totals, category)) {
                totals[category] += note;
            }
        });
    }

    return totals;
}

getValueScoresForLot(lot) {
    const totals = this.getRawValueScoresForLot(lot);
    Object.keys(totals).forEach((k) => {
        if (totals[k] < 0) totals[k] = 0;
    });
    return totals;
}  

getOrientationThresholdConfig() {
    const translate = (key, fallback) => {
        if (typeof t === 'function') {
            const translated = t(key);
            if (translated && translated !== key) return translated;
        }
        return fallback;
    };

    return [
        {
            code: 'combustion',
            orientationLabel: 'Combustion',
            minPercent: 0,
            radarValue: 30,
            radarLabel: translate('editor.radar.thresholdIncinerable', 'Incinérable'),
            color: '#D55E00'
        },
        {
            code: 'recyclage',
            orientationLabel: 'Recyclage',
            minPercent: 30,
            radarValue: 50,
            radarLabel: translate('editor.radar.thresholdRecyclable', 'Recyclable'),
            color: '#E69F00'
        },
        {
            code: 'reutilisation',
            orientationLabel: 'Réutilisation',
            minPercent: 50,
            radarValue: 70,
            radarLabel: translate('editor.radar.thresholdReutilisable', 'Réutilisable'),
            color: '#56B4E9'
        },
        {
            code: 'reemploi',
            orientationLabel: 'Réemploi',
            minPercent: 70,
            radarValue: 100,
            radarLabel: translate('editor.radar.thresholdReemployable', 'Réemployable'),
            color: '#009E73'
        }
    ];
}

getOrientationThresholdForPercent(percent) {
    const thresholds = this.getOrientationThresholdConfig();
    const safePercent = Number.isFinite(percent) ? percent : 0;
    let activeThreshold = thresholds[0];

    thresholds.forEach((threshold) => {
        if (safePercent >= threshold.minPercent) {
            activeThreshold = threshold;
        }
    });

    return activeThreshold;
}

hasAnyNotationForLot(lot) {
    if (!lot) return false;

    const mapping = [
        ['bio',        'purge'],
        ['bio',        'expansion'],
        ['bio',        'integriteBio'],
        ['bio',        'exposition'],
        ['bio',        'confianceBio'],

        ['mech',       'purgeMech'],
        ['mech',       'feuMech'],
        ['mech',       'integriteMech'],
        ['mech',       'expositionMech'],
        ['mech',       'confianceMech'],

        ['usage',      'confianceUsage'],
        ['usage',      'durabiliteUsage'],
        ['usage',      'classementUsage'],
        ['usage',      'humiditeUsage'],
        ['usage',      'aspectUsage'],

        ['denat',      'depollutionDenat'],
        ['denat',      'contaminationDenat'],
        ['denat',      'durabiliteConfDenat'],
        ['denat',      'confianceDenat'],
        ['denat',      'naturaliteDenat'],

        ['debit',      'regulariteDebit'],
        ['debit',      'volumetrieDebit'],
        ['debit',      'stabiliteDebit'],
        ['debit',      'artisanaliteDebit'],
        ['debit',      'rusticiteDebit'],

        ['geo',        'adaptabiliteGeo'],
        ['geo',        'massiviteGeo'],
        ['geo',        'deformationGeo'],
        ['geo',        'industrialiteGeo'],
        ['geo',        'inclusiviteGeo'],

        ['essence',    'confianceEssence'],
        ['essence',    'rareteEcoEssence'],
        ['essence',    'masseVolEssence'],
        ['essence',    'rareteHistEssence'],
        ['essence',    'singulariteEssence'],

        ['ancien',     'confianceAncien'],
        ['ancien',     'amortissementAncien'],
        ['ancien',     'vieillissementAncien'],
        ['ancien',     'microhistoireAncien'],
        ['ancien',     'demontabiliteAncien'],

        ['traces',     'confianceTraces'],
        ['traces',     'etiquetageTraces'],
        ['traces',     'alterationTraces'],
        ['traces',     'documentationTraces'],
        ['traces',     'singularitesTraces'],

        ['provenance', 'confianceProv'],
        ['provenance', 'transportProv'],
        ['provenance', 'reputationProv'],
        ['provenance', 'macroProv'],
        ['provenance', 'territorialiteProv']
    ];

    for (const [section, field] of mapping) {
        const sectionData = lot[section];
        if (!sectionData) continue;
        const entry = sectionData[field];
        if (!entry) continue;

        if (typeof entry === 'number') return true;
        if (typeof entry === 'object' && entry.valeur != null) return true;
    }

    if (Array.isArray(lot.criteres) && lot.criteres.length > 0) return true;
    return false;
}

hasNotationForCategory(lot, category) {
    if (!lot) return false;

    const mapping = [
        ['bio',        'purge',               'economique'],
        ['bio',        'expansion',           'ecologique'],
        ['bio',        'integriteBio',        'mecanique'],
        ['bio',        'exposition',          'historique'],
        ['bio',        'confianceBio',        'esthetique'],

        ['mech',       'purgeMech',           'economique'],
        ['mech',       'feuMech',             'ecologique'],
        ['mech',       'integriteMech',       'mecanique'],
        ['mech',       'expositionMech',      'historique'],
        ['mech',       'confianceMech',       'esthetique'],

        ['usage',      'confianceUsage',      'economique'],
        ['usage',      'durabiliteUsage',     'ecologique'],
        ['usage',      'classementUsage',     'mecanique'],
        ['usage',      'humiditeUsage',       'historique'],
        ['usage',      'aspectUsage',         'esthetique'],

        ['denat',      'depollutionDenat',    'economique'],
        ['denat',      'contaminationDenat',  'ecologique'],
        ['denat',      'durabiliteConfDenat', 'mecanique'],
        ['denat',      'confianceDenat',      'historique'],
        ['denat',      'naturaliteDenat',     'esthetique'],

        ['debit',      'regulariteDebit',     'economique'],
        ['debit',      'volumetrieDebit',     'ecologique'],
        ['debit',      'stabiliteDebit',      'mecanique'],
        ['debit',      'artisanaliteDebit',   'historique'],
        ['debit',      'rusticiteDebit',      'esthetique'],

        ['geo',        'adaptabiliteGeo',     'economique'],
        ['geo',        'massiviteGeo',        'ecologique'],
        ['geo',        'deformationGeo',      'mecanique'],
        ['geo',        'industrialiteGeo',    'historique'],
        ['geo',        'inclusiviteGeo',      'esthetique'],

        ['essence',    'confianceEssence',    'economique'],
        ['essence',    'rareteEcoEssence',    'ecologique'],
        ['essence',    'masseVolEssence',     'mecanique'],
        ['essence',    'rareteHistEssence',   'historique'],
        ['essence',    'singulariteEssence',  'esthetique'],

        ['ancien',     'confianceAncien',     'economique'],
        ['ancien',     'amortissementAncien', 'ecologique'],
        ['ancien',     'vieillissementAncien','mecanique'],
        ['ancien',     'microhistoireAncien', 'historique'],
        ['ancien',     'demontabiliteAncien', 'esthetique'],

        ['traces',     'confianceTraces',     'economique'],
        ['traces',     'etiquetageTraces',    'ecologique'],
        ['traces',     'alterationTraces',    'mecanique'],
        ['traces',     'documentationTraces', 'historique'],
        ['traces',     'singularitesTraces',  'esthetique'],

        ['provenance', 'confianceProv',       'economique'],
        ['provenance', 'transportProv',       'ecologique'],
        ['provenance', 'reputationProv',      'mecanique'],
        ['provenance', 'macroProv',           'historique'],
        ['provenance', 'territorialiteProv',  'esthetique']
    ];

    for (const [section, field, mappedCategory] of mapping) {
        if (mappedCategory !== category) continue;
        const entry = lot[section] && lot[section][field];
        if (!entry) continue;
        if (typeof entry === 'number') return true;
        if (typeof entry === 'object' && entry.valeur != null) return true;
    }

    if (Array.isArray(lot.criteres)) {
        for (const critere of lot.criteres) {
            const value = parseFloat(critere && critere.note);
            if (critere && critere.valeur === category && !Number.isNaN(value)) {
                return true;
            }
        }
    }

    return false;
}

renderSeuils() {
    const lot = this.getCurrentLot();
    if (!lot) return; // Sécurité si aucun lot
    const thresholdConfig = this.getOrientationThresholdConfig();
    const defaultThreshold = thresholdConfig[0];

    const seuilsLotLabel = document.getElementById('seuilsActiveLotLabel');
    const lots = this.data.lots || [];
    const lotIndex = lots.indexOf(lot);
    if (seuilsLotLabel) {
        const defaultName = lotIndex >= 0 ? 'Lot ' + (lotIndex + 1) : 'Lot …';
        const lotName = (lot.nom || '').trim();
        seuilsLotLabel.textContent = lotName ? lotName : defaultName;
    }
    
    const rawScores = this.getRawValueScoresForLot(lot);
    const scores = this.getValueScoresForLot(lot);
    const hasNotation = this.hasAnyNotationForLot(lot);
    const root = document.getElementById('seuils-section');
    if (!root) return;

    const categories = [
        { key: 'economique', label: 'Économique' },
        { key: 'ecologique', label: 'Écologique' },
        { key: 'mecanique', label: 'Mécanique' },
        { key: 'historique', label: 'Historique' },
        { key: 'esthetique', label: 'Esthétique' }
    ];

    categories.forEach(cat => {
        const rawScore = rawScores[cat.key] || 0;
        const score = scores[cat.key] || 0;
        const hasCategoryNotation = this.hasNotationForCategory(lot, cat.key);
        const isAlertState = hasCategoryNotation && rawScore <= 0;
        // Le score max est de 30 (10 critères x 3 points max)
        const percent = Math.min(100, Math.round((score / 30) * 100));
        
        // Mise à jour du pourcentage
        const pctEl = root.querySelector(`[data-seuils-percent="${cat.key}"]`);
        if (pctEl) pctEl.textContent = hasNotation ? `${percent}%` : "…";

        // Mise à jour du score numérique
        const scoreEl = root.querySelector(`[data-seuils-score="${cat.key}"]`);
        if (scoreEl) scoreEl.textContent = hasNotation ? `${score} / 30` : "…";

        // Mise à jour de la jauge canvas
        const gauge = root.querySelector(`[data-seuils-gauge="${cat.key}"]`);
        if (gauge && gauge.getContext) {
            const rect = gauge.getBoundingClientRect();
            const width = Math.max(1, Math.floor(rect.width || gauge.clientWidth || 28));
            const height = Math.max(1, Math.floor(rect.height || gauge.clientHeight || 132));
            if (gauge.width !== width) gauge.width = width;
            if (gauge.height !== height) gauge.height = height;

            const ctx = gauge.getContext('2d');
            if (!ctx) return;

            let track = isAlertState ? defaultThreshold.color : "#E6E6E6";
            let fill = "#E6E6E6";
            if (score > 0) {
                fill = this.getOrientationThresholdForPercent(percent).color;
            }

            const barWidth = Math.max(10, Math.min(18, Math.round(width * 0.7)));
            const barX = Math.round((width - barWidth) / 2);
            const radius = Math.min(barWidth / 2, 8);
            const filledHeight = Math.max(0, Math.min(height, Math.round((percent / 100) * height)));

            const roundedRect = (x, y, w, h, r) => {
                const rr = Math.min(r, w / 2, h / 2);
                ctx.beginPath();
                ctx.moveTo(x + rr, y);
                ctx.arcTo(x + w, y, x + w, y + h, rr);
                ctx.arcTo(x + w, y + h, x, y + h, rr);
                ctx.arcTo(x, y + h, x, y, rr);
                ctx.arcTo(x, y, x + w, y, rr);
                ctx.closePath();
            };

            ctx.clearRect(0, 0, width, height);

            ctx.fillStyle = track;
            roundedRect(barX, 0, barWidth, height, radius);
            ctx.fill();

            if (filledHeight > 0) {
                ctx.fillStyle = fill;
                roundedRect(barX, height - filledHeight, barWidth, filledHeight, radius);
                ctx.fill();
            }
        }
    });
}

  /* ---- Radar ---- */

renderRadar() {
    const lot = this.getCurrentLot();
    if (!lot) return;
    const thresholdLevels = this.getOrientationThresholdConfig().map((threshold) => ({
        value: threshold.radarValue,
        label: threshold.radarLabel,
        color: threshold.color
    }));
    const thresholdValues = thresholdLevels.map((threshold) => threshold.value);

    const radarLotLabel = document.getElementById('radarActiveLotLabel');
    const lots = this.data.lots || [];
    const lotIndex = lots.indexOf(lot);
    if (radarLotLabel) {
        const defaultName = lotIndex >= 0 ? 'Lot ' + (lotIndex + 1) : 'Lot …';
        const lotName = (lot.nom || '').trim();
        radarLotLabel.textContent = lotName ? lotName : defaultName;
    }

    const scores = this.getValueScoresForLot(lot);
    const labels = ['Économique', 'Écologique', 'Mécanique', 'Historique', 'Esthétique'];
    const toPercent = (score) => Math.min(100, Math.max(0, Math.round((score / 30) * 100)));
    const data = [
        toPercent(scores.economique || 0),
        toPercent(scores.ecologique || 0),
        toPercent(scores.mecanique || 0),
        toPercent(scores.historique || 0),
        toPercent(scores.esthetique || 0)
        ];    

    const canvas = document.getElementById('radarChart') || document.getElementById('radarChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const thresholdBandsPlugin = {
        id: 'radarThresholdBands',
        afterDraw(chart, args, pluginOptions) {
            const radialScale = chart.scales && chart.scales.r;
            const levels = pluginOptions && Array.isArray(pluginOptions.levels) ? pluginOptions.levels : [];
            if (!radialScale || !levels.length) return;

            const chartContext = chart.ctx;
            const axisCount = Array.isArray(chart.data && chart.data.labels) ? chart.data.labels.length : 0;
            if (!axisCount) return;
            const startPoint = radialScale.getPointPositionForValue(0, 100);
            const endPoint = radialScale.getPointPositionForValue(1, 100);
            const segmentAngle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);

            chartContext.save();
            chartContext.font = '600 12px sans-serif';
            chartContext.textAlign = 'center';
            chartContext.textBaseline = 'bottom';

            // Dessine explicitement chaque anneau de seuil pour garantir la visibilité du palier 30.
            levels.forEach((level) => {
                chartContext.save();
                chartContext.strokeStyle = 'rgba(0, 0, 0, 0.22)';
                chartContext.lineWidth = level.value === 30 ? 1.3 : 1;
                chartContext.beginPath();

                for (let i = 0; i < axisCount; i += 1) {
                    const point = radialScale.getPointPositionForValue(i, level.value);
                    if (i === 0) chartContext.moveTo(point.x, point.y);
                    else chartContext.lineTo(point.x, point.y);
                }

                chartContext.closePath();
                chartContext.stroke();
                chartContext.restore();
            });

            levels.forEach((level) => {
                const firstPoint = radialScale.getPointPositionForValue(0, level.value);
                const secondPoint = radialScale.getPointPositionForValue(1, level.value);
                const midX = (firstPoint.x + secondPoint.x) / 2;
                const midY = (firstPoint.y + secondPoint.y) / 2;
                const segmentLength = Math.hypot(secondPoint.x - firstPoint.x, secondPoint.y - firstPoint.y);
                const guideLength = Math.max(10, Math.min(28, segmentLength - 4));
                const guideHalf = guideLength / 2;

                chartContext.save();
                chartContext.translate(midX, midY);
                chartContext.rotate(segmentAngle);
                chartContext.globalAlpha = 0.5;
                chartContext.strokeStyle = level.color;
                chartContext.lineWidth = 1;
                chartContext.beginPath();
                chartContext.moveTo(-guideHalf, 0);
                chartContext.lineTo(guideHalf, 0);
                chartContext.stroke();
                chartContext.fillStyle = level.color;
                chartContext.fillText(level.label, 0, -2);
                chartContext.restore();
            });

            chartContext.restore();
        }
    };

    if (!this.radarChart) {
            this.radarChart = new Chart(ctx, {
            plugins: [thresholdBandsPlugin],
            type: 'radar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Valeurs du lot',
                        data,
                        backgroundColor: 'rgba(0, 0, 0, 0.15)',
                        borderColor: '#000000',
                        borderWidth: 1,
                        pointBackgroundColor: '#000000'
                    }
                ]
            },
                options: {
                    responsive: true,
                    scales: {
                        r: {
                            min: 0,
                            max: 100,
                            afterBuildTicks(scale) {
                                scale.ticks = thresholdValues.map((value) => ({ value }));
                            },
                            ticks: {
                                display: false
                            },
                            grid: {
                                color: 'rgba(0,0,0,0.15)'
                            },
                            angleLines: {
                                color: 'rgba(0,0,0,0.15)'
                            }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false },
                        radarThresholdBands: {
                            levels: thresholdLevels
                        }
                    }
                }
            });
        } else {
            this.radarChart.data.datasets[0].data = data;
            this.radarChart.options.plugins.radarThresholdBands.levels = thresholdLevels;
            this.radarChart.update();
        }

        const bodyText = document.getElementById('radarBodyText');
        if (bodyText) {
            const avg =
                data.reduce((acc, v) => acc + v, 0) / (data.length || 1);
            let synth = 'Profil non renseigné.';
            if (avg > 0 && avg <= 33) synth = 'Profil globalement faible.';
            else if (avg > 33 && avg <= 66) synth = 'Profil globalement moyen.';
            else if (avg > 66) synth = 'Profil globalement fort.';
            bodyText.textContent = synth;
        }
    }

    renderScatterDims() {
        const section = document.getElementById('scatterDimsSection');
        const lotLabel = document.getElementById('scatterDimsActiveLotLabel');
        const canvas = document.getElementById('scatterDimsChart');
        const wrapper = section ? section.querySelector('.scatter-dims-canvas-wrapper') : null;
        const scale = document.getElementById('scatterDimsScale');
        const scaleTitle = document.getElementById('scatterDimsScaleTitle');
        const scaleBar = document.getElementById('scatterDimsScaleBar');
        const scaleMin = document.getElementById('scatterDimsScaleMin');
        const scaleMax = document.getElementById('scatterDimsScaleMax');
        const emptyEl = document.getElementById('scatterDimsEmpty');

        if (!section) return;

        const lot = this.getCurrentLot();
        if (!lot) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';

        const lots = this.data.lots || [];
        const lotIndex = lots.indexOf(lot);
        if (lotLabel) {
            const defaultName = lotIndex >= 0 ? 'Lot ' + (lotIndex + 1) : 'Lot …';
            const lotName = (lot.nom || '').trim();
            lotLabel.textContent = lotName ? lotName : defaultName;
        }

        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const tr = (key, fallback) => {
            if (typeof window.t !== 'function') return fallback;
            const translated = window.t(key);
            return translated && translated !== key ? translated : fallback;
        };

        const allot = lot.allotissement || {};
        const fallbackLongueur = parseFloat(allot.longueur) || 0;
        const fallbackLargeur = parseFloat(allot.largeur) || 0;
        const fallbackEpaisseur = parseFloat(allot.epaisseur) || 0;
        const fallbackDiametre = parseFloat(allot.diametre) || 0;
        const fallbackTypePiece = typeof allot.typePiece === 'string' ? allot.typePiece.trim() : '';
        const fallbackEssenceNomCommun = typeof allot.essenceNomCommun === 'string' ? allot.essenceNomCommun.trim() : '';

        const toRoundedDimension = (value, fallbackValue) => {
            const hasOwnValue = value !== '' && value != null;
            const parsed = parseFloat(hasOwnValue ? value : fallbackValue);
            if (!Number.isFinite(parsed)) return 0;
            return Math.round(parsed);
        };

        const grouped = new Map();
        let hasNonZeroLongueur = false;
        let hasNonZeroLargeur = false;
        let hasNonZeroEpaisseur = false;

        const normalizeTypePiece = (value) => {
            const raw = typeof value === 'string' ? value.trim() : '';
            if (raw) return raw;
            if (fallbackTypePiece) return fallbackTypePiece;
            return 'Type inconnu';
        };

        const normalizeEssenceNomCommun = (value) => {
            const raw = typeof value === 'string' ? value.trim() : '';
            if (raw) return raw;
            return fallbackEssenceNomCommun || 'Inconnue';
        };

        const normalizePieceTitle = (value, isDefaultPiece) => {
            const raw = typeof value === 'string' ? value.trim() : '';
            if (raw) return raw;
            return isDefaultPiece ? 'Pièce par défaut' : 'Pièce';
        };

        const registerAtom = (
            sourceLongueur,
            sourceLargeur,
            sourceEpaisseur,
            sourceDiametre,
            sourceTypePiece,
            sourceEssenceNomCommun,
            sourcePieceTitle,
            isDefaultPiece,
            count
        ) => {
            const safeCount = Math.max(0, Math.round(Number(count) || 0));
            if (safeCount <= 0) return;

            const longueur = toRoundedDimension(sourceLongueur, fallbackLongueur);
            const largeur = toRoundedDimension(sourceLargeur, fallbackLargeur);
            const epaisseur = toRoundedDimension(sourceEpaisseur, fallbackEpaisseur);
            const diametre = toRoundedDimension(sourceDiametre, fallbackDiametre);

            if (longueur > 0) hasNonZeroLongueur = true;
            if (largeur > 0) hasNonZeroLargeur = true;
            if (epaisseur > 0) hasNonZeroEpaisseur = true;

            const typePiece = normalizeTypePiece(sourceTypePiece);
            const essenceNomCommun = normalizeEssenceNomCommun(sourceEssenceNomCommun);
            const pieceTitle = normalizePieceTitle(sourcePieceTitle, isDefaultPiece);
            const section = Math.round(largeur * epaisseur);
            const key = section + '|' + longueur + '|' + epaisseur;
            const existing = grouped.get(key);
            if (existing) {
                existing.count += safeCount;
                existing.typeCounts[typePiece] = (existing.typeCounts[typePiece] || 0) + safeCount;
                existing.essenceCounts[essenceNomCommun] = (existing.essenceCounts[essenceNomCommun] || 0) + safeCount;
                existing.titleCounts[pieceTitle] = (existing.titleCounts[pieceTitle] || 0) + safeCount;
                if (diametre > 0 && existing.diametre <= 0) existing.diametre = diametre;
            } else {
                grouped.set(key, {
                    section,
                    longueur,
                    largeur,
                    epaisseur,
                    diametre,
                    count: safeCount,
                    typeCounts: { [typePiece]: safeCount },
                    essenceCounts: { [essenceNomCommun]: safeCount },
                    titleCounts: { [pieceTitle]: safeCount }
                });
            }
        };

        this.ensureDefaultPiecesData(lot, { createIfEmpty: false }).forEach((defaultPiece, defaultIndex) => {
            registerAtom(
                defaultPiece ? defaultPiece.longueur : '',
                defaultPiece ? defaultPiece.largeur : '',
                defaultPiece ? defaultPiece.epaisseur : '',
                defaultPiece ? defaultPiece.diametre : '',
                defaultPiece ? defaultPiece.typePiece : '',
                defaultPiece ? defaultPiece.essenceNomCommun : '',
                defaultPiece ? (defaultPiece.nom || `Pièce par défaut ${defaultIndex + 1}`) : '',
                true,
                defaultPiece ? defaultPiece.quantite : 0
            );
        });

        (Array.isArray(lot.pieces) ? lot.pieces : []).forEach((piece) => {
            registerAtom(
                piece ? piece.longueur : '',
                piece ? piece.largeur : '',
                piece ? piece.epaisseur : '',
                piece ? piece.diametre : '',
                piece ? piece.typePiece : '',
                piece ? piece.essenceNomCommun : '',
                piece ? piece.nom : '',
                false,
                1
            );
        });

        const hasAllDimensions = hasNonZeroLongueur && hasNonZeroLargeur && hasNonZeroEpaisseur;
        const hasData = grouped.size > 0 && hasAllDimensions;

        if (!hasData) {
            if (wrapper) wrapper.style.display = 'none';
            canvas.style.display = 'none';
            if (scale) {
                scale.classList.add('hidden');
                scale.setAttribute('aria-hidden', 'true');
            }
            if (emptyEl) {
                emptyEl.textContent = tr('editor.scatterDims.empty', 'Renseignez les dimensions pour afficher ce graphique');
                emptyEl.classList.remove('hidden');
            }
            return;
        }

        if (wrapper) wrapper.style.display = '';
        canvas.style.display = 'block';
        if (emptyEl) emptyEl.classList.add('hidden');

        const abbreviateTypeWords = (value) => String(value || '')
            .split(/\s+/)
            .filter(Boolean)
            .map((word) => {
                const clean = word.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
                if (clean.length <= 15) return word;
                return `${clean.slice(0, 5)}.`;
            })
            .join(' ');

        const formatTypePiecesLabel = (typeCounts) => {
            const entries = Object.entries(typeCounts || {})
                .filter(([, qty]) => Number(qty) > 0)
                .sort((a, b) => Number(b[1]) - Number(a[1]));
            if (!entries.length) return '';
            return entries
                .map(([typeName, qty]) => `${abbreviateTypeWords(typeName)} (${Math.round(Number(qty) || 0)})`)
                .join(', ');
        };

        const getTopEntryLabel = (counts, fallback) => {
            const entries = Object.entries(counts || {})
                .filter(([, qty]) => Number(qty) > 0)
                .sort((a, b) => Number(b[1]) - Number(a[1]));
            return entries.length ? String(entries[0][0]) : fallback;
        };

        const formatTypeLine = (typeCounts) => {
            const entries = Object.entries(typeCounts || {})
                .filter(([, qty]) => Number(qty) > 0)
                .sort((a, b) => Number(b[1]) - Number(a[1]));
            if (!entries.length) return 'Type inconnu';
            return entries
                .map(([typeName, qty]) => `${typeName} (${Math.round(Number(qty) || 0)})`)
                .join(' · ');
        };

        const orientationLabel = (lot.orientationLabel || lot.orientation || '').toString().trim() || 'Non renseignée';
        const lotNumber = lotIndex >= 0 ? `Lot ${lotIndex + 1}` : 'Lot ?';

        const datasetData = Array.from(grouped.values())
            .map((group) => ({
                x: group.longueur,
                y: group.section,
                r: Math.min(18, Math.max(5, 4 + (group.count * 2))),
                epaisseur: group.epaisseur,
                largeur: group.largeur,
                diametre: group.diametre,
                count: group.count,
                typeCounts: Object.assign({}, group.typeCounts),
                typePiecesLabel: formatTypePiecesLabel(group.typeCounts),
                tooltipTitle: getTopEntryLabel(group.titleCounts, 'Pièce'),
                tooltipLotOrientation: `${lotNumber} · ${orientationLabel}`,
                tooltipTypeLine: formatTypeLine(group.typeCounts),
                tooltipDimensionsLine: group.diametre > 0
                    ? `${Math.round(group.longueur)} × ${Math.round(group.diametre)} mm`
                    : `${Math.round(group.longueur)} × ${Math.round(group.largeur)} × ${Math.round(group.epaisseur)} mm`,
                tooltipEssenceLine: getTopEntryLabel(group.essenceCounts, 'Inconnue')
            }))
            .sort((a, b) => {
                if (a.x !== b.x) return a.x - b.x;
                if (a.y !== b.y) return a.y - b.y;
                return (a.epaisseur || 0) - (b.epaisseur || 0);
            });

        const epaisseurs = datasetData
            .map((point) => Number(point.epaisseur) || 0)
            .filter((value) => Number.isFinite(value) && value > 0);
        const minEpaisseur = epaisseurs.length ? Math.min(...epaisseurs) : 0;
        const maxEpaisseur = epaisseurs.length ? Math.max(...epaisseurs) : 0;

        const getThicknessRatio = (value) => {
            if (!Number.isFinite(value) || maxEpaisseur <= minEpaisseur) return 0.55;
            return Math.max(0, Math.min(1, (value - minEpaisseur) / (maxEpaisseur - minEpaisseur)));
        };

        const getThicknessColor = (value) => {
            const ratio = getThicknessRatio(value);
            const low = { r: 219, g: 234, b: 254 };
            const high = { r: 21, g: 67, b: 153 };
            const r = Math.round(low.r + ((high.r - low.r) * ratio));
            const g = Math.round(low.g + ((high.g - low.g) * ratio));
            const b = Math.round(low.b + ((high.b - low.b) * ratio));
            return `rgba(${r},${g},${b},0.88)`;
        };

        const pointColors = datasetData.map((point) => getThicknessColor(Number(point.epaisseur) || 0));

        const tooltipTitle = (rawPoint) => {
            const value = String(rawPoint?.tooltipTitle || 'Pièce').trim();
            const maxChars = window.matchMedia && window.matchMedia('(max-width: 768px)').matches ? 22 : 34;
            const words = value.split(/\s+/).filter(Boolean);
            const lines = [];
            let currentLine = '';
            words.forEach((word) => {
                const candidate = currentLine ? `${currentLine} ${word}` : word;
                if (candidate.length <= maxChars) {
                    currentLine = candidate;
                } else {
                    if (currentLine) lines.push(currentLine);
                    currentLine = word;
                }
            });
            if (currentLine) lines.push(currentLine);
            return lines.length ? lines : [value];
        };

        const tooltipLines = (rawPoint) => {
            const baseLines = [
                String(rawPoint?.tooltipLotOrientation || 'Lot ? · Non renseignée').trim(),
                `Type de pièce : ${String(rawPoint?.tooltipTypeLine || 'Type inconnu').trim()}`,
                String(rawPoint?.tooltipDimensionsLine || 'Dimensions non renseignées').trim(),
                `Essence : ${String(rawPoint?.tooltipEssenceLine || 'Inconnue').trim()}`
            ];
            const maxChars = window.matchMedia && window.matchMedia('(max-width: 768px)').matches ? 24 : 42;
            const wrappedLines = [];
            const wrapSingleLine = (line) => {
                const text = String(line || '').trim();
                if (!text) return;
                const words = text.split(/\s+/).filter(Boolean);
                let currentLine = '';
                words.forEach((word) => {
                    const candidate = currentLine ? `${currentLine} ${word}` : word;
                    if (candidate.length <= maxChars) {
                        currentLine = candidate;
                    } else {
                        if (currentLine) wrappedLines.push(currentLine);
                        currentLine = word;
                    }
                });
                if (currentLine) wrappedLines.push(currentLine);
            };

            baseLines.forEach((line) => wrapSingleLine(line));
            return wrappedLines;
        };

        if (typeof Chart !== 'undefined' && Chart.Tooltip && Chart.Tooltip.positioners && !Chart.Tooltip.positioners.scatterBounded) {
            Chart.Tooltip.positioners.scatterBounded = function (elements, eventPosition) {
                const fallback = eventPosition || { x: 0, y: 0 };
                const average = Chart.Tooltip.positioners.average
                    ? Chart.Tooltip.positioners.average.call(this, elements, eventPosition)
                    : fallback;
                const base = average && Number.isFinite(average.x) && Number.isFinite(average.y) ? average : fallback;
                const area = this.chart && this.chart.chartArea ? this.chart.chartArea : null;
                if (!area) return base;

                const maxAllowedWidth = Math.max(120, (area.right - area.left) - 20);
                const tooltipWidth = Math.min(maxAllowedWidth, this.width || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches ? 220 : 300));
                const tooltipHeight = Math.min((area.bottom - area.top) - 20, this.height || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches ? 170 : 190));
                const halfWidth = tooltipWidth / 2;
                const halfHeight = tooltipHeight / 2;
                const padding = 10;
                const minX = area.left + padding + halfWidth;
                const maxX = area.right - padding - halfWidth;
                const minY = area.top + padding + halfHeight;
                const maxY = area.bottom - padding - halfHeight;
                const clamp = (value, min, max) => {
                    if (max < min) return (min + max) / 2;
                    return Math.max(min, Math.min(max, value));
                };

                return {
                    x: clamp(base.x, minX, maxX),
                    y: clamp(base.y, minY, maxY)
                };
            };
        }

        const scatterTypeLabelsPlugin = {
            id: 'scatterTypeLabels',
            afterDatasetsDraw(chart) {
                const dataset = chart?.data?.datasets?.[0];
                const meta = chart.getDatasetMeta(0);
                const chartArea = chart?.chartArea;
                if (!dataset || !meta || !Array.isArray(meta.data) || !chartArea) return;

                const chartCtx = chart.ctx;
                chartCtx.save();
                chartCtx.strokeStyle = '#000000';
                chartCtx.fillStyle = '#000000';
                chartCtx.lineWidth = 1;
                chartCtx.font = '11px sans-serif';
                chartCtx.textBaseline = 'middle';

                const points = dataset.data
                    .map((point, index) => {
                        const element = meta.data[index];
                        if (!element) return null;
                        return {
                            x: element.x,
                            y: element.y,
                            r: Number.isFinite(point?.r) ? point.r : 8,
                            typeCounts: Object.assign({}, point?.typeCounts || {})
                        };
                    })
                    .filter(Boolean);

                const averageRadius = points.length
                    ? points.reduce((sum, point) => sum + (Number(point.r) || 0), 0) / points.length
                    : 0;
                const distanceThreshold = Math.max(36, Math.min(52, Math.round(averageRadius * 2.4)));

                const clusters = [];
                points.forEach((point) => {
                    let targetCluster = null;
                    for (let i = 0; i < clusters.length; i += 1) {
                        const cluster = clusters[i];
                        const dx = point.x - cluster.cx;
                        const dy = point.y - cluster.cy;
                        if (Math.hypot(dx, dy) <= distanceThreshold) {
                            targetCluster = cluster;
                            break;
                        }
                    }

                    if (!targetCluster) {
                        clusters.push({
                            members: [point],
                            cx: point.x,
                            cy: point.y,
                            maxRadius: point.r
                        });
                        return;
                    }

                    targetCluster.members.push(point);
                    const count = targetCluster.members.length;
                    targetCluster.cx = ((targetCluster.cx * (count - 1)) + point.x) / count;
                    targetCluster.cy = ((targetCluster.cy * (count - 1)) + point.y) / count;
                    targetCluster.maxRadius = Math.max(targetCluster.maxRadius, point.r);
                });

                const margin = 4;
                const minTextY = chartArea.top + 8;
                const maxTextY = chartArea.bottom - 8;
                const labelHeight = 11;
                const occupiedLabelBoxes = [];
                const bubblePadding = 4;
                const bubbleExclusions = points.map((point) => ({
                    x: point.x,
                    y: point.y,
                    r: point.r + bubblePadding
                }));

                const intersects = (a, b) => !(
                    a.right < b.left ||
                    a.left > b.right ||
                    a.bottom < b.top ||
                    a.top > b.bottom
                );

                const canPlaceBox = (box) => {
                    const inside = box.left >= (chartArea.left + margin)
                        && box.right <= (chartArea.right - margin)
                        && box.top >= (chartArea.top + margin)
                        && box.bottom <= (chartArea.bottom - margin);
                    if (!inside) return false;
                    const collidesWithLabels = occupiedLabelBoxes.some((placed) => intersects(box, placed));
                    if (collidesWithLabels) return false;

                    const nearestX = (value, min, max) => Math.max(min, Math.min(max, value));
                    const collidesWithBubbles = bubbleExclusions.some((bubble) => {
                        const closestX = nearestX(bubble.x, box.left, box.right);
                        const closestY = nearestX(bubble.y, box.top, box.bottom);
                        const dx = bubble.x - closestX;
                        const dy = bubble.y - closestY;
                        return ((dx * dx) + (dy * dy)) <= (bubble.r * bubble.r);
                    });

                    return !collidesWithBubbles;
                };

                clusters.forEach((cluster, clusterIndex) => {
                    const aggregatedTypeCounts = {};
                    cluster.members.forEach((member) => {
                        Object.entries(member.typeCounts || {}).forEach(([typeName, qty]) => {
                            const amount = Math.max(0, Math.round(Number(qty) || 0));
                            if (amount <= 0) return;
                            aggregatedTypeCounts[typeName] = (aggregatedTypeCounts[typeName] || 0) + amount;
                        });
                    });

                    const typeEntries = Object.entries(aggregatedTypeCounts)
                        .filter(([, qty]) => Number(qty) > 0)
                        .sort((a, b) => Number(b[1]) - Number(a[1]));

                    if (!typeEntries.length) return;

                    const direction = cluster.cx <= ((chartArea.left + chartArea.right) / 2) ? 1 : -1;
                    const anchorX = cluster.cx + (direction * (cluster.maxRadius + 2));
                    const baseLineX = cluster.cx + (direction * (cluster.maxRadius + 16));
                    const availableHeight = Math.max(24, maxTextY - minTextY);
                    const adaptiveGap = availableHeight / Math.max(2, typeEntries.length + 1);
                    const lineGap = Math.max(9, Math.min(14, adaptiveGap));
                    const blockHeight = (typeEntries.length - 1) * lineGap;
                    const rawBaseY = cluster.cy - (blockHeight / 2);
                    const baseY = Math.max(minTextY, Math.min(maxTextY - blockHeight, rawBaseY));
                    const verticalOffsets = [0, lineGap, -lineGap, lineGap * 2, -lineGap * 2, lineGap * 3, -lineGap * 3];

                    typeEntries.forEach(([typeName, qty], typeIndex) => {
                        const label = `${abbreviateTypeWords(typeName)} (${Math.round(Number(qty) || 0)})`;
                        const textWidth = chartCtx.measureText(label).width;
                        const directionCandidates = [direction, -direction];
                        const baseTextY = baseY + (typeIndex * lineGap);

                        let placement = null;

                        for (let d = 0; d < directionCandidates.length && !placement; d += 1) {
                            const currentDirection = directionCandidates[d];
                            const candidateAnchorX = cluster.cx + (currentDirection * (cluster.maxRadius + 2));
                            const candidateBaseLineX = cluster.cx + (currentDirection * (cluster.maxRadius + 16));

                            for (let o = 0; o < verticalOffsets.length; o += 1) {
                                const candidateYRaw = baseTextY + verticalOffsets[o];
                                const candidateY = Math.max(minTextY, Math.min(maxTextY, candidateYRaw));
                                let candidateTextX = candidateBaseLineX + (currentDirection * 4);

                                if (currentDirection > 0) {
                                    const minX = chartArea.left + margin;
                                    const maxX = chartArea.right - margin - textWidth;
                                    candidateTextX = Math.max(minX, Math.min(maxX, candidateTextX));
                                } else {
                                    const minX = chartArea.left + margin + textWidth;
                                    const maxX = chartArea.right - margin;
                                    candidateTextX = Math.max(minX, Math.min(maxX, candidateTextX));
                                }

                                const left = currentDirection > 0 ? candidateTextX : candidateTextX - textWidth;
                                const right = currentDirection > 0 ? candidateTextX + textWidth : candidateTextX;
                                const top = candidateY - (labelHeight / 2) - 2;
                                const bottom = candidateY + (labelHeight / 2) + 2;
                                const candidateBox = { left, right, top, bottom };

                                if (!canPlaceBox(candidateBox)) continue;

                                placement = {
                                    direction: currentDirection,
                                    textX: candidateTextX,
                                    textY: candidateY,
                                    anchorX: candidateAnchorX,
                                    box: candidateBox
                                };
                                break;
                            }
                        }

                        if (!placement) {
                            const fallbackDirection = direction;
                            const fallbackY = Math.max(minTextY, Math.min(maxTextY, baseTextY));
                            let fallbackTextX = (cluster.cx + (fallbackDirection * (cluster.maxRadius + 16))) + (fallbackDirection * 4);
                            if (fallbackDirection > 0) {
                                const minX = chartArea.left + margin;
                                const maxX = chartArea.right - margin - textWidth;
                                fallbackTextX = Math.max(minX, Math.min(maxX, fallbackTextX));
                            } else {
                                const minX = chartArea.left + margin + textWidth;
                                const maxX = chartArea.right - margin;
                                fallbackTextX = Math.max(minX, Math.min(maxX, fallbackTextX));
                            }

                            const left = fallbackDirection > 0 ? fallbackTextX : fallbackTextX - textWidth;
                            const right = fallbackDirection > 0 ? fallbackTextX + textWidth : fallbackTextX;
                            placement = {
                                direction: fallbackDirection,
                                textX: fallbackTextX,
                                textY: fallbackY,
                                anchorX: cluster.cx + (fallbackDirection * (cluster.maxRadius + 2)),
                                box: {
                                    left,
                                    right,
                                    top: fallbackY - (labelHeight / 2) - 2,
                                    bottom: fallbackY + (labelHeight / 2) + 2
                                }
                            };

                            if (!canPlaceBox(placement.box)) {
                                return;
                            }
                        }

                        occupiedLabelBoxes.push(placement.box);

                        const textY = placement.textY;
                        const textX = placement.textX;
                        const currentDirection = placement.direction;
                        const anchorX = placement.anchorX;

                        const lineEndX = currentDirection > 0
                            ? Math.max(anchorX + 1, textX - 3)
                            : Math.min(anchorX - 1, textX + 3);

                        const safeAnchorX = Math.max(chartArea.left + margin, Math.min(chartArea.right - margin, anchorX));
                        const safeAnchorY = Math.max(chartArea.top + margin, Math.min(chartArea.bottom - margin, cluster.cy));

                        chartCtx.beginPath();
                        chartCtx.moveTo(safeAnchorX, safeAnchorY);
                        chartCtx.lineTo(lineEndX, textY);
                        chartCtx.stroke();

                        chartCtx.textAlign = currentDirection > 0 ? 'left' : 'right';
                        chartCtx.fillText(label, textX, textY);
                    });
                });

                chartCtx.restore();
            }
        };

        const xTitle = tr('editor.scatterDims.axisLength', 'Longueur (mm)');
        const yTitle = tr('editor.scatterDims.axisSection', 'Section (mm²)');

        const longueurs = datasetData.map((point) => Number(point.x) || 0).filter((value) => Number.isFinite(value) && value >= 0);
        const sections = datasetData.map((point) => Number(point.y) || 0).filter((value) => Number.isFinite(value) && value >= 0);
        const maxLongueur = longueurs.length ? Math.max(...longueurs) : 1;
        const maxSection = sections.length ? Math.max(...sections) : 1;

        const locale = typeof getValoboisIntlLocale === 'function' ? getValoboisIntlLocale() : undefined;
        const formatMm = (value) => `${Math.round(Number(value) || 0).toLocaleString(locale, { maximumFractionDigits: 0 })} mm`;

        if (scale) {
            scale.classList.remove('hidden');
            scale.setAttribute('aria-hidden', 'false');
        }
        if (scaleTitle) {
            scaleTitle.textContent = tr('editor.scatterDims.scaleTitle', 'Épaisseur (mm)');
        }
        if (scaleMin) scaleMin.textContent = formatMm(minEpaisseur);
        if (scaleMax) scaleMax.textContent = formatMm(maxEpaisseur);
        if (scaleBar) {
            const lowColor = getThicknessColor(minEpaisseur || 0);
            const highColor = getThicknessColor(maxEpaisseur || minEpaisseur || 0);
            scaleBar.style.setProperty('--scatter-dims-low', lowColor);
            scaleBar.style.setProperty('--scatter-dims-high', highColor);
        }

        if (!this.scatterDimsChart) {
            this.scatterDimsChart = new Chart(ctx, {
                type: 'bubble',
                plugins: [scatterTypeLabelsPlugin],
                data: {
                    datasets: [
                        {
                            data: datasetData,
                            backgroundColor: pointColors,
                            borderColor: '#000000',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: { top: 10, right: 10, bottom: 10, left: 10 }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            max: maxLongueur + 1000,
                            title: {
                                display: true,
                                text: xTitle
                            }
                        },
                        y: {
                            beginAtZero: true,
                            max: maxSection + 10000,
                            title: {
                                display: true,
                                text: yTitle
                            }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            position: 'scatterBounded',
                            displayColors: false,
                            backgroundColor: 'rgba(255, 255, 255, 0.96)',
                            borderColor: '#1D3D96',
                            borderWidth: 1,
                            titleColor: '#1D3D96',
                            bodyColor: '#111111',
                            titleFont: {
                                size: 12,
                                weight: '700'
                            },
                            bodyFont: {
                                size: 11,
                                weight: '500'
                            },
                            titleMarginBottom: 6,
                            bodySpacing: 4,
                            padding: 10,
                            titleAlign: 'left',
                            bodyAlign: 'left',
                            cornerRadius: 8,
                            caretPadding: 8,
                            caretSize: 6,
                            callbacks: {
                                title(items) {
                                    return tooltipTitle(items && items[0] ? items[0].raw || {} : {});
                                },
                                label(context) {
                                    return tooltipLines(context.raw || {});
                                }
                            }
                        }
                    }
                }
            });
        } else {
            this.scatterDimsChart.data.datasets[0].data = datasetData;
            this.scatterDimsChart.data.datasets[0].backgroundColor = pointColors;
            if (!Array.isArray(this.scatterDimsChart.config.plugins)) {
                this.scatterDimsChart.config.plugins = [];
            }
            if (!this.scatterDimsChart.config.plugins.some((plugin) => plugin && plugin.id === 'scatterTypeLabels')) {
                this.scatterDimsChart.config.plugins.push(scatterTypeLabelsPlugin);
            }
            this.scatterDimsChart.options.maintainAspectRatio = false;
            this.scatterDimsChart.options.scales.x.title.text = xTitle;
            this.scatterDimsChart.options.scales.x.max = maxLongueur + 1000;
            this.scatterDimsChart.options.scales.y.title.text = yTitle;
            this.scatterDimsChart.options.scales.y.max = maxSection + 10000;
            this.scatterDimsChart.options.plugins.tooltip.position = 'scatterBounded';
            this.scatterDimsChart.options.plugins.tooltip.displayColors = false;
            this.scatterDimsChart.options.plugins.tooltip.backgroundColor = 'rgba(255, 255, 255, 0.96)';
            this.scatterDimsChart.options.plugins.tooltip.borderColor = '#1D3D96';
            this.scatterDimsChart.options.plugins.tooltip.borderWidth = 1;
            this.scatterDimsChart.options.plugins.tooltip.titleColor = '#1D3D96';
            this.scatterDimsChart.options.plugins.tooltip.bodyColor = '#111111';
            this.scatterDimsChart.options.plugins.tooltip.titleFont = { size: 12, weight: '700' };
            this.scatterDimsChart.options.plugins.tooltip.bodyFont = { size: 11, weight: '500' };
            this.scatterDimsChart.options.plugins.tooltip.titleMarginBottom = 6;
            this.scatterDimsChart.options.plugins.tooltip.bodySpacing = 4;
            this.scatterDimsChart.options.plugins.tooltip.padding = 10;
            this.scatterDimsChart.options.plugins.tooltip.titleAlign = 'left';
            this.scatterDimsChart.options.plugins.tooltip.bodyAlign = 'left';
            this.scatterDimsChart.options.plugins.tooltip.cornerRadius = 8;
            this.scatterDimsChart.options.plugins.tooltip.caretPadding = 8;
            this.scatterDimsChart.options.plugins.tooltip.caretSize = 6;
            this.scatterDimsChart.options.plugins.tooltip.callbacks.title = function (items) {
                return tooltipTitle(items && items[0] ? items[0].raw || {} : {});
            };
            this.scatterDimsChart.options.plugins.tooltip.callbacks.label = function (context) {
                return tooltipLines(context.raw || {});
            };
            this.scatterDimsChart.update();
        }
    }

    renderOrientation() {
        const section = document.getElementById('orientationSection');
    const lotLabel = document.getElementById('orientationActiveLotLabel');
    const container = document.getElementById('orientationLotsContainer');
    const scrollbarThumb = document.getElementById('orientationScrollbarThumb');

    if (!section || !container) return;

    const lots = this.data.lots || [];
    if (!lots.length) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    // Lot actif global (le même index que dans le reste de l’app)
    const currentLot = this.getCurrentLot();
    const activeIndex = currentLot ? lots.indexOf(currentLot) : 0;

    if (lotLabel) {
        lotLabel.textContent = activeIndex >= 0 ? 'Lot ' + (activeIndex + 1) : 'Lot …';
    }

    container.innerHTML = '';

    lots.forEach((lot, index) => {
        const card = document.createElement('div');
        card.className = 'orientation-lot-card';
        if (index === activeIndex) {
            card.classList.add('orientation-lot-card--active');
        }
        card.dataset.lotIndex = String(index);

        const header = document.createElement('div');
        header.className = 'orientation-lot-header';

        const nameBox = document.createElement('div');
        nameBox.className = 'orientation-lot-name';
        nameBox.textContent = 'Lot ' + (index + 1);

        const orientationBox = document.createElement('div');
        orientationBox.className = 'orientation-lot-orientation';

        const label = lot.orientationLabel || '…';
        const normalized = (label || '').toLowerCase();

        let extraClass = 'orientation-lot-orientation--none';
        if (normalized === 'réemploi' || normalized === 'reemploi') {
            extraClass = 'orientation-lot-orientation--reemploi';
        } else if (normalized === 'réutilisation' || normalized === 'reutilisation') {
            extraClass = 'orientation-lot-orientation--reutilisation';
        } else if (normalized === 'recyclage') {
            extraClass = 'orientation-lot-orientation--recyclage';
        } else if (normalized === 'combustion') {
            extraClass = 'orientation-lot-orientation--combustion';
        }
        orientationBox.classList.add(extraClass);
        orientationBox.textContent = label || '…';

        header.appendChild(nameBox);
        header.appendChild(orientationBox);

        const grid = document.createElement('div');
        grid.className = 'orientation-lot-grid';

        const info = lot.allotissement || lot.allot || {};

        const formatGroupedValue = (value, digits = 0) => {
            const num = parseFloat(value);
            if (!Number.isFinite(num)) return '';
            return num.toLocaleString(getValoboisIntlLocale(), {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits
            });
        };

        const qty = info.quantite != null ? info.quantite : (info.quantitePieces != null ? info.quantitePieces : '');
        const qtyLabel = qty === '' ? '' : formatGroupedValue(qty, 0);
        const typePiece = this.getLotOrientationCountedDisplay(lot, 'typePiece');
        const essence = this.getLotOrientationCountedDisplay(lot, 'essenceNomCommun');
        const unfavorable = this.getLotUnfavorableCriteria(lot);
        const volumeLot = info.volumeLot != null ? info.volumeLot : (info.volume_m3 != null ? info.volume_m3 : '');
        const volumeLotLabel = volumeLot === '' ? '' : formatGroupedValue(volumeLot, 1);
        const surfaceLot = info.surfaceLot != null ? info.surfaceLot : (info.surface_m2 != null ? info.surface_m2 : '');
        const surfaceLotLabel = surfaceLot === '' ? '' : formatGroupedValue(surfaceLot, 1);
        const lineaireLot = info.lineaireLot != null ? info.lineaireLot : (info.lineaire_ml != null ? info.lineaire_ml : '');
        const lineaireLotLabel = lineaireLot === '' ? '' : formatGroupedValue(lineaireLot, 1);
        const pco2Display = this.formatPco2Display(info.carboneBiogeniqueEstime);
        const pco2LotLabel = pco2Display.value ? (pco2Display.value + ' ' + pco2Display.unit) : '';
        const priceUnitRaw = info.prixUnite != null ? info.prixUnite : (info.prix_unite != null ? info.prix_unite : 'm3');
        const priceUnit = ((priceUnitRaw || 'm3') + '').toLowerCase();
        const prixLot = info.prixLot != null ? info.prixLot : (info.prix_total != null ? info.prix_total : '');
        const prixLotLabel = prixLot === '' ? '' : formatGroupedValue(Math.round(parseFloat(prixLot) || 0), 0);

        const fieldDefs = [
            { label: 'Quantité', value: qtyLabel },
            { label: 'Type de pièce', value: typePiece },
            { label: 'Essence', value: essence },
        ];

        if (priceUnit === 'ml') {
            fieldDefs.push({ label: 'Linéaire du lot', value: lineaireLotLabel ? lineaireLotLabel + ' m' : '' });
        } else if (priceUnit === 'm2') {
            fieldDefs.push({ label: 'Surface du lot', value: surfaceLotLabel ? surfaceLotLabel + ' m2' : '' });
        }

        fieldDefs.push(
            { label: 'Volume du lot', value: volumeLotLabel ? volumeLotLabel + ' m³' : '' },
            { label: 'PCO2 du lot', value: pco2LotLabel },
            { label: 'Prix du lot', value: prixLotLabel ? prixLotLabel + ' €' : '' },
            { label: 'Critères défavorables', value: unfavorable, fallback: 'Aucun' }
        );

        fieldDefs.forEach((f) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'orientation-field';
            const labelEl = document.createElement('div');
            labelEl.className = 'orientation-field-label';
            labelEl.textContent = f.label;
            const box = document.createElement('div');
            box.className = 'orientation-field-box';
            box.innerHTML = `<span>${f.value || f.fallback || '—'}</span>`;
            wrapper.appendChild(labelEl);
            wrapper.appendChild(box);
            grid.appendChild(wrapper);
        });

        card.appendChild(header);
        card.appendChild(grid);

        // clic sur la carte => input le lot actif
        card.addEventListener('click', () => {
            this.setCurrentLotIndex(index);
            this.render(); // re‑rendu global (y compris Orientation)
        });

        container.appendChild(card);
    });

    // Scrollbar custom synchronisée
    const scroller = container;

    const updateThumb = () => {
        if (!scrollbarThumb) return;
        const maxScroll = scroller.scrollWidth - scroller.clientWidth;
        if (maxScroll <= 0) {
            scrollbarThumb.style.width = '100%';
            scrollbarThumb.style.left = '0';
            return;
        }
        const ratioVisible = scroller.clientWidth / scroller.scrollWidth;
        const thumbWidth = Math.max(ratioVisible * 100, 10);
        const scrollRatio = scroller.scrollLeft / maxScroll;
        const maxLeft = 100 - thumbWidth;
        scrollbarThumb.style.width = thumbWidth + '%';
        scrollbarThumb.style.left = (scrollRatio * maxLeft) + '%';
    };

    scroller.addEventListener('scroll', updateThumb);
    window.addEventListener('resize', updateThumb);
    updateThumb();
    }

    computeOrientation(lot) {
        const scores = this.getValueScoresForLot(lot);
        const avg = (scores.economique + scores.ecologique + scores.mecanique + scores.historique + scores.esthetique) / 5;
        const percentage = (avg / 30) * 100;

        let label = "…";
        let code = "none";

        if (avg > 0 || avg < 0) {
            const threshold = this.getOrientationThresholdForPercent(percentage);
            label = threshold.orientationLabel;
            code = threshold.code;
        }

        lot.orientationLabel = label;
        lot.orientationCode = code;

        const lotIndex = this.data.lots.indexOf(lot);
        if (lotIndex >= 0) {
            this.updateAllotissementOrientationBadge(lotIndex);
        }

        this.renderOrientation();
        this.renderSeuils();
        this.renderRadar();
        this.renderScatterDims();
        this.renderEvalOp(); 
    } 
    
    updateAllotissementOrientationBadge(lotIndex) {
        const rail = document.getElementById('lotRail');
        if (!rail) return;

        const card = rail.querySelector(`.lot-card[data-lot-index="${lotIndex}"]`);
        if (!card) return;

        const badge = card.querySelector('[data-lot-orientation-badge]');
        if (!badge) return;

        const lot = this.data.lots[lotIndex];
        const label = (lot && lot.orientationLabel) ? lot.orientationLabel : '…';
        const code = (lot && lot.orientationCode) ? lot.orientationCode : 'none';

        badge.classList.remove(
            'lot-orientation--reemploi',
            'lot-orientation--reutilisation',
            'lot-orientation--recyclage',
            'lot-orientation--combustion',
            'lot-orientation--none'
        );

        badge.classList.add(`lot-orientation--${code}`);
        badge.textContent = label;
    }

    /* ---- Évaluation de l’opération ---- */
    renderEvalOp() {
        const lots = this.data.lots;
        if (!lots || lots.length === 0) return;
        const root = document.getElementById('eval-op-section');
        if (!root) return;

        let volReemploi = 0, priceReemploi = 0;
        let volReutil = 0, priceReutil = 0;
        let volRecyc = 0, priceRecyc = 0;
        let volIncin = 0, priceIncin = 0;
        let totalVolGlobal = 0;
        let bilanMonetaireGlobal = 0;

        this.data.lots.forEach(lot => {
            const allotissement = lot.allotissement || {};
            const v = parseFloat(allotissement.volumeLot) || 0;
            const p = parseFloat(allotissement.prixLot) || 0;
            totalVolGlobal += v;

            if (lot.orientationLabel === "Combustion") {
                bilanMonetaireGlobal -= p;
                volIncin += v;
                priceIncin += p;
            } else {
                bilanMonetaireGlobal += p;
                if (lot.orientationLabel === "Réemploi") {
                    volReemploi += v; priceReemploi += p;
                } else if (lot.orientationLabel === "Réutilisation") {
                    volReutil += v; priceReutil += p;
                } else if (lot.orientationLabel === "Recyclage") {
                    volRecyc += v; priceRecyc += p;
                }
            }
        });

        const circularite = totalVolGlobal > 0 ? ((volReemploi + volReutil) / totalVolGlobal) * 100 : 0;

        const partReemploi = totalVolGlobal > 0 ? (volReemploi / totalVolGlobal) * 100 : 0;
        const partReutil   = totalVolGlobal > 0 ? (volReutil   / totalVolGlobal) * 100 : 0;
        const partRecyc    = totalVolGlobal > 0 ? (volRecyc    / totalVolGlobal) * 100 : 0;
        const partIncin    = totalVolGlobal > 0 ? (volIncin    / totalVolGlobal) * 100 : 0;

        const lotsParOrientation = { reemploi: [], reutil: [], recyc: [], incin: [] };
        const lotsCirculaires = [];
        this.data.lots.forEach((lot, idx) => {
            const label = `Lot ${idx + 1}`;
            if (lot.orientationLabel === 'Réemploi') {
                lotsParOrientation.reemploi.push(label);
                lotsCirculaires.push(label);
            }
            else if (lot.orientationLabel === 'Réutilisation') {
                lotsParOrientation.reutil.push(label);
                lotsCirculaires.push(label);
            }
            else if (lot.orientationLabel === 'Recyclage')    lotsParOrientation.recyc.push(label);
            else if (lot.orientationLabel === 'Combustion')   lotsParOrientation.incin.push(label);
        });
        const fmtLots = (arr) => arr.length > 0 ? arr.join(', ') : '—';
        const volCirculaire = volReemploi + volReutil;

        const setVal = (key, val) => {
            const el = root.querySelector(`[data-eval="${key}"]`);
            if (el) el.textContent = val;
        };

        const fmt = (v) => new Intl.NumberFormat(getValoboisIntlLocale(), { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
        const fmtVol = (v) => new Intl.NumberFormat(getValoboisIntlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v) + " m³";

        setVal('vol-reemploi', fmtVol(volReemploi));
        setVal('prix-reemploi', fmt(priceReemploi));
        setVal('vol-reutil', fmtVol(volReutil));
        setVal('prix-reutil', fmt(priceReutil));
        setVal('vol-recyc', fmtVol(volRecyc));
        setVal('prix-recyc', fmt(priceRecyc));
        setVal('vol-incin', fmtVol(volIncin));
        setVal('prix-incin', fmt(priceIncin));
        setVal('circularite', new Intl.NumberFormat(getValoboisIntlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(circularite) + "%");
        setVal('bilan-monetaire', fmt(bilanMonetaireGlobal));

        const fmtPart = new Intl.NumberFormat(getValoboisIntlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        setVal('part-reemploi', fmtPart.format(partReemploi) + '%');
        setVal('part-reutil',   fmtPart.format(partReutil)   + '%');
        setVal('part-recyc',    fmtPart.format(partRecyc)    + '%');
        setVal('part-incin',    fmtPart.format(partIncin)    + '%');
        setVal('lots-reemploi', fmtLots(lotsParOrientation.reemploi));
        setVal('lots-reutil',   fmtLots(lotsParOrientation.reutil));
        setVal('lots-recyc',    fmtLots(lotsParOrientation.recyc));
        setVal('lots-incin',    fmtLots(lotsParOrientation.incin));
        setVal('vol-circulaire', fmtVol(volCirculaire));
        setVal('lots-circulaires', fmtLots(lotsCirculaires));

        const gaugeTrack = root.querySelector('[data-eval-gauge]');
        const gaugeLegend = root.querySelector('[data-eval-gauge-legend]');
        if (gaugeTrack && gaugeLegend) {
            const orientations = [
                { key: 'reemploi', label: 'Réemployable', volume: volReemploi, color: '#009E73' },
                { key: 'reutilisation', label: 'Réutilisable', volume: volReutil, color: '#56B4E9' },
                { key: 'recyclage', label: 'Recyclable', volume: volRecyc, color: '#E69F00' },
                { key: 'incinerable', label: 'Incinérable', volume: volIncin, color: '#D55E00' }
            ];

            const totalOriente = orientations.reduce((sum, item) => sum + (Number.isFinite(item.volume) ? item.volume : 0), 0);
            const activeOrientations = orientations.filter(item => item.volume > 0);
            const fmtPercent = new Intl.NumberFormat(getValoboisIntlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });

            gaugeTrack.innerHTML = '';
            gaugeLegend.innerHTML = '';

            if (totalOriente <= 0 || activeOrientations.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'evalop-gauge-empty';
                empty.textContent = '0.0%';
                gaugeTrack.appendChild(empty);
                gaugeTrack.setAttribute('aria-label', 'Répartition des orientations par volume: 0%');
            } else {
                let ariaParts = [];
                activeOrientations.forEach((item, index) => {
                    const ratio = item.volume / totalOriente;
                    const percent = ratio * 100;

                    const segment = document.createElement('div');
                    segment.className = 'evalop-gauge-segment';
                    if (index > 0) segment.classList.add('evalop-gauge-segment--split');
                    segment.style.width = `${percent.toFixed(6)}%`;
                    segment.style.backgroundColor = item.color;
                    gaugeTrack.appendChild(segment);

                    const legendItem = document.createElement('div');
                    legendItem.className = 'evalop-gauge-legend-item';

                    const swatch = document.createElement('span');
                    swatch.className = 'evalop-gauge-legend-swatch';
                    swatch.style.backgroundColor = item.color;

                    const label = document.createElement('span');
                    label.textContent = item.label;

                    const value = document.createElement('span');
                    value.className = 'evalop-gauge-legend-value';
                    value.textContent = `${fmtPercent.format(percent)}% • ${fmtVol(item.volume)}`;

                    legendItem.appendChild(swatch);
                    legendItem.appendChild(label);
                    legendItem.appendChild(value);
                    gaugeLegend.appendChild(legendItem);

                    ariaParts.push(`${item.label} ${fmtPercent.format(percent)}%`);
                });

                gaugeTrack.setAttribute('aria-label', `Répartition des orientations par volume: ${ariaParts.join(', ')}`);
            }
        }

    } // FERMETURE DE renderEvalOp

    refreshPersistenceUi() {
        const btn = document.getElementById('btnResetAll');
        if (!btn) return;
        const show = this.persistenceMode === 'guest';
        btn.classList.toggle('hidden', !show);
        btn.toggleAttribute('hidden', !show);
        btn.disabled = !show;
    }

    /** Applique un objet racine identique au payload Firestore (méta, ui, lots). */
    applyEvaluationPayload(parsed) {
        if (!parsed || !parsed.lots || !Array.isArray(parsed.lots)) return false;
        this.data = parsed;
        this.data.meta = this.getDefaultMeta(this.data.meta || {});
        this.data.ui = this.getDefaultUi(this.data.ui || {});
        this.data.lots.forEach((lot) => {
            this.normalizeLotEssenceFields(lot);
            this.normalizeLotAllotissementFields(lot);
        });
        const n = this.data.lots.length;
        if (typeof this.currentLotIndex === 'number' && this.currentLotIndex >= n) {
            this.currentLotIndex = Math.max(0, n - 1);
        }
        this.saveData();
        this.render();
        return true;
    }

    exportEvaluationJson() {
        try {
            const stamp = new Date().toISOString().slice(0, 10);
            const blob = new Blob([JSON.stringify(this.data, null, 2)], {
                type: 'application/json;charset=utf-8',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `valobois_evaluation_${stamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert('Export JSON impossible.');
        }
    }

    /* ---- Reset / Save / Export ---- */
    resetAllData() {
        if (this.persistenceMode === 'guest') {
            try {
                localStorage.removeItem(this.storageKey);
                localStorage.removeItem(this.storageBackupKey);
            } catch (e) {
                console.error(e);
            }
        }
        this.data = this.createInitialData();
        this.currentLotIndex = 0;
        if (typeof window.__valoboisResetFirestoreEvaluation === 'function') {
            window.__valoboisResetFirestoreEvaluation(this);
        }
        this.saveData();
        this.render();
    }

    async exportEtiquettes(lotIndices = []) {
        const validLotIndices = Array.isArray(lotIndices)
            ? lotIndices.filter((i) => Number.isInteger(i) && this.data.lots[i])
            : [];

        if (!validLotIndices.length) {
            alert('Aucun lot valide sélectionné pour l\'export des étiquettes.');
            return;
        }

        if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
            alert('Export PDF indisponible (bibliothèque jsPDF manquante).');
            return;
        }

        try {
            for (let i = 0; i < validLotIndices.length; i += 1) {
                const lotIndex = validLotIndices[i];
                const svgPages = this.buildEtiquetteSvgPages(lotIndex);
                const lotLabel = this.getPdfLotLabel(this.data.lots[lotIndex], lotIndex);
                const safeLabel = lotLabel.replace(/[^a-zA-Z0-9-]/g, '_').toLowerCase();
                await this.downloadEtiquettePdf(svgPages, `valobois_etiquettes_${safeLabel}.pdf`);
            }
        } catch (error) {
            console.error(error);
            alert('Une erreur est survenue pendant la génération des étiquettes PDF.');
        }
    }

    async downloadEtiquettePdf(svgPages, filename) {
        const { jsPDF } = window.jspdf || window;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pages = Array.isArray(svgPages) ? svgPages : [svgPages];

        try {
            for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
                const svgMarkup = pages[pageIndex];
                const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
                const svgUrl = URL.createObjectURL(svgBlob);

                try {
                    const image = await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.onerror = () => reject(new Error('Impossible de charger le SVG des étiquettes.'));
                        img.src = svgUrl;
                    });

                    const canvas = document.createElement('canvas');
                    const upscale = 2;
                    canvas.width = Math.max(1, Math.round(image.naturalWidth * upscale));
                    canvas.height = Math.max(1, Math.round(image.naturalHeight * upscale));
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('Contexte canvas indisponible pour l\'export PDF.');

                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
                    const drawWidth = canvas.width * ratio;
                    const drawHeight = canvas.height * ratio;
                    const x = (pageWidth - drawWidth) / 2;
                    const y = (pageHeight - drawHeight) / 2;

                    if (pageIndex > 0) pdf.addPage('a4', 'p');
                    pdf.addImage(dataUrl, 'JPEG', x, y, drawWidth, drawHeight, undefined, 'FAST');
                } finally {
                    URL.revokeObjectURL(svgUrl);
                }
            }

            pdf.save(filename);
        } finally {}
    }

    buildEtiquettePieceItems(lot, lotIndex) {
        const items = [];
        const allot = (lot && lot.allotissement) || {};
        const meta = this.data.meta || {};
        const defaultPieces = this.ensureDefaultPiecesData(lot);

        const asText = (value) => (value == null ? '' : String(value)).trim();
        const firstFilled = (...values) => values.map(asText).find(Boolean) || '';
        const formatMm = (value) => {
            const num = parseFloat(value);
            return Number.isFinite(num) && num > 0 ? `${Math.round(num)} mm` : '—';
        };
        const formatDimensionsLabel = (longueur, largeur, epaisseur) => {
            return `${formatMm(longueur)} (L) - ${formatMm(largeur)} (l) - ${formatMm(epaisseur)} (e)`;
        };
        const joinCompanyAndEmail = (company, email) => {
            const parts = [asText(company), asText(email)].filter(Boolean);
            return parts.length ? parts.join(' - ') : '';
        };

        const lotRef = this.getPdfLotLabel(lot, lotIndex);
        const vol = parseFloat(allot.volumeLot) || 0;
        const diagInfo = joinCompanyAndEmail(
            firstFilled(meta.diagnostiqueurNom, meta.diagnostiqueurContact),
            firstFilled(meta.diagnostiqueurMail, meta.diagnostiqueurEmail)
        );
        const deconInfo = joinCompanyAndEmail(
            firstFilled(meta.entrepriseDeconstructionNom, meta.deconstructeurNom),
            firstFilled(meta.entrepriseDeconstructionMail, meta.entrepriseDeconstructionEmail, meta.deconstructeurMail)
        );
        const destinationInfo = joinCompanyAndEmail(
            firstFilled(allot.destination),
            firstFilled(allot.destinationMail, allot.destinationEmail)
        );

        const createBaseItem = (pieceLabel, typePiece, essenceNomCommun, dimensionsLabel) => ({
            lotRef,
            pieceLabel,
            dimensionsLabel,
            typePiece: asText(typePiece) || '—',
            essenceNomCommun: asText(essenceNomCommun) || '—',
            volumeLot: vol,
            origine: asText(meta.localisation) || '—',
            diagnostiqueur: diagInfo || '—',
            deconstructeur: deconInfo || '—',
            destination: destinationInfo || '—'
        });

        const pieces = Array.isArray(lot && lot.pieces) ? lot.pieces : [];
        pieces.forEach((piece, index) => {
            items.push(createBaseItem(
                `Pièce ${index + 1}`,
                firstFilled(piece && piece.typePiece, allot.typePiece),
                firstFilled(piece && piece.essenceNomCommun, allot.essenceNomCommun),
                formatDimensionsLabel(
                    firstFilled(piece && piece.longueur, allot.longueur),
                    firstFilled(piece && piece.largeur, allot.largeur),
                    firstFilled(piece && piece.epaisseur, allot.epaisseur)
                )
            ));
        });

        defaultPieces.forEach((defaultPiece, defaultPieceIndex) => {
            const defaultQty = Math.max(0, Math.round(parseFloat(defaultPiece.quantite || 0) || 0));
            for (let i = 0; i < defaultQty; i += 1) {
                items.push(createBaseItem(
                    `Pièce par défaut ${defaultPieceIndex + 1} n°${i + 1}`,
                    firstFilled(defaultPiece.typePiece, allot.typePiece),
                    firstFilled(defaultPiece.essenceNomCommun, allot.essenceNomCommun),
                    formatDimensionsLabel(
                        firstFilled(defaultPiece.longueur, allot.longueur),
                        firstFilled(defaultPiece.largeur, allot.largeur),
                        firstFilled(defaultPiece.epaisseur, allot.epaisseur)
                    )
                ));
            }
        });

        return items;
    }

    buildEtiquetteSvgPages(lotIndex) {
        const lot   = this.data.lots[lotIndex] || {};
        const orientation = this.getPdfOrientationSummary(lot);
        const items = this.buildEtiquettePieceItems(lot, lotIndex);

        /* ── Page A4 (mm) ── */
        const PW = 210, PH = 297;
        const PAGE_MARGIN = 15;
        const COLS = 3, ROWS = 5, SZ = 51, GAP = 2;
        const areaW = COLS * SZ + (COLS - 1) * GAP;
        const areaH = ROWS * SZ + (ROWS - 1) * GAP;
        const printableW = PW - (PAGE_MARGIN * 2);
        const printableH = PH - (PAGE_MARGIN * 2);
        const ox = PAGE_MARGIN + Math.max(0, (printableW - areaW) / 2);
        const oy = PAGE_MARGIN + Math.max(0, (printableH - areaH) / 2);

        /* ── Helpers ── */
        const e = (s) => String(s || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const wrapText = (value, maxChars) => {
            const text = String(value || '').trim();
            if (!text) return [''];

            const words = text.split(/\s+/).filter(Boolean);
            const lines = [];
            let current = '';

            const pushCurrent = () => {
                if (current) {
                    lines.push(current);
                    current = '';
                }
            };

            words.forEach((word) => {
                if (word.length > maxChars) {
                    pushCurrent();
                    for (let i = 0; i < word.length; i += maxChars) {
                        lines.push(word.slice(i, i + maxChars));
                    }
                    return;
                }
                const candidate = current ? `${current} ${word}` : word;
                if (candidate.length <= maxChars) {
                    current = candidate;
                } else {
                    pushCurrent();
                    current = word;
                }
            });

            pushCurrent();
            return lines.length ? lines : [''];
        };
        const maxCharsForWidth = (widthMm, fontSize) => {
            return Math.max(6, Math.floor(widthMm / (fontSize * 0.55)));
        };
        const fitSingleLineFont = (text, widthMm, baseSize, minSize = 1.6) => {
            const safeText = String(text || '').trim() || '—';
            let size = baseSize;
            while (size > minSize && safeText.length > maxCharsForWidth(widthMm, size)) {
                size -= 0.05;
            }
            return Math.max(minSize, Number(size.toFixed(2)));
        };
        const drawWrappedLines = (out, opts) => {
            const {
                text,
                x,
                y,
                widthMm,
                fontSize,
                lineHeight,
                fill,
                fontWeight = '400'
            } = opts;
            const lines = wrapText(text, maxCharsForWidth(widthMm, fontSize));
            lines.forEach((line, idx) => {
                out.push(`<text x="${x}" y="${y + idx * lineHeight}" font-family="${FF}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}">${e(line)}</text>`);
            });
            return y + lines.length * lineHeight;
        };
        const drawSingleLine = (out, opts) => {
            const {
                text,
                x,
                y,
                widthMm,
                baseFontSize,
                minFontSize,
                fill,
                fontWeight = '400',
                textAnchor = 'start'
            } = opts;
            const safeText = String(text || '').trim() || '—';
            const fontSize = fitSingleLineFont(safeText, widthMm, baseFontSize, minFontSize);
            out.push(`<text x="${x}" y="${y}" font-family="${FF}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}" text-anchor="${textAnchor}">${e(safeText)}</text>`);
            return y;
        };
        const drawLabeledWrappedValue = (out, opts) => {
            const {
                label,
                value,
                x,
                y,
                widthMm,
                fontSize,
                lineHeight,
                fill
            } = opts;

            const labelText = String(label || '').trim();
            const valueText = String(value || '').trim() || '—';
            const maxChars = maxCharsForWidth(widthMm, fontSize);
            const firstLineCap = Math.max(6, maxChars - labelText.length - 1);

            const words = valueText.split(/\s+/).filter(Boolean);
            const valueLines = [];
            let current = '';
            let currentCap = firstLineCap;

            const pushCurrent = () => {
                if (current) {
                    valueLines.push(current);
                    current = '';
                    currentCap = maxChars;
                }
            };

            words.forEach((word) => {
                if (word.length > currentCap) {
                    if (current) pushCurrent();
                    if (word.length > maxChars) {
                        for (let i = 0; i < word.length; i += maxChars) {
                            valueLines.push(word.slice(i, i + maxChars));
                        }
                        currentCap = maxChars;
                    } else {
                        current = word;
                    }
                    return;
                }

                const candidate = current ? `${current} ${word}` : word;
                if (candidate.length <= currentCap) {
                    current = candidate;
                } else {
                    pushCurrent();
                    current = word;
                }
            });
            pushCurrent();

            const firstValue = valueLines.shift() || '—';
            out.push(`<text x="${x}" y="${y}" font-family="${FF}" font-size="${fontSize}" fill="${fill}"><tspan font-weight="700">${e(labelText)}</tspan><tspan font-weight="400"> ${e(firstValue)}</tspan></text>`);

            valueLines.forEach((line, idx) => {
                out.push(`<text x="${x}" y="${y + (idx + 1) * lineHeight}" font-family="${FF}" font-size="${fontSize}" font-weight="400" fill="${fill}">${e(line)}</text>`);
            });

            return y + (1 + valueLines.length) * lineHeight;
        };
        const formatOneDecimal = (value) => Number(value || 0).toLocaleString(getValoboisIntlLocale(), {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        });

        /* ── Données du lot ── */
        const lotRef = this.getPdfLotLabel(lot, lotIndex);

        /* ── Orientation ── */
        const OC = { reemploi: '#009E73', reutilisation: '#56B4E9', recyclage: '#E69F00', combustion: '#D55E00', none: '#CCCCCC' };
        const oCode  = orientation.code || 'none';
        const oColor = OC[oCode] || '#CCCCCC';
        const oLabel = orientation.label || '—';

        /* ── Typographie ── */
        const FF = 'Roboto,Arial,sans-serif';
        const F  = { header: 3.0, content: 2.25, small: 1.95, dim: 2.05 };
        const C  = { dark: '#111111', mid: '#333333', muted: '#555555', light: '#777777' };

        /* ── Constructeur d'une étiquette 51×51 mm ── */
        const buildLabel = (lx, ly, uid, item) => {
            const R  = 2;
            const HH = 10.5;
            const MARGIN = 2.4;
            const out = [];

            const volumeStr = item.volumeLot > 0 ? `${formatOneDecimal(item.volumeLot)} m3` : '0,0 m3';
            const headerLot = item.lotRef || '—';
            const headerOrientation = oLabel || '—';
            const pieceLabel = item.pieceLabel || '—';
            const dimensionsLabel = item.dimensionsLabel || '—';
            const typePiece = item.typePiece || '—';
            const essenceNomCommun = item.essenceNomCommun || '—';
            const origine = item.origine || '—';
            const diagnostiqueur = item.diagnostiqueur || '—';
            const deconstructeur = item.deconstructeur || '—';
            const destination = item.destination || '—';

            /* ClipPath arrondi */
            out.push(`<clipPath id="cp${uid}"><rect x="${lx}" y="${ly}" width="${SZ}" height="${SZ}" rx="${R}"/></clipPath>`);

            /* Fond blanc + bord */
            out.push(`<rect x="${lx}" y="${ly}" width="${SZ}" height="${SZ}" rx="${R}" fill="white" stroke="#CCCCCC" stroke-width="0.3"/>`);

            /* ══════ BLOC 1 : EN-TÊTE (1/5) ══════ */
            out.push(`<rect x="${lx}" y="${ly}" width="${SZ}" height="${HH}" rx="${R}" fill="${oColor}"/>`);
            out.push(`<rect x="${lx}" y="${ly + R}" width="${SZ}" height="${HH - R}" fill="${oColor}"/>`);
            const headerPad = 2.8;
            const headerGap = 1.2;
            const headerBodyW = SZ - (headerPad * 2) - (headerGap * 2);
            const lotW = headerBodyW * 0.25;
            const volW = headerBodyW * 0.25;
            const orientationW = headerBodyW * 0.5;
            const headerY = ly + 6.4;

            drawSingleLine(out, {
                text: headerLot,
                x: lx + headerPad + (lotW / 2),
                y: headerY,
                widthMm: lotW,
                baseFontSize: F.header,
                minFontSize: 2.05,
                fill: C.dark,
                fontWeight: '700',
                textAnchor: 'middle'
            });
            drawSingleLine(out, {
                text: volumeStr,
                x: lx + headerPad + lotW + headerGap + (volW / 2),
                y: headerY,
                widthMm: volW,
                baseFontSize: F.header,
                minFontSize: 2.05,
                fill: C.dark,
                fontWeight: '700',
                textAnchor: 'middle'
            });
            drawSingleLine(out, {
                text: headerOrientation,
                x: lx + headerPad + lotW + headerGap + volW + headerGap + (orientationW / 2),
                y: headerY,
                widthMm: orientationW,
                baseFontSize: F.header,
                minFontSize: 2.05,
                fill: C.dark,
                fontWeight: '700',
                textAnchor: 'middle'
            });

            /* ── Contenu clippé ── */
            out.push(`<g clip-path="url(#cp${uid})">`);

            const contentX = lx + 2.8;
            let lineY = ly + HH + MARGIN + 2.1;
            const bodyWidth = SZ - 5.6;
            const lineHContent = 2.55;
            const lineHSmall = 2.4;

            lineY = drawWrappedLines(out, {
                text: pieceLabel,
                x: contentX,
                y: lineY,
                widthMm: bodyWidth,
                fontSize: F.content,
                lineHeight: lineHContent,
                fill: C.dark,
                fontWeight: '700'
            });
            lineY += 0.1;
            drawSingleLine(out, {
                text: dimensionsLabel,
                x: contentX,
                y: lineY,
                widthMm: bodyWidth,
                baseFontSize: F.dim,
                minFontSize: 1.55,
                fill: C.mid
            });
            lineY += lineHContent;
            lineY = drawLabeledWrappedValue(out, {
                label: 'Type:',
                value: typePiece,
                x: contentX,
                y: lineY,
                widthMm: bodyWidth,
                fontSize: F.content,
                lineHeight: lineHContent,
                fill: C.mid
            });
            lineY = drawLabeledWrappedValue(out, {
                label: 'Essence:',
                value: essenceNomCommun,
                x: contentX,
                y: lineY,
                widthMm: bodyWidth,
                fontSize: F.content,
                lineHeight: lineHContent,
                fill: C.mid
            });

            lineY += 1.0;
            out.push(`<line x1="${contentX}" y1="${lineY}" x2="${contentX + bodyWidth}" y2="${lineY}" stroke="#D6D6D6" stroke-width="0.25"/>`);

            lineY += 3.2;
            lineY = drawLabeledWrappedValue(out, {
                label: 'Origine du lot:',
                value: origine,
                x: contentX,
                y: lineY,
                widthMm: bodyWidth,
                fontSize: F.small,
                lineHeight: lineHSmall,
                fill: C.mid
            });
            lineY = drawLabeledWrappedValue(out, {
                label: 'Diagnostiqueur:',
                value: diagnostiqueur,
                x: contentX,
                y: lineY,
                widthMm: bodyWidth,
                fontSize: F.small,
                lineHeight: lineHSmall,
                fill: C.mid
            });
            lineY = drawLabeledWrappedValue(out, {
                label: 'Déconstructeur:',
                value: deconstructeur,
                x: contentX,
                y: lineY,
                widthMm: bodyWidth,
                fontSize: F.small,
                lineHeight: lineHSmall,
                fill: C.mid
            });
            drawLabeledWrappedValue(out, {
                label: 'Destination du lot:',
                value: destination,
                x: contentX,
                y: lineY,
                widthMm: bodyWidth,
                fontSize: F.small,
                lineHeight: lineHSmall,
                fill: C.mid
            });

            out.push('</g>');
            return out.join('');
        };

        /* ── Traits de découpe pointillés ── */
        const dash = `stroke="#CCCCCC" stroke-width="0.25" stroke-dasharray="1.5 1.5"`;
        const marks = [];
        for (let c = 1; c < COLS; c++) {
            const cx = ox + c * (SZ + GAP) - GAP / 2;
            marks.push(`<line x1="${cx}" y1="${oy}" x2="${cx}" y2="${oy + areaH}" ${dash}/>`);
        }
        for (let r = 1; r < ROWS; r++) {
            const ry = oy + r * (SZ + GAP) - GAP / 2;
            marks.push(`<line x1="${ox}" y1="${ry}" x2="${ox + areaW}" y2="${ry}" ${dash}/>`);
        }

        const labelsPerPage = COLS * ROWS;
        const totalLabels = items.length;
        const totalPages = Math.max(1, Math.ceil(totalLabels / labelsPerPage));
        const today = new Date().toLocaleDateString(getValoboisIntlLocale());

        const svgPages = [];
        for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
            const start = pageIndex * labelsPerPage;
            const pageItems = items.slice(start, start + labelsPerPage);

            const cells = [];
            for (let idx = 0; idx < pageItems.length; idx += 1) {
                const row = Math.floor(idx / COLS);
                const col = idx % COLS;
                const uid = `p${pageIndex}_${idx}`;
                const x = ox + col * (SZ + GAP);
                const y = oy + row * (SZ + GAP);
                cells.push(buildLabel(x, y, uid, pageItems[idx]));
            }

            const pageNoteY = PH - 10;
            const pageNote = `<text x="${PW / 2}" y="${pageNoteY}" font-family="Roboto,Arial,sans-serif" font-size="2.1" fill="#BBBBBB" text-anchor="middle">VALOXYLO · ${e(lotRef)} · ${totalLabels} étiquettes · page ${pageIndex + 1}/${totalPages} · ${today}</text>`;

            svgPages.push([
                '<?xml version="1.0" encoding="UTF-8"?>',
                `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}mm" height="${PH}mm" viewBox="0 0 ${PW} ${PH}">`,
                `<rect width="${PW}" height="${PH}" fill="#F4F4F4"/>`,
                '<defs></defs>',
                marks.join('\n'),
                cells.join('\n'),
                pageNote,
                '</svg>'
            ].join('\n'));
        }

        return svgPages;
    }

    buildEtiquetteSvgPage(lotIndex) {
        return this.buildEtiquetteSvgPages(lotIndex)[0] || '';
    }

    /* ═══════ pdfmake — palette & styles ═══════ */

    getPdfmakeColors() {
        return {
            border: '#000000',
            cardBg: '#ffffff',
            headerBg: '#E6E6E6',
            altRowBg: '#ffffff',
            labelColor: '#808080',
            textColor: '#000000',
            reemploi: '#009E73',
            reutilisation: '#56B4E9',
            recyclage: '#E69F00',
            combustion: '#D55E00',
            neutral: '#E6E6E6'
        };
    }

    getPdfFontScale() {
        return {
            title: 16,
            smallTitle: 13,
            cardTitle: 10,
            sectionTitle: 9,
            body: 8,
            value: 8,
            table: 8,
            label: 8,
            tableCompact: 7,
            gaugeValue: 7,
            gaugeLabel: 7,
            footer: 7,
            notation: 6
        };
    }

    getPdfmakeStyles() {
        const f = this.getPdfFontScale();
        return {
            title: { fontSize: f.title, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
            cardTitle: { fontSize: f.cardTitle, bold: true, margin: [0, 0, 0, 3] },
            kvLabel: { fontSize: f.label, color: '#6a6257', bold: false, margin: [0, 0, 0, 1] },
            kvValue: { fontSize: f.value, bold: true },
            tableCell: { fontSize: f.table },
            smallTitle: { fontSize: f.smallTitle, bold: true, alignment: 'center', margin: [0, 0, 0, 2] }
        };
    }

    /* ═══════ pdfmake — helpers de construction ═══════ */

    pdfCard(titleText, bodyContent, options = {}) {
        const c = this.getPdfmakeColors();
        const content = [];
        if (titleText) {
            content.push({ text: titleText, style: 'cardTitle' });
        }
        if (Array.isArray(bodyContent)) {
            content.push(...bodyContent);
        } else if (bodyContent) {
            content.push(bodyContent);
        }
        const pad = options.padding || [5, 4, 5, 4];
        const cardTable = {
            table: {
                widths: ['*'],
                body: [
                    [{ stack: content }]
                ]
            },
            layout: {
                hLineWidth: () => 0.6,
                vLineWidth: () => 0.6,
                hLineColor: () => c.border,
                vLineColor: () => c.border,
                fillColor: () => c.cardBg,
                paddingLeft: () => pad[0],
                paddingRight: () => pad[2],
                paddingTop: () => pad[1],
                paddingBottom: () => pad[3],
                defaultBorder: false,
                borderRadius: () => 4
            },
            margin: options.margin || [0, 0, 0, 6]
        };
        
        // Si unbreakable est activé, wrapper la carte pour éviter les césures
        if (options.unbreakable !== false) {
            return { stack: [cardTable], unbreakable: true };
        }
        return cardTable;
    }

    pdfKeyValueGrid(pairs, columns = 2) {
        const rows = [];
        for (let i = 0; i < pairs.length; i += columns) {
            const row = [];
            for (let j = 0; j < columns; j++) {
                const pair = pairs[i + j];
                if (pair) {
                    const safeLabel = this.sanitizePdfText(pair.label || '', { fallback: '' });
                    // Wrap long strings properly so they don't break the layout
                    const safeValue = this.sanitizePdfText(pair.value || '—', { wrapLongWords: true });
                    row.push({
                        stack: [
                            { text: safeLabel, style: 'kvLabel' },
                            { text: safeValue, style: 'kvValue' }
                        ]
                    });
                } else {
                    row.push({ text: '' });
                }
            }
            rows.push(row);
        }
        const widths = Array(columns).fill('*');
        return {
            table: { dontBreakRows: true, widths, body: rows },
            layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#e7e1d6',
                vLineColor: () => '#e7e1d6',
                fillColor: () => '#ffffff',
                paddingLeft: () => 3,
                paddingRight: () => 3,
                paddingTop: () => 2,
                paddingBottom: () => 2
            }
        };
    }

    pdfDataTable(headers, dataRows, options = {}) {
        const c = this.getPdfmakeColors();
        const f = this.getPdfFontScale();
        const fontSize = options.fontSize || f.table;
        const cellStyle = options.cellStyle || 'tableCell';
        const widths = options.widths || headers.map(() => '*');

        const headRow = headers.map((h) => ({
            text: this.sanitizePdfText(h, { fallback: '' }),
            bold: true,
            fontSize,
            color: c.labelColor,
            fillColor: c.headerBg
        }));

        const bodyRows = (dataRows.length ? dataRows : [headers.map(() => '—')]).map((row, rowIdx) =>
            row.map((cell) => ({
                text: this.sanitizePdfText(cell == null || cell === '' ? '—' : String(cell)),
                style: cellStyle,
                fontSize,
                fillColor: rowIdx % 2 === 1 ? c.altRowBg : null
            }))
        );

        return {
            table: {
                dontBreakRows: true,
                headerRows: 1,
                widths,
                body: [headRow, ...bodyRows]
            },
            layout: {
                hLineWidth: () => 0.4,
                vLineWidth: () => 0,
                hLineColor: () => '#eee7db',
                paddingLeft: () => 3,
                paddingRight: () => 3,
                paddingTop: () => 2,
                paddingBottom: () => 2
            }
        };
    }

    getCanvasDataUrl(canvasEl) {
        if (!canvasEl) return null;
        try {
            return canvasEl.toDataURL('image/png');
        } catch (e) {
            return null;
        }
    }

    sanitizePdfText(value, options = {}) {
        if (value == null) return '';
        const fallback = options.fallback == null ? '—' : String(options.fallback);
        const preserveLineBreaks = options.preserveLineBreaks !== false;
        const collapseSpaces = options.collapseSpaces !== false;

        let text = String(value);
        if (text === '') return fallback;

        // Keep canonical UTF-8 composition for accents and ligatures.
        text = text.normalize('NFC');

        // Remove invisible direction markers and BOM that can render as parasitic glyphs. (Preserve \u200B for wrapping)
        text = text.replace(/[\u200C-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, '');

        // Remove replacement char from broken decoding paths.
        text = text.replace(/\uFFFD/g, '');

        // Normalize line breaks.
        text = text.replace(/\r\n?/g, '\n');

        if (collapseSpaces) {
            text = text.replace(/[\u00A0\u202F\t]+/g, ' ');
            if (!preserveLineBreaks) {
                text = text.replace(/\n+/g, ' ');
            }
            text = text.replace(/ {2,}/g, ' ').trim();
        }

        if (options.wrapLongWords) {
            // Adds zero-width space after punctuation typically found in emails and URLs to allow line wrapping.
            text = text.replace(/([@._\-/])/g, '$1\u200B');
        }

        return text || fallback;
    }

    normalizePdfCurrencyGrouping(text, mode = 'auto') {
        const compact = String(text || '').replace(/[\u00A0\u202F\s]+/g, ' ').trim();
        if (!compact) return '0';

        if (mode === 'ascii') {
            return compact;
        }

        // Use NBSP for broad viewer compatibility.
        const nbsp = '\u00A0';
        const withNbsp = compact.replace(/ /g, nbsp);

        if (mode === 'nbsp') {
            return withNbsp;
        }

        // Auto mode: fallback to ASCII only if suspicious control chars remain.
        if (/[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF\uFFFD]/.test(withNbsp)) {
            return compact;
        }
        return withNbsp;
    }

    formatPdfDecimal(value, minimumFractionDigits = 0, maximumFractionDigits = 0) {
        return new Intl.NumberFormat(getValoboisIntlLocale(), {
            minimumFractionDigits,
            maximumFractionDigits
        }).format(Number.isFinite(value) ? value : 0);
    }

    formatPdfVolume(value) {
        return this.formatPdfDecimal(parseFloat(value) || 0, 1, 1) + ' m³';
    }

    formatPdfCurrency(value) {
        const number = parseFloat(value) || 0;
        const grouped = new Intl.NumberFormat(getValoboisIntlLocale(), {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0,
            useGrouping: true
        }).format(number);
        const groupedSafe = this.normalizePdfCurrencyGrouping(grouped, 'auto');
        const currencySpace = groupedSafe.includes('\u00A0') ? '\u00A0' : ' ';
        return groupedSafe + currencySpace + '€';
    }

    formatPdfPercent(value) {
        return this.formatPdfDecimal(parseFloat(value) || 0, 1, 1) + ' %';
    }

    formatPdfSignedScore(value) {
        if (value == null || value === '') return '—';
        const number = parseFloat(value);
        if (!Number.isFinite(number)) return '—';
        const raw = (number > 0 ? '+' : '') + String(number).replace('.', ',');
        return this.sanitizePdfText(raw, { preserveLineBreaks: false });
    }

    getPdfLotLabel(lot, index) {
        return ((lot && lot.nom) || '').trim() || ('Lot ' + (index + 1));
    }

    getPdfCategoryDefinitions() {
        return [
            { key: 'economique', label: 'Économique' },
            { key: 'ecologique', label: 'Écologique' },
            { key: 'mecanique', label: 'Mécanique' },
            { key: 'historique', label: 'Historique' },
            { key: 'esthetique', label: 'Esthétique' }
        ];
    }

    getPdfSectionDefinitions() {
        return [
            {
                key: 'inspection',
                title: 'Inspection',
                rows: [
                    { key: 'visibilite', label: 'Visibilité - Accessibilité' },
                    { key: 'instrumentation', label: 'Instrumentation' },
                    { key: 'integrite', label: 'Intégrité générale' }
                ]
            },
            {
                key: 'bio',
                title: 'Biologique',
                rows: [
                    { key: 'purge', label: 'Purge' },
                    { key: 'expansion', label: 'Expansion' },
                    { key: 'integriteBio', label: 'Intégrité' },
                    { key: 'exposition', label: 'Exposition' },
                    { key: 'confianceBio', label: 'Confiance' }
                ]
            },
            {
                key: 'mech',
                title: 'Mécanique',
                rows: [
                    { key: 'purgeMech', label: 'Purge' },
                    { key: 'feuMech', label: 'Feu' },
                    { key: 'integriteMech', label: 'Intégrité' },
                    { key: 'expositionMech', label: 'Exposition' },
                    { key: 'confianceMech', label: 'Confiance' }
                ]
            },
            {
                key: 'usage',
                title: 'Usage',
                rows: [
                    { key: 'confianceUsage', label: 'Confiance' },
                    { key: 'durabiliteUsage', label: 'Durabilité naturelle' },
                    { key: 'classementUsage', label: 'Classement estimé' },
                    { key: 'humiditeUsage', label: 'Humidité' },
                    { key: 'aspectUsage', label: 'Aspect' }
                ]
            },
            {
                key: 'denat',
                title: 'Dénaturation',
                rows: [
                    { key: 'depollutionDenat', label: 'Dépollution' },
                    { key: 'contaminationDenat', label: 'Contamination' },
                    { key: 'durabiliteConfDenat', label: 'Durabilité conférée' },
                    { key: 'confianceDenat', label: 'Confiance' },
                    { key: 'naturaliteDenat', label: 'Naturalité' }
                ]
            },
            {
                key: 'debit',
                title: 'Débit',
                rows: [
                    { key: 'regulariteDebit', label: 'Régularité' },
                    { key: 'volumetrieDebit', label: 'Volumétrie' },
                    { key: 'stabiliteDebit', label: 'Stabilité' },
                    { key: 'artisanaliteDebit', label: 'Artisanalité' },
                    { key: 'rusticiteDebit', label: 'Rusticité' }
                ]
            },
            {
                key: 'geo',
                title: 'Géométrie',
                rows: [
                    { key: 'adaptabiliteGeo', label: 'Adaptabilité' },
                    { key: 'massiviteGeo', label: 'Massivité' },
                    { key: 'deformationGeo', label: 'Déformation' },
                    { key: 'industrialiteGeo', label: 'Industrialité' },
                    { key: 'inclusiviteGeo', label: 'Inclusivité' }
                ]
            },
            {
                key: 'essence',
                title: 'Essence',
                rows: [
                    { key: 'confianceEssence', label: 'Confiance' },
                    { key: 'rareteEcoEssence', label: 'Rareté' },
                    { key: 'masseVolEssence', label: 'Masse volumique' },
                    { key: 'rareteHistEssence', label: 'Rareté commerciale' },
                    { key: 'singulariteEssence', label: 'Singularité' }
                ]
            },
            {
                key: 'ancien',
                title: 'Ancienneté',
                rows: [
                    { key: 'confianceAncien', label: 'Confiance' },
                    { key: 'amortissementAncien', label: 'Amortissement' },
                    { key: 'vieillissementAncien', label: 'Vieillissement' },
                    { key: 'microhistoireAncien', label: 'Micro-histoire' },
                    { key: 'demontabiliteAncien', label: 'Démontabilité' }
                ]
            },
            {
                key: 'traces',
                title: 'Traces',
                rows: [
                    { key: 'confianceTraces', label: 'Confiance' },
                    { key: 'etiquetageTraces', label: 'Étiquetage' },
                    { key: 'alterationTraces', label: 'Altération' },
                    { key: 'documentationTraces', label: 'Documentation' },
                    { key: 'singularitesTraces', label: 'Singularités' }
                ]
            },
            {
                key: 'provenance',
                title: 'Provenance',
                rows: [
                    { key: 'confianceProv', label: 'Confiance' },
                    { key: 'transportProv', label: 'Transport' },
                    { key: 'reputationProv', label: 'Réputation' },
                    { key: 'macroProv', label: 'Macro-histoire' },
                    { key: 'territorialiteProv', label: 'Territorialité' }
                ]
            }
        ];
    }

    getPdfOrientationSummary(lot) {
        const scores = this.getValueScoresForLot(lot);
        const total = Object.values(scores).reduce((sum, value) => sum + (parseFloat(value) || 0), 0);
        const average = total / 5;
        const percentage = (average / 30) * 100;

        let label = '…';
        let code = 'none';
        if (average > 0 || average < 0) {
            if (percentage >= 70) {
                label = 'Réemploi';
                code = 'reemploi';
            } else if (percentage >= 50) {
                label = 'Réutilisation';
                code = 'reutilisation';
            } else if (percentage >= 30) {
                label = 'Recyclage';
                code = 'recyclage';
            } else {
                label = 'Combustion';
                code = 'combustion';
            }
        }

        return {
            label: lot && lot.orientationLabel ? lot.orientationLabel : label,
            code: lot && lot.orientationCode ? lot.orientationCode : code,
            percentage,
            average,
            scores
        };
    }

    getPdfOperationSummary() {
        const lots = this.data.lots || [];
        let volReemploi = 0;
        let priceReemploi = 0;
        let volReutil = 0;
        let priceReutil = 0;
        let volRecyc = 0;
        let priceRecyc = 0;
        let volIncin = 0;
        let priceIncin = 0;
        let totalVolGlobal = 0;
        let bilanMonetaireGlobal = 0;
        const lotsParOrientation = {
            reemploi: [],
            reutilisation: [],
            recyclage: [],
            combustion: []
        };
        const lotsCirculaires = [];

        lots.forEach((lot, index) => {
            const allotissement = lot.allotissement || {};
            const volume = parseFloat(allotissement.volumeLot) || 0;
            const price = parseFloat(allotissement.prixLot) || 0;
            const orientation = this.getPdfOrientationSummary(lot).label;
            const lotLabel = this.getPdfLotLabel(lot, index);
            totalVolGlobal += volume;

            if (orientation === 'Combustion') {
                bilanMonetaireGlobal -= price;
                volIncin += volume;
                priceIncin += price;
                lotsParOrientation.combustion.push(lotLabel);
            } else {
                bilanMonetaireGlobal += price;
                if (orientation === 'Réemploi') {
                    volReemploi += volume;
                    priceReemploi += price;
                    lotsParOrientation.reemploi.push(lotLabel);
                    lotsCirculaires.push(lotLabel);
                } else if (orientation === 'Réutilisation') {
                    volReutil += volume;
                    priceReutil += price;
                    lotsParOrientation.reutilisation.push(lotLabel);
                    lotsCirculaires.push(lotLabel);
                } else if (orientation === 'Recyclage') {
                    volRecyc += volume;
                    priceRecyc += price;
                    lotsParOrientation.recyclage.push(lotLabel);
                }
            }
        });

        const circularite = totalVolGlobal > 0 ? ((volReemploi + volReutil) / totalVolGlobal) * 100 : 0;
        const volCirculaire = volReemploi + volReutil;
        const partReemploi = totalVolGlobal > 0 ? (volReemploi / totalVolGlobal) * 100 : 0;
        const partReutil = totalVolGlobal > 0 ? (volReutil / totalVolGlobal) * 100 : 0;
        const partRecyc = totalVolGlobal > 0 ? (volRecyc / totalVolGlobal) * 100 : 0;
        const partIncin = totalVolGlobal > 0 ? (volIncin / totalVolGlobal) * 100 : 0;

        return {
            orientations: [
                { label: 'Réemploi', volume: volReemploi, price: priceReemploi, part: partReemploi, lots: lotsParOrientation.reemploi },
                { label: 'Réutilisation', volume: volReutil, price: priceReutil, part: partReutil, lots: lotsParOrientation.reutilisation },
                { label: 'Recyclage', volume: volRecyc, price: priceRecyc, part: partRecyc, lots: lotsParOrientation.recyclage },
                { label: 'Combustion', volume: volIncin, price: priceIncin, part: partIncin, lots: lotsParOrientation.combustion }
            ],
            totalVolume: totalVolGlobal,
            volCirculaire,
            circularite,
            bilanMonetaire: bilanMonetaireGlobal,
            lotsCirculaires
        };
    }

    formatPdfLotsList(lots) {
        return Array.isArray(lots) && lots.length ? lots.join(', ') : '—';
    }

    getPdfLotCompositionValue(lot, fieldName) {
        if (!lot || !fieldName) return '—';

        const allotissement = lot.allotissement || {};
        const aggregated = this.getLotAggregatedTextValue(lot, fieldName);

        // Cas multiples : afficher le décompte "Essence (nb), Essence2 (nb2)"
        if (aggregated === 'Multiples') {
            const counted = this.getLotOrientationCountedDisplay(lot, fieldName);
            return counted || 'Multiples';
        }

        // Cas valeur unique déjà résolue (depuis pièces ou allotissement)
        if (aggregated) {
            if (fieldName === 'essenceNomCommun') {
                return this.getEssenceCommonLabel(aggregated) || aggregated;
            }
            return aggregated;
        }

        // Dernier recours : lecture directe allotissement
        if (fieldName === 'essenceNomCommun') {
            return this.getEssenceCommonLabel(allotissement.essenceNomCommun || allotissement.essence || '') || '—';
        }
        return (allotissement.typePiece || allotissement.typePieces || '').toString().trim() || '—';
    }





    getPdfNotationRowValue(lot, sectionKey, fieldKey) {
        if (sectionKey === 'inspection') {
            const inspection = (lot && lot.inspection) || {};

            if (fieldKey === 'integrite') {
                const integrite = inspection.integrite || {};
                if (integrite.ignore) {
                    return { niveau: 'Ignoré', note: '—' };
                }
                if (!integrite.niveau) {
                    return { niveau: '—', note: '—' };
                }
                const label = integrite.niveau === 'forte'
                    ? 'Forte'
                    : integrite.niveau === 'moyenne'
                        ? 'Moyenne'
                        : 'Faible';
                return {
                    niveau: this.sanitizePdfText(label),
                    note: integrite.coeff != null
                        ? this.sanitizePdfText('Coeff. ' + String(integrite.coeff).replace('.', ','), { preserveLineBreaks: false })
                        : '—'
                };
            }

            const value = inspection[fieldKey];
            if (!value) {
                return { niveau: '—', note: '—' };
            }
            const level = value === 'forte' ? 'Forte' : value === 'moyenne' ? 'Moyenne' : 'Faible';
            const note = value === 'forte' ? '1' : value === 'moyenne' ? '2' : '3';
            return {
                niveau: this.sanitizePdfText(level),
                note: this.sanitizePdfText(note, { preserveLineBreaks: false })
            };
        }

        const section = lot && lot[sectionKey];
        const entry = section && section[fieldKey];
        if (!entry || (!entry.niveau && entry.valeur == null)) {
            return { niveau: '—', note: '—' };
        }

        return {
            niveau: this.sanitizePdfText(entry.niveau || '—'),
            note: this.formatPdfSignedScore(entry.valeur)
        };
    }

    /* ═══════ pdfmake — document definitions ═══════ */

    buildPdfOperationEvalContent() {
        const f = this.getPdfFontScale();
        const opSummary = this.getPdfOperationSummary();
        const rows = opSummary.orientations.map((item) => [
            item.label,
            this.formatPdfVolume(item.volume),
            this.formatPdfCurrency(item.price),
            this.formatPdfPercent(item.part),
            this.formatPdfLotsList(item.lots)
        ]);

        const summaryPairs = [
            { label: 'Volume circulaire', value: this.formatPdfVolume(opSummary.volCirculaire) },
            { label: 'Bilan monétaire', value: this.formatPdfCurrency(opSummary.bilanMonetaire) },
            { label: 'Circularité', value: this.formatPdfPercent(opSummary.circularite) },
            { label: 'Lots circulaires', value: this.formatPdfLotsList(opSummary.lotsCirculaires) }
        ];

        return [
            this.pdfDataTable(['Orientation', 'Volume', 'Prix', 'Part', 'Lots'], rows, {
                fontSize: f.tableCompact,
                widths: ['*', 'auto', 'auto', 'auto', 'auto']
            }),
            { text: '', margin: [0, 4, 0, 0] },
            this.pdfKeyValueGrid(summaryPairs, 4)
        ];
    }

    buildPdfSynthesisDocDef() {
        const f = this.getPdfFontScale();
        const meta = this.data.meta || {};
        const lots = this.data.lots || [];

        const metaPairs = [
            { label: 'Référence gisement', value: this.getReferenceGisement(meta) || '—' },
            { label: 'Opération', value: meta.operation || '—' },
            { label: 'Diagnostiqueur', value: meta.diagnostiqueurContact || '—' },
            { label: 'Localisation', value: meta.localisation || '—' },
            { label: 'Date', value: meta.date || '—' }
        ];

        const lotHeaders = ['Lot', 'Type', 'Produit', 'Essence', 'Volume', 'Prix', 'Orientation', 'Taux', 'Éco', 'Écolo', 'Méca', 'Hist', 'Esth'];
        const lotRows = lots.map((lot, index) => {
            const allotissement = lot.allotissement || {};
            const orientation = this.getPdfOrientationSummary(lot);
            return [
                this.getPdfLotLabel(lot, index),
                this.getPdfLotCompositionValue(lot, 'typePiece'),
                this.getPdfLotCompositionValue(lot, 'typeProduit'),
                this.getPdfLotCompositionValue(lot, 'essenceNomCommun'),
                this.formatPdfVolume(allotissement.volumeLot),
                this.formatPdfCurrency(allotissement.prixLot),
                orientation.label,
                this.formatPdfPercent(orientation.percentage),
                ...this.getPdfCategoryDefinitions().map((c) => this.formatPdfDecimal(parseFloat(orientation.scores[c.key]) || 0, 0, 0) + '/30')
            ];
        });

        const evalContent = this.buildPdfOperationEvalContent();

        return {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [20, 24, 20, 30],
            defaultStyle: { font: 'Roboto', fontSize: f.body },
            styles: this.getPdfmakeStyles(),
            footer: (currentPage, pageCount) => ({
                text: 'Page ' + currentPage + ' / ' + pageCount,
                alignment: 'center',
                fontSize: f.footer,
                color: '#464646',
                margin: [0, 8, 0, 0]
            }),
            content: [
                { text: 'Synthèse de l\u2019évaluation', style: 'title' },
                this.pdfCard('Fiche de l\'opération', [this.pdfKeyValueGrid(metaPairs, 5)]),
                this.pdfCard('Synthèse des lots', [
                    this.pdfDataTable(lotHeaders,
                        lotRows.length ? lotRows : [lotHeaders.map(() => '—')],
                        { fontSize: f.tableCompact, widths: ['auto', '*', '*', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'] }
                    )
                ]),
                this.pdfCard('Évaluation de l\u2019opération', evalContent)
            ]
        };
    }

    // ── Helper: Generate a single gauge SVG ──
    generateGaugeSvg(percent, width = 48, height = 210, color = '#888888') {
        // Ensure percent is between 0 and 100
        percent = Math.min(100, Math.max(0, percent));
        
        // Calculate dimensions for the fill bar
        const fillHeight = (percent / 100) * height;
        const barWidth = Math.round(width * 0.6);  // 60% of width for the bar
        const barX = (width - barWidth) / 2;  // Center horizontally
        const radius = Math.min(barWidth / 2, 6);  // Rounded corners
        
        // Colors
        const backgroundColor = '#E6E6E6';
        const borderColor = '#999999';
        const fillColor = color;
        
        // SVG group with rounded rect for background + rounded rect for fill
        return `<g>
      <rect x="${barX}" y="0" width="${barWidth}" height="${height}" fill="${backgroundColor}" rx="${radius}" ry="${radius}" stroke="${borderColor}" stroke-width="0.5"/>
      <rect x="${barX}" y="${height - fillHeight}" width="${barWidth}" height="${fillHeight}" fill="${fillColor}" rx="${radius}" ry="${radius}"/>
    </g>`;
    }

    // ── Helper: Generate a single horizontal gauge SVG ──
    generateHorizontalGaugeSvg(percent, width = 210, height = 12, color = '#888888') {
        percent = Math.min(100, Math.max(0, percent));
        // We use full width for the bar itself, and center within `height` if needed
        const fillWidth = (percent / 100) * width;
        // In horizontal layout, thickness usually takes most of the height. 
        // We'll occupy 80% of the given height bounding box.
        const barHeight = Math.round(height * 0.8);
        const barY = (height - barHeight) / 2;
        const radius = Math.min(barHeight / 2, 4);

        const backgroundColor = '#E6E6E6';
        const borderColor = '#999999';
        const fillColor = color;

        return `<g>
      <rect x="0" y="${barY}" width="${width}" height="${barHeight}" fill="${backgroundColor}" rx="${radius}" ry="${radius}" stroke="${borderColor}" stroke-width="0.5"/>
      <rect x="0" y="${barY}" width="${fillWidth}" height="${barHeight}" fill="${fillColor}" rx="${radius}" ry="${radius}"/>
    </g>`;
    }

    escapeSvgText(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    generateRadarSvg(data) {
        if (!data || !Array.isArray(data.labels) || !Array.isArray(data.values) || !data.labels.length || data.labels.length !== data.values.length) {
            return null;
        }

        const width = 400;
        const height = 310;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = 100;        // Radar bounds maximized
        const labelRadius = 115;   // Rapproché du radar relatif
        const pointRadius = 5;
        const gridLevels = Array.isArray(data.thresholdLevels) && data.thresholdLevels.length
            ? data.thresholdLevels.map((level) => Math.max(0, Math.min(100, level.value)))
            : [25, 50, 75, 100];
        const axisCount = data.labels.length;
        const startAngle = -Math.PI / 2;
        const angleStep = (Math.PI * 2) / axisCount;
        const toPoint = (value, axisIndex, scaleRadius = radius) => {
            const angle = startAngle + axisIndex * angleStep;
            const scaledRadius = (Math.max(0, Math.min(100, value)) / 100) * scaleRadius;
            return {
                x: Math.cos(angle) * scaledRadius,
                y: Math.sin(angle) * scaledRadius
            };
        };

        const circles = gridLevels.map((level, index) => {
            const ringRadius = (level / 100) * radius;
            const threshold = data.thresholdLevels && data.thresholdLevels[index];
            const stroke = threshold && threshold.color ? threshold.color : '#d9d4ca';
            return `<circle cx="0" cy="0" r="${ringRadius.toFixed(2)}" fill="none" stroke="${stroke}" stroke-opacity="0.45" stroke-width="${level === 100 ? 1.5 : 1.0}"/>`;
        }).join('');

        const axes = data.labels.map((_, axisIndex) => {
            const point = toPoint(100, axisIndex);
            return `<line x1="0" y1="0" x2="${point.x.toFixed(2)}" y2="${point.y.toFixed(2)}" stroke="#000000" stroke-opacity="0.18" stroke-width="1.0"/>`;
        }).join('');

        const polygonPoints = data.values.map((value, axisIndex) => {
            const point = toPoint(value, axisIndex);
            return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
        }).join(' ');

        const dataPoints = data.values.map((value, axisIndex) => {
            const point = toPoint(value, axisIndex);
            return `<circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="${pointRadius}" fill="#000000"/>`;
        }).join('');

        const labels = data.labels.map((label, axisIndex) => {
            const point = toPoint(100, axisIndex, labelRadius);
            const textAnchor = Math.abs(point.x) < 15 ? 'middle' : (point.x > 0 ? 'start' : 'end');
            let textY = point.y;
            if (point.y < -15) textY -= 8;
            else if (point.y > 15) textY += 16;
            else textY += 6;
            return `<text x="${point.x.toFixed(2)}" y="${textY.toFixed(2)}" font-size="18" font-weight="bold" fill="#464646" text-anchor="${textAnchor}">${this.escapeSvgText(label)}</text>`;
        }).join('');

        const thresholdLabels = Array.isArray(data.thresholdLevels)
            ? data.thresholdLevels.map((level) => {
                const y = -((Math.max(0, Math.min(100, level.value)) / 100) * radius);
                const yPos = (y - 4).toFixed(2);
                const text = this.escapeSvgText(level.label);
                // Le contour blanc évite que le texte soit masqué par la grille ou la couleur de fond
                return `<text x="8" y="${yPos}" font-size="9.75" fill="#ffffff" stroke="#ffffff" stroke-width="3" stroke-linejoin="round" text-anchor="start">${text}</text>
                        <text x="8" y="${yPos}" font-size="9.75" fill="${level.color}" text-anchor="start">${text}</text>`;
            }).join('')
            : '';

        return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><g transform="translate(${centerX}, ${centerY})">${circles}${axes}<polygon points="${polygonPoints}" fill="#000000" fill-opacity="0.15" stroke="#000000" stroke-width="1.5"/>${dataPoints}${labels}${thresholdLabels}</g></svg>`;
    }

    buildPdfActiveLotDocDef(lotIndex) {
        const f = this.getPdfFontScale();
        const currentLot = this.data.lots && this.data.lots[lotIndex];
        if (!currentLot) return null;

        // Page geometry (pdfmake uses points, A4 height ≈ 841.89 pt)
        const MM_TO_PT = 72 / 25.4;
        const pageMargins = [10 * MM_TO_PT, 10 * MM_TO_PT, 10 * MM_TO_PT, 10 * MM_TO_PT];
        const PAGE_HEIGHT_PT = 841.89;
        const usableHeightPt = PAGE_HEIGHT_PT - pageMargins[1] - pageMargins[3];

        // Layout presets to compact blocks only when necessary
        const layoutPresets = {
            base: {
                cardPadding: [5, 4, 5, 4],
                blockGap: 4,
                kvRowHeight: 18,
                tableRowHeight: 12,
                tableCompactRowHeight: 11,
                notationRowHeight: 11,
                notationFont: f.notation,
                sectionTitleFont: f.sectionTitle,
                gaugeBarWidth: 48,
                gaugeGapWidth: 8,
                gaugeHeight: 110,
                radarVisualSize: 210
            },
            compact: {
                cardPadding: [4, 3, 4, 3],
                blockGap: 3,
                kvRowHeight: 16,
                tableRowHeight: 11,
                tableCompactRowHeight: 10,
                notationRowHeight: 10,
                notationFont: Math.max(5, f.notation - 0.4),
                sectionTitleFont: Math.max(7, f.sectionTitle - 0.4),
                gaugeBarWidth: 44,
                gaugeGapWidth: 7,
                gaugeHeight: 96,
                radarVisualSize: 190
            },
            ultra: {
                cardPadding: [3, 3, 3, 3],
                blockGap: 2,
                kvRowHeight: 15,
                tableRowHeight: 10.5,
                tableCompactRowHeight: 9.8,
                notationRowHeight: 9.6,
                notationFont: Math.max(5, f.notation - 0.8),
                sectionTitleFont: Math.max(6.6, f.sectionTitle - 0.7),
                gaugeBarWidth: 42,
                gaugeGapWidth: 6,
                gaugeHeight: 88,
                radarVisualSize: 175
            }
        };

        const lineHeight = (size, factor = 1.15) => size * factor;
        const estimateTextLines = (text, charsPerLine = 70) => {
            const t = (text || '').trim();
            if (!t) return 0;
            return Math.max(1, Math.ceil(t.length / charsPerLine));
        };

        const estimateHeights = (preset, moveVisuals) => {
            const titleHeight = lineHeight(f.smallTitle, 1.05) + 2;

            // Opération card
            const metaRows = Math.ceil(5 / 2); // 5 pairs on 2 cols
            const commentLines = estimateTextLines((this.data.meta && this.data.meta.commentaires) || '');
            const commentHeight = commentLines
                ? 4 /* label top */ + lineHeight(f.label, 1.05) + commentLines * lineHeight(f.label, 1.3) + 1
                : 0;
            const cardTitleH = lineHeight(f.cardTitle, 1.1) + 1;
            const cardPadV = preset.cardPadding[1] + preset.cardPadding[3];
            const opCardHeight = cardTitleH + cardPadV + metaRows * preset.kvRowHeight + commentHeight;

            // Évaluation card (table + grid)
            const evalTableRows = 1 /* header */ + 4; // 4 orientations
            const evalTableHeight = evalTableRows * preset.tableCompactRowHeight;
            const evalSummaryHeight = preset.kvRowHeight; // single row grid
            const evalCardHeight = cardTitleH + cardPadV + evalTableHeight + 4 /* spacer */ + evalSummaryHeight;

            // Inspection card (3 rows + header)
            const inspectionRowsCount = 1 + 3;
            const inspectionHeight = cardTitleH + cardPadV + inspectionRowsCount * preset.tableRowHeight + preset.blockGap;

            // Lot card (8 pairs -> 4 rows)
            const lotRows = Math.ceil(8 / 2);
            const lotHeight = cardTitleH + cardPadV + lotRows * preset.kvRowHeight + preset.blockGap;

            // Gauges
            const gaugeLabelsHeight = lineHeight(f.gaugeValue, 1.2) + lineHeight(f.gaugeLabel, 1.05) * 2;
            const gaugesHeight = cardTitleH + (preset.cardPadding[1] + preset.cardPadding[3]) + preset.gaugeHeight + gaugeLabelsHeight + preset.blockGap;

            // Radar
            const radarHeight = cardTitleH + (preset.cardPadding[1] + preset.cardPadding[3]) + preset.radarVisualSize + preset.blockGap;

            // Notation grid: 10 sections => 5 rows in 2 cols
            const sectionTitleHeight = lineHeight(preset.sectionTitleFont, 1.05) + 2;
            const sectionTableHeight = (1 + 5) * preset.notationRowHeight + 4; // header + 5 rows + padding
            const sectionHeight = sectionTitleHeight + sectionTableHeight;
            const notationHeight = 5 * sectionHeight + 6; // 5 rows of sections + table padding overhead

            const visualsHeight = gaugesHeight + radarHeight;
            const opEvalHeight = opCardHeight + preset.blockGap + evalCardHeight + preset.blockGap;
            const leftHeight = opEvalHeight + inspectionHeight + lotHeight + (moveVisuals ? 0 : visualsHeight);
            const leftWithoutVisualsHeight = opEvalHeight + inspectionHeight + lotHeight;
            const mainHeight = Math.max(leftHeight, notationHeight);

            return {
                titleHeight,
                leftHeight,
                leftWithoutVisualsHeight,
                notationHeight,
                visualsHeight,
                mainHeight,
                totalHeight: titleHeight + mainHeight
            };
        };

        const pickPreset = () => {
            let presetKey = 'base';
            let moveVisuals = false;
            let metrics = estimateHeights(layoutPresets[presetKey], moveVisuals);

            const switchPreset = (key) => {
                presetKey = key;
                metrics = estimateHeights(layoutPresets[presetKey], moveVisuals);
            };

            // 1) Try compacting
            if (metrics.totalHeight > usableHeightPt) {
                switchPreset('compact');
            }

            // 2) Move visuals if height still high
            if (metrics.totalHeight > usableHeightPt && metrics.visualsHeight > 0) {
                moveVisuals = true;
                metrics = estimateHeights(layoutPresets[presetKey], moveVisuals);
            }

            // 3) Ultra compact if needed
            if (metrics.totalHeight > usableHeightPt) {
                switchPreset('ultra');
                if (metrics.totalHeight > usableHeightPt && metrics.visualsHeight > 0 && !moveVisuals) {
                    moveVisuals = true;
                    metrics = estimateHeights(layoutPresets[presetKey], moveVisuals);
                } else if (metrics.totalHeight > usableHeightPt && moveVisuals) {
                    metrics = estimateHeights(layoutPresets[presetKey], moveVisuals);
                }
            }

            // 4) If top + main still exceeds, fallback to page breaking between blocks
            let forcePageBreakBeforeMain = false;
            let forceStackLayout = false;
            if (metrics.totalHeight > usableHeightPt) {
                forcePageBreakBeforeMain = true;
                // Ensure main block alone fits; otherwise stack layout will handle breaks per block
                if (metrics.mainHeight > usableHeightPt) {
                    forceStackLayout = true;
                }
            }

            return { presetKey, moveVisuals, metrics, forcePageBreakBeforeMain, forceStackLayout };
        };

        const { presetKey, moveVisuals, metrics, forcePageBreakBeforeMain, forceStackLayout } = pickPreset();
        const preset = layoutPresets[presetKey];

        const meta = this.data.meta || {};
        const allotissement = currentLot.allotissement || {};
        const integrity = currentLot.inspection && currentLot.inspection.integrite;

        const blockGapPt = preset.blockGap;
        const cardPadding = preset.cardPadding;
        const notationFontSize = preset.notationFont;
        const sectionTitleFontSize = preset.sectionTitleFont;

        // ── Opération card ──
        const metaPairs = [
            { label: 'Référence gisement', value: this.getReferenceGisement(meta) || '—' },
            { label: 'Opération', value: meta.operation || '—' },
            { label: 'Diagnostiqueur', value: meta.diagnostiqueurContact || '—' },
            { label: 'Localisation', value: meta.localisation || '—' },
            { label: 'Date', value: meta.date || '—' }
        ];
        const metaContent = [this.pdfKeyValueGrid(metaPairs, 2)];
        if (meta.commentaires && meta.commentaires.trim()) {
            metaContent.push(
                { text: 'COMMENTAIRES', style: 'kvLabel', margin: [0, 4, 0, 1] },
                { text: meta.commentaires, fontSize: f.label, lineHeight: 1.3 }
            );
        }

        // ── Fiche lot card ──
        const hasDetailDimensions = this.getLotQuantityFromDetail(currentLot) > 0;
        const displayLongueur = hasDetailDimensions ? String(Math.round(allotissement._avgLongueur || 0)) : (allotissement.longueur || '');
        const displayLargeur  = hasDetailDimensions ? String(Math.round(allotissement._avgLargeur  || 0)) : (allotissement.largeur  || '');
        const displayEpaisseur  = hasDetailDimensions ? String(Math.round(allotissement._avgEpaisseur  || 0)) : (allotissement.epaisseur  || '');
        const displayDiametre = allotissement.diametre || '';
        const hasDim = displayLongueur !== '' || displayLargeur !== '' || displayEpaisseur !== '' || displayDiametre !== '';
        let dimensionsValue;
        if (!hasDim) {
            dimensionsValue = '—';
        } else if (displayDiametre !== '') {
            dimensionsValue = (displayLongueur ? displayLongueur + ' × ' : '') + 'ø' + displayDiametre;
        } else {
            dimensionsValue = [displayLongueur, displayLargeur, displayEpaisseur].map((v) => v || '0').join(' × ');
        }

        const lotPairs = [
            { label: 'Type de pièces', value: this.getPdfLotCompositionValue(currentLot, 'typePiece') },
            { label: 'Type de produit', value: this.getPdfLotCompositionValue(currentLot, 'typeProduit') },
            { label: 'Essence', value: this.getPdfLotCompositionValue(currentLot, 'essenceNomCommun') },
            { label: 'Quantité', value: allotissement.quantite != null && allotissement.quantite !== '' ? String(allotissement.quantite) : '—' },
            { label: 'Dimensions moyennes (mm) (L × l × e)', value: dimensionsValue },
            { label: 'Volume lot', value: this.formatPdfVolume(allotissement.volumeLot) },
            { label: 'Prix marché /m³', value: this.formatPdfCurrency(parseFloat(allotissement.prixMarche) || 0) },
            { label: 'Coeff. intégrité', value: integrity && integrity.ignore ? 'Ignoré' : integrity && integrity.coeff != null ? String(integrity.coeff).replace('.', ',') : '—' },
            { label: 'Prix lot', value: this.formatPdfCurrency(allotissement.prixLot) }
        ];

        // ── Inspection card ──
        const inspectionRows = this.getPdfSectionDefinitions()
            .find((s) => s.key === 'inspection')
            .rows.map((rowDef) => {
                const rv = this.getPdfNotationRowValue(currentLot, 'inspection', rowDef.key);
                return [rowDef.label, rv.niveau, rv.note];
            });

        // ── Évaluation opération card (version adaptée demi-largeur) ──
        const opSummary = this.getPdfOperationSummary();
        const evalRows = opSummary.orientations.map((item) => [
            item.label,
            this.formatPdfVolume(item.volume),
            this.formatPdfCurrency(item.price),
            this.formatPdfPercent(item.part)
        ]);
        const evalSummaryPairs = [
            { label: 'Volume circulaire', value: this.formatPdfVolume(opSummary.volCirculaire) },
            { label: 'Bilan monétaire', value: this.formatPdfCurrency(opSummary.bilanMonetaire) },
            { label: 'Circularité', value: this.formatPdfPercent(opSummary.circularite) },
            { label: 'Lots circulaires', value: this.formatPdfLotsList(opSummary.lotsCirculaires) }
        ];
        const evalContent = [
            this.pdfDataTable(['Orientation', 'Volume', 'Prix', 'Part'], evalRows, {
                fontSize: f.tableCompact,
                widths: ['*', '*', '*', '*']
            }),
            { text: '', margin: [0, 4, 0, 0] },
            this.pdfKeyValueGrid(evalSummaryPairs, 2)
        ];


        // ── Labels & Jauges (colonnes individuelles) ──
        let jaugesData = null;
        const seuilsSource = document.getElementById('seuils-section');
        if (seuilsSource) {
            const labels = seuilsSource.querySelectorAll('.seuils-label');
            const percents = seuilsSource.querySelectorAll('.seuils-percent');
            const scores = seuilsSource.querySelectorAll('.seuils-score-box');
            if (labels.length) {
                jaugesData = [];
                labels.forEach((lbl, i) => {
                    const labelStr = (lbl.textContent || '').trim();
                    const percentStr = percents[i] ? (percents[i].textContent || '').trim() : '';
                    const scoreStr = scores[i] ? (scores[i].textContent || '').trim() : '';
                    const percentVal = percentStr === "…" ? 0 : parseInt(percentStr) || 0;
                    
                    let color = '#cccccc';
                    if (percentVal > 0) {
                        const threshold = this.getOrientationThresholdForPercent(percentVal);
                        if (threshold && threshold.color) color = threshold.color;
                    }

                    jaugesData.push({
                        labelStr,
                        percentStr,
                        scoreStr,
                        percentVal,
                        color
                    });
                });
            }
        }

        // ── Radar (vecteur SVG) ──
        const radarScores = this.getValueScoresForLot(currentLot);
        const radarLabels = ['Économique', 'Écologique', 'Mécanique', 'Historique', 'Esthétique'];
        const toRadarPercent = (score) => Math.min(100, Math.max(0, Math.round(((score || 0) / 30) * 100)));
        const radarValues = [
            toRadarPercent(radarScores.economique),
            toRadarPercent(radarScores.ecologique),
            toRadarPercent(radarScores.mecanique),
            toRadarPercent(radarScores.historique),
            toRadarPercent(radarScores.esthetique)
        ];
        const radarThresholdLevels = this.getOrientationThresholdConfig().map((threshold) => ({
            value: threshold.radarValue,
            label: threshold.radarLabel,
            color: threshold.color
        }));
        const radarSvg = this.generateRadarSvg({
            labels: radarLabels,
            values: radarValues,
            thresholdLevels: radarThresholdLevels
        });

        const operationCard = this.pdfCard('Fiche de l\'opération', metaContent, { margin: [0, 0, 0, 0], padding: cardPadding, unbreakable: true });
        const evalCard = this.pdfCard('Évaluation de l\'opération', evalContent, { margin: [0, 0, 0, 0], padding: cardPadding, unbreakable: true });
        const inspectionCard = this.pdfCard('Inspection', [
            this.pdfDataTable(['Critère', 'Niveau', 'Note'], inspectionRows, { fontSize: f.table })
        ], { margin: [0, 0, 0, blockGapPt], padding: cardPadding, unbreakable: true });
        const lotCard = this.pdfCard('Fiche du lot', [this.pdfKeyValueGrid(lotPairs, 2)], { margin: [0, 0, 0, blockGapPt], padding: cardPadding, unbreakable: true });

        const pageWidthPt = 595.28; // A4 width in points
        const usableWidthPt = pageWidthPt - pageMargins[0] - pageMargins[2];
        const columnGapPt = 8;
        const halfWidth = Math.floor((usableWidthPt - columnGapPt) / 2);

        // ── Contraindre les visuels à halfWidth ──
        const visualPad = cardPadding[0] + cardPadding[2] + 2; // padding horizontal total + marge table
        const maxVisualContentWidth = halfWidth - visualPad;

        // Build Gauges Card with horizontal stacked layout
        const buildGaugesStacked = (totalAvailableWidth) => {
            const gaugeThickness = 12; // Thin horizontal bars
            const labelWidth = 65;
            const valueWidth = 45;
            const gap = 5;
            const barWidth = Math.max(50, totalAvailableWidth - labelWidth - valueWidth - (gap * 2));

            const rows = jaugesData.map(g => {
                const svgContent = this.generateHorizontalGaugeSvg(g.percentVal, barWidth, gaugeThickness, g.color);
                const svgString = `<svg width="${barWidth}" height="${gaugeThickness}" viewBox="0 0 ${barWidth} ${gaugeThickness}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
                
                return {
                    columns: [
                        { width: labelWidth, text: g.labelStr, bold: true, fontSize: f.gaugeLabel, alignment: 'right', margin: [0, 1.5, 0, 0] },
                        { width: barWidth, svg: svgString, margin: [0, 1.5, 0, 0] },
                        { width: valueWidth, text: `${g.percentStr} (${g.scoreStr})`, fontSize: f.gaugeLabel, bold: true, alignment: 'left', margin: [0, 1.5, 0, 0] }
                    ],
                    columnGap: gap,
                    margin: [0, 0, 0, 6] // vertical gap between gauges
                };
            });

            if (rows.length > 0) {
                rows[rows.length - 1].margin = [0, 0, 0, 0];
            }

            return {
                stack: rows
            };
        };

        let gaugesCard = null;
        let radarCard = null;
        if (jaugesData && jaugesData.length > 0) {
            const gaugesStack = buildGaugesStacked(maxVisualContentWidth);
            gaugesCard = this.pdfCard(null, [gaugesStack], {
                margin: [0, 0, 0, blockGapPt],
                padding: [Math.max(3, cardPadding[0] - 1), Math.max(4, cardPadding[1] + 2), Math.max(3, cardPadding[2] - 1), Math.max(4, cardPadding[3] + 2)],
                unbreakable: true
            });
        }

        if (radarSvg) {
            const scaledRadarSize = Math.floor(Math.min(preset.radarVisualSize, maxVisualContentWidth));
            radarCard = this.pdfCard(null, [
                { svg: radarSvg, width: scaledRadarSize, alignment: 'center' }
            ], { margin: [0, 0, 0, blockGapPt], padding: cardPadding.map(p => Math.ceil(p / 2)), unbreakable: true });
        }

        // Colonne gauche : Inspection -> Fiche lot (sans visuels)
        const visualBlocks = [];
        if (gaugesCard) visualBlocks.push(gaugesCard);
        if (radarCard) visualBlocks.push(radarCard);

        const mainLeftStack = [inspectionCard, lotCard];
        if (mainLeftStack.length) {
            mainLeftStack[mainLeftStack.length - 1].margin = [0, 0, 0, 0];
        }

        // Titre pleine largeur
        const topCards = [
            { text: this.getPdfLotLabel(currentLot, lotIndex), style: 'smallTitle' }
        ];

        // ── Bottom grid: 10 notation sections in 5-col layout ──
        // Flatten to a single table per section (no pdfCard wrapper) to avoid 3-level nesting
        const c = this.getPdfmakeColors();
        const notationSections = this.getPdfSectionDefinitions().filter((s) => s.key !== 'inspection');
        const notationCells = notationSections.map((sectionDef) => {
            const headRow = [
                    { text: this.sanitizePdfText('Critère'), bold: true, fontSize: notationFontSize, color: c.labelColor, fillColor: c.headerBg },
                    { text: this.sanitizePdfText('Niveau'), bold: true, fontSize: notationFontSize, color: c.labelColor, fillColor: c.headerBg },
                    { text: this.sanitizePdfText('Note'), bold: true, fontSize: notationFontSize, color: c.labelColor, fillColor: c.headerBg }
            ];
            const dataRows = sectionDef.rows.map((rowDef, rowIdx) => {
                const rv = this.getPdfNotationRowValue(currentLot, sectionDef.key, rowDef.key);
                const bg = rowIdx % 2 === 1 ? c.altRowBg : null;
                return [
                        { text: this.sanitizePdfText(rowDef.label), fontSize: notationFontSize, fillColor: bg },
                        { text: this.sanitizePdfText(rv.niveau), fontSize: notationFontSize, fillColor: bg },
                        { text: this.sanitizePdfText(rv.note), fontSize: notationFontSize, fillColor: bg }
                ];
            });
            return {
                stack: [
                    { text: this.sanitizePdfText(sectionDef.title), bold: true, fontSize: sectionTitleFontSize, margin: [0, 0, 0, 2] },
                    {
                        table: { dontBreakRows: true, headerRows: 1, widths: ['auto', '*', 'auto'], body: [headRow, ...dataRows] },
                        layout: {
                            hLineWidth: () => 0.3,
                            vLineWidth: () => 0,
                            hLineColor: () => '#eee7db',
                            paddingLeft: () => 3,
                            paddingRight: () => 3,
                            paddingTop: () => 2,
                            paddingBottom: () => 2
                        }
                    }
                ],
                fillColor: c.cardBg,
                unbreakable: true
            };
        });

        // Build grid rows (2 columns × 5 rows)
        const gridRows = [];
        for (let i = 0; i < notationCells.length; i += 2) {
            const row = [];
            for (let j = 0; j < 2; j++) {
                row.push(notationCells[i + j] || { text: '' });
            }
            gridRows.push(row);
        }

        const notationGrid = {
            table: {
                dontBreakRows: true,
                widths: ['*', '*'],
                body: gridRows
            },
            layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => c.border,
                vLineColor: () => c.border,
                paddingLeft: () => 3,
                paddingRight: () => 3,
                paddingTop: () => 3,
                paddingBottom: () => 3,
                defaultBorder: false,
                borderRadius: () => 4
            },
            unbreakable: true
        };

        // Colonne gauche unifiée : Opération + Évaluation + Inspection + Lot + Visuels
        const fullLeftStack = [
            operationCard,
            { text: '', margin: [0, blockGapPt, 0, 0] },
            evalCard,
            { text: '', margin: [0, blockGapPt, 0, 0] },
            ...mainLeftStack
        ];

        const mainColumns = {
            columns: [
                {
                    width: halfWidth,
                    stack: fullLeftStack
                },
                {
                    width: halfWidth,
                    stack: [
                        notationGrid,
                        ...(visualBlocks.length ? [
                            { text: '', margin: [0, blockGapPt, 0, 0] },
                            ...visualBlocks
                        ] : [])
                    ]
                }
            ],
            columnGap: columnGapPt,
            unbreakable: true // Force l'ensemble à rester sur la même page
        };

        // Fallback: stacked layout when columns still too tall
        const stackedBlocks = [];
        const mainLeftStackHeight = metrics.leftHeight;
        const notationHeight = metrics.notationHeight;
        const visualsHeight = metrics.visualsHeight;

        const needsBreakBeforeLeft = metrics.titleHeight + mainLeftStackHeight > usableHeightPt;
        const remainingAfterLeft = usableHeightPt - mainLeftStackHeight;
        const needsBreakBeforeNotation = (needsBreakBeforeLeft ? usableHeightPt : remainingAfterLeft) < notationHeight;
        const remainingAfterNotation = usableHeightPt - notationHeight;
        // On désactive le saut de page forcé pour les blocs visuels pour les garder groupés
        const needsBreakBeforeVisuals = false; 

        if (forceStackLayout) {
            stackedBlocks.push({ stack: fullLeftStack, margin: [0, 0, 0, blockGapPt], pageBreak: needsBreakBeforeLeft ? 'before' : undefined });
            stackedBlocks.push({ ...notationGrid, pageBreak: needsBreakBeforeNotation ? 'before' : undefined });
            if (visualBlocks.length) {
                stackedBlocks.push({
                    columns: [
                        { width: halfWidth, text: '' },
                        { width: halfWidth, stack: visualBlocks }
                    ],
                    columnGap: columnGapPt,
                    margin: [0, blockGapPt, 0, 0],
                    unbreakable: true
                });
            }
        }

        const content = [...topCards];
        if (forceStackLayout) {
            content.push(...stackedBlocks);
        } else {
            content.push({ ...mainColumns, pageBreak: forcePageBreakBeforeMain ? 'before' : undefined });
        }

        return {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins,
            defaultStyle: { font: 'Roboto', fontSize: f.body },
            styles: this.getPdfmakeStyles(),
            footer: (currentPage, pageCount) => ({
                text: 'Page ' + currentPage + ' / ' + pageCount,
                alignment: 'center',
                fontSize: f.footer,
                color: '#464646',
                margin: [0, 6, 0, 0]
            }),
            content
        };
    }





    normalizeDecimalForCsv(value) {
        if (value == null) return '';
        if (typeof value === 'number') return Number.isFinite(value) ? value : '';
        return String(value).replace(/(\d),(\d)/g, '$1.$2');
    }

    escapeCsvValue(value) {
        const normalized = value == null ? '' : String(value);
        return '"' + normalized.replace(/"/g, '""') + '"';
    }

    downloadCsvFile(filename, headers, rows) {
        const lines = [];
        lines.push(headers.map((h) => this.escapeCsvValue(h)).join(';'));
        rows.forEach((row) => {
            lines.push(row.map((cell) => this.escapeCsvValue(cell)).join(';'));
        });

        const csvContent = '\uFEFF' + lines.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    buildCsvRowsForLots(lotIndices) {
        const categories = this.getPdfCategoryDefinitions();
        const sections = this.getPdfSectionDefinitions();
        const meta = this.data.meta || {};

        const headers = ['Champ'].concat(
            lotIndices.map((index) => this.getPdfLotLabel(this.data.lots[index], index))
        );

        const fieldDefs = [
            // --- MÉTA-DONNÉES GLOBALES ---
            { label: 'Référence gisement', getValue: () => this.getReferenceGisement(meta) || '-' },
            { label: 'Date du diagnostic', getValue: () => meta.date || '-' },
            { label: 'Opération', getValue: () => meta.operation || '-' },
            { label: 'Version de l\'étude', getValue: () => meta.versionEtude || '-' },
            { label: 'Statut de l\'étude', getValue: () => meta.statutEtude || '-' },
            { label: 'Révision', getValue: () => meta.revision !== undefined ? meta.revision : '-' },
            
            // --- DIAGNOSTIQUEUR ---
            { label: 'Diagnostiqueur (Structure)', getValue: () => meta.diagnostiqueurNom || '-' },
            { label: 'Diagnostiqueur (Contact)', getValue: () => meta.diagnostiqueurContact || '-' },
            { label: 'Diagnostiqueur (Mail)', getValue: () => meta.diagnostiqueurMail || '-' },
            { label: 'Diagnostiqueur (Tél)', getValue: () => meta.diagnostiqueurTelephone || '-' },
            { label: 'Diagnostiqueur (Adresse)', getValue: () => meta.diagnostiqueurAdresse || '-' },
            
            // --- MAÎTRISE D'OUVRAGE ---
            { label: 'Maîtrise d\'ouvrage (Structure)', getValue: () => meta.maitriseOuvrageNom || '-' },
            { label: 'Maîtrise d\'ouvrage (Contact)', getValue: () => meta.maitriseOuvrageContact || '-' },
            { label: 'Maîtrise d\'ouvrage (Mail)', getValue: () => meta.maitriseOuvrageMail || '-' },
            { label: 'Maîtrise d\'ouvrage (Tél)', getValue: () => meta.maitriseOuvrageTelephone || '-' },
            { label: 'Maîtrise d\'ouvrage (Adresse)', getValue: () => meta.maitriseOuvrageAdresse || '-' },

            // --- MAÎTRISE D'ŒUVRE ---
            { label: 'Maîtrise d\'œuvre (Structure)', getValue: () => meta.maitriseOeuvreNom || '-' },
            { label: 'Maîtrise d\'œuvre (Contact)', getValue: () => meta.maitriseOeuvreContact || '-' },
            { label: 'Maîtrise d\'œuvre (Mail)', getValue: () => meta.maitriseOeuvreMail || '-' },
            { label: 'Maîtrise d\'œuvre (Tél)', getValue: () => meta.maitriseOeuvreTelephone || '-' },
            { label: 'Maîtrise d\'œuvre (Adresse)', getValue: () => meta.maitriseOeuvreAdresse || '-' },

            // --- DECONSTRUCTION / CURAGE ---
            { label: 'Ent. curage/déconstruction (Struct.)', getValue: () => meta.entrepriseDeconstructionNom || '-' },
            { label: 'Ent. curage/déconstruction (Contact)', getValue: () => meta.entrepriseDeconstructionContact || '-' },
            { label: 'Ent. curage/déconstruction (Mail)', getValue: () => meta.entrepriseDeconstructionMail || '-' },
            { label: 'Ent. curage/déconstruction (Tél)', getValue: () => meta.entrepriseDeconstructionTelephone || '-' },
            { label: 'Ent. curage/déconstruction (Adresse)', getValue: () => meta.entrepriseDeconstructionAdresse || '-' },

            // --- CONTEXTE TECHNIQUE ---
            { label: 'Type de bâtiment', getValue: () => meta.typeBatiment || '-' },
            { label: 'Période de construction', getValue: () => meta.periodeConstruction || '-' },
            { label: 'Phase d\'intervention', getValue: () => meta.phaseIntervention || '-' },
            { label: 'Localisation', getValue: () => meta.localisation || '-' },
            { label: 'Conditionnement', getValue: () => meta.conditionnementType || '-' },
            { label: 'Protection', getValue: () => meta.protectionType || '-' },
            { label: 'Diagnostic Structure', getValue: () => meta.diagnosticStructure || '-' },
            { label: 'Diagnostic Amiante', getValue: () => meta.diagnosticAmiante || '-' },
            { label: 'Diagnostic Plomb', getValue: () => meta.diagnosticPlomb || '-' },
            { label: 'Commentaires généraux', getValue: () => meta.commentaires || '-' },

            // --- INFORMATIONS DU LOT ---
            { label: 'Nom du lot', getValue: (lot) => (lot && lot.nom) || '-' },
            { label: 'Localisation du lot', getValue: (lot) => (lot && lot.localisation) || '-' },
            { label: 'Situation du lot', getValue: (lot) => (lot && lot.situation) || '-' },
            { label: 'Destination', getValue: (lot) => ((lot && lot.allotissement) || {}).destination || '-' },
            { label: 'Type de pièces', getValue: (lot) => ((lot && lot.allotissement) || {}).typePiece || '-' },
            { label: 'Type de produit', getValue: (lot) => ((lot && lot.allotissement) || {}).typeProduit || '-' },
            { label: 'Essence', getValue: (lot) => {
                const allotissement = (lot && lot.allotissement) || {};
                return allotissement.essenceNomCommun || allotissement.essence || '-';
            } },

            // --- CARACTÉRISTIQUES DIMENSIONNELLES ---
            { label: 'Quantité', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).quantite;
                return (v != null && v !== '') ? v : '-';
            } },
            { label: 'Longueur (mm)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).longueur;
                return (v != null && v !== '') ? v : '-';
            } },
            { label: 'Largeur (mm)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).largeur;
                return (v != null && v !== '') ? v : '-';
            } },
            { label: 'Hauteur / Epaisseur (mm)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).epaisseur;
                return (v != null && v !== '') ? v : '-';
            } },
            { label: 'Diamètre (mm)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).diametre;
                return (v != null && v !== '') ? v : '-';
            } },
            
            // --- VOLUMÉTRIE & MASSES ---
            { label: 'Surface par pièce (m2)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).surfacePiece;
                return (v ? parseFloat(v) : '-') || '-';
            } },
            { label: 'Surface lot (m2)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).surfaceLot;
                return (v ? parseFloat(v) : '-') || '-';
            } },
            { label: 'Volume par pièce (m3)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).volumePiece;
                return (v ? parseFloat(v) : '-') || '-';
            } },
            { label: 'Volume lot (m3)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).volumeLot;
                return (v ? parseFloat(v) : '-') || '-';
            } },
            { label: 'Linéaire lot (m)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).lineaireLot;
                return (v ? parseFloat(v) : '-') || '-';
            } },
            
            // --- MASSE & CARBONE ---
            { label: 'Masse volumique est. (kg/m3)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).masseVolumique;
                return (v != null && v !== '') ? parseFloat(v) : '-';
            } },
            { label: 'Humidité (%)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).humidite;
                return (v != null && v !== '') ? parseFloat(v) : '-';
            } },
            { label: 'Fraction carbonée (%)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).fractionCarbonee;
                return (v != null && v !== '') ? parseFloat(v) : '-';
            } },
            { label: 'Proportion de bois (%)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).bois;
                return (v != null && v !== '') ? parseFloat(v) : '-';
            } },
            { label: 'Masse du lot (kg)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).masseLot;
                return (v ? parseFloat(v) : '-') || '-';
            } },
            { label: 'Carbone biogénique (kgCO2eq)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).carboneBiogeniqueEstime;
                return (v != null && v !== '') ? parseFloat(v) : '-';
            } },

            // --- ASPECT ÉCONOMIQUE ---
            { label: 'Unité de tarification', getValue: (lot) => ((lot && lot.allotissement) || {}).prixUnite || '-' },
            { label: 'Prix marché', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).prixMarche;
                return (v != null && v !== '') ? parseFloat(v) : '-';
            } },
            { label: 'Prix lot base (€)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).prixLot;
                return (v != null && v !== '') ? Math.round(parseFloat(v)) : '-';
            } },
            { label: 'Prix lot aj. intégrité (€)', getValue: (lot) => {
                const v = ((lot && lot.allotissement) || {}).prixLotAjusteIntegrite;
                return (v != null && v !== '') ? Math.round(parseFloat(v)) : '-';
            } },

            // --- RÉSULTATS D'AIDE À LA DÉCISION ---
            { label: 'Orientation', getValue: (lot) => this.getPdfOrientationSummary(lot).label || '-' },
            { label: 'Orientation (%)', getValue: (lot) => {
                const v = this.getPdfOrientationSummary(lot).percentage;
                return (v != null && v !== '') ? this.formatPdfDecimal(v, 1, 1) : '-';
            } }
        ];

        categories.forEach((category) => {
            fieldDefs.push({
                label: `Score ${category.label} (/30)`,
                getValue: (lot) => parseFloat(this.getPdfOrientationSummary(lot).scores[category.key]) || 0
            });
        });

        sections.forEach((section) => {
            section.rows.forEach((rowDef) => {
                fieldDefs.push({
                    label: `${section.title} - ${rowDef.label} (Niveau)`,
                    getValue: (lot) => this.getPdfNotationRowValue(lot, section.key, rowDef.key).niveau || '-'
                });
                fieldDefs.push({
                    label: `${section.title} - ${rowDef.label} (Note)`,
                    getValue: (lot) => {
                        const note = this.getPdfNotationRowValue(lot, section.key, rowDef.key).note;
                        return (note != null && note !== '') ? note : '-';
                    }
                });
            });
        });

        const rows = fieldDefs.map((field) => {
            const row = [field.label];
            lotIndices.forEach((index) => {
                row.push(this.normalizeDecimalForCsv(field.getValue(this.data.lots[index], index)));
            });
            return row;
        });

        return { headers, rows };
    }

    exportToCsv(mode = 'synthese', lotIndices = []) {
        let validLotIndices = [];

        if (mode === 'synthese') {
            validLotIndices = (this.data.lots || []).map((_, index) => index);
        } else {
            validLotIndices = Array.isArray(lotIndices)
                ? lotIndices.filter((index) => Number.isInteger(index) && this.data.lots[index])
                : [];
        }

        if (!validLotIndices.length) {
            alert('Aucun lot valide sélectionné pour l’export CSV.');
            return;
        }

        const { headers, rows } = this.buildCsvRowsForLots(validLotIndices);
        const stamp = new Date().toISOString().slice(0, 10);
        const suffix = mode === 'synthese'
            ? 'synthese'
            : (validLotIndices.length > 1 ? 'lots_selectionnes' : 'lot_selectionne');

        this.downloadCsvFile(`valobois_evaluation_${suffix}_${stamp}.csv`, headers, rows);
    }


    exportToPdf(mode = 'synthese', lotIndices = []) {
        if (typeof pdfMake === 'undefined') {
            alert('Export PDF indisponible (bibliothèque pdfmake manquante).');
            return;
        }

        if (mode === 'lots-selectionnes') {
            this.exportSelectedLotsToPdf(lotIndices);
            return;
        }

        try {
            const docDef = this.buildPdfSynthesisDocDef();
            const stamp = new Date().toISOString().slice(0, 10);
            pdfMake.createPdf(docDef).download('valobois_evaluation_synthese_' + stamp + '.pdf');
        } catch (error) {
            console.error(error);
            alert('Une erreur est survenue pendant la génération du PDF.');
        }
    }

    async exportSelectedLotsToPdf(lotIndices) {
        const validLotIndices = Array.isArray(lotIndices) ? lotIndices.filter((index) => Number.isInteger(index) && this.data.lots[index]) : [];
        if (!validLotIndices.length) {
            alert('Aucun lot valide sélectionné pour l\u2019export.');
            return;
        }

        if (typeof pdfMake === 'undefined') {
            alert('Export PDF indisponible (bibliothèque pdfmake manquante).');
            return;
        }

        const previousLotIndex = this.currentLotIndex;

        try {
            const docDefPages = [];

            for (let i = 0; i < validLotIndices.length; i++) {
                const lotIndex = validLotIndices[i];
                this.currentLotIndex = lotIndex;
                this.render();
                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

                const lotDocDef = this.buildPdfActiveLotDocDef(lotIndex);
                if (!lotDocDef) continue;
                docDefPages.push(lotDocDef);
            }

            if (!docDefPages.length) {
                alert('Aucun lot valide à exporter.');
                return;
            }

            // Merge all lot doc definitions into a single document
            const mergedContent = [];
            docDefPages.forEach((dd, idx) => {
                if (idx > 0) {
                    mergedContent.push({ text: '', pageBreak: 'before' });
                }
                mergedContent.push(...(Array.isArray(dd.content) ? dd.content : [dd.content]));
            });

            const mergedDocDef = {
                ...docDefPages[0],
                content: mergedContent
            };

            const stamp = new Date().toISOString().slice(0, 10);
            const suffix = validLotIndices.length > 1 ? 'lots_selectionnes' : 'lot_selectionne';
            pdfMake.createPdf(mergedDocDef).download('valobois_evaluation_' + suffix + '_' + stamp + '.pdf');
        } catch (error) {
            console.error(error);
            alert('Une erreur est survenue pendant la génération du PDF.');
        } finally {
            this.currentLotIndex = previousLotIndex;
            this.render();
        }
    }

   
} // FERMETURE DE LA CLASSE ValoboisApp

window.addEventListener('DOMContentLoaded', () => {
    new ValoboisApp();
});
