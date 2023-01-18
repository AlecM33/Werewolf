const globals = require('../../config/globals');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const redis = require('redis');
const Events = require('../Events');

class EventManager {
    constructor (logger, instanceId) {
        if (EventManager.instance) {
            throw new Error('The server attempted to instantiate more than one EventManager.');
        }
        logger.info('CREATING SINGLETON EVENT MANAGER');
        this.logger = logger;
        this.client = redis.createClient();
        this.io = null;
        this.publisher = null;
        this.subscriber = null;
        this.timerManager = null;
        this.gameManager = null;
        this.instanceId = instanceId;
        EventManager.instance = this;
    }

    broadcast = (message) => {
        this.io?.emit(globals.EVENTS.BROADCAST, message);
    };

    createRedisPublisher = async () => {
        this.publisher = redis.createClient();
        await this.publisher.connect();
        this.logger.info('EVENT MANAGER - CREATED PUBLISHER');
    }

    createGameSyncSubscriber = async (gameManager, eventManager) => {
        this.subscriber = this.client.duplicate();
        await this.subscriber.connect();
        await this.subscriber.subscribe(globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM, async (message) => {
            this.logger.debug('MESSAGE: ' + message);
            let messageComponents, args;
            try {
                messageComponents = message.split(';', 3);
                if (messageComponents[messageComponents.length - 1] === this.instanceId) {
                    this.logger.trace('Disregarding self-authored message');
                    return;
                }
                args = JSON.parse(
                    message.slice(
                        message.indexOf(messageComponents[messageComponents.length - 1]) + (globals.INSTANCE_ID_LENGTH + 1)
                    )
                )
            } catch(e) {
                this.logger.error('MALFORMED MESSAGE RESULTED IN ERROR: ' + e + '; DISREGARDING');
                return;
            }
            if (messageComponents) {
                const game = await gameManager.getActiveGame(messageComponents[0]);
                if (game) {
                    await eventManager.handleEventById(
                        messageComponents[1],
                        messageComponents[messageComponents.length - 1],
                        game,
                        null,
                        game?.accessCode || messageComponents[0],
                        args || null,
                        null,
                        true
                    );
                }
            }
        });
        this.logger.info('EVENT MANAGER - CREATED SUBSCRIBER');
    }

    createMessageToPublish = (...args) => {
        let message = '';
        for (let i = 0; i < args.length; i ++) {
            message += args[i];
            if (i !== args.length - 1) {
                message += ';';
            }
        }
        return message;
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
        const registerSocketHandler = this.registerSocketHandler;
        registerRateLimiter(namespace, logger);
        namespace.on('connection', function (socket) {
            socket.on('disconnecting', (reason) => {
                logger.trace('client socket disconnecting because: ' + reason);
            });

            registerSocketHandler(namespace, socket, gameManager);
        });
        return server.of('/in-game');
    };

    registerSocketHandler = (namespace, socket, gameManager) => {
        socket.on(globals.SOCKET_EVENTS.IN_GAME_MESSAGE, async (eventId, accessCode, args = null, ackFn = null) => {
            const game = await gameManager.getActiveGame(accessCode);
            if (game) {
                if (globals.TIMER_EVENTS().includes(eventId)) {
                    await this.handleEventById(globals.EVENT_IDS.TIMER_EVENT, null, game, socket.id, game.accessCode, args, ackFn, true, eventId);
                } else {
                    await this.handleAndSyncSocketEvent(eventId, game, socket, args, ackFn, false);
                }
            } else {
                ackFn(null);
            }
        });
    };

    handleAndSyncSocketEvent = async (eventId, game, socket, socketArgs, ackFn) => {
        await this.handleEventById(eventId, null, game, socket?.id, game.accessCode, socketArgs, ackFn, false);
        /* This server should publish events initiated by a connected socket to Redis for consumption by other instances. */
        if (globals.SYNCABLE_EVENTS().includes(eventId)) {
            await this.gameManager.refreshGame(game);
            await this.publisher?.publish(
                globals.REDIS_CHANNELS.ACTIVE_GAME_STREAM,
                this.createMessageToPublish(game.accessCode, eventId, this.instanceId, JSON.stringify(socketArgs))
            );
        }
    }

    handleEventById = async (eventId, senderInstanceId, game, requestingSocketId, accessCode, socketArgs, ackFn, syncOnly, timerEventSubtype = null) => {
        this.logger.trace('ARGS TO HANDLER: ' + JSON.stringify(socketArgs));
        const event = Events.find((event) => event.id === eventId);
        const additionalVars = {
            gameManager: this.gameManager,
            timerManager: this.timerManager,
            eventManager: this,
            requestingSocketId: requestingSocketId,
            ackFn: ackFn,
            logger: this.logger,
            instanceId: this.instanceId,
            senderInstanceId: senderInstanceId,
            timerEventSubtype: timerEventSubtype
        };
        if (event) {
            if (!syncOnly || eventId === globals.EVENT_IDS.RESTART_GAME) {
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

module.exports = EventManager;
