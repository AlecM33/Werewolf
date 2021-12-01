
function stepFn (serverTimerInstance, expected) {
    const now = Date.now();
    serverTimerInstance.currentTimeInMillis = serverTimerInstance.totalTime - (now - serverTimerInstance.start);
    if (now - serverTimerInstance.start >= serverTimerInstance.totalTime) {
        clearTimeout(serverTimerInstance.ticking);
        serverTimerInstance.logger.debug(
            'ELAPSED: ' + (now - serverTimerInstance.start) + 'ms (~'
            + (Math.abs(serverTimerInstance.totalTime - (now - serverTimerInstance.start)) / serverTimerInstance.totalTime).toFixed(3) + '% error).'
        );
        serverTimerInstance.timesUpResolver(); // this is a reference to the callback defined in the construction of the promise in runTimer()
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

    runTimer () {
        let total = convertFromHoursToMilliseconds(this.hours) + convertFromMinutesToMilliseconds(this.minutes);
        this.totalTime = total;
        this.currentTimeInMillis = total;
        this.logger.debug('STARTING TIMER FOR ' + this.totalTime + 'ms');
        this.start = Date.now();
        const expected = Date.now() + this.tickInterval;
        this.timesUpPromise = new Promise((resolve) => {
            this.timesUpResolver = resolve;
        });
        const instance = this;
        this.ticking = setTimeout(function () {
            stepFn(
                instance,
                expected
            );
        }, this.tickInterval);

        return this.timesUpPromise;
    }

    stopTimer() {
        clearTimeout(this.ticking);
        let now = Date.now();
        this.logger.debug(
            'ELAPSED (PAUSE): ' + (now - this.start) + 'ms (~'
            + (Math.abs(this.totalTime - (now - this.start)) / this.totalTime).toFixed(3) + '% error).'
        );
    }

    resumeTimer() {
        this.logger.debug('RESUMING TIMER FOR ' + this.currentTimeInMillis + 'ms');
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

function convertFromMinutesToMilliseconds(minutes) {
    return minutes * 60 * 1000;
}

function convertFromHoursToMilliseconds(hours) {
    return hours * 60 * 60 * 1000;
}

module.exports = ServerTimer;
