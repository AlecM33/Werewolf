import { toast } from "../modules/Toast.js";
import { ModalManager } from "../modules/ModalManager.js";
import { defaultCards } from "../config/defaultCards.js";
import { customCards } from "../config/customCards.js";
import { DeckStateManager } from "../modules/DeckStateManager.js";
import {XHRUtility} from "../modules/XHRUtility.js";
import {Game} from "../model/Game.js";

export const create = () => {
    let deckManager = new DeckStateManager();
    loadDefaultCards(deckManager);
    loadCustomCards(deckManager);
    document.getElementById("game-form").onsubmit = (e) => {
        e.preventDefault();
        let timerBool = hasTimer();
        let timerParams = timerBool
            ? {
                hours: document.getElementById("game-hours").value,
                minutes: document.getElementById("game-minutes").value
            }
            : null;
        if (deckManager.getDeckSize() >= 5) {
            createGameForHosting(
                deckManager.getCurrentDeck().filter((card) => card.quantity > 0),
                timerBool,
                timerParams
            );
        } else {
            toast("You must include enough cards for 5 players.", "error", true);
        }
    }
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

// Display a widget for each default card that allows copies of it to be added/removed. Set initial deck state.
function loadDefaultCards(deckManager) {
    defaultCards.sort((a, b) => {
        return a.role.localeCompare(b.role);
    });
    let deck = [];
    for (let i = 0; i < defaultCards.length; i ++) { // each dropdown should include every
        let card = defaultCards[i];
        card.quantity = 0;
        let cardEl = constructCompactDeckBuilderElement(defaultCards[i], deckManager);
        document.getElementById("deck").appendChild(cardEl);
        deck.push(card);
    }
    deckManager.deck = deck;
}

/* Display a dropdown containing all the custom roles. Adding one will add it to the game deck and
create a widget for it */
function loadCustomCards(deckManager) {
    let form = document.getElementById("add-card-to-deck-form");
    customCards.sort((a, b) => {
        return a.role.localeCompare(b.role);
    });
    let selectEl = document.createElement("select");
    selectEl.setAttribute("id", "deck-select");
    selectEl.setAttribute("class", "ui search dropdown");
    addOptionsToList(customCards, selectEl);
    form.appendChild(selectEl);
    let submitBtn = document.createElement("input");
    submitBtn.setAttribute("type", "submit");
    submitBtn.setAttribute("value", "Add Role");
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (selectEl.value && selectEl.value.length > 0) {
            deckManager.addToDeck(selectEl.value);
            let cardEl = constructCompactDeckBuilderElement(deckManager.getCard(selectEl.value), deckManager);
            updateCustomRoleOptionsList(deckManager, selectEl);
            document.getElementById("deck").appendChild(cardEl);
            document.querySelector("#add-card-to-deck-form .text").innerText = "";
        }
    })
    form.appendChild(submitBtn);
    $('.ui.dropdown')
        .dropdown();
    deckManager.customRoleOptions = customCards;
}

function updateCustomRoleOptionsList(deckManager, selectEl) {
    document.querySelectorAll('#deck-select option').forEach(e => e.remove());
    addOptionsToList(deckManager.customRoleOptions, selectEl);
}

function addOptionsToList(options, selectEl) {
    for (let i = 0; i < options.length; i ++) {
        let optionEl = document.createElement("option");
        optionEl.setAttribute("value", customCards[i].role);
        optionEl.innerText = customCards[i].role;
        selectEl.appendChild(optionEl);
    }
}

function constructCompactDeckBuilderElement(card, deckManager) {
    const cardContainer = document.createElement("div");

    cardContainer.setAttribute("class", "compact-card");

    cardContainer.setAttribute("id", "card-" + card.role.replaceAll(' ', '-'));

    cardContainer.innerHTML =
        "<div class='compact-card-left'>" +
        "<p>-</p>" +
        "</div>" +
        "<div class='compact-card-header'>" +
        "<p class='card-role'></p>" +
        "<div class='card-quantity'>0</div>" +
        "</div>" +
        "<div class='compact-card-right'>" +
        "<p>+</p>" +
        "</div>";

    cardContainer.querySelector('.card-role').innerText = card.role;

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

function hasTimer() {
    return document.getElementById("game-hours").value.length > 0 || document.getElementById("game-minutes").value.length > 0
}

function createGameForHosting(deck, hasTimer, timerParams) {
    XHRUtility.xhr(
        '/api/games/create',
        'POST',
        null,
        JSON.stringify(
            new Game(deck, hasTimer, timerParams)
        )
    )
    .then((res) => {
        if (res
            && typeof res === 'object'
            && Object.prototype.hasOwnProperty.call(res, 'content')
            && typeof res.content === 'string'
        ) {
            window.location = ('/games/' + res.content);
        }
    });
}
