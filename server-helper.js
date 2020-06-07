const debugMode = Array.from(process.argv.map( (arg)=>arg.trim().toLowerCase() )).includes("debug");
const LOGGER = require("./javascript/modules/logger")(debugMode);

module.exports = class {

    constructor(CronJob) {
        // TODO: do better than a plain object
        this.activeGames = {};
        this.timers = {};
    
        // cron job for periodically clearing finished games
        const scope = this;
        this.job = new CronJob('0 0 */2 * * *', function() {
            console.log(scope.activeGames);
            for (const key in scope.activeGames) {
                if (scope.activeGames.hasOwnProperty(key) && (Math.abs((new Date()) - (new Date(scope.activeGames[key].startTime))) / 36e5) >= 2) {
                    delete scope.activeGames[key];
                }
            }
            console.log("Games pruned at: " + (new Date().toDateString()) + " " + (new Date()).toTimeString());
        });
        console.log("cron job created");
        this.job.start();
    }
    
    killPlayer(id, code) {
        let game = this.findGame(code);
        if (game) {
            let player = game.players.find((player) => player.id === id);
            if (player) {
                player.dead = true;
                player.deadAt = new Date().toJSON();
                game.killedPlayer = player.name;
                game.lastKilled = player.id;
                game.killedRole = player.card.role;
                game.message = game.reveals
                    ? player.name + ", a " + player.card.role + ", was killed!"
                    : player.name + " has died!";
                console.log(game.message);
                if (player.card.isTypeOfWerewolf && game.hasDreamWolf) {
                    this.activateDreamWolvesIfNeeded(game);
                }
                const winCheck = module.exports.teamWon(game);
                if (winCheck === "wolf") {
                    console.log("wolves won the game!");
                    game.winningTeam = "wolf";
                    game.status = "ended";
                }
                if (winCheck === "village") {
                    console.log("village won the game!");
                    game.winningTeam = "village";
                    game.status = "ended";
                }
            }
        }
    }
    
    endGameDueToTimeExpired(code) {
        if (this.timers[code]) {
            clearInterval(this.timers[code]);
        }
        let game = this.findGame(code);
        if (game) {
            LOGGER.debug("Game " + code + " has ended due to expired timer.");
            game.winningTeam = "wolf";
            game.status = "ended";
        }
    }

    clearGameTimer(code) {
        if (this.timers[code]) {
            clearInterval(this.timers[code]);
            LOGGER.debug("game paused and timer cleared for " + code);
        }
    }
    
    resumeGame(code) {
        let game = this.findGame(code);
        if (game) {
            game.paused = false;
            let newTime = new Date(game.endTime).getTime() + (new Date().getTime() - new Date(game.pauseTime).getTime());
            let newDate = new Date(game.endTime);
            newDate.setTime(newTime);
            game.endTime = newDate.toJSON();
            LOGGER.debug("Game " + code + " timer has been unpaused, starting clock anew...");
            this.startGameClock(code, newDate - Date.now());
        }
    }
    
    pauseGame(code) {
        let game = this.findGame(code);
        if (game) {
            game.pauseTime = (new Date()).toJSON();
            game.paused = true;
            this.clearGameTimer(code);
        }
    }

    startGameClock(code, time) {
        LOGGER.debug("timer started for game " + code);
        let moduleScope = this;
        if (this.timers[code]) {
            clearInterval(this.timers[code]);
        }
        this.timers[code] = setInterval(function() {
            moduleScope.endGameDueToTimeExpired(code)
        }, time);
    }
    
    startGame(gameData) {
        let game = this.findGame(gameData.code);
        if (game) {
            LOGGER.debug("game " + gameData.code + " started");
            game.status = "started";
            game.players = gameData.players;
            if (game.time) {
                let d = new Date();
                d.setMinutes(d.getMinutes() + parseInt(game.time));
                game.endTime = d.toJSON();
                this.startGameClock(gameData.code, game.time * 60 * 1000); // provided time is in minutes
            }
        }
    }
    
    requestState(data, socket) {
        const game = this.findGame(data.code);
        if (game && Object.keys(socket.rooms).includes(data.code) === false) {
            socket.join(data.code, function() {
                socket.emit('state', game);
            });
        } else {
            if (game) {
                socket.emit('state', game);
            }
        }
    }
    
    joinGame(playerInfo, socket) {
        
        const game = this.findGame(playerInfo.code);
        if (game && game.players.length < game.size && !game.players.find((player) => player.id === playerInfo.id)) {
            game.players.push({name: playerInfo.name, id: playerInfo.id});
            console.log(playerInfo.name + " joined the game!");
            socket.emit('success');
        } else {
            if (game && game.players.length === game.size) {
                socket.emit("joinError", "This game is full - sorry!");
            } else {
                socket.emit("joinError", "No game found");
            }
        }
    }
    
    newGame(game, onSuccess) {
        this.activeGames[game.accessCode] = game;
        this.activeGames[game.accessCode].startTime = (new Date()).toJSON();
        console.log("Game created at " + (new Date().toDateString()) + " " + (new Date()).toTimeString());
        onSuccess();
    }
    
    findGame(code) {
        return this.activeGames[Object.keys(this.activeGames).find((key) => key === code)];
    }
    
    // If there are multiple dream wolves, convert them all.
    activateDreamWolvesIfNeeded(game) {
        game.players.forEach((player) => {
            if (!player.dead && player.card.role === "Dream Wolf") {
                player.card.isTypeOfWerewolf = true;
                console.log("player " + player.name + " was converted to a wolf!");
            }
        })
    }
    
    static teamWon(game) {
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
        if ((wolvesAlive >= villagersAlive) && (totalAlive !== 2)) {
            return "wolf";
        }
        if (totalAlive === 2) {
            return hunterAlive ? "village" : "wolf"
        }
        return false;
    }
};

