const globals = require('../../config/globals');
const EVENT_IDS = globals.EVENT_IDS;
const { RateLimiterMemory } = require('rate-limiter-flexible');
const redis = require('redis');
const GameStateCurator = require("../GameStateCurator");
const Events = require("../Events");

class SocketManager {
    constructor (logger, instanceId) {
        if (SocketManager.instance) {
            throw new Error('The server attempted to instantiate more than one SocketManager.');
        }
        logger.info('CREATING SINGLETON SOCKET MANAGER');
        this.logger = logger;
        this.io = null;
        this.publisher = null;
        this.activeGameRunner = null;
        this.gameManager = null;
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

    registerHandlers = (namespace, socket) => {
        socket.on(globals.SOCKET_EVENTS.IN_GAME_MESSAGE, async (eventId, accessCode, args = null, ackFn = null) => {
            const game = await this.activeGameRunner.getActiveGame(accessCode);
            if (game) {
                await this.handleAndSyncEvent(eventId, game, socket, args, ackFn);
            } else {
                ackFn(null);
            }
        });
    };

    handleAndSyncEvent = async (eventId, game, socket, args, ackFn) => {
        await this.handleEventById(eventId, game, socket?.id, game.accessCode, args, ackFn, false);
        /* This server should publish events initiated by a connected socket to Redis for consumption by other instances. */
        if (globals.SYNCABLE_EVENTS().includes(eventId)) {
            await this.gameManager.refreshGame(game);
            this.publisher?.publish(
                globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                game.accessCode + ';' + eventId + ';' + JSON.stringify(args) + ';' + this.instanceId
            );
        }
    }

    handleEventById = async (eventId, game, socketId, accessCode, args, ackFn, syncOnly) => {
        this.logger.trace('ARGS TO HANDLER: ' + JSON.stringify(args));
        const event = Events.find((event) => event.id === eventId);
        if (event) {
            if (!syncOnly) {
                event.stateChange(game, args, this.gameManager);
            }
            event.communicate(game, args, this.gameManager);
        }
        switch (eventId) {
            case EVENT_IDS.FETCH_GAME_STATE:
                await this.gameManager.handleRequestForGameState(
                    game,
                    this.namespace,
                    this.logger,
                    this.activeGameRunner,
                    accessCode,
                    args.personId,
                    ackFn,
                    socketId
                );
                break;
            case EVENT_IDS.UPDATE_SOCKET:
                const matchingPerson = this.gameManager.findPersonByField(game, 'id', args.personId);
                if (matchingPerson) {
                    matchingPerson.socketId = args.socketId;
                }
                break;
            case EVENT_IDS.SYNC_GAME_STATE:
                const personToSync = this.gameManager.findPersonByField(game, 'id', args.personId);
                if (personToSync) {
                    this.gameManager.namespace.to(personToSync.socketId).emit(globals.EVENTS.SYNC_GAME_STATE);
                }
                break;
            case EVENT_IDS.START_GAME:
                await this.gameManager.startGame(game, this.gameManager.namespace);
                if (ackFn) {
                    ackFn();
                }
                break;
            case EVENT_IDS.PAUSE_TIMER:
                await this.gameManager.pauseTimer(game, this.logger);
                break;
            case EVENT_IDS.RESUME_TIMER:
                await this.gameManager.resumeTimer(game, this.logger);
                break;
            case EVENT_IDS.GET_TIME_REMAINING:
                await this.gameManager.getTimeRemaining(game, socketId);
                break;
            case EVENT_IDS.KILL_PLAYER:
                await this.gameManager.killPlayer(socketId, game, game.people.find((person) => person.id === args.personId), this.gameManager.namespace, this.logger);
                break;
            case EVENT_IDS.REVEAL_PLAYER:
                await this.gameManager.revealPlayer(game, args.personId);
                break;
            case EVENT_IDS.TRANSFER_MODERATOR:
                await this.gameManager.transferModeratorPowers(
                    socketId,
                    game,
                    this.gameManager?.findPersonByField(game, 'id', args.personId),
                    this.gameManager.namespace,
                    this.logger
                );
                break;
            case EVENT_IDS.END_GAME:
                await this.gameManager.endGame(game);
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
