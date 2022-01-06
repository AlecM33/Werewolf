const express = require('express');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const GameManager  = require('./modules/GameManager.js');
const globals = require('./config/globals');
const ServerBootstrapper = require('./modules/ServerBootstrapper');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

const args = ServerBootstrapper.processCLIArgs();

const logger = require('./modules/Logger')(args.logLevel);
logger.info('LOG LEVEL IS: ' + args.logLevel);

const main = ServerBootstrapper.createServerWithCorrectHTTPProtocol(app, args.useHttps, args.port, logger)

app.set('port', args.port);

const inGameSocketServer = ServerBootstrapper.createSocketServer(main, app, args.port);

inGameSocketServer.on('connection', function (socket) {
    gameManager.addGameSocketHandlers(inGameSocketServer, socket);
});

let gameManager;

/* Instantiate the singleton game manager */
if (process.env.NODE_ENV.trim() === 'development') {
    gameManager = new GameManager(logger, globals.ENVIRONMENT.LOCAL).getInstance();
} else {
    gameManager = new GameManager(logger, globals.ENVIRONMENT.PRODUCTION).getInstance();
}

/* api endpoints */
const games = require('./api/GamesAPI');
app.use('/api/games', games);

/* serve all the app's pages */
app.use('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, '../manifest.json'));
});

app.use('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/favicon_package/favicon.ico'));
});

const router = require('./routes/router');
app.use('', router);

app.use('/dist', express.static(path.join(__dirname, '../client/dist')));

// set up routing for static content that isn't being bundled.
app.use('/images', express.static(path.join(__dirname, '../client/src/images')));
app.use('/styles', express.static(path.join(__dirname, '../client/src/styles')));
app.use('/webfonts', express.static(path.join(__dirname, '../client/src/webfonts')));
app.use('/robots.txt', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/robots.txt'));
});

app.use(function (req, res) {
    res.sendFile(path.join(__dirname, '../client/src/views/404.html'));
});

main.listen(args.port, function () {
    logger.info(`Starting server on port ${args.port}` );
});
