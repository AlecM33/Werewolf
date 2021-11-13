import { globals } from '../config/globals.js';

export const UserUtility = {

    createNewAnonymousUserId (force = true) {
        let newId;
        const currentId = sessionStorage.getItem(globals.PLAYER_ID_COOKIE_KEY);
        if (currentId !== null && !force) {
            newId = currentId;
        } else {
            newId = createRandomUserId();
            sessionStorage.setItem(globals.PLAYER_ID_COOKIE_KEY, newId);
        }
        return newId;
    },

    setAnonymousUserId (id) {
        sessionStorage.setItem(globals.PLAYER_ID_COOKIE_KEY, id);
    },

    validateAnonUserSignature () {
        const userSig = sessionStorage.getItem(globals.PLAYER_ID_COOKIE_KEY);
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

function createRandomUserId () {
    let id = '';
    for (let i = 0; i < globals.USER_SIGNATURE_LENGTH; i++) {
        id += globals.ACCESS_CODE_CHAR_POOL[Math.floor(Math.random() * globals.ACCESS_CODE_CHAR_POOL.length)];
    }
    return id;
}
