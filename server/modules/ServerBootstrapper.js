const LOG_LEVEL = require('../config/globals').LOG_LEVEL;
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const ServerBootstrapper = {
    processCLIArgs: () => {
        try {
            const args = Array.from(process.argv.map((arg) => arg.trim().toLowerCase()));
            const useHttps = args.includes('protocol=https');
            const port = process.env.PORT || args
                .filter((arg) => {
                    return /port=\d+/.test(arg);
                })
                .map((arg) => {
                    return /port=(\d+)/.exec(arg)[1];
                })[0] || 5000;
            const logLevel = process.env.LOG_LEVEL || args
                .filter((arg) => {
                    return /loglevel=[a-zA-Z]+/.test(arg);
                })
                .map((arg) => {
                    return /loglevel=([a-zA-Z]+)/.exec(arg)[1];
                })[0] || LOG_LEVEL.INFO;

            return {
                useHttps: useHttps,
                port: port,
                logLevel: logLevel
            };
        } catch (e) {
            throw new Error('Your server run command is malformed. Consult the codebase wiki for proper usage. Error: ' + e);
        }
    },

    createServerWithCorrectHTTPProtocol: (app, useHttps, port, logger) => {
        let main;
        if (process.env.NODE_ENV.trim() === 'development') {
            logger.info('starting main in DEVELOPMENT mode.');
            if (
                useHttps
                && fs.existsSync(path.join(__dirname, '../../client/certs/localhost-key.pem'))
                && fs.existsSync(path.join(__dirname, '../../client/certs/localhost.pem'))
            ) {
                const key = fs.readFileSync(path.join(__dirname, '../../client/certs/localhost-key.pem'), 'utf-8');
                const cert = fs.readFileSync(path.join(__dirname, '../../client/certs/localhost.pem'), 'utf-8');
                logger.info('local certs detected. Using HTTPS.');
                main = https.createServer({ key, cert }, app);
                logger.info(`navigate to https://localhost:${port}`);
            } else {
                logger.info('https not specified or no local certs detected. Certs should reside in /client/certs. Using HTTP.');
                main = http.createServer(app);
                logger.info(`navigate to http://localhost:${port}`);
            }
        } else {
            logger.warn('starting main in PRODUCTION mode. This should not be used for local development.');
            main = http.createServer(app);
            app.use(function (req, res, next) {
                const schema = (req.headers['x-forwarded-proto'] || '').toLowerCase();
                if (!req.path.includes('/_ah/start') && req.headers.host.indexOf('localhost') < 0 && schema !== 'https') {
                    res.redirect('https://' + req.headers.host + req.url);
                } else {
                    next();
                }
            });
            app.use(function (req, res, next) {
                let nonce = crypto.randomBytes(16).toString('base64');
                res.setHeader(
                    'Content-Security-Policy',
                    "default-src 'self'; font-src 'self' https://fonts.gstatic.com/; img-src 'self' https://img.buymeacoffee.com;" +
                    " script-src 'self' https://cdnjs.buymeacoffee.com; style-src 'self' https://cdnjs.buymeacoffee.com https://fonts.googleapis.com/ 'nonce-" + nonce + "'; frame-src 'self'"
                );
                next();
            });
        }

        return main;
    },

    createSocketServer: (main, app, port) => {
        let io;
        if (process.env.NODE_ENV.trim() === 'development') {
            io = require('socket.io')(main, {
                cors: { origin: 'http://localhost:' + port }
            });
        } else {
            io = require('socket.io')(main, {
                cors: { origin: 'https://playwerewolf.uk.r.appspot.com' }
            });
        }

        return io.of('/in-game');
    }
};

module.exports = ServerBootstrapper;
