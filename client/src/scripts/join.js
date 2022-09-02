import { injectNavbar } from '../modules/front_end_components/Navbar.js';
import { toast } from '../modules/front_end_components/Toast.js';
import { XHRUtility } from '../modules/utility/XHRUtility.js';
import { UserUtility } from '../modules/utility/UserUtility.js';
import { globals } from '../config/globals.js';

const join = () => {
    injectNavbar();
    const splitUrl = window.location.pathname.split('/join/');
    const accessCode = splitUrl[1];
    if (/^[a-zA-Z0-9]+$/.test(accessCode) && accessCode.length === globals.ACCESS_CODE_LENGTH) {
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
        document.getElementById('join-game-form').onsubmit = null;
        document.getElementById('submit-new-name').classList.add('submitted');
        document.getElementById('submit-new-name').setAttribute('value', 'Joining...');
        XHRUtility.xhr(
            '/api/games/' + accessCode + '/players',
            'PATCH',
            null,
            JSON.stringify({
                playerName: name,
                accessCode: accessCode,
                sessionCookie: UserUtility.validateAnonUserSignature(globals.ENVIRONMENT.LOCAL),
                localCookie: UserUtility.validateAnonUserSignature(globals.ENVIRONMENT.PRODUCTION)
            })
        )
            .then((res) => {
                const json = JSON.parse(res.content);
                UserUtility.setAnonymousUserId(json.cookie, json.environment);
                window.location = '/game/' + accessCode;
            }).catch((res) => {
                document.getElementById('join-game-form').onsubmit = joinHandler;
                document.getElementById('submit-new-name').classList.remove('submitted');
                document.getElementById('submit-new-name').setAttribute('value', 'Join Game');
                if (res.status === 404) {
                    toast('This game was not found.', 'error', true, true, 'long');
                } else if (res.status === 400) {
                    toast('This name is already taken.', 'error', true, true, 'long');
                } else if (res.status >= 500) {
                    toast(
                        'The server is experiencing problems. Please try again later',
                        'error',
                        true
                    );
                }
            });
    } else {
        toast('Name must be between 1 and 30 characters.', 'error', true, true, 'long');
    }
};

function validateName (name) {
    return typeof name === 'string' && name.length > 0 && name.length <= 30;
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = join;
} else {
    join();
}
