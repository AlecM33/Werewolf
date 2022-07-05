const globals = require('../config/globals.js');

class SocketManager {
    constructor (logger, io) {
        this.logger = logger;
        this.io = io;
    }

    broadcast = (message) => {
        this.io.emit(globals.EVENTS.BROADCAST, message);
    };
}

class Singleton {
    constructor (logger, io) {
        if (!Singleton.instance) {
            logger.info('CREATING SINGLETON SOCKET MANAGER');
            Singleton.instance = new SocketManager(logger, io);
        }
    }

    getInstance () {
        return Singleton.instance;
    }
}

module.exports = Singleton;
