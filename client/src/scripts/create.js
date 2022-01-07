import { DeckStateManager } from "../modules/DeckStateManager.js";
import { GameCreationStepManager } from "../modules/GameCreationStepManager.js";
import { injectNavbar } from "../modules/Navbar.js";

const create = () => {
    injectNavbar();
    let deckManager = new DeckStateManager();
    let gameCreationStepManager = new GameCreationStepManager(deckManager);
    gameCreationStepManager.renderStep("creation-step-container", 1);
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = create;
} else {
    create();
}
