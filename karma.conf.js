module.exports = function(config) {
    config.set({
        basePath: './',
        frameworks: ['jasmine'],
        files: [
            { pattern: 'spec/e2e/*.js', type: 'module' },
            { pattern: 'spec/support/*.js', type: 'module' },
            { pattern: 'client/src/modules/*/*.js', type: 'module', included: true, served: true },
            { pattern: 'client/src/config/*.js', type: 'module', included: true, served: true },
            { pattern: 'client/src/model/*.js', type: 'module', included: true, served: true },
            { pattern: 'client/src/view_templates/*.js', type: 'module', included: true, served: true }
        ],
        reporters: ['progress'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        browsers: ['ChromeHeadless'],
        autoWatch: false,
        concurrency: Infinity,
        plugins: [
            'karma-jasmine',
            'karma-chrome-launcher'
        ]
    })
}
