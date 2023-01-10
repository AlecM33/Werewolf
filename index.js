'use strict';

const main = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const express = require('express');
            const app = express();
            const ServerBootstrapper = require('./server/modules/ServerBootstrapper');
            const globals = require('./server/config/globals');

            app.use(express.json({limit: '10kb'}));

            const args = ServerBootstrapper.processCLIArgs();

            const logger = require('./server/modules/Logger')(args.logLevel);
            logger.info('LOG LEVEL IS: ' + args.logLevel);

            const port = parseInt(process.env.PORT) || args.port || 8080;

            const webServer = ServerBootstrapper.createServerWithCorrectHTTPProtocol(app, args.useHttps, args.port, logger);
            const singletons = ServerBootstrapper.singletons(logger, (() => {
                let id = '';
                for (let i = 0; i < globals.INSTANCE_ID_LENGTH; i ++) {
                    id += globals.INSTANCE_ID_CHAR_POOL[Math.floor(Math.random() * globals.INSTANCE_ID_CHAR_POOL.length)];
                }
                return id;
            })());

            await singletons.activeGameRunner.client.connect();
            console.log('Root Redis client connected');
            await singletons.activeGameRunner.refreshActiveGames();
            await singletons.activeGameRunner.createGameSyncSubscriber(singletons.gameManager, singletons.socketManager);
            await singletons.socketManager.createRedisPublisher();
            await singletons.gameManager.createRedisPublisher();

            const socketServer = singletons.socketManager.createSocketServer(webServer, app, port);
            singletons.gameManager.setGameSocketNamespace(singletons.socketManager.createGameSocketNamespace(socketServer, logger, singletons.gameManager));
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
}

main()
    .then(() => console.log('Server startup complete.'))
    .catch((e) => console.error('SERVER FAILED TO START: ' + e));
