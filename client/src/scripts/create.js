import { defaultCards } from "../config/defaultCards.js";
import { customCards } from "../config/customCards.js";
import { DeckStateManager } from "../modules/DeckStateManager.js";
import { GameCreationStepManager } from "../modules/GameCreationStepManager.js";
import { injectNavbar } from "../modules/Navbar.js";
import {globals} from "../config/globals";

const create = () => {
    injectNavbar();
    let deckManager = new DeckStateManager();
    let gameCreationStepManager = new GameCreationStepManager(deckManager);
    loadDefaultCards(deckManager);
    gameCreationStepManager.renderStep("creation-step-container", 1);
}

function loadDefaultCards(deckManager) {
    defaultCards.sort((a, b) => {
        if (a.team !== b.team) {
            return a.team === globals.ALIGNMENT.GOOD ? 1 : -1;
        }
        return a.role.localeCompare(b.role);
    });
    let deck = [];
    for (let i = 0; i < defaultCards.length; i ++) {
        let card = defaultCards[i];
        card.quantity = 0;
        deck.push(card);
    }
    deckManager.deck = deck;
}

function loadCustomRoles(deckManager) {
    customCards.sort((a, b) => {
        return a.role.localeCompare(b.role);
    });
    deckManager.customRoleOptions = customCards;
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = create;
} else {
    create();
}
