(function (global) {
    'use strict';

    var STORAGE_KEY = 'valoboisEditorTab';
    var ORDER = ['general', 'lots', 'notation', 'analyse', 'synthese'];

    function tabButton(id) {
        return document.getElementById('editor-tab-' + id);
    }

    function tabPanel(id) {
        return document.getElementById('editor-tabpanel-' + id);
    }

    function selectTab(tabId, opts) {
        var skipStorage = opts && opts.skipStorage;
        var silent = opts && opts.silent;
        if (ORDER.indexOf(tabId) === -1) return;

        ORDER.forEach(function (id) {
            var btn = tabButton(id);
            var panel = tabPanel(id);
            if (!btn || !panel) return;
            var on = id === tabId;
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
            btn.tabIndex = on ? 0 : -1;
            if (on) panel.removeAttribute('hidden');
            else panel.setAttribute('hidden', '');
        });

        if (!skipStorage) {
            try {
                global.sessionStorage.setItem(STORAGE_KEY, tabId);
            } catch (e) { /* ignore */ }
        }

        if (!silent) {
            global.dispatchEvent(new CustomEvent('valobois-editor-tab', { detail: { id: tabId } }));
        }

        var hook = global.ValoboisEditorTabPanels && global.ValoboisEditorTabPanels[tabId];
        if (typeof hook === 'function') {
            try {
                hook();
            } catch (e) {
                console.warn('ValoboisEditorTabPanels.' + tabId, e);
            }
        }
    }

    function storedTab() {
        try {
            var v = global.sessionStorage.getItem(STORAGE_KEY);
            if (v && ORDER.indexOf(v) !== -1) return v;
        } catch (e) { /* ignore */ }
        return 'general';
    }

    function onTabBarKeydown(ev) {
        var bar = document.getElementById('editorTabBar');
        if (!bar || !bar.contains(ev.target)) return;
        var i = ORDER.indexOf(ev.target.getAttribute('data-tab-id'));
        if (i === -1) return;

        var next = -1;
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') next = (i + 1) % ORDER.length;
        else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') next = (i - 1 + ORDER.length) % ORDER.length;
        else if (ev.key === 'Home') next = 0;
        else if (ev.key === 'End') next = ORDER.length - 1;
        else return;

        ev.preventDefault();
        var btn = tabButton(ORDER[next]);
        if (btn) {
            btn.focus();
            selectTab(ORDER[next]);
        }
    }

    function init() {
        var bar = document.getElementById('editorTabBar');
        if (!bar) return;

        bar.addEventListener('click', function (ev) {
            var t = ev.target.closest('.editor-tab');
            if (!t || !bar.contains(t)) return;
            var id = t.getAttribute('data-tab-id');
            if (id) selectTab(id);
        });

        bar.addEventListener('keydown', onTabBarKeydown);

        selectTab(storedTab(), { skipStorage: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    global.ValoboisEditorTabs = { selectTab: selectTab, ORDER: ORDER };
})(typeof window !== 'undefined' ? window : this);
