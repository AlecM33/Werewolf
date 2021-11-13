const { fork } = require('child_process');
const path = require('path');

const logger = require('./logger')(false);

class ActiveGameRunner {
    constructor () {
        this.activeGames = {};
    }

    // runGame = (game, namespace, gameStateFn) => {
    //     logger.debug('running game ' + game.accessCode);
    //     const gameProcess = fork(path.join(__dirname, '/GameProcess.js'));
    //     gameProcess.on('message', (msg) => {
    //         switch (msg.command) {
    //             case serverGlobals.COMMAND.END_COUNTDOWN:
    //                 logger.debug('GAME PARENT PROCESS ' + game.accessCode + ': COMMAND: END COUNTDOWN');
    //                 namespace.in(game.accessCode).emit(serverGlobals.COMMAND.END_COUNTDOWN);
    //                 gameProcess.send({
    //                     command: serverGlobals.COMMAND.START_GAME,
    //                     cycleNumber: game.words.length - 1,
    //                     cycleLength: game.timePerWord * 1000,
    //                     accessCode: game.accessCode
    //                 });
    //                 break;
    //             case serverGlobals.COMMAND.START_GAME:
    //                 game.status = serverGlobals.GAME_STATE.STARTED;
    //                 game.lastCycleTime = new Date().toJSON();
    //                 logger.debug('GAME PARENT PROCESS ' + game.accessCode + ': COMMAND: START GAME');
    //                 namespace.in(game.accessCode).emit(serverGlobals.COMMAND.START_GAME, {
    //                     firstWord: game.words[0].baseword,
    //                     gameLength: game.words.length,
    //                     timePerWord: game.timePerWord * 1000
    //                 });
    //                 break;
    //             case serverGlobals.COMMAND.CYCLE_WORD:
    //                 game.currentWordIndex += 1;
    //                 game.lastCycleTime = new Date().toJSON();
    //                 logger.debug('GAME PARENT PROCESS ' + game.accessCode + ': COMMAND: CYCLE WORD');
    //                 if (game.currentWordIndex < game.words.length) {
    //                     namespace.in(game.accessCode).emit(serverGlobals.COMMAND.CYCLE_WORD, {
    //                         word: game.words[game.currentWordIndex].baseword,
    //                         index: game.currentWordIndex + 1,
    //                         totalTime: game.timePerWord * 1000,
    //                         gameLength: game.words.length
    //                     });
    //                 }
    //                 gameProcess.send({
    //                     command: serverGlobals.COMMAND.CYCLE_WORD,
    //                     cycleIndex: game.currentWordIndex,
    //                     cycleLength: game.timePerWord * 1000,
    //                     accessCode: game.accessCode,
    //                     gameLength: game.words.length
    //                 });
    //                 break;
    //             case serverGlobals.COMMAND.END_GAME:
    //                 game.status = serverGlobals.GAME_STATE.ENDED;
    //                 if (!game.posted) {
    //                     logger.debug('GAME PARENT PROCESS: GAME ' + game.accessCode + ' HAS ENDED...BEGINNING POST TO DATABASE');
    //                     this.postGameFn(game).then(() => {
    //                         game.posted = true;
    //                         logger.debug('GAME ' + game.accessCode + ' SUCCESSFULLY POSTED');
    //                         namespace.in(game.accessCode).emit(serverGlobals.COMMAND.END_GAME, game.accessCode);
    //                     });
    //                 }
    //                 break;
    //         }
    //     });
    //
    //     gameProcess.on('exit', () => {
    //         if (this.activeGames[game.accessCode]) {
    //             delete this.activeGames[game.accessCode];
    //             logger.debug('GAME ' + game.accessCode + ' REMOVED FROM ACTIVE GAMES.');
    //         }
    //     });
    //     gameProcess.send({ command: serverGlobals.COMMAND.START_COUNTDOWN, accessCode: game.accessCode });
    //     game.status = serverGlobals.GAME_STATE.STARTING;
    //     game.startCountdownTime = new Date().toJSON();
    //     namespace.in(game.accessCode).emit(serverGlobals.COMMAND.START_COUNTDOWN);
    // }
}

class Singleton {
    constructor () {
        if (!Singleton.instance) {
            logger.log('CREATING SINGLETON ACTIVE GAME RUNNER');
            Singleton.instance = new ActiveGameRunner();
        }
    }

    getInstance () {
        return Singleton.instance;
    }
}

module.exports = Singleton;
