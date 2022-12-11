const express = require('express');
const router = express.Router();
const debugMode = Array.from(process.argv.map((arg) => arg.trim().toLowerCase())).includes('debug');
const logger = require('../modules/Logger')(debugMode);
const socketManager = new (require('../modules/SocketManager.js'))().getInstance();
const gameManager = new (require('../modules/GameManager.js'))().getInstance();
const globals = require('../config/globals.js');
const cors = require('cors');

const KEY = process.env.NODE_ENV.trim() === 'development'
    ? globals.MOCK_AUTH
    : process.env.ADMIN_KEY;

router.use(cors(globals.CORS));

router.use((req, res, next) => {
    if (isAuthorized(req)) {
        next();
    } else {
        res.status(401).send('You are not authorized to make this request.');
    }
});

router.post('/sockets/broadcast', (req, res, next) => {
    globals.CONTENT_TYPE_VALIDATOR(req, res, next);
});

// TODO: implement client-side display of this message.
router.post('/sockets/broadcast', function (req, res) {
    logger.info('admin user broadcasting message: ' + req.body?.message);
    socketManager.broadcast(req.body?.message);
    res.status(201).send('Broadcasted message to all connected sockets: ' + req.body?.message);
});

router.get('/games/state', function (req, res) {
    const gamesArray = [];
    for (const key of gameManager.activeGameRunner.activeGames.keys()) {
        gamesArray.push(gameManager.activeGameRunner.activeGames.get(key));
    }
    res.status(200).send(gamesArray);
});

/* validates Bearer Auth */
function isAuthorized (req) {
    const header = req.headers.authorization;
    if (header) {
        const token = header.split(/\s+/).pop() || '';
        const decodedToken = Buffer.from(token, 'base64').toString();
        return decodedToken.trim() === KEY.trim();
    }

    return false;
}

module.exports = router;
