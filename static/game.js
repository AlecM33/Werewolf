const socket = io();
var currentGame = null
socket.on('state', function(game) {
    currentGame = game;
    console.log(currentGame);
});

window.onload = function() {
    socket.emit('requestState', {code: sessionStorage.getItem("code")});
}
