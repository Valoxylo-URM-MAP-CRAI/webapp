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
        'auth/expired-action-code': 'authErrors.expiredActionCode',
        'auth/invalid-action-code': 'authErrors.invalidActionCode',
    };

    function getPasswordResetUrlState() {
        try {
            var u = new URL(window.location.href);
            if (u.searchParams.get('mode') !== 'resetPassword') {
                return { isPasswordResetUrl: false, oobCode: null };
            }
            var code = u.searchParams.get('oobCode');
            return {
                isPasswordResetUrl: true,
                oobCode: code && String(code).length ? String(code) : null,
            };
        } catch (e) {
            return { isPasswordResetUrl: false, oobCode: null };
        }
    }

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

    function showSuccess(el, i18nKey) {
        if (!el) return;
        el.dataset.valoboisAuthSuccess = i18nKey;
        el.textContent = t(i18nKey);
        el.hidden = false;
    }

    function clearSuccess(el) {
        if (!el) return;
        delete el.dataset.valoboisAuthSuccess;
        el.textContent = '';
        el.hidden = true;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var urlResetState = getPasswordResetUrlState();
        var isPasswordResetUrl = urlResetState.isPasswordResetUrl;
        var passwordResetOobCode = urlResetState.oobCode;

        var auth = typeof getValoboisAuth === 'function' ? getValoboisAuth() : null;
        var errEl = document.getElementById('authError');
        var successEl = document.getElementById('authSuccess');
        var resetPanel = document.getElementById('authResetPasswordPanel');
        var formResetPassword = document.getElementById('formResetPassword');
        var resetSuccessBlock = document.getElementById('authResetPasswordSuccess');
        var resetIntro = document.getElementById('authResetPasswordIntro');
        var resetInvalidFallback = document.getElementById('authResetInvalidFallback');
        var tabSignIn = document.getElementById('tabSignIn');
        var tabSignUp = document.getElementById('tabSignUp');
        var panelSignIn = document.getElementById('panelSignIn');
        var panelSignUp = document.getElementById('panelSignUp');
        var formSignIn = document.getElementById('formSignIn');
        var formSignUp = document.getElementById('formSignUp');
        var configHint = document.getElementById('authConfigHint');

        window.addEventListener('valobois:langchange', function () {
            if (errEl && !errEl.hidden && errEl.dataset.valoboisAuthErr) {
                showError(errEl, { code: errEl.dataset.valoboisAuthErr });
            }
            if (
                successEl &&
                !successEl.hidden &&
                successEl.dataset.valoboisAuthSuccess
            ) {
                successEl.textContent = t(successEl.dataset.valoboisAuthSuccess);
            }
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
            if (isPasswordResetUrl) {
                if (loggedPanel) loggedPanel.classList.add('hidden');
                if (formsBlock) formsBlock.classList.add('hidden');
                return;
            }
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

        if (isPasswordResetUrl && resetPanel) {
            resetPanel.classList.remove('hidden');
            if (formsBlock) formsBlock.classList.add('hidden');
            if (loggedPanel) loggedPanel.classList.add('hidden');
            if (!passwordResetOobCode) {
                if (resetIntro) resetIntro.classList.add('hidden');
                if (formResetPassword) formResetPassword.classList.add('hidden');
                if (resetInvalidFallback) resetInvalidFallback.classList.remove('hidden');
                showError(errEl, { message: t('authPage.resetLinkInvalid') });
            }
        }

        if (formResetPassword && passwordResetOobCode && auth) {
            formResetPassword.addEventListener('submit', function (e) {
                e.preventDefault();
                clearError(errEl);
                var p1 = document.getElementById('resetNewPassword');
                var p2 = document.getElementById('resetNewPasswordConfirm');
                var pw1 = p1 && p1.value ? p1.value : '';
                var pw2 = p2 && p2.value ? p2.value : '';
                if (pw1 !== pw2) {
                    showError(errEl, {
                        message: t('authPage.resetPasswordMismatch'),
                    });
                    return;
                }
                auth
                    .confirmPasswordReset(passwordResetOobCode, pw1)
                    .then(function () {
                        clearError(errEl);
                        if (formResetPassword) formResetPassword.classList.add('hidden');
                        if (resetIntro) resetIntro.classList.add('hidden');
                        if (resetSuccessBlock) resetSuccessBlock.classList.remove('hidden');
                    })
                    .catch(function (err) {
                        showError(errEl, err);
                    });
            });
        }

        function setTab(signIn) {
            clearError(errEl);
            clearSuccess(successEl);
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
                clearSuccess(successEl);
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
                clearSuccess(successEl);
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
        var btnForgotPassword = document.getElementById('btnForgotPassword');
        if (btnForgotPassword) {
            btnForgotPassword.addEventListener('click', function () {
                clearError(errEl);
                clearSuccess(successEl);
                var email = document.getElementById('signInEmail');
                var em = email && email.value ? email.value.trim() : '';
                if (!em) {
                    showError(errEl, {
                        message: t('authPage.forgotPasswordEmailRequired'),
                    });
                    return;
                }
                var actionSettings = {
                    url: new URL('auth.html', window.location.href).href,
                    handleCodeInApp: false,
                };
                auth
                    .sendPasswordResetEmail(em, actionSettings)
                    .then(function () {
                        clearError(errEl);
                        showSuccess(successEl, 'authPage.forgotPasswordEmailSent');
                    })
                    .catch(function (err) {
                        showError(errEl, err);
                    });
            });
        }

        if (btnSignOut) {
            btnSignOut.addEventListener('click', function () {
                clearError(errEl);
                clearSuccess(successEl);
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

        if (!isPasswordResetUrl) {
            setTab(true);
        }
    });
})();
