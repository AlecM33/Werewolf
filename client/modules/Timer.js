/*
A timer using setTimeout that compensates for drift. Drift can happen for several reasons:
https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout#reasons_for_delays

This means the timer may very well be late in executing the next call (but never early).
This timer is accurate to within a few ms for any amount of time provided. It's meant to be utilized as a Web Worker.
See: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
 */

const messageParameters = {
    STOP: 'stop',
    TOTAL_TIME: 'totalTime',
    TICK_INTERVAL: 'tickInterval'
};

onmessage = function (e) {
    if (typeof e.data === 'object'
        && e.data.hasOwnProperty(messageParameters.TOTAL_TIME)
        && e.data.hasOwnProperty(messageParameters.TICK_INTERVAL)
    ) {
        const timer = new Singleton(e.data.totalTime, e.data.tickInterval);
        timer.startTimer();
    }
};

function stepFn (expected, interval, start, totalTime) {
    const now = Date.now();
    if (now - start >= totalTime) {
        return;
    }
    const delta = now - expected;
    expected += interval;
    postMessage({ timeRemaining: (totalTime - (expected - start)) / 1000 });
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
        if (!isNaN(this.totalTime) && !isNaN(this.tickInterval)) {
            const interval = this.tickInterval;
            const totalTime = this.totalTime;
            const start = Date.now();
            const expected = Date.now() + this.tickInterval;
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            this.timeoutId = setTimeout(() => {
                stepFn(expected, interval, start, totalTime);
            }, this.tickInterval);
        }
    }
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
