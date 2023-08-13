import { gameHandler } from '../modules/page_handlers/gameHandler.js';
import { io } from 'socket.io-client';
import gameTemplate from '../view_templates/GameTemplate.js';
import { toast } from '../modules/front_end_components/Toast.js';

gameHandler(io('/in-game'), window, gameTemplate).catch((e) => {
    toast(e.message, 'error', true, false);
});
