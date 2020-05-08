// Dependencies
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const app = express();
const server = http.Server(app);
const io = socketIO(server);
const ServerHelper = require('./server-helper.js');
const secure = require('express-force-https');
app.use(secure);

// Link websocket interaction functions, separated to aid testing
const CronJob = require('cron').CronJob;
const serverHelper = new ServerHelper(CronJob);

const debugMode = Array.from(process.argv.map( (arg)=>arg.trim().toLowerCase() )).includes("debug");
const LOGGER = require("./javascript/modules/logger")(debugMode);

app.set('port', 5000);

app.use('/javascript', express.static(__dirname + '/javascript')); // Routing
app.use('/assets', express.static(__dirname + '/assets')); // Routing
app.use('/stylesheets', express.static(__dirname + '/stylesheets')); // Routing
app.use('/node_modules/socket.io-client', express.static(__dirname + '/node_modules/socket.io-client')); // Routing
app.get('', function(request, response) {
    response.sendFile(__dirname + '/views/index.html');
});

app.get('/learn', function(request, response) {
    response.sendFile(__dirname + '/views/learn.html');
});

app.get('/faq', function(request, response) {
    response.sendFile(__dirname + '/views/faq.html');
});

app.get('/create', function(request, response) {
    response.sendFile(__dirname + '/views/create_game.html');
});

app.get('/join', function(request, response) {
    response.sendFile(__dirname + '/views/join_game.html');
});

app.get('/:code', function(request, response) {
    response.sendFile(__dirname + '/views/game.html');
});

// Starts the server.
server.listen(process.env.PORT || 5000, function() {
    console.log('Starting server on port 5000');
});

// Add the WebSocket handlers
io.on('connection', function(socket) {
    socket.on('newGame', function(game, onSuccess) {
        serverHelper.newGame(game, onSuccess);
    });
    socket.on('joinGame', function(playerInfo) {
        serverHelper.joinGame(playerInfo, socket);
    });
    // send the game state to the client that requested it
    socket.on('requestState', function(data) {
        serverHelper.requestState(data, socket);
    });
    socket.on('startGame', function(gameData) {
        serverHelper.startGame(gameData);
    });
    socket.on('pauseGame', function(code) {
        serverHelper.pauseGame(code);
    });
    socket.on('resumeGame', function(code) {
        serverHelper.resumeGame(code);
    });
    socket.on('killPlayer', function(id, code) {
        serverHelper.killPlayer(id, code);
    });
});

