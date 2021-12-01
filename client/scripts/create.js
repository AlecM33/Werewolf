import { defaultCards } from "../config/defaultCards.js";
import { customCards } from "../config/customCards.js";
import { DeckStateManager } from "../modules/DeckStateManager.js";
import { XHRUtility } from "../modules/XHRUtility.js";
import { Game } from "../model/Game.js";
import { GameCreationStepManager } from "../modules/GameCreationStepManager.js";

export const create = () => {
    let deckManager = new DeckStateManager();
    let gameCreationStepManager = new GameCreationStepManager(deckManager);
    loadDefaultCards(deckManager);
    loadCustomRoles(deckManager);
    gameCreationStepManager.renderStep("creation-step-container", 1);
}

function loadDefaultCards(deckManager) {
    defaultCards.sort((a, b) => {
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
