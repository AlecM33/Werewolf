'use strict';

(async () => {
    return new Promise(async (resolve, reject) => {
        try {
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

            try {
                await singletons.eventManager.client.connect();
                logger.info('Root Redis client connected');
            } catch(e) {
                reject(new Error('UNABLE TO CONNECT TO REDIS because: '+ e));
            }

            await singletons.eventManager.createGameSyncSubscriber(singletons.gameManager, singletons.eventManager);
            await singletons.eventManager.createRedisPublisher();

            const socketServer = singletons.eventManager.createSocketServer(webServer, app, port);
            singletons.gameManager.setGameSocketNamespace(singletons.eventManager.createGameSocketNamespace(socketServer, logger, singletons.gameManager));
            ServerBootstrapper.establishRouting(app, express);

            app.set('port', port);

            await webServer.listen(app.get('port'), function () {
                logger.info(`Starting server on port ${app.get('port')}`);
                resolve();
            });
        } catch(e) {
            reject(e);
        }
    })
})().then(() => console.log('Server startup complete.'))
    .catch((e) => console.error('SERVER FAILED TO START: ' + e));
