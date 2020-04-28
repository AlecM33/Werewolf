module.exports = class {

    constructor(CronJob) {
        // TODO: do better than a plain object
        this.activeGames = {};
    
        // cron job for periodically clearing finished games
        this.job = new CronJob('0 0 */2 * * *', function() {
            console.log(this.activeGames);
            for (const key in this.activeGames) {
                if (this.activeGames.hasOwnProperty(key) && (Math.abs((new Date()) - (new Date(this.activeGames[key].startTime))) / 36e5) >= 2) {
                    delete this.activeGames[key];
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
                game.message = player.name + ", a " + player.card.role + ", was killed!";
                console.log(game.message);
                if (player.card.role === "Werewolf" && game.hasDreamWolf) {
                    this.activateDreamWolvesIfNeeded(game);
                }
                const winCheck = ServerHelper.teamWon(game);
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
    
    timerExpired(code) {
        let game = this.findGame(code);
        if (game) {
            game.winningTeam = "wolf";
            game.status = "ended";
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
        }
    }
    
    pauseGame(code) {
        let game = this.findGame(code);
        if (game) {
            game.pauseTime = (new Date()).toJSON();
            game.paused = true;
        }
    }
    
    startGame(gameData) {
        let game = this.findGame(gameData.code);
        if (game) {
            game.status = "started";
            game.players = gameData.players;
            if (game.time) {
                let d = new Date();
                d.setMinutes(d.getMinutes() + parseInt(game.time));
                game.endTime = d.toJSON();
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

