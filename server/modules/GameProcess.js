const globals = require('../config/globals.js');
const ServerTimer = require('./ServerTimer.js');

process.on('message', (msg) => {
    const logger = require('./Logger')(msg.logLevel);
    switch (msg.command) {
        case globals.GAME_PROCESS_COMMANDS.START_TIMER:
            logger.debug('CHILD PROCESS ' + msg.accessCode + ': START TIMER');
            runGameTimer(msg.hours, msg.minutes, logger).then(() => {
                logger.debug('Timer finished for ' + msg.accessCode);
                process.send({ command: globals.GAME_PROCESS_COMMANDS.END_GAME });
                process.exit(0);
            });
            break;
    }
});

function runGameTimer (hours, minutes, logger) {
    const cycleTimer = new ServerTimer(
        hours,
        minutes,
        globals.CLOCK_TICK_INTERVAL_MILLIS,
        logger
    );
    return cycleTimer.runTimer();
}
