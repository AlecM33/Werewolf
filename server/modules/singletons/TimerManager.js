// TimerManager is now deprecated - timer logic has been moved to GameManager
// This class is kept as a stub to maintain compatibility with existing dependency injection
class TimerManager {
    constructor (logger, instanceId) {
        if (TimerManager.instance) {
            throw new Error('The server tried to instantiate more than one TimerManager');
        }
        logger.info('CREATING SINGLETON TIMER MANAGER (deprecated - timers now managed by GameManager)');
        this.logger = logger;
        this.instanceId = instanceId;
        TimerManager.instance = this;
    }
}

module.exports = TimerManager;
