import {cards} from './cards.js'
import {utility} from './util.js'

const socket = io();
var games = [];

// important declarations
class Card {
    constructor(role, team, description, powerRole) {
        this.id = null;
        this.role = role;
        this.team = team;
        this.description = description;
        this.quantity = 0;
        this.powerRole = powerRole;
    }
}

class Game {
    constructor(accessCode, size, deck, time) {
        this.accessCode = accessCode;
        this.size = size;
        this.deck = deck;
        this.time = time;
        this.players = [];
        this.state = "lobby";
    }
}

var fullDeck = [];
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

        fullDeck.push(newCard);

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
    for (let card of fullDeck) {
        gameSize += card.quantity;
    }
    document.getElementById("game-size").innerText = gameSize + " Players";
}

function resetCardQuantities() {
    for (let card of fullDeck) {
        card.quantity = 0;
    }
    updateGameSize();
    Array.prototype.filter.call(document.getElementsByClassName("card-quantity"), function(quantities){
        return quantities.innerHTML = 0;
    });
}

function buildDeckFromQuantities() {
    let playerDeck = [];
    for (const card of fullDeck) {
        for (let i = 0; i < card.quantity; i++) {
            let newCard = new Card(card.role, card.team, card.description, card.powerRole);
            newCard.id = utility.generateID();
            playerDeck.push(newCard);
        }
    }
    return playerDeck;
}

function createGame() {
    // generate 6 digit access code
    let code = "";
    let charPool = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 6; i++) {
        code += charPool[utility.getRandomInt(61)]
    }

    // generate unique player Id for session
    let id = utility.generateID();
    sessionStorage.setItem("id", id);

    // player who creates the game is the host
    sessionStorage.setItem("host", true);

    // send a new game to the server, and then join it
    const playerInfo = {name: document.getElementById("name").value, code: code, id: id};
    const game = new Game(
        code,
        gameSize,
        buildDeckFromQuantities(),
        document.getElementById("time").value
        );
    socket.emit('newGame', game, function(data) {
        console.log(data);
        socket.emit('joinGame', playerInfo);
        sessionStorage.setItem('code', code);
        window.location.replace('/' + code);
    });
}
