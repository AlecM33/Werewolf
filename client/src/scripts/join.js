import { injectNavbar } from '../modules/front_end_components/Navbar.js';
import { toast } from '../modules/front_end_components/Toast.js';
import { UserUtility } from '../modules/utility/UserUtility.js';
import { ENVIRONMENTS, PRIMITIVES } from '../config/globals.js';

const join = () => {
    injectNavbar();
    const splitUrl = window.location.pathname.split('/join/');
    const accessCode = splitUrl[1];
    if (/^[a-zA-Z0-9]+$/.test(accessCode) && accessCode.length === PRIMITIVES.ACCESS_CODE_LENGTH) {
        document.getElementById('game-code').innerText = accessCode;
        document.getElementById('game-time').innerText =
            decodeURIComponent((new URL(document.location)).searchParams.get('timer'));
        document.getElementById('game-player-count').innerText =
            decodeURIComponent((new URL(document.location)).searchParams.get('playerCount')) + ' Players';
        const form = document.getElementById('join-game-form');
        form.onsubmit = joinHandler;
    } else {
        window.location = '/not-found?reason=' + encodeURIComponent('invalid-access-code');
    }
};

const joinHandler = (e) => {
    const splitUrl = window.location.pathname.split('/join/');
    const accessCode = splitUrl[1];
    e.preventDefault();
    const name = document.getElementById('player-new-name').value;
    if (validateName(name)) {
        sendJoinRequest(e, name, accessCode)
            .then((res) => {
                if (!res.ok) {
                    switch (res.status) {
                        case 404:
                            toast('Game not found', 'error', true);
                            break;
                        case 400:
                            res.text().then(text => {
                                toast(text, 'error', true);
                            });
                            break;
                        default:
                            toast('There was a problem joining the game', 'error', true);
                            break;
                    }
                    resetJoinButtonState(e, joinHandler);
                } else {
                    res.json().then(json => {
                        UserUtility.setAnonymousUserId(json.cookie, json.environment);
                        resetJoinButtonState(e, joinHandler);
                        window.location = '/game/' + accessCode;
                    });
                }
            }).catch(() => {
                toast('Problems with the server are preventing your request to join the game.', 'error', true);
                resetJoinButtonState(e, joinHandler);
            });
    } else {
        toast('Name must be between 1 and ' + PRIMITIVES.MAX_PERSON_NAME_LENGTH + ' characters.', 'error', true, true, 'long');
    }
};

function sendJoinRequest (e, name, accessCode) {
    document.getElementById('join-game-form').onsubmit = null;
    document.getElementById('join-submit').classList.add('submitted');
    document.getElementById('join-submit').setAttribute('value', '...');

    return fetch(
        '/api/games/' + accessCode + '/players',
        {
            method: 'PATCH',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                playerName: name,
                accessCode: accessCode,
                sessionCookie: UserUtility.validateAnonUserSignature(ENVIRONMENTS.LOCAL),
                localCookie: UserUtility.validateAnonUserSignature(ENVIRONMENTS.PRODUCTION),
                joinAsSpectator: document.getElementById('join-as-spectator').checked
            })
        }
    );
}

function resetJoinButtonState (e, joinHandler) {
    document.getElementById('join-game-form').onsubmit = joinHandler;
    e.submitter.classList.remove('submitted');
    e.submitter.setAttribute('value', 'Join');
}

function validateName (name) {
    return typeof name === 'string' && name.length > 0 && name.length <= PRIMITIVES.MAX_PERSON_NAME_LENGTH;
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = join;
} else {
    join();
}
