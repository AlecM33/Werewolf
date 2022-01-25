import { XHRUtility } from '../modules/XHRUtility.js';
import { toast } from '../modules/Toast.js';
import { injectNavbar } from '../modules/Navbar.js';

const home = () => {
    injectNavbar();
    document.getElementById('join-form').onsubmit = (e) => {
        e.preventDefault();
        const userCode = document.getElementById('room-code').value;
        if (roomCodeIsValid(userCode)) {
            attemptToJoinGame(userCode);
        } else {
            toast('Invalid code. Codes are 6 numbers or letters.', 'error', true, true);
        }
    };
};

function roomCodeIsValid (code) {
    return typeof code === 'string' && /^[a-z0-9]{6}$/.test(code.toLowerCase());
}

function attemptToJoinGame (code) {
    XHRUtility.xhr(
        '/api/games/' + code.toLowerCase().trim() + 'availability',
        'GET',
        null,
        null
    )
        .then((res) => {
            if (res.status === 200) {
                window.location = '/join/' + res.content;
            }
        }).catch((res) => {
            if (res.status === 404) {
                toast('Game not found', 'error', true);
            } else if (res.status === 400) {
                toast(res.content, 'error', true);
            } else {
                toast('An unknown error occurred. Please try again later.', 'error', true);
            }
        });
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = home;
} else {
    home();
}
