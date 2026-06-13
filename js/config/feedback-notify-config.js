/**
 * Notification e-mail des commentaires (sans plan Blaze Firebase).
 * Service gratuit : https://web3forms.com — créer une clé liée à maxence.lebosse@nancy.archi.fr
 * Surcharge locale (gitignored) : js/config/feedback-notify-config.local.js
 */
(function (global) {
    'use strict';

    global.valoboisFeedbackNotifyConfig =
        global.__VALOBOIS_FEEDBACK_NOTIFY_CONFIG__ || {
            web3formsAccessKey: 'REPLACE_ME'
        };
})(typeof window !== 'undefined' ? window : globalThis);
