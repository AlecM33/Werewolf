/* ALL TIMES ARE IN MILLIS */

function stepFn (expected, interval, start, totalTime, ticking, timesUpResolver, logger) {
    const now = Date.now();
    if (now - start >= totalTime) {
        clearTimeout(ticking);
        logger.debug('ELAPSED: ' + (now - start) + 'ms (~' + (Math.abs(totalTime - (now - start)) / totalTime).toFixed(3) + '% error).');
        timesUpResolver(); // this is a reference to the callback defined in the construction of the promise in runTimer()
        return;
    }
    const delta = now - expected;
    expected += interval;
    ticking = setTimeout(function () {
        stepFn(
            expected,
            interval,
            start,
            totalTime,
            ticking,
            timesUpResolver,
            logger
        );
    }, Math.max(0, interval - delta)); // take into account drift
}

class ServerTimer {
    constructor (hours, minutes, tickInterval, logger) {
        this.hours = hours;
        this.minutes = minutes;
        this.tickInterval = tickInterval;
        this.logger = logger;
    }

    runTimer () {
        const interval = this.tickInterval;
        const totalTime = convertFromHoursToMilliseconds(this.hours) + convertFromMinutesToMilliseconds(this.minutes);
        const logger = this.logger;
        logger.debug('STARTING TIMER FOR ' + totalTime + 'ms');
        const start = Date.now();
        const expected = Date.now() + this.tickInterval;
        let timesUpResolver;
        const timesUpPromise = new Promise((resolve) => {
            timesUpResolver = resolve;
        });
        const ticking = setTimeout(function () {
            stepFn(
                expected,
                interval,
                start,
                totalTime,
                ticking,
                timesUpResolver,
                logger
            );
        }, this.tickInterval);

        return timesUpPromise;
    }
}

function convertFromMinutesToMilliseconds(minutes) {
    return minutes * 60 * 1000;
}

function convertFromHoursToMilliseconds(hours) {
    return hours * 60 * 60 * 1000;
}

module.exports = ServerTimer;
