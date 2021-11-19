/*
A timer using setTimeout that compensates for drift. Drift can happen for several reasons:
https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout#reasons_for_delays

This means the timer may very well be late in executing the next call (but never early).
This timer is accurate to within a few ms for any amount of time provided. It's meant to be utilized as a Web Worker.
See: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
 */

const messageParameters = {
    STOP: 'stop',
    TICK_INTERVAL: 'tickInterval',
    HOURS: 'hours',
    MINUTES: 'minutes'
};

onmessage = function (e) {
    if (typeof e.data === 'object'
        && e.data.hasOwnProperty(messageParameters.HOURS)
        && e.data.hasOwnProperty(messageParameters.MINUTES)
        && e.data.hasOwnProperty(messageParameters.TICK_INTERVAL)
    ) {
        const timer = new Singleton(e.data.hours, e.data.minutes, e.data.tickInterval);
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
    postMessage({
        timeRemainingInMilliseconds: totalTime - (expected - start),
        displayTime: returnHumanReadableTime(totalTime - (expected - start))
    });
    Singleton.setNewTimeoutReference(setTimeout(() => {
            stepFn(expected, interval, start, totalTime);
        }, Math.max(0, interval - delta)
    )); // take into account drift - also retain a reference to this clock tick so it can be cleared later
}

class Timer {
    constructor (hours, minutes, tickInterval) {
        this.timeoutId = undefined;
        this.hours = hours;
        this.minutes = minutes;
        this.tickInterval = tickInterval;
    }

    startTimer () {
        if (!isNaN(this.hours) && !isNaN(this.minutes) && !isNaN(this.tickInterval)) {
            const interval = this.tickInterval;
            const totalTime = convertFromHoursToMilliseconds(this.hours) + convertFromMinutesToMilliseconds(this.minutes);
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
    constructor (hours, minutes, tickInterval) {
        if (!Singleton.instance) {
            Singleton.instance = new Timer(hours, minutes, tickInterval);
        } else {
            // This allows the same timer to be configured to run for different intervals / at a different granularity.
            Singleton.setNewTimerParameters(hours, minutes, tickInterval);
        }
        return Singleton.instance;
    }

    static setNewTimerParameters (hours, minutes, tickInterval) {
        if (Singleton.instance) {
            Singleton.instance.hours = hours;
            Singleton.instance.minutes = minutes;
            Singleton.instance.tickInterval = tickInterval;
        }
    }

    static setNewTimeoutReference (timeoutId) {
        if (Singleton.instance) {
            Singleton.instance.timeoutId = timeoutId;
        }
    }
}

function convertFromMinutesToMilliseconds(minutes) {
    return minutes * 60 * 1000;
}

function convertFromHoursToMilliseconds(hours) {
    return hours * 60 * 60 * 1000;
}

function returnHumanReadableTime(milliseconds) {

    let seconds = Math.floor((milliseconds / 1000) % 60);
    let minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    let hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);

    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds;
}
