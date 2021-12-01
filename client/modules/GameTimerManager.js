import {globals} from "../config/globals.js";

export class GameTimerManager {
    constructor() {

    }

    startGameTimer (hours, minutes, tickRate, soundManager, timerWorker) {
        if (window.Worker) {
            timerWorker.onmessage = function (e) {
                if (e.data.hasOwnProperty('timeRemainingInMilliseconds') && e.data.timeRemainingInMilliseconds > 0) {
                    document.getElementById('game-timer').innerText = e.data.displayTime;
                }
            };
            const totalTime = convertFromHoursToMilliseconds(hours) + convertFromMinutesToMilliseconds(minutes);
            timerWorker.postMessage({ totalTime: totalTime, tickInterval: tickRate });
        }
    }

    resumeGameTimer(totalTime, tickRate, soundManager, timerWorker) {
        if (window.Worker) {
            let timer = document.getElementById('game-timer');
            timer.classList.remove('paused');
            timer.innerText = totalTime < 60000
                ? returnHumanReadableTime(totalTime, true)
                : returnHumanReadableTime(totalTime);
            timerWorker.onmessage = function (e) {
                if (e.data.hasOwnProperty('timeRemainingInMilliseconds') && e.data.timeRemainingInMilliseconds > 0) {
                    timer.innerText = e.data.displayTime;
                }
            };
            timerWorker.postMessage({ totalTime: totalTime, tickInterval: tickRate });
        }
    }

    pauseGameTimer(timerWorker, timeRemaining) {
        if (window.Worker) {
            timerWorker.postMessage('stop');
            let timer = document.getElementById('game-timer');
            timer.innerText = timeRemaining < 60000
                ? returnHumanReadableTime(timeRemaining, true)
                : returnHumanReadableTime(timeRemaining);
            timer.classList.add('paused');
        }
    }

    displayPausedTime(time) {
        let timer = document.getElementById('game-timer');
        timer.innerText = time < 60000
            ? returnHumanReadableTime(time, true)
            : returnHumanReadableTime(time);
        timer.classList.add('paused');
    }

    attachTimerSocketListeners(socket, timerWorker, gameStateRenderer) {
        if (!socket.hasListeners(globals.EVENTS.START_TIMER)) {
            socket.on(globals.EVENTS.START_TIMER, () => {
                this.startGameTimer(
                    gameStateRenderer.gameState.timerParams.hours,
                    gameStateRenderer.gameState.timerParams.minutes,
                    globals.CLOCK_TICK_INTERVAL_MILLIS,
                    null,
                    timerWorker
                )
            });
        }

        if(!socket.hasListeners(globals.COMMANDS.PAUSE_TIMER)) {
            socket.on(globals.COMMANDS.PAUSE_TIMER, (timeRemaining) => {
                this.pauseGameTimer(timerWorker, timeRemaining)
            });
        }

        if(!socket.hasListeners(globals.COMMANDS.RESUME_TIMER)) {
            socket.on(globals.COMMANDS.RESUME_TIMER, (timeRemaining) => {
                this.resumeGameTimer(timeRemaining, globals.CLOCK_TICK_INTERVAL_MILLIS, null, timerWorker);
            });
        }

        if(!socket.hasListeners(globals.COMMANDS.GET_TIME_REMAINING)) {
            socket.on(globals.COMMANDS.GET_TIME_REMAINING, (timeRemaining, paused) => {
                console.log('received time remaining from server');
                if (paused) {
                    this.displayPausedTime(timeRemaining);
                } else {
                   this.resumeGameTimer(timeRemaining, globals.CLOCK_TICK_INTERVAL_MILLIS, null, timerWorker);
                }
            });
        }
    }
}


function convertFromMinutesToMilliseconds(minutes) {
    return minutes * 60 * 1000;
}

function convertFromHoursToMilliseconds(hours) {
    return hours * 60 * 60 * 1000;
}

function returnHumanReadableTime(milliseconds, tenthsOfSeconds=false) {

    let tenths = Math.floor((milliseconds / 100) % 10);
    let seconds = Math.floor((milliseconds / 1000) % 60);
    let minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    let hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);

    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    return tenthsOfSeconds
        ? hours + ":" + minutes + ":" + seconds + '.' + tenths
        : hours + ":" + minutes + ":" + seconds;
}
