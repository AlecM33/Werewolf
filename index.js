'use strict';

const express = require('express');
const path = require('path');
const app = express();
const GameManager = require('./server/modules/GameManager.js');
const SocketManager = require('./server/modules/SocketManager.js');
const globals = require('./server/config/globals');
const ServerBootstrapper = require('./server/modules/ServerBootstrapper');

app.use(express.json());

const args = ServerBootstrapper.processCLIArgs();

const logger = require('./server/modules/Logger')(args.logLevel);
logger.info('LOG LEVEL IS: ' + args.logLevel);

const index = ServerBootstrapper.createServerWithCorrectHTTPProtocol(app, args.useHttps, args.port, logger);

app.set('port', parseInt(process.env.PORT) || args.port || 8080);

const inGameSocketServer = ServerBootstrapper.createSocketServer(index, app, args.port, logger);
const gameNamespace = ServerBootstrapper.createGameSocketNamespace(inGameSocketServer, logger);

let gameManager;

/* Instantiate the singleton game manager */
if (process.env.NODE_ENV.trim() === 'development') {
    gameManager = new GameManager(logger, globals.ENVIRONMENT.LOCAL, gameNamespace).getInstance();
} else {
    gameManager = new GameManager(logger, globals.ENVIRONMENT.PRODUCTION, gameNamespace).getInstance();
}

/* Instantiate the singleton socket manager */
const socketManager = new SocketManager(logger, inGameSocketServer).getInstance();

gameNamespace.on('connection', function (socket) {
    socket.on('disconnecting', (reason) => {
        logger.trace('client socket disconnecting because: ' + reason);
    });
    gameManager.addGameSocketHandlers(gameNamespace, socket);
});

/* api endpoints */
const games = require('./server/api/GamesAPI');
const admin = require('./server/api/AdminAPI');
app.use('/api/games', games);
app.use('/api/admin', admin);

/* serve all the app's pages */
app.use('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, './manifest.json'));
});

app.use('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, './client/favicon_package/favicon.ico'));
});

const router = require('./server/routes/router');
app.use('', router);

app.use('/dist', express.static(path.join(__dirname, './client/dist')));

// set up routing for static content that isn't being bundled.
app.use('/images', express.static(path.join(__dirname, './client/src/images')));
app.use('/styles', express.static(path.join(__dirname, './client/src/styles')));
app.use('/webfonts', express.static(path.join(__dirname, './client/src/webfonts')));
app.use('/robots.txt', (req, res) => {
    res.sendFile(path.join(__dirname, './client/robots.txt'));
});

app.use(function (req, res) {
    res.sendFile(path.join(__dirname, './client/src/views/404.html'));
});

index.listen(app.get('port'), function () {
    logger.info(`Starting server on port ${app.get('port')}`);
});
