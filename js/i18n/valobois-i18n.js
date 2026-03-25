/**
 * VALOBOIS i18n — locales fr/en, persisted as valobois_lang in localStorage (default: fr).
 *
 * Mark translatable static HTML with data-i18n="dot.separated.path" matching keys in
 * window.ValoboisLocales[lang]. For HTML entities or <code> inside a string, use
 * data-i18n-html="1" on the same node (value from locale is set as innerHTML — only
 * use with trusted strings).
 *
 * Migrate the large index.html in sections: add data-i18n to headings, labels, buttons;
 * extend valobois-locales.js with matching keys. Dynamic strings in JS should use t().
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'valobois_lang';
    var VALID = { fr: true, en: true };
    var LANG_CHANGE_EVENT = 'valobois:langchange';
    var langListeners = [];

    function getValoboisLang() {
        try {
            var v = localStorage.getItem(STORAGE_KEY);
            if (v && VALID[v]) return v;
        } catch (e) {
            /* ignore */
        }
        return 'fr';
    }

    function resolvePath(obj, path) {
        var parts = path.split('.');
        var cur = obj;
        for (var i = 0; i < parts.length; i++) {
            if (cur == null || typeof cur !== 'object') return undefined;
            cur = cur[parts[i]];
        }
        return typeof cur === 'string' ? cur : undefined;
    }

    function t(key) {
        var locales = window.ValoboisLocales;
        if (!locales || !key) return key || '';
        var lang = getValoboisLang();
        var s = resolvePath(locales[lang], key);
        if (s !== undefined) return s;
        s = resolvePath(locales.fr, key);
        return s !== undefined ? s : key;
    }

    function getValoboisIntlLocale() {
        return getValoboisLang() === 'en' ? 'en-US' : 'fr-FR';
    }

    function applyValoboisI18n(root) {
        var rootEl = root || document;
        document.documentElement.lang = getValoboisLang();

        rootEl.querySelectorAll('[data-i18n]').forEach(function (node) {
            var key = node.getAttribute('data-i18n');
            if (!key) return;
            var val = t(key);
            if (node.hasAttribute('data-i18n-html')) {
                node.innerHTML = val;
            } else {
                node.textContent = val;
            }
        });

        rootEl.querySelectorAll('[data-i18n-title]').forEach(function (node) {
            var key = node.getAttribute('data-i18n-title');
            if (key) node.setAttribute('title', t(key));
        });

        rootEl.querySelectorAll('[data-i18n-aria-label]').forEach(function (node) {
            var key = node.getAttribute('data-i18n-aria-label');
            if (key) node.setAttribute('aria-label', t(key));
        });

        rootEl.querySelectorAll('[data-i18n-placeholder]').forEach(function (node) {
            var key = node.getAttribute('data-i18n-placeholder');
            if (key) node.setAttribute('placeholder', t(key));
        });

        var editorDocTitle = t('editor.meta.docTitle');
        if (editorDocTitle && editorDocTitle !== 'editor.meta.docTitle') {
            document.title = editorDocTitle;
        }

        var sel = document.getElementById('valobois-lang-select');
        if (sel) {
            var current = getValoboisLang();
            if (sel.value !== current) sel.value = current;
        }
    }

    function notifyLangChange() {
        var lang = getValoboisLang();
        langListeners.forEach(function (fn) {
            try {
                fn(lang);
            } catch (e) {
                console.error(e);
            }
        });
        try {
            window.dispatchEvent(
                new CustomEvent(LANG_CHANGE_EVENT, {
                    detail: { lang: lang },
                })
            );
        } catch (e) {
            try {
                var ev = document.createEvent('CustomEvent');
                ev.initCustomEvent(LANG_CHANGE_EVENT, false, false, { lang: lang });
                window.dispatchEvent(ev);
            } catch (e2) {
                /* ignore */
            }
        }
    }

    function setValoboisLang(code) {
        if (!VALID[code]) code = 'fr';
        try {
            localStorage.setItem(STORAGE_KEY, code);
        } catch (e) {
            /* ignore */
        }
        applyValoboisI18n();
        notifyLangChange();
    }

    function onValoboisLangChange(cb) {
        if (typeof cb === 'function') langListeners.push(cb);
    }

    function bindValoboisLangSelect() {
        var sel = document.getElementById('valobois-lang-select');
        if (!sel || sel.dataset.valoboisLangBound === '1') return;
        sel.dataset.valoboisLangBound = '1';
        sel.addEventListener('change', function () {
            setValoboisLang(sel.value);
        });
    }

    function initValoboisI18nBoot() {
        bindValoboisLangSelect();
        applyValoboisI18n();
    }

    window.getValoboisLang = getValoboisLang;
    window.setValoboisLang = setValoboisLang;
    window.t = t;
    window.applyValoboisI18n = applyValoboisI18n;
    window.getValoboisIntlLocale = getValoboisIntlLocale;
    window.onValoboisLangChange = onValoboisLangChange;

    document.addEventListener('DOMContentLoaded', initValoboisI18nBoot);
})();
