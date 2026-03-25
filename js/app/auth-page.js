(function () {
    'use strict';

    var REDIRECT = 'mes-evaluations.html';

    var AUTH_ERR_TO_KEY = {
        'auth/invalid-email': 'authErrors.invalidEmail',
        'auth/user-disabled': 'authErrors.userDisabled',
        'auth/user-not-found': 'authErrors.userNotFound',
        'auth/wrong-password': 'authErrors.wrongPassword',
        'auth/invalid-credential': 'authErrors.invalidCredential',
        'auth/email-already-in-use': 'authErrors.emailInUse',
        'auth/weak-password': 'authErrors.weakPassword',
        'auth/too-many-requests': 'authErrors.tooManyRequests',
        'auth/network-request-failed': 'authErrors.networkFailed',
        'auth/operation-not-allowed': 'authErrors.operationNotAllowed',
    };

    function redirectAfterAuth() {
        var target = REDIRECT;
        try {
            var u = new URL(window.location.href);
            var ret = u.searchParams.get('return');
            if (ret === 'mes-evaluations.html' || ret === 'index.html') {
                target = ret;
            }
        } catch (e) {
            /* ignore */
        }
        window.location.href = target;
    }

    function mapAuthError(code) {
        var path = AUTH_ERR_TO_KEY[code];
        if (path) return t(path);
        return t('authPage.genericError');
    }

    function showError(el, err) {
        if (!el) return;
        var code = err && err.code ? err.code : '';
        if (code) el.dataset.valoboisAuthErr = code;
        else delete el.dataset.valoboisAuthErr;
        el.textContent = code ? mapAuthError(code) : (err && err.message) || t('authPage.unknownError');
        el.hidden = false;
    }

    function clearError(el) {
        if (!el) return;
        delete el.dataset.valoboisAuthErr;
        el.textContent = '';
        el.hidden = true;
    }

    function applyBodyThemeFromStorage() {
        try {
            if (localStorage.getItem('valoboisTheme') !== 'night') {
                document.body.classList.add('day-mode');
            } else {
                document.body.classList.remove('day-mode');
            }
        } catch (e) {
            /* ignore */
        }
    }

    function syncThemeToggleLabel() {
        var btn = document.getElementById('btnThemeToggle');
        if (!btn) return;
        btn.setAttribute('title', t('theme.toggleTitle'));
        var label = document.getElementById('btnThemeToggleLabel');
        var isDay = document.body.classList.contains('day-mode');
        var text = isDay ? t('theme.modeNight') : t('theme.modeDay');
        if (label) label.textContent = text;
        else btn.textContent = text;
    }

    function initThemeToggle() {
        applyBodyThemeFromStorage();
        syncThemeToggleLabel();
        var btn = document.getElementById('btnThemeToggle');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var isDay = document.body.classList.toggle('day-mode');
            syncThemeToggleLabel();
            try {
                localStorage.setItem('valoboisTheme', isDay ? 'day' : 'night');
            } catch (e) {
                /* ignore */
            }
        });
        window.addEventListener('valobois:langchange', syncThemeToggleLabel);
    }

    document.addEventListener('DOMContentLoaded', function () {
        initThemeToggle();

        var auth = typeof getValoboisAuth === 'function' ? getValoboisAuth() : null;
        var errEl = document.getElementById('authError');
        var tabSignIn = document.getElementById('tabSignIn');
        var tabSignUp = document.getElementById('tabSignUp');
        var panelSignIn = document.getElementById('panelSignIn');
        var panelSignUp = document.getElementById('panelSignUp');
        var formSignIn = document.getElementById('formSignIn');
        var formSignUp = document.getElementById('formSignUp');
        var configHint = document.getElementById('authConfigHint');

        window.addEventListener('valobois:langchange', function () {
            if (!errEl || errEl.hidden || !errEl.dataset.valoboisAuthErr) return;
            showError(errEl, { code: errEl.dataset.valoboisAuthErr });
        });

        if (!auth) {
            if (configHint) configHint.hidden = false;
            if (errEl) {
                errEl.hidden = false;
                delete errEl.dataset.valoboisAuthErr;
                errEl.textContent = t('authPage.firebaseNotConfigured');
            }
            var formsBlockEarly = document.getElementById('authFormsBlock');
            var loggedPanelEarly = document.getElementById('authLoggedInPanel');
            if (formsBlockEarly) formsBlockEarly.classList.add('hidden');
            if (loggedPanelEarly) loggedPanelEarly.classList.add('hidden');
            window.addEventListener('valobois:langchange', function () {
                if (errEl && !errEl.hidden && !errEl.dataset.valoboisAuthErr) {
                    errEl.textContent = t('authPage.firebaseNotConfigured');
                }
            });
            return;
        }

        if (configHint) configHint.hidden = true;

        var loggedPanel = document.getElementById('authLoggedInPanel');
        var formsBlock = document.getElementById('authFormsBlock');
        var loggedEmailEl = document.getElementById('authLoggedInEmail');

        function updateLoggedInUI(user) {
            if (user && user.email) {
                if (loggedEmailEl) loggedEmailEl.textContent = user.email;
                if (loggedPanel) loggedPanel.classList.remove('hidden');
                if (formsBlock) formsBlock.classList.add('hidden');
            } else {
                if (loggedPanel) loggedPanel.classList.add('hidden');
                if (formsBlock) formsBlock.classList.remove('hidden');
            }
        }

        auth.onAuthStateChanged(updateLoggedInUI);

        function setTab(signIn) {
            clearError(errEl);
            if (tabSignIn) tabSignIn.setAttribute('aria-selected', signIn ? 'true' : 'false');
            if (tabSignUp) tabSignUp.setAttribute('aria-selected', signIn ? 'false' : 'true');
            if (panelSignIn) panelSignIn.classList.toggle('hidden', !signIn);
            if (panelSignUp) panelSignUp.classList.toggle('hidden', signIn);
        }

        if (tabSignIn) {
            tabSignIn.addEventListener('click', function () {
                setTab(true);
            });
        }
        if (tabSignUp) {
            tabSignUp.addEventListener('click', function () {
                setTab(false);
            });
        }

        if (formSignIn) {
            formSignIn.addEventListener('submit', function (e) {
                e.preventDefault();
                clearError(errEl);
                var email = document.getElementById('signInEmail');
                var password = document.getElementById('signInPassword');
                var em = email && email.value ? email.value.trim() : '';
                var pw = password && password.value ? password.value : '';
                auth
                    .signInWithEmailAndPassword(em, pw)
                    .then(function () {
                        redirectAfterAuth();
                    })
                    .catch(function (err) {
                        showError(errEl, err);
                    });
            });
        }

        if (formSignUp) {
            formSignUp.addEventListener('submit', function (e) {
                e.preventDefault();
                clearError(errEl);
                var email = document.getElementById('signUpEmail');
                var password = document.getElementById('signUpPassword');
                var em = email && email.value ? email.value.trim() : '';
                var pw = password && password.value ? password.value : '';
                auth
                    .createUserWithEmailAndPassword(em, pw)
                    .then(function () {
                        redirectAfterAuth();
                    })
                    .catch(function (err) {
                        showError(errEl, err);
                    });
            });
        }

        var btnSignOut = document.getElementById('btnSignOut');
        if (btnSignOut) {
            btnSignOut.addEventListener('click', function () {
                clearError(errEl);
                auth
                    .signOut()
                    .then(function () {
                        try {
                            localStorage.removeItem('valobois_firestore_eval_id');
                        } catch (e) {
                            console.error(e);
                        }
                    })
                    .catch(function (err) {
                        showError(errEl, err);
                    });
            });
        }

        setTab(true);
    });
})();
