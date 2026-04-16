(function (global) {
    'use strict';
    global.ValoboisEditorTabPanels = global.ValoboisEditorTabPanels || {};
    global.ValoboisEditorTabPanels.analyse = function () {
        var app = global.__valoboisApp;
        if (!app) return;
        try {
            if (typeof app.renderSeuils === 'function') app.renderSeuils();
            if (typeof app.renderRadar === 'function') app.renderRadar();
            if (typeof app.renderScatterDims === 'function') app.renderScatterDims();
        } catch (e) {
            console.warn('editor-tab-analyse', e);
        }
    };
})(typeof window !== 'undefined' ? window : this);
