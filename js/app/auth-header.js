(function () {
    'use strict';

    var cloudSyncState = 'hidden';
    var requestAuthBannerRender = null;

    window.addEventListener('valobois:cloudsync', function (ev) {
        var d = ev.detail && ev.detail.state;
        if (d === 'hidden' || d === 'saving' || d === 'saved') {
            cloudSyncState = d;
        } else {
            cloudSyncState = 'hidden';
        }
        if (typeof requestAuthBannerRender === 'function') {
            requestAuthBannerRender();
        }
    });

    function renderAuthStatus(container, user, authInstance, syncState) {
        container.textContent = '';
        if (user && user.email) {
            if (syncState === 'saving' || syncState === 'saved') {
                var syncWrap = document.createElement('span');
                syncWrap.className =
                    'auth-banner-sync' +
                    (syncState === 'saving'
                        ? ' auth-banner-sync--saving'
                        : ' auth-banner-sync--saved');
                syncWrap.setAttribute(
                    'aria-label',
                    syncState === 'saving'
                        ? t('auth.header.cloudSaving')
                        : t('auth.header.cloudSaved')
                );
                if (syncState === 'saving') {
                    var spin = document.createElement('span');
                    spin.className = 'auth-banner-sync-spinner';
                    spin.setAttribute('aria-hidden', 'true');
                    syncWrap.appendChild(spin);
                } else {
                    var check = document.createElement('span');
                    check.className = 'auth-banner-sync-check';
                    check.setAttribute('aria-hidden', 'true');
                    check.textContent = '✓';
                    syncWrap.appendChild(check);
                }
                var syncLabel = document.createElement('span');
                syncLabel.className = 'auth-banner-sync-label';
                syncLabel.textContent =
                    syncState === 'saving'
                        ? t('auth.header.cloudSaving')
                        : t('auth.header.cloudSaved');
                syncWrap.appendChild(syncLabel);
                container.appendChild(syncWrap);
                container.appendChild(document.createTextNode(' · '));
            }
            var listLink = document.createElement('a');
            listLink.href = 'mes-evaluations.html';
            listLink.textContent = t('auth.header.myEvaluations');
            container.appendChild(listLink);
            container.appendChild(document.createTextNode(' · '));
            var signOutBtn = document.createElement('button');
            signOutBtn.type = 'button';
            signOutBtn.className = 'auth-banner-signout';
            signOutBtn.textContent = t('auth.header.signOut');
            signOutBtn.addEventListener('click', function () {
                if (!authInstance) return;
                authInstance
                    .signOut()
                    .then(function () {
                        try {
                            localStorage.removeItem('valobois_firestore_eval_id');
                        } catch (e) {
                            console.error(e);
                        }
                    })
                    .catch(function (err) {
                        console.error(err);
                    });
            });
            container.appendChild(signOutBtn);
            return;
        }
        container.appendChild(
            document.createTextNode(t('auth.header.notSignedIn') + ' · ')
        );
        var link = document.createElement('a');
        link.href = 'auth.html';
        link.textContent = t('auth.header.signIn');
        container.appendChild(link);
    }

    function bindAuthBanner() {
        var el = document.getElementById('auth-header-status');
        if (!el) return;

        var bannerUser = null;
        var bannerAuth = null;

        function renderFromState() {
            if (!bannerAuth) {
                el.innerHTML = '';
                var linkOnly = document.createElement('a');
                linkOnly.href = 'auth.html';
                linkOnly.textContent = t('auth.header.signIn');
                el.appendChild(linkOnly);
                return;
            }
            renderAuthStatus(el, bannerUser, bannerAuth, cloudSyncState);
        }

        requestAuthBannerRender = function () {
            if (!el) return;
            renderFromState();
        };

        var auth = typeof getValoboisAuth === 'function' ? getValoboisAuth() : null;
        if (!auth) {
            bannerAuth = null;
            renderFromState();
        } else {
            bannerAuth = auth;
            auth.onAuthStateChanged(function (user) {
                bannerUser = user;
                renderFromState();
            });
        }

        window.addEventListener('valobois:langchange', renderFromState);
    }

    document.addEventListener('DOMContentLoaded', bindAuthBanner);
})();
