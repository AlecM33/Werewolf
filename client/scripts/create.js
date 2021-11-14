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

// Display a widget for each default card that allows copies of it to be added/removed. Set initial deck state.
function loadDefaultCards(deckManager) {
    defaultCards.sort((a, b) => {
        return a.role.localeCompare(b.role);
    });
    let deck = [];
    for (let i = 0; i < defaultCards.length; i ++) { // each dropdown should include every
        let card = defaultCards[i];
        card.quantity = 0;
        deck.push(card);
    }
    deckManager.deck = deck;
}

/* Display a dropdown containing all the custom roles. Adding one will add it to the game deck and
create a widget for it */
function loadCustomRoles(deckManager) {
    customCards.sort((a, b) => {
        return a.role.localeCompare(b.role);
    });
    deckManager.customRoleOptions = customCards;
}

function createGameForHosting(deck, hasTimer, modName, timerParams) {
    XHRUtility.xhr(
        '/api/games/create',
        'POST',
        null,
        JSON.stringify(
            new Game(deck, hasTimer, modName, timerParams)
        )
    )
    .then((res) => {
        if (res
            && typeof res === 'object'
            && Object.prototype.hasOwnProperty.call(res, 'content')
            && typeof res.content === 'string'
        ) {
            window.location = ('/game/' + res.content);
        }
    });
}
