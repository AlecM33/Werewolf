const express = require('express');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const socketIO = require('socket.io');
const app = express();
const bodyParser = require('body-parser');
const GameManager = require('./modules/GameManager.js');
const globals = require('./config/globals');
// const QueueManager = require('./modules/managers/QueueManager');

app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));

let main, environment;

let args = Array.from(process.argv.map((arg) => arg.trim().toLowerCase()));

const localServer = args.includes('local');
const useHttps = args.includes('https');
const port = process.env.PORT || args
    .filter((arg) => {
        return /port=\d+/.test(arg);
    })
    .map((arg) => {
        return /port=(\d+)/.exec(arg)[1];
    })[0] || 5000;
const logLevel = process.env.LOG_LEVEL || args
    .filter((arg) => {
        return /loglevel=[a-zA-Z]+/.test(arg);
    })
    .map((arg) => {
        return /loglevel=([a-zA-Z]+)/.exec(arg)[1];
    })[0] || globals.LOG_LEVEL.INFO;

const logger = require('./modules/Logger')(logLevel);

logger.log('LOG LEVEL IS: ' + logLevel)

if (localServer) {
    environment = globals.ENVIRONMENT.LOCAL;
    logger.log('starting main in LOCAL mode.');
    if (useHttps && fs.existsSync(path.join(__dirname, './certs/localhost-key.pem')) && fs.existsSync(path.join(__dirname, './certs/localhost.pem'))) {
        const key = fs.readFileSync(path.join(__dirname, './certs/localhost-key.pem'), 'utf-8');
        const cert = fs.readFileSync(path.join(__dirname, './certs/localhost.pem'), 'utf-8');
        logger.log('local certs detected. Using HTTPS.');
        main = https.createServer({ key, cert }, app);
        logger.log(`navigate to https://localhost:${port}`);
    } else {
        logger.log('https not specified or no local certs detected. Using HTTP.');
        main = http.createServer(app);
        logger.log(`navigate to http://localhost:${port}`);
    }
} else {
    environment = globals.ENVIRONMENT.PRODUCTION;
    logger.warn('starting main in PRODUCTION mode. This should not be used for local development.');
    main = http.createServer(app);
    const secure = require('express-force-https');
    app.use(secure);
}

const io = socketIO(main);

app.set('port', port);

const inGame = io.of('/in-game');


/* Instantiate the singleton game manager */
const gameManager = new GameManager(logger, environment).getInstance();

/* Instantiate the singleton queue manager */
//const queueManager = new QueueManager(matchmaking, logger).getInstance();


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
const faviconRouter = require('./routes/favicon-router');
const staticRouter = require('./routes/static-router');

app.use('', router);
app.use('', staticRouter);
app.use('', faviconRouter);

app.use(function (req, res) {
    res.sendFile(path.join(__dirname, '../client/views/404.html'));
});

inGame.on('connection', function (socket) {
    gameManager.addGameSocketHandlers(inGame, socket);
});

main.listen(port, function () {
    logger.log(`Starting server on port ${port}` );
});
