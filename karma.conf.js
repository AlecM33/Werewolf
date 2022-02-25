module.exports = function(config) {
    config.set({
        frameworks: ['jasmine'],
        files: ['spec/**/*.js'],
        reporters: ['progress'],
        port: 9876,  // karma web server port
        colors: true,
        logLevel: config.LOG_INFO,
        browsers: ['ChromeHeadless'],
        autoWatch: false,
        // singleRun: false, // Karma captures browsers, runs the tests and exits
        concurrency: Infinity,
        plugins: [
            'karma-jasmine',
            'karma-chrome-launcher'
        ]
    })
}
