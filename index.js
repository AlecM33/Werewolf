'use strict';

(async () => {
    const express = require('express');
    const app = express();
    const ServerBootstrapper = require('./server/modules/ServerBootstrapper');
    const { PRIMITIVES } = require('./server/config/globals');
    const args = ServerBootstrapper.processCLIArgs();
    const logger = require('./server/modules/Logger')(args.logLevel);
    const port = parseInt(process.env.PORT) || args.port || 8080;
    const webServer = ServerBootstrapper.createServerWithCorrectHTTPProtocol(app, args.useHttps, port, logger);
    const singletons = ServerBootstrapper.singletons(logger, (() => {
        let id = '';
        for (let i = 0; i < PRIMITIVES.INSTANCE_ID_LENGTH; i ++) {
            id += PRIMITIVES.INSTANCE_ID_CHAR_POOL[Math.floor(Math.random() * PRIMITIVES.INSTANCE_ID_CHAR_POOL.length)];
        }
        return id;
    })());
    ServerBootstrapper.injectDependencies(singletons);

    app.use(express.json({limit: '10kb'}));

    logger.info('LOG LEVEL IS: ' + args.logLevel);

    await singletons.eventManager.createRedisPublisher();
    await singletons.eventManager.createGameSyncSubscriber(singletons.gameManager, singletons.eventManager);

    const socketServer = singletons.eventManager.createSocketServer(webServer, app, port);
    singletons.gameManager.setGameSocketNamespace(
        singletons.eventManager.createGameSocketNamespace(socketServer, logger, singletons.gameManager)
    );
    ServerBootstrapper.establishRouting(app, express);

    app.set('port', port);

    return new Promise((resolve, reject) => {
        webServer.listen(app.get('port'), () => {
            logger.info(`Starting server on port ${app.get('port')}`);
            resolve();
        }).on('error', reject);
    });
})().then(() => console.log('Server startup complete.'))
    .catch((e) => {
        console.error('SERVER FAILED TO START: ' + e.stack);
        process.exit(-1);
    });
