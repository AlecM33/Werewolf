import { injectNavbar } from '../front_end_components/Navbar.js';
import createTemplate from '../../view_templates/CreateTemplate.js';

export const createHandler = (gameCreationStepManager) => {
    injectNavbar();
    document.getElementById('game-creation-container').innerHTML = createTemplate;
    gameCreationStepManager.renderStep('creation-step-container', 1);
};
