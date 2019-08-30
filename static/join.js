const socket = io();

document.getElementById("join-btn").addEventListener("click", function() {
    sessionStorage.setItem("code", document.getElementById("code").value)
    const playerInfo = {name: document.getElementById("name").value, code: document.getElementById("code").value};
    socket.emit('joinGame', playerInfo);
    window.location.replace('/' + document.getElementById("code").value);
})
