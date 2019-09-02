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
server.listen(process.env.PORT || 5000, function() {
    console.log('Starting server on port 5000');
});

// Add the WebSocket handlers
io.on('connection', function(socket) {
    socket.on('newGame', function(game, onSucess) {
        activeGames[game.accessCode] = game;
        onSucess();
    });
    socket.on('joinGame', function(playerInfo) {
        activeGames[Object.keys(activeGames).find((key) => key === playerInfo.code)].players.push({name: playerInfo.name, id: playerInfo.id});
    });
    socket.on('requestState', function(data) {
        if(Object.keys(socket.rooms).includes(data.code) === false) {
            console.log("new socket");
            socket.join(data.code, function() {
                console.log("request for state");
                io.to(data.code).emit('state', activeGames[Object.keys(activeGames).find((key) => key === data.code)]);
            });
        } else {
            console.log("old socket");
            io.to(data.code).emit('state', activeGames[Object.keys(activeGames).find((key) => key === data.code)]);
        }
    });
    socket.on('startGame', function(gameData) {
        let game = activeGames[Object.keys(activeGames).find((key) => key === gameData.code)];
        game.state = "started";
        game.players = gameData.players;
        if (game.time) {
            let d = new Date();
            d.setMinutes(d.getMinutes() + parseInt(game.time));
            game.endTime = d.toJSON();
        }
        io.to(gameData.code).emit('state', game);
    });
    socket.on('pauseGame', function(code) {
        let game = activeGames[Object.keys(activeGames).find((key) => key === code)];
        game.pauseTime = (new Date()).toJSON();
        game.paused = true;
        io.to(code).emit('state', game);
    });
    socket.on('resumeGame', function(code) {
        let game = activeGames[Object.keys(activeGames).find((key) => key === code)];
        game.paused = false;
        let newTime = new Date(game.endTime).getTime() + (new Date().getTime() - new Date(game.pauseTime).getTime());
        let newDate = new Date(game.endTime);
        newDate.setTime(newTime);
        game.endTime = newDate.toJSON();
        io.to(code).emit('state', game);
    });
    socket.on('killPlayer', function(id, code) {
        let game = activeGames[Object.keys(activeGames).find((key) => key === code)];
        let player = game.players.find((player) => player.id === id);
        game.players.find((player) => player.id === id).dead = true;
        game.message = player.name + ", a " + player.card.role + ", has been killed!";
        io.to(code).emit('state', game);
    });
});

