module.exports = function(debugMode = false){
    return {
        log(message = "") {
            const now = new Date();
            console.log('LOG   ', now.toGMTString(), ': ', message);
        },

        debug(message = "") {
            if (!debugMode) return;
            const now = new Date();
            console.debug('DEBUG ', now.toGMTString(), ': ', message);
        },

        error(message = "") {
            if (!debugMode) return;
            const now = new Date();
            console.error('ERROR ', now.toGMTString(), ': ', message);
        }
    };
};
