// Dependencies
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const app = express();
const server = http.Server(app);
const io = socketIO(server);

app.set('port', 5000);
app.use('/static', express.static(__dirname + '/static')); // Routing
app.get('/', function(request, response) {
    response.sendFile(__dirname + '/index.html');
});

app.get('/create', function(request, response) {
    response.sendFile(__dirname + '/create_game.html');
})

// Starts the server.
server.listen(5000, function() {
    console.log('Starting server on port 5000');
});

// Add the WebSocket handlers
io.on('connection', function(socket) {
    console.log('Client connected.');
    socket.emit('message', 'hi!');
});
