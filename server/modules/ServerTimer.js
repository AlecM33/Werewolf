/*
A timer using setTimeout that compensates for drift. Drift can happen for several reasons:
https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout#reasons_for_delays

This means the timer may very well be late in executing the next call (but never early).
This timer is accurate to within a few ms for any amount of time provided.
 */

function stepFn (serverTimerInstance, expected) {
    const now = Date.now(); //
    serverTimerInstance.currentTimeInMillis = serverTimerInstance.totalTime - (now - serverTimerInstance.start);
    if (now - serverTimerInstance.start >= serverTimerInstance.totalTime) { // check if the time has elapsed
        serverTimerInstance.logger.debug(
            'ELAPSED: ' + (now - serverTimerInstance.start) + 'ms (~' +
            (Math.abs(serverTimerInstance.totalTime - (now - serverTimerInstance.start)) / serverTimerInstance.totalTime).toFixed(3) + '% error).'
        );
        serverTimerInstance.timesUpResolver(); // this is a reference to the callback defined in the construction of the promise in runTimer()
        clearTimeout(serverTimerInstance.ticking);
        return;
    }
    const delta = now - expected;
    expected += serverTimerInstance.interval;
    serverTimerInstance.ticking = setTimeout(function () {
        stepFn(
            serverTimerInstance,
            expected
        );
    }, Math.max(0, serverTimerInstance.interval - delta)); // take into account drift
}

class ServerTimer {
    constructor (hours, minutes, tickInterval, logger) {
        this.hours = hours;
        this.minutes = minutes;
        this.tickInterval = tickInterval;
        this.logger = logger;
        this.currentTimeInMillis = null;
        this.ticking = null;
        this.timesUpPromise = null;
        this.timesUpResolver = null;
        this.start = null;
        this.totalTime = null;
    }

    runTimer (pausedInitially = true) {
        const total = convertFromHoursToMilliseconds(this.hours) + convertFromMinutesToMilliseconds(this.minutes);
        this.totalTime = total;
        this.currentTimeInMillis = total;
        this.logger.debug('STARTING TIMER FOR ' + this.totalTime + 'ms');
        this.start = Date.now();
        const expected = Date.now() + this.tickInterval;
        this.timesUpPromise = new Promise((resolve) => {
            this.timesUpResolver = resolve;
        });
        const instance = this;
        if (!pausedInitially) {
            this.ticking = setTimeout(function () {
                stepFn(
                    instance,
                    expected
                );
            }, this.tickInterval);
        }

        return this.timesUpPromise;
    }

    stopTimer () {
        if (this.ticking) {
            clearTimeout(this.ticking);
        }
    }

    resumeTimer () {
        this.logger.trace('RESUMING TIMER FOR ' + this.currentTimeInMillis + 'ms');
        this.start = Date.now();
        this.totalTime = this.currentTimeInMillis;
        const expected = Date.now() + this.tickInterval;
        const instance = this;
        this.ticking = setTimeout(function () {
            stepFn(
                instance,
                expected
            );
        }, this.tickInterval);

        return this.timesUpPromise;
    }
}

function convertFromMinutesToMilliseconds (minutes) {
    return minutes * 60 * 1000;
}

function convertFromHoursToMilliseconds (hours) {
    return hours * 60 * 60 * 1000;
}

module.exports = ServerTimer;
