(function (global) {
    'use strict';
    global.ValoboisEditorTabPanels = global.ValoboisEditorTabPanels || {};
    global.ValoboisEditorTabPanels.notation = function () {
        var app = global.__valoboisApp;
        if (!app || typeof app.getValoboisCustomFreeCriteriaList !== 'function') return;

        var container = document.querySelector('#editor-tabpanel-notation .cards-grid');
        if (!container) return;

        var provenancePanel = container.querySelector('section.provenance-card#provenanceSection');
        var oldCustomPanel = container.querySelector('[data-section="custom-free-criteria"]');
        if (oldCustomPanel) oldCustomPanel.remove();

        var customCriteria = app.getValoboisCustomFreeCriteriaList().filter(function (entry) {
            return entry && entry.enabled !== false;
        });
        if (!customCriteria.length) return;

        var currentLot = (typeof app.getCurrentLot === 'function') ? app.getCurrentLot() : null;
        if (!currentLot) return;

        var lotIndex = (app.data && Array.isArray(app.data.lots))
            ? app.data.lots.indexOf(currentLot)
            : -1;
        var ALERT_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        var inheritedAlertSelectorByRank = {
            1: '[data-denat-contamination-alert-btn]',
            2: '[data-bio-expansion-alert-btn]',
            3: '[data-bio-integrite-alert-btn]',
            4: '[data-mech-integrite-alert-btn]',
            5: '[data-traces-alteration-alert-btn]',
            6: '[data-bio-exposition-alert-btn]',
            8: '[data-mech-exposition-longevite-alert-btn]',
            10: '[data-usage-humidite-alert-btn]',
            12: '[data-ancien-vieillissement-alert-btn]',
            13: '[data-ancien-amortissement-alert-btn]',
            14: '[data-denat-durabilite-alert-btn]',
            19: '[data-mech-feu-alert-btn]',
            24: '[data-debit-regularite-alert-btn]',
            25: '[data-debit-volumetrie-alert-btn]',
            29: '[data-geo-massivite-alert-btn]',
            30: '[data-geo-industrialite-alert-btn]',
            31: '[data-geo-inclusivite-alert-btn]',
            32: '[data-essence-rarete-eco-alert-btn]',
            33: '[data-essence-massevol-alert-btn]',
            40: '[data-provenance-macro-alert-btn]',
            42: '[data-debit-stabilite-alert-btn]',
            43: '.bio-row[data-bio-field="confianceBio"] [data-confidence-alert-btn]',
            44: '.mech-row[data-mech-field="confianceMech"] [data-confidence-alert-btn]',
            45: '.denat-row[data-denat-field="confianceDenat"] [data-confidence-alert-btn]',
            46: '.essence-row[data-essence-field="confianceEssence"] [data-confidence-alert-btn]',
            47: '.usage-row[data-usage-field="confianceUsage"] [data-confidence-alert-btn]',
            48: '.ancien-row[data-ancien-field="confianceAncien"] [data-confidence-alert-btn]',
            49: '.provenance-row[data-provenance-field="confianceProv"] [data-confidence-alert-btn]',
            50: '.traces-row[data-traces-field="confianceTraces"] [data-confidence-alert-btn]'
        };
        var getInheritedAlertButtonFromRank = function (rank) {
            var numericRank = Number(rank);
            if (!Number.isFinite(numericRank)) return null;
            var selector = inheritedAlertSelectorByRank[numericRank];
            if (!selector) return null;
            return container.querySelector(selector) || document.querySelector(selector);
        };
        var openInheritedAlertFromRank = function (rank) {
            var sourceAlertBtn = getInheritedAlertButtonFromRank(rank);
            if (!sourceAlertBtn) return false;
            sourceAlertBtn.click();
            return true;
        };
        var applyInheritedAlertVisualState = function (alertBtn, sourceRank) {
            if (!alertBtn) return;
            var sourceAlertBtn = getInheritedAlertButtonFromRank(sourceRank);
            if (!sourceAlertBtn || !global.getComputedStyle) return;
            var style = global.getComputedStyle(sourceAlertBtn);
            if (!style) return;
            alertBtn.style.color = style.color;
            alertBtn.style.opacity = style.opacity;
            alertBtn.style.pointerEvents = 'auto';
        };
        var levelLabelMap = { fort: 'Fort', moyen: 'Moyen', faible: 'Faible' };
        var colorHexByKey = { vert: '#009E73', orange: '#E69F00', rouge: '#D55E00' };
        var formatLevelList = function (levels) {
            if (!Array.isArray(levels) || !levels.length) return 'Aucun niveau';
            return levels.map(function (lvl) {
                var key = String(lvl || '').trim().toLowerCase();
                return levelLabelMap[key] || key;
            }).join(', ');
        };
        var buildCustomAlertReadOnlyHtml = function (criterion, alertConfig, resolvedAlert) {
            var optionMap = {};
            if (typeof app.getValoboisAlertConditionCriterionOptions === 'function') {
                var options = app.getValoboisAlertConditionCriterionOptions() || [];
                options.forEach(function (opt) {
                    if (!opt || !opt.ref) return;
                    optionMap[String(opt.ref)] = String(opt.label || opt.ref);
                });
            }

            var stateLabel = (resolvedAlert && resolvedAlert.state === 'active')
                ? 'Active'
                : ((resolvedAlert && resolvedAlert.state === 'missing-config') ? 'A configurer' : 'Inactive');
            var recoLevel = String((resolvedAlert && resolvedAlert.recommendationLevel) || (alertConfig && alertConfig.recommendationLevel) || 'moyen').toLowerCase();
            var recoLabel = levelLabelMap[recoLevel] || recoLevel;
            var recoColor = String((resolvedAlert && resolvedAlert.recommendationColor) || '').toLowerCase();
            var dotColor = colorHexByKey[recoColor] || '#64748b';
            var profiles = (alertConfig && alertConfig.recommendations && typeof alertConfig.recommendations === 'object') ? alertConfig.recommendations : {};

            var summaryCards = ['fort', 'moyen', 'faible'].map(function (levelKey) {
                var profile = profiles[levelKey] || { color: 'orange', message: '', conditions: [] };
                var count = Array.isArray(profile.conditions) ? profile.conditions.length : 0;
                var levelName = levelLabelMap[levelKey] || levelKey;
                var c = colorHexByKey[String(profile.color || '').toLowerCase()] || '#64748b';
                return '<div style="border:1px solid #e2e8f0;border-radius:8px;padding:8px;background:#fff;">'
                    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">'
                    + '<strong>' + levelName + '</strong>'
                    + '<span style="display:inline-flex;align-items:center;gap:6px;color:#475569;font-size:12px;">'
                    + '<span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:' + c + ';"></span>' + count + ' condition(s)'
                    + '</span></div>'
                    + (profile.message ? '<p style="margin:6px 0 0;font-size:12px;color:#334155;">' + app.escapeHtml(String(profile.message)) + '</p>' : '')
                    + '</div>';
            }).join('');

            var activeConditions = [];
            if (resolvedAlert && resolvedAlert.activeRecommendation && resolvedAlert.recommendationsEval && resolvedAlert.recommendationsEval[resolvedAlert.activeRecommendation]) {
                var activeEval = resolvedAlert.recommendationsEval[resolvedAlert.activeRecommendation];
                activeConditions = []
                    .concat(Array.isArray(activeEval.matchedConditions) ? activeEval.matchedConditions.map(function (item) { return { ok: true, item: item }; }) : [])
                    .concat(Array.isArray(activeEval.missingConditions) ? activeEval.missingConditions.map(function (item) { return { ok: false, item: item }; }) : []);
            }

            var activeRows = activeConditions.length
                ? activeConditions.map(function (entry, idx) {
                    var item = entry.item || {};
                    var criterionRef = String(item.criterionRef || '').trim();
                    var criterionLabel = optionMap[criterionRef] || criterionRef;
                    var currentLevel = levelLabelMap[String(item.currentLevel || '').toLowerCase()] || (item.currentLevel || 'Non renseigne');
                    return '<div style="border:1px solid ' + (entry.ok ? '#bbf7d0' : '#fecaca') + ';background:' + (entry.ok ? '#f0fdf4' : '#fef2f2') + ';border-radius:8px;padding:8px;margin-top:6px;">'
                        + '<div style="font-size:12px;"><strong>' + (idx + 1) + '. ' + app.escapeHtml(criterionLabel) + '</strong> <span style="color:' + (entry.ok ? '#166534' : '#991b1b') + ';">(' + (entry.ok ? 'OK' : 'KO') + ')</span></div>'
                        + '<div style="font-size:12px;color:#334155;">Niveaux attendus: ' + app.escapeHtml(formatLevelList(item.levels || [])) + '</div>'
                        + '<div style="font-size:12px;color:#334155;">Niveau courant: ' + app.escapeHtml(currentLevel) + '</div>'
                        + '</div>';
                }).join('')
                : '<p style="margin:6px 0 0;font-size:12px;color:#64748b;">Aucune condition active pour la recommandation courante.</p>';

            var message = String((resolvedAlert && resolvedAlert.message) || (alertConfig && alertConfig.message) || '').trim();

            return '<div style="display:flex;flex-direction:column;gap:10px;">'
                + '<div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#f8fafc;">'
                + '<div style="display:flex;align-items:center;gap:8px;">'
                + '<strong>Etat: ' + stateLabel + '</strong>'
                + '<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#334155;">'
                + '<span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:' + dotColor + ';"></span>'
                + 'Recommandation active: ' + app.escapeHtml(recoLabel)
                + '</span></div>'
                + (message ? '<p style="margin:8px 0 0;font-size:13px;color:#1f2937;">' + app.escapeHtml(message) + '</p>' : '')
                + '</div>'
                + '<div><strong>Profils configurés</strong><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:6px;">' + summaryCards + '</div></div>'
                + '<div><strong>Détails de la recommandation active</strong>' + activeRows + '</div>'
                + '<p style="margin:0;font-size:12px;color:#64748b;">Critère personnalisé: ' + app.escapeHtml(String((criterion && criterion.critere) || (criterion && criterion.id) || 'Critère')) + '</p>'
                + '</div>';
        };

        /* ---- Panel section ---- */
        var panel = document.createElement('section');
        panel.className = 'card mt-16 bio-card';
        panel.id = 'customFreeCriteriaSection';
        panel.setAttribute('data-section', 'custom-free-criteria');
        panel.style.display = 'block';

        /* ---- Header ---- */
        var header = document.createElement('header');
        header.className = 'bio-header';

        var lotBadge = document.createElement('div');
        lotBadge.className = 'bio-lot-badge';
        lotBadge.textContent = lotIndex >= 0 ? 'Lot ' + (lotIndex + 1) : 'Lot \u2026';

        var titleEl = document.createElement('h2');
        titleEl.className = 'card-title bio-title';
        titleEl.textContent = 'Crit\u00e8res personnalis\u00e9s';

        var infoBtn = document.createElement('button');
        infoBtn.className = 'bio-info-btn';
        infoBtn.type = 'button';
        infoBtn.textContent = 'info';

        header.appendChild(lotBadge);
        header.appendChild(titleEl);
        header.appendChild(infoBtn);
        panel.appendChild(header);

        /* ---- Body ---- */
        var body = document.createElement('div');
        body.className = 'bio-body';

        customCriteria.forEach(function (crit) {
            var criterionId = String(crit.id || '').trim();
            if (!criterionId) return;

            var scoreMap = {
                fort:   Number((crit.scores && crit.scores.fort)   ? crit.scores.fort.value   : 1),
                moyen:  Number((crit.scores && crit.scores.moyen)  ? crit.scores.moyen.value  : 1),
                faible: Number((crit.scores && crit.scores.faible) ? crit.scores.faible.value : 1)
            };

            var currentScore = (typeof app.getValoboisLotCustomScoreValue === 'function')
                ? app.getValoboisLotCustomScoreValue(currentLot, criterionId)
                : null;

            var hasValue = (currentScore !== null && Number.isFinite(Number(currentScore)));
            var sliderVal = 2;
            if (hasValue) {
                var s = Number(currentScore);
                if (s === scoreMap.fort)        sliderVal = 1;
                else if (s === scoreMap.faible) sliderVal = 3;
                else                            sliderVal = 2;
            }

            /* Row */
            var row = document.createElement('div');
            row.className = 'bio-row' + (hasValue ? '' : ' bio-row--disabled');
            row.setAttribute('data-custom-free-id', criterionId);

            /* Axis label (grid-area: val) */
            var valueLabel = document.createElement('div');
            valueLabel.className = 'bio-value-label-box';
            valueLabel.textContent = crit.axe || crit.axeKey || 'Personnalis\u00e9';

            /* Reset btn (grid-area: reset) */
            var resetBtn = document.createElement('button');
            resetBtn.className = 'bio-reset-btn';
            resetBtn.type = 'button';
            resetBtn.textContent = 'R\u00e9initialiser';
            resetBtn.setAttribute('data-i18n', 'editor.common.reset');

            /* Criterion label (grid-area: label) */
            var labelBox = document.createElement('div');
            labelBox.className = 'bio-label-box';
            labelBox.textContent = crit.critere || criterionId;

            /* Level / intensity boxes – hidden by CSS but keep for grid layout */
            var levelBox = document.createElement('div');
            levelBox.className = 'bio-level-box';
            levelBox.textContent = '\u2026';

            var intensityBox = document.createElement('div');
            intensityBox.className = 'bio-intensity-box';
            intensityBox.textContent = '...';

            /* Info btn (grid-area: info) */
            var infoSmallBtn = document.createElement('button');
            infoSmallBtn.className = 'bio-info-small-btn';
            infoSmallBtn.type = 'button';
            infoSmallBtn.textContent = 'info';

            var defaultAlertConfig = { mode: 'disabled', inheritedRank: null, recommendationLevel: 'moyen', message: '', conditions: [] };
            if (typeof app.buildValoboisDefaultCustomFreeCriterion === 'function') {
                var criterionDefaults = app.buildValoboisDefaultCustomFreeCriterion(crit.rank);
                if (criterionDefaults && criterionDefaults.alertConfig) {
                    defaultAlertConfig = criterionDefaults.alertConfig;
                }
            }
            var alertConfig = (typeof app.normalizeValoboisCustomFreeAlertConfig === 'function')
                ? app.normalizeValoboisCustomFreeAlertConfig(crit.alertConfig, defaultAlertConfig)
                : (crit.alertConfig || defaultAlertConfig);
            var alertMode = String((alertConfig && alertConfig.mode) || 'disabled').trim();
            var shouldRenderAlertBtn = alertMode === 'inherited' || alertMode === 'custom';
            var resolvedAlert = shouldRenderAlertBtn && typeof app.resolveValoboisCustomFreeAlertState === 'function'
                ? app.resolveValoboisCustomFreeAlertState(currentLot, crit)
                : { state: 'none' };
            var isAlertMissingConfig = !!(resolvedAlert && resolvedAlert.state === 'missing-config');
            var alertStateLabel = isAlertMissingConfig
                ? 'A configurer'
                : ((resolvedAlert && resolvedAlert.state === 'active') ? 'Active' : 'Inactive');
            var alertModeLabel = alertMode === 'inherited' ? 'heritee' : 'personnalisee';
            var alertBtn = null;
            if (shouldRenderAlertBtn) {
                alertBtn = document.createElement('button');
                alertBtn.className = 'lot-alert-btn lot-alert-btn--custom-free';
                alertBtn.type = 'button';
                alertBtn.setAttribute('data-alert-custom-mode', alertMode === 'inherited' ? 'inherited' : 'custom');
                alertBtn.setAttribute('data-alert-active', isAlertMissingConfig ? 'false' : 'true');
                alertBtn.setAttribute('data-alert-missing', isAlertMissingConfig ? 'true' : 'false');
                if (alertMode === 'custom') {
                    var recommendation = String((alertConfig && alertConfig.recommendationLevel) || 'moyen').trim().toLowerCase();
                    alertBtn.setAttribute('data-alert-recommendation', recommendation);
                }
                alertBtn.setAttribute('aria-label', 'Alerte critere personnalise (' + alertModeLabel + ')');
                alertBtn.setAttribute('title', 'Alerte ' + alertModeLabel + ' - ' + alertStateLabel);
                alertBtn.innerHTML = ALERT_ICON_SVG;
                if (alertMode === 'inherited') {
                    applyInheritedAlertVisualState(alertBtn, crit.sourceRank);
                } else if (alertMode === 'custom' && !isAlertMissingConfig) {
                    var recommendationColor = String((resolvedAlert && resolvedAlert.recommendationColor) || '').trim().toLowerCase();
                    if (colorHexByKey[recommendationColor]) {
                        alertBtn.style.color = colorHexByKey[recommendationColor];
                        alertBtn.style.opacity = '1';
                        alertBtn.style.pointerEvents = 'auto';
                    }
                }
            }

            /* Slider wrapper (grid-area: slider) */
            var sliderWrapper = document.createElement('div');
            sliderWrapper.className = 'bio-slider-wrapper';

            var slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '1';
            slider.max = '3';
            slider.step = '1';
            slider.value = String(sliderVal);
            slider.className = 'bio-slider';

            var sliderScale = document.createElement('div');
            sliderScale.className = 'bio-slider-scale';
            [
                { label: 'Fort',   key: 'fort'   },
                { label: 'Moyen',  key: 'moyen'  },
                { label: 'Faible', key: 'faible' }
            ].forEach(function (lvl) {
                var span = document.createElement('span');
                span.textContent = lvl.label;
                var noteVal = scoreMap[lvl.key];
                if (Number.isFinite(noteVal)) {
                    span.setAttribute('data-note', (noteVal > 0 ? '+' : '') + noteVal);
                }
                sliderScale.appendChild(span);
            });

            sliderWrapper.appendChild(slider);
            sliderWrapper.appendChild(sliderScale);

            /* Initialize slider visual enhancement (mirrors enhanceAllSliders() for dynamic sliders) */
            (function initSliderEnhancement(wrapper, sl, scale) {
                // 1. Overlay visuel : dots + ligne (même structure que bio-slider-display--statut)
                var display = document.createElement('div');
                display.className = 'bio-slider-display--statut';
                display.setAttribute('aria-hidden', 'true');
                var line = document.createElement('div');
                line.className = 'bio-slider-display-line--statut';
                for (var i = 0; i < 3; i++) {
                    var dot = document.createElement('span');
                    dot.className = 'bio-slider-dot--statut';
                    line.appendChild(dot);
                }
                display.appendChild(line);
                wrapper.insertBefore(display, sl);
                sl.classList.add('slider--statut-visual');

                // 2. Mise à jour du label actif
                var labels = Array.from(scale.children);
                function updateActiveLabel() {
                    labels.forEach(function (l) {
                        l.classList.remove('bio-slider-label--active', 'slider-label--active');
                    });
                    var target = Math.max(0, Math.min(labels.length - 1, Number(sl.value) - 1));
                    if (labels[target]) {
                        labels[target].classList.add('slider-label--active');
                        labels[target].classList.add('bio-slider-label--active');
                    }
                }
                sl.__refreshActiveSliderLabel = updateActiveLabel;
                sl.addEventListener('input',  function () { requestAnimationFrame(updateActiveLabel); });
                sl.addEventListener('change', function () { requestAnimationFrame(updateActiveLabel); });
                updateActiveLabel();

                // 3. Neutral click : premier clic sur row désactivée → commit valeur
                function commitNeutralClick() {
                    var rowEl = sl.closest('.bio-row');
                    if (!rowEl || !rowEl.classList.contains('bio-row--disabled')) return;
                    sl.dispatchEvent(new Event('input', { bubbles: false }));
                }
                sl.addEventListener('click',     commitNeutralClick);
                sl.addEventListener('pointerup', commitNeutralClick);
            })(sliderWrapper, slider, sliderScale);

            row.appendChild(valueLabel);
            row.appendChild(resetBtn);
            row.appendChild(labelBox);
            row.appendChild(levelBox);
            row.appendChild(intensityBox);
            row.appendChild(infoSmallBtn);
            if (alertBtn) row.appendChild(alertBtn);
            row.appendChild(sliderWrapper);

            /* Initial note-tone coloring */
            if (hasValue && typeof app.setRowNoteToneFromIntensity === 'function') {
                app.setRowNoteToneFromIntensity(row, scoreMap, Number(currentScore));
            }

            /* Slider oninput */
            slider.oninput = (function (capturedCrit, capturedRow, capturedScoreMap) {
                return function (e) {
                    var v = parseInt(e.target.value, 10);
                    var levelKey = v === 1 ? 'fort' : v === 3 ? 'faible' : 'moyen';
                    var scoreVal = capturedScoreMap[levelKey];
                    if (!Number.isFinite(scoreVal)) return;

                    var lot = (typeof app.getCurrentLot === 'function') ? app.getCurrentLot() : null;
                    if (!lot) return;

                    if (typeof app.setValoboisLotCustomScoreValue === 'function') {
                        app.setValoboisLotCustomScoreValue(lot, capturedCrit.id, scoreVal);
                    }
                    capturedRow.classList.remove('bio-row--disabled');

                    if (typeof app.setRowNoteToneFromIntensity === 'function') {
                        app.setRowNoteToneFromIntensity(capturedRow, capturedScoreMap, scoreVal);
                    }

                    if (typeof app.saveData === 'function') app.saveData();
                    if (typeof app.computeOrientation === 'function') app.computeOrientation(lot);
                    if (typeof app.renderSeuils === 'function') app.renderSeuils();
                    if (typeof app.renderEvalOp === 'function') app.renderEvalOp();
                };
            })(crit, row, scoreMap);

            /* Reset onclick */
            resetBtn.onclick = (function (capturedCrit, capturedRow, capturedSlider) {
                return function () {
                    var lot = (typeof app.getCurrentLot === 'function') ? app.getCurrentLot() : null;
                    if (!lot) return;

                    if (typeof app.setValoboisLotCustomScoreValue === 'function') {
                        app.setValoboisLotCustomScoreValue(lot, capturedCrit.id, null);
                    }
                    capturedSlider.value = '2';
                    capturedRow.classList.add('bio-row--disabled');
                    if (typeof app.setRowNoteTone === 'function') {
                        app.setRowNoteTone(capturedRow, null);
                    }

                    if (typeof app.saveData === 'function') app.saveData();
                    if (typeof app.computeOrientation === 'function') app.computeOrientation(lot);
                    if (typeof app.renderSeuils === 'function') app.renderSeuils();
                    if (typeof app.renderEvalOp === 'function') app.renderEvalOp();
                };
            })(crit, row, slider);

            /* Info onclick – show notation message if configured */
            if (crit.notation && crit.notation.message &&
                    typeof app.openValoboisMatrixDetailModal === 'function') {
                infoSmallBtn.onclick = (function (capturedCrit) {
                    return function () {
                        app.openValoboisMatrixDetailModal(
                            capturedCrit.notation.title || capturedCrit.critere || 'Crit\u00e8re personnalis\u00e9',
                            capturedCrit.notation.message
                        );
                    };
                })(crit);
            }

            if (alertBtn) {
                alertBtn.onclick = (function (capturedCrit, capturedAlertConfig, capturedResolvedAlert, capturedSourceRank, capturedAlertMode, capturedAlertState) {
                    return function () {
                        if (capturedAlertMode === 'heritee') {
                            if (openInheritedAlertFromRank(capturedSourceRank)) return;
                            if (typeof app.openValoboisMatrixCriterionModal === 'function') {
                                var rank = Number(capturedSourceRank);
                                if (Number.isFinite(rank) && app.openValoboisMatrixCriterionModal(rank, 'alert')) return;
                            }
                        }
                        if (capturedAlertMode === 'personnalisee') {
                            if (typeof app.openSharedAlertPiecesModal === 'function') {
                                app.openSharedAlertPiecesModal(
                                    'Alerte personnalisee - ' + String((capturedCrit && capturedCrit.critere) || (capturedCrit && capturedCrit.id) || 'Critere'),
                                    buildCustomAlertReadOnlyHtml(capturedCrit, capturedAlertConfig, capturedResolvedAlert),
                                    { textAlign: 'left', whiteSpace: 'normal', allowHtml: true }
                                );
                                return;
                            }
                        }
                        if (typeof app.openSharedAlertPiecesModal === 'function') {
                            app.openSharedAlertPiecesModal(
                                'Alerte personnalisee',
                                'Mode: ' + capturedAlertMode + '\nEtat: ' + capturedAlertState,
                                { textAlign: 'left', whiteSpace: 'pre-line' }
                            );
                        }
                    };
                })(crit, alertConfig, resolvedAlert, crit.sourceRank, alertModeLabel, alertStateLabel);
            }

            body.appendChild(row);
        });

        panel.appendChild(body);

        /* ---- Insertion after Provenance ---- */
        if (provenancePanel && provenancePanel.nextSibling) {
            container.insertBefore(panel, provenancePanel.nextSibling);
        } else {
            container.appendChild(panel);
        }

        /* Apply SVG icon to dynamically created reset buttons */
        if (typeof app.setupNotationResetIcons === 'function') {
            app.setupNotationResetIcons();
        }
    };
})(typeof window !== 'undefined' ? window : this);
