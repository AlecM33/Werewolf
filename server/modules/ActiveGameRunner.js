const { fork } = require('child_process');
const path = require('path');
const globals = require('../config/globals');

class ActiveGameRunner {
    constructor (logger) {
        this.activeGames = {};
        this.timerThreads = {};
        this.logger = logger;
    }

    /* We're only going to fork a child process for games with a timer. They will report back to the parent process whenever
        the timer is up.
     */
    runGame = (game, namespace) => {
        this.logger.debug('running game ' + game.accessCode);
        const gameProcess = fork(path.join(__dirname, '/GameProcess.js'));
        this.timerThreads[game.accessCode] = gameProcess;
        gameProcess.on('message', (msg) => {
            switch (msg.command) {
                case globals.GAME_PROCESS_COMMANDS.END_GAME:
                    //game.status = globals.STATUS.ENDED;
                    game.timerParams.paused = false;
                    game.timerParams.timeRemaining = 0;
                    this.logger.debug('PARENT: END GAME');
                    namespace.in(game.accessCode).emit(globals.GAME_PROCESS_COMMANDS.END_GAME, game.accessCode);
                    break;
                case globals.GAME_PROCESS_COMMANDS.PAUSE_TIMER:
                    game.timerParams.paused = true;
                    this.logger.trace(msg);
                    game.timerParams.timeRemaining = msg.timeRemaining;
                    this.logger.debug('PARENT: PAUSE TIMER');
                    namespace.in(game.accessCode).emit(globals.GAME_PROCESS_COMMANDS.PAUSE_TIMER, game.timerParams.timeRemaining);
                    break;
                case globals.GAME_PROCESS_COMMANDS.RESUME_TIMER:
                    game.timerParams.paused = false;
                    this.logger.trace(msg);
                    game.timerParams.timeRemaining = msg.timeRemaining;
                    this.logger.debug('PARENT: RESUME TIMER');
                    namespace.in(game.accessCode).emit(globals.GAME_PROCESS_COMMANDS.RESUME_TIMER, game.timerParams.timeRemaining);
                    break;
                case globals.GAME_PROCESS_COMMANDS.GET_TIME_REMAINING:
                    this.logger.trace(msg);
                    game.timerParams.timeRemaining = msg.timeRemaining;
                    this.logger.debug('PARENT: GET TIME REMAINING');
                    namespace.to(msg.socketId).emit(globals.GAME_PROCESS_COMMANDS.GET_TIME_REMAINING, game.timerParams.timeRemaining, game.timerParams.paused);
                    break;
            }
        });

        gameProcess.on('exit', () => {
            this.logger.debug('Game ' + game.accessCode + ' has ended.');
            delete this.timerThreads[game.accessCode];
        });
        gameProcess.send({
            command: globals.GAME_PROCESS_COMMANDS.START_TIMER,
            accessCode: game.accessCode,
            logLevel: this.logger.logLevel,
            hours: game.timerParams.hours,
            minutes: game.timerParams.minutes
        });
        game.startTime = new Date().toJSON();
        namespace.in(game.accessCode).emit(globals.GAME_PROCESS_COMMANDS.START_TIMER);
    }
}

class Singleton {
    constructor (logger) {
        if (!Singleton.instance) {
            logger.log('CREATING SINGLETON ACTIVE GAME RUNNER');
            Singleton.instance = new ActiveGameRunner(logger);
        }
    }

    getInstance () {
        return Singleton.instance;
    }
}

module.exports = Singleton;
