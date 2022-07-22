const globals = require('../config/globals');
const EVENT_IDS = globals.EVENT_IDS;
const { RateLimiterMemory } = require('rate-limiter-flexible');

class SocketManager {
    constructor (logger) {
        this.logger = logger;
        this.io = null;
    }

    broadcast = (message) => {
        this.io?.emit(globals.EVENTS.BROADCAST, message);
    };

    createSocketServer = (main, app, port, logger) => {
        let io;
        if (process.env.NODE_ENV.trim() === 'development') {
            io = require('socket.io')(main, {
                cors: { origin: 'http://localhost:' + port }
            });
        } else {
            io = require('socket.io')(main, {
                cors: { origin: 'https://play-werewolf.app' }
            });
        }

        registerRateLimiter(io, logger);
        this.io = io;

        return io;
    };

    createGameSocketNamespace = (server, logger, gameManager) => {
        const namespace = server.of('/in-game');
        const registerHandlers = this.registerHandlers;
        registerRateLimiter(namespace, logger);
        namespace.on('connection', function (socket) {
            socket.on('disconnecting', (reason) => {
                logger.trace('client socket disconnecting because: ' + reason);
            });

            registerHandlers(namespace, socket, gameManager);
        });
        return server.of('/in-game');
    };

    registerHandlers = (namespace, socket, gameManager) => {
        socket.on(globals.SOCKET_EVENTS.IN_GAME_MESSAGE, async (eventId, accessCode, args, ackFn) => {
            const game = gameManager.activeGameRunner.activeGames.get(accessCode);
            if (game) {
                switch (eventId) {
                    case EVENT_IDS.FETCH_GAME_STATE:
                        await gameManager.handleRequestForGameState(
                            this.namespace,
                            this.logger,
                            gameManager.activeGameRunner,
                            accessCode,
                            args.personId,
                            ackFn,
                            socket
                        );
                        break;
                    case EVENT_IDS.START_GAME:
                        gameManager.startGame(game, namespace);
                        break;
                    case EVENT_IDS.PAUSE_TIMER:
                        gameManager.pauseTimer(game, this.logger);
                        break;
                    case EVENT_IDS.RESUME_TIMER:
                        gameManager.resumeTimer(game, this.logger);
                        break;
                    case EVENT_IDS.GET_TIME_REMAINING:
                        gameManager.getTimeRemaining(game, socket);
                        break;
                    case EVENT_IDS.KILL_PLAYER:
                        gameManager.killPlayer(game, game.people.find((person) => person.id === args.personId), namespace, this.logger);
                        break;
                    case EVENT_IDS.REVEAL_PLAYER:
                        gameManager.revealPlayer(game, args.personId);
                        break;
                    case EVENT_IDS.TRANSFER_MODERATOR:
                        let person = game.people.find((person) => person.id === args.personId);
                        if (!person) {
                            person = game.spectators.find((spectator) => spectator.id === args.personId);
                        }
                        gameManager.transferModeratorPowers(game, person, this.logger);
                        break;
                    case EVENT_IDS.CHANGE_NAME:
                        gameManager.changeName(game, args.data, ackFn);
                        break;
                    case EVENT_IDS.END_GAME:
                        gameManager.endGame(game);
                        break;
                    default:
                        break;
                }
            }
        });
    };
}

function registerRateLimiter (server, logger) {
    const rateLimiter = new RateLimiterMemory(
        {
            points: 10,
            duration: 1
        });

    server.use(async (socket, next) => {
        try {
            await rateLimiter.consume(socket.handshake.address);
            logger.trace('consumed point from ' + socket.handshake.address);
            next();
        } catch (rejection) {
            next(new Error('Your connection has been blocked.'));
        }
    });
}

class Singleton {
    constructor (logger) {
        if (!Singleton.instance) {
            logger.info('CREATING SINGLETON SOCKET MANAGER');
            Singleton.instance = new SocketManager(logger);
        }
    }

    getInstance () {
        return Singleton.instance;
    }
}

module.exports = Singleton;
