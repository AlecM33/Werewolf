// Dependencies
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const app = express();
const server = http.Server(app);
const io = socketIO(server);

var activeGames = [];

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
    console.log('Client connected.');
    socket.on('newGame', function(game) {
        activeGames.push(game);
    });
    socket.on('joinGame', function(playerInfo) {
        activeGames[activeGames.findIndex((game) => game.accessCode === playerInfo.code)].players.push(playerInfo.name);
        console.log("Player " + playerInfo.name + " has joined the game");
    });
    console.log('games: ', activeGames);
});

