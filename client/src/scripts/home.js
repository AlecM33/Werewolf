import { toast } from '../modules/front_end_components/Toast.js';
import { injectNavbar } from '../modules/front_end_components/Navbar.js';
import { Confirmation } from '../modules/front_end_components/Confirmation.js';

const home = () => {
    injectNavbar();
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message && message.length > 0) {
        Confirmation(message);
    }
    document.getElementById('join-form').addEventListener('submit', attemptToJoinGame);
};

function roomCodeIsValid (code) {
    return typeof code === 'string' && /^[A-Z0-9]{4}$/.test(code.toUpperCase().trim());
}

function attemptToJoinGame (event) {
    event.preventDefault();
    const userCode = document.getElementById('room-code').value;
    if (roomCodeIsValid(userCode)) {
        const form = document.getElementById('join-form');
        form.removeEventListener('submit', attemptToJoinGame);
        form.classList.add('submitted');
        document.getElementById('join-button')?.setAttribute('value', 'Joining...');
        fetch(
            '/api/games/' + userCode.toUpperCase().trim() + '/availability',
            {
                method: 'GET',
                mode: 'cors'
            }
        ).then((res) => {
            if (!res.ok && !(res.status === 304)) {
                switch (res.status) {
                    case 404:
                        toast('Game not found', 'error', true);
                        break;
                    default:
                        toast('There was a problem joining the game', 'error', true);
                        break;
                }
                form.addEventListener('submit', attemptToJoinGame);
                form.classList.remove('submitted');
                document.getElementById('join-button')?.setAttribute('value', 'Join');
            } else {
                res.json().then(json => {
                    window.location = window.location.protocol + '//' + window.location.host +
                        '/join/' + encodeURIComponent(json.accessCode);
                });
            }
        }).catch(() => {
            form.addEventListener('submit', attemptToJoinGame);
            form.classList.remove('submitted');
            document.getElementById('join-button')?.setAttribute('value', 'Join');
            toast('An unknown error occurred. Please try again later.', 'error', true);
        });
    } else {
        toast('Invalid code. Codes are 4 numbers or letters.', 'error', true, true);
    }
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = home;
} else {
    home();
}
