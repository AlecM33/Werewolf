// Dependencies
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const app = express();
const server = http.Server(app);
const io = socketIO(server);

var activeGames = {};

app.set('port', 5000);
app.use('/static', express.static(__dirname + '/static')); // Routing
app.use('/assets', express.static(__dirname + '/assets')); // Routing
app.get('/', function(request, response) {
    response.sendFile(__dirname + '/index.html');
});

app.get('/create', function(request, response) {
    response.sendFile(__dirname + '/create_game.html');
});

app.get('/join', function(request, response) {
    response.sendFile(__dirname + '/join_game.html');
});

app.get('/:code', function(request, response) {
    response.sendFile(__dirname + '/game.html');
});

// Starts the server.
server.listen(5000, function() {
    console.log('Starting server on port 5000');
});

// Add the WebSocket handlers
io.on('connection', function(socket) {
    socket.on('newGame', function(game) {
        activeGames[game.accessCode] = game;
    });
    socket.on('joinGame', function(playerInfo) {
        activeGames[Object.keys(activeGames).find((key) => key === playerInfo.code)].players[socket.id] = playerInfo.name;
        console.log("Player " + playerInfo.name + " has joined the game");
    });
    socket.on('requestState', function(data) {
        console.log(data);
        console.log(activeGames[Object.keys(activeGames).find((key) => key === data.code)]);
        socket.emit('state', activeGames[Object.keys(activeGames).find((key) => key === data.code)]);
    });
});

