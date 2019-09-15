import {utility} from './util.js'

const socket = io();

const finishedArtArray = ["Villager", "Werewolf", "Seer", "Shadow", "Hunter", "Mason", "Minion", "Sorcerer"];
let clock;
let currentGame = null;
let cardFlippedOver = false;
let cardRendered = false;

// respond to the game state received from the server
socket.on('state', function(game) {
    currentGame = game;
    if (game.message) {
        document.getElementById("message-box").innerText = game.message;
    }
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
        case "ended":
            renderEndSplash();
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

function renderEndSplash() {
    document.getElementById("game-container").classList.add("hidden");
    document.getElementById("message-box").classList.add("hidden");
    currentGame.winningTeam === "village"
    ? document.getElementById("end-container").innerHTML ="<div class='winner-header'><p class='winner-village'>Village</p> wins!</div>"
    : document.getElementById("end-container").innerHTML ="<div class='winner-header'><p class='winner-wolf'>Wolves</p>win!</div>";
    const wolfContainer = document.createElement("div");
    wolfContainer.setAttribute("id", "wolves");
    let wolfContent = "<div class='evil-header'><span>The</span><p class='evil-subheader'>evil</p> <span>players were:</span></div>";
    for (const player of currentGame.players) {
        if (player.card.team === "evil") {
            wolfContent += "<div class='evil-list-item'>" + player.name + ": " + player.card.role + "</div>"
        }
    }
    wolfContent += "<a href='/'><button class='app-btn'>Home</button></a>";
    wolfContainer.innerHTML = wolfContent;
    document.getElementById("end-container").appendChild(wolfContainer);

}

function renderGame() {
    const player = currentGame.players.find((player) => player.id === sessionStorage.getItem("id"));

    // render the header
    document.getElementById("lobby-container").setAttribute("class", "hidden");
    document.getElementById("launch").setAttribute("class", "hidden");
    document.getElementById("game-container").setAttribute("class", "game-container");
    const gameHeader = document.createElement("div");
    gameHeader.setAttribute("id", "game-header");
    gameHeader.innerHTML =
            "<div id='players-remaining'>" + getLiveCount() + "/" + currentGame.size + " alive</div>" +
            "<div id='clock'></div>" +
            "<div id='pause-container'></div>";
    if (document.getElementById("game-header")) {
        document.getElementById("game-container").removeChild(document.getElementById("game-header"));
    }
    document.getElementById("game-container").prepend(gameHeader);

    // render the card if it hasn't been yet
    if (!cardRendered) {
        renderPlayerCard(player);
        cardRendered = true;
    }

    // build the clock
    if (currentGame.time) {
        renderClock();
        document.getElementById("pause-container").innerHTML = currentGame.paused ?
            "<img alt='pause' src='../assets/images/play-button.svg' id='play-pause'/>"
            : "<img alt='pause' src='../assets/images/pause-button.svg' id='play-pause'/>";
        document.getElementById("play-pause").addEventListener("click", pauseOrResumeGame)
    }

    // add the "I'm dead" button
    let killedBtn = document.createElement("button");
    killedBtn.setAttribute("id", "dead-btn");

    if (player.dead) {
        killedBtn.setAttribute("class", "app-btn killed-btn disabled");
        killedBtn.innerText = "Killed"
    } else {
        killedBtn.setAttribute("class", "app-btn killed-btn");
        killedBtn.innerText = "I'm dead";
    }
    if (document.getElementById("dead-btn")) {
        document.getElementById("game-container").removeChild(document.getElementById("dead-btn"));
    }
    document.getElementById("game-container").appendChild(killedBtn);
    document.getElementById("dead-btn").addEventListener("click", killPlayer);
}

function renderPlayerCard(player) {
    const card = player.card;
    const cardArt = finishedArtArray.includes(card.role) ?
        "<img alt='" + card.role + "' src='../assets/images/roles/" + card.role + ".png' />"
        : "<div class='placeholder'>Art coming soon.</div>";
    const cardClass = player.card.team === "good" ? "game-card-inner village" : "game-card-inner wolf";
    const playerCard = document.createElement("div");
    playerCard.setAttribute("id", "game-card");
    playerCard.setAttribute("class", getFlipState());
    playerCard.innerHTML =
        "<div class='" + cardClass + "'>" +
            "<div class='game-card-front'>" +
                "<h2>" + card.role + "</h2>" +
                cardArt +
                "<div>" +
                    "<p>" + card.description + "</p>" +
                    "<p id='flip-instruction'>Click to flip</p>" +
                "</div>" +
            "</div>" +
            "<div class='game-card-back'></div>" +
        "</div>";
    document.getElementById("game-container").appendChild(playerCard);
    document.getElementById("game-card").addEventListener("click", flipCard);
}

function pauseOrResumeGame() {
    if (currentGame.paused) {
        socket.emit('resumeGame', currentGame.accessCode);
    } else {
        socket.emit('pauseGame', currentGame.accessCode);
    }
}

function getFlipState() {
    return cardFlippedOver ? "flip-down" : "flip-up";
}

function flipCard() {
    cardFlippedOver
        ? flipUp()
        : flipDown();

    cardFlippedOver = !cardFlippedOver;
}

function flipUp(){
    const card = document.getElementById("game-card");
    card.classList.add("flip-up");
    card.classList.remove("flip-down");
}

function flipDown(){
    const card = document.getElementById("game-card");
    card.classList.add("flip-down");
    card.classList.remove("flip-up");
}

function renderClock() {
    clock = setInterval(function() {
        const start = currentGame.paused ? new Date(currentGame.pauseTime) : new Date();
        const end = new Date(currentGame.endTime);
        const delta = end - start;
        if (currentGame.paused) {
            clearInterval(clock);
        }
        if (delta <= 0) {
            endGameDueToTimeExpired();
        } else {
            let minutes = Math.floor((delta % (1000 * 60 * 60)) / (1000 * 60));
            let seconds = Math.floor((delta % (1000 * 60)) / 1000);
            seconds = seconds < 10 ? "0" + seconds : seconds;
            document.getElementById("clock").innerText = minutes + ":" + seconds;
        }
    }, 1000);
}

function endGameDueToTimeExpired() {
    clearInterval(clock);
    socket.emit("timerExpired", currentGame.accessCode);
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
