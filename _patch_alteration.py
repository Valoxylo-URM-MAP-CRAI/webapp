with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Ajouter le bouton alerte dans la row alterationTraces (après traces-info-small-btn)
old_row = (
    '                            <button class="traces-info-small-btn" type="button" data-info="alterationTraces" data-i18n="editor.common.info">info</button>\n'
    '                            <div class="traces-slider-wrapper">'
)
new_row = (
    '                            <button class="traces-info-small-btn" type="button" data-info="alterationTraces" data-i18n="editor.common.info">info</button>\n'
    '                            <button class="lot-alert-btn lot-alert-btn--traces-alteration"\n'
    '                                    type="button"\n'
    '                                    data-alert-alteration-state="none"\n'
    '                                    data-traces-alteration-alert-btn>\n'
    '                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"\n'
    '                                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n'
    '                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"/>\n'
    '                                    <line x1="12" y1="9" x2="12" y2="13"/>\n'
    '                                    <line x1="12" y1="17" x2="12.01" y2="17"/>\n'
    '                                </svg>\n'
    '                            </button>\n'
    '                            <div class="traces-slider-wrapper">'
)
if old_row in content:
    content = content.replace(old_row, new_row, 1)
    print('bouton alerte OK')
else:
    print('bouton alerte NOT FOUND')

# 2. Après la modale détail Traces, ajouter les 2 nouvelles modales
old_after_traces_detail = (
    '                <!-- Section Provenance -->\n'
    '                <section class="card mt-16 provenance-card" id="provenanceSection" style="display:block;">'
)
new_after_traces_detail = (
    '                <!-- Modale alerte Alt\u00e9ration -->\n'
    '                <div class="modal-backdrop hidden" id="alterationAlertModalBackdrop" aria-hidden="true">\n'
    '                    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="alterationAlertModalTitle">\n'
    '                        <header class="modal-header">\n'
    '                            <h2 id="alterationAlertModalTitle" class="text-center">Alt\u00e9ration forte</h2>\n'
    '                            <button class="modal-close" type="button" id="btnCloseAlterationAlertModal">\u00d7</button>\n'
    '                        </header>\n'
    '                        <div class="modal-body">\n'
    '                            <div class="detail-modal-content" id="alterationAlertModalContent"></div>\n'
    '                        </div>\n'
    '                        <footer class="modal-footer modal-footer--alteration-alert">\n'
    '                            <button class="btn btn-secondary" type="button" id="btnIgnoreAlterationAlert">\n'
    '                                Ignorer\n'
    '                            </button>\n'
    '                            <button class="btn btn-warning" type="button" id="btnRevisionAlterationAlert">\n'
    '                                R\u00e9vision\n'
    '                            </button>\n'
    '                            <button class="btn btn-primary" type="button" id="btnCloseAlterationAlertFooter">\n'
    '                                J\u2019ai compris\n'
    '                            </button>\n'
    '                        </footer>\n'
    '                    </div>\n'
    '                </div>\n'
    '\n'
    '                <!-- Modale r\u00e9vision Alt\u00e9ration -->\n'
    '                <div class="modal-backdrop hidden" id="alterationRevisionModalBackdrop" aria-hidden="true">\n'
    '                    <div class="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="alterationRevisionModalTitle">\n'
    '                        <header class="modal-header">\n'
    '                            <h2 id="alterationRevisionModalTitle" class="text-center">R\u00e9vision des notations</h2>\n'
    '                            <button class="modal-close" type="button" id="btnCloseAlterationRevisionModal">\u00d7</button>\n'
    '                        </header>\n'
    '                        <div class="modal-body">\n'
    '                            <p style="font-size:0.85rem;margin-bottom:12px;">S\u00e9lectionnez les groupes de crit\u00e8res \u00e0 r\u00e9initialiser, puis choisissez l\u2019orientation \u00e0 forcer.</p>\n'
    '                            <div id="alterationRevisionGroups" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;"></div>\n'
    '                            <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:6px;">Orientation forc\u00e9e</label>\n'
    '                            <select id="alterationRevisionOrientation" class="alteration-revision-select">\n'
    '                                <option value="">Calcul\u00e9e automatiquement</option>\n'
    '                                <option value="reemploi">R\u00e9emploi</option>\n'
    '                                <option value="reutilisation">R\u00e9utilisation</option>\n'
    '                                <option value="recyclage">Recyclage</option>\n'
    '                                <option value="combustion">Combustion</option>\n'
    '                            </select>\n'
    '                        </div>\n'
    '                        <footer class="modal-footer">\n'
    '                            <button class="btn btn-primary btn-full" type="button" id="btnConfirmAlterationRevision">\n'
    '                                Confirmer et d\u00e9griser\n'
    '                            </button>\n'
    '                        </footer>\n'
    '                    </div>\n'
    '                </div>\n'
    '\n'
    '                <!-- Section Provenance -->\n'
    '                <section class="card mt-16 provenance-card" id="provenanceSection" style="display:block;">'
)
if old_after_traces_detail in content:
    content = content.replace(old_after_traces_detail, new_after_traces_detail, 1)
    print('modales OK')
else:
    print('modales NOT FOUND')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('done')
