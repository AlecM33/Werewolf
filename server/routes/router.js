const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/', function (request, response) {
    response.sendFile(path.join(__dirname, '../../client/views/home.html'));
});

router.get('/create', function (request, response) {
    response.sendFile(path.join(__dirname, '../../client/views/create.html'));
});

module.exports = router;
