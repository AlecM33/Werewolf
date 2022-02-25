

var path = require('path'),
    jasmineBrowser = require('jasmine-browser-runner'),
    jasmineCore = require('jasmine-core');

var config = require('../support/jasmine-browser.json');
jasmineBrowser.startServer(config, { port: 4321 });

const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true }); // default is true
    const page = await browser.newPage();
    await page.goto('http://localhost:4321');
})();


