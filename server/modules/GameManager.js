const globals = require('../config/globals');

class GameManager {
    constructor (logger) {
        this.logger = logger;
        //this.activeGameRunner = new ActiveGameRunner(this.postGame).getInstance();
        //this.gameSocketUtility = GameSocketUtility;
    }

    createGame = (gameParams) => {
        const expectedKeys = ['deck', 'hasTimer', 'timerParams'];
        if (typeof gameParams !== 'object' || expectedKeys.some((key) => !Object.keys(gameParams).includes(key))) {
            this.logger.error('Tried to create game with invalid options: ' + JSON.stringify(gameParams));
            return Promise.reject('Tried to create game with invalid options: ' + gameParams);
        } else {
            const newAccessCode = this.generateAccessCode();
            return Promise.resolve(newAccessCode);
        }
    }

    generateAccessCode = () => {
        const numLetters = globals.ACCESS_CODE_CHAR_POOL.length;
        const codeDigits = [];
        let iterations = globals.ACCESS_CODE_LENGTH;
        while (iterations > 0) {
            iterations--;
            codeDigits.push(globals.ACCESS_CODE_CHAR_POOL[getRandomInt(numLetters)]);
        }
        return codeDigits.join('');
    }


}

function getRandomInt (max) {
    return Math.floor(Math.random() * Math.floor(max));
}

class Singleton {
    constructor (logger) {
        if (!Singleton.instance) {
            logger.log('CREATING SINGLETON GAME MANAGER');
            Singleton.instance = new GameManager(logger);
        }
    }

    getInstance () {
        return Singleton.instance;
    }
}

module.exports = Singleton;
