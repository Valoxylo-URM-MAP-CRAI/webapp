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
