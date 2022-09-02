import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { gameHandler } from '../modules/page_handlers/gameHandler';
import { io } from 'socket.io-client';
import { XHRUtility } from '../modules/utility/XHRUtility.js';
import gameTemplate from '../view_templates/GameTemplate.js';

await gameHandler(io('/in-game'), XHRUtility, window, gameTemplate);
