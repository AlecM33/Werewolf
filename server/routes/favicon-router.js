const express = require('express');
const faviconRouter = express.Router();
const path = require('path');
const checkIfFileExists = require("./util");

faviconRouter.use('/client/favicon_package/*', (req, res) => {
    let filePath = path.join(__dirname, ('../../' + req.baseUrl));
    let extension = path.extname(filePath);
    checkIfFileExists(filePath).then((fileExists) => {
        if (fileExists && (extension === '.png' || extension === '.ico' || extension === '.svg' || extension === 'xml')) {
            res.sendFile(filePath);
        } else {
            res.sendStatus(404);
        }
    });
});

module.exports = faviconRouter;
