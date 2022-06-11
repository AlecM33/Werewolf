// TODO: clean up these deep relative paths? jsconfig.json is not working...

import { GameCreationStepManager } from '../../client/src/modules/GameCreationStepManager.js';
import { DeckStateManager } from '../../client/src/modules/DeckStateManager.js';
import createTemplate from '../../client/src/view_templates/CreateTemplate.js';

describe('Create page', function () {
    let gameCreationStepManager;

    beforeAll(function () {
        spyOn(window, 'confirm').and.returnValue(true);
        const container = document.createElement('div');
        container.setAttribute('id', 'game-creation-container');
        document.body.appendChild(container);
        document.getElementById('game-creation-container').innerHTML = createTemplate;
        const deckManager = new DeckStateManager();
        gameCreationStepManager = new GameCreationStepManager(deckManager);
        gameCreationStepManager.renderStep('creation-step-container', 1);
    });

    describe('deck builder page', function () {
        beforeAll(function () {
            document.getElementById('moderation-dedicated').click();
            document.getElementById('step-forward-button').click();
        });

        beforeEach(function () {
            for (const card of gameCreationStepManager.deckManager.deck) {
                card.quantity = 0;
            }
            gameCreationStepManager.roleBox.customRoles = [];
            gameCreationStepManager.deckManager.updateDeckStatus();
        });

        it('should include a copy of a role in the deck for the game', () => {
            document.getElementById('role-category-default').click();
            const card = gameCreationStepManager.roleBox.defaultRoles[0];
            const role = document.querySelectorAll('.default-role')[0];
            const plusElement = role.querySelector('.role-include');
            plusElement.click();
            expect(gameCreationStepManager.deckManager.deck.find((card) => card.id === role.dataset.roleId).quantity).toEqual(1);
            expect(document.querySelector('#deck-status-container [data-role-id="' + card.id + '"]')).toBeDefined();
        });

        it('should remove a copy of a role in the deck for the game', () => {
            document.getElementById('role-category-default').click();
            const card = gameCreationStepManager.roleBox.defaultRoles[0];
            const role = document.querySelectorAll('.default-role')[0];
            const plusElement = role.querySelector('.role-include');
            plusElement.click();
            const minusElement = document.querySelector('#deck-status-container [data-role-id="' + card.id + '"]')
                .querySelector('.role-remove');
            minusElement.click();

            expect(gameCreationStepManager.deckManager.deck.length).toEqual(0);
            expect(document.querySelector('#deck-status-container [data-role-id="' + card.id + '"]')).toBeNull();
        });

        it('should create a role and display it in the custom role list', () => {
            document.getElementById('role-category-custom').click();
            document.getElementById('custom-role-btn').click();
            document.getElementById('role-name').value = 'Test name';
            document.getElementById('role-description').value = 'Test description';
            document.getElementById('create-role-button').click();

            expect(document.getElementsByClassName('custom-role').length).toEqual(1);
            expect(
                document.getElementsByClassName('custom-role')[0]
                    .querySelector('.role-name').innerText
            )
                .toEqual('Test name');
        });

        it('should successfully update custom role information after creating it', () => {
            document.getElementById('role-category-custom').click();
            document.getElementById('custom-role-btn').click();
            document.getElementById('role-name').value = 'Test name';
            document.getElementById('role-description').value = 'Test description';
            document.getElementById('create-role-button').click();
            document.getElementsByClassName('custom-role')[0]
                .querySelector('.role-options')
                .querySelector('.role-edit')
                .click();
            document.getElementById('role-name').value = 'Test name edited';
            document.getElementById('create-role-button').click();

            expect(document.getElementsByClassName('custom-role').length).toEqual(1);
            expect(
                document.getElementsByClassName('custom-role')[0]
                    .querySelector('.role-name').innerText
            )
                .toEqual('Test name edited');
            expect(gameCreationStepManager.roleBox.getCustomRole(
                document.getElementsByClassName('custom-role')[0]
                    .querySelector('.role-name').innerText
            ).role).toEqual('Test name edited');
        });
    });
});
