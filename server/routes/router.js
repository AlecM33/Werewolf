const express = require('express');
const router = express.Router({ strict: true });
const path = require('path');
const rateLimit = require('express-rate-limit').default;

const htmlPageLimiter = rateLimit({
    windowMs: 60000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
});

router.get('/', htmlPageLimiter, function (request, response) {
    response.sendFile(path.join(__dirname, '../../client/src/views/home.html'));
});

router.get('/create', htmlPageLimiter, function (request, response) {
    response.sendFile(path.join(__dirname, '../../client/src/views/create.html'));
});

router.get('/join/:code', htmlPageLimiter, function (request, response) {
    response.sendFile(path.join(__dirname, '../../client/src/views/join.html'));
});

router.get('/how-to-use', htmlPageLimiter, function (request, response) {
    response.sendFile(path.join(__dirname, '../../client/src/views/how-to-use.html'));
});

router.get('/game/:code', htmlPageLimiter, function (request, response) {
    response.sendFile(path.join(__dirname, '../../client/src/views/game.html'));
});

router.get('/liveness_check', htmlPageLimiter, (req, res) => {
    res.sendStatus(200);
});

router.get('/readiness_check', htmlPageLimiter, (req, res) => {
    res.sendStatus(200);
});

module.exports = router;
