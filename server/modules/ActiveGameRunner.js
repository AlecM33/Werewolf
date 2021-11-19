const { fork } = require('child_process');
const path = require('path');
const globals = require('../config/globals');

class ActiveGameRunner {
    constructor (logger) {
        this.activeGames = {};
        this.logger = logger;
    }

    /* We're only going to fork a child process for games with a timer. They will report back to the parent process whenever
        the timer is up.
     */
    runGame = (game, namespace) => {
        this.logger.debug('running game ' + game.accessCode);
        const gameProcess = fork(path.join(__dirname, '/GameProcess.js'));
        gameProcess.on('message', (msg) => {
            switch (msg.command) {
                case globals.GAME_PROCESS_COMMANDS.END_GAME:
                    game.status = globals.STATUS.ENDED;
                    this.logger.debug('PARENT: END GAME');
                    namespace.in(game.accessCode).emit(globals.GAME_PROCESS_COMMANDS.END_GAME, game.accessCode);
                    break;
            }
        });

        gameProcess.on('exit', () => {
            this.logger.debug('Game ' + game.accessCode + ' has ended. Elapsed: ' + (new Date() - game.startTime) + 'ms');
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
