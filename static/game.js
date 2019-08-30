const socket = io();
var games = [];
socket.on('message', function(data) {
    console.log(data);
});
