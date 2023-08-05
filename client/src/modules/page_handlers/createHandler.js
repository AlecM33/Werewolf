import { injectNavbar } from '../front_end_components/Navbar.js';
import { fullCreateTemplate } from '../../view_templates/CreateTemplate.js';

export const createHandler = (gameCreationStepManager) => {
    injectNavbar();
    document.getElementById('game-creation-container').innerHTML = fullCreateTemplate;
    gameCreationStepManager.renderStep('creation-step-container', 1);
};
