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
    return typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code.toUpperCase().trim());
}

function attemptToJoinGame (code) {
    XHRUtility.xhr(
        '/api/games/' + code.toUpperCase().trim() + '/availability',
        'GET',
        null,
        null
    )
        .then((res) => {
            if (res.status === 200) {
                const json = JSON.parse(res.content);
                window.location = window.location.protocol + '//' + window.location.host +
                    '/join/' + encodeURIComponent(json.accessCode) +
                    '?playerCount=' + encodeURIComponent(json.playerCount) +
                    '&timer=' + encodeURIComponent(getTimeString(json.timerParams));
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

function getTimeString (timerParams) {
    let timeString = '';
    if (timerParams) {
        const hours = timerParams.hours;
        const minutes = timerParams.minutes;
        if (hours) {
            timeString += hours > 1
                ? hours + ' hours '
                : hours + ' hour ';
        }
        if (minutes) {
            timeString += minutes > 1
                ? minutes + ' minutes '
                : minutes + ' minute ';
        }

        return timeString;
    } else {
        timeString = 'untimed';
        return timeString;
    }
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = home;
} else {
    home();
}
