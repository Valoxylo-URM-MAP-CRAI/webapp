(function () {
    'use strict';

    const PATCH_FLAG = '__customInfosExportBarcodeIfcPatch';

    function ensureArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function normalizeCustomInfoRows(app, piece) {
        if (!app || typeof app.ensurePieceCustomInfos !== 'function') return [];
        return ensureArray(app.ensurePieceCustomInfos(piece));
    }

    function collectPieceOrderForLots(app, lotIndices) {
        const ordered = [];
        const lots = app && app.data && Array.isArray(app.data.lots) ? app.data.lots : [];

        lotIndices.forEach((lotIndex) => {
            const lot = lots[lotIndex];
            if (!lot) return;

            const defaultPieces = typeof app.ensureDefaultPiecesData === 'function'
                ? app.ensureDefaultPiecesData(lot, { createIfEmpty: false })
                : [];

            defaultPieces.forEach((defaultPiece) => {
                const quantity = Math.max(0, Math.floor(parseFloat((defaultPiece && defaultPiece.quantite) || 0) || 0));
                for (let q = 0; q < quantity; q++) ordered.push(defaultPiece);
            });

            ensureArray(lot.pieces).forEach((piece) => {
                if (piece && typeof piece === 'object') ordered.push(piece);
            });
        });

        return ordered;
    }

    function buildCustomInfoColumns(app, lotIndices) {
        const byKey = new Map();
        const orderedPieces = collectPieceOrderForLots(app, lotIndices);

        orderedPieces.forEach((piece) => {
            normalizeCustomInfoRows(app, piece).forEach((entry) => {
                if (!entry || !entry.label || !entry.labelKey) return;
                if (byKey.has(entry.labelKey)) return;
                byKey.set(entry.labelKey, {
                    labelKey: entry.labelKey,
                    label: entry.label
                });
            });
        });

        return Array.from(byKey.values());
    }

    function buildCustomInfoValuesForPiece(app, piece, customInfoColumns) {
        const byKey = new Map();
        normalizeCustomInfoRows(app, piece).forEach((entry) => {
            if (!entry || !entry.labelKey) return;
            const values = ensureArray(entry.values)
                .map((value) => String(value == null ? '' : value).trim())
                .filter(Boolean);
            byKey.set(entry.labelKey, values);
        });

        return customInfoColumns.map((column) => {
            const values = byKey.get(column.labelKey) || [];
            return values.length ? values.join(' | ') : '-';
        });
    }

    function formatCustomInfosCompact(app, pieceLike) {
        const entries = normalizeCustomInfoRows(app, pieceLike);
        if (!entries.length) return '';

        const tokenize = (value, maxChars) => {
            const raw = String(value == null ? '' : value).trim();
            if (!raw) return '';
            if (typeof app.abbreviateCompactToken === 'function') {
                return app.abbreviateCompactToken(raw, maxChars);
            }
            return raw
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^A-Za-z0-9]+/g, '')
                .toUpperCase()
                .slice(0, Math.max(1, Number(maxChars) || 4));
        };

        const tokens = entries
            .filter((entry) => entry && entry.label)
            .slice(0, 4)
            .map((entry) => {
                const labelToken = tokenize(entry.label, 3);
                const values = ensureArray(entry.values)
                    .map((value) => String(value == null ? '' : value).trim())
                    .filter(Boolean);
                if (!labelToken || !values.length) return '';
                const firstValue = tokenize(values[0], 6);
                return firstValue ? (labelToken + '=' + firstValue) : '';
            })
            .filter(Boolean);

        return tokens.length ? tokens.join(',').slice(0, 64) : '';
    }

    function formatCustomInfosComplete(app, pieceLike) {
        const entries = normalizeCustomInfoRows(app, pieceLike);
        if (!entries.length) return '';

        const segments = entries
            .filter((entry) => entry && entry.label)
            .map((entry) => {
                const values = ensureArray(entry.values)
                    .map((value) => String(value == null ? '' : value).trim())
                    .filter(Boolean);
                if (!values.length) return '';
                return entry.label + ': ' + values.join(', ');
            })
            .filter(Boolean);

        return segments.join(' ; ');
    }

    function injectIfcCustomInfosConfig(psetConfig) {
        if (!psetConfig || typeof psetConfig !== 'object') return psetConfig;
        if (psetConfig.customInfos && psetConfig.customInfos.psetName === 'Pset_Valobois_CustomInfos') {
            return psetConfig;
        }

        const clone = { ...psetConfig };
        clone.customInfos = {
            layer: 'valobois',
            label: 'Informations personnalisées',
            psetName: 'Pset_Valobois_CustomInfos',
            enabled: true,
            properties: {
                informationsPersonnalisees: {
                    enabled: true,
                    label: 'Informations personnalisées',
                    getValue: (piece) => {
                        const infos = Array.isArray(piece && piece.customInfos) ? piece.customInfos : [];
                        const segments = infos
                            .filter((entry) => entry && entry.label)
                            .map((entry) => {
                                const values = Array.isArray(entry.values)
                                    ? entry.values.map((value) => String(value == null ? '' : value).trim()).filter(Boolean)
                                    : [];
                                if (!values.length) return null;
                                return entry.label + ': ' + values.join(', ');
                            })
                            .filter(Boolean);
                        return segments.length ? segments.join(' | ') : null;
                    }
                },
                nombreInformationsPersonnalisees: {
                    enabled: true,
                    label: 'Nombre informations personnalisées',
                    getValue: (piece) => {
                        const infos = Array.isArray(piece && piece.customInfos) ? piece.customInfos : [];
                        const count = infos.filter((entry) => {
                            if (!entry || !entry.label) return false;
                            const values = Array.isArray(entry.values)
                                ? entry.values.map((value) => String(value == null ? '' : value).trim()).filter(Boolean)
                                : [];
                            return values.length > 0;
                        }).length;
                        return count > 0 ? count : null;
                    }
                }
            }
        };

        return clone;
    }

    function patchApp(app) {
        if (!app || app[PATCH_FLAG]) return;
        app[PATCH_FLAG] = true;

        app.getCsvCustomInfoColumnsForPieces = function (lotIndices) {
            return buildCustomInfoColumns(this, ensureArray(lotIndices));
        };

        app.getCsvCustomInfoValuesForPiece = function (piece, customInfoColumns) {
            return buildCustomInfoValuesForPiece(this, piece, ensureArray(customInfoColumns));
        };

        if (typeof app.buildCsvRowsForPiecesDetailed === 'function') {
            const originalBuildCsvRowsForPiecesDetailed = app.buildCsvRowsForPiecesDetailed.bind(app);
            app.buildCsvRowsForPiecesDetailed = function (lotIndices) {
                const validLotIndices = ensureArray(lotIndices)
                    .filter((index) => Number.isInteger(index));
                const result = originalBuildCsvRowsForPiecesDetailed(validLotIndices);
                if (!result || !Array.isArray(result.headers) || !Array.isArray(result.rows)) return result;

                const customInfoColumns = this.getCsvCustomInfoColumnsForPieces(validLotIndices);
                if (!customInfoColumns.length) return result;

                customInfoColumns.forEach((column) => {
                    result.headers.push('Information personnalisée - ' + column.label);
                });

                const orderedPieces = collectPieceOrderForLots(this, validLotIndices);
                result.rows.forEach((row, idx) => {
                    const piece = orderedPieces[idx] || null;
                    const values = this.getCsvCustomInfoValuesForPiece(piece, customInfoColumns);
                    values.forEach((value) => {
                        row.push(this.normalizeDecimalForCsv(value));
                    });
                });

                return result;
            };
        }

        if (typeof app.getBarcodeComposerOptionalFieldsOrder === 'function') {
            const originalGetOptionalFieldsOrder = app.getBarcodeComposerOptionalFieldsOrder.bind(app);
            app.getBarcodeComposerOptionalFieldsOrder = function () {
                const fields = originalGetOptionalFieldsOrder();
                if (!Array.isArray(fields)) return ['customInfos'];
                return fields.includes('customInfos') ? fields : fields.concat('customInfos');
            };
        }

        if (typeof app.getBarcodeComposerFieldScopeMap === 'function') {
            const originalGetFieldScopeMap = app.getBarcodeComposerFieldScopeMap.bind(app);
            app.getBarcodeComposerFieldScopeMap = function () {
                const map = originalGetFieldScopeMap() || {};
                if (!Object.prototype.hasOwnProperty.call(map, 'customInfos')) {
                    map.customInfos = 'piece';
                }
                return map;
            };
        }

        app.formatBarcodeComposerCustomInfosCompact = function (pieceLike) {
            return formatCustomInfosCompact(this, pieceLike);
        };

        app.formatBarcodeComposerCustomInfosComplete = function (pieceLike) {
            return formatCustomInfosComplete(this, pieceLike);
        };

        if (typeof app.buildBarcodeComposerValueMap === 'function') {
            const originalBuildBarcodeComposerValueMap = app.buildBarcodeComposerValueMap.bind(app);
            app.buildBarcodeComposerValueMap = function (lot, piece) {
                const map = originalBuildBarcodeComposerValueMap(lot, piece) || {};
                const pieceSource = piece && piece.sourcePiece && typeof piece.sourcePiece === 'object'
                    ? piece.sourcePiece
                    : piece;
                const customInfos = this.formatBarcodeComposerCustomInfosCompact(pieceSource);
                map.customInfos = { value: customInfos, preview: customInfos || '—' };
                return map;
            };
        }

        if (typeof app.getBarcodeComposerDefaultConfig === 'function') {
            const originalGetBarcodeComposerDefaultConfig = app.getBarcodeComposerDefaultConfig.bind(app);
            app.getBarcodeComposerDefaultConfig = function () {
                const cfg = originalGetBarcodeComposerDefaultConfig() || {};
                if (!Object.prototype.hasOwnProperty.call(cfg, 'customInfos')) {
                    cfg.customInfos = false;
                }
                return cfg;
            };
        }

        if (typeof app.getBarcodeComposerFieldUnavailableTooltip === 'function') {
            const originalGetFieldUnavailableTooltip = app.getBarcodeComposerFieldUnavailableTooltip.bind(app);
            app.getBarcodeComposerFieldUnavailableTooltip = function (field) {
                if (field === 'customInfos') {
                    return 'Aucune information personnalisee renseignee sur les pieces selectionnees.';
                }
                return originalGetFieldUnavailableTooltip(field);
            };
        }

        if (typeof app.buildBarcodeContent === 'function') {
            const originalBuildBarcodeContent = app.buildBarcodeContent.bind(app);
            app.buildBarcodeContent = function (lot, piece, lotIndex, pieceIndex, formula, config) {
                const content = originalBuildBarcodeContent(lot, piece, lotIndex, pieceIndex, formula, config);
                const cfg = config && typeof config === 'object' ? config : {};
                const normalizedFormula = typeof this.normalizeCodeFormula === 'function'
                    ? this.normalizeCodeFormula(formula)
                    : String(formula || '').trim().toLowerCase();
                const supportsComplete = typeof this.isBarcodePayloadFormatAvailable === 'function'
                    ? this.isBarcodePayloadFormatAvailable(normalizedFormula)
                    : (normalizedFormula === 'datamatrix' || normalizedFormula === 'qr-offline');
                const payloadFormat = typeof this.normalizeBarcodePayloadFormat === 'function'
                    ? this.normalizeBarcodePayloadFormat(cfg.payloadFormat)
                    : (String(cfg.payloadFormat || '').trim().toLowerCase() === 'complet' ? 'complet' : 'compact');

                if (!supportsComplete || payloadFormat !== 'complet' || !cfg.customInfos) {
                    return content;
                }

                const pieceSource = piece && piece.sourcePiece && typeof piece.sourcePiece === 'object'
                    ? piece.sourcePiece
                    : piece;
                const completeCustomInfos = this.formatBarcodeComposerCustomInfosComplete(pieceSource);
                if (!completeCustomInfos) return content;
                if (String(content).includes('Informations personnalisées :')) return content;
                return String(content) + ' | Informations personnalisées : ' + completeCustomInfos;
            };
        }

        if (typeof app.exportToIFC === 'function') {
            const originalExportToIFC = app.exportToIFC.bind(app);
            app.exportToIFC = function (selectedLotIndices, psetConfig, ifcMode) {
                const nextPsetConfig = injectIfcCustomInfosConfig(psetConfig);
                return originalExportToIFC(selectedLotIndices, nextPsetConfig, ifcMode);
            };
        }
    }

    function tryPatch() {
        const app = window.__valoboisApp;
        if (!app) return false;
        patchApp(app);
        return true;
    }

    if (!tryPatch()) {
        let attempts = 0;
        const timer = setInterval(() => {
            attempts += 1;
            if (tryPatch() || attempts > 120) {
                clearInterval(timer);
            }
        }, 250);
    }
})();
