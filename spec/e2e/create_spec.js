// TODO: clean up these deep relative paths? jsconfig.json is not working...

import {GameCreationStepManager} from "../../client/src/modules/GameCreationStepManager.js";
import {DeckStateManager} from "../../client/src/modules/DeckStateManager.js";
import createTemplate from "../../client/src/view_templates/CreateTemplate.js";

describe('Create page', function () {
    let gameCreationStepManager;

    beforeAll(function () {
        spyOn(window, 'confirm').and.returnValue(true);
        let container = document.createElement("div")
        container.setAttribute('id', 'game-creation-container');
        document.body.appendChild(container);
        document.getElementById("game-creation-container").innerHTML = createTemplate;
        const deckManager = new DeckStateManager();
        gameCreationStepManager = new GameCreationStepManager(deckManager);
        gameCreationStepManager.renderStep('creation-step-container', 1);
    });

    beforeEach(function () {});

    describe('deck builder page', function () {
        beforeAll(function() {
            document.getElementById("moderation-dedicated").click();
            document.getElementById("step-forward-button").click();
        });

        beforeEach(function() {
            document.querySelectorAll('.deck-select-role').forEach((roleEl) => {
                roleEl
                    .querySelector('.deck-select-role-options')
                    .querySelector('.deck-select-remove')
                    .click();
            })
        });

        it('should increment a widget when the plus button is clicked and have it show up in the included cards', () => {
            let card = gameCreationStepManager.deckManager.getCurrentDeck()[0];
            let widget = document.getElementById('card-' + card.role.replaceAll(' ', '-'))
            let plusElement = widget.querySelector('.compact-card-right');
            plusElement.click();

            expect(card.quantity).toEqual(1);
            expect(document.getElementsByClassName('deck-role').length).toEqual(1);
        });

        it('should decrement a widget when the minus button is clicked and remove the role from the included cards', () => {
            let card = gameCreationStepManager.deckManager.getCurrentDeck()[0];
            card.quantity = 1;
            let widget = document.getElementById('card-' + card.role.replaceAll(' ', '-'))
            let plusElement = widget.querySelector('.compact-card-left');
            plusElement.click();

            expect(card.quantity).toEqual(0);
            expect(document.getElementsByClassName('deck-role').length).toEqual(0);
        });

        it('should create a role and display it in the custom role box', () => {
            document.getElementById("custom-role-btn").click();
            document.getElementById("role-name").value = "Test name";
            document.getElementById("role-description").value = "Test description"
            document.getElementById("create-role-button").click();

            expect(document.getElementsByClassName('deck-select-role').length).toEqual(1);
            expect(
                document.getElementsByClassName('deck-select-role')[0]
                    .querySelector('.deck-select-role-name').innerText
            )
                .toEqual("Test name");
        });

        it('should successfully update role information', () => {
            document.getElementById("custom-role-btn").click();
            document.getElementById("role-name").value = "Test name";
            document.getElementById("role-description").value = "Test description"
            document.getElementById("create-role-button").click();
            document.getElementsByClassName('deck-select-role')[0]
                .querySelector('.deck-select-role-options')
                .querySelector('.deck-select-edit')
                .click();
            document.getElementById("role-name").value = "Test name edited";
            document.getElementById("create-role-button").click();

            expect(document.getElementsByClassName('deck-select-role').length).toEqual(1);
            expect(
                document.getElementsByClassName('deck-select-role')[0]
                    .querySelector('.deck-select-role-name').innerText
            )
                .toEqual("Test name edited");
            expect(gameCreationStepManager.deckManager.getCustomRoleOption(
                document.getElementsByClassName('deck-select-role')[0]
                    .querySelector('.deck-select-role-name').innerText
            ).role).toEqual('Test name edited');
        });
    })
});
