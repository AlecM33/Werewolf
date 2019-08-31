const socket = io();

document.getElementById("join-btn").addEventListener("click", function() {
    sessionStorage.setItem("code", document.getElementById("code").value);
    let playerId = generateID();
    sessionStorage.setItem("id", playerId);
    const playerInfo = {name: document.getElementById("name").value, id: playerId, code: document.getElementById("code").value};
    socket.emit('joinGame', playerInfo);
    window.location.replace('/' + document.getElementById("code").value);
});

function generateID() {
    let code = "";
    let charPool = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < 10; i++) {
        code += charPool[getRandomInt(61)]
    }
    return code;
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
