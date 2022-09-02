import { createHandler } from '../modules/page_handlers/createHandler.js';
import { GameCreationStepManager } from '../modules/game_creation/GameCreationStepManager.js';
import { DeckStateManager } from '../modules/game_creation/DeckStateManager.js';

createHandler(new GameCreationStepManager(new DeckStateManager()));
