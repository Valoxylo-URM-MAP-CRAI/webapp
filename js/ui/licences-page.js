(function () {
    'use strict';

    function initLangSelect() {
        var select = document.getElementById('valobois-lang-select');
        if (!select || typeof window.getValoboisLang !== 'function') return;
        select.value = window.getValoboisLang();
        select.addEventListener('change', function () {
            try {
                localStorage.setItem('valobois_lang', select.value);
            } catch (e) { /* ignore */ }
            document.documentElement.lang = select.value;
            if (typeof window.applyValoboisI18n === 'function') {
                window.applyValoboisI18n();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (typeof window.applyValoboisI18n === 'function') {
            window.applyValoboisI18n();
        }
        initLangSelect();
    });
})();
