const express = require('express');
const router = express.Router();
const debugMode = Array.from(process.argv.map((arg) => arg.trim().toLowerCase())).includes('debug');
const logger = require('../modules/Logger')(debugMode);
const GameManager = require('../modules/GameManager.js');

const gameManager = new GameManager().getInstance();

router.post('/create', function (req, res) {
    logger.debug('Received request to create new game: ' + JSON.stringify(req.body, null, 4));
    const gameCreationPromise = gameManager.createGame(req.body, false);
    gameCreationPromise.then((result) => {
        if (result instanceof Error) {
            res.status(500).send();
        } else {
            res.send(result); // game was created successfully, and access code was returned
        }
    });
});

router.get('/availability/:code', function (req, res) {
    const joinGamePromise = gameManager.joinGame(req.params.code);
    joinGamePromise.then((result) => {
        if (result === 404) {
            res.status(404).send();
        } else if (result instanceof Error) {
            res.status(400).send(result.message);
        } else if (typeof result === "string") {
            logger.debug(result);
            res.status(200).send(result);
        } else {
            res.status(500).send();
        }
    });
});

module.exports = router;
