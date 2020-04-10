// Dependencies
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const app = express();
const server = http.Server(app);
const io = socketIO(server);

const secure = require('express-force-https');
app.use(secure);



const CronJob = require('cron').CronJob;

var activeGames = {};

// cron job for periodically clearing finished games
const job = new CronJob('0 0 */2 * * *', function() {
    console.log(activeGames);
    for (const key in activeGames) {
        if (activeGames.hasOwnProperty(key) && (Math.abs((new Date()) - (new Date(activeGames[key].startTime))) / 36e5) >= 2) {
            delete activeGames[key];
        }
    }
    console.log("Games pruned at: " + (new Date().toDateString()) + " " + (new Date()).toTimeString());
});
console.log("cron job created");
job.start();

app.set('port', 5000);

app.use('/static', express.static(__dirname + '/static')); // Routing
app.use('/assets', express.static(__dirname + '/assets')); // Routing
app.use('/node_modules/socket.io-client', express.static(__dirname + '/node_modules/socket.io-client')); // Routing
app.get('', function(request, response) {
    response.sendFile(__dirname + '/views/index.html');
});

app.get('/learn', function(request, response) {
    response.sendFile(__dirname + '/views/learn.html');
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

function teamWon(game) {
    let wolvesAlive = 0;
    let villagersAlive = 0;
    let totalAlive = 0;
    let hunterAlive = false;
    for (const player of game.players) {
        if (!player.card.isTypeOfWerewolf && !player.dead) {
            villagersAlive ++;
        }
        if (player.card.isTypeOfWerewolf && !player.dead) {
            wolvesAlive ++;
        }
        if (player.card.role === "Hunter" && !player.dead) {
            hunterAlive = true;
        }
        if (!player.dead) {
            totalAlive ++;
        }
    }
    if (wolvesAlive === 0) {
        return "village"
    }
    if ((wolvesAlive === villagersAlive) && (totalAlive !== 2)) {
        return "wolf";
    }
    if (totalAlive === 2) {
        return hunterAlive ? "village" : "wolf"
    }
    return false;
}

// Add the WebSocket handlers
io.on('connection', function(socket) {
    socket.on('newGame', function(game, onSuccess) {
        activeGames[game.accessCode] = game;
        activeGames[game.accessCode].startTime = (new Date()).toJSON();
        console.log("Game created at " + (new Date().toDateString()) + " " + (new Date()).toTimeString());
        onSuccess();
    });
    socket.on('joinGame', function(playerInfo) {
        const game = activeGames[Object.keys(activeGames).find((key) => key === playerInfo.code)];
        if (game && game.players.length < game.size) {
            game.players.push({name: playerInfo.name, id: playerInfo.id});
            console.log(playerInfo.name + " joined the game!");
            socket.emit('success');
        } else {
            if (game && game.players.length === game.size) {
                socket.emit("joinError", "This game is full - sorry!")
            } else {
                socket.emit("joinError", "No game found");
            }
        }
    });
    // send the game state to the client that requested it
    socket.on('requestState', function(data) {
        const game = activeGames[Object.keys(activeGames).find((key) => key === data.code)];
        if (game && Object.keys(socket.rooms).includes(data.code) === false) {
            socket.join(data.code, function() {
                socket.emit('state', game);
            });
        } else {
            if (game) {
                socket.emit('state', game);
            }
        }
    });
    socket.on('startGame', function(gameData) {
        let game = activeGames[Object.keys(activeGames).find((key) => key === gameData.code)];
        if (game) {
            game.status = "started";
            game.players = gameData.players;
            if (game.time) {
                let d = new Date();
                d.setMinutes(d.getMinutes() + parseInt(game.time));
                game.endTime = d.toJSON();
            }
        }
    });
    socket.on('pauseGame', function(code) {
        let game = activeGames[Object.keys(activeGames).find((key) => key === code)];
        if (game) {
            game.pauseTime = (new Date()).toJSON();
            game.paused = true;
        }
    });
    socket.on('resumeGame', function(code) {
        let game = activeGames[Object.keys(activeGames).find((key) => key === code)];
        if (game) {
            game.paused = false;
            let newTime = new Date(game.endTime).getTime() + (new Date().getTime() - new Date(game.pauseTime).getTime());
            let newDate = new Date(game.endTime);
            newDate.setTime(newTime);
            game.endTime = newDate.toJSON();
        }
    });
    socket.on("timerExpired", function(code) {
        let game = activeGames[Object.keys(activeGames).find((key) => key === code)];
        if (game) {
            game.winningTeam = "wolf";
            game.status = "ended";
        }
    });
    socket.on('killPlayer', function(id, code) {
        let game = activeGames[Object.keys(activeGames).find((key) => key === code)];
        if (game) {
            let player = game.players.find((player) => player.id === id);
            game.players.find((player) => player.id === id).dead = true;
            game.killedPlayer = player.name;
            game.lastKilled = player.id;
            game.killedRole = player.card.role;
            game.message = player.name + ", a " + player.card.role + ", was killed!";
            console.log(game.message);
            const winCheck = teamWon(game);
            if (winCheck === "wolf") {
                console.log("wolves won the game!");
                game.winningTeam = "wolf";
                game.status = "ended";
            } if (winCheck === "village") {
                console.log("village won the game!");
                game.winningTeam = "village";
                game.status = "ended";
            }
        }
    });
});

