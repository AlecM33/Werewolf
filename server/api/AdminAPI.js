const express = require('express');
const router = express.Router();
const debugMode = Array.from(process.argv.map((arg) => arg.trim().toLowerCase())).includes('debug');
const logger = require('../modules/Logger')(debugMode);
const socketManager = (require('../modules/SocketManager.js')).instance;
const gameManager = (require('../modules/GameManager.js')).instance;
const globals = require('../config/globals.js');
const cors = require('cors');

router.use(cors(globals.CORS));

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

module.exports = router;
