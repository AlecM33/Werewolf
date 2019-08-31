const socket = io();
var currentGame = null;

// respond to the game state received from the server
socket.on('state', function(game) {
    currentGame = game;
    console.log(game);
    buildGameBasedOnState();
});

function buildGameBasedOnState() {
    switch(currentGame.state) {
        case "lobby":
            renderLobby();
    }
}

function renderLobby() {
    if (document.getElementsByClassName("lobby-player").length === 0) {
        let header = document.createElement("h2");
        header.setAttribute("class", "app-header");
        header.innerText = "Lobby";
        document.getElementById("lobby-container").appendChild(header);
        let subHeader = document.createElement("div");
        subHeader.setAttribute("id", "lobby-subheader");
        subHeader.innerHTML = "<div>" +
            "<span id='join-count'>" + Object.keys(currentGame.players).length + "</span>" +
            "<span id='deck-size'>/" + currentGame.size + " Players</span>" +
            "</div>" +
            "<br>" +
            "<div id='game-code'>Access Code: " + currentGame.accessCode + "</div>";
        document.getElementById("lobby-container").appendChild(subHeader);
    }
    let i = 1;
    for (let key in currentGame.players) {
        if(!document.getElementById("player-" + i)) {
            const playerContainer = document.createElement("div");
            currentGame.players[key].id === sessionStorage.getItem("id") ?
                playerContainer.setAttribute("class", "lobby-player highlighted")
                : playerContainer.setAttribute("class", "lobby-player");
            playerContainer.setAttribute("id", "player-" + i);
            playerContainer.innerHTML = "<p>" + currentGame.players[key].name + "</p>";
            document.getElementById("lobby-container").appendChild(playerContainer);
            document.getElementById("join-count").innerText = Object.keys(currentGame.players).length.toString();
        }
        i ++;
    }
    // display the launch button if the player is the host
    if (sessionStorage.getItem("host")) {
        Object.keys(currentGame.players).length === currentGame.size ?
            document.getElementById("launch-btn").innerHTML = "<button class='app-btn'>Start Game</button>"
            : document.getElementById("launch-btn").innerHTML = "<button class='app-btn disabled'>Start Game</button>"
    }
}

// request the current state of the game from the server
window.onload = function() {
    socket.emit('requestState', {code: sessionStorage.getItem("code")});
}
