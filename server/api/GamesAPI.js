const express = require('express');
const router = express.Router();
const debugMode = Array.from(process.argv.map((arg) => arg.trim().toLowerCase())).includes('debug');
const logger = require('../modules/Logger')(debugMode);
const GameManager = require('../modules/singletons/GameManager.js');
const rateLimit = require('express-rate-limit').default;
const globals = require('../config/globals.js');
const cors = require('cors');

const gameManager = GameManager.instance;

const gameCreationLimit = process.env.NODE_ENV.trim() === 'production'
    ? 20
    : 1000;

const gameEndpointLimiter = rateLimit({
    windowMs: 600000,
    max: gameCreationLimit,
    standardHeaders: true,
    legacyHeaders: false
});

router.use(cors(globals.CORS));
router.options('/:code/players', cors(globals.CORS));
router.options('/create', cors(globals.CORS));
router.options('/restart', cors(globals.CORS));

router.post('/create', (req, res, next) => {
    globals.CONTENT_TYPE_VALIDATOR(req, res, next);
});
router.patch('/players', (req, res, next) => {
    globals.CONTENT_TYPE_VALIDATOR(req, res, next);
});
router.patch('/restart', (req, res, next) => {
    globals.CONTENT_TYPE_VALIDATOR(req, res, next);
});

router.post('/create', gameEndpointLimiter, function (req, res) {
    gameManager.createGame(req.body, false).then((result) => {
        if (result instanceof Error) {
            res.status(500).send();
        } else {
            res.status(201).send(result); // game was created successfully, and access code was returned
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

router.patch('/:code/players', async function (req, res) {
    if (
        req.body === null
        || !validateAccessCode(req.body.accessCode)
        || !validateName(req.body.playerName)
        || !validateCookie(req.body.localCookie)
        || !validateCookie(req.body.sessionCookie)
        || !validateSpectatorFlag(req.body.joinAsSpectator)
    ) {
        res.status(400).send();
    } else {
        const game = await gameManager.getActiveGame(req.body.accessCode);
        if (game) {
            const inUseCookie = gameManager.environment === globals.ENVIRONMENT.PRODUCTION ? req.body.localCookie : req.body.sessionCookie;
            gameManager.joinGame(game, req.body.playerName, inUseCookie, req.body.joinAsSpectator).then((data) => {
                res.status(200).send({ cookie: data, environment: gameManager.environment });
            }).catch((data) => {
                res.status(data.status).send(data.reason);
            });
        } else {
            res.status(404).send();
        }
    }
});

router.patch('/:code/restart', async function (req, res) {
    if (
        req.body === null
        || !validateAccessCode(req.body.accessCode)
        || !validateName(req.body.playerName)
        || !validateCookie(req.body.localCookie)
        || !validateCookie(req.body.sessionCookie)
    ) {
        res.status(400).send();
    } else {
        const game = await gameManager.getActiveGame(req.body.accessCode);
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
    return cookie === null || cookie === false || (typeof cookie === 'string' && cookie.length === globals.INSTANCE_ID_LENGTH);
}

function validateAccessCode (accessCode) {
    return /^[a-zA-Z0-9]+$/.test(accessCode) && accessCode?.length === globals.ACCESS_CODE_LENGTH;
}

function validateSpectatorFlag (spectatorFlag) {
    return typeof spectatorFlag === 'boolean';
}

module.exports = router;
