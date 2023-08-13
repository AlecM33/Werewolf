const express = require('express');
const router = express.Router();
const debugMode = Array.from(process.argv.map((arg) => arg.trim().toLowerCase())).includes('debug');
const logger = require('../modules/Logger')(debugMode);
const eventManager = (require('../modules/singletons/EventManager.js')).instance;
const cors = require('cors');
const { CORS_OPTIONS, CONTENT_TYPE_VALIDATOR } = require('../config/globals');

router.use(cors(CORS_OPTIONS));

router.post('/sockets/broadcast', (req, res, next) => {
    CONTENT_TYPE_VALIDATOR(req, res, next);
});

// TODO: implement client-side display of this message.
router.post('/sockets/broadcast', function (req, res) {
    logger.info('admin user broadcasting message: ' + req.body?.message);
    eventManager.broadcast(req.body?.message);
    res.status(201).send('Broadcasted message to all connected sockets: ' + req.body?.message);
});

router.get('/games/state', async (req, res) => {
    const gamesArray = [];
    const keys = await eventManager.publisher.keys('*');
    if (keys.length > 0) {
        const values = await eventManager.publisher.mGet(keys);
        values.forEach((v) => {
            let parsedGame;
            try {
                parsedGame = JSON.parse(v);
            } catch (e) {
                logger.error(e);
            }
            if (parsedGame) {
                gamesArray.push(parsedGame);
            }
        });
    }
    res.status(200).send(gamesArray);
});

module.exports = router;
