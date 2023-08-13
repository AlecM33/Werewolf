import { gameHandler } from '../modules/page_handlers/gameHandler.js';
import { io } from 'socket.io-client';
import gameTemplate from '../view_templates/GameTemplate.js';
import { toast } from '../modules/front_end_components/Toast.js';

gameHandler(io('/in-game'), window, gameTemplate).then(() => {
    toast('Connecting...', 'warning', true, false);
}).catch((e) => {
    toast(e, 'error', true);
});
