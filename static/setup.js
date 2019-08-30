import {cards} from './cards.js'

const socket = io();
var games = [];

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

class Game {
    constructor(accessCode, size, deck, time, players) {
        this.accessCode = accessCode;
        this.size = size;
        this.deck = deck;
        this.time = time;
        this.players = players;
        this.state = "lobby";
    }
}

var deck = [];
var gameSize = 0;
var time = null;


// register event listeners on buttons
document.getElementById("reset-btn").addEventListener("click", resetCardQuantities);
document.getElementById("create-btn").addEventListener("click", createGame);

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
    gameSize = 0;
    for (let card of deck) {
        gameSize += card.quantity;
    }
    document.getElementById("game-size").innerText = gameSize + " Players";
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

function createGame() {
    let code = "";
    let charPool = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 6; i++) {
        code += charPool[getRandomInt(61)]
    }
    console.log(code);
    let id = socket.id
    const game = new Game(
        code,
        gameSize,
        deck,
        document.getElementById("time").value,
        { [socket.id]: document.getElementById("name").value }
        );
    socket.emit('newGame', game);
    sessionStorage.setItem('code', code);
    window.location.replace('/' + code);
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
