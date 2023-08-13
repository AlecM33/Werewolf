const { LOG_LEVEL } = require('../config/globals');

module.exports = function (logLevel = LOG_LEVEL.INFO) {
    return {
        logLevel: logLevel,
        info (message = '') {
            const now = new Date();
            console.log('LOG   ', now.toGMTString(), ': ', message);
        },

        error (message = '') {
            if (
                logLevel === LOG_LEVEL.INFO
            ) { return; }
            const now = new Date();
            console.error('ERROR ', now.toGMTString(), ': ', message);
        },

        warn (message = '') {
            if (
                logLevel === LOG_LEVEL.INFO
                || logLevel === LOG_LEVEL.ERROR
            ) return;
            const now = new Date();
            console.error('WARN ', now.toGMTString(), ': ', message);
        },

        debug (message = '') {
            if (logLevel === LOG_LEVEL.INFO || logLevel === LOG_LEVEL.ERROR || logLevel === LOG_LEVEL.WARN) return;
            const now = new Date();
            console.debug('DEBUG ', now.toGMTString(), ': ', message);
        },

        trace (message = '') {
            if (
                logLevel === LOG_LEVEL.INFO
                || logLevel === LOG_LEVEL.WARN
                || logLevel === LOG_LEVEL.DEBUG
                || logLevel === LOG_LEVEL.ERROR
            ) return;

            const now = new Date();
            console.error('TRACE ', now.toGMTString(), ': ', message);
        }
    };
};
