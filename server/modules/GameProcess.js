const globals = require('../config/globals.js');
const ServerTimer = require('./ServerTimer.js');

let timer;

process.on('message', (msg) => {
    const logger = require('./Logger')(msg.logLevel);
    switch (msg.command) {
        case globals.GAME_PROCESS_COMMANDS.START_TIMER:
            logger.debug('CHILD PROCESS ' + msg.accessCode + ': START TIMER');
            timer = new ServerTimer(
                msg.hours,
                msg.minutes,
                globals.CLOCK_TICK_INTERVAL_MILLIS,
                logger
            );
            timer.runTimer().then(() => {
                logger.debug('Timer finished for ' + msg.accessCode);
                process.send({ command: globals.GAME_PROCESS_COMMANDS.END_GAME });
                process.exit(0);
            });

            break;
        case globals.GAME_PROCESS_COMMANDS.PAUSE_TIMER:
            timer.stopTimer();
            logger.debug('CHILD PROCESS ' + msg.accessCode + ': PAUSE TIMER');
            process.send({ command: globals.GAME_PROCESS_COMMANDS.PAUSE_TIMER, timeRemaining: timer.currentTimeInMillis});

            break;

        case globals.GAME_PROCESS_COMMANDS.RESUME_TIMER:
            timer.resumeTimer().then(() => {
                logger.debug('Timer finished for ' + msg.accessCode);
                process.send({ command: globals.GAME_PROCESS_COMMANDS.END_GAME });
                process.exit(0);
            });
            logger.debug('CHILD PROCESS ' + msg.accessCode + ': RESUME TIMER');
            process.send({ command: globals.GAME_PROCESS_COMMANDS.RESUME_TIMER, timeRemaining: timer.currentTimeInMillis});

            break;
    }
});

