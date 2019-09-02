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

function didVillageWin(game) {
    let liveCount = 0;
    for (const player of game.players) {
        if (player.card.role === "Werewolf" && !player.dead) {
            return false;
        }
    }
    return true;
}

function teamWon(game) {
    let wolvesAlive = 0;
    let villagersAlive = 0;
    let hunterAlive = false;
    for (const player of game.players) {
        if (player.card.team === "village" && !player.dead) {
            villagersAlive++;
        }
        if (player.card.team === "wolf" && !player.dead) {
            wolvesAlive++;
        }
        if (player.card.role === "Hunter" && !player.dead) {
            hunterAlive = true;
        }
    }
    console.log("wolves: " + wolvesAlive + " villagers: " + villagersAlive);
    if ((wolvesAlive === villagersAlive) && (wolvesAlive + villagersAlive !== 2)) {
        return "wolf";
    }
    if (wolvesAlive === 0) {
        return "village"
    }
    if (wolvesAlive + villagersAlive === 2) {
        return hunterAlive ? "village" : "wolf"
    }
    return false;
}

// Add the WebSocket handlers
io.on('connection', function(socket) {
    socket.on('newGame', function(game, onSuccess) {
        activeGames[game.accessCode] = game;
        onSuccess();
    });
    socket.on('joinGame', function(playerInfo) {
        const game = activeGames[Object.keys(activeGames).find((key) => key === playerInfo.code)];
        if (game && game.players.length < game.size) {
            activeGames[Object.keys(activeGames).find((key) => key === playerInfo.code)].players.push({name: playerInfo.name, id: playerInfo.id});
            socket.emit('success');
        } else {
            if (game && game.players.length === game.size) {
                socket.emit("joinError", "This game is full - sorry!")
            } else {
                socket.emit("joinError", "No game found");
            }
        }
    });
    socket.on('requestState', function(data) {
        if(Object.keys(socket.rooms).includes(data.code) === false) {
            socket.join(data.code, function() {
                io.to(data.code).emit('state', activeGames[Object.keys(activeGames).find((key) => key === data.code)]);
            });
        } else {
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
        const winCheck = teamWon(game);
        if (winCheck === "wolf") {
            game.winningTeam = "wolf";
            game.state = "ended";
            io.to(code).emit('state', game);
        } else if (winCheck === "village") {
            game.winningTeam = "village";
            game.state = "ended";
            io.to(code).emit('state', game);
        } else {
            io.to(code).emit('state', game);
        }
    });
});

