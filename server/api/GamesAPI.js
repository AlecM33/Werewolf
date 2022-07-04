const express = require('express');
const router = express.Router();
const debugMode = Array.from(process.argv.map((arg) => arg.trim().toLowerCase())).includes('debug');
const logger = require('../modules/Logger')(debugMode);
const GameManager = require('../modules/GameManager.js');
const rateLimit = require('express-rate-limit').default;
const globals = require('../config/globals.js');
const cors = require('cors');

const gameManager = new GameManager().getInstance();

const apiLimiter = rateLimit({
    windowMs: 60000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

const gameEndpointLimiter = rateLimit({ // further limit the rate of game creation to 30 games per 10 minutes.
    windowMs: 600000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false
});

router.use(cors(globals.CORS));
router.options('/:code/players', cors(globals.CORS));
router.options('/create', cors(globals.CORS));
router.options('/restart', cors(globals.CORS));

if (process.env.NODE_ENV.trim() === 'production') {
    router.use(apiLimiter);
    router.use('/create', gameEndpointLimiter);
}

router.post('/create', function (req, res) {
    logger.trace('Received request to create new game: ' + JSON.stringify(req.body, null, 4));
    const gameCreationPromise = gameManager.createGame(req.body, false);
    gameCreationPromise.then((result) => {
        if (result instanceof Error) {
            res.status(500).send();
        } else {
            res.send(result); // game was created successfully, and access code was returned
        }
    }).catch((e) => {
        if (e === globals.ERROR_MESSAGE.BAD_CREATE_REQUEST) {
            res.status(400).send(globals.ERROR_MESSAGE.BAD_CREATE_REQUEST);
        }
    });
});

router.get('/:code/availability', function (req, res) {
    const availabilityPromise = gameManager.checkAvailability(req.params.code);
    availabilityPromise.then((result) => {
        if (result === 404) {
            res.status(404).send();
        } else if (result instanceof Error) {
            res.status(400).send(result.message);
        } else if (typeof result === 'object') {
            logger.debug(result);
            res.status(200).send(result);
        } else {
            res.status(500).send();
        }
    });
});

router.patch('/:code/players', function (req, res) {
    if (
        req.body === null
        || !validateAccessCode(req.body.accessCode)
        || !validateName(req.body.playerName)
        || !validateCookie(req.body.localCookie)
        || !validateCookie(req.body.sessionCookie)
    ) {
        res.status(400).send();
    } else {
        const game = gameManager.activeGameRunner.activeGames[req.body.accessCode];
        if (game) {
            const inUseCookie = gameManager.environment === globals.ENVIRONMENT.PRODUCTION ? req.body.localCookie : req.body.sessionCookie;
            gameManager.joinGame(game, req.body.playerName, inUseCookie).then((data) => {
                res.status(200).send({ cookie: data, environment: gameManager.environment });
            }).catch((code) => {
                res.status(code).send();
            });
        } else {
            res.status(404).send();
        }
    }
});

router.patch('/:code/restart', function (req, res) {
    if (
        req.body === null
        || !validateAccessCode(req.body.accessCode)
        || !validateName(req.body.playerName)
        || !validateCookie(req.body.localCookie)
        || !validateCookie(req.body.sessionCookie)
    ) {
        res.status(400).send();
    } else {
        const game = gameManager.activeGameRunner.activeGames[req.body.accessCode];
        if (game) {
            gameManager.restartGame(game, gameManager.namespace).then((data) => {
                res.status(200).send();
            }).catch((code) => {
                res.status(code).send();
            });
        } else {
            res.status(404).send();
        }
    }
});

router.get('/environment', function (req, res) {
    res.status(200).send(gameManager.environment);
});

function validateName (name) {
    return typeof name === 'string' && name.length > 0 && name.length <= 30;
}

function validateCookie (cookie) {
    return cookie === null || cookie === false || (typeof cookie === 'string' && cookie.length === globals.USER_SIGNATURE_LENGTH);
}

function validateAccessCode (accessCode) {
    return /^[a-zA-Z0-9]+$/.test(accessCode) && accessCode.length === globals.ACCESS_CODE_LENGTH;
}

module.exports = router;
