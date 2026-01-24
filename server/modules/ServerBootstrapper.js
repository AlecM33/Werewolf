const { LOG_LEVEL, ENVIRONMENTS } = require('../config/globals');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const EventManager = require('./singletons/EventManager.js');
const GameManager = require('./singletons/GameManager.js');
const rateLimit = require('express-rate-limit').default;

const ServerBootstrapper = {

    singletons: (logger, instanceId) => {
        return {
            eventManager: new EventManager(logger, instanceId),
            gameManager: process.env.NODE_ENV.trim() === 'development'
                ? new GameManager(logger, ENVIRONMENTS.LOCAL, instanceId)
                : new GameManager(logger, ENVIRONMENTS.PRODUCTION, instanceId)
        };
    },

    injectDependencies: (singletons) => {
        const gameManager = require('./singletons/GameManager').instance;
        const eventManager = require('./singletons/EventManager').instance;
        singletons.gameManager.eventManager = eventManager;
        singletons.eventManager.gameManager = gameManager;
    },

    processCLIArgs: () => {
        try {
            const args = Array.from(process.argv.map((arg) => arg.trim().toLowerCase()));
            const useHttps = args.includes('protocol=https');
            const port = process.env.WEB_PORT || args
                .filter((arg) => {
                    return /port=\d+/.test(arg);
                })
                .map((arg) => {
                    return /port=(\d+)/.exec(arg)[1];
                })[0] || 5000;
            const logLevel = args
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
                const nonce = crypto.randomBytes(16).toString('base64');
                res.setHeader(
                    'Content-Security-Policy',
                    "default-src 'self'; font-src 'self' https://fonts.gstatic.com/; img-src 'self' https://img.buymeacoffee.com;" +
                    " script-src 'self'; style-src 'self' https://fonts.googleapis.com/ 'nonce-" + nonce + "'; frame-src 'self'"
                );
                next();
            });
        }

        return main;
    },

    establishRouting: (app, express) => {
        const standardRateLimit = rateLimit({
            windowMs: 60000,
            max: 100,
            standardHeaders: true,
            legacyHeaders: false
        });

        // API endpoints
        app.use('/api/games', standardRateLimit, require('../api/GamesAPI'));
        app.use('/api/admin', (req, res, next) => {
            if (isAuthorized(req)) {
                next();
            } else {
                res.status(401).send('You are not authorized to make this request.');
            }
        }, standardRateLimit, require('../api/AdminAPI'));

        // miscellaneous assets
        app.use('/manifest.json', standardRateLimit, (req, res) => {
            res.sendFile(path.join(__dirname, '../../manifest.json'));
        });

        app.use('/favicon.ico', standardRateLimit, (req, res) => {
            res.sendFile(path.join(__dirname, '../../client/favicon_package/favicon.ico'));
        });

        app.use('/apple-touch-icon.png', standardRateLimit, (req, res) => {
            res.sendFile(path.join(__dirname, '../../client/favicon_package/apple-touch-icon.png'));
        });

        const router = require('../routes/router');
        app.use('', router);

        app.use('/dist', (req, res, next) => {
            if (req.url.includes('.js.gz')) {
                res.set('Content-Encoding', 'gzip');
            }
            next();
        });

        app.use('/dist', express.static(path.join(__dirname, '../../client/dist')));

        // set up routing for static content that isn't being bundled.
        app.use('/images', express.static(path.join(__dirname, '../../client/src/images')));
        app.use('/styles', express.static(path.join(__dirname, '../../client/src/styles')));
        app.use('/webfonts', express.static(path.join(__dirname, '../../client/src/webfonts')));
        app.use('/robots.txt', standardRateLimit, (req, res) => {
            res.sendFile(path.join(__dirname, '../../client/robots.txt'));
        });

        app.use(standardRateLimit, function (req, res) {
            res.sendFile(path.join(__dirname, '../../client/src/views/404.html'));
        });
    }
};

function isAuthorized (req) {
    if (process.env.NODE_ENV.trim() === 'development' || req.method === 'OPTIONS') {
        return true;
    }

    const header = req.headers.authorization;
    if (header) {
        const token = header.split(/\s+/).pop() || '';
        const decodedToken = Buffer.from(token, 'base64').toString();
        return decodedToken.trim() === process.env.ADMIN_KEY?.trim();
    }

    return false;
}

module.exports = ServerBootstrapper;
