const express = require('express');
const router = express.Router();
const debugMode = Array.from(process.argv.map((arg) => arg.trim().toLowerCase())).includes('debug');
const logger = require('../modules/logger')(debugMode);
const GameManager = require('../modules/GameManager.js');

const gameManager = new GameManager().getInstance();

router.post('/create', function (req, res) {
    const gameCreationPromise = gameManager.createGame(req.body, false);
    gameCreationPromise.then((result) => {
        if (result instanceof Error) {
            res.status(500).send();
        } else {
            res.send(result); // game was created successfully, and access code was returned
        }
    });
});

module.exports = router;
