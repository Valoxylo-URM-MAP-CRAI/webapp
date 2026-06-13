(function (global) {
    'use strict';

    var FEEDBACK_EMAIL = 'maxence.lebosse@nancy.archi.fr';
    var COL_FEEDBACK = 'feedback';
    var WEB3FORMS_URL = 'https://api.web3forms.com/submit';
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    global.ValoboisEditorTabPanels = global.ValoboisEditorTabPanels || {};

    function t(key) {
        return typeof global.t === 'function' ? global.t(key) : key;
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function getNotifyConfig() {
        var cfg = global.valoboisFeedbackNotifyConfig;
        if (!cfg || !cfg.web3formsAccessKey || cfg.web3formsAccessKey === 'REPLACE_ME') {
            return null;
        }
        return cfg;
    }

    function getFieldValues() {
        var titleEl = byId('feedbackTitle');
        var emailEl = byId('feedbackEmail');
        var messageEl = byId('feedbackMessage');
        return {
            title: titleEl ? titleEl.value.trim() : '',
            email: emailEl ? emailEl.value.trim() : '',
            message: messageEl ? messageEl.value.trim() : ''
        };
    }

    function isFormValid(fields) {
        return fields.title.length > 0
            && fields.email.length > 0
            && EMAIL_RE.test(fields.email)
            && fields.message.length > 0;
    }

    function updateSubmitState() {
        var submitBtn = byId('btnFeedbackSubmit');
        if (!submitBtn || submitBtn.dataset.loading === '1') return;
        submitBtn.disabled = !isFormValid(getFieldValues());
    }

    function showFeedbackError(msg) {
        var el = byId('feedbackError');
        var successEl = byId('feedbackSuccess');
        if (successEl) {
            successEl.hidden = true;
            successEl.textContent = '';
        }
        if (el) {
            el.textContent = msg;
            el.hidden = false;
        }
    }

    function showFeedbackSuccess(msg) {
        var el = byId('feedbackSuccess');
        var errEl = byId('feedbackError');
        if (errEl) {
            errEl.hidden = true;
            errEl.textContent = '';
        }
        if (el) {
            el.textContent = msg;
            el.hidden = false;
        }
    }

    function clearFeedbackMessages() {
        var errEl = byId('feedbackError');
        var successEl = byId('feedbackSuccess');
        if (errEl) {
            errEl.hidden = true;
            errEl.textContent = '';
        }
        if (successEl) {
            successEl.hidden = true;
            successEl.textContent = '';
        }
    }

    function setLoading(loading) {
        var submitBtn = byId('btnFeedbackSubmit');
        var mailtoBtn = byId('btnFeedbackMailto');
        if (submitBtn) {
            submitBtn.disabled = loading || !isFormValid(getFieldValues());
            submitBtn.dataset.loading = loading ? '1' : '';
            submitBtn.textContent = loading ? t('editor.feedback.sending') : t('editor.feedback.submit');
        }
        if (mailtoBtn) mailtoBtn.disabled = !!loading;
    }

    function buildMailtoUrl(fields) {
        var subject = encodeURIComponent(fields.title);
        var body = encodeURIComponent(
            'Valobois — retour utilisateur\n\n' +
            'Titre : ' + fields.title + '\n' +
            'E-mail utilisateur : ' + fields.email + '\n' +
            'Message :\n' + fields.message
        );
        return 'mailto:' + FEEDBACK_EMAIL + '?subject=' + subject + '&body=' + body;
    }

    function buildFeedbackPayload(fields) {
        var payload = {
            title: fields.title,
            email: fields.email,
            message: fields.message,
            createdAt: global.firebase.firestore.FieldValue.serverTimestamp(),
            sourceApp: 'Valobois'
        };
        try {
            payload.currentRoute = global.location.pathname + global.location.search;
        } catch (e) { /* ignore */ }
        try {
            var tab = global.sessionStorage.getItem('valoboisEditorTab');
            if (tab) payload.activeTab = tab;
        } catch (e2) { /* ignore */ }
        try {
            if (global.navigator && global.navigator.userAgent) {
                payload.userAgent = global.navigator.userAgent;
            }
        } catch (e3) { /* ignore */ }
        var auth = typeof global.getValoboisAuth === 'function' ? global.getValoboisAuth() : null;
        if (auth && auth.currentUser && auth.currentUser.uid) {
            payload.userId = auth.currentUser.uid;
        }
        return payload;
    }

    function buildNotificationEmailBody(fields, feedbackPayload) {
        var lines = [
            'Valobois — commentaire utilisateur',
            '',
            'Titre : ' + fields.title,
            'E-mail utilisateur : ' + fields.email,
            '',
            fields.message
        ];
        if (feedbackPayload.currentRoute) lines.push('', 'Route : ' + feedbackPayload.currentRoute);
        if (feedbackPayload.activeTab) lines.push('Onglet actif : ' + feedbackPayload.activeTab);
        if (feedbackPayload.userId) lines.push('UID : ' + feedbackPayload.userId);
        return lines.join('\n');
    }

    function sendFeedbackNotificationEmail(fields, feedbackPayload) {
        var cfg = getNotifyConfig();
        if (!cfg) return Promise.resolve({ skipped: true });

        return fetch(WEB3FORMS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                access_key: cfg.web3formsAccessKey,
                subject: 'Valobois — ' + fields.title,
                from_name: 'Valobois',
                name: fields.email,
                email: fields.email,
                message: buildNotificationEmailBody(fields, feedbackPayload)
            })
        })
            .then(function (res) {
                return res.json().catch(function () {
                    return {};
                }).then(function (data) {
                    if (!res.ok || !data || !data.success) {
                        var err = new Error((data && data.message) || 'web3forms-failed');
                        err.code = 'notify-failed';
                        throw err;
                    }
                    return data;
                });
            });
    }

    function prefillEmailIfSignedIn() {
        var emailEl = byId('feedbackEmail');
        if (!emailEl || emailEl.value.trim()) return;
        var auth = typeof global.getValoboisAuth === 'function' ? global.getValoboisAuth() : null;
        if (auth && auth.currentUser && auth.currentUser.email) {
            emailEl.value = auth.currentUser.email;
            updateSubmitState();
        }
    }

    function initFeedbackForm() {
        var form = byId('feedbackForm');
        if (!form || form.dataset.feedbackBound === '1') return;
        form.dataset.feedbackBound = '1';

        ['feedbackTitle', 'feedbackEmail', 'feedbackMessage'].forEach(function (id) {
            var el = byId(id);
            if (el) el.addEventListener('input', updateSubmitState);
        });

        form.addEventListener('submit', function (ev) {
            ev.preventDefault();
            clearFeedbackMessages();
            var values = getFieldValues();
            if (!values.title.length || !values.message.length) {
                showFeedbackError(t('editor.feedback.errorEmpty'));
                updateSubmitState();
                return;
            }
            if (!values.email.length || !EMAIL_RE.test(values.email)) {
                showFeedbackError(t('editor.feedback.errorEmail'));
                updateSubmitState();
                return;
            }

            var db = typeof global.getValoboisFirestore === 'function' ? global.getValoboisFirestore() : null;
            if (!db) {
                showFeedbackError(t('editor.feedback.errorNotConfigured'));
                return;
            }

            setLoading(true);
            var feedbackPayload = buildFeedbackPayload(values);
            db.collection(COL_FEEDBACK).add(feedbackPayload)
                .then(function () {
                    return sendFeedbackNotificationEmail(values, feedbackPayload).catch(function (notifyErr) {
                        console.warn('Valobois feedback notify email', notifyErr && notifyErr.message, notifyErr);
                        return { notifyFailed: true };
                    });
                })
                .then(function (notifyResult) {
                    if (notifyResult && notifyResult.notifyFailed) {
                        showFeedbackSuccess(t('editor.feedback.successNoEmail'));
                    } else if (notifyResult && notifyResult.skipped) {
                        showFeedbackSuccess(t('editor.feedback.success'));
                    } else {
                        showFeedbackSuccess(t('editor.feedback.successWithEmail'));
                    }
                    form.reset();
                    prefillEmailIfSignedIn();
                })
                .catch(function (err) {
                    console.warn('Valobois feedback Firestore', err && err.code, err && err.message, err);
                    if (err && err.code === 'permission-denied') {
                        showFeedbackError(t('editor.feedback.errorPermissionDenied'));
                    } else {
                        showFeedbackError(t('editor.feedback.errorFirebase'));
                    }
                })
                .finally(function () {
                    setLoading(false);
                    updateSubmitState();
                });
        });

        var mailtoBtn = byId('btnFeedbackMailto');
        if (mailtoBtn) {
            mailtoBtn.addEventListener('click', function () {
                clearFeedbackMessages();
                var values = getFieldValues();
                if (!isFormValid(values)) {
                    if (!values.email.length || !EMAIL_RE.test(values.email)) {
                        showFeedbackError(t('editor.feedback.errorEmail'));
                    } else {
                        showFeedbackError(t('editor.feedback.errorEmpty'));
                    }
                    return;
                }
                global.location.href = buildMailtoUrl(values);
            });
        }

        var auth = typeof global.getValoboisAuth === 'function' ? global.getValoboisAuth() : null;
        if (auth) {
            auth.onAuthStateChanged(function () {
                prefillEmailIfSignedIn();
            });
        }

        prefillEmailIfSignedIn();
        updateSubmitState();
    }

    global.ValoboisEditorTabPanels.feedback = function () {
        prefillEmailIfSignedIn();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFeedbackForm);
    } else {
        initFeedbackForm();
    }
})(typeof window !== 'undefined' ? window : this);
