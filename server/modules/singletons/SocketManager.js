const globals = require('../../config/globals');
const EVENT_IDS = globals.EVENT_IDS;
const { RateLimiterMemory } = require('rate-limiter-flexible');
const redis = require('redis');
const GameStateCurator = require("../GameStateCurator");

class SocketManager {
    constructor (logger, activeGameRunner, instanceId) {
        if (SocketManager.instance) {
            throw new Error('The server attempted to instantiate more than one SocketManager.');
        }
        logger.info('CREATING SINGLETON SOCKET MANAGER');
        this.logger = logger;
        this.io = null;
        this.publisher = null;
        this.activeGameRunner = activeGameRunner;
        this.instanceId = instanceId;
        SocketManager.instance = this;
    }

    broadcast = (message) => {
        this.io?.emit(globals.EVENTS.BROADCAST, message);
    };

    createRedisPublisher = async () => {
        this.publisher = redis.createClient();
        await this.publisher.connect();
        this.logger.info('SOCKET MANAGER - CREATED GAME SYNC PUBLISHER');
    }

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
        socket.on(globals.SOCKET_EVENTS.IN_GAME_MESSAGE, async (eventId, accessCode, args = null, ackFn = null) => {
            const game = gameManager.activeGameRunner.activeGames.get(accessCode);
            if (game) {
                await this.handleEventById(eventId, game, socket.id, gameManager, accessCode, args, ackFn);
                /* This server should publish events initiated by a connected socket to Redis for consumption by other instances. */
                if (Object.values(EVENT_IDS).includes(eventId)) {
                    await gameManager.refreshGame(game);
                    this.publisher?.publish(
                        globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                        accessCode + ';' + eventId + ';' + JSON.stringify(args) + ';' + this.instanceId
                    );
                }
            } else {
                ackFn(null);
            }
        });
    };

    handleEventById = async (eventId, game, socketId, gameManager, accessCode, args, ackFn) => {
        this.logger.debug('ARGS TO HANDLER: ' + JSON.stringify(args));
        switch (eventId) {
            case EVENT_IDS.NEW_GAME:
                this.activeGameRunner.activeGames.set(accessCode, args.newGame);
                break;
            case EVENT_IDS.PLAYER_JOINED:
                let toBeAssignedIndex = game.people.findIndex((person) => person.id === args.id && person.assigned === false);
                if (toBeAssignedIndex >= 0) {
                    game.people[toBeAssignedIndex] = args;
                    game.isFull = gameManager.isGameFull(game);
                    gameManager.namespace.in(game.accessCode).emit(
                        globals.EVENTS.PLAYER_JOINED,
                        GameStateCurator.mapPerson(args),
                        game.isFull
                    );
                }
                break;
            case EVENT_IDS.SPECTATOR_JOINED:
                if (!game.spectators.find((spectator) => spectator.id === args.id)) {
                    game.spectators.push(args);
                }
                gameManager.namespace.in(game.accessCode).emit(
                    globals.EVENTS.UPDATE_SPECTATORS,
                    game.spectators.map((spectator) => { return GameStateCurator.mapPerson(spectator); })
                );
                break;
            case EVENT_IDS.FETCH_GAME_STATE:
                if (!socketId) break;
                await gameManager.handleRequestForGameState(
                    game,
                    this.namespace,
                    this.logger,
                    gameManager.activeGameRunner,
                    accessCode,
                    args.personId,
                    ackFn,
                    socketId
                );
                break;
            case EVENT_IDS.START_GAME:
                await gameManager.startGame(game, gameManager.namespace);
                if (ackFn) {
                    ackFn();
                }
                break;
            case EVENT_IDS.PAUSE_TIMER:
                await gameManager.pauseTimer(game, this.logger);
                break;
            case EVENT_IDS.RESUME_TIMER:
                await gameManager.resumeTimer(game, this.logger);
                break;
            case EVENT_IDS.GET_TIME_REMAINING:
                await gameManager.getTimeRemaining(game, socketId);
                break;
            case EVENT_IDS.KILL_PLAYER:
                await gameManager.killPlayer(socketId, game, game.people.find((person) => person.id === args.personId), gameManager.namespace, this.logger);
                break;
            case EVENT_IDS.REVEAL_PLAYER:
                await gameManager.revealPlayer(game, args.personId);
                break;
            case EVENT_IDS.TRANSFER_MODERATOR:
                let person = game.people.find((person) => person.id === args.personId);
                if (!person) {
                    person = game.spectators.find((spectator) => spectator.id === args.personId);
                }
                await gameManager.transferModeratorPowers(socketId, game, person, gameManager.namespace, this.logger);
                break;
            case EVENT_IDS.END_GAME:
                await gameManager.endGame(game);
                if (ackFn) {
                    ackFn();
                }
                break;
            default:
                break;
        }
    }
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

module.exports = SocketManager;
