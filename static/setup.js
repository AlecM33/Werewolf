import {cards} from './cards.js'

// important declarations
class Card {
    constructor(role, team, description, powerRole) {
        this.role = role;
        this.team = team;
        this.description = description;
        this.quantity = 0;
        this.powerRole = powerRole;
    }
}

var deck = [];


// register event listeners on buttons
document.getElementById("reset-btn").addEventListener("click", resetCardQuantities);
document.getElementById("create-btn").addEventListener("click", generateAccessCode);

// render all of the available cards to the user
window.onload = function() {
    for (const card of cards) {
        const newCard = new Card(card.role, card.team, card.description, card.powerRole);
        const cardContainer = document.createElement("div");

        deck.push(newCard);

        cardContainer.setAttribute("class", "card");
        cardContainer.innerHTML = "<p class='card-role'>" + newCard.role + "</p><br><p class='card-quantity'>" + newCard.quantity + "</p>";

        cardContainer.addEventListener("click", function() {
            if(!newCard.powerRole || (newCard.powerRole && newCard.quantity === 0)) {
                newCard.quantity += 1;
            }
            console.log(newCard);
            cardContainer.getElementsByClassName("card-quantity")[0].innerHTML = newCard.quantity;
            updateGameSize();
        });

        document.getElementById("card-select").appendChild(cardContainer)
    }
};

function updateGameSize() {
    let totalQuantity = 0;
    for (let card of deck) {
        totalQuantity += card.quantity;
    }
    document.getElementById("game-size").innerText = totalQuantity + " Players";
}

function resetCardQuantities() {
    for (let card of deck) {
        card.quantity = 0;
    }
    updateGameSize();
    Array.prototype.filter.call(document.getElementsByClassName("card-quantity"), function(quantities){
        return quantities.innerHTML = 0;
    });
}

function generateAccessCode() {
    let code = "";
    let charPool = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 6; i++) {
        code += charPool[getRandomInt(61)]
    }
    console.log("Access Code: " + code);
    return code;
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
