const express = require('express');
const staticRouter = express.Router();
const path = require('path');
const checkIfFileExists = require("./util");

staticRouter.use('/styles/*', (req, res) => {
    let filePath = path.join(__dirname, ('../../client/' + req.baseUrl));
    let extension = path.extname(filePath);
    checkIfFileExists(filePath).then((fileExists) => {
        if (fileExists && (extension === '.css')) {
            res.sendFile(filePath);
        } else {
            res.sendStatus(404);
        }
    });
});

staticRouter.use('/client/webfonts/*', (req, res) => {
    let filePath = path.join(__dirname, ('../' + req.baseUrl));
    let extension = path.extname(filePath);
    checkIfFileExists(filePath).then((fileExists) => {
        if (fileExists && (extension === '.ttf' || extension === '.woff2')) {
            res.sendFile(filePath);
        } else {
            res.sendStatus(404);
        }
    });
});

staticRouter.use('/client/images/*', (req, res) => {
    let filePath = path.join(__dirname, ('../' + req.baseUrl));
    let extension = path.extname(filePath);
    checkIfFileExists(filePath).then((fileExists) => {
        if (fileExists && (extension === '.svg' || extension === '.png' || extension === '.jpg')) {
            res.sendFile(filePath);
        } else {
            res.sendStatus(404);
        }
    });
});

staticRouter.use('/scripts/*', (req, res) => {
    let filePath = path.join(__dirname, ('../../client/' + req.baseUrl));
    let extension = path.extname(filePath);
    checkIfFileExists(filePath).then((fileExists) => {
        if (fileExists && (extension === '.js')) {
            res.sendFile(filePath);
        } else {
            res.sendStatus(404);
        }
    });
});

staticRouter.use('/webfonts/*', (req, res) => {
    let filePath = path.join(__dirname, ('../../client/' + req.baseUrl));
    let extension = path.extname(filePath);
    checkIfFileExists(filePath).then((fileExists) => {
        if (fileExists && (extension === '.woff2')) {
            res.sendFile(filePath);
        } else {
            res.sendStatus(404);
        }
    });
});

staticRouter.use('/views/*', (req, res) => {
    let filePath = path.join(__dirname, ('../../client/' + req.baseUrl));
    let extension = path.extname(filePath);
    checkIfFileExists(filePath).then((fileExists) => {
        if (fileExists && (extension === '.html')) {
            res.sendFile(filePath);
        } else {
            res.sendFile('../views/404.html');
        }
    });
});


staticRouter.use('/config/*', (req, res) => {
    let filePath = path.join(__dirname, ('../../client/' + req.baseUrl));
    let extension = path.extname(filePath);
    checkIfFileExists(filePath).then((fileExists) => {
        if (fileExists && (extension === '.js')) {
            res.sendFile(filePath);
        } else {
            res.sendFile('../views/404.html');
        }
    });
});

staticRouter.use('/modules/*', (req, res) => {
    let filePath = path.join(__dirname, ('../../client/' + req.baseUrl));
    let extension = path.extname(filePath);
    checkIfFileExists(filePath).then((fileExists) => {
        if (fileExists && (extension === '.js')) {
            res.sendFile(filePath);
        } else {
            res.sendFile('../views/404.html');
        }
    });
});

module.exports = staticRouter;
