(function () {
    const PATCH_FLAG = '__barcodeComposerAvailabilityPatched';

    function getComposerFields(composer, app) {
        const domFields = composer
            ? Array.from(composer.querySelectorAll('.barcode-composer__check[data-field]'))
                .map((node) => String(node.getAttribute('data-field') || '').trim())
                .filter(Boolean)
            : [];
        return domFields.length ? Array.from(new Set(domFields)) : app.getBarcodeComposerOptionalFieldsOrder();
    }

    function getStatusMap(app, fields) {
        const statusMap = {};
        const effectiveFields = Array.isArray(fields) && fields.length ? fields : app.getBarcodeComposerOptionalFieldsOrder();
        const availabilityMap = typeof app.getBarcodeComposerFieldsAvailabilityMap === 'function'
            ? app.getBarcodeComposerFieldsAvailabilityMap()
            : {};

        effectiveFields.forEach((field) => {
            statusMap[field] = availabilityMap && availabilityMap[field] ? 'full' : 'none';
        });

        return statusMap;
    }

    function ensureSummary(composer) {
        let summaryEl = composer.querySelector('.barcode-composer__availability-summary');
        if (summaryEl) return summaryEl;
        summaryEl = document.createElement('div');
        summaryEl.className = 'barcode-composer__availability-summary';
        const scrollHost = composer.querySelector('.barcode-composer__selection-scroll');
        if (scrollHost && scrollHost.parentNode) {
            scrollHost.parentNode.insertBefore(summaryEl, scrollHost);
        } else {
            composer.appendChild(summaryEl);
        }
        return summaryEl;
    }

    function updateSummary(app, composer, statusMap, fields) {
        const effectiveFields = Array.isArray(fields) && fields.length ? fields : app.getBarcodeComposerOptionalFieldsOrder();
        let partialCount = 0;
        let unavailableCount = 0;
        effectiveFields.forEach((field) => {
            const status = statusMap[field] || 'none';
            if (status === 'partial') partialCount += 1;
            if (status === 'none') unavailableCount += 1;
        });

        const summaryEl = ensureSummary(composer);
        let text = 'Tous les champs optionnels sont disponibles pour la selection actuelle.';
        if (unavailableCount > 0 && partialCount > 0) {
            text = unavailableCount + ' champ(s) indisponible(s), ' + partialCount + ' champ(s) partiellement disponibles.';
        } else if (unavailableCount > 0) {
            text = unavailableCount + ' champ(s) indisponible(s) pour la selection actuelle.';
        } else if (partialCount > 0) {
            text = partialCount + ' champ(s) partiellement disponibles selon les lots/pieces selectionnes.';
        }
        summaryEl.textContent = text;
        summaryEl.dataset.state = unavailableCount > 0 ? 'warn' : (partialCount > 0 ? 'partial' : 'ok');
    }

    function getTooltipEl() {
        let tooltip = document.getElementById('barcodeComposerAvailabilityTooltip');
        if (tooltip) return tooltip;
        tooltip = document.createElement('div');
        tooltip.id = 'barcodeComposerAvailabilityTooltip';
        tooltip.className = 'barcode-composer-availability-tooltip';
        tooltip.hidden = true;
        tooltip.setAttribute('role', 'tooltip');
        document.body.appendChild(tooltip);
        return tooltip;
    }

    function showTooltip(anchor, tip) {
        if (!anchor || !tip) return;
        const tooltip = getTooltipEl();
        tooltip.textContent = tip;
        tooltip.hidden = false;
        const a = anchor.getBoundingClientRect();
        const t = tooltip.getBoundingClientRect();
        const margin = 8;
        let left = a.left + (a.width / 2) - (t.width / 2);
        let top = a.top - t.height - margin;
        if (top < margin) top = a.bottom + margin;
        if (left < margin) left = margin;
        if ((left + t.width) > (window.innerWidth - margin)) {
            left = Math.max(margin, window.innerWidth - t.width - margin);
        }
        tooltip.style.left = Math.round(left) + 'px';
        tooltip.style.top = Math.round(top) + 'px';
    }

    function hideTooltip() {
        const tooltip = document.getElementById('barcodeComposerAvailabilityTooltip');
        if (tooltip) tooltip.hidden = true;
    }

    function bindTooltipEvents(composer) {
        if (composer.dataset.availabilityTooltipBound === '1') return;
        composer.dataset.availabilityTooltipBound = '1';

        const resolve = (event) => {
            const node = event && event.target && typeof event.target.closest === 'function'
                ? event.target.closest('[data-bc-tip]')
                : null;
            return node && composer.contains(node) ? node : null;
        };

        const onShow = (event) => {
            const anchor = resolve(event);
            if (!anchor) return;
            const tip = String(anchor.getAttribute('data-bc-tip') || '').trim();
            if (!tip) return;
            showTooltip(anchor, tip);
        };

        composer.addEventListener('mouseover', onShow);
        composer.addEventListener('focusin', onShow);
        composer.addEventListener('mouseout', () => hideTooltip());
        composer.addEventListener('focusout', () => hideTooltip());
    }

    function patchIndicator(app) {
        app.updateBarcodeComposerFieldAvailabilityIndicator = function (arg1, arg2, arg3, arg4, arg5) {
            let fieldRow = null;
            let fieldLabel = null;
            let fieldCheck = null;
            let field = '';
            let status = arg5;

            // Signature legacy: (fieldLabel, field, isAvailable)
            if (arg1 && typeof arg1.querySelector === 'function' && typeof arg2 === 'string' && (typeof arg3 === 'boolean' || typeof arg3 === 'string')) {
                fieldLabel = arg1;
                field = arg2;
                status = arg3;
            } else {
                // Signature moderne: (fieldRow, fieldLabel, fieldCheck, field, availabilityStatus)
                fieldRow = arg1 || null;
                fieldLabel = arg2 || null;
                fieldCheck = arg3 || null;
                field = arg4 || '';
            }

            if (!fieldLabel && fieldRow && typeof fieldRow.querySelector === 'function') {
                fieldLabel = fieldRow.querySelector('.barcode-composer__label');
            }
            if (!fieldLabel || typeof fieldLabel.querySelector !== 'function') return;

            if (typeof status === 'boolean') status = status ? 'full' : 'none';
            if (status !== 'full' && status !== 'partial') status = 'none';

            let indicator = fieldLabel.querySelector('.barcode-composer__availability-dot');
            if (!indicator) {
                indicator = document.createElement('span');
                indicator.className = 'barcode-composer__availability-dot';
                indicator.setAttribute('aria-hidden', 'true');
                indicator.textContent = '!';
                fieldLabel.appendChild(indicator);
            }

            const baseTip = app.getBarcodeComposerFieldUnavailableTooltip(field);
            const tip = status === 'partial'
                ? (baseTip + ' Disponible seulement pour une partie des lots/pieces selectionnes.')
                : (status === 'none' ? baseTip : '');

            const setTip = (node, text) => {
                if (!node) return;
                if (text) {
                    node.setAttribute('data-bc-tip', text);
                    node.setAttribute('aria-label', text);
                } else {
                    node.removeAttribute('data-bc-tip');
                    node.removeAttribute('aria-label');
                }
                node.removeAttribute('title');
            };

            if (status === 'full') {
                indicator.hidden = false;
                indicator.classList.remove('barcode-composer__availability-dot--partial');
                indicator.classList.add('barcode-composer__availability-dot--muted');
                indicator.textContent = '•';
                setTip(indicator, '');
                setTip(fieldRow, '');
                setTip(fieldLabel, '');
                setTip(fieldCheck, '');
                return;
            }

            indicator.hidden = false;
            indicator.classList.remove('barcode-composer__availability-dot--muted');
            indicator.classList.toggle('barcode-composer__availability-dot--partial', status === 'partial');
            indicator.textContent = status === 'partial' ? '~' : '!';
            setTip(indicator, tip);
            setTip(fieldRow, tip);
            setTip(fieldLabel, tip);
            setTip(fieldCheck, tip);
        };
    }

    function postAdjust(app) {
        const composer = document.getElementById('barcodeComposer');
        if (!composer) return;

        bindTooltipEvents(composer);
        const fields = getComposerFields(composer, app);
        const statusMap = getStatusMap(app, fields);

        composer.querySelectorAll('.barcode-composer__check[data-field]').forEach((check) => {
            const field = String(check.getAttribute('data-field') || '').trim();
            if (!field) return;
            // Les champs CI dynamiques (customInfo:*) sont gérés par upsertDynamicCustomInfoFields —
            // ne pas écraser leur état d'availability ici.
            if (field.startsWith('customInfo:')) return;
            const row = composer.querySelector('.barcode-composer__field[data-field="' + field + '"]');
            const label = row ? row.querySelector('.barcode-composer__label') : null;
            const status = statusMap[field] || 'none';
            const isAvailable = status !== 'none';
            if (row) {
                row.dataset.availability = status;
                row.style.opacity = isAvailable ? '1' : '0.4';
            }
            if (check) {
                check.dataset.available = isAvailable ? 'true' : 'false';
                check.dataset.availability = status;
                if (!isAvailable) check.checked = false;
            }
            app.updateBarcodeComposerFieldAvailabilityIndicator(row, label, check, field, status);
        });

        // Exclure les champs CI dynamiques du compte d'indisponibilité (ils ont leur propre indicateur).
        const staticFields = fields.filter(function(f) { return !String(f).startsWith('customInfo:'); });
        updateSummary(app, composer, statusMap, staticFields);
    }

    function patchApp(app) {
        if (!app || app[PATCH_FLAG]) return;
        app[PATCH_FLAG] = true;
        patchIndicator(app);

        const originalInit = typeof app.initBarcodeComposer === 'function' ? app.initBarcodeComposer.bind(app) : null;
        if (originalInit) {
            app.initBarcodeComposer = function (...args) {
                const res = originalInit(...args);
                try { postAdjust(app); } catch (e) { }
                return res;
            };
        }

        const originalRefresh = typeof app.refreshBarcodeComposerPreview === 'function'
            ? app.refreshBarcodeComposerPreview.bind(app)
            : null;
        if (originalRefresh) {
            app.refreshBarcodeComposerPreview = function (...args) {
                const res = originalRefresh(...args);
                try { postAdjust(app); } catch (e) { }
                return res;
            };
        }
    }

    function bootstrap() {
        const app = window.__valoboisApp;
        if (!app) return false;
        patchApp(app);
        return true;
    }

    if (!bootstrap()) {
        let tries = 0;
        const timer = setInterval(() => {
            tries += 1;
            if (bootstrap() || tries > 80) {
                clearInterval(timer);
            }
        }, 200);
    }
})();
