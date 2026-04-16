(function () {
    'use strict';

    var COL_USERS = 'users';
    var COL_EVAL = 'evaluations';
    /** Même clé que dans valobois-firestore-sync.js — survivra si le serveur réécrit l’URL vers `/` sans ?eval=. */
    var SESSION_INTENT_NEW_EVAL = 'valobois_intent_new_eval';
    var SESSION_PENDING_EVAL_ID = 'valobois_pending_eval_id';
    var SESSION_PENDING_EVAL = 'valobois_pending_eval';

    var mesEvalCurrentUser = null;
    var shareModalEl = null;

    function bindNewEvaluationIntentLink() {
        var link = document.getElementById('mesEvalNewEvalLink');
        if (!link) return;
        link.addEventListener('click', function () {
            try {
                sessionStorage.setItem(SESSION_INTENT_NEW_EVAL, '1');
                sessionStorage.removeItem(SESSION_PENDING_EVAL_ID);
                sessionStorage.removeItem(SESSION_PENDING_EVAL);
            } catch (e) {
                /* ignore */
            }
        });
    }

    /** Même onglet : si la query ?eval= est perdue à l’arrivée sur l’éditeur, le sync réinjecte l’id (et owner). */
    function bindOpenExistingEvalIntentDelegation(listEl) {
        if (!listEl) return;
        listEl.addEventListener('click', function (e) {
            var a = e.target && e.target.closest ? e.target.closest('a.mes-eval-item-link') : null;
            if (!a || !a.getAttribute('href')) return;
            try {
                var u = new URL(a.getAttribute('href'), window.location.href);
                var ev = u.searchParams.get('eval');
                if (ev != null && String(ev).trim() !== '' && String(ev).trim() !== 'new') {
                    var id = String(ev).trim();
                    var owner = u.searchParams.get('owner');
                    var ownerTrim = owner != null && String(owner).trim() ? String(owner).trim() : '';
                    sessionStorage.setItem(
                        SESSION_PENDING_EVAL,
                        JSON.stringify({ evalId: id, ownerUid: ownerTrim || null })
                    );
                    sessionStorage.removeItem(SESSION_PENDING_EVAL_ID);
                }
            } catch (err) {
                /* ignore */
            }
        });
    }

    function showError(el, msg) {
        if (!el) return;
        el.textContent = msg || '';
        el.hidden = !msg;
    }

    function displayNameFromDoc(d) {
        if (!d) return t('mesEval.defaultName');
        var name = d.operationName;
        if (name != null && String(name).trim()) return String(name).trim();
        try {
            var parsed = JSON.parse(d.payloadJson || '{}');
            var op = parsed.meta && parsed.meta.operation;
            if (op != null && String(op).trim()) return String(op).trim();
        } catch (e) {
            /* ignore */
        }
        return t('mesEval.defaultName');
    }

    function formatDate(ts) {
        if (!ts || typeof ts.toDate !== 'function') return '';
        try {
            return ts.toDate().toLocaleString(typeof getValoboisIntlLocale === 'function' ? getValoboisIntlLocale() : 'fr-FR', {
                dateStyle: 'short',
                timeStyle: 'short',
            });
        } catch (e) {
            return '';
        }
    }

    function redirectToAuth() {
        var ret = encodeURIComponent('mes-evaluations.html');
        window.location.replace('auth.html?return=' + ret);
    }

    function normalizeUserEmail(user) {
        if (!user || user.email == null) return '';
        return String(user.email).trim().toLowerCase();
    }

    function normalizeEmailList(text) {
        var raw = String(text || '');
        var parts = raw.split(/[\s,;]+/);
        var out = [];
        var seen = {};
        for (var i = 0; i < parts.length; i++) {
            var e = String(parts[i] || '').trim().toLowerCase();
            if (!e || seen[e]) continue;
            seen[e] = true;
            out.push(e);
        }
        return out;
    }

    function emailsToTextareaLines(arr) {
        if (!arr || !arr.length) return '';
        return arr.join('\n');
    }

    function timestampMs(ts) {
        if (!ts || typeof ts.toDate !== 'function') return 0;
        try {
            return ts.toDate().getTime();
        } catch (e) {
            return 0;
        }
    }

    function getShareModal() {
        if (shareModalEl) return shareModalEl;
        var overlay = document.createElement('div');
        overlay.className = 'mes-eval-modal';
        overlay.hidden = true;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        var panel = document.createElement('div');
        panel.className = 'mes-eval-modal-panel card';

        var title = document.createElement('h2');
        title.className = 'mes-eval-modal-title auth-title';
        title.id = 'mesEvalShareModalTitle';

        var hint = document.createElement('p');
        hint.className = 'mes-eval-modal-hint';
        hint.id = 'mesEvalShareModalHint';

        var label = document.createElement('label');
        label.className = 'mes-eval-modal-label';
        label.htmlFor = 'mesEvalShareEmails';
        label.id = 'mesEvalShareModalLabel';

        var ta = document.createElement('textarea');
        ta.id = 'mesEvalShareEmails';
        ta.className = 'mes-eval-modal-textarea';
        ta.rows = 6;

        var err = document.createElement('p');
        err.className = 'auth-error mes-eval-modal-error';
        err.id = 'mesEvalShareModalError';
        err.hidden = true;

        var actions = document.createElement('div');
        actions.className = 'mes-eval-modal-actions';

        var cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.id = 'mesEvalShareCancel';

        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'btn btn-primary';
        saveBtn.id = 'mesEvalShareSave';

        actions.appendChild(cancelBtn);
        actions.appendChild(saveBtn);

        panel.appendChild(title);
        panel.appendChild(hint);
        panel.appendChild(label);
        panel.appendChild(ta);
        panel.appendChild(err);
        panel.appendChild(actions);
        overlay.appendChild(panel);

        document.body.appendChild(overlay);

        shareModalEl = {
            overlay: overlay,
            title: title,
            hint: hint,
            label: label,
            textarea: ta,
            err: err,
            cancelBtn: cancelBtn,
            saveBtn: saveBtn,
            onClose: null,
        };

        overlay.addEventListener('click', function (ev) {
            if (ev.target === overlay && shareModalEl.onClose) shareModalEl.onClose();
        });
        return shareModalEl;
    }

    function applyShareModalI18n(m) {
        if (!m) return;
        m.title.textContent = t('mesEval.shareModalTitle');
        m.hint.textContent = t('mesEval.shareModalHint');
        m.label.textContent = t('mesEval.shareModalEmailsLabel');
        m.cancelBtn.textContent = t('mesEval.shareModalCancel');
        m.saveBtn.textContent = t('mesEval.shareModalSave');
        m.overlay.setAttribute('aria-labelledby', 'mesEvalShareModalTitle');
    }

    function openShareModal(initialEmails, onSave) {
        var m = getShareModal();
        applyShareModalI18n(m);
        m.textarea.value = emailsToTextareaLines(initialEmails);
        m.err.hidden = true;
        m.err.textContent = '';
        m.overlay.hidden = false;

        function close() {
            m.overlay.hidden = true;
            m.onClose = null;
            m.cancelBtn.onclick = null;
            m.saveBtn.onclick = null;
        }

        m.onClose = close;
        m.cancelBtn.onclick = function () {
            close();
        };
        m.saveBtn.onclick = function () {
            var list = normalizeEmailList(m.textarea.value);
            onSave(list, m.err, close);
        };
    }

    function evalHref(evalId, ownerUid, viewerUid) {
        var q = 'index.html?eval=' + encodeURIComponent(evalId);
        if (ownerUid && ownerUid !== viewerUid) {
            q += '&owner=' + encodeURIComponent(ownerUid);
        }
        return q;
    }

    document.addEventListener('DOMContentLoaded', function () {
        bindNewEvaluationIntentLink();
        var errEl = document.getElementById('mesEvalError');
        var hintEl = document.getElementById('mesEvalConfigHint');
        var loadingEl = document.getElementById('mesEvalLoading');
        var listEl = document.getElementById('mesEvalList');
        var emptyEl = document.getElementById('mesEvalEmpty');
        var toolbarEl = document.getElementById('mesEvalToolbar');

        bindOpenExistingEvalIntentDelegation(listEl);

        var auth = typeof getValoboisAuth === 'function' ? getValoboisAuth() : null;
        var db = typeof getValoboisFirestore === 'function' ? getValoboisFirestore() : null;

        if (!auth || !db) {
            if (hintEl) hintEl.hidden = false;
            if (loadingEl) loadingEl.classList.add('hidden');
            showError(errEl, t('mesEval.firebaseNotConfigured'));
            window.addEventListener('valobois:langchange', function () {
                if (errEl && !errEl.hidden) showError(errEl, t('mesEval.firebaseNotConfigured'));
                if (shareModalEl && !shareModalEl.overlay.hidden) applyShareModalI18n(shareModalEl);
            });
            return;
        }
        if (hintEl) hintEl.hidden = true;

        function setLoaded() {
            if (loadingEl) loadingEl.classList.add('hidden');
            if (toolbarEl) toolbarEl.classList.remove('hidden');
        }

        function fetchAndRenderEvaluations(user) {
            if (!listEl || !emptyEl) return;
            showError(errEl, '');
            var col = db.collection(COL_USERS).doc(user.uid).collection(COL_EVAL);
            /** Aligné sur request.auth.token.email des règles Firestore. */
            var emailForQuery = '';

            function runListQueries() {
                var ownedPromise = col
                    .orderBy('updatedAt', 'desc')
                    .get()
                    .then(function (snap) {
                        return { which: 'owned', snap: snap, err: null };
                    })
                    .catch(function (err) {
                        return { which: 'owned', snap: null, err: err };
                    });
                var sharedPromise;
                if (emailForQuery) {
                    sharedPromise = db
                        .collectionGroup(COL_EVAL)
                        .where('sharedEmails', 'array-contains', emailForQuery)
                        .get();
                } else {
                    sharedPromise = Promise.resolve({ docs: [] });
                }

                Promise.all([
                    ownedPromise,
                    sharedPromise
                        .then(function (snap) {
                            return { which: 'shared', snap: snap, err: null };
                        })
                        .catch(function (err) {
                            return { which: 'shared', snap: null, err: err };
                        }),
                ]).then(function (parts) {
                    var ownedPart = parts[0];
                    var sharedPart = parts[1];
                    if (ownedPart.err) {
                        setLoaded();
                        console.error('Mes évaluations — owned', ownedPart.err);
                        showError(errEl, t('mesEval.loadListFailed'));
                        return;
                    }

                    var ownedSnap = ownedPart.snap;
                    var sharedSnap;
                    if (sharedPart.err) {
                        var sCode =
                            sharedPart.err && sharedPart.err.code ? sharedPart.err.code : '';
                        if (sCode === 'permission-denied') {
                            console.warn(
                                'Mes évaluations — requête partagée refusée (collectionGroup ou règles). Affichage des évaluations possédées uniquement.'
                            );
                            sharedSnap = { docs: [] };
                        } else {
                            setLoaded();
                            console.error('Mes évaluations — shared', sharedPart.err);
                            showError(errEl, t('mesEval.loadListFailed'));
                            return;
                        }
                    } else {
                        sharedSnap = sharedPart.snap;
                    }

                    var merged = [];
                    var seen = {};

                    ownedSnap.docs.forEach(function (docSnap) {
                        var key = user.uid + '/' + docSnap.id;
                        if (seen[key]) return;
                        seen[key] = true;
                        merged.push({
                            docSnap: docSnap,
                            ownerUid: user.uid,
                            evalId: docSnap.id,
                            isOwner: true,
                            updatedAt: docSnap.data() && docSnap.data().updatedAt,
                        });
                    });

                    sharedSnap.docs.forEach(function (docSnap) {
                        var ownerDoc =
                            docSnap.ref.parent && docSnap.ref.parent.parent ? docSnap.ref.parent.parent : null;
                        if (!ownerDoc) return;
                        var ownerUid = ownerDoc.id;
                        var key = ownerUid + '/' + docSnap.id;
                        if (seen[key]) return;
                        if (ownerUid === user.uid) return;
                        seen[key] = true;
                        merged.push({
                            docSnap: docSnap,
                            ownerUid: ownerUid,
                            evalId: docSnap.id,
                            isOwner: false,
                            updatedAt: docSnap.data() && docSnap.data().updatedAt,
                        });
                    });

                    merged.sort(function (a, b) {
                        return timestampMs(b.updatedAt) - timestampMs(a.updatedAt);
                    });

                    setLoaded();

                    listEl.textContent = '';
                    if (!merged.length) {
                        listEl.classList.add('hidden');
                        emptyEl.classList.remove('hidden');
                        return;
                    }
                    emptyEl.classList.add('hidden');
                    listEl.classList.remove('hidden');

                    merged.forEach(function (item) {
                        var docSnap = item.docSnap;
                        var d = docSnap.data() || {};
                        var id = item.evalId;
                        var ownerUid = item.ownerUid;
                        var isOwner = item.isOwner;
                        var title = displayNameFromDoc(d);
                        var dateStr = formatDate(d.updatedAt);

                        var li = document.createElement('li');
                        li.className = 'mes-eval-item';

                        var inner = document.createElement('div');
                        inner.className = 'mes-eval-item-inner';

                        var main = document.createElement('div');
                        main.className = 'mes-eval-item-main';

                        var link = document.createElement('a');
                        link.className = 'mes-eval-item-link';
                        link.href = evalHref(id, ownerUid, user.uid);

                        var titleRow = document.createElement('span');
                        titleRow.className = 'mes-eval-item-title-row';

                        var titleEl = document.createElement('span');
                        titleEl.className = 'mes-eval-item-title';
                        titleEl.textContent = title;

                        titleRow.appendChild(titleEl);
                        if (!isOwner) {
                            var badge = document.createElement('span');
                            badge.className = 'mes-eval-shared-badge';
                            badge.textContent = t('mesEval.sharedBadge');
                            titleRow.appendChild(badge);
                        }

                        link.appendChild(titleRow);
                        if (dateStr) {
                            var dateSpan = document.createElement('span');
                            dateSpan.className = 'mes-eval-item-date';
                            dateSpan.textContent = dateStr;
                            link.appendChild(dateSpan);
                        }
                        main.appendChild(link);

                        var actions = document.createElement('div');
                        actions.className = 'mes-eval-item-actions';

                        if (isOwner) {
                            var shareBtn = document.createElement('button');
                            shareBtn.type = 'button';
                            shareBtn.className = 'btn btn-secondary mes-eval-share-btn';
                            shareBtn.textContent = t('mesEval.share');
                            shareBtn.setAttribute(
                                'aria-label',
                                t('mesEval.shareAria').replace(/\{title\}/g, title)
                            );
                            shareBtn.addEventListener('click', function (e) {
                                e.preventDefault();
                                e.stopPropagation();
                                var latest = docSnap.data() || {};
                                var current = Array.isArray(latest.sharedEmails)
                                    ? latest.sharedEmails.slice()
                                    : [];
                                openShareModal(current, function (list, errP, closeModal) {
                                    shareBtn.disabled = true;
                                    col
                                        .doc(id)
                                        .update({ sharedEmails: list })
                                        .then(function () {
                                            shareBtn.disabled = false;
                                            closeModal();
                                            fetchAndRenderEvaluations(user);
                                        })
                                        .catch(function (upErr) {
                                            shareBtn.disabled = false;
                                            console.error('Mes évaluations — partage', upErr);
                                            errP.textContent = t('mesEval.shareSaveFailed');
                                            errP.hidden = false;
                                        });
                                });
                            });
                            actions.appendChild(shareBtn);
                        }

                        if (isOwner) {
                            var delBtn = document.createElement('button');
                            delBtn.type = 'button';
                            delBtn.className = 'btn btn-secondary mes-eval-delete-btn';
                            delBtn.textContent = t('mesEval.delete');
                            delBtn.setAttribute(
                                'aria-label',
                                t('mesEval.deleteAria').replace(/\{title\}/g, title)
                            );
                            delBtn.addEventListener('click', function (e) {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!window.confirm(t('mesEval.deleteConfirm'))) {
                                    return;
                                }
                                delBtn.disabled = true;
                                col
                                    .doc(id)
                                    .delete()
                                    .then(function () {
                                        fetchAndRenderEvaluations(user);
                                    })
                                    .catch(function (delErr) {
                                        delBtn.disabled = false;
                                        console.error('Mes évaluations — suppression', delErr);
                                        showError(errEl, t('mesEval.deleteFailed'));
                                    });
                            });
                            actions.appendChild(delBtn);
                        }

                        inner.appendChild(main);
                        inner.appendChild(actions);
                        li.appendChild(inner);
                        listEl.appendChild(li);
                    });
                });
            }

            if (user && typeof user.getIdTokenResult === 'function') {
                user
                    .getIdTokenResult()
                    .then(function (tr) {
                        var tokenEmail = tr && tr.claims && tr.claims.email;
                        if (tokenEmail != null && String(tokenEmail).trim()) {
                            emailForQuery = String(tokenEmail).trim().toLowerCase();
                        }
                        runListQueries();
                    })
                    .catch(function () {
                        runListQueries();
                    });
            } else {
                runListQueries();
            }
        }

        window.addEventListener('valobois:langchange', function () {
            if (mesEvalCurrentUser) fetchAndRenderEvaluations(mesEvalCurrentUser);
            if (shareModalEl && shareModalEl.overlay && !shareModalEl.overlay.hidden) {
                applyShareModalI18n(shareModalEl);
            }
        });

        auth.onAuthStateChanged(function (user) {
            if (!user) {
                mesEvalCurrentUser = null;
                redirectToAuth();
                return;
            }
            mesEvalCurrentUser = user;
            fetchAndRenderEvaluations(user);
        });
    });
})();
