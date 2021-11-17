const globals = require('../config/globals');

module.exports = function (logLevel = globals.LOG_LEVEL.INFO) {
    return {
        log (message = '') {
            const now = new Date();
            console.log('LOG   ', now.toGMTString(), ': ', message);
        },

        warn (message = '') {
            if (logLevel === globals.LOG_LEVEL.INFO) return;
            const now = new Date();
            console.error('WARN ', now.toGMTString(), ': ', message);
        },

        debug (message = '') {
            if (logLevel === globals.LOG_LEVEL.INFO || logLevel === globals.LOG_LEVEL.WARN) return;
            const now = new Date();
            console.debug('DEBUG ', now.toGMTString(), ': ', message);
        },

        error (message = '') {
            if (
                logLevel === globals.LOG_LEVEL.INFO
                || logLevel === globals.LOG_LEVEL.WARN
                || logLevel === globals.LOG_LEVEL.DEBUG
            ) { return; }
            const now = new Date();
            console.error('ERROR ', now.toGMTString(), ': ', message);
        },

        trace(message = '') {
            if (
                logLevel === globals.LOG_LEVEL.INFO
                || logLevel === globals.LOG_LEVEL.WARN
                || logLevel === globals.LOG_LEVEL.DEBUG
                || logLevel === globals.LOG_LEVEL.ERROR
            ) { return; }

            const now = new Date();
            console.error('TRACE ', now.toGMTString(), ': ', message);
        }
    };
};
