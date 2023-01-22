'use strict';

(async () => {
    const express = require('express');
    const app = express();
    const ServerBootstrapper = require('./server/modules/ServerBootstrapper');
    const timerManager = require('./server/modules/singletons/TimerManager');
    const GameManager = require('./server/modules/singletons/GameManager');
    const eventManager = require('./server/modules/singletons/EventManager');
    const globals = require('./server/config/globals');
    const args = ServerBootstrapper.processCLIArgs();
    const logger = require('./server/modules/Logger')(args.logLevel);
    const port = parseInt(process.env.PORT) || args.port || 8080;
    const webServer = ServerBootstrapper.createServerWithCorrectHTTPProtocol(app, args.useHttps, args.port, logger);
    const instanceId = (() => {
        let id = '';
        for (let i = 0; i < globals.INSTANCE_ID_LENGTH; i ++) {
            id += globals.INSTANCE_ID_CHAR_POOL[Math.floor(Math.random() * globals.INSTANCE_ID_CHAR_POOL.length)];
        }
        return id;
    })()
    const singletons = ServerBootstrapper.singletons(logger, instanceId);

    app.use(express.json({limit: '10kb'}));

    logger.info('LOG LEVEL IS: ' + args.logLevel);

    singletons.gameManager.timerManager = timerManager.instance;
    singletons.gameManager.eventManager = eventManager.instance;
    singletons.eventManager.timerManager = timerManager.instance;
    singletons.eventManager.gameManager = GameManager.instance;

    await singletons.eventManager.createRedisPublisher();
    await singletons.eventManager.createGameSyncSubscriber(singletons.gameManager, singletons.eventManager);
    
    const socketServer = singletons.eventManager.createSocketServer(webServer, app, port);
    singletons.gameManager.setGameSocketNamespace(singletons.eventManager.createGameSocketNamespace(socketServer, logger, singletons.gameManager));
    ServerBootstrapper.establishRouting(app, express);

    app.set('port', port);

    await (async () => {
        return new Promise((resolve, reject) => {
            webServer.listen(app.get('port'), () => {
                logger.info(`Starting server on port ${app.get('port')}`);
                resolve();
            });
        });
    })();
})().then(() => console.log('Server startup complete.'))
    .catch((e) => console.error('SERVER FAILED TO START: ' + e));
