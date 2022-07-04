import { DeckStateManager } from '../modules/DeckStateManager.js';
import { GameCreationStepManager } from '../modules/GameCreationStepManager.js';
import { injectNavbar } from '../modules/Navbar.js';
import createTemplate from '../view_templates/CreateTemplate.js';
import { io } from 'socket.io-client';
import { toast } from '../modules/Toast';

const create = () => {
    injectNavbar();
    const socket = io();
    socket.on('broadcast', (message) => {
        toast(message, 'warning', true, false);
    });
    document.getElementById('game-creation-container').innerHTML = createTemplate;
    const deckManager = new DeckStateManager();
    const gameCreationStepManager = new GameCreationStepManager(deckManager);
    gameCreationStepManager.renderStep('creation-step-container', 1);
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = create;
} else {
    create();
}
