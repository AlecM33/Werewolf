const { GAME_PROCESS_COMMANDS, PRIMITIVES } = require('../config/globals');
const ServerTimer = require('./ServerTimer.js');

let timer;

// This is a subprocess spawned by logic in the TimerManager module.
process.on('message', (msg) => {
    const logger = require('./Logger')(msg.logLevel);
    switch (msg.command) {
        case GAME_PROCESS_COMMANDS.START_TIMER:
            logger.trace('CHILD PROCESS ' + msg.accessCode + ': START TIMER');
            timer = new ServerTimer(
                msg.hours,
                msg.minutes,
                PRIMITIVES.CLOCK_TICK_INTERVAL_MILLIS,
                logger
            );
            timer.runTimer().then(() => {
                logger.debug('Timer finished for ' + msg.accessCode);
                process.send({ command: GAME_PROCESS_COMMANDS.END_TIMER });
                process.exit(0);
            });

            break;
        case GAME_PROCESS_COMMANDS.PAUSE_TIMER:
            timer.stopTimer();
            logger.trace('CHILD PROCESS ' + msg.accessCode + ': PAUSE TIMER');
            process.send({ command: GAME_PROCESS_COMMANDS.PAUSE_TIMER, timeRemaining: timer.currentTimeInMillis });

            break;

        case GAME_PROCESS_COMMANDS.RESUME_TIMER:
            timer.resumeTimer().then(() => {
                logger.debug('Timer finished for ' + msg.accessCode);
                process.send({ command: GAME_PROCESS_COMMANDS.END_TIMER });
                process.exit(0);
            });
            logger.trace('CHILD PROCESS ' + msg.accessCode + ': RESUME TIMER');
            process.send({ command: GAME_PROCESS_COMMANDS.RESUME_TIMER, timeRemaining: timer.currentTimeInMillis });

            break;

        case GAME_PROCESS_COMMANDS.GET_TIME_REMAINING:
            logger.trace('CHILD PROCESS ' + msg.accessCode + ': GET TIME REMAINING');
            process.send({
                command: GAME_PROCESS_COMMANDS.GET_TIME_REMAINING,
                timeRemaining: timer.currentTimeInMillis,
                socketId: msg.socketId
            });

            break;
    }
});
