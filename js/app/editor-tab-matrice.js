(function (global) {
    'use strict';

    var panels = global.ValoboisEditorTabPanels || (global.ValoboisEditorTabPanels = {});

    panels.matrice = function () {
        var app = global.__valoboisApp;
        if (!app || typeof app.renderMatrice !== 'function') return;
        app.renderMatrice();
    };
})(typeof window !== 'undefined' ? window : this);
