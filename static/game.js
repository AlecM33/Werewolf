const socket = io();
socket.on('message', function(data) {
    console.log(data);
});
