import {utility} from './util.js'

const socket = io();
var currentGame = null;

document.getElementById("launch").addEventListener("click", launchGame);

// respond to the game state received from the server
socket.on('state', function(game) {
    currentGame = game;
    if (game.message) {
        document.getElementById("message-box").innerText = game.message;
    }
    console.log(currentGame);
    buildGameBasedOnState();
});

function buildGameBasedOnState() {
    switch(currentGame.state) {
        case "lobby":
            renderLobby();
            break;
        case "started":
            renderGame();
            break;
        default:
            break;
    }
}

function launchGame() {
    randomlyDealCardsToPlayers();
    socket.emit('startGame', { players: currentGame.players , code: currentGame.accessCode});
}

function randomlyDealCardsToPlayers() {
    for (let player of currentGame.players) {
        player.card = drawRandomCard();
    }
}

function drawRandomCard() {
    return currentGame.deck.splice(utility.getRandomInt(currentGame.deck.length) - 1, 1)[0];
}

function getLiveCount() {
    let liveCount = 0;
    for (let player of currentGame.players) {
        if (!player.dead) {
            liveCount ++;
        }
    }
    return liveCount;
}

function renderGame() {
    const player = currentGame.players.find((player) => player.id === sessionStorage.getItem("id"));
    const card = player.card;

    // render the players card
    document.getElementById("lobby-container").setAttribute("class", "hidden");
    document.getElementById("launch").setAttribute("class", "hidden");
    document.getElementById("game-container").setAttribute("class", "game-container");
    document.getElementById("game-container").innerHTML =
        "<div id='players-remaining'>" + getLiveCount() + "/" + currentGame.size + " Players alive</div>" +
        "<div class='game-card'>" +
            "<div class='game-card-inner'" +
                "<div class='game-card-front'>" +
                    "<h2>" + card.role + "</h2>" +
                    "<p>" + card.description + "</p>" +
                "</div>" +
                "<div class='game-card-back'></div>" +
            "</div>" +
        "</div>";
    let killedBtn = document.createElement("button");
    killedBtn.setAttribute("id", "dead-btn");

    // render the "I'm dead" button based on the player's state
    if (player.dead) {
        killedBtn.setAttribute("class", "app-btn-secondary killed-btn disabled");
        killedBtn.innerText = "Killed"
    } else {
        killedBtn.setAttribute("class", "app-btn-secondary killed-btn");
        killedBtn.innerText = "I'm dead";
    }
    document.getElementById("game-container").appendChild(killedBtn);
    document.getElementById("dead-btn").addEventListener("click", killPlayer);
}

function killPlayer() {
    socket.emit("killPlayer", currentGame.players.find((player) => player.id === sessionStorage.getItem("id")).id, currentGame.accessCode);
}

function renderLobby() {
    // Render lobby header
    if (document.getElementsByClassName("lobby-player").length === 0) {
        let header = document.createElement("h2");
        header.setAttribute("class", "app-header");
        header.innerText = "Lobby";
        document.getElementById("lobby-container").appendChild(header);
        let subHeader = document.createElement("div");
        subHeader.setAttribute("id", "lobby-subheader");
        subHeader.innerHTML = "<div>" +
            "<span id='join-count'>" + currentGame.players.length + "</span>" +
            "<span id='deck-size'>/" + currentGame.size + " Players</span>" +
            "</div>" +
            "<br>" +
            "<div id='game-code'>Access Code: " + currentGame.accessCode + "</div>";
        document.getElementById("lobby-container").appendChild(subHeader);
    }
    // Render all players that are new
    let i = 1;
    for (let player of currentGame.players) {
        if(!document.getElementById("player-" + i)) {
            const playerContainer = document.createElement("div");
            player.id === sessionStorage.getItem("id") ?
                playerContainer.setAttribute("class", "lobby-player highlighted")
                : playerContainer.setAttribute("class", "lobby-player");
            playerContainer.setAttribute("id", "player-" + i);
            playerContainer.innerHTML = "<p>" + player.name + "</p>";
            document.getElementById("lobby-container").appendChild(playerContainer);
            document.getElementById("join-count").innerText = currentGame.players.length.toString();
        }
        i ++;
    }
    // display the launch button if the player is the host
    if (sessionStorage.getItem("host")) {
        currentGame.players.length === currentGame.size ?
            document.getElementById("launch").innerHTML = "<button class='app-btn'>Start Game</button>"
            : document.getElementById("launch").innerHTML = "<button class='app-btn disabled'>Start Game</button>"
    } else {
        document.getElementById("launch").innerHTML = "<p>The host will start the game.</p>"
    }
}

// request the current state of the game from the server
window.onload = function() {
    socket.emit('requestState', {code: sessionStorage.getItem("code")});
};
