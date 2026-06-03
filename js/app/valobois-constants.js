(function (global) {
    'use strict';

    var VALOBOIS_STORAGE_KEYS = Object.freeze({
        storageKey: 'valobois_v1',
        storageBackupKey: 'valobois_v1_backup',
        cloudDraftStoragePrefix: 'valobois_cloud_draft_v1',
        matrixConfigStorageKey: 'valobois_matrix_config',
        locSitGlobalStorageKey: 'valobois_locsit_custom_global_v1',
        rareteCustomGlobalStorageKey: 'valobois_rarete_custom_global_v1'
    });

    var NOTATION_MODE_SECTION_SELECTORS = [
        { section: 'bio', rowSelector: '.bio-row', fieldAttr: 'data-bio-field' },
        { section: 'mech', rowSelector: '.mech-row', fieldAttr: 'data-mech-field' },
        { section: 'usage', rowSelector: '.usage-row', fieldAttr: 'data-usage-field' },
        { section: 'denat', rowSelector: '.denat-row', fieldAttr: 'data-denat-field' },
        { section: 'debit', rowSelector: '.debit-row', fieldAttr: 'data-debit-field' },
        { section: 'geo', rowSelector: '.geo-row', fieldAttr: 'data-geo-field' },
        { section: 'essence', rowSelector: '.essence-row', fieldAttr: 'data-essence-field' },
        { section: 'ancien', rowSelector: '.ancien-row', fieldAttr: 'data-ancien-field' },
        { section: 'traces', rowSelector: '.traces-row', fieldAttr: 'data-traces-field' },
        { section: 'provenance', rowSelector: '.provenance-row', fieldAttr: 'data-provenance-field' }
    ];

    var VALOBOIS_META_REQUIRED_FIELDS = Object.freeze({
        operationReference: Object.freeze([
            'operation',
            'date',
            'versionEtude',
            'statutEtude',
            'typeOperation',
            'surfacePlancher_demolition',
            'surfacePlancher_renovation',
            'nbBatiments_demolition',
            'nbBatiments_renovation',
            'dateDebutChantier'
        ]),
        diagnostiqueur: Object.freeze([
            'diagnostiqueurNom',
            'diagnostiqueurContact',
            'diagnostiqueurMail',
            'diagnostiqueurTelephone',
            'diagnostiqueurAdresse'
        ]),
        contacts: Object.freeze([
            'maitriseOuvrageNom', 'maitriseOuvrageContact', 'maitriseOuvrageMail',
            'maitriseOuvrageTelephone', 'maitriseOuvrageAdresse',
            'maitriseOeuvreNom', 'maitriseOeuvreContact', 'maitriseOeuvreMail',
            'maitriseOeuvreTelephone', 'maitriseOeuvreAdresse',
            'entrepriseDeconstructionNom', 'entrepriseDeconstructionContact', 'entrepriseDeconstructionMail',
            'entrepriseDeconstructionTelephone', 'entrepriseDeconstructionAdresse'
        ]),
        contexteTechnique: Object.freeze([
            'typeBatiment',
            'periodeConstruction',
            'datePermisConstruction',
            'historiqueRenovationImportante',
            'historiqueDecontamination',
            'historiqueAutreIntervention',
            'phaseIntervention',
            'localisation',
            'conditionnementType',
            'protectionType'
        ]),
        diagnostiqueurPemd: Object.freeze([
            'diagPEMDNom',
            'diagPEMDContact',
            'diagPEMDMail',
            'diagPEMDTelephone',
            'diagPEMDAdresse',
            'diagPEMDSiret',
            'diagPEMDAssuranceCompagnie',
            'diagPEMDAssurancePolice',
            'diagPEMDAssuranceDebut',
            'diagPEMDAssuranceFin',
            'diagPEMDCompetencesJustifiables'
        ]),
        diagnosticPemdVisite: Object.freeze([
            'dateVisite',
            'partiesVisitees',
            'partiesNonVisitees',
            'raisonsNonVisite',
            'vicesApparents',
            'precautionsDemolition'
        ])
    });

    var VALOBOIS_CONFIDENCE_ALERT_CONFIG = Object.freeze({
        confianceBio: Object.freeze({
            label: 'Dégradation biologique',
            sectionKey: 'bio',
            detailBackdropId: 'bioDetailModalBackdrop',
            detailTitleId: 'bioDetailModalTitle',
            detailContentId: 'bioDetailModalContent',
            rowSelector: '.bio-row[data-bio-field="confianceBio"]'
        }),
        confianceMech: Object.freeze({
            label: 'Dégradation mécanique',
            sectionKey: 'mech',
            detailBackdropId: 'mechDetailModalBackdrop',
            detailTitleId: 'mechDetailModalTitle',
            detailContentId: 'mechDetailModalContent',
            rowSelector: '.mech-row[data-mech-field="confianceMech"]'
        }),
        confianceUsage: Object.freeze({
            label: 'Classement d’usage',
            sectionKey: 'usage',
            detailBackdropId: 'usageDetailModalBackdrop',
            detailTitleId: 'usageDetailModalTitle',
            detailContentId: 'usageDetailModalContent',
            rowSelector: '.usage-row[data-usage-field="confianceUsage"]'
        }),
        confianceDenat: Object.freeze({
            label: 'Dénaturation',
            sectionKey: 'denat',
            detailBackdropId: 'denatDetailModalBackdrop',
            detailTitleId: 'denatDetailModalTitle',
            detailContentId: 'denatDetailModalContent',
            rowSelector: '.denat-row[data-denat-field="confianceDenat"]'
        }),
        confianceEssence: Object.freeze({
            label: 'Essence',
            sectionKey: 'essence',
            detailBackdropId: 'essenceDetailModalBackdrop',
            detailTitleId: 'essenceDetailModalTitle',
            detailContentId: 'essenceDetailModalContent',
            rowSelector: '.essence-row[data-essence-field="confianceEssence"]'
        }),
        confianceAncien: Object.freeze({
            label: 'Ancienneté',
            sectionKey: 'ancien',
            detailBackdropId: 'ancienDetailModalBackdrop',
            detailTitleId: 'ancienDetailModalTitle',
            detailContentId: 'ancienDetailModalContent',
            rowSelector: '.ancien-row[data-ancien-field="confianceAncien"]'
        }),
        confianceTraces: Object.freeze({
            label: 'Traces',
            sectionKey: 'traces',
            detailBackdropId: 'tracesDetailModalBackdrop',
            detailTitleId: 'tracesDetailModalTitle',
            detailContentId: 'tracesDetailModalContent',
            rowSelector: '.traces-row[data-traces-field="confianceTraces"]'
        }),
        confianceProv: Object.freeze({
            label: 'Provenance',
            sectionKey: 'provenance',
            detailBackdropId: 'provenanceDetailModalBackdrop',
            detailTitleId: 'provenanceDetailModalTitle',
            detailContentId: 'provenanceDetailModalContent',
            rowSelector: '.provenance-row[data-provenance-field="confianceProv"]'
        })
    });

    var VALOBOIS_STUDY_STATUS_VALUES = Object.freeze([
        'Pré-diagnostic',
        'En cours',
        'Finalisé',
        'Révision',
        'Cloturé'
    ]);

    var VALOBOIS_STUDY_STATUS_HELP_TEXTS = Object.freeze([
        'Ce statut est recommandé pour initier le diagnostic en renseignant tous les champs de description de l’opération. En pré-diagnostic il est conseillé d’initier une première démarche d’évaluation en créant des lots de pièces par défaut, afin de disposer d’un aperçu rapide de la qualité du gisement. Dans ce statut la notation des critères peut être partielle.',
        'Ce statut est recommandé pour étendre le Pré-diagnostic et détailler le contenu des lots pièce par pièce. Dans ce statut la notation des critères doit être complète.',
        'Ce statut est recommandé pour affiner les informations et le contenu des lots. Il est possible de modifier des éléments préalablement renseignés, supprimer des pièces ou des lots.',
        'Ce statut ne permet pas de supprimer des lots ou de pièces. Les éléments précédemment notés peuvent être désactivés et seront conservés. Des duplicatas de correction peuvent être généré. Les lots ou pièces qui pourraient être supprimés seront signalés comme des « pertes ». Suivant la même logique, les données ne peuvent pas être réinitialisées. Le signalement de ce statut est à privilégier dans une situation de récolement, après le déconstruction ou le transfert de propriété des bois.',
        'Cette évaluation est clôturée, seul sa lecture et les fonctionnalités d’exports restent encore opérationnelles.'
    ]);

    var VALOBOIS_ANALYSIS_LOT_SELECTOR_CONFIG = Object.freeze({
        seuils: Object.freeze({ triggerId: 'seuilsActiveLotLabel', menuId: 'seuilsLotSelectorMenu' }),
        radar: Object.freeze({ triggerId: 'radarActiveLotLabel', menuId: 'radarLotSelectorMenu' }),
        scatterDims: Object.freeze({ triggerId: 'scatterDimsActiveLotLabel', menuId: 'scatterDimsLotSelectorMenu' })
    });

    var VALOBOIS_ANALYSIS_LOT_SELECTOR_KEYS = Object.freeze(['seuils', 'radar', 'scatterDims']);

    var VALOBOIS_ORIENTATION_THRESHOLD_DESCRIPTORS = Object.freeze([
        Object.freeze({
            code: 'recyclage',
            orientationLabel: 'Recyclage',
            radarLabelKey: 'editor.radar.thresholdRecyclable',
            radarLabelFallback: 'Recyclable',
            color: '#E69F00'
        }),
        Object.freeze({
            code: 'reutilisation',
            orientationLabel: 'Réutilisation',
            radarLabelKey: 'editor.radar.thresholdReutilisable',
            radarLabelFallback: 'Réutilisable',
            color: '#56B4E9'
        }),
        Object.freeze({
            code: 'reemploi',
            orientationLabel: 'Réemploi',
            radarLabelKey: 'editor.radar.thresholdReemployable',
            radarLabelFallback: 'Réemployable',
            color: '#009E73'
        })
    ]);

    var VALOBOIS_ETIQUETTE_QR_CONFIG = Object.freeze({
        baseUrl: 'https://valoxylo.app',
        maxTextLength: 120,
        maxHtmlPayloadLength: 800,
        publicPieceFields: Object.freeze([
            'lotRef',
            'pieceLabel',
            'essence',
            'essenceScientifique',
            'dimensions',
            'typePiece',
            'orientation',
            'volumeM3',
            'origine',
            'diagnostiqueur',
            'operation',
            'diagDate'
        ])
    });

    var VALOBOIS_BARCODE_COMPOSER_DEFAULT_CONFIG = Object.freeze({
        lotNum: true,
        pieceNum: true,
        payloadFormat: 'compact',
        essence: true,
        essenceEn13556: false,
        longueur: false,
        largeur: false,
        epaisseur: false,
        mesuresMultiplesE1: false,
        mesuresMultiplesQ1: false,
        mesuresMultiplesMi: false,
        mesuresMultiplesQ3: false,
        mesuresMultiplesE2: false,
        mesuresMultiplesDetail: false,
        largeurExtremes: false,
        epaisseurExtremes: false,
        diametreExtremes: false,
        orientationAbbr: true,
        prixUnitaire: false,
        masseUnitaire: false,
        pco2Unitaire: false,
        typePieceAbbr: true,
        amortissementBio: false,
        dateMiseService: false,
        volumeUnitaire: false,
        scoreNetMax: false,
        classementEstime: true,
        durabiliteNaturelle: false,
        customInfos: false,
        macroHistoire: false,
        contamination: true
    });

    var VALOBOIS_DEFAULT_NOTATION_MODE_ORIENTATION_THRESHOLDS = Object.freeze({
        recyclage: Object.freeze({ fort: 9, moyen: 9, faible: 9 }),
        reutilisation: Object.freeze({ fort: 15, moyen: 15, faible: 15 }),
        reemploi: Object.freeze({ fort: 21, moyen: 21, faible: 21 })
    });

    var VALOBOIS_BARCODE_COMPOSER_OPTIONAL_FIELDS_ORDER = Object.freeze([
        'orientationAbbr',
        'scoreNetMax',
        'classementEstime',
        'macroHistoire',
        'contamination',
        'essence',
        'essenceEn13556',
        'longueur',
        'largeur',
        'epaisseur',
        'mesuresMultiplesE1',
        'mesuresMultiplesQ1',
        'mesuresMultiplesMi',
        'mesuresMultiplesQ3',
        'mesuresMultiplesE2',
        'largeurExtremes',
        'epaisseurExtremes',
        'diametreExtremes',
        'prixUnitaire',
        'masseUnitaire',
        'pco2Unitaire',
        'typePieceAbbr',
        'amortissementBio',
        'dateMiseService',
        'volumeUnitaire',
        'durabiliteNaturelle',
        'customInfos'
    ]);

    var VALOBOIS_BARCODE_COMPOSER_FIELD_SCOPE_MAP = Object.freeze({
        essence: 'piece',
        essenceEn13556: 'piece',
        longueur: 'piece',
        largeur: 'piece',
        epaisseur: 'piece',
        mesuresMultiplesE1: 'piece',
        mesuresMultiplesQ1: 'piece',
        mesuresMultiplesMi: 'piece',
        mesuresMultiplesQ3: 'piece',
        mesuresMultiplesE2: 'piece',
        mesuresMultiplesDetail: 'piece',
        largeurExtremes: 'piece',
        epaisseurExtremes: 'piece',
        diametreExtremes: 'piece',
        orientationAbbr: 'lot',
        prixUnitaire: 'piece',
        masseUnitaire: 'piece',
        pco2Unitaire: 'piece',
        typePieceAbbr: 'piece',
        volumeUnitaire: 'piece',
        amortissementBio: 'piece',
        dateMiseService: 'piece',
        scoreNetMax: 'lot',
        classementEstime: 'lot',
        durabiliteNaturelle: 'piece',
        customInfos: 'piece',
        macroHistoire: 'lot',
        contamination: 'lot'
    });

    var VALOBOIS_TAUX_LOGIC_STRATEGY_TEXTS = Object.freeze({
        labels: Object.freeze({
            single: 'Mesure unique',
            multiple: 'Mesures multiples'
        }),
        introByStrategy: Object.freeze({
            single: 'Mode mesure unique: les indicateurs reposent sur les dimensions scalaires saisies (L, l, e, d).',
            multiple: 'Mode mesures multiples: la pièce type et le taux de similarité intègrent les sections mesurées quand elles sont disponibles.'
        }),
        tauxByStrategy: Object.freeze({
            single: 'Le score de conformité est calculé sur les dimensions directes de chaque pièce.',
            multiple: 'Le score de conformité utilise prioritairement les dimensions issues des mesures multiples lorsqu’elles sont disponibles (dont le diamètre en mode cylindrique).'
        }),
        medoidByStrategy: Object.freeze({
            single: 'Le médoïde est déterminé uniquement à partir des dimensions scalaires.',
            multiple: 'Le médoïde est déterminé à partir des dimensions enrichies, y compris le diamètre lorsqu’il est mesuré en sections.'
        })
    });

    var VALOBOIS_MEDOID_EMPTY_LABEL = 'Non calculé (≥ 2 pièces requises)';

    var VALOBOIS_SIMILARITY_STRATEGY_LABELS = Object.freeze({
        single: 'Mesure unique',
        multiple: 'Mesures multiples'
    });

    var VALOBOIS_ORIENTATION_LABELS = Object.freeze({
        reemploi: 'Réemploi',
        reutilisation: 'Réutilisation',
        recyclage: 'Recyclage',
        combustion: 'Combustion',
        none: '…'
    });

    var VALOBOIS_DETAIL_MODAL_TITLES = Object.freeze({
        inspection_fr: Object.freeze({
            visibilite: 'Visibilité - Accessibilité',
            instrumentation: 'Instrumentation',
            modesNotation: 'Modes de notation',
            statutBois: 'Statut du bois',
            integrite: 'Intégrité générale'
        }),
        inspection_en: Object.freeze({
            visibilite: 'Visibility - Access',
            instrumentation: 'Instrumentation',
            modesNotation: 'Scoring modes',
            statutBois: 'Wood status',
            integrite: 'Overall integrity'
        }),
        bio: Object.freeze({
            purge: 'Purge des dégradations biologiques',
            expansion: 'Expansion',
            integriteBio: 'Intégrité biologique',
            exposition: 'Exposition biologique',
            confianceBio: 'Confiance'
        }),
        mech: Object.freeze({
            purgeMech: 'Purge des dégradations mécaniques',
            feuMech: 'Feu',
            integriteMech: 'Intégrité mécanique',
            expositionMech: 'Exposition mécanique',
            confianceMech: 'Confiance'
        }),
        usage: Object.freeze({
            confianceUsage: 'Confiance',
            durabiliteUsage: 'Durabilité naturelle',
            classementUsage: 'Classement estimé',
            humiditeUsage: 'Humidité',
            aspectUsage: 'Aspect'
        }),
        denat: Object.freeze({
            depollutionDenat: 'Dépollution',
            contaminationDenat: 'Contamination',
            durabiliteConfDenat: 'Durabilité conférée',
            confianceDenat: 'Confiance',
            naturaliteDenat: 'Naturalité'
        }),
        debit: Object.freeze({
            regulariteDebit: 'Régularité',
            volumetrieDebit: 'Volumétrie',
            stabiliteDebit: 'Stabilité',
            artisanaliteDebit: 'Artisanalité',
            rusticiteDebit: 'Rusticité'
        }),
        geo: Object.freeze({
            adaptabiliteGeo: 'Adaptabilité',
            massiviteGeo: 'Massivité',
            deformationGeo: 'Déformation',
            industrialiteGeo: 'Industrialité',
            inclusiviteGeo: 'Inclusivité'
        }),
        essence: Object.freeze({
            confianceEssence: 'Confiance',
            rareteEcoEssence: 'Rareté',
            masseVolEssence: 'Masse volumique',
            rareteHistEssence: 'Rareté commerciale',
            singulariteEssence: 'Singularité essence'
        }),
        ancien: Object.freeze({
            confianceAncien: 'Confiance',
            amortissementAncien: 'Amortissement',
            vieillissementAncien: 'Vieillissement',
            microhistoireAncien: 'Micro-histoire',
            demontabiliteAncien: 'Démontabilité'
        }),
        traces: Object.freeze({
            confianceTraces: 'Confiance',
            etiquetageTraces: 'Étiquetage',
            alterationTraces: 'Altération',
            documentationTraces: 'Documentation',
            singularitesTraces: 'Singularités tracéologiques'
        }),
        provenance: Object.freeze({
            confianceProv: 'Confiance',
            transportProv: 'Transport',
            reputationProv: 'Réputation',
            macroProv: 'Macro-histoire',
            territorialiteProv: 'Territorialité'
        })
    });

    var VALOBOIS_DURABILITE_DC_LABELS = Object.freeze({
        '1': 'Très durable',
        '2': 'Durable',
        '3': 'Moyennement durable',
        '4': 'Faiblement durable',
        '5': 'Non durable',
        D: 'Durable',
        M: 'Moy. durable',
        S: 'Non durable'
    });

    var VALOBOIS_DURABILITE_DC_RANGE_LABELS = Object.freeze({
        '1-2': 'Très durable à Durable',
        '2-3': 'Durable à Moyennement durable',
        '3-4': 'Moyennement à Faiblement durable',
        '4-5': 'Faiblement à Non durable',
        'D-M': 'Durable à Moyennement durable',
        'M-S': 'Moyennement à Non durable',
        'D-S': 'Durable à Non durable'
    });

    var VALOBOIS_DURABILITE_AUBIER_LABELS = Object.freeze({
        vs: '< 2 cm',
        s: '2-5 cm',
        m: '5-10 cm',
        b: '> 10 cm',
        x: 'indistinct',
        '(x)': 'généralement indistinct'
    });

    var VALOBOIS_DURABILITE_IMPREG_LABELS = Object.freeze({
        '1': '1 — Imprégnable',
        '2': '2 — Moy. imprégnable',
        '3': '3 — Peu imprégnable',
        '4': '4 — Non imprégnable'
    });

    var VALOBOIS_NOTATION_MODE_SECTION_TITLES = Object.freeze({
        bio: 'Biologique',
        mech: 'Mécanique',
        usage: 'Usage',
        denat: 'Dénaturalisation',
        debit: 'Débit',
        geo: 'Géométrie',
        essence: 'Essence',
        ancien: 'Ancienneté',
        traces: 'Traces',
        provenance: 'Provenance'
    });

    var VALOBOIS_ALLOWED_BASE_PRESET_IDS_BY_ORIENTATION_FAMILY = Object.freeze({
        'réemploi': Object.freeze([
            'base-reemploi-bois-a',
            'base-reemploi-br12',
            'base-scie-entree',
            'base-scie-sortie',
            'base-grande-distribution'
        ]),
        'réutilisation': Object.freeze([
            'base-reutilisation-bois-a',
            'base-reutilisation-br12',
            'base-reutilisation-bois-c',
            'base-scie-entree',
            'base-scie-sortie',
            'base-grande-distribution'
        ]),
        recyclage: Object.freeze([
            'base-recyclage-bois-a',
            'base-recyclage-bois-br1',
            'base-recyclage-bois-br2',
            'base-gratuite-rep-pmcb'
        ]),
        combustion: Object.freeze([
            'base-combustion-bois-a',
            'base-combustion-bois-br1',
            'base-combustion-bois-br2',
            'base-combustion-bois-c'
        ])
    });

    var VALOBOIS_CEEB_PRESET_RULES = Object.freeze({
        excludedForReuseFamilies: Object.freeze([
            'base-ceeb-chutes-2t-broyees-a',
            'base-ceeb-chutes-2t-broyees-b',
            'base-ceeb-recyclage-classe-a-vrac',
            'base-ceeb-plaquettes-scierie',
            'base-ceeb-broyats-emballage-ssd'
        ]),
        allowedForRecyclage: Object.freeze([
            'base-ceeb-chutes-2t-broyees-a',
            'base-ceeb-chutes-2t-broyees-b',
            'base-ceeb-recyclage-classe-a-vrac',
            'base-ceeb-broyats-emballage-ssd'
        ]),
        allowedForCombustion: Object.freeze([
            'base-ceeb-plaquettes-scierie'
        ])
    });

    var VALOBOIS_AXE_CATEGORY_MAP = Object.freeze({
        economique: 'economique',
        ecologique: 'ecologique',
        mecanique: 'mecanique',
        historique: 'historique',
        esthetique: 'esthetique'
    });

    var VALOBOIS_PDF_TEXT_MAP = Object.freeze({
        'pdf.common.none': Object.freeze({ fr: 'Aucun', en: 'None' }),
        'pdf.orientation.status.confirmed': Object.freeze({ fr: 'Confirmee', en: 'Confirmed' }),
        'pdf.orientation.status.forced': Object.freeze({ fr: 'Forcee', en: 'Forced' }),
        'pdf.orientation.status.unconfirmedCombustion': Object.freeze({ fr: 'Deduite (non confirmee)', en: 'Inferred (unconfirmed)' }),
        'pdf.orientation.status.inProgress': Object.freeze({ fr: 'En cours', en: 'In progress' }),
        'pdf.lot.orientationStatus': Object.freeze({ fr: 'Statut orientation', en: 'Orientation status' }),
        'pdf.lot.orientationRejects': Object.freeze({ fr: 'Rejets actifs', en: 'Active rejects' }),
        'pdf.lot.orientationVectors': Object.freeze({ fr: 'Vecteurs actifs', en: 'Active vectors' }),
        'pdf.card.orientationJustification': Object.freeze({ fr: 'Justification de l\'orientation', en: 'Orientation rationale' }),
        'pdf.orientation.emptyRejects': Object.freeze({ fr: 'Aucun rejet actif pour cette orientation.', en: 'No active reject for this orientation.' }),
        'pdf.orientation.emptyVectors': Object.freeze({ fr: 'Aucun vecteur actif pour cette orientation.', en: 'No active vector for this orientation.' }),
        'pdf.lot.combustionCaution': Object.freeze({ fr: 'Alerte combustion', en: 'Combustion warning' }),
        'pdf.orientation.combustionCaution': Object.freeze({
            fr: 'Orientation deduite par elimination, non confirmee positivement par la matrice.',
            en: 'Orientation inferred by elimination, not positively confirmed by the matrix.'
        })
    });

    global.VALOBOIS_STORAGE_KEYS = VALOBOIS_STORAGE_KEYS;
    global.NOTATION_MODE_SECTION_SELECTORS = NOTATION_MODE_SECTION_SELECTORS;
    global.VALOBOIS_META_REQUIRED_FIELDS = VALOBOIS_META_REQUIRED_FIELDS;
    global.VALOBOIS_CONFIDENCE_ALERT_CONFIG = VALOBOIS_CONFIDENCE_ALERT_CONFIG;
    global.VALOBOIS_STUDY_STATUS_VALUES = VALOBOIS_STUDY_STATUS_VALUES;
    global.VALOBOIS_STUDY_STATUS_HELP_TEXTS = VALOBOIS_STUDY_STATUS_HELP_TEXTS;
    global.VALOBOIS_ANALYSIS_LOT_SELECTOR_CONFIG = VALOBOIS_ANALYSIS_LOT_SELECTOR_CONFIG;
    global.VALOBOIS_ANALYSIS_LOT_SELECTOR_KEYS = VALOBOIS_ANALYSIS_LOT_SELECTOR_KEYS;
    global.VALOBOIS_ORIENTATION_THRESHOLD_DESCRIPTORS = VALOBOIS_ORIENTATION_THRESHOLD_DESCRIPTORS;
    global.VALOBOIS_ETIQUETTE_QR_CONFIG = VALOBOIS_ETIQUETTE_QR_CONFIG;
    global.VALOBOIS_BARCODE_COMPOSER_DEFAULT_CONFIG = VALOBOIS_BARCODE_COMPOSER_DEFAULT_CONFIG;
    global.VALOBOIS_DEFAULT_NOTATION_MODE_ORIENTATION_THRESHOLDS = VALOBOIS_DEFAULT_NOTATION_MODE_ORIENTATION_THRESHOLDS;
    global.VALOBOIS_BARCODE_COMPOSER_OPTIONAL_FIELDS_ORDER = VALOBOIS_BARCODE_COMPOSER_OPTIONAL_FIELDS_ORDER;
    global.VALOBOIS_BARCODE_COMPOSER_FIELD_SCOPE_MAP = VALOBOIS_BARCODE_COMPOSER_FIELD_SCOPE_MAP;
    global.VALOBOIS_TAUX_LOGIC_STRATEGY_TEXTS = VALOBOIS_TAUX_LOGIC_STRATEGY_TEXTS;
    global.VALOBOIS_MEDOID_EMPTY_LABEL = VALOBOIS_MEDOID_EMPTY_LABEL;
    global.VALOBOIS_SIMILARITY_STRATEGY_LABELS = VALOBOIS_SIMILARITY_STRATEGY_LABELS;
    global.VALOBOIS_ORIENTATION_LABELS = VALOBOIS_ORIENTATION_LABELS;
    global.VALOBOIS_DETAIL_MODAL_TITLES = VALOBOIS_DETAIL_MODAL_TITLES;
    global.VALOBOIS_DURABILITE_DC_LABELS = VALOBOIS_DURABILITE_DC_LABELS;
    global.VALOBOIS_DURABILITE_DC_RANGE_LABELS = VALOBOIS_DURABILITE_DC_RANGE_LABELS;
    global.VALOBOIS_DURABILITE_AUBIER_LABELS = VALOBOIS_DURABILITE_AUBIER_LABELS;
    global.VALOBOIS_DURABILITE_IMPREG_LABELS = VALOBOIS_DURABILITE_IMPREG_LABELS;
    global.VALOBOIS_NOTATION_MODE_SECTION_TITLES = VALOBOIS_NOTATION_MODE_SECTION_TITLES;
    global.VALOBOIS_ALLOWED_BASE_PRESET_IDS_BY_ORIENTATION_FAMILY = VALOBOIS_ALLOWED_BASE_PRESET_IDS_BY_ORIENTATION_FAMILY;
    global.VALOBOIS_CEEB_PRESET_RULES = VALOBOIS_CEEB_PRESET_RULES;
    global.VALOBOIS_AXE_CATEGORY_MAP = VALOBOIS_AXE_CATEGORY_MAP;
    global.VALOBOIS_PDF_TEXT_MAP = VALOBOIS_PDF_TEXT_MAP;
})(typeof window !== 'undefined' ? window : globalThis);