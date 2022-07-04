import { injectNavbar } from '../modules/Navbar.js';
import { io } from 'socket.io-client';
import { toast } from '../modules/Toast';

const howToUse = () => {
    injectNavbar();
    const socket = io();
    socket.on('broadcast', (message) => {
        toast(message, 'warning', true, false);
    });
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = howToUse;
} else {
    howToUse();
}
