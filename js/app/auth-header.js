(function () {
    'use strict';

    function renderAuthStatus(container, user, authInstance) {
        container.textContent = '';
        if (user && user.email) {
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
            renderAuthStatus(el, bannerUser, bannerAuth);
        }

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
