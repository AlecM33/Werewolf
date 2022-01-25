import { Game } from '../model/Game.js';
import { cancelCurrentToast, toast } from './Toast.js';
import { ModalManager } from './ModalManager.js';
import { XHRUtility } from './XHRUtility.js';
import { globals } from '../config/globals.js';
import { templates } from './Templates.js';
import { defaultCards } from '../config/defaultCards';
import { UserUtility } from './UserUtility';

export class GameCreationStepManager {
    constructor (deckManager) {
        loadDefaultCards(deckManager);
        deckManager.loadCustomRolesFromCookies();
        this.step = 1;
        this.currentGame = new Game(null, null, null, null);
        this.deckManager = deckManager;
        this.defaultBackHandler = () => {
            cancelCurrentToast();
            this.removeStepElementsFromDOM(this.step);
            this.decrementStep();
            this.renderStep('creation-step-container', this.step);
        };
        this.steps = {
            1: {
                title: 'Select your method of moderation:',
                forwardHandler: () => {
                    if (this.currentGame.hasDedicatedModerator !== null) {
                        cancelCurrentToast();
                        this.removeStepElementsFromDOM(this.step);
                        this.incrementStep();
                        this.renderStep('creation-step-container', this.step);
                    } else {
                        toast('You must select a moderation option.', 'error', true);
                    }
                }
            },
            2: {
                title: 'Create your deck of cards:',
                forwardHandler: () => {
                    if (this.deckManager.getDeckSize() >= 3 && this.deckManager.getDeckSize() <= 50) {
                        this.currentGame.deck = deckManager.getCurrentDeck().filter((card) => card.quantity > 0);
                        cancelCurrentToast();
                        this.removeStepElementsFromDOM(this.step);
                        this.incrementStep();
                        this.renderStep('creation-step-container', this.step);
                    } else {
                        toast('You must have a deck for between 3 and 50 players', 'error', true);
                    }
                },
                backHandler: this.defaultBackHandler
            },
            3: {
                title: 'Set an optional timer:',
                forwardHandler: (e) => {
                    if (e.type === 'click' || e.code === 'Enter') {
                        const hours = parseInt(document.getElementById('game-hours').value);
                        const minutes = parseInt(document.getElementById('game-minutes').value);
                        if ((isNaN(hours) && isNaN(minutes))
                            || (isNaN(hours) && minutes > 0 && minutes < 60)
                            || (isNaN(minutes) && hours > 0 && hours < 6)
                            || (hours === 0 && minutes > 0 && minutes < 60)
                            || (minutes === 0 && hours > 0 && hours < 6)
                            || (hours > 0 && hours < 6 && minutes >= 0 && minutes < 60)
                        ) {
                            if (hasTimer(hours, minutes)) {
                                this.currentGame.hasTimer = true;
                                this.currentGame.timerParams = {
                                    hours: hours,
                                    minutes: minutes
                                };
                            } else {
                                this.currentGame.hasTimer = false;
                                this.currentGame.timerParams = null;
                            }
                            cancelCurrentToast();
                            this.removeStepElementsFromDOM(this.step);
                            this.incrementStep();
                            this.renderStep('creation-step-container', this.step);
                        } else {
                            if (hours === 0 && minutes === 0) {
                                toast('You must enter a non-zero amount of time.', 'error', true);
                            } else {
                                toast('Invalid timer options. Hours can be a max of 5, Minutes a max of 59.', 'error', true);
                            }
                        }
                    }
                },
                backHandler: this.defaultBackHandler
            },
            4: {
                title: 'Enter your name:',
                forwardHandler: (e) => {
                    if (e.type === 'click' || e.code === 'Enter') {
                        const name = document.getElementById('moderator-name').value;
                        if (validateName(name)) {
                            this.currentGame.moderatorName = name;
                            this.removeStepElementsFromDOM(this.step);
                            this.incrementStep();
                            this.renderStep('creation-step-container', this.step);
                        } else {
                            toast('Name must be between 1 and 30 characters.', 'error', true);
                        }
                    }
                },
                backHandler: this.defaultBackHandler
            },
            5: {
                title: 'Review and submit:',
                backHandler: this.defaultBackHandler,
                forwardHandler: (deck, hasTimer, hasDedicatedModerator, moderatorName, timerParams) => {
                    XHRUtility.xhr(
                        '/api/games/create',
                        'POST',
                        null,
                        JSON.stringify(
                            new Game(deck, hasTimer, hasDedicatedModerator, moderatorName, timerParams)
                        )
                    )
                        .then((res) => {
                            if (res
                            && typeof res === 'object'
                            && Object.prototype.hasOwnProperty.call(res, 'content')
                            && typeof res.content === 'string'
                            ) {
                                const json = JSON.parse(res.content);
                                UserUtility.setAnonymousUserId(json.cookie, json.environment);
                                window.location = ('/game/' + json.accessCode);
                            }
                        }).catch((e) => {
                            const button = document.getElementById('create-game');
                            button.innerText = 'Create Game';
                            button.classList.remove('submitted');
                            button.addEventListener('click', this.steps['4'].forwardHandler);
                            if (e.status === 429) {
                                toast('You\'ve sent this request too many times.', 'error', true, true, 6);
                            }
                        });
                }
            }
        };
    }

    incrementStep () {
        if (this.step < Object.keys(this.steps).length) {
            this.step += 1;
        }
    }

    decrementStep () {
        if (this.step > 1) {
            this.step -= 1;
        }
    }

    renderStep (containerId, step) {
        document.querySelectorAll('.animated-placeholder').forEach((el) => el.remove());
        document.querySelectorAll('.placeholder-row').forEach((el) => el.remove());
        document.getElementById('step-title').innerText = this.steps[step].title;
        switch (step) {
            case 1:
                renderModerationTypeStep(this.currentGame, containerId, step);
                showButtons(false, true, this.steps[step].forwardHandler, null);
                break;
            case 2:
                renderRoleSelectionStep(this.currentGame, containerId, step, this.deckManager);
                showButtons(true, true, this.steps[step].forwardHandler, this.steps[step].backHandler);
                break;
            case 3:
                renderTimerStep(containerId, step, this.currentGame, this.steps);
                showButtons(true, true, this.steps[step].forwardHandler, this.steps[step].backHandler);
                break;
            case 4:
                renderNameStep(containerId, step, this.currentGame, this.steps);
                showButtons(true, true, this.steps[step].forwardHandler, this.steps[step].backHandler);
                break;
            case 5:
                renderReviewAndCreateStep(containerId, step, this.currentGame);
                showButtons(true, true, this.steps[step].forwardHandler, this.steps[step].backHandler, this.currentGame);
                break;
            default:
                break;
        }
        updateTracker(step);
    }

    removeStepElementsFromDOM (stepNumber) {
        document.getElementById('step-' + stepNumber)?.remove();
    }
}

function renderNameStep (containerId, step, game, steps) {
    const stepContainer = document.createElement('div');
    setAttributes(stepContainer, { id: 'step-' + step, class: 'flex-row-container step' });

    stepContainer.innerHTML = templates.ENTER_NAME_STEP;
    document.getElementById(containerId).appendChild(stepContainer);
    const nameInput = document.querySelector('#moderator-name');
    nameInput.value = game.moderatorName;
    nameInput.addEventListener('keyup', steps['4'].forwardHandler);
    nameInput.focus();
}

function renderModerationTypeStep (game, containerId, stepNumber) {
    const stepContainer = document.createElement('div');
    setAttributes(stepContainer, { id: 'step-' + stepNumber, class: 'flex-row-container step' });

    stepContainer.innerHTML =
        "<div tabindex=\"0\" id='moderation-dedicated'>I will be the <strong>dedicated mod.</strong> Don't deal me a card.</div>" +
        "<div tabindex=\"0\" id='moderation-self'>The <strong>first person out</strong> will mod. Deal me into the game <span>(mod will be assigned automatically).</span></div>";

    const dedicatedOption = stepContainer.querySelector('#moderation-dedicated');
    if (game.hasDedicatedModerator) {
        dedicatedOption.classList.add('option-selected');
    }
    const selfOption = stepContainer.querySelector('#moderation-self');
    if (game.hasDedicatedModerator === false) {
        selfOption.classList.add('option-selected');
    }

    const dedicatedHandler = (e) => {
        if (e.type === 'click' || e.code === 'Enter') {
            dedicatedOption.classList.add('option-selected');
            selfOption.classList.remove('option-selected');
            game.hasDedicatedModerator = true;
        }
    };

    const tempModHandler = (e) => {
        if (e.type === 'click' || e.code === 'Enter') {
            selfOption.classList.add('option-selected');
            dedicatedOption.classList.remove('option-selected');
            game.hasDedicatedModerator = false;
        }
    };

    dedicatedOption.addEventListener('click', dedicatedHandler);
    dedicatedOption.addEventListener('keyup', dedicatedHandler);

    selfOption.addEventListener('click', tempModHandler);
    selfOption.addEventListener('keyup', tempModHandler);

    document.getElementById(containerId).appendChild(stepContainer);
}

function renderRoleSelectionStep (game, containerId, step, deckManager) {
    const stepContainer = document.createElement('div');
    setAttributes(stepContainer, { id: 'step-' + step, class: 'flex-row-container-left-align step' });

    stepContainer.innerHTML = templates.CREATE_GAME_CUSTOM_ROLES;
    stepContainer.innerHTML += templates.CREATE_GAME_DECK_STATUS;
    stepContainer.innerHTML += templates.CREATE_GAME_DECK;

    const exportHandler = (e) => {
        if (e.type === 'click' || e.code === 'Enter') {
            e.preventDefault();
            deckManager.downloadCustomRoles('play-werewolf-custom-roles', JSON.stringify(
                deckManager.getCurrentCustomRoleOptions()
                    .map((option) => (
                        { role: option.role, team: option.team, description: option.description, custom: option.custom }
                    ))
            ));
        }
    };
    document.getElementById(containerId).appendChild(stepContainer);
    document.querySelector('#custom-roles-export').addEventListener('click', exportHandler);
    document.querySelector('#custom-roles-export').addEventListener('keyup', exportHandler);

    const importHandler = (e) => {
        if (e.type === 'click' || e.code === 'Enter') {
            e.preventDefault();
            ModalManager.displayModal('upload-custom-roles-modal', 'modal-background', 'close-upload-custom-roles-modal-button');
        }
    };
    document.querySelector('#custom-roles-import').addEventListener('click', importHandler);
    document.querySelector('#custom-roles-import').addEventListener('keyup', importHandler);

    document.getElementById('upload-custom-roles-form').onsubmit = (e) => {
        e.preventDefault();
        const fileList = document.getElementById('upload-custom-roles').files;
        if (fileList.length > 0) {
            const file = fileList[0];
            if (file.size > 1000000) {
                toast('Your file is too large (max 1MB)', 'error', true, true, 5);
                return;
            }
            if (file.type !== 'text/plain') {
                toast('Your file must be a text file', 'error', true, true, 5);
                return;
            }

            deckManager.loadCustomRolesFromFile(file, updateCustomRoleOptionsList, loadDefaultCards, showIncludedCards);
        } else {
            toast('You must upload a text file', 'error', true, true, 5);
        }
    };

    const clickHandler = () => {
        const actions = document.getElementById('custom-role-actions');
        if (actions.style.display !== 'none') {
            actions.style.display = 'none';
        } else {
            actions.style.display = 'block';
        }
    };

    document.getElementById('custom-role-hamburger').addEventListener('click', clickHandler);

    showIncludedCards(deckManager);

    loadCustomRoles(deckManager);

    updateDeckStatus(deckManager);

    initializeRemainingEventListeners(deckManager);
}

function renderTimerStep (containerId, stepNumber, game, steps) {
    const div = document.createElement('div');
    div.setAttribute('id', 'step-' + stepNumber);
    div.classList.add('step');

    const timeContainer = document.createElement('div');
    timeContainer.setAttribute('id', 'game-time');

    const hoursDiv = document.createElement('div');
    const hoursLabel = document.createElement('label');
    hoursLabel.setAttribute('for', 'game-hours');
    hoursLabel.innerText = 'Hours (max 5)';
    const hours = document.createElement('input');
    hours.addEventListener('keyup', steps[stepNumber].forwardHandler);
    setAttributes(hours, { type: 'number', id: 'game-hours', name: 'game-hours', min: '0', max: '5', value: game.timerParams?.hours });

    const minutesDiv = document.createElement('div');
    const minsLabel = document.createElement('label');
    minsLabel.setAttribute('for', 'game-minutes');
    minsLabel.innerText = 'Minutes';
    const minutes = document.createElement('input');
    minutes.addEventListener('keyup', steps[stepNumber].forwardHandler);
    setAttributes(minutes, { type: 'number', id: 'game-minutes', name: 'game-minutes', min: '1', max: '60', value: game.timerParams?.minutes });

    hoursDiv.appendChild(hoursLabel);
    hoursDiv.appendChild(hours);
    minutesDiv.appendChild(minsLabel);
    minutesDiv.appendChild(minutes);
    timeContainer.appendChild(hoursDiv);
    timeContainer.appendChild(minutesDiv);
    div.appendChild(timeContainer);

    document.getElementById(containerId).appendChild(div);
}

function renderReviewAndCreateStep (containerId, stepNumber, game) {
    const div = document.createElement('div');
    div.setAttribute('id', 'step-' + stepNumber);
    div.classList.add('step');

    div.innerHTML =
        '<div>' +
            "<label for='mod-name'>Your name</label>" +
            "<div id='mod-name' class='review-option'></div>" +
        '</div>' +
        '<div>' +
            "<label for='mod-option'>Moderation</label>" +
            "<div id='mod-option' class='review-option'></div>" +
        '</div>' +
        '<div>' +
            "<label for='timer-option'>Timer</label>" +
            "<div id='timer-option' class='review-option'></div>" +
        '</div>' +
        '<div>' +
            "<label for='roles-option'>Game Deck</label>" +
            "<div id='roles-option' class='review-option'></div>" +
        '</div>';

    div.querySelector('#mod-option').innerText = game.hasDedicatedModerator
        ? "Dedicated Moderator - don't deal me a card."
        : 'Temporary Moderator - deal me into the game.';

    if (game.hasTimer) {
        const formattedHours = !isNaN(game.timerParams.hours)
            ? game.timerParams.hours + ' Hours'
            : '0 Hours';

        const formattedMinutes = !isNaN(game.timerParams.minutes)
            ? game.timerParams.minutes + ' Minutes'
            : '0 Minutes';

        div.querySelector('#timer-option').innerText = formattedHours + ' ' + formattedMinutes;
    } else {
        div.querySelector('#timer-option').innerText = 'untimed';
    }

    for (const card of game.deck) {
        const roleEl = document.createElement('div');
        roleEl.innerText = card.quantity + 'x ' + card.role;
        div.querySelector('#roles-option').appendChild(roleEl);
    }

    div.querySelector('#mod-name').innerText = game.moderatorName;

    document.getElementById(containerId).appendChild(div);
}

function setAttributes (element, attributeObject) {
    for (const key of Object.keys(attributeObject)) {
        element.setAttribute(key, attributeObject[key]);
    }
}

function updateTracker (step) {
    document.querySelectorAll('.creation-step').forEach((element, i) => {
        if ((i + 1) <= step) {
            element.classList.add('creation-step-filled');
        } else {
            element.classList.remove('creation-step-filled');
        }
    });
}

function showButtons (back, forward, forwardHandler, backHandler, builtGame = null) {
    document.querySelector('#step-back-button')?.remove();
    document.querySelector('#step-forward-button')?.remove();
    document.querySelector('#create-game')?.remove();
    if (back) {
        const backButton = document.createElement('button');
        backButton.innerHTML = '<img alt="back" src="../images/caret-back.svg"/>';
        backButton.addEventListener('click', backHandler);
        backButton.setAttribute('id', 'step-back-button');
        backButton.classList.add('cancel');
        backButton.classList.add('app-button');
        document.getElementById('tracker-container').prepend(backButton);
    }

    if (forward && builtGame === null) {
        const fwdButton = document.createElement('button');
        fwdButton.innerHTML = '<img alt="next" src="../images/caret-forward.svg"/>';
        fwdButton.addEventListener('click', forwardHandler);
        fwdButton.setAttribute('id', 'step-forward-button');
        fwdButton.classList.add('app-button');
        document.getElementById('tracker-container').appendChild(fwdButton);
    } else if (forward && builtGame !== null) {
        const createButton = document.createElement('button');
        createButton.innerText = 'Create';
        createButton.setAttribute('id', 'create-game');
        createButton.classList.add('app-button');
        createButton.addEventListener('click', () => {
            createButton.removeEventListener('click', forwardHandler);
            createButton.classList.add('submitted');
            createButton.innerText = 'Creating...';
            forwardHandler(
                builtGame.deck.filter((card) => card.quantity > 0),
                builtGame.hasTimer,
                builtGame.hasDedicatedModerator,
                builtGame.moderatorName,
                builtGame.timerParams
            );
        });
        document.getElementById('tracker-container').appendChild(createButton);
    }
}

// Display a widget for each default card that allows copies of it to be added/removed. Set initial deck state.
function showIncludedCards (deckManager) {
    document.querySelectorAll('.compact-card').forEach((el) => { el.remove(); });
    for (let i = 0; i < deckManager.getCurrentDeck().length; i++) {
        const card = deckManager.getCurrentDeck()[i];
        const cardEl = constructCompactDeckBuilderElement(card, deckManager);
        if (card.team === globals.ALIGNMENT.GOOD) {
            document.getElementById('deck-good').appendChild(cardEl);
        } else {
            document.getElementById('deck-evil').appendChild(cardEl);
        }
    }
}

/* Display a dropdown containing all the custom roles. Adding one will add it to the game deck and
create a widget for it */
function loadCustomRoles (deckManager) {
    addOptionsToList(deckManager, document.getElementById('deck-select'));
}

function loadDefaultCards (deckManager) {
    defaultCards.sort((a, b) => {
        if (a.team !== b.team) {
            return a.team === globals.ALIGNMENT.GOOD ? 1 : -1;
        }
        return a.role.localeCompare(b.role);
    });
    const deck = [];
    for (let i = 0; i < defaultCards.length; i++) {
        const card = defaultCards[i];
        card.quantity = 0;
        deck.push(card);
    }
    deckManager.deck = deck;
}

function constructCompactDeckBuilderElement (card, deckManager) {
    const cardContainer = document.createElement('div');
    const alignmentClass = card.team === globals.ALIGNMENT.GOOD ? globals.ALIGNMENT.GOOD : globals.ALIGNMENT.EVIL;

    cardContainer.setAttribute('class', 'compact-card ' + alignmentClass);

    cardContainer.setAttribute('id', 'card-' + card.role.replaceAll(' ', '-'));

    cardContainer.innerHTML =
        "<div tabindex='0' class='compact-card-left'>" +
            '<p>-</p>' +
        '</div>' +
        "<div class='compact-card-header'>" +
            "<p class='card-role'></p>" +
        "<div class='card-quantity'></div>" +
        '</div>' +
        "<div tabindex='0' class='compact-card-right'>" +
            '<p>+</p>' +
        '</div>';

    cardContainer.querySelector('.card-role').innerText = card.role;
    cardContainer.title = card.role;
    cardContainer.querySelector('.card-quantity').innerText = card.quantity;

    if (card.quantity > 0) {
        cardContainer.classList.add('selected-card');
    }

    const addHandler = (e) => {
        if (e.type === 'click' || e.code === 'Enter') {
            deckManager.addCopyOfCard(card.role);
            updateDeckStatus(deckManager);
            cardContainer.querySelector('.card-quantity').innerText = deckManager.getCard(card.role).quantity;
            if (deckManager.getCard(card.role).quantity > 0) {
                document.getElementById('card-' + card.role.replaceAll(' ', '-')).classList.add('selected-card');
            }
        }
    };

    const removeHandler = (e) => {
        if (e.type === 'click' || e.code === 'Enter') {
            deckManager.removeCopyOfCard(card.role);
            updateDeckStatus(deckManager);
            cardContainer.querySelector('.card-quantity').innerText = deckManager.getCard(card.role).quantity;
            if (deckManager.getCard(card.role).quantity === 0) {
                document.getElementById('card-' + card.role.replaceAll(' ', '-')).classList.remove('selected-card');
            }
        }
    };

    cardContainer.querySelector('.compact-card-right').addEventListener('click', addHandler);
    cardContainer.querySelector('.compact-card-right').addEventListener('keyup', addHandler);
    cardContainer.querySelector('.compact-card-left').addEventListener('click', removeHandler);
    cardContainer.querySelector('.compact-card-left').addEventListener('keyup', removeHandler);

    return cardContainer;
}

function initializeRemainingEventListeners (deckManager) {
    document.getElementById('role-form').onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('role-name').value.trim();
        const description = document.getElementById('role-description').value.trim();
        const team = document.getElementById('role-alignment').value.toLowerCase().trim();
        if (deckManager.createMode) {
            if (!deckManager.getCustomRoleOption(name) && !deckManager.getCard(name)) { // confirm there is no existing custom role with the same name
                processNewCustomRoleSubmission(name, description, team, deckManager, false);
            } else {
                toast('There is already a role with this name', 'error', true, true, 3);
            }
        } else {
            const option = deckManager.getCustomRoleOption(deckManager.currentlyEditingRoleName);
            if (name === option.role) { // did they edit the name?
                processNewCustomRoleSubmission(name, description, team, deckManager, true, option);
            } else {
                if (!deckManager.getCustomRoleOption(name) && !deckManager.getCard(name)) {
                    processNewCustomRoleSubmission(name, description, team, deckManager, true, option);
                } else {
                    toast('There is already a role with this name', 'error', true, true, 3);
                }
            }
        }
    };
    document.getElementById('custom-role-btn').addEventListener(
        'click', () => {
            const createBtn = document.getElementById('create-role-button');
            createBtn.setAttribute('value', 'Create');
            deckManager.createMode = true;
            deckManager.currentlyEditingRoleName = null;
            document.getElementById('role-name').value = '';
            document.getElementById('role-alignment').value = globals.ALIGNMENT.GOOD;
            document.getElementById('role-description').value = '';
            ModalManager.displayModal(
                'role-modal',
                'modal-background',
                'close-modal-button'
            );
        }
    );
}

function processNewCustomRoleSubmission (name, description, team, deckManager, isUpdate, option = null) {
    if (name.length > 40) {
        toast('Your name is too long (max 40 characters).', 'error', true);
        return;
    }
    if (description.length > 500) {
        toast('Your description is too long (max 500 characters).', 'error', true);
        return;
    }
    if (isUpdate) {
        deckManager.updateCustomRoleOption(option, name, description, team);
        ModalManager.dispelModal('role-modal', 'modal-background');
        toast('Role Updated', 'success', true);
    } else {
        deckManager.addToCustomRoleOptions({ role: name, description: description, team: team, custom: true });
        ModalManager.dispelModal('role-modal', 'modal-background');
        toast('Role Created', 'success', true);
    }

    updateCustomRoleOptionsList(deckManager, document.getElementById('deck-select'));
}

function updateCustomRoleOptionsList (deckManager, selectEl) {
    document.querySelectorAll('#deck-select .deck-select-role').forEach(e => e.remove());
    addOptionsToList(deckManager, selectEl);
}

function addOptionsToList (deckManager, selectEl) {
    const options = deckManager.getCurrentCustomRoleOptions();
    options.sort((a, b) => {
        if (a.team !== b.team) {
            return a.team === globals.ALIGNMENT.GOOD ? 1 : -1;
        }
        return a.role.localeCompare(b.role);
    });
    for (let i = 0; i < options.length; i++) {
        const optionEl = document.createElement('div');
        optionEl.innerHTML = templates.DECK_SELECT_ROLE;
        optionEl.classList.add('deck-select-role');
        const alignmentClass = options[i].team === globals.ALIGNMENT.GOOD ? globals.ALIGNMENT.GOOD : globals.ALIGNMENT.EVIL;
        optionEl.classList.add(alignmentClass);
        optionEl.querySelector('.deck-select-role-name').innerText = options[i].role;
        selectEl.appendChild(optionEl);
    }

    addCustomRoleEventListeners(deckManager, selectEl);
}

function addCustomRoleEventListeners (deckManager, select) {
    document.querySelectorAll('.deck-select-role').forEach((role) => {
        const name = role.querySelector('.deck-select-role-name').innerText;
        const includeHandler = (e) => {
            if (e.type === 'click' || e.code === 'Enter') {
                e.preventDefault();
                if (!deckManager.getCard(name)) {
                    deckManager.addToDeck(name);
                    const cardEl = constructCompactDeckBuilderElement(deckManager.getCard(name), deckManager);
                    toast('"' + name + '" made available below.', 'success', true, true, 4);
                    if (deckManager.getCard(name).team === globals.ALIGNMENT.GOOD) {
                        document.getElementById('deck-good').appendChild(cardEl);
                    } else {
                        document.getElementById('deck-evil').appendChild(cardEl);
                    }
                    updateCustomRoleOptionsList(deckManager, select);
                } else {
                    toast('"' + select.value + '" already included.', 'error', true, true, 3);
                }
            }
        };
        role.querySelector('.deck-select-include').addEventListener('click', includeHandler);
        role.querySelector('.deck-select-include').addEventListener('keyup', includeHandler);

        const removeHandler = (e) => {
            if (e.type === 'click' || e.code === 'Enter') {
                if (confirm("Delete the role '" + name + "'?")) {
                    e.preventDefault();
                    deckManager.removeFromCustomRoleOptions(name);
                    updateCustomRoleOptionsList(deckManager, select);
                }
            }
        };
        role.querySelector('.deck-select-remove').addEventListener('click', removeHandler);
        role.querySelector('.deck-select-remove').addEventListener('keyup', removeHandler);

        const infoHandler = (e) => {
            if (e.type === 'click' || e.code === 'Enter') {
                const alignmentEl = document.getElementById('custom-role-info-modal-alignment');
                alignmentEl.classList.remove(globals.ALIGNMENT.GOOD);
                alignmentEl.classList.remove(globals.ALIGNMENT.EVIL);
                e.preventDefault();
                const option = deckManager.getCustomRoleOption(name);
                document.getElementById('custom-role-info-modal-name').innerText = name;
                alignmentEl.classList.add(option.team);
                document.getElementById('custom-role-info-modal-description').innerText = option.description;
                alignmentEl.innerText = option.team;
                ModalManager.displayModal('custom-role-info-modal', 'modal-background', 'close-custom-role-info-modal-button');
            }
        };
        role.querySelector('.deck-select-info').addEventListener('click', infoHandler);
        role.querySelector('.deck-select-info').addEventListener('keyup', infoHandler);

        const editHandler = (e) => {
            if (e.type === 'click' || e.code === 'Enter') {
                e.preventDefault();
                const option = deckManager.getCustomRoleOption(name);
                document.getElementById('role-name').value = option.role;
                document.getElementById('role-alignment').value = option.team;
                document.getElementById('role-description').value = option.description;
                deckManager.createMode = false;
                deckManager.currentlyEditingRoleName = option.role;
                const createBtn = document.getElementById('create-role-button');
                createBtn.setAttribute('value', 'Update');
                ModalManager.displayModal('role-modal', 'modal-background', 'close-modal-button');
            }
        };
        role.querySelector('.deck-select-edit').addEventListener('click', editHandler);
        role.querySelector('.deck-select-edit').addEventListener('keyup', editHandler);
    });
}

function updateDeckStatus (deckManager) {
    document.querySelectorAll('.deck-role').forEach((el) => el.remove());
    document.getElementById('deck-count').innerText = deckManager.getDeckSize() + ' Players';
    if (deckManager.getDeckSize() === 0) {
        const placeholder = document.createElement('div');
        placeholder.setAttribute('id', 'deck-list-placeholder');
        placeholder.innerText = 'Add a card from the available roles below.';
        document.getElementById('deck-list').appendChild(placeholder);
    } else {
        if (document.getElementById('deck-list-placeholder')) {
            document.getElementById('deck-list-placeholder').remove();
        }
        for (const card of deckManager.getCurrentDeck()) {
            if (card.quantity > 0) {
                const roleEl = document.createElement('div');
                roleEl.classList.add('deck-role');
                if (card.team === globals.ALIGNMENT.GOOD) {
                    roleEl.classList.add(globals.ALIGNMENT.GOOD);
                } else {
                    roleEl.classList.add(globals.ALIGNMENT.EVIL);
                }
                roleEl.innerText = card.quantity + 'x ' + card.role;
                document.getElementById('deck-list').appendChild(roleEl);
            }
        }
    }
}

function hasTimer (hours, minutes) {
    return (!isNaN(hours) || !isNaN(minutes));
}

function validateName (name) {
    return typeof name === 'string' && name.length > 0 && name.length <= 30;
}
