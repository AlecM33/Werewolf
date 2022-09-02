import { globals } from '../../config/globals.js';

/*
    we will use sessionStorage during local development to aid in testing, vs. localStorage for production.
    sessionStorage does not persist across tabs, allowing developers to join a game as different players from different windows.
 */
export const UserUtility = {

    setAnonymousUserId (id, environment) {
        if (environment === globals.ENVIRONMENT.LOCAL) {
            sessionStorage.setItem(globals.PLAYER_ID_COOKIE_KEY, id);
        } else {
            localStorage.setItem(globals.PLAYER_ID_COOKIE_KEY, id);
        }
    },

    validateAnonUserSignature (environment) {
        let userSig;
        if (environment === globals.ENVIRONMENT.LOCAL) {
            userSig = sessionStorage.getItem(globals.PLAYER_ID_COOKIE_KEY);
        } else {
            userSig = localStorage.getItem(globals.PLAYER_ID_COOKIE_KEY);
        }
        return (
            userSig
            && typeof userSig === 'string'
            && /^[a-zA-Z0-9]+$/.test(userSig)
            && userSig.length === globals.USER_SIGNATURE_LENGTH
        )
            ? userSig
            : false;
    }

};
