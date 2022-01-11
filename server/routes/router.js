const express = require('express');
const router = express.Router({ strict: true });
const path = require('path');

router.get('/', function (request, response) {
    response.sendFile(path.join(__dirname, '../../client/src/views/home.html'));
});

router.get('/create', function (request, response) {
    response.sendFile(path.join(__dirname, '../../client/src/views/create.html'));
});

router.get('/how-to-use', function (request, response) {
    response.sendFile(path.join(__dirname, '../../client/src/views/how-to-use.html'));
});

router.get('/game/:code', function (request, response) {
    response.sendFile(path.join(__dirname, '../../client/src/views/game.html'));
});

router.get('/liveness_check', (req, res) => {
    res.sendStatus(200);
});

router.get('/readiness_check', (req, res) => {
    res.sendStatus(200);
});


module.exports = router;
