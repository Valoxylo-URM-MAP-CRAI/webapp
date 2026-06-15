(function (global) {
    'use strict';

    function normalizeTextLevel(value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    function normalizeProductType(value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function parsePositiveDimensionValue(value) {
        var normalized = String(value == null ? '' : value)
            .replace(/,/g, '.')
            .trim();
        var num = parseFloat(normalized);
        return Number.isFinite(num) && num > 0 ? num : null;
    }

    function valoboisGetSimilarityStrategy(lot) {
        var raw = lot && lot.allotissement ? lot.allotissement.similarityStrategy : null;
        var key = ((raw || '') + '').toLowerCase();
        if (key === 'single' || key === 'multiple') return key;
        return 'single';
    }

    function valoboisIsValidMesuresMultiplesSection(section) {
        if (!section || typeof section !== 'object') return false;
        var type = ((section.typeSection || '') + '').toLowerCase();
        var d = parseFloat(section.diametre);
        var l = parseFloat(section.largeur);
        var e = parseFloat(section.epaisseur);
        if (type === 'circ' || type === 'circle') return Number.isFinite(d) && d > 0;
        if (type === 'rect' || type === 'rectangle') return Number.isFinite(l) && l > 0 && Number.isFinite(e) && e > 0;
        if (Number.isFinite(d) && d > 0) return true;
        return Number.isFinite(l) && l > 0 && Number.isFinite(e) && e > 0;
    }

    function valoboisGetAmortissementAlertState(amortissementValue) {
        var num = parseFloat(String(amortissementValue || '').replace(/,/, '.'));
        if (!isFinite(num) || amortissementValue === '—' || amortissementValue === null || amortissementValue === '') {
            return 'missing';
        }
        if (num >= 1) return 'strong';
        if (num > 0.5) return 'medium';
        return 'low';
    }

    function valoboisGetIntegriteBioAlertState(lot) {
        var niveau = normalizeTextLevel(lot && lot.bio && lot.bio.integriteBio ? lot.bio.integriteBio.niveau : '');
        return niveau === 'faible' ? 'active' : 'none';
    }

    function valoboisGetIntegriteMechAlertState(lot) {
        var niveau = normalizeTextLevel(lot && lot.mech && lot.mech.integriteMech ? lot.mech.integriteMech.niveau : '');
        return niveau === 'faible' ? 'active' : 'none';
    }

    function valoboisGetPurgeAlertState(lot) {
        var niveau = normalizeTextLevel(lot && lot.bio && lot.bio.integriteBio ? lot.bio.integriteBio.niveau : '');
        return niveau === 'faible' ? 'active' : 'none';
    }

    function valoboisComputeAmortissementBiologique(ageArbre, dateMiseEnService, evaluationDate) {
        var age = parseFloat(ageArbre);
        if (!isFinite(age) || age <= 0) return '—';

        function extractYear(value) {
            if (!value) return null;
            var m = String(value).match(/\b(\d{4})\b/);
            return m ? parseInt(m[1], 10) : null;
        }

        var evalYear = extractYear(evaluationDate);
        var serviceYear = extractYear(dateMiseEnService);
        if (evalYear == null || serviceYear == null) return '—';

        var diff = evalYear - serviceYear;
        if (diff <= 0) return '—';

        var result = diff / age;
        var locale = typeof getValoboisIntlLocale === 'function' ? getValoboisIntlLocale() : 'fr-FR';
        return result.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    function valoboisGetGlobalLockState(lot, options) {
        var opts = options || {};
        var expansion = normalizeTextLevel(lot && lot.bio && lot.bio.expansion ? lot.bio.expansion.niveau : '');
        var contamination = normalizeTextLevel(lot && lot.denat && lot.denat.contaminationDenat ? lot.denat.contaminationDenat.niveau : '');
        if (opts.expansionGateEnabled && expansion === 'forte') return { locked: true, reason: 'expansion-forte' };
        if (opts.contaminationGateEnabled && contamination === 'forte') return { locked: true, reason: 'contamination-forte' };
        return { locked: false, reason: null };
    }

    function valoboisGetAlterationLockState(lot, options) {
        var opts = options || {};
        var alteration = normalizeTextLevel(lot && lot.traces && lot.traces.alterationTraces ? lot.traces.alterationTraces.niveau : '');
        if (opts.alterationGateEnabled && alteration === 'forte') return { locked: true, reason: 'alteration-forte' };
        return { locked: false, reason: null };
    }

    function valoboisGetAlterationAlertState(lot) {
        var alteration = normalizeTextLevel(lot && lot.traces && lot.traces.alterationTraces ? lot.traces.alterationTraces.niveau : '');
        return alteration === 'forte' ? 'active' : 'none';
    }

    function valoboisIsIgnoredByReason(lot, reason, lockField) {
        if (!reason) return false;
        var field = lockField || 'ignoredBy';
        var locked = lot && lot.locked ? lot.locked : null;
        return (locked ? locked[field] : null) === reason;
    }

    function valoboisGetNotationModeNormalizedField(section, field) {
        if (section === 'bio' && field === 'expositionBio') return 'exposition';
        return field;
    }

    function valoboisGetExpansionAlertState(lot) {
        var expansion = normalizeTextLevel(lot && lot.bio && lot.bio.expansion ? lot.bio.expansion.niveau : '');
        return expansion === 'forte' ? 'active' : 'none';
    }

    function valoboisGetContaminationAlertState(lot) {
        var contamination = normalizeTextLevel(lot && lot.denat && lot.denat.contaminationDenat ? lot.denat.contaminationDenat.niveau : '');
        return contamination === 'forte' ? 'active' : 'none';
    }

    function valoboisGetDurabiliteConfDenatAlertState(input) {
        var data = input || {};

        function isStrongLevel(value) {
            var normalized = normalizeTextLevel(value);
            return normalized === 'fort' || normalized === 'forte';
        }

        if (!(isStrongLevel(data.durabiliteLevel) && !isStrongLevel(data.depollutionLevel))) {
            return 'none';
        }

        var hardLockActive = !data.hardLockIgnored && (
            normalizeTextLevel(data.expansionLevel) === 'forte' ||
            normalizeTextLevel(data.contaminationLevel) === 'forte'
        );

        var doubleLowIntegrite =
            normalizeTextLevel(data.integriteBioLevel) === 'faible' &&
            normalizeTextLevel(data.integriteMechLevel) === 'faible';

        return (hardLockActive || doubleLowIntegrite) ? 'none' : 'active';
    }

    function valoboisGetIndustrialiteAlertState(typeProduitValue) {
        var typeProduit = normalizeProductType(typeProduitValue);
        if (!typeProduit) return 'none';

        if (
            typeProduit === normalizeProductType('Bois Lamellé-Collé (BLC)') ||
            typeProduit === normalizeProductType('Bois Massif Abouté (BMA)') ||
            typeProduit === normalizeProductType('Bois Contre-Collé (CC)') ||
            typeProduit === normalizeProductType('Bois Lamellé-Croisé (CLT)') ||
            typeProduit === normalizeProductType('Bois Ossature (BO)') ||
            typeProduit === normalizeProductType('Bois Fermette (BF)') ||
            typeProduit === normalizeProductType('Bois Massif Reconstitué (BMR)')
        ) {
            return 'strong';
        }

        if (
            typeProduit === normalizeProductType('Bois Raboté Séché (BRS)') ||
            typeProduit === normalizeProductType('Bois Brut Sec (BBS)') ||
            typeProduit === normalizeProductType('Bois Avivé (BA)')
        ) {
            return 'medium';
        }

        if (
            typeProduit === normalizeProductType('Bois Non Taillé (BNT)') ||
            typeProduit === normalizeProductType('Bois Équarri Non Scié (BENS)')
        ) {
            return 'low';
        }

        return 'none';
    }

    function valoboisGetArtisanaliteAlertState(typeProduitValue) {
        var typeProduit = normalizeProductType(typeProduitValue);
        if (!typeProduit) return 'none';

        if (
            typeProduit === normalizeProductType('Bois Brut Sec (BBS)') ||
            typeProduit === normalizeProductType('Bois Non Taillé (BNT)') ||
            typeProduit === normalizeProductType('Bois Avivé (BA)') ||
            typeProduit === normalizeProductType('Bois Équarri Non Scié (BENS)')
        ) {
            return 'strong';
        }

        if (
            typeProduit === normalizeProductType('Bois Raboté Séché (BRS)') ||
            typeProduit === normalizeProductType('Bois Ossature (BO)')
        ) {
            return 'medium';
        }

        if (
            typeProduit === normalizeProductType('Bois Lamellé-Collé (BLC)') ||
            typeProduit === normalizeProductType('Bois Lamellé-Croisé (CLT)') ||
            typeProduit === normalizeProductType('Bois Massif Abouté (BMA)') ||
            typeProduit === normalizeProductType('Bois Massif Reconstitué (BMR)') ||
            typeProduit === normalizeProductType('Bois Contre-Collé') ||
            typeProduit === normalizeProductType('Bois Contre-Collé (CC)') ||
            typeProduit === normalizeProductType('Bois Fermette (BF)')
        ) {
            return 'low';
        }

        return 'none';
    }

    function valoboisGetNaturaliteAlertState(typeProduitValue, diametreValue) {
        var typeProduit = normalizeProductType(typeProduitValue);
        var hasDiametre = diametreValue != null && String(diametreValue).trim() !== '';

        if (!typeProduit) return 'none';

        if (
            hasDiametre &&
            (
                typeProduit === normalizeProductType('Bois Brut Sec (BBS)') ||
                typeProduit === normalizeProductType('Bois Non Taillé (BNT)') ||
                typeProduit === normalizeProductType('Bois Équarri Non Scié (BENS)')
            )
        ) {
            return 'strong';
        }

        if (
            typeProduit === normalizeProductType('Bois Raboté Séché (BRS)') ||
            typeProduit === normalizeProductType('Bois Contre-Collé (CC)') ||
            typeProduit === normalizeProductType('Bois Lamellé-Collé (BLC)') ||
            typeProduit === normalizeProductType('Bois Lamellé-Croisé (CLT)') ||
            typeProduit === normalizeProductType('Bois Ossature (BO)') ||
            typeProduit === normalizeProductType('Bois Fermette (BF)') ||
            typeProduit === normalizeProductType('Bois Massif Abouté (BMA)') ||
            typeProduit === normalizeProductType('Bois Massif Reconstitué (BMR)')
        ) {
            return 'medium';
        }

        return 'none';
    }

    function valoboisGetStabiliteAlertState(longueurValue, largeurValue, epaisseurValue, diametreValue) {
        var longueur = parsePositiveDimensionValue(longueurValue);
        var largeur = parsePositiveDimensionValue(largeurValue);
        var epaisseur = parsePositiveDimensionValue(epaisseurValue);
        var diametre = parsePositiveDimensionValue(diametreValue);

        if (diametre) {
            epaisseur = diametre;
            largeur = diametre;
        }

        if (!longueur || !epaisseur || !largeur) return 'none';

        if (epaisseur < largeur) {
            var temp = epaisseur;
            epaisseur = largeur;
            largeur = temp;
        }

        var ratioLe = longueur / epaisseur;
        var ratioBe = largeur / epaisseur;
        if (!Number.isFinite(ratioLe) || !Number.isFinite(ratioBe) || ratioLe <= 0 || ratioBe <= 0) {
            return 'none';
        }

        if (ratioLe <= 18 && ratioBe >= 0.4) return 'strong';

        if (
            (ratioLe <= 18 && ratioBe >= 0.25 && ratioBe < 0.4) ||
            (ratioLe > 18 && ratioLe <= 28 && ratioBe >= 0.25)
        ) {
            return 'medium';
        }

        if (ratioLe > 28 || ratioBe < 0.25) return 'low';
        return 'none';
    }

    function valoboisGetInclusiviteAlertState(input) {
        var data = input || {};

        var regularite = String(data.regulariteLevel || '').trim();
        var rusticite = String(data.rusticiteLevel || '').trim();
        var deformation = String(data.deformationLevel || '').trim();
        var rawScore = String(data.medoideScore == null ? '' : data.medoideScore).replace(/,/, '.').trim();
        var score = parseFloat(rawScore);

        if (!regularite || !rusticite || !deformation || !Number.isFinite(score)) return 'none';

        if ((regularite === 'Faible' || rusticite === 'Forte' || deformation === 'Forte') && score < 66) {
            return 'low';
        }

        if (regularite === 'Forte' && rusticite === 'Faible' && deformation === 'Faible' && score >= 66) {
            return 'strong';
        }

        if (
            (regularite === 'Forte' || regularite === 'Moyenne') &&
            (rusticite === 'Faible' || rusticite === 'Moyenne') &&
            (deformation === 'Faible' || deformation === 'Moyenne') &&
            score < 66
        ) {
            return 'medium';
        }

        return 'none';
    }

    function valoboisGetHumiditeUsageAlertState(averageHumidity) {
        if (!Number.isFinite(averageHumidity)) return 'none';
        if (averageHumidity >= 22) return 'strong';
        if (averageHumidity <= 8) return 'low';
        return 'medium';
    }

    function valoboisGetMasseVolEssenceAlertState(density) {
        if (!Number.isFinite(density)) return 'none';
        if (density > 750) return 'strong';
        if (density >= 450) return 'medium';
        return 'low';
    }

    function valoboisGetBioExpositionAlertState(activeClass) {
        var value = String(activeClass || '').trim();
        if (value === '5' || value === '4' || value === '3.2') return 'strong';
        if (value === '3.1') return 'medium';
        if (value === '2' || value === '1') return 'low';
        return 'none';
    }

    function valoboisGetMechExpositionLongeviteAlertState(recommendation) {
        var value = String(recommendation || '').trim();
        if (value === 'Forte') return 'strong';
        if (value === 'Moyenne') return 'medium';
        if (value === 'Faible') return 'low';
        return 'none';
    }

    function valoboisGetRareteEcoEssenceAlertState(level) {
        var value = String(level || '').trim();
        if (value === 'Commune') return 'strong';
        if (value === 'Peu commune') return 'medium';
        if (value === 'Rare') return 'low';
        return 'none';
    }

    function valoboisGetFeuMechAlertState(details) {
        var data = details || {};
        if (!data.hasMinimumData) return 'none';
        if (Array.isArray(data.blockers) && data.blockers.length > 0) return 'low';
        if (Number(data.availableCount) >= 4 && Number(data.score) >= 6) return 'strong';
        if (Number(data.score) >= 2) return 'medium';
        return 'low';
    }

    function valoboisGetMacroHistoireAlertState(details) {
        var data = details || {};
        if (!data.hasMinimumData) return 'none';
        if (Number(data.score) >= 6 && Number(data.availableCount) >= 3) return 'strong';
        if (Number(data.score) >= 2) return 'medium';
        return 'low';
    }

    function valoboisGetVieillissementAlertState(details) {
        var data = details || {};
        if (!data.hasMinimumData || !data.businessLevel) return 'none';
        if (data.businessLevel === 'Forte') return 'low';
        if (data.businessLevel === 'Moyenne') return 'medium';
        return 'strong';
    }

    function valoboisGetMassiviteAlertState(epaisseurValue) {
        var num = parseFloat(String(epaisseurValue || '').replace(/,/, '.'));
        if (!isFinite(num) || epaisseurValue === null || epaisseurValue === '') return 'none';
        if (num > 75) return 'strong';
        if (num > 28) return 'medium';
        return 'low';
    }

    function valoboisGetVolumetrieAlertState(volumetrieValue) {
        var num = parseFloat(String(volumetrieValue || '').replace(/,/, '.'));
        if (!isFinite(num) || volumetrieValue === null || volumetrieValue === '' || num <= 0) return 'none';
        if (num > 0.1) return 'strong';
        if (num >= 0.05) return 'medium';
        return 'low';
    }

    function valoboisGetEmploymentClassOrderValue(classRaw) {
        var value = String(classRaw || '').trim();
        if (value === '1') return 1;
        if (value === '2') return 2;
        if (value === '3.1') return 3.1;
        if (value === '3.2') return 3.2;
        if (value === '4') return 4;
        if (value === '5') return 5;
        return null;
    }

    function valoboisNormalizeConfidenceAlertText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    }

    function valoboisGetConfidenceAlertState(noteLevel, studyStatus) {
        var normalizedStatus = valoboisNormalizeConfidenceAlertText(studyStatus);
        var normalizedLevel = valoboisNormalizeConfidenceAlertText(noteLevel);
        var isEarlyStudy = normalizedStatus === 'pre-diagnostic' || normalizedStatus === 'en cours';
        var isLateStudy = normalizedStatus === 'finalise' || normalizedStatus === 'revision' || normalizedStatus === 'cloture';

        if (isEarlyStudy) {
            if (normalizedLevel === 'forte') return 'strong';
            if (normalizedLevel === 'moyenne' || normalizedLevel === 'faible') return 'medium';
            return 'low';
        }

        if (isLateStudy) {
            return normalizedLevel === 'forte' ? 'strong' : 'low';
        }

        if (normalizedLevel === 'forte') return 'strong';
        if (normalizedLevel === 'moyenne' || normalizedLevel === 'faible') return 'medium';
        return 'low';
    }

    function valoboisGetConfidenceAlertStateLabel(alertState) {
        if (alertState === 'strong') return 'verte';
        if (alertState === 'medium') return 'orange';
        if (alertState === 'low') return 'rouge';
        return 'inactive';
    }

    global.valoboisGetSimilarityStrategy = valoboisGetSimilarityStrategy;
    global.valoboisIsValidMesuresMultiplesSection = valoboisIsValidMesuresMultiplesSection;
    global.valoboisGetAmortissementAlertState = valoboisGetAmortissementAlertState;
    global.valoboisComputeAmortissementBiologique = valoboisComputeAmortissementBiologique;
    global.valoboisGetIntegriteBioAlertState = valoboisGetIntegriteBioAlertState;
    global.valoboisGetIntegriteMechAlertState = valoboisGetIntegriteMechAlertState;
    global.valoboisGetPurgeAlertState = valoboisGetPurgeAlertState;
    global.valoboisGetGlobalLockState = valoboisGetGlobalLockState;
    global.valoboisGetAlterationLockState = valoboisGetAlterationLockState;
    global.valoboisGetAlterationAlertState = valoboisGetAlterationAlertState;
    global.valoboisIsIgnoredByReason = valoboisIsIgnoredByReason;
    global.valoboisGetNotationModeNormalizedField = valoboisGetNotationModeNormalizedField;
    global.valoboisGetExpansionAlertState = valoboisGetExpansionAlertState;
    global.valoboisGetContaminationAlertState = valoboisGetContaminationAlertState;
    global.valoboisGetDurabiliteConfDenatAlertState = valoboisGetDurabiliteConfDenatAlertState;
    global.valoboisGetIndustrialiteAlertState = valoboisGetIndustrialiteAlertState;
    global.valoboisGetArtisanaliteAlertState = valoboisGetArtisanaliteAlertState;
    global.valoboisGetNaturaliteAlertState = valoboisGetNaturaliteAlertState;
    global.valoboisGetStabiliteAlertState = valoboisGetStabiliteAlertState;
    global.valoboisGetInclusiviteAlertState = valoboisGetInclusiviteAlertState;
    global.valoboisGetHumiditeUsageAlertState = valoboisGetHumiditeUsageAlertState;
    global.valoboisGetMasseVolEssenceAlertState = valoboisGetMasseVolEssenceAlertState;
    global.valoboisGetBioExpositionAlertState = valoboisGetBioExpositionAlertState;
    global.valoboisGetMechExpositionLongeviteAlertState = valoboisGetMechExpositionLongeviteAlertState;
    global.valoboisGetRareteEcoEssenceAlertState = valoboisGetRareteEcoEssenceAlertState;
    global.valoboisGetFeuMechAlertState = valoboisGetFeuMechAlertState;
    global.valoboisGetMacroHistoireAlertState = valoboisGetMacroHistoireAlertState;
    global.valoboisGetVieillissementAlertState = valoboisGetVieillissementAlertState;
    global.valoboisGetMassiviteAlertState = valoboisGetMassiviteAlertState;
    global.valoboisGetVolumetrieAlertState = valoboisGetVolumetrieAlertState;
    global.valoboisGetEmploymentClassOrderValue = valoboisGetEmploymentClassOrderValue;
    global.valoboisNormalizeConfidenceAlertText = valoboisNormalizeConfidenceAlertText;
    global.valoboisGetConfidenceAlertState = valoboisGetConfidenceAlertState;
    global.valoboisGetConfidenceAlertStateLabel = valoboisGetConfidenceAlertStateLabel;
})(typeof window !== 'undefined' ? window : globalThis);