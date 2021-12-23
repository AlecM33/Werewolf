import { Game } from "../model/Game.js";
import { cancelCurrentToast, toast } from "./Toast.js";
import { customCards } from "../config/customCards.js";
import { ModalManager } from "./ModalManager.js";
import {XHRUtility} from "./XHRUtility.js";
import {globals} from "../config/globals.js";

export class GameCreationStepManager {
    constructor(deckManager) {
        this.step = 1;
        this.currentGame = new Game(null, null, null, null);
        this.deckManager = deckManager;
        this.defaultBackHandler = () => {
            cancelCurrentToast();
            this.removeStepElementsFromDOM(this.step);
            this.decrementStep();
            this.renderStep("creation-step-container", this.step);
        }
        this.steps = {
            1: {
                title: "Select your method of moderation:",
                forwardHandler: () => {
                    if (this.currentGame.hasDedicatedModerator !== null) {
                        cancelCurrentToast();
                        this.removeStepElementsFromDOM(this.step);
                        this.incrementStep();
                        this.renderStep("creation-step-container", this.step);
                    } else {
                        toast("You must select a moderation option.", "error", true);
                    }
                }
            },
            2: {
                title: "Create your deck of cards:",
                forwardHandler: () => {
                    if (this.deckManager.getDeckSize() >= 5) {
                        this.currentGame.deck = deckManager.getCurrentDeck().filter((card) => card.quantity > 0)
                        cancelCurrentToast();
                        this.removeStepElementsFromDOM(this.step);
                        this.incrementStep();
                        this.renderStep("creation-step-container", this.step);
                    } else {
                        toast("You must include enough cards for 5 players.", "error", true);
                    }
                },
                backHandler: this.defaultBackHandler
            },
            3: {
                title: "Set an optional timer:",
                forwardHandler: () => {
                    let hours = parseInt(document.getElementById("game-hours").value);
                    let minutes = parseInt(document.getElementById("game-minutes").value);
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
                            }
                        } else {
                            this.currentGame.hasTimer = false;
                            this.currentGame.timerParams = null;
                        }
                        console.log(this.currentGame);
                        cancelCurrentToast();
                        this.removeStepElementsFromDOM(this.step);
                        this.incrementStep();
                        this.renderStep("creation-step-container", this.step);
                    } else {
                        if (hours === 0 && minutes === 0) {
                            toast("You must enter a non-zero amount of time.", "error", true);
                        } else {
                            toast("Invalid timer options. Hours can be a max of 5, Minutes a max of 59.", "error", true);
                        }
                    }
                },
                backHandler: this.defaultBackHandler
            },
            4: {
                title: "Review and submit:",
                backHandler: this.defaultBackHandler,
                forwardHandler: (deck, hasTimer, hasDedicatedModerator, timerParams) => {
                    XHRUtility.xhr(
                        '/api/games/create',
                        'POST',
                        null,
                        JSON.stringify(
                            new Game(deck, hasTimer, hasDedicatedModerator, timerParams)
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
            }
        }
    }

    incrementStep() {
        if (this.step < Object.keys(this.steps).length) {
            this.step += 1;
        }
    }

    decrementStep() {
        if (this.step > 1) {
            this.step -= 1;
        }
    }

    renderStep(containerId, step) {
        document.querySelectorAll('.animated-placeholder').forEach((el) => el.remove());
        document.querySelectorAll('.placeholder-row').forEach((el) => el.remove());
        document.getElementById("step-title").innerText = this.steps[step].title;
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
                renderTimerStep(containerId, step, this.currentGame);
                showButtons(true, true, this.steps[step].forwardHandler, this.steps[step].backHandler);
                break;
            case 4:
                renderReviewAndCreateStep(containerId, step, this.currentGame);
                showButtons(true, true, this.steps[step].forwardHandler, this.steps[step].backHandler, this.currentGame);
                break;
            default:
                break;
        }
        updateTracker(step);
    }

    removeStepElementsFromDOM(stepNumber) {
        document.getElementById('step-' + stepNumber)?.remove();
    }
}

function renderModerationTypeStep(game, containerId, stepNumber) {
    const stepContainer = document.createElement("div");
    setAttributes(stepContainer, {'id': 'step-' + stepNumber, 'class': 'flex-row-container step'});

    stepContainer.innerHTML =
        "<div id='moderation-dedicated'>I will be the <strong>dedicated mod.</strong> Don't deal me a card.</div>" +
        "<div id='moderation-self'>The <strong>first person out</strong> will mod. Deal me into the game <span>(mod will be assigned automatically).</span></div>";

    let dedicatedOption = stepContainer.querySelector('#moderation-dedicated');
    if (game.hasDedicatedModerator) {
        dedicatedOption.classList.add('option-selected');
    }
    let selfOption = stepContainer.querySelector('#moderation-self');
    if (game.hasDedicatedModerator === false) {
        selfOption.classList.add('option-selected');
    }

    dedicatedOption.addEventListener('click', () => {
        dedicatedOption.classList.add('option-selected');
        selfOption.classList.remove('option-selected');
        game.hasDedicatedModerator = true;
    });

    selfOption.addEventListener('click', () => {
        selfOption.classList.add('option-selected');
        dedicatedOption.classList.remove('option-selected');
        game.hasDedicatedModerator = false;
    });

    document.getElementById(containerId).appendChild(stepContainer);
}

function renderRoleSelectionStep(game, containerId, step, deckManager) {
    const stepContainer = document.createElement("div");
    setAttributes(stepContainer, {'id': 'step-' + step, 'class': 'flex-row-container-left-align step'});

    let div = document.createElement("div");
    div.setAttribute("id", "deck-container");
    let deckContainer = document.createElement("div");
    deckContainer.setAttribute("id", "deck");

    deckContainer = loadIncludedCards(deckManager, deckContainer);

    let deckLabel = document.createElement("label");
    deckLabel.setAttribute("for", "deck");
    deckLabel.innerText = 'Game Deck: ' + deckManager.getDeckSize() + ' Players';
    div.prepend(deckLabel);
    div.appendChild(deckContainer);
    stepContainer.appendChild(div);

    let customForm = loadCustomRoles(deckManager);

    stepContainer.prepend(customForm);

    document.getElementById(containerId).appendChild(stepContainer);

    initializeRemainingEventListeners(deckManager);
}

function renderTimerStep(containerId, stepNumber, game) {
    let div = document.createElement("div");
    div.setAttribute("id", "step-" + stepNumber);
    div.classList.add('step');

    let timeContainer = document.createElement("div");
    timeContainer.setAttribute("id", "game-time");

    let hoursDiv = document.createElement("div");
    let hoursLabel = document.createElement("label");
    hoursLabel.setAttribute("for", "game-hours");
    hoursLabel.innerText = "Hours (max 5)"
    let hours = document.createElement("input");
    setAttributes(hours, {type: "number", id: "game-hours", name: "game-hours", min: "0", max: "5", value: game.timerParams?.hours})

    let minutesDiv = document.createElement("div");
    let minsLabel = document.createElement("label");
    minsLabel.setAttribute("for", "game-minutes");
    minsLabel.innerText = "Minutes"
    let minutes = document.createElement("input");
    setAttributes(minutes, {type: "number", id: "game-minutes", name: "game-minutes", min: "1", max: "60", value: game.timerParams?.minutes})

    hoursDiv.appendChild(hoursLabel);
    hoursDiv.appendChild(hours);
    minutesDiv.appendChild(minsLabel);
    minutesDiv.appendChild(minutes);
    timeContainer.appendChild(hoursDiv);
    timeContainer.appendChild(minutesDiv);
    div.appendChild(timeContainer);

    document.getElementById(containerId).appendChild(div);
}

function renderReviewAndCreateStep(containerId, stepNumber, game) {
    let div = document.createElement("div");
    div.setAttribute("id", "step-" + stepNumber);
    div.classList.add('step');

    div.innerHTML =
        "<div>" +
            "<label for='mod-option'>Moderation</label>" +
            "<div id='mod-option' class='review-option'></div>" +
        "</div>" +
        "<div>" +
            "<label for='timer-option'>Timer</label>" +
            "<div id='timer-option' class='review-option'></div>" +
        "</div>" +
        "<div>" +
            "<label for='roles-option'>Game Deck</label>" +
            "<div id='roles-option' class='review-option'></div>" +
        "</div>";


    div.querySelector('#mod-option').innerText = game.hasDedicatedModerator
            ? "I will be the dedicated mod. Don't deal me a card."
            : "The first person out will mod. Deal me into the game.";

    if (game.hasTimer) {
        let formattedHours = !isNaN(game.timerParams.hours)
            ? game.timerParams.hours + ' Hours'
            : '0 Hours'

        let formattedMinutes = !isNaN(game.timerParams.minutes)
            ? game.timerParams.minutes + ' Minutes'
            : '0 Minutes'

        div.querySelector('#timer-option').innerText = formattedHours + " " + formattedMinutes;
    } else {
        div.querySelector('#timer-option').innerText = "untimed"
    }

    for (let card of game.deck) {
        let roleEl = document.createElement("div");
        roleEl.innerText = card.quantity + 'x ' + card.role;
        div.querySelector('#roles-option').appendChild(roleEl);
    }

    document.getElementById(containerId).appendChild(div);
}

function setAttributes(element, attributeObject) {
    for (let key of Object.keys(attributeObject)) {
        element.setAttribute(key, attributeObject[key]);
    }
}

function updateTracker(step) {
    document.querySelectorAll('.creation-step').forEach((element, i) => {
        if ((i + 1) <= step) {
            element.classList.add('creation-step-filled');
        } else {
            element.classList.remove('creation-step-filled');
        }
    })
}

function showButtons(back, forward, forwardHandler, backHandler, builtGame=null) {
    document.querySelector("#step-back-button")?.remove();
    document.querySelector("#step-forward-button")?.remove();
    document.querySelector("#create-game")?.remove();
    if (back) {
        let backButton = document.createElement("button");
        backButton.innerText = "\u2bc7 Back";
        backButton.addEventListener('click', backHandler);
        backButton.setAttribute("id", "step-back-button");
        document.getElementById("tracker-container").prepend(backButton);
    }

    if (forward && builtGame === null) {
        let fwdButton = document.createElement("button");
        fwdButton.innerHTML = "Next \u25b6";
        fwdButton.addEventListener('click', forwardHandler);
        fwdButton.setAttribute("id", "step-forward-button");
        document.getElementById("tracker-container").appendChild(fwdButton);
    } else if (forward && builtGame !== null) {
        let createButton = document.createElement("button");
        createButton.innerText = "Create";
        createButton.setAttribute("id", "create-game");
        createButton.addEventListener("click", () => {
            forwardHandler(
                builtGame.deck.filter((card) => card.quantity > 0),
                builtGame.hasTimer,
                builtGame.hasDedicatedModerator,
                builtGame.timerParams
            );
        });
        document.getElementById("tracker-container").appendChild(createButton);
    }
}

// Display a widget for each default card that allows copies of it to be added/removed. Set initial deck state.
function loadIncludedCards(deckManager, deckContainer) {

    for (let i = 0; i < deckManager.getCurrentDeck().length; i ++) { // each dropdown should include every
        let card = deckManager.getCurrentDeck()[i];
        let cardEl = constructCompactDeckBuilderElement(card, deckManager);
        deckContainer.appendChild(cardEl);
    }

    return deckContainer;
}

/* Display a dropdown containing all the custom roles. Adding one will add it to the game deck and
create a widget for it */
function loadCustomRoles(deckManager) {
    let customContainer = document.createElement("div");
    customContainer.setAttribute("id", "custom-roles-container");

    let formLabel = document.createElement("label");
    formLabel.innerText = 'Custom Roles';
    formLabel.setAttribute("for", "add-card-to-deck-form");

    let createRoleButton = document.createElement("button");
    createRoleButton.setAttribute("id", "custom-role-btn");
    createRoleButton.innerText = '+ Create Custom Role';

    let form = document.createElement("form");
    form.setAttribute("id", "add-card-to-deck-form");

    let selectEl = document.createElement("select");
    selectEl.setAttribute("id", "deck-select");
    addOptionsToList(deckManager.getCurrentCustomRoleOptions(), selectEl);

    form.appendChild(selectEl);

    let submitBtn = document.createElement("input");
    submitBtn.setAttribute("type", "submit");
    submitBtn.setAttribute("value", "Include Role");
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (selectEl.value && selectEl.value.length > 0) {
            deckManager.addToDeck(selectEl.value);
            let cardEl = constructCompactDeckBuilderElement(deckManager.getCard(selectEl.value), deckManager);
            toast('"' + selectEl.value + '" included.', 'success', true, true, 3);
            updateCustomRoleOptionsList(deckManager, selectEl);
            document.getElementById("deck").appendChild(cardEl);
        }
    })
    form.appendChild(submitBtn);

    customContainer.appendChild(formLabel);
    customContainer.appendChild(form);
    customContainer.appendChild(createRoleButton);

    return customContainer;
}

function constructCompactDeckBuilderElement(card, deckManager) {
    const cardContainer = document.createElement("div");
    let alignmentClass = card.team === globals.ALIGNMENT.GOOD ? globals.ALIGNMENT.GOOD : globals.ALIGNMENT.EVIL

    cardContainer.setAttribute("class", "compact-card " + alignmentClass);

    cardContainer.setAttribute("id", "card-" + card.role.replaceAll(' ', '-'));

    cardContainer.innerHTML =
        "<div class='compact-card-left'>" +
        "<p>-</p>" +
        "</div>" +
        "<div class='compact-card-header'>" +
        "<p class='card-role'></p>" +
        "<div class='card-quantity'></div>" +
        "</div>" +
        "<div class='compact-card-right'>" +
        "<p>+</p>" +
        "</div>";

    cardContainer.querySelector('.card-role').innerText = card.role;
    cardContainer.title = card.role;
    cardContainer.querySelector('.card-quantity').innerText = card.quantity;

    if (card.quantity > 0) {
        cardContainer.classList.add('selected-card');
    }

    cardContainer.querySelector('.compact-card-right').addEventListener('click', () => {
        deckManager.addCopyOfCard(card.role);
        cardContainer.querySelector('.card-quantity').innerText = deckManager.getCard(card.role).quantity;
        document.querySelector('label[for="deck"]').innerText = 'Game Deck: ' + deckManager.getDeckSize() + ' Players';
        if (deckManager.getCard(card.role).quantity > 0) {
            document.getElementById('card-' + card.role.replaceAll(' ', '-')).classList.add('selected-card')
        }
    });
    cardContainer.querySelector('.compact-card-left').addEventListener('click', () => {
        deckManager.removeCopyOfCard(card.role);
        cardContainer.querySelector('.card-quantity').innerText = deckManager.getCard(card.role).quantity;
        document.querySelector('label[for="deck"]').innerText = 'Game Deck: ' + deckManager.getDeckSize() + ' Players';
        if (deckManager.getCard(card.role).quantity === 0) {
            document.getElementById('card-' + card.role.replaceAll(' ', '-')).classList.remove('selected-card')
        }
    });
    return cardContainer;
}

function initializeRemainingEventListeners(deckManager) {
    document.getElementById("add-role-form").onsubmit = (e) => {
        e.preventDefault();
        let name = document.getElementById("role-name").value.trim();
        let description = document.getElementById("role-description").value.trim();
        if (!deckManager.getCustomRoleOption(name)) { // confirm there is no existing custom role with the same name
            deckManager.addToCustomRoleOptions({role: name, description: description});
            updateCustomRoleOptionsList(deckManager, document.getElementById("deck-select"))
            ModalManager.dispelModal("add-role-modal", "add-role-modal-background");
            toast("Role Added", "success", true);
        } else {
            toast("There is already a custom role with this name.", "error", true);
        }
    }
    document.getElementById("custom-role-btn").addEventListener(
        "click", () => {
            ModalManager.displayModal(
                "add-role-modal",
                "add-role-modal-background",
                "close-modal-button"
            )
        }
    )
}

function updateCustomRoleOptionsList(deckManager, selectEl) {
    document.querySelectorAll('#deck-select option').forEach(e => e.remove());
    addOptionsToList(deckManager.customRoleOptions, selectEl);
}

function addOptionsToList(options, selectEl) {
    options.sort((a, b) => {
        return a.role.localeCompare(b.role);
    });
    for (let i = 0; i < options.length; i ++) {
        let optionEl = document.createElement("option");
        let alignmentClass = customCards[i].team === globals.ALIGNMENT.GOOD ? globals.ALIGNMENT.GOOD : globals.ALIGNMENT.EVIL
        optionEl.classList.add(alignmentClass);
        optionEl.setAttribute("value", customCards[i].role);
        optionEl.innerText = customCards[i].role;
        selectEl.appendChild(optionEl);
    }
}

function hasTimer(hours, minutes) {
    return (!isNaN(hours) || !isNaN(minutes));
}
