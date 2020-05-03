const socket = io();
import { utility } from './util.js'

// respond to the game state received from the server
socket.on('joinError', function(message) {
    document.getElementById("join-btn").classList.remove('disabled');
    document.getElementById("code").classList.add("error");
    document.getElementById("join-error").innerText = message;
});

// respond to the game state received from the server
socket.on('success', function() {
    document.getElementById("join-btn").classList.remove('disabled');
    if (document.getElementById("code").classList.contains("error")) {
        document.getElementById("code").classList.remove("error");
        document.getElementById("join-error").innerText = "";
    }
    // If a player was a host of a previous game, don't make them the host of this one
    if (sessionStorage.getItem("host")) {
        sessionStorage.removeItem("host");
    }
    window.location.replace('/' + document.getElementById("code").value.toString().trim().toLowerCase());
});

document.getElementById("join-btn").addEventListener("click", function() {
    document.getElementById("join-btn").classList.add('disabled');
    if (document.getElementById("name").value.length > 0) {
        const code = document.getElementById("code").value.toString().trim().toLowerCase();
        if (document.getElementById("name").classList.contains("error")) {
            document.getElementById("name").classList.remove("error");
            document.getElementById("name-error").innerText = "";
        }
        sessionStorage.setItem("code", code);
        let playerId = utility.generateID();
        sessionStorage.setItem("id", playerId);
        const playerInfo = {name: document.getElementById("name").value, id: playerId, code: code};
        socket.emit('joinGame', playerInfo);
    } else {
        document.getElementById("join-btn").classList.remove('disabled');
        document.getElementById("name").classList.add("error");
        document.getElementById("name-error").innerText = "Name is required.";
    }

});

