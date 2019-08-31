const socket = io();
import { utility } from './util.js'

document.getElementById("join-btn").addEventListener("click", function() {
    sessionStorage.setItem("code", document.getElementById("code").value);
    let playerId = utility.generateID();
    sessionStorage.setItem("id", playerId);
    const playerInfo = {name: document.getElementById("name").value, id: playerId, code: document.getElementById("code").value};
    socket.emit('joinGame', playerInfo);
    window.location.replace('/' + document.getElementById("code").value);
});

