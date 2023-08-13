import { ENVIRONMENTS, PRIMITIVES } from '../../config/globals.js';

/*
    we will use sessionStorage during local development to aid in testing, vs. localStorage for production.
    sessionStorage does not persist across tabs, allowing developers to join a game as different players from different windows.
 */
export const UserUtility = {

    setAnonymousUserId (id, environment) {
        if (environment === ENVIRONMENTS.LOCAL) {
            sessionStorage.setItem(PRIMITIVES.PLAYER_ID_COOKIE_KEY, id);
        } else {
            localStorage.setItem(PRIMITIVES.PLAYER_ID_COOKIE_KEY, id);
        }
    },

    validateAnonUserSignature (environment) {
        let userSig;
        if (environment === ENVIRONMENTS.LOCAL) {
            userSig = sessionStorage.getItem(PRIMITIVES.PLAYER_ID_COOKIE_KEY);
        } else {
            userSig = localStorage.getItem(PRIMITIVES.PLAYER_ID_COOKIE_KEY);
        }
        return (
            userSig
            && typeof userSig === 'string'
            && /^[a-zA-Z0-9]+$/.test(userSig)
            && userSig.length === PRIMITIVES.USER_SIGNATURE_LENGTH
        )
            ? userSig
            : false;
    }

};
