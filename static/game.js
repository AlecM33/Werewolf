import {utility} from './util.js'

const socket = io();
let clock;
let currentGame = null;
let cardFlippedOver = false;
let cardDealt = false;

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
    if (currentGame.time) {
        renderClock();
    }
    const player = currentGame.players.find((player) => player.id === sessionStorage.getItem("id"));
    const card = player.card;

    // render the players card
    document.getElementById("lobby-container").setAttribute("class", "hidden");
    document.getElementById("launch").setAttribute("class", "hidden");
    document.getElementById("game-container").setAttribute("class", "game-container");
    document.getElementById("game-container").innerHTML =
        "<div class='game-header'>" +
            "<div id='players-remaining'>" + getLiveCount() + "/" + currentGame.size + " alive</div>" +
            "<div id='clock'></div>" +
        "</div>" +
        "<div id='game-card'>" +
            "<div class='game-card-inner'>" +
                "<div class='game-card-front'>" +
                    "<h2>" + card.role + "</h2>" +
                    "<p>" + card.description + "</p>" +
                    "<p id='flip-instruction'>Click to flip</p>" +
                "</div>" +
                "<div class='game-card-back'></div>" +
            "</div>" +
        "</div>";

    // initially flip the card over for a reveal, allow it to be flipped on click/tap
    if (!cardDealt) {
        flipCard();
        cardDealt = true;
    }
    document.getElementById("game-card").addEventListener("click", flipCard);

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

function flipCard() {
    cardFlippedOver ?
        document.getElementById("game-card").setAttribute("class", "flip-down")
        : document.getElementById("game-card").setAttribute("class", "flip-up");
    cardFlippedOver = !cardFlippedOver;
}

function renderClock() {
    clock = setInterval(function() {
        const now = new Date().getTime();
        const end = new Date(currentGame.endTime);
        const delta = end - now;
        if (delta <= 0) {
            clearInterval(clock);
            endGame(true);
        } else {
            let minutes = Math.floor((delta % (1000 * 60 * 60)) / (1000 * 60));
            let seconds = Math.floor((delta % (1000 * 60)) / 1000);
            seconds = seconds < 10 ? "0" + seconds : seconds;
            document.getElementById("clock").innerText = minutes + ":" + seconds;
        }
    }, 1000);
}

function endGame(timeExpired) {
    if (timeExpired) {
        console.log("expired");
    }
}

function killPlayer() {
    socket.emit("killPlayer", currentGame.players.find((player) => player.id === sessionStorage.getItem("id")).id, currentGame.accessCode);
}

function renderLobby() {
    // Render lobby header
    if (document.getElementsByClassName("lobby-player").length === 0) {
        let header = document.createElement("h2");
        header.setAttribute("class", "app-header-secondary");
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
        if (currentGame.players.length === currentGame.size) {
            document.getElementById("launch").innerHTML = "<button class='app-btn'>Start Game</button>";
            document.getElementById("launch").addEventListener("click", launchGame);
        } else {
            document.getElementById("launch").innerHTML = "<button class='app-btn disabled'>Start Game</button>";
        }
    } else {
        document.getElementById("launch").innerHTML = "<p>The host will start the game.</p>"
    }
}

// request the current state of the game from the server
window.onload = function() {
    socket.emit('requestState', {code: sessionStorage.getItem("code")});
};
