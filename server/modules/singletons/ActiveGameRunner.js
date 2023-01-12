const { fork } = require('child_process');
const path = require('path');
const globals = require('../../config/globals');
const redis = require('redis');

class ActiveGameRunner {
    constructor (logger, instanceId) {
        if (ActiveGameRunner.instance) {
            throw new Error('The server tried to instantiate more than one ActiveGameRunner');
        }
        logger.info('CREATING SINGLETON ACTIVE GAME RUNNER');
        this.timerThreads = {};
        this.logger = logger;
        this.client = redis.createClient();
        this.publisher = null;
        this.subscriber = null;
        this.instanceId = instanceId;
        ActiveGameRunner.instance = this;
    }

    getActiveGame = async (accessCode) => {
        const r = await this.client.get(accessCode);
        return r === null ? r : JSON.parse(r);
    }

    createGameSyncSubscriber = async (gameManager, socketManager) => {
        this.subscriber = this.client.duplicate();
        await this.subscriber.connect();
        await this.subscriber.subscribe(globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM, async (message) => {
            this.logger.info('MESSAGE: ' + message);
            const messageComponents = message.split(';');
            if (messageComponents[messageComponents.length - 1] === this.instanceId) {
                this.logger.trace('Disregarding self-authored message');
                return;
            }
            const game = await this.getActiveGame(messageComponents[0]);
            let args;
            if (messageComponents[2]) {
                args = JSON.parse(messageComponents[2]);
            }
            if (game) {
                await socketManager.handleEventById(
                    messageComponents[1],
                    game,
                    null,
                    game?.accessCode || messageComponents[0],
                    args || null,
                    null,
                    true
                );
            }
        });
        this.logger.info('ACTIVE GAME RUNNER - CREATED GAME SYNC SUBSCRIBER');
    }

    /* We're only going to fork a child process for games with a timer. They will report back to the parent process whenever
        the timer is up.
     */
    runGame = (game, namespace) => {
        this.logger.debug('running game ' + game.accessCode);
        const gameProcess = fork(path.join(__dirname, '../GameProcess.js'));
        this.timerThreads[game.accessCode] = gameProcess;
        this.logger.debug('game ' + game.accessCode + ' now associated with subProcess ' + gameProcess.pid);
        gameProcess.on('message', (msg) => {
            switch (msg.command) {
                case globals.GAME_PROCESS_COMMANDS.END_TIMER:
                    game.timerParams.paused = false;
                    game.timerParams.timeRemaining = 0;
                    namespace.in(game.accessCode).emit(globals.GAME_PROCESS_COMMANDS.END_TIMER);
                    this.logger.trace('PARENT: END TIMER');
                    break;
                case globals.GAME_PROCESS_COMMANDS.PAUSE_TIMER:
                    game.timerParams.paused = true;
                    this.logger.trace(msg);
                    game.timerParams.timeRemaining = msg.timeRemaining;
                    this.logger.trace('PARENT: PAUSE TIMER');
                    namespace.in(game.accessCode).emit(globals.GAME_PROCESS_COMMANDS.PAUSE_TIMER, game.timerParams.timeRemaining);
                    break;
                case globals.GAME_PROCESS_COMMANDS.RESUME_TIMER:
                    game.timerParams.paused = false;
                    this.logger.trace(msg);
                    game.timerParams.timeRemaining = msg.timeRemaining;
                    this.logger.trace('PARENT: RESUME TIMER');
                    namespace.in(game.accessCode).emit(globals.GAME_PROCESS_COMMANDS.RESUME_TIMER, game.timerParams.timeRemaining);
                    break;
                case globals.GAME_PROCESS_COMMANDS.GET_TIME_REMAINING:
                    this.logger.trace(msg);
                    game.timerParams.timeRemaining = msg.timeRemaining;
                    this.logger.trace('PARENT: GET TIME REMAINING');
                    namespace.to(msg.socketId).emit(globals.GAME_PROCESS_COMMANDS.GET_TIME_REMAINING, game.timerParams.timeRemaining, game.timerParams.paused);
                    break;
            }
        });

        gameProcess.on('exit', (code, signal) => {
            this.logger.debug('Game timer thread ' + gameProcess.pid + ' exiting with code ' + code + ' - game ' + game.accessCode);
        });
        gameProcess.send({
            command: globals.GAME_PROCESS_COMMANDS.START_TIMER,
            accessCode: game.accessCode,
            logLevel: this.logger.logLevel,
            hours: game.timerParams.hours,
            minutes: game.timerParams.minutes
        });
        game.startTime = new Date().toJSON();
    };
}

module.exports = ActiveGameRunner;
