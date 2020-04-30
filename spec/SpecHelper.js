let socket;

// Jasmine lifecycle hooks

beforeEach(() => {
    cleanupPlayground();
    // jasmine.addMatchers({ /* provide matcher function here if you want to, I guess */});
});

beforeAll(() => {
    if(window.location.search.includes("socket=true")) {
        socket = io();
    }
});

afterEach(() => {
    /*
    if(socket !== undefined) {
      socket.emit("test result",parseTestResults());
    }

    How to get only the newest result? No clue right now.

    */
});

afterAll(() => {
    resportResultsOnSocket();
});


// Utility functions

const parseTestResults = function() {
    const resultsElement = document.querySelector("span.jasmine-overall-result.jasmine-bar");

    if(resultsElement !== null) {
        const results = /.*(\d+) specs.*(\d+) failure.*(\d+).*/.exec(resultsElement.textContent);
        const total = parseInt(results[1]);
        const failures = parseInt(results[2]);
        const pending = parseInt(results[3]);
        return Promise.resolve({
            "totalCount": total,
            "failureCount": failures,
            "pendingCount": pending
        });
    } else {
        let maxRetries = 60;
        return new Promise((resolve, reject) => {
            const resultsInterval = setInterval(() => {
                maxRetries--;
                const resultsElem = document.querySelector("span.jasmine-overall-result.jasmine-bar");

                if (maxRetries === 0) {
                    reject("Required results element not found.");
                } else {
                    if (resultsElem !== null) {
                        const results = /.*(\d+) spec.*(\d+) failure.*(\d+).*/.exec(resultsElem.textContent);
                        const pendingResults = /.*(\d+) pending.*/.exec(resultsElem.textContent);
                        const total = parseInt(results[1]);
                        const failures = parseInt(results[2]);
                        const pending = pendingResults ? parseInt(pendingResults[1]) : 0;
                        clearInterval(resultsInterval);
                        resolve({
                            "totalCount": total,
                            "failureCount": failures,
                            "pendingCount": pending
                        });
                    }
                }
            }, 500);
        });
    }
};

export const addStubElement = function(element) {
    document.getElementById("playground").appendChild(element);
};

export const cleanupPlayground = function() {
    document.getElementById("playground").innerHTML = "";
};

export const resportResultsOnSocket = function() {

    if(socket === undefined) {
        socket = io();
    }

    parseTestResults().then((results) => {
        socket.emit("all-results",results);
    }).catch((e) => {console.error(e);});
};
