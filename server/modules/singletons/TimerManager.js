const { fork } = require('child_process');
const path = require('path');
const globals = require('../../config/globals');

class TimerManager {
    constructor (logger, instanceId) {
        if (TimerManager.instance) {
            throw new Error('The server tried to instantiate more than one TimerManager');
        }
        logger.info('CREATING SINGLETON TIMER MANAGER');
        this.timerThreads = {};
        this.logger = logger;
        this.subscriber = null;
        this.instanceId = instanceId;
        TimerManager.instance = this;
    }

    runTimer = async (game, namespace, eventManager, gameManager) => {
        this.logger.debug('running timer for game ' + game.accessCode);
        const gameProcess = fork(path.join(__dirname, '../GameProcess.js'));
        this.timerThreads[game.accessCode] = gameProcess;
        this.logger.debug('game ' + game.accessCode + ' now associated with subProcess ' + gameProcess.pid);
        gameProcess.on('message', async (msg) => {
            game = await gameManager.getActiveGame(game.accessCode);
            await eventManager.handleEventById(msg.command, null, game, msg.socketId, game.accessCode, msg, null, false);
            await gameManager.refreshGame(game);
            await eventManager.publisher.publish(
                globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                eventManager.createMessageToPublish(game.accessCode, msg.command, this.instanceId, JSON.stringify(msg))
            );
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
    }
}

module.exports = TimerManager;
