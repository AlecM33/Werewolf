import {utility} from './util.js'

const socket = io();

const standardRoles = ["Villager", "Werewolf", "Seer", "Shadow", "Hunter", "Mason", "Minion", "Sorcerer", "Dream Wolf"];
let clock;
let currentGame = null;
let lastGameState = null;
let cardFlippedOver = false;
let cardRendered = false;
let lastKilled = null;

// respond to the game state received from the server
socket.on('state', function(game) {
    currentGame = game;
    if(detectChanges(game)) {
        buildGameBasedOnState(game);
    }
});

function buildGameBasedOnState(game) {
    switch(game.status) {
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

function detectChanges(game) {
    if (lastGameState === null ||
        lastGameState.status !== game.status ||
        lastGameState.paused !== game.paused ||
        lastGameState.lastKilled !== game.lastKilled ||
        lastGameState.startTime !== game.startTime ||
        lastGameState.players.length !== game.players.length) {
        lastGameState = game;
        return true;
    }
        return false;
}

function hideAfterExit(e) {
    e.target.style.display = 'none';
    e.target.classList.remove(e.target.exitClass);
}

function triggerExitAnimation(e) {
    e.target.classList.remove(e.target.entranceClass);
    e.target.classList.remove(e.target.exitClass);
    e.target.offsetWidth;
    e.target.classList.add(e.target.exitClass);
    window.setTimeout(()=>{
        e.target.addEventListener('animationend', hideAfterExit, true);
    },0);
}

function triggerEntranceAnimation(selector, entranceClass, exitClass, image) {
        let transitionEl = document.querySelector(selector);
        transitionEl.style.display = 'flex';
        transitionEl.addEventListener('animationend', triggerExitAnimation, true);
        transitionEl.classList.remove(entranceClass);
        transitionEl.entranceClass = entranceClass;
        transitionEl.exitClass = exitClass;
        transitionEl.offsetWidth;
        if (currentGame.reveals) {
            if (image && standardRoles.includes(currentGame.killedRole)) {
                transitionEl.classList.remove("killed-role-custom");
                transitionEl.setAttribute("src", "../assets/images/roles/" + currentGame.killedRole.replace(/\s/g, '') + ".png");
            } else {
                if (image) {
                    transitionEl.setAttribute("src", "../assets/images/custom.svg");
                    transitionEl.setAttribute("class", "killed-role-custom");
                }
            }
        } else {
            transitionEl.setAttribute("src", "../assets/images/question_mark.svg");
            transitionEl.setAttribute("class", "killed-role-hidden");
        }
        transitionEl.classList.add(entranceClass);
}

function playKilledAnimation() {
    triggerEntranceAnimation('#overlay', 'animate-overlay-in', 'animate-overlay-out', false);
    triggerEntranceAnimation('#killed-role', 'animate-role-in', 'animate-role-out', true);
    triggerEntranceAnimation('#killed-name', 'animate-name-in', 'animate-name-out', false);
}

function launchGame() {
    randomlyDealCardsToPlayers();
    utility.shuffle(currentGame.players); // put the players in a random order
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
    clearInterval(clock);
    document.getElementById("game-container").remove();
    document.querySelector("#message-box").style.display = 'none';
    currentGame.winningTeam === "village"
    ? document.getElementById("end-container").innerHTML ="<div class='winner-header'><p class='winner-village'>Village</p> wins!</div>"
    : document.getElementById("end-container").innerHTML ="<div class='winner-header'><p class='winner-wolf'>Wolves</p>win!</div>";
    const rosterContainer = document.createElement("div");
    rosterContainer.setAttribute("id", "roster");
    document.getElementById("end-container").innerHTML += "<div class='roster-header'>Here's what everyone was:</div>";
    let rosterContent = "";
    for (const player of currentGame.players) {
        rosterContent += "<div class='roster-list-item'>";
        rosterContent += standardRoles.includes(player.card.role)
                         ? "<img alt='' src='/assets/images/roles-small/" + player.card.role.replace(/\s/g, '') + ".png' />"
                         : "<img alt='' class='card-image-custom' src='/assets/images/custom.svg' />";
        rosterContent += player.name + ": " + player.card.role + "</div>"
    }
    rosterContainer.innerHTML = rosterContent;
    document.getElementById("end-container").appendChild(rosterContainer);
    document.getElementById("end-container").innerHTML += "<a href='/'><button class='app-btn'>Home</button></a>";

}

function renderGame() {
    // remove lobby components if present
    if (document.getElementById("lobby-container") !== null && document.getElementById("launch") !== null) {
        document.getElementById("lobby-container").remove();
        document.getElementById("launch").remove();
    }

    document.querySelector("#message-box").style.display = 'block';
    if (currentGame.killedRole && currentGame.lastKilled !== lastKilled) { // a new player has been killed
        lastKilled = currentGame.lastKilled;
        document.getElementById("killed-name").innerText = currentGame.reveals
        ? currentGame.killedPlayer + " was a " + currentGame.killedRole + "!"
        : currentGame.killedPlayer + " has died!";
        playKilledAnimation();
        document.getElementById("message-box").innerText = currentGame.message;
    }
    const player = currentGame.players.find((player) => player.id === sessionStorage.getItem("id"));

    // render the header
    document.getElementById("game-container").setAttribute("class", "game-container");
    const gameHeader = document.createElement("div");
    gameHeader.setAttribute("id", "game-header");
    gameHeader.innerHTML =
            "<div id='players-remaining'>" + getLiveCount() + "/" + currentGame.size + " alive</div>" +
            "<div id='clock'></div>" +
            "<div id='pause-container'></div>";
    if (document.getElementById("game-header")) {
        document.getElementById("card-container").removeChild(document.getElementById("game-header"));
    }
    document.getElementById("card-container").prepend(gameHeader);

    // render the card if it hasn't been yet
    if (!cardRendered) {
        renderPlayerCard(player);
        cardRendered = true;
    }

    // build the clock
    if (currentGame.time) {
        updateClock();
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
        document.getElementById("card-container").removeChild(document.getElementById("dead-btn"));
    }
    document.getElementById("card-container").appendChild(killedBtn);
    document.getElementById("dead-btn").addEventListener("click", killPlayer);

    // add the list of dead/alive players
    renderDeadAndAliveInformation();
}

function renderDeadAndAliveInformation() {
    // TODO: Refactor this function.
    currentGame.players = currentGame.players.sort((a, b) =>
    {
        return a.card.role > b.card.role ? 1 : -1;
    });
    let infoContainer = document.getElementById("info-container");
    let alivePlayers = currentGame.players.filter((player) => !player.dead);
    let deadPlayers = currentGame.players.filter((player) => player.dead);
    deadPlayers.sort((a, b) => { // sort players by the time they died
        return new Date(a.deadAt) > new Date(b.deadAt) ? -1 : 1;
    });

    let killedContainer = document.createElement("div");
    killedContainer.setAttribute("id", "killed-container");
    let killedHeader = document.createElement("h2");
    killedHeader.innerText = "Killed Players";
    killedContainer.appendChild(killedHeader);

    addDeadPlayers(deadPlayers, killedContainer);

    let aliveContainer = document.createElement("div");
    aliveContainer.setAttribute("id", "alive-container");
    let aliveHeader = document.createElement("h2");
    aliveContainer.appendChild(aliveHeader);
    aliveHeader.innerText = currentGame.reveals
        ? "Roles Still Alive"
        : "Roles in the Game";
    var rollCounter = {}; // RTM

    if (currentGame.reveals) {
        addAlivePlayers(alivePlayers, aliveContainer, rollCounter);
    } else {
        addAlivePlayers(currentGame.players, aliveContainer, rollCounter);
    }

    if (infoContainer === null) {
        infoContainer = document.createElement("div");
        infoContainer.setAttribute("id", "info-container");
        infoContainer.appendChild(killedContainer);
        infoContainer.appendChild(aliveContainer);
        document.getElementById("game-container").appendChild(infoContainer);
        // Has to be done AFTER the infoContainer is rendered in the DOM to insert the updated counts
        for (let x of document.getElementsByClassName("alive-player")) {
            x.getElementsByClassName("rolecount")[0].innerText = rollCounter[x.getElementsByTagName("p")[0].innerText];
        }
    } else {
        document.getElementById("killed-container").remove();
        document.getElementById("alive-container").remove();
        document.getElementById("info-container").append(killedContainer);
        document.getElementById("info-container").append(aliveContainer);
        // Has to be done AFTER the infoContainer is rendered in the DOM to insert the updated counts
        for (let x of document.getElementsByClassName("alive-player")) {
            x.getElementsByClassName("rolecount")[0].innerText = rollCounter[x.getElementsByTagName("p")[0].innerText];
        }
    }
}

function addDeadPlayers(deadPlayers, killedContainer) {
    deadPlayers.forEach((player) => {
        let deadPlayerClass = player.card.team === "good" ? "dead-player-village" : "dead-player-evil";
        if (player.card.isTypeOfWerewolf) {
            deadPlayerClass += " dead-player-wolf";
        }
        const killedPlayer = document.createElement("div");
        if (currentGame.reveals) {
            killedPlayer.setAttribute("class", "killed-player " + deadPlayerClass);
        } else {
            killedPlayer.setAttribute("class", "killed-player dead-player-no-reveals");
        }
        killedPlayer.innerText = currentGame.reveals
            ? player.name + ": " + player.card.role
            : player.name;
        killedContainer.appendChild(killedPlayer);
    });
}

function addAlivePlayers(alivePlayers, aliveContainer, rollCounter) {
    alivePlayers.forEach((player) => {
        let alivePlayerClass = player.card.team === "good" ? "alive-player-village" : "alive-player-evil";
        if (player.card.isTypeOfWerewolf) {
            alivePlayerClass += " alive-player-wolf";
        }
        //RTM
        if (rollCounter.hasOwnProperty(player.card.role)) {
            rollCounter[player.card.role] += 1;
        } else {
            rollCounter[player.card.role] = 1;
            //RTM
            const alivePlayer = document.createElement("div");
            alivePlayer.setAttribute("class", "alive-player " + alivePlayerClass);
            alivePlayer.innerHTML = "<p>" + player.card.role + "</p><img src='../assets/images/info.svg'/>";
            let roleCount = document.createElement("span"); // RTM
            roleCount.setAttribute("class", "rolecount");
            //Add hidden description span - RTM 4/18/2020
            let playerCardInfo=document.createElement("span");
            playerCardInfo.setAttribute("class","tooltiptext");
            playerCardInfo.innerText=player.card.description;
            alivePlayer.prepend(roleCount);
            alivePlayer.appendChild(playerCardInfo);
            aliveContainer.appendChild(alivePlayer);
        }
    });
}

function renderPlayerCard(player) {
    const card = player.card;
    const cardArt = standardRoles.includes(card.role) ?
        "<img alt='" + card.role + "' src='../assets/images/roles/" + card.role.replace(/\s/g, '') + ".png' />"
        : "<div class='placeholder'>Custom Role</div>";
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
    document.getElementById("card-container").appendChild(playerCard);
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

function displayTime() {
    const start = currentGame.paused ? new Date(currentGame.pauseTime) : new Date();
    const end = new Date(currentGame.endTime);
    const delta = end - start;
    let seconds = Math.floor((delta / 1000) % 60);
    let minutes = Math.floor((delta / 1000 / 60) % 60);
    let hours = Math.floor((delta / (1000 * 60 * 60)) % 24);

    seconds = seconds < 10 ? "0" + seconds : seconds;
    minutes = minutes < 10 ? "0" + minutes : minutes;

    document.getElementById("clock").innerText = hours > 0
        ? hours + ":" + minutes + ":" + seconds
        : minutes + ":" + seconds;
}

function updateClock() {
    clearInterval(clock);
    if (document.getElementById("clock") !== null) {
        displayTime();
        clock = setInterval(function() {
            displayTime();
        }, 1000);
    }
}

function killPlayer() {
    if(confirm("Are you sure you are dead?")) {
        socket.emit("killPlayer", currentGame.players.find((player) => player.id === sessionStorage.getItem("id")).id, currentGame.accessCode);
    }
}

function renderLobby() {
    document.querySelector("#message-box").style.display = 'none';
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

// request game state from server periodically
setInterval(function () {
    socket.emit('requestState', {code: sessionStorage.getItem("code")});
}, 200);
