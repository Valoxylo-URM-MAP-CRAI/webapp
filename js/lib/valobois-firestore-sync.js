/**
 * Mode invité : pas de Firestore (LocalStorage dans ValoboisApp).
 * Mode connecté sur index.html : données Firestore users/{ownerUid}/evaluations/{evalId}.
 * L’id d’évaluation vient de ?eval= ; le propriétaire du doc peut être passé en ?owner= (partage).
 * Note : un collectionGroup sur le nom « evaluations » peut être refusé si d’autres collections du même
 * nom existent dans le projet Firebase (voir dégradation silencieuse côté liste « partagées »).
 *
 * Règles Firestore à publier dans la console Firebase (copier-coller) :
 *
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     function signedIn() { return request.auth != null; }
 *     function userEmailLower() {
 *       return signedIn() && request.auth.token.email != null
 *         ? request.auth.token.email.lower() : '';
 *     }
 *     function isOwner(userId) { return signedIn() && request.auth.uid == userId; }
 *     function isSharedEditor() {
 *       return signedIn() && userEmailLower() != ''
 *         && resource.data.sharedEmails is list
 *         && userEmailLower() in resource.data.sharedEmails;
 *     }
 *     function canReadEval(userId) { return isOwner(userId) || isSharedEditor(); }
 *     function sharedEditorPayloadOnlyUpdate() {
 *       return isSharedEditor()
 *         && request.resource.data.sharedEmails == resource.data.sharedEmails
 *         && request.resource.data.diff(resource.data).affectedKeys()
 *              .hasOnly(['payloadJson', 'revision', 'updatedAt', 'operationName',
 *                        'statutEtude', 'versionEtude', 'localisation', 'volumeTotal', 'bilanEconomique']);
 *     }
 *     match /users/{userId}/evaluations/{evalId} {
 *       allow read: if canReadEval(userId);
 *       allow create: if isOwner(userId);
 *       allow update: if isOwner(userId) || sharedEditorPayloadOnlyUpdate();
 *       allow delete: if isOwner(userId);
 *     }
 *   }
 * }
 */
(function (global) {
    'use strict';

    var DEBOUNCE_MS = 500;
    var COL_USERS = 'users';
    var COL_EVAL = 'evaluations';
    var LISTING_PAGE = 'mes-evaluations.html';
    var SESSION_INTENT_NEW_EVAL = 'valobois_intent_new_eval';
    /** Id doc Firestore à réappliquer en ?eval= si la navigation a perdu la query (ex. réécriture vers `/`). */
    var SESSION_PENDING_EVAL_ID = 'valobois_pending_eval_id';
    /** Objet JSON { evalId, ownerUid } pour réinjecter ?eval= et ?owner=. */
    var SESSION_PENDING_EVAL = 'valobois_pending_eval';

    /** Champs `ui` purement interface : jamais dans payloadJson. */
    function stripUiOnlyFieldsFromCloudPayloadRoot(root) {
        if (!root || typeof root !== 'object') return;
        if (!root.ui || typeof root.ui !== 'object') return;
        try {
            delete root.ui.collapsibles;
        } catch (e) {
            /* ignore */
        }
        try {
            delete root.ui.detailLotActiveCardByLot;
        } catch (e2) {
            /* ignore */
        }
    }

    /**
     * JSON écrit dans payloadJson : clone + retrait des champs UI non modèle sous `ui`.
     * Ne jamais faire JSON.stringify(appInstance.data) directement (référence ou fallback oublié).
     */
    function buildPayloadJsonForCloud(appInstance) {
        if (!appInstance || !appInstance.data) return '{}';
        var root;
        try {
            if (typeof appInstance.prepareDataForCloudSnapshot === 'function') {
                root = appInstance.prepareDataForCloudSnapshot();
            } else {
                root = JSON.parse(JSON.stringify(appInstance.data));
            }
        } catch (e) {
            console.warn('Valobois buildPayloadJsonForCloud (prepare/clone)', e);
            try {
                root = JSON.parse(JSON.stringify(appInstance.data));
            } catch (e2) {
                console.warn('Valobois buildPayloadJsonForCloud (fallback)', e2);
                return '{}';
            }
        }
        stripUiOnlyFieldsFromCloudPayloadRoot(root);
        try {
            return JSON.stringify(root);
        } catch (e3) {
            console.warn('Valobois buildPayloadJsonForCloud (stringify)', e3);
            return '{}';
        }
    }

    function isValidFirestoreUid(s) {
        if (s == null || typeof s !== 'string') return false;
        var t = s.trim();
        if (t.length < 10 || t.length > 128) return false;
        return /^[a-zA-Z0-9]+$/.test(t);
    }

    function getOwnerUidFromUrl() {
        try {
            var u = new URL(global.location.href);
            var raw = u.searchParams.get('owner');
            if (raw == null || raw === '') return '';
            var o = String(raw).trim();
            return isValidFirestoreUid(o) ? o : '';
        } catch (e) {
            return '';
        }
    }

    /** Propriétaire Firestore du document courant (chemin users/{uid}/evaluations/...). */
    function getEvalOwnerUid(authUser) {
        if (!authUser) return '';
        var fromUrl = getOwnerUidFromUrl();
        if (fromUrl) return fromUrl;
        return authUser.uid;
    }

    /** Si l’URL n’a pas d’eval, restaure depuis session (puis replaceState). Contre-indiqué si on ouvre une nouvelle éval. */
    function promotePendingEvalIdFromSession(skipNewEvalIntentFlag) {
        if (skipNewEvalIntentFlag) {
            try {
                global.sessionStorage.removeItem(SESSION_PENDING_EVAL_ID);
                global.sessionStorage.removeItem(SESSION_PENDING_EVAL);
            } catch (e) {
                /* ignore */
            }
            return;
        }
        if (getEvalIdFromUrl()) {
            try {
                global.sessionStorage.removeItem(SESSION_PENDING_EVAL_ID);
                global.sessionStorage.removeItem(SESSION_PENDING_EVAL);
            } catch (e) {
                /* ignore */
            }
            return;
        }
        try {
            var json = global.sessionStorage.getItem(SESSION_PENDING_EVAL);
            if (json && String(json).trim()) {
                var obj = JSON.parse(String(json));
                global.sessionStorage.removeItem(SESSION_PENDING_EVAL);
                var id = obj && obj.evalId != null ? String(obj.evalId).trim() : '';
                var ownerRaw = obj && obj.ownerUid != null ? String(obj.ownerUid).trim() : '';
                if (id && id !== 'new') {
                    setEvalAndOwnerInUrl(id, isValidFirestoreUid(ownerRaw) ? ownerRaw : '');
                    return;
                }
            }
        } catch (eJ) {
            /* ignore */
        }
        try {
            var pending = global.sessionStorage.getItem(SESSION_PENDING_EVAL_ID);
            if (!pending || !String(pending).trim()) return;
            global.sessionStorage.removeItem(SESSION_PENDING_EVAL_ID);
            var id2 = String(pending).trim();
            if (!id2 || id2 === 'new') return;
            setEvalAndOwnerInUrl(id2, '');
        } catch (e) {
            /* ignore */
        }
    }

    function evalCollection(db, uid) {
        return db.collection(COL_USERS).doc(uid).collection(COL_EVAL);
    }

    function evalRef(db, uid, evalId) {
        return evalCollection(db, uid).doc(evalId);
    }

    function getEvalIdFromUrl() {
        try {
            var u = new URL(global.location.href);
            var raw = u.searchParams.get('eval');
            if (raw == null || raw === '') return '';
            var id = String(raw).trim();
            if (!id || id === 'new') return '';
            return id;
        } catch (e) {
            return '';
        }
    }

    /** True tant que ?eval=new est dans l’URL (ex. scripts defer ont couru avant le redirect inline). */
    function urlIndicatesNewEval() {
        try {
            return new URL(global.location.href).searchParams.get('eval') === 'new';
        } catch (e) {
            return false;
        }
    }

    function setEvalAndOwnerInUrl(evalId, ownerUid) {
        try {
            var u = new URL(global.location.href);
            u.searchParams.set('eval', evalId);
            if (ownerUid && String(ownerUid).trim()) {
                u.searchParams.set('owner', String(ownerUid).trim());
            } else {
                u.searchParams.delete('owner');
            }
            global.history.replaceState({}, '', u.pathname + u.search + u.hash);
        } catch (e) {
            /* ignore */
        }
    }

    function isIndexEditorPage() {
        try {
            var path = (global.location.pathname || '').toLowerCase();
            if (path === '' || path === '/') return true;
            if (path.endsWith('/index.html')) return true;
            if (path.endsWith('index.html')) return true;
            return false;
        } catch (e) {
            return true;
        }
    }

    function consumeNewEvalHash() {
        try {
            if (global.location.hash === '#valobois_new_eval') {
                try {
                    global.sessionStorage.removeItem(SESSION_INTENT_NEW_EVAL);
                } catch (eS) {
                    /* ignore */
                }
                var u = new URL(global.location.href);
                u.hash = '';
                global.history.replaceState({}, '', u.pathname + u.search + u.hash);
                return true;
            }
        } catch (e) {
            /* ignore */
        }
        return false;
    }

    function consumeNewEvalIntentFromSession() {
        try {
            if (global.sessionStorage.getItem(SESSION_INTENT_NEW_EVAL) === '1') {
                global.sessionStorage.removeItem(SESSION_INTENT_NEW_EVAL);
                return true;
            }
        } catch (e) {
            /* ignore */
        }
        return false;
    }

    function redirectToListing() {
        try {
            global.location.replace(LISTING_PAGE);
        } catch (e) {
            global.location.href = LISTING_PAGE;
        }
    }

    function operationNameFromApp(appInstance) {
        var op = appInstance && appInstance.data && appInstance.data.meta && appInstance.data.meta.operation;
        var s = (op == null ? '' : String(op)).trim();
        return s || 'Sans nom';
    }

    function computeVolumeTotal(lots) {
        if (!Array.isArray(lots)) return 0;
        var sum = 0;
        for (var i = 0; i < lots.length; i++) {
            sum += parseFloat(lots[i].allotissement && lots[i].allotissement.volumeLot) || 0;
        }
        return Math.round(sum * 1000) / 1000;
    }

    function computeBilanEconomique(lots) {
        if (!Array.isArray(lots)) return 0;
        var sum = 0;
        for (var i = 0; i < lots.length; i++) {
            sum += parseFloat(lots[i].allotissement && lots[i].allotissement.prixLotAjusteIntegrite) || 0;
        }
        return Math.round(sum);
    }

    function buildDenormalizedFields(appInstance) {
        var meta = (appInstance && appInstance.data && appInstance.data.meta) || {};
        var lots = (appInstance && appInstance.data && appInstance.data.lots) || [];
        return {
            statutEtude: Number(meta.statutEtude) || 0,
            versionEtude: String(meta.versionEtude || '').trim(),
            localisation: String(meta.localisation || '').trim(),
            volumeTotal: computeVolumeTotal(lots),
            bilanEconomique: computeBilanEconomique(lots),
        };
    }

    function notifyPersistenceUi(appInstance) {
        if (appInstance && typeof appInstance.refreshPersistenceUi === 'function') {
            appInstance.refreshPersistenceUi();
        }
    }

    function attachValoboisFirestoreSync(app) {
        var skipNewEvalIntent =
            urlIndicatesNewEval() || consumeNewEvalHash() || consumeNewEvalIntentFromSession();
        promotePendingEvalIdFromSession(skipNewEvalIntent);

        var auth = typeof getValoboisAuth === 'function' ? getValoboisAuth() : null;
        var db = typeof getValoboisFirestore === 'function' ? getValoboisFirestore() : null;

        if (!auth || !db) {
            if (app.persistenceMode === 'cloud') {
                app.persistenceMode = 'guest';
                if (typeof app.reloadGuestStateFromLocalStorage === 'function') {
                    app.reloadGuestStateFromLocalStorage();
                }
            }
            notifyPersistenceUi(app);
            if (global.window) {
                global.window.dispatchEvent(
                    new CustomEvent('valobois:cloudsync', { detail: { state: 'hidden' } })
                );
            }
            return;
        }

        if (auth.currentUser && isIndexEditorPage()) {
            if (getEvalIdFromUrl() || skipNewEvalIntent) {
                app.persistenceMode = 'cloud';
            }
        }
        notifyPersistenceUi(app);

        var loading = false;
        var scheduledTimer = null;
        var lastAuthUid = null;
        var deferredSaveApp = null;
        var inFlightWrites = 0;

        function emitCloudSyncState() {
            if (!global.window) return;
            var state = 'hidden';
            if (
                auth.currentUser &&
                isIndexEditorPage() &&
                app.persistenceMode === 'cloud'
            ) {
                if (loading) {
                    state = 'hidden';
                } else if (scheduledTimer != null || inFlightWrites > 0) {
                    state = 'saving';
                } else {
                    state = 'saved';
                }
            }
            global.window.dispatchEvent(
                new CustomEvent('valobois:cloudsync', { detail: { state: state } })
            );
        }

        function cancelSchedule() {
            if (scheduledTimer) {
                clearTimeout(scheduledTimer);
                scheduledTimer = null;
            }
            emitCloudSyncState();
        }

        function finishLoading() {
            loading = false;
            if (deferredSaveApp && auth.currentUser) {
                var pending = deferredSaveApp;
                deferredSaveApp = null;
                cancelSchedule();
                scheduledTimer = setTimeout(function () {
                    scheduledTimer = null;
                    flushToFirestore(pending);
                }, DEBOUNCE_MS);
            }
            emitCloudSyncState();
        }

        function applyRemoteData(appInstance, parsed) {
            if (!parsed || !parsed.lots || !Array.isArray(parsed.lots)) return;
            if (typeof appInstance.sanitizeCloudPayloadBeforeApply === 'function') {
                appInstance.sanitizeCloudPayloadBeforeApply(parsed);
            }
            appInstance.data = parsed;
            appInstance.data.meta = appInstance.getDefaultMeta(appInstance.data.meta || {});
            appInstance.data.ui = appInstance.getDefaultUi(appInstance.data.ui || {});
            appInstance.data.lots.forEach(function (lot) {
                appInstance.normalizeLotEssenceFields(lot);
                appInstance.normalizeLotAllotissementFields(lot);
            });
            var n = appInstance.data.lots.length;
            if (typeof appInstance.currentLotIndex === 'number' && appInstance.currentLotIndex >= n) {
                appInstance.currentLotIndex = Math.max(0, n - 1);
            }
            if (typeof appInstance.resetDetailLotActiveCardStore === 'function') {
                appInstance.resetDetailLotActiveCardStore();
            }
            appInstance.render();
        }

        function flushToFirestore(appInstance) {
            if (loading) return;
            var u = auth.currentUser;
            if (!u || !appInstance || !appInstance.data) return;
            var evalId = getEvalIdFromUrl();
            if (!evalId) return;
            var ownerUid = getEvalOwnerUid(u);
            var rev = Number(appInstance.data.meta && appInstance.data.meta.revision) || 0;
            var payload = Object.assign({
                payloadJson: buildPayloadJsonForCloud(appInstance),
                revision: rev,
                updatedAt: global.firebase.firestore.FieldValue.serverTimestamp(),
                operationName: operationNameFromApp(appInstance),
            }, buildDenormalizedFields(appInstance));
            inFlightWrites++;
            emitCloudSyncState();
            return evalRef(db, ownerUid, evalId)
                .set(payload, { merge: true })
                .catch(function (e) {
                    console.error('Valobois Firestore save', e);
                })
                .finally(function () {
                    inFlightWrites--;
                    emitCloudSyncState();
                });
        }

        function scheduleCloudSave(appInstance) {
            if (!auth.currentUser) return;
            if (loading) {
                deferredSaveApp = appInstance;
                return;
            }
            deferredSaveApp = null;
            cancelSchedule();
            scheduledTimer = setTimeout(function () {
                scheduledTimer = null;
                flushToFirestore(appInstance);
            }, DEBOUNCE_MS);
            emitCloudSyncState();
        }

        function resetLocalDraftToBlank(appInstance) {
            if (!appInstance || typeof appInstance.createInitialData !== 'function') return;
            try {
                if (global.window && global.window.__VALOBOIS_DATA__) {
                    try {
                        delete global.window.__VALOBOIS_DATA__;
                    } catch (x) {
                        global.window.__VALOBOIS_DATA__ = undefined;
                    }
                }
            } catch (e2) {
                /* ignore */
            }
            appInstance.data = appInstance.createInitialData();
            appInstance.currentLotIndex = 0;
            if (typeof appInstance.resetDetailLotActiveCardStore === 'function') {
                appInstance.resetDetailLotActiveCardStore();
            }
            appInstance.render();
        }

        function enterGuestMode(appInstance) {
            appInstance.persistenceMode = 'guest';
            try {
                localStorage.removeItem('valobois_firestore_eval_id');
            } catch (e) {
                /* ignore */
            }
            cancelSchedule();
            deferredSaveApp = null;
            if (typeof appInstance.reloadGuestStateFromLocalStorage === 'function') {
                appInstance.reloadGuestStateFromLocalStorage();
            }
            notifyPersistenceUi(appInstance);
        }

        function enterCloudModeOnIndex(appInstance, user) {
            if (!isIndexEditorPage()) {
                finishLoading();
                return;
            }

            var evalId = getEvalIdFromUrl();

            if (!evalId && !skipNewEvalIntent) {
                redirectToListing();
                finishLoading();
                return;
            }

            appInstance.persistenceMode = 'cloud';
            notifyPersistenceUi(appInstance);

            try {
                localStorage.removeItem('valobois_v1');
                localStorage.removeItem('valobois_firestore_eval_id');
            } catch (e) {
                /* ignore */
            }

            loading = true;
            emitCloudSyncState();

            if (skipNewEvalIntent) {
                resetLocalDraftToBlank(appInstance);
                var newId = evalCollection(db, user.uid).doc().id;
                setEvalAndOwnerInUrl(newId, '');
                var rev = Number(appInstance.data.meta && appInstance.data.meta.revision) || 0;
                var payload = Object.assign({
                    payloadJson: buildPayloadJsonForCloud(appInstance),
                    revision: rev,
                    updatedAt: global.firebase.firestore.FieldValue.serverTimestamp(),
                    operationName: operationNameFromApp(appInstance),
                }, buildDenormalizedFields(appInstance));
                evalRef(db, user.uid, newId)
                    .set(payload)
                    .then(function () {
                        finishLoading();
                    })
                    .catch(function (e) {
                        console.error('Valobois Firestore create eval', e);
                        finishLoading();
                    });
                return;
            }

            var evalOwnerUid = getEvalOwnerUid(user);

            evalRef(db, evalOwnerUid, evalId)
                .get()
                .then(function (snap) {
                    if (!snap.exists) {
                        var empty = appInstance.createInitialData();
                        applyRemoteData(appInstance, empty);
                        return evalRef(db, evalOwnerUid, evalId).set(Object.assign({
                            payloadJson: buildPayloadJsonForCloud(appInstance),
                            revision: Number(appInstance.data.meta && appInstance.data.meta.revision) || 0,
                            updatedAt: global.firebase.firestore.FieldValue.serverTimestamp(),
                            operationName: operationNameFromApp(appInstance),
                        }, buildDenormalizedFields(appInstance)));
                    }
                    var d = snap.data() || {};
                    var parsed;
                    try {
                        parsed = JSON.parse(d.payloadJson || '{}');
                    } catch (parseErr) {
                        console.error('Valobois Firestore parse', parseErr);
                        return;
                    }
                    if (parsed.lots && Array.isArray(parsed.lots)) {
                        applyRemoteData(appInstance, parsed);
                    }
                })
                .catch(function (e) {
                    console.error('Valobois Firestore hydrate', e);
                })
                .then(function () {
                    finishLoading();
                });
        }

        var initialAuthEvent = true;
        auth.onAuthStateChanged(function (user) {
            if (initialAuthEvent) {
                initialAuthEvent = false;
                if (user) {
                    lastAuthUid = user.uid;
                    cancelSchedule();
                    enterCloudModeOnIndex(app, user);
                } else {
                    enterGuestMode(app);
                }
                return;
            }
            if (!user) {
                lastAuthUid = null;
                enterGuestMode(app);
                return;
            }
            if (user.uid === lastAuthUid) {
                return;
            }
            lastAuthUid = user.uid;
            cancelSchedule();
            enterCloudModeOnIndex(app, user);
        });

        global.__valoboisScheduleCloudSave = function (appInstance) {
            if (appInstance && appInstance.persistenceMode !== 'cloud') return;
            if (loading) {
                deferredSaveApp = appInstance;
                return;
            }
            if (!auth.currentUser) return;
            scheduleCloudSave(appInstance);
        };

        global.__valoboisResetFirestoreEvaluation = function (appInstance) {
            var u = auth.currentUser;
            if (!u || !db || !appInstance) {
                cancelSchedule();
                deferredSaveApp = null;
                return;
            }
            var evalId = getEvalIdFromUrl();
            if (!evalId) {
                cancelSchedule();
                deferredSaveApp = null;
                return;
            }
            var evalOwnerUid = getEvalOwnerUid(u);
            if (evalOwnerUid !== u.uid) {
                cancelSchedule();
                deferredSaveApp = null;
                loading = false;
                emitCloudSyncState();
                return;
            }
            loading = true;
            emitCloudSyncState();
            cancelSchedule();
            deferredSaveApp = null;
            evalRef(db, evalOwnerUid, evalId)
                .delete()
                .then(function () {
                    loading = false;
                    flushToFirestore(appInstance);
                })
                .catch(function (e) {
                    loading = false;
                    console.error('Valobois Firestore reset', e);
                    flushToFirestore(appInstance);
                });
        };
    }

    global.attachValoboisFirestoreSync = attachValoboisFirestoreSync;
})(typeof window !== 'undefined' ? window : globalThis);
