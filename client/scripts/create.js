import { toast } from "../modules/Toast.js";
import { ModalManager } from "../modules/ModalManager.js";
import { defaultCards } from "../config/defaultCards.js";
import { customCards } from "../config/customCards.js";
import { DeckStateManager } from "../modules/DeckStateManager.js";

export const create = () => {
    let deckManager = new DeckStateManager();
    loadDefaultCards(deckManager);
    loadCustomCards(deckManager);
    document.getElementById("game-form").onsubmit = (e) => {
        e.preventDefault();
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
    addOptionsToList(customCards, selectEl);
    form.appendChild(selectEl);
    let submitBtn = document.createElement("input");
    submitBtn.setAttribute("type", "submit");
    submitBtn.setAttribute("value", "Add Role to Deck");
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (selectEl.selectedIndex > 0) {
            deckManager.addToDeck(selectEl.value);
            let cardEl = constructCompactDeckBuilderElement(deckManager.getCard(selectEl.value), deckManager);
            updateCustomRoleOptionsList(deckManager, selectEl);
            document.getElementById("deck").appendChild(cardEl);
        }
    })
    form.appendChild(submitBtn);


    deckManager.customRoleOptions = customCards;
}

function updateCustomRoleOptionsList(deckManager, selectEl) {
    document.querySelectorAll('#deck-select option').forEach(e => e.remove());
    addOptionsToList(deckManager.customRoleOptions, selectEl);
}

function addOptionsToList(options, selectEl) {
    let noneSelected = document.createElement("option");
    noneSelected.innerText = "None selected"
    noneSelected.disabled = true;
    noneSelected.selected = true;
    selectEl.appendChild(noneSelected);
    for (let i = 0; i < options.length; i ++) { // each dropdown should include every
        let optionEl = document.createElement("option");
        optionEl.setAttribute("value", customCards[i].role);
        optionEl.innerText = customCards[i].role;
        selectEl.appendChild(optionEl);
    }
}

function constructCompactDeckBuilderElement(card, deckManager) {
    const cardContainer = document.createElement("div");

    cardContainer.setAttribute("class", "compact-card");

    cardContainer.setAttribute("id", "card-" + card.role);
    cardContainer.setAttribute("id", "card-" + card.role);

    cardContainer.innerHTML =
        "<div class='compact-card-left'>" +
        "<p>-</p>" +
        "</div>" +
        "<div class='compact-card-header'>" +
        "<p class='card-role'>" + card.role + "</p>" +
        "<div class='card-quantity'>0</div>" +
        "</div>" +
        "<div class='compact-card-right'>" +
        "<p>+</p>" +
        "</div>";

    cardContainer.querySelector('.compact-card-right').addEventListener('click', () => {
        deckManager.addCopyOfCard(card.role);
        cardContainer.querySelector('.card-quantity').innerText = deckManager.getCard(card.role).quantity;
        document.querySelector('label[for="deck"]').innerText = 'Game Deck: ' + deckManager.getDeckSize() + ' Players';
    });
    cardContainer.querySelector('.compact-card-left').addEventListener('click', () => {
        deckManager.removeCopyOfCard(card.role);
        cardContainer.querySelector('.card-quantity').innerText = deckManager.getCard(card.role).quantity;
        document.querySelector('label[for="deck"]').innerText = 'Game Deck: ' + deckManager.getDeckSize() + ' Players';
    });
    return cardContainer;
}
