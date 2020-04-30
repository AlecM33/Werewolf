const express = require("express");
const open = require("open");
const app = express();
const http = require("http");
const server = http.createServer(app);
const path = require("path");
const io = require('socket.io')(server);

// const debugMode = Array.from(process.argv.map( (arg)=>arg.trim().toLowerCase() )).some((it)=> it.includes("debug"));
const useSocket = Array.from(process.argv.map( (arg)=>arg.trim().toLowerCase() )).some((it)=> it.includes("socket"));
const openBrowser = Array.from(process.argv.map( (arg)=>arg.trim() )).some((it)=> it.includes("openBrowser"));
const port = Array
.from(process.argv.map( (arg) => {
    return arg.trim().toLowerCase();
}))
.filter( (arg) => {
    return /port=\d+/.test(arg);
})
.map( (arg) => {
    return /port=(\d+)/.exec(arg)[1];
})[0] || 5000;
// const logger = require("./modules/logger")(debugMode);

app.set("port", port);

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'static')));
app.use(express.static(path.join(__dirname, 'views')));
app.use(express.static(path.join(__dirname, 'spec')));

app.get("/tests",function(request, response){
    response.sendFile(__dirname + "/views/SpecRunner.html");
});


if(useSocket) {
    console.log("Awaiting test results from browser...");

    io.on("connection", function(socket){
        socket.on("all-results", function(data) {

            console.log("TOTAL: " + data.totalCount);
            console.log("SUCCESS: " + (data.totalCount - (data.failureCount + data.pendingCount)));
            console.log("FAILURES: " + data.failureCount);
            console.log("SKIPPED: " + data.pendingCount + "\n");

            data.failureCount > 0 ? console.log("FAILURE") : console.log("SUCCESS");

            process.exit( data.failureCount > 0 ? 1 : 0);
        });
    });
}

server.listen(port, function() {
    console.log(`Navigate to http://localhost:${port}/tests to view the in-browser tests.`);
});

// is this really that easy? ...wow.
if(openBrowser) {
    console.log("Trying to open browser...");
    
    if(useSocket) {
        open("http://localhost:" + port + "/tests?socket=true");
    } else {
        open("http://localhost:" + port + "/tests");
    }
}
