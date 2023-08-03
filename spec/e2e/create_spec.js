// TODO: clean up these deep relative paths? jsconfig.json is not working...
import { createHandler } from '../../client/src/modules/page_handlers/createHandler.js';
import { GameCreationStepManager } from '../../client/src/modules/game_creation/GameCreationStepManager.js';
import { DeckStateManager } from '../../client/src/modules/game_creation/DeckStateManager.js';

describe('Create page', function () {
    const gameCreationStepManager = new GameCreationStepManager(new DeckStateManager());

    beforeAll(function () {
        spyOn(window, 'confirm').and.returnValue(true);
        const container = document.createElement('div');
        container.setAttribute('id', 'game-creation-container');
        document.body.appendChild(container);
        createHandler(gameCreationStepManager);
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

        it('should successstartabley update custom role information after creating it', () => {
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

        it('should load a deck template', () => {
            document.getElementById('role-category-default').click();
            document.getElementById('deck-template-button').click();
            document.querySelectorAll('.template-option')[0].click();

            expect(gameCreationStepManager.deckManager.deck.length).toEqual(5);
            expect(document.querySelectorAll('.added-role').length).toEqual(5);
        });

        it('clear existing added cards and leave only what roles are part of the template', () => {
            document.getElementById('role-category-default').click();
            const roles = document.querySelectorAll('.default-role');
            roles.forEach((el) => {
                const plusElement = el.querySelector('.role-include');
                plusElement.click();
            });

            document.getElementById('deck-template-button').click();
            document.querySelectorAll('.template-option')[0].click();

            expect(gameCreationStepManager.deckManager.deck.length).toEqual(5);
            expect(document.querySelectorAll('.added-role').length).toEqual(5);
        });

        afterAll(() => {
            document.body.innerHTML = '';
        });
    });
});
