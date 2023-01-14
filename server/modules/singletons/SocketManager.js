const globals = require('../../config/globals');
const EVENT_IDS = globals.EVENT_IDS;
const { RateLimiterMemory } = require('rate-limiter-flexible');
const redis = require('redis');
const Events = require('../Events');

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
                if (globals.TIMER_EVENTS().includes(eventId)) {
                    await this.handleAndSyncTimerEvent(eventId, game, socket, args, ackFn, false);
                } else {
                    await this.handleAndSyncSocketEvent(eventId, game, socket, args, ackFn, false);
                }
            } else {
                ackFn(null);
            }
        });
    };

    handleAndSyncSocketEvent = async (eventId, game, socket, socketArgs, ackFn) => {
        await this.handleEventById(eventId, game, socket?.id, game.accessCode, socketArgs, ackFn, false);
        /* This server should publish events initiated by a connected socket to Redis for consumption by other instances. */
        if (globals.SYNCABLE_EVENTS().includes(eventId)) {
            await this.gameManager.refreshGame(game);
            await this.publisher?.publish(
                globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                game.accessCode + ';' + eventId + ';' + JSON.stringify(socketArgs) + ';' + this.instanceId
            );
        }
    }

    handleAndSyncTimerEvent = async (eventId, game, socketId, accessCode, socketArgs, ackFn, syncOnly) => {
        switch (eventId) {
            case EVENT_IDS.PAUSE_TIMER:
                await this.gameManager.pauseTimer(game, this.logger);
                break;
            case EVENT_IDS.RESUME_TIMER:
                await this.gameManager.resumeTimer(game, this.logger);
                break;
            default:
                break;
        }
    }

    handleEventById = async (eventId, game, socketId, accessCode, socketArgs, ackFn, syncOnly) => {
        this.logger.trace('ARGS TO HANDLER: ' + JSON.stringify(socketArgs));
        const event = Events.find((event) => event.id === eventId);
        const additionalVars = {
            gameManager: this.gameManager,
            activeGameRunner: this.activeGameRunner,
            socketManager: this,
            socketId: socketId,
            ackFn: ackFn,
            logger: this.logger,
            instanceId: this.instanceId
        };
        if (event) {
            if (!syncOnly) {
                await event.stateChange(game, socketArgs, additionalVars);
            }
            await event.communicate(game, socketArgs, additionalVars);
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
