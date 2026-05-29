(function (global) {
    'use strict';

    function getFormatLocale() {
        return typeof getValoboisIntlLocale === 'function' ? getValoboisIntlLocale() : 'fr-FR';
    }

    function valoboisFormatPco2Display(valueKgRaw) {
        var valueKg = Math.max(0, parseFloat(valueKgRaw) || 0);
        if (valueKg >= 1000) {
            return {
                value: (valueKg / 1000).toLocaleString(getFormatLocale(), {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }),
                unit: 't CO₂ (NF EN 16449)'
            };
        }
        return {
            value: Math.round(valueKg).toLocaleString(getFormatLocale(), { maximumFractionDigits: 0 }),
            unit: 'kg CO₂ (NF EN 16449)'
        };
    }

    function valoboisFormatCV(val) {
        if (val == null) return '—';
        return (val * 100).toLocaleString(getFormatLocale(), {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }) + '\u00a0%';
    }

    function valoboisFormatEIq(val) {
        if (val == null) return '—';
        return (val * 100).toLocaleString(getFormatLocale(), {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }) + '\u00a0%';
    }

    function valoboisFormatEcartType(val) {
        if (val == null) return '—';
        return Math.round(val).toLocaleString(getFormatLocale(), {
            maximumFractionDigits: 0
        }) + '\u00a0mm';
    }

    function valoboisFormatEIqAbs(val) {
        if (val == null) return '—';
        return Math.round(val).toLocaleString(getFormatLocale(), {
            maximumFractionDigits: 0
        }) + '\u00a0mm';
    }

    function valoboisFormatTauxSimilarite(val) {
        if (val === null || val === undefined) return 'Inconnue';
        return Math.round(val).toLocaleString(getFormatLocale(), {
            maximumFractionDigits: 0
        }) + '\u00a0%';
    }

    function valoboisEscapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function valoboisNormalizeDecimalForCsv(value) {
        if (value == null) return '';
        if (typeof value === 'number') return Number.isFinite(value) ? value : '';
        return String(value).replace(/(\d),(\d)/g, '$1.$2');
    }

    function valoboisEscapeCsvValue(value) {
        var normalized = value == null ? '' : String(value);
        return '"' + normalized.replace(/"/g, '""') + '"';
    }

    function valoboisNormalizeAllotissementNumericInput(rawValue) {
        var raw = (rawValue == null ? '' : String(rawValue))
            .replace(/[\s\u00A0\u202F]/g, '')
            .replace(/,/g, '.');

        if (!raw) return '';

        var cleaned = raw.replace(/[^0-9.\-]/g, '');
        cleaned = cleaned.replace(/(?!^)-/g, '');

        var firstDot = cleaned.indexOf('.');
        if (firstDot !== -1) {
            cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
        }

        if (cleaned === '-' || cleaned === '.' || cleaned === '-.') return '';
        return cleaned;
    }

    function valoboisFormatAllotissementNumericDisplay(rawValue) {
        var normalized = valoboisNormalizeAllotissementNumericInput(rawValue);
        if (!normalized) return '';

        var negative = normalized.startsWith('-');
        var unsigned = negative ? normalized.slice(1) : normalized;
        var parts = unsigned.split('.');
        var intPart = (parts[0] || '0').replace(/^0+(?=\d)/, '');
        var groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

        if (parts[1] != null && parts[1] !== '') {
            return (negative ? '-' : '') + groupedInt + ',' + parts[1];
        }
        return (negative ? '-' : '') + groupedInt;
    }

    function valoboisFormatDensityDisplay(valueRaw) {
        var value = parseFloat(valueRaw);
        if (!Number.isFinite(value) || value < 0) return '';
        return value.toLocaleString(getFormatLocale(), {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1
        });
    }

    function valoboisFormatRegulariteAlertMm(value) {
        if (!Number.isFinite(Number(value))) return '—';
        return Number(value).toLocaleString(getFormatLocale(), {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1
        }) + ' mm';
    }

    function valoboisFormatAlertMm(value) {
        if (!Number.isFinite(Number(value))) return '— mm';
        return Math.round(Number(value)) + ' mm';
    }

    function valoboisFormatAlertVolume(value) {
        if (!Number.isFinite(Number(value))) return '— m³';
        var num = Number(value);
        return num.toLocaleString(getFormatLocale(), {
            minimumFractionDigits: 2,
            maximumFractionDigits: 3
        }) + ' m³';
    }

    function valoboisFormatAlertRatio(value) {
        if (!Number.isFinite(Number(value))) return '—';
        return Number(value).toFixed(2);
    }

    function valoboisFormatAlertAnnees(value) {
        if (!Number.isFinite(Number(value))) return '—';
        var num = Number(value);
        return Math.round(num * 10) / 10 + ' ans';
    }

    function valoboisFormatAlertDiametre(value) {
        if (!value || String(value).trim() === '') return '— mm';
        var num = parseFloat(String(value).replace(/,/, '.'));
        if (!Number.isFinite(num)) return '— mm';
        return Math.round(num) + ' mm';
    }

    global.valoboisFormatPco2Display = valoboisFormatPco2Display;
    global.valoboisFormatCV = valoboisFormatCV;
    global.valoboisFormatEIq = valoboisFormatEIq;
    global.valoboisFormatEcartType = valoboisFormatEcartType;
    global.valoboisFormatEIqAbs = valoboisFormatEIqAbs;
    global.valoboisFormatTauxSimilarite = valoboisFormatTauxSimilarite;
    global.valoboisEscapeHtml = valoboisEscapeHtml;
    global.valoboisNormalizeDecimalForCsv = valoboisNormalizeDecimalForCsv;
    global.valoboisEscapeCsvValue = valoboisEscapeCsvValue;
    global.valoboisNormalizeAllotissementNumericInput = valoboisNormalizeAllotissementNumericInput;
    global.valoboisFormatAllotissementNumericDisplay = valoboisFormatAllotissementNumericDisplay;
    global.valoboisFormatDensityDisplay = valoboisFormatDensityDisplay;
    global.valoboisFormatRegulariteAlertMm = valoboisFormatRegulariteAlertMm;
    global.valoboisFormatAlertMm = valoboisFormatAlertMm;
    global.valoboisFormatAlertVolume = valoboisFormatAlertVolume;
    global.valoboisFormatAlertRatio = valoboisFormatAlertRatio;
    global.valoboisFormatAlertAnnees = valoboisFormatAlertAnnees;
    global.valoboisFormatAlertDiametre = valoboisFormatAlertDiametre;
})(typeof window !== 'undefined' ? window : globalThis);