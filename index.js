'use strict';

const express = require('express');
const app = express();
const ServerBootstrapper = require('./server/modules/ServerBootstrapper');

app.use(express.json({ limit: '10kb' }));

const args = ServerBootstrapper.processCLIArgs();

const logger = require('./server/modules/Logger')(args.logLevel);
logger.info('LOG LEVEL IS: ' + args.logLevel);

const port = parseInt(process.env.PORT) || args.port || 8080;

const webServer = ServerBootstrapper.createServerWithCorrectHTTPProtocol(app, args.useHttps, args.port, logger);
const singletons = ServerBootstrapper.singletons(logger);

const socketServer = singletons.socketManager.createSocketServer(webServer, app, port);
singletons.gameManager.setGameSocketNamespace(singletons.socketManager.createGameSocketNamespace(socketServer, logger, singletons.gameManager));
ServerBootstrapper.establishRouting(app, express);

app.set('port', port);

webServer.listen(app.get('port'), function () {
    logger.info(`Starting server on port ${app.get('port')}`);
});
