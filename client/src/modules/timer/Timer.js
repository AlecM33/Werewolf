/*
A timer using setTimeout that compensates for drift. Drift can happen for several reasons:
https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout#reasons_for_delays

This means the timer may very well be late in executing the next call (but never early).
This timer is accurate to within a few ms for any amount of time provided. This is the client-side version of this module,
and is meant to be utilized as a Web Worker.
See: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
 */

const messageParameters = {
    STOP: 'stop',
    TICK_INTERVAL: 'tickInterval',
    TOTAL_TIME: 'totalTime'
};

let timer;

onmessage = function (e) {
    if (typeof e.data === 'object'
        && e.data.hasOwnProperty(messageParameters.TOTAL_TIME)
        && e.data.hasOwnProperty(messageParameters.TICK_INTERVAL)
    ) {
        timer = new Singleton(e.data.totalTime, e.data.tickInterval);
        timer.startTimer();
    } else if (e.data === 'stop') {
        timer.stopTimer();
    }
};

function stepFn (expected, interval, start, totalTime) {
    const now = Date.now();
    if (now - start >= totalTime) {
        postMessage({
            timeRemainingInMilliseconds: 0,
            displayTime: returnHumanReadableTime(0, true)
        });
        return;
    }
    const delta = now - expected;
    expected += interval;
    const displayTime = (totalTime - (now - start)) < 60000
        ? returnHumanReadableTime(totalTime - (now - start), true)
        : returnHumanReadableTime(totalTime - (now - start));
    postMessage({
        timeRemainingInMilliseconds: totalTime - (now - start),
        displayTime: displayTime
    });
    Singleton.setNewTimeoutReference(setTimeout(() => {
        stepFn(expected, interval, start, totalTime);
    }, Math.max(0, interval - delta)
    )); // take into account drift - also retain a reference to this clock tick so it can be cleared later
}

class Timer {
    constructor (totalTime, tickInterval) {
        this.timeoutId = undefined;
        this.totalTime = totalTime;
        this.tickInterval = tickInterval;
    }

    startTimer () {
        if (!isNaN(this.tickInterval)) {
            const interval = this.tickInterval;
            const start = Date.now();
            const expected = Date.now() + this.tickInterval;
            const totalTime = this.totalTime;
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            this.timeoutId = setTimeout(() => {
                stepFn(expected, interval, start, totalTime);
            }, this.tickInterval);
        }
    }

    stopTimer () {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }
}
function returnHumanReadableTime (milliseconds, tenthsOfSeconds = false) {
    const tenths = Math.floor((milliseconds / 100) % 10);
    let seconds = Math.floor((milliseconds / 1000) % 60);
    let minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    let hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);

    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    return tenthsOfSeconds
        ? hours + ':' + minutes + ':' + seconds + '.' + tenths
        : hours + ':' + minutes + ':' + seconds;
}

class Singleton {
    constructor (totalTime, tickInterval) {
        if (!Singleton.instance) {
            Singleton.instance = new Timer(totalTime, tickInterval);
        } else {
            // This allows the same timer to be configured to run for different intervals / at a different granularity.
            Singleton.setNewTimerParameters(totalTime, tickInterval);
        }
        return Singleton.instance;
    }

    static setNewTimerParameters (totalTime, tickInterval) {
        if (Singleton.instance) {
            Singleton.instance.totalTime = totalTime;
            Singleton.instance.tickInterval = tickInterval;
        }
    }

    static setNewTimeoutReference (timeoutId) {
        if (Singleton.instance) {
            Singleton.instance.timeoutId = timeoutId;
        }
    }
}
