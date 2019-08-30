const socket = io();
var currentGame = null

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
    }
    let i = 1;
    for (let key in currentGame.players) {
        if(!document.getElementById("player-" + i)) {
            const playerContainer = document.createElement("div");
            playerContainer.setAttribute("class", "lobby-player");
            playerContainer.setAttribute("id", "player-" + i)
            playerContainer.innerHTML = "<p>" + currentGame.players[key] + "</p>";
            document.getElementById("lobby-container").appendChild(playerContainer);
        }
        i ++;
    }
}

// request the current state of the game from the server
window.onload = function() {
    socket.emit('requestState', {code: sessionStorage.getItem("code")});
}
