const ServerTimer = require('../ServerTimer');
const { REDIS_CHANNELS, GAME_PROCESS_COMMANDS, PRIMITIVES } = require('../../config/globals');

class TimerManager {
    constructor (logger, instanceId) {
        if (TimerManager.instance) {
            throw new Error('The server tried to instantiate more than one TimerManager');
        }
        logger.info('CREATING SINGLETON TIMER MANAGER');
        this.timers = {};
        this.logger = logger;
        this.subscriber = null;
        this.instanceId = instanceId;
        TimerManager.instance = this;
    }

    runTimer = async (game, namespace, eventManager, gameManager) => {
        this.logger.debug('running timer for game ' + game.accessCode);
        
        // Create timer instance directly on main thread
        const timer = new ServerTimer(
            game.timerParams.hours,
            game.timerParams.minutes,
            PRIMITIVES.CLOCK_TICK_INTERVAL_MILLIS,
            this.logger
        );
        
        this.timers[game.accessCode] = timer;
        this.logger.debug('game ' + game.accessCode + ' now has timer instance');
        
        // Start the timer (paused initially as per original logic)
        timer.runTimer(true).then(async () => {
            this.logger.debug('Timer finished for ' + game.accessCode);
            
            // Get fresh game state
            const currentGame = await gameManager.getActiveGame(game.accessCode);
            if (currentGame) {
                // Handle END_TIMER event
                await eventManager.handleEventById(
                    GAME_PROCESS_COMMANDS.END_TIMER,
                    null,
                    currentGame,
                    null,
                    currentGame.accessCode,
                    {},
                    null,
                    false
                );
                await gameManager.refreshGame(currentGame);
                await eventManager.publisher.publish(
                    REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                    eventManager.createMessageToPublish(
                        currentGame.accessCode,
                        GAME_PROCESS_COMMANDS.END_TIMER,
                        this.instanceId,
                        '{}'
                    )
                );
            }
            
            // Clean up timer reference
            delete this.timers[game.accessCode];
        });
        
        game.startTime = new Date().toJSON();
    }
}

module.exports = TimerManager;
